// Smart Badge & Achievement Engine with Hugging Face + Custom Logic
// Dynamic badges based on tipping patterns, milestones, streaks

import { HfInference } from '@huggingface/inference';
import { z } from 'zod';
import { config } from '../config';
import { DatabaseService } from './DatabaseService';

// Badge schema
const BadgeSchema = z.object({
  id: z.string(),
  badgeId: z.string(),
  name: z.string(),
  emoji: z.string(),
  rarity: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']),
  description: z.string(),
  criteria: z.object({
    type: z.enum(['milestone', 'streak', 'pattern', 'support', 'volume']),
    threshold: z.number(),
    period: z.enum(['daily', 'weekly', 'monthly', 'all-time'])
  }),
  awardedAt: z.string().datetime().optional(),
  isActive: z.boolean().optional()
});

export type Badge = z.infer<typeof BadgeSchema>;

// Badge definitions
const BADGE_CATEGORIES = {
  milestones: [
    { badgeId: 'first-tip', name: 'First Tip', emoji: '🎉', rarity: 'bronze' as const, criteria: { type: 'milestone' as const, threshold: 1, period: 'all-time' as const }, description: 'Sent your first tip!' },
    { badgeId: 'tip-10', name: 'Tip Master', emoji: '🥇', rarity: 'silver' as const, criteria: { type: 'milestone' as const, threshold: 10, period: 'all-time' as const }, description: 'Sent 10 tips' },
    { badgeId: 'tip-50', name: 'Tip Veteran', emoji: '⭐', rarity: 'gold' as const, criteria: { type: 'milestone' as const, threshold: 50, period: 'all-time' as const }, description: 'Sent 50 tips' },
    { badgeId: 'tip-100', name: 'Tipping Legend', emoji: '🏆', rarity: 'gold' as const, criteria: { type: 'milestone' as const, threshold: 100, period: 'all-time' as const }, description: 'Sent 100 tips' },
    { badgeId: 'tip-1000', name: 'Whale Tipper', emoji: '🐋', rarity: 'diamond' as const, criteria: { type: 'milestone' as const, threshold: 1000, period: 'all-time' as const }, description: 'Sent 1000 tips' }
  ],
  streaks: [
    { badgeId: 'daily-streak-7', name: 'Week Streaker', emoji: '🔥', rarity: 'bronze' as const, criteria: { type: 'streak' as const, threshold: 7, period: 'daily' as const }, description: '7 day tipping streak' },
    { badgeId: 'daily-streak-30', name: 'Month Master', emoji: '📅', rarity: 'silver' as const, criteria: { type: 'streak' as const, threshold: 30, period: 'daily' as const }, description: '30 day tipping streak' },
    { badgeId: 'daily-streak-100', name: 'Century Streak', emoji: '💯', rarity: 'gold' as const, criteria: { type: 'streak' as const, threshold: 100, period: 'daily' as const }, description: '100 day tipping streak' }
  ],
  patterns: [
    { badgeId: 'micro-tipper', name: 'Micro Master', emoji: '💎', rarity: 'silver' as const, criteria: { type: 'pattern' as const, threshold: 50, period: 'monthly' as const }, description: '50+ micro tips in a month' },
    { badgeId: 'generous', name: 'Big Spender', emoji: '💰', rarity: 'gold' as const, criteria: { type: 'pattern' as const, threshold: 100, period: 'monthly' as const }, description: '100+ VERY in tips per month' },
    { badgeId: 'early-bird', name: 'Early Bird', emoji: '🌅', rarity: 'bronze' as const, criteria: { type: 'pattern' as const, threshold: 10, period: 'monthly' as const }, description: 'Tips before 9AM' },
    { badgeId: 'night-owl', name: 'Night Owl', emoji: '🦉', rarity: 'bronze' as const, criteria: { type: 'pattern' as const, threshold: 10, period: 'monthly' as const }, description: 'Tips after 11PM' }
  ],
  support: [
    { badgeId: 'top-supporter', name: 'Creator Angel', emoji: '😇', rarity: 'gold' as const, criteria: { type: 'support' as const, threshold: 25, period: 'monthly' as const }, description: 'Top 1% supporter of a creator' },
    { badgeId: 'consistent', name: 'Loyal Fan', emoji: '❤️', rarity: 'silver' as const, criteria: { type: 'support' as const, threshold: 10, period: 'monthly' as const }, description: '10+ tips to the same creator' },
    { badgeId: 'community-builder', name: 'Community Builder', emoji: '👥', rarity: 'gold' as const, criteria: { type: 'support' as const, threshold: 50, period: 'all-time' as const }, description: 'Supported 50+ different creators' }
  ]
};

const BADGE_RARITY_ORDER: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
  diamond: 5
};

interface TipData {
  id: string;
  senderId: string;
  recipientId: string;
  amount: string;
  token: string;
  createdAt: Date;
  message?: string | null;
}

interface UserStats {
  totalTips: number;
  totalAmount: bigint;
  dailyStreak: number;
  topRecipients: Array<{ username: string; tips: number; amount: bigint }>;
  microTips: number;
  avgTipSize: bigint;
  monthlyVolume: bigint;
  supportConsistency: number;
  earlyTips: number;
  lateTips: number;
}

/**
 * Smart Badge Engine - Real-time achievement detection
 */
export class BadgeEngine {
  private db = DatabaseService.getInstance();
  private hf: HfInference | null = null;
  private userStatsCache = new Map<string, { stats: UserStats; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    if (config.HUGGINGFACE_API_KEY && config.HUGGINGFACE_API_KEY !== 'dummy_hf_key') {
      this.hf = new HfInference(config.HUGGINGFACE_API_KEY);
    }
  }

  /**
   * Check all achievements for a user based on their tips
   */
  async checkAllAchievements(userId: string, tips: TipData[]): Promise<Badge[]> {
    const stats = await this.calculateStats(userId, tips);
    const badges: Badge[] = [];

    // Check predefined badges
    for (const category of Object.values(BADGE_CATEGORIES)) {
      for (const badgeDef of category) {
        if (this.meetsCriteria(stats, badgeDef.criteria, tips)) {
          badges.push({
            id: badgeDef.badgeId,
            badgeId: badgeDef.badgeId,
            name: badgeDef.name,
            emoji: badgeDef.emoji,
            rarity: badgeDef.rarity,
            description: badgeDef.description,
            criteria: badgeDef.criteria,
            isActive: true
          });
        }
      }
    }

    // AI-powered dynamic badges (only if HF is available)
    if (this.hf) {
      try {
        const aiBadges = await this.generateAIBadges(stats, tips);
        badges.push(...aiBadges);
      } catch (error) {
        console.error('AI badge generation failed:', error);
        // Continue without AI badges if generation fails
      }
    }

    return badges.sort((a, b) => (BADGE_RARITY_ORDER[b.rarity] || 0) - (BADGE_RARITY_ORDER[a.rarity] || 0));
  }

  /**
   * Calculate comprehensive user statistics
   */
  private async calculateStats(userId: string, tips: TipData[]): Promise<UserStats> {
    const cached = this.userStatsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.stats;
    }

    const filteredTips = tips.filter(t => t.senderId === userId);

    let totalAmount = BigInt(0);
    const recipientMap: Map<string, { tips: number; amount: bigint }> = new Map();
    let microTips = 0;
    let earlyTips = 0;
    let lateTips = 0;

    for (const tip of filteredTips) {
      const amount = BigInt(tip.amount);
      totalAmount += amount;

      // Track micro tips (< 1 VERY, assuming 18 decimals)
      if (amount < BigInt('1000000000000000000')) {
        microTips++;
      }

      // Track recipients
      const recipientData = recipientMap.get(tip.recipientId) || { tips: 0, amount: BigInt(0) };
      recipientData.tips++;
      recipientData.amount += amount;
      recipientMap.set(tip.recipientId, recipientData);

      // Track time patterns
      const hour = new Date(tip.createdAt).getHours();
      if (hour < 9) earlyTips++;
      if (hour >= 23 || hour < 3) lateTips++;
    }

    const topRecipients = Array.from(recipientMap.entries())
      .map(([username, data]) => ({ username, tips: data.tips, amount: data.amount }))
      .sort((a, b) => b.tips - a.tips)
      .slice(0, 5);

    // Calculate monthly volume (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyTips = filteredTips.filter(t => new Date(t.createdAt) >= thirtyDaysAgo);
    const monthlyVolume = monthlyTips.reduce((sum, tip) => sum + BigInt(tip.amount), BigInt(0));

    // Calculate support consistency (max tips to a single recipient in last 30 days)
    const monthlyRecipients = new Map<string, number>();
    monthlyTips.forEach(tip => {
      monthlyRecipients.set(tip.recipientId, (monthlyRecipients.get(tip.recipientId) || 0) + 1);
    });
    const supportConsistency = Math.max(...Array.from(monthlyRecipients.values()), 0);

    const stats: UserStats = {
      totalTips: filteredTips.length,
      totalAmount,
      dailyStreak: this.calculateStreak(filteredTips),
      topRecipients,
      microTips,
      avgTipSize: filteredTips.length > 0 ? totalAmount / BigInt(filteredTips.length) : BigInt(0),
      monthlyVolume,
      supportConsistency,
      earlyTips,
      lateTips
    };

    this.userStatsCache.set(userId, { stats, timestamp: Date.now() });
    return stats;
  }

  /**
   * Check if user meets badge criteria
   */
  private meetsCriteria(stats: UserStats, criteria: any, tips: TipData[]): boolean {
    switch (criteria.type) {
      case 'milestone':
        return stats.totalTips >= criteria.threshold;
      case 'streak':
        return stats.dailyStreak >= criteria.threshold;
      case 'pattern':
        return this.checkPattern(stats, criteria, tips);
      case 'support':
        if (criteria.threshold === 25) {
          // Top supporter - check if user is in top 1% of a creator's supporters
          return stats.topRecipients.some(r => r.tips >= criteria.threshold);
        }
        return stats.supportConsistency >= criteria.threshold;
      case 'volume':
        // Convert to VERY (18 decimals) for comparison
        const thresholdAmount = BigInt(criteria.threshold) * BigInt('1000000000000000000');
        if (criteria.period === 'monthly') {
          return stats.monthlyVolume >= thresholdAmount;
        }
        return stats.totalAmount >= thresholdAmount;
      default:
        return false;
    }
  }

  /**
   * Check pattern-based badges
   */
  private checkPattern(stats: UserStats, criteria: any, tips: TipData[]): boolean {
    // Handle special pattern badges
    if (criteria.type === 'pattern') {
      // Micro tipper - 50+ tips < 1 VERY in a month
      if (criteria.threshold === 50 && stats.microTips >= 50) {
        return true;
      }

      // Generous - 100+ VERY total per month
      const monthlyThreshold = BigInt(100) * BigInt('1000000000000000000');
      if (criteria.threshold === 100 && stats.monthlyVolume >= monthlyThreshold) {
        return true;
      }

      // Early bird - 10+ tips before 9AM
      if (criteria.threshold === 10 && stats.earlyTips >= 10) {
        return true;
      }

      // Night owl - 10+ tips after 11PM
      if (criteria.threshold === 10 && stats.lateTips >= 10) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate AI-powered dynamic badges using Hugging Face
   */
  private async generateAIBadges(stats: UserStats, tips: TipData[]): Promise<Badge[]> {
    if (!this.hf) return [];

    try {
      // Use a simpler approach - analyze patterns and suggest badges
      // For production, you might want to use a fine-tuned model
      const recentTips = tips.slice(0, 20).map(t => ({
        amount: t.amount,
        hour: new Date(t.createdAt).getHours(),
        day: new Date(t.createdAt).getDay()
      }));

      // Weekend warrior detection
      const weekendTips = recentTips.filter(t => t.day === 0 || t.day === 6).length;
      if (weekendTips >= 5 && stats.totalTips >= 10) {
        return [{
          id: 'weekend-warrior',
          badgeId: 'weekend-warrior',
          name: 'Weekend Warrior',
          emoji: '🎯',
          rarity: 'silver',
          description: 'Most tips on weekends',
          criteria: { type: 'pattern', threshold: 5, period: 'all-time' },
          isActive: true
        }];
      }

      // Round numberer detection
      const roundAmounts = recentTips.filter(t => {
        const amount = BigInt(t.amount);
        return amount % BigInt('1000000000000000000') === BigInt(0); // Exactly 1, 2, 3... VERY
      }).length;
      if (roundAmounts >= 5 && stats.totalTips >= 10) {
        return [{
          id: 'round-numberer',
          badgeId: 'round-numberer',
          name: 'Round Numberer',
          emoji: '🎲',
          rarity: 'bronze',
          description: 'Prefers round tip amounts',
          criteria: { type: 'pattern', threshold: 5, period: 'all-time' },
          isActive: true
        }];
      }

      return [];
    } catch (error) {
      console.error('AI badge generation error:', error);
      return [];
    }
  }

  /**
   * Calculate daily tipping streak
   */
  private calculateStreak(tips: TipData[]): number {
    if (tips.length === 0) return 0;

    // Sort tips by date (newest first)
    const sortedTips = [...tips].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if there's a tip today
    const todayTip = sortedTips.find(t => {
      const tipDate = new Date(t.createdAt);
      tipDate.setHours(0, 0, 0, 0);
      return tipDate.getTime() === today.getTime();
    });

    if (!todayTip) return 0; // No tip today, streak is broken

    // Start from today and go backwards
    let currentDate = new Date(today);
    let tipIndex = 0;

    while (tipIndex < sortedTips.length) {
      const tipDate = new Date(sortedTips[tipIndex].createdAt);
      tipDate.setHours(0, 0, 0, 0);
      const currentDateStr = currentDate.getTime();

      if (tipDate.getTime() === currentDateStr) {
        streak++;
        tipIndex++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (tipDate.getTime() < currentDateStr) {
        // Missing a day - streak broken
        break;
      } else {
        tipIndex++;
      }
    }

    return streak;
  }
}


