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
    // Get all completed tips for the user
    const tips = await this.db.tip.findMany({
      where: {
        senderId: userId,
        status: 'COMPLETED'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get currently awarded badges
    const existingBadges = await this.db.userBadge.findMany({
      where: {
        userId,
        revokedAt: null
      },
      include: {
        badge: true
      }
    });

    const existingBadgeIds = new Set(existingBadges.map(ub => ub.badge.badgeId));

    // Check what badges the user qualifies for
    const qualifiedBadges = await this.badgeEngine.checkAllAchievements(userId, tips);

    // Filter to only new badges
    const newBadges = qualifiedBadges.filter(b => !existingBadgeIds.has(b.badgeId));

    // Award new badges
    const awardedBadges: Badge[] = [];
    for (const badge of newBadges) {
      try {
        // Ensure badge exists in database
        await this.ensureBadgeExists(badge);

        // Award badge to user
        await this.db.userBadge.create({
          data: {
            userId,
            badgeId: badge.badgeId,
            metadata: {
              criteria: badge.criteria,
              awardedAt: new Date().toISOString()
            }
          }
        });

        awardedBadges.push(badge);
      } catch (error: any) {
        // Ignore duplicate key errors (race condition)
        if (!error.message?.includes('Unique constraint') && !error.code === 'P2002') {
          console.error(`Error awarding badge ${badge.badgeId} to user ${userId}:`, error);
        }
      }
    }

    return awardedBadges;
  }

  /**
   * Ensure a badge definition exists in the database
   */
  private async ensureBadgeExists(badge: Badge): Promise<void> {
    const existing = await this.db.badge.findUnique({
      where: { badgeId: badge.badgeId }
    });

    if (!existing) {
      await this.db.badge.create({
        data: {
          badgeId: badge.badgeId,
          name: badge.name,
          emoji: badge.emoji,
          description: badge.description,
          rarity: badge.rarity,
          criteria: badge.criteria as any,
          isActive: badge.isActive ?? true
        }
      });
    }
  }

  /**
   * Get all badges for a user
   */
  async getUserBadges(userId: string): Promise<UserBadgeWithDetails[]> {
    const userBadges = await this.db.userBadge.findMany({
      where: {
        userId,
        revokedAt: null
      },
      include: {
        badge: true
      },
      orderBy: {
        awardedAt: 'desc'
      }
    });

    return userBadges.map(ub => ({
      id: ub.id,
      badgeId: ub.badge.badgeId,
      name: ub.badge.name,
      emoji: ub.badge.emoji,
      rarity: ub.badge.rarity,
      description: ub.badge.description,
      awardedAt: ub.awardedAt,
      metadata: ub.metadata as any
    }));
  }

  /**
   * Get badge details by badgeId
   */
  async getBadge(badgeId: string) {
    return await this.db.badge.findUnique({
      where: { badgeId }
    });
  }

  /**
   * Get all available badges (definitions)
   */
  async getAllBadges() {
    return await this.db.badge.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        rarity: 'asc'
      }
    });
  }

  /**
   * Revoke a badge from a user
   */
  async revokeBadge(userId: string, badgeId: string): Promise<boolean> {
    try {
      await this.db.userBadge.updateMany({
        where: {
          userId,
          badgeId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
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

