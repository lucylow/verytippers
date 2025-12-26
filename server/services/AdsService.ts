// @ts-nocheck
import { DatabaseService } from './DatabaseService';
import { HuggingFaceService } from './HuggingFaceService';
import { createHash } from 'crypto';

export interface AdData {
  advertiser: string;
  title: string;
  description?: string;
  imageUrl?: string;
  targetTags?: string[];
  targetGuild?: string;
  url: string;
  budget?: number;
}

export interface AdSlotRequest {
  tags?: string[];
  guild?: string;
}

export interface AdImpressionRequest {
  adId: string;
  userId?: string;
  ipHash?: string;
}

export interface AdClickRequest {
  adId: string;
  userId?: string;
  ipHash?: string;
}

export class AdsService {
  private prisma = DatabaseService.getInstance();
  private hfService: HuggingFaceService;

  constructor() {
    this.hfService = new HuggingFaceService();
  }

  /**
   * Hash IP address for privacy
   */
  private hashIP(ip: string, secret: string): string {
    return createHash('sha256')
      .update(secret + ip)
      .digest('hex');
  }

  /**
   * Validate ad content through moderation pipeline
   */
  async validateAdContent(ad: AdData): Promise<boolean> {
    try {
      const textToCheck = `${ad.title} ${ad.description || ''}`.trim();
      if (!textToCheck) return false;

      const moderationResult = await this.hfService.moderateContent(textToCheck);
      
      // Ad is safe if moderation passes
      return moderationResult.isSafe && !moderationResult.flagged;
    } catch (error) {
      console.error('Error validating ad content:', error);
      // On error, be conservative and reject
      return false;
    }
  }

  /**
   * Get an ad slot (single ad for display)
   * Uses simple round-robin with filtering
   */
  async getAdSlot(request: AdSlotRequest): Promise<any | null> {
    try {
      const { tags = [], guild } = request;

      // Build where clause
      const where: any = {
        active: true,
      };

      // Filter by guild if provided
      if (guild) {
        where.OR = [
          { targetGuild: guild },
          { targetGuild: null }, // Also include ads with no specific guild
        ];
      }

      // Get all matching ads
      const ads = await this.prisma.ad.findMany({
        where,
        orderBy: [
          { impressions: 'asc' }, // Prefer ads with fewer impressions for fairness
          { createdAt: 'desc' },
        ],
      });

      if (ads.length === 0) {
        return null;
      }

      // Filter by tags if provided (simple intersection check)
      let filteredAds = ads;
      if (tags.length > 0) {
        filteredAds = ads.filter((ad) => {
          if (ad.targetTags.length === 0) return true; // Ads with no tags match all
          return tags.some((tag) => ad.targetTags.includes(tag));
        });
      }

      // If no ads match tags, fall back to all ads
      if (filteredAds.length === 0) {
        filteredAds = ads;
      }

      // Simple round-robin: select based on total impressions
      const selectedAd = filteredAds.reduce((prev, current) => {
        return prev.impressions < current.impressions ? prev : current;
      });

      // Return ad without URL (to prevent CTR spoofing on impression)
      const { url, ...adWithoutUrl } = selectedAd;
      return adWithoutUrl;
    } catch (error) {
      console.error('Error getting ad slot:', error);
      return null;
    }
  }

  /**
   * Record an ad impression
   */
  async recordImpression(request: AdImpressionRequest): Promise<boolean> {
    try {
      const { adId, userId, ipHash } = request;

      // Create impression record
      await this.prisma.adImpression.create({
        data: {
          adId,
          userId: userId || null,
          ipHash: ipHash || null,
        },
      });

      // Increment impression count
      await this.prisma.ad.update({
        where: { id: adId },
        data: {
          impressions: { increment: 1 },
        },
      });

      return true;
    } catch (error) {
      console.error('Error recording impression:', error);
      return false;
    }
  }

  /**
   * Record an ad click and return redirect URL
   */
  async recordClick(request: AdClickRequest): Promise<string | null> {
    try {
      const { adId, userId, ipHash } = request;

      // Get ad to retrieve URL
      const ad = await this.prisma.ad.findUnique({
        where: { id: adId },
      });

      if (!ad || !ad.active) {
        return null;
      }

      // Create click record
      await this.prisma.adClick.create({
        data: {
          adId,
          userId: userId || null,
          ipHash: ipHash || null,
        },
      });

      // Increment click count
      await this.prisma.ad.update({
        where: { id: adId },
        data: {
          clicks: { increment: 1 },
        },
      });

      return ad.url;
    } catch (error) {
      console.error('Error recording click:', error);
      return null;
    }
  }

  /**
   * Create a new ad (admin only)
   */
  async createAd(adData: AdData): Promise<any> {
    // Validate content through moderation
    const isValid = await this.validateAdContent(adData);
    if (!isValid) {
      throw new Error('Ad content failed moderation check');
    }

    const ad = await this.prisma.ad.create({
      data: {
        advertiser: adData.advertiser,
        title: adData.title,
        description: adData.description || null,
        imageUrl: adData.imageUrl || null,
        targetTags: adData.targetTags || [],
        targetGuild: adData.targetGuild || null,
        url: adData.url,
        budget: adData.budget || 0.0,
        active: true,
      },
    });

    return ad;
  }

  /**
   * Update an existing ad (admin only)
   */
  async updateAd(adId: string, adData: Partial<AdData>): Promise<any> {
    // If content fields are being updated, re-validate
    if (adData.title || adData.description) {
      const existingAd = await this.prisma.ad.findUnique({
        where: { id: adId },
      });

      if (!existingAd) {
        throw new Error('Ad not found');
      }

      const updatedData: AdData = {
        advertiser: existingAd.advertiser,
        title: adData.title || existingAd.title,
        description: adData.description !== undefined ? adData.description : existingAd.description || undefined,
        imageUrl: adData.imageUrl || existingAd.imageUrl || undefined,
        url: existingAd.url,
      };

      const isValid = await this.validateAdContent(updatedData);
      if (!isValid) {
        throw new Error('Updated ad content failed moderation check');
      }
    }

    const updateData: any = {};
    if (adData.title !== undefined) updateData.title = adData.title;
    if (adData.description !== undefined) updateData.description = adData.description;
    if (adData.imageUrl !== undefined) updateData.imageUrl = adData.imageUrl;
    if (adData.targetTags !== undefined) updateData.targetTags = adData.targetTags;
    if (adData.targetGuild !== undefined) updateData.targetGuild = adData.targetGuild;
    if (adData.url !== undefined) updateData.url = adData.url;
    if (adData.budget !== undefined) updateData.budget = adData.budget;
    if (adData.advertiser !== undefined) updateData.advertiser = adData.advertiser;

    const ad = await this.prisma.ad.update({
      where: { id: adId },
      data: updateData,
    });

    return ad;
  }

  /**
   * Get IP hash helper (for use in routes)
   */
  getIPHash(ip: string): string {
    const secret = process.env.ADS_REDIRECT_SECRET || 'default-secret-change-in-production';
    return this.hashIP(ip, secret);
  }
}

