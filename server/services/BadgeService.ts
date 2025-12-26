// Badge Service - Handles badge database operations and award logic

import { DatabaseService } from './DatabaseService';
import { BadgeEngine, Badge } from './BadgeEngine';
import { TipAnalyticsService } from './TipAnalyticsService';

export interface UserBadgeWithDetails {
  id: string;
  badgeId: string;
  name: string;
  emoji: string;
  rarity: string;
  description: string;
  awardedAt: Date;
  metadata: any;
}

export class BadgeService {
  private db = DatabaseService.getInstance();
  private badgeEngine = new BadgeEngine();
  private analyticsService = new TipAnalyticsService();

  /**
   * Check and award badges for a user
   * Returns newly awarded badges
   */
  async checkAndAwardBadges(userId: string): Promise<Badge[]> {
    // Get all confirmed tips for the user
    const tips = await this.db.tip.findMany({
      where: {
        senderId: userId,
        status: 'CONFIRMED'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get currently awarded badges
    const existingBadges = await this.db.userBadge.findMany({
      where: {
        userId
      },
      include: {
        badge: true
      }
    });

    const existingBadgeIds = new Set(existingBadges.map(ub => ub.badge.name));

    // Check what badges the user qualifies for
    // Map tips to TipData format expected by BadgeEngine
    const tipData = tips.map(tip => ({
      id: tip.id,
      senderId: tip.senderId,
      recipientId: tip.recipientId,
      amount: tip.amount,
      token: tip.tokenAddress,
      createdAt: tip.createdAt,
      message: tip.messageHash
    }));
    const qualifiedBadges = await this.badgeEngine.checkAllAchievements(userId, tipData);

    // Filter to only new badges
    const newBadges = qualifiedBadges.filter(b => !existingBadgeIds.has(b.name));

    // Award new badges
    const awardedBadges: Badge[] = [];
    for (const badge of newBadges) {
      try {
        // Ensure badge exists in database
        const badgeRecord = await this.ensureBadgeExists(badge);

        // Award badge to user
        await this.db.userBadge.create({
          data: {
            userId,
            badgeId: badgeRecord.id,
            context: {
              criteria: badge.criteria,
              badgeId: badge.badgeId,
              awardedAt: new Date().toISOString()
            }
          }
        });

        awardedBadges.push(badge);
      } catch (error: any) {
        // Ignore duplicate key errors (race condition)
        if (!error.message?.includes('Unique constraint') && error.code !== 'P2002') {
          console.error(`Error awarding badge ${badge.badgeId} to user ${userId}:`, error);
        }
      }
    }

    return awardedBadges;
  }

  /**
   * Ensure a badge definition exists in the database
   * Returns the badge record
   */
  private async ensureBadgeExists(badge: Badge) {
    const existing = await this.db.badge.findUnique({
      where: { name: badge.name }
    });

    if (!existing) {
      return await this.db.badge.create({
        data: {
          name: badge.name,
          description: badge.description,
          imageUrl: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg"><text>${badge.emoji}</text></svg>`)}`,
          requirements: {
            badgeId: badge.badgeId,
            emoji: badge.emoji,
            rarity: badge.rarity,
            criteria: badge.criteria,
            isActive: badge.isActive ?? true
          } as any
        }
      });
    }
    return existing;
  }

  /**
   * Get all badges for a user
   */
  async getUserBadges(userId: string): Promise<UserBadgeWithDetails[]> {
    const userBadges = await this.db.userBadge.findMany({
      where: {
        userId
      },
      include: {
        badge: true
      },
      orderBy: {
        earnedAt: 'desc'
      }
    });

    return userBadges.map(ub => {
      const requirements = (ub.badge.requirements as any) || {};
      const context = (ub.context as any) || {};
      return {
        id: ub.id,
        badgeId: requirements.badgeId || ub.badge.name,
        name: ub.badge.name,
        emoji: requirements.emoji || '🏆',
        rarity: requirements.rarity || 'bronze',
        description: ub.badge.description,
        awardedAt: ub.earnedAt,
        metadata: context
      };
    });
  }

  /**
   * Get badge details by badgeId (name)
   */
  async getBadge(badgeId: string) {
    return await this.db.badge.findUnique({
      where: { name: badgeId }
    });
  }

  /**
   * Get all available badges (definitions)
   */
  async getAllBadges() {
    const badges = await this.db.badge.findMany({
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Filter and sort by rarity from requirements
    return badges
      .map(badge => {
        const requirements = (badge.requirements as any) || {};
        return {
          ...badge,
          rarity: requirements.rarity || 'bronze',
          emoji: requirements.emoji || '🏆',
          isActive: requirements.isActive !== false
        };
      })
      .filter(b => b.isActive)
      .sort((a, b) => {
        const rarityOrder: Record<string, number> = {
          bronze: 1,
          silver: 2,
          gold: 3,
          platinum: 4,
          diamond: 5
        };
        return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
      });
  }

  /**
   * Revoke a badge from a user (delete the UserBadge record)
   */
  async revokeBadge(userId: string, badgeId: string): Promise<boolean> {
    try {
      // Find the badge by name
      const badge = await this.db.badge.findUnique({
        where: { name: badgeId }
      });
      
      if (!badge) {
        return false;
      }

      await this.db.userBadge.deleteMany({
        where: {
          userId,
          badgeId: badge.id
        }
      });
      return true;
    } catch (error) {
      console.error(`Error revoking badge ${badgeId} from user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get badge statistics for a user
   */
  async getUserBadgeStats(userId: string) {
    const badges = await this.getUserBadges(userId);
    
    const rarityCounts: Record<string, number> = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0
    };

    badges.forEach(b => {
      rarityCounts[b.rarity] = (rarityCounts[b.rarity] || 0) + 1;
    });

    return {
      totalBadges: badges.length,
      rarityCounts,
      latestBadge: badges[0] || null
    };
  }
}

