import express, { Request, Response } from 'express';
import { AdsService } from '../services/AdsService';
import { requireAdmin } from '../middleware/admin-auth';

const router = express.Router();
const adsService = new AdsService();

/**
 * GET /api/ads/slot
 * Get an ad slot for display
 * Query params: tags[] (array), guild (string)
 */
router.get('/slot', async (req: Request, res: Response) => {
  try {
    const tags = req.query.tags 
      ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]).map(String)
      : [];
    const guild = req.query.guild ? String(req.query.guild) : undefined;

    const ad = await adsService.getAdSlot({ tags, guild });

    if (!ad) {
      return res.status(200).json({ ad: null });
    }

    res.json({ ad });
  } catch (error) {
    console.error('Error getting ad slot:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get ad slot' 
    });
  }
});

/**
 * POST /api/ads/impression
 * Record an ad impression
 * Body: { adId, userId?, ipHash? }
 */
router.post('/impression', async (req: Request, res: Response) => {
  try {
    const { adId, userId, ipHash } = req.body;

    if (!adId) {
      return res.status(400).json({ 
        success: false, 
        error: 'adId is required' 
      });
    }

    // Get client IP and hash it if not provided
    const clientIP = req.ip || req.socket.remoteAddress || '';
    const finalIPHash = ipHash || (clientIP ? adsService.getIPHash(clientIP) : undefined);

    const success = await adsService.recordImpression({
      adId,
      userId: userId || undefined,
      ipHash: finalIPHash,
    });

    if (success) {
      res.json({ ok: true, success: true });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to record impression' 
      });
    }
  } catch (error) {
    console.error('Error recording impression:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to record impression' 
    });
  }
});

/**
 * POST /api/ads/click
 * Record an ad click and return redirect URL
 * Body: { adId, userId?, ipHash? }
 */
router.post('/click', async (req: Request, res: Response) => {
  try {
    const { adId, userId, ipHash } = req.body;

    if (!adId) {
      return res.status(400).json({ 
        success: false, 
        error: 'adId is required' 
      });
    }

    // Get client IP and hash it if not provided
    const clientIP = req.ip || req.socket.remoteAddress || '';
    const finalIPHash = ipHash || (clientIP ? adsService.getIPHash(clientIP) : undefined);

    const redirectUrl = await adsService.recordClick({
      adId,
      userId: userId || undefined,
      ipHash: finalIPHash,
    });

    if (!redirectUrl) {
      return res.status(404).json({ 
        success: false, 
        error: 'Ad not found or inactive' 
      });
    }

    res.json({ redirectUrl, success: true });
  } catch (error) {
    console.error('Error recording click:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to record click' 
    });
  }
});

/**
 * POST /api/admin/ads
 * Create a new ad (admin only)
 * Body: { advertiser, title, description?, imageUrl?, targetTags?, targetGuild?, url, budget? }
 */
router.post('/ads', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { advertiser, title, description, imageUrl, targetTags, targetGuild, url, budget } = req.body;

    if (!advertiser || !title || !url) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: advertiser, title, url' 
      });
    }

    const ad = await adsService.createAd({
      advertiser,
      title,
      description,
      imageUrl,
      targetTags: targetTags || [],
      targetGuild,
      url,
      budget,
    });

    res.status(201).json({ 
      success: true, 
      ad 
    });
  } catch (error: any) {
    console.error('Error creating ad:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Failed to create ad' 
    });
  }
});

/**
 * PUT /api/admin/ads/:id
 * Update an existing ad (admin only)
 * Body: { advertiser?, title?, description?, imageUrl?, targetTags?, targetGuild?, url?, budget? }
 */
router.put('/ads/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { advertiser, title, description, imageUrl, targetTags, targetGuild, url, budget } = req.body;

    const ad = await adsService.updateAd(id, {
      advertiser,
      title,
      description,
      imageUrl,
      targetTags,
      targetGuild,
      url,
      budget,
    });

    res.json({ 
      success: true, 
      ad 
    });
  } catch (error: any) {
    console.error('Error updating ad:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Failed to update ad' 
    });
  }
});

/**
 * GET /api/admin/ads
 * List all ads (admin only)
 */
router.get('/ads', requireAdmin, async (req: Request, res: Response) => {
  try {
    const prisma = require('../services/DatabaseService').DatabaseService.getInstance();
    const ads = await prisma.ad.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            adImpressions: true,
            adClicks: true,
          },
        },
      },
    });

    res.json({ 
      success: true, 
      ads 
    });
  } catch (error) {
    console.error('Error listing ads:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list ads' 
    });
  }
});

export default router;

