// Personalized Leaderboard Insights Service
// Generates weekly summaries using OpenAI GPT-4o

import { DatabaseService } from './DatabaseService';
import { CacheService } from './CacheService';
import { config } from '../config';
import { z } from 'zod';

// OpenAI integration (dynamically imported)
let OpenAIClient: any = null;

const InsightSchema = z.object({
  title: z.string().max(60),
  summary: z.string().max(280),
  emoji: z.string().length(1),
  keyStat: z.string(),
  callToAction: z.string().max(100),
  shareable: z.boolean()
});

export type Insight = z.infer<typeof InsightSchema>;

export interface LeaderboardData {
  rank: number;
  totalTips: number;
  totalAmount: string;
  topSupported: Array<{
    username: string;
    tips: number;
    amount: string;
  }>;
  weeklyGrowth: number;
  badges: string[];
  comparedToFriends: Array<{
    username: string;
    rank: number;
    difference: number;
  }>;
  communityStats: {
    totalUsers: number;
    avgTips: number;
  };
}

export class LeaderboardInsightsService {
  private db = DatabaseService.getInstance();
  private cache = CacheService.getInstance();
  private openai: any = null;
  private openaiAvailable: boolean = false;

  constructor() {
    this.initializeOpenAI();
  }

  private async initializeOpenAI() {
    if (!config.OPENAI_API_KEY || config.OPENAI_API_KEY === '') {
      console.log('OpenAI API key not configured for leaderboard insights. Using fallback.');
      return;
    }

    try {
      const OpenAI = (await import('openai')).default;
      this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
      this.openaiAvailable = true;
      console.log('OpenAI initialized for leaderboard insights');
    } catch (error) {
      console.warn('OpenAI package not available for leaderboard insights:', error);
      this.openaiAvailable = false;
    }
  }

  /**
   * Generate personalized weekly leaderboard insights
   */
  async generatePersonalizedInsights(
    userData: LeaderboardData,
    communityStats: { totalUsers: number; avgTips: number }
  ): Promise<Insight[]> {
    
    // Ensure OpenAI is initialized if API key exists
    if (!this.openai && config.OPENAI_API_KEY && config.OPENAI_API_KEY !== '') {
      await this.initializeOpenAI();
    }

    const cacheKey = `leaderboard:insights:${userData.rank}:${userData.totalTips}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return z.array(InsightSchema).parse(parsed);
      } catch (e) {
        // Cache corrupted, continue to generate
      }
    }

    try {
      if (this.openaiAvailable && this.openai) {
        const insights = await this.generateInsightsWithOpenAI(userData, communityStats);
        await this.cache.set(cacheKey, JSON.stringify(insights), 3600); // 1 hour cache
        return insights;
      } else {
        return this.generateFallbackInsights(userData);
      }
    } catch (error) {
      console.error('Leaderboard insights generation failed:', error);
      return this.generateFallbackInsights(userData);
    }
  }

  /**
   * Generate insights using OpenAI
   */
  private async generateInsightsWithOpenAI(
    userData: LeaderboardData,
    communityStats: { totalUsers: number; avgTips: number }
  ): Promise<Insight[]> {
    
    const systemPrompt = `You are a social leaderboard insights generator for VeryTippers (chat tipping platform).

Generate 3-5 ENGAGING, POSITIVE weekly summaries for users based on their:
- Overall rank (#1-#10000)
- Total tips sent/received
- Top supported creators
- Weekly growth %
- Special badges/achievements
- Comparison to friends

TONE: Excited, encouraging, social, gamified 🏆
STYLE: Short, punchy, shareable (Twitter/X ready)
EMOJI: 1 perfect emoji per insight

EXAMPLES:
🏆 "You're #3 overall! Up 12 spots this week!"
💎 "Top supporter of @alice - she sent you a shoutout!"
🚀 "150% growth! You're crushing it!"

ALWAYS include:
- 1 emoji
- Personal achievement
- Social proof (# rank, top supporter)
- Growth/call-to-action
- Under 280 chars total

Return VALID JSON array matching this exact schema:
[{
  "title": "string (max 60 chars)",
  "summary": "string (max 280 chars)",
  "emoji": "single emoji character",
  "keyStat": "string",
  "callToAction": "string (max 100 chars)",
  "shareable": true
}]`;

    const percentile = ((communityStats.totalUsers - userData.rank) / communityStats.totalUsers * 100).toFixed(1);
    
    const userPrompt = `USER DATA:
Rank: #${userData.rank} (${percentile}th percentile)
Total tips: ${userData.totalTips}
Total amount: ${userData.totalAmount} VERY
Weekly growth: ${userData.weeklyGrowth > 0 ? '+' : ''}${userData.weeklyGrowth}%
Badges: ${userData.badges.length > 0 ? userData.badges.join(', ') : 'None yet'}

TOP SUPPORTED:
${userData.topSupported.slice(0, 5).map(u => `@${u.username}: ${u.tips} tips (${u.amount} VERY)`).join('\n') || 'None yet'}

FRIENDS COMPARISON:
${userData.comparedToFriends.slice(0, 5).map(f => `@${f.username} (#${f.rank}, ${f.difference > 0 ? '+' : ''}${f.difference} spots ${f.difference > 0 ? 'above' : 'below'} you)`).join('\n') || 'No friends data'}

COMMUNITY:
${communityStats.totalUsers} users, avg ${communityStats.avgTips.toFixed(1)} tips/user

Generate 3-5 personalized insights (most important first). Return ONLY valid JSON array.`;

    const completion = await this.openai.chat.completions.create({
      model: config.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const rawResponse = completion.choices[0]?.message?.content;
    if (!rawResponse) {
      throw new Error('Empty response from OpenAI');
    }

    try {
      const parsed = JSON.parse(rawResponse);
      // Handle both { insights: [...] } and [...] formats
      const insightsArray = parsed.insights || parsed;
      const validated = z.array(InsightSchema).parse(insightsArray);
      return validated.slice(0, 5);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw parseError;
    }
  }

  /**
   * Fallback insights when AI unavailable
   */
  private generateFallbackInsights(userData: LeaderboardData): Insight[] {
    const insights: Insight[] = [];
    
    // Rank insight
    insights.push({
      title: `Rank #${userData.rank}`,
      summary: `You're #${userData.rank} on the VeryTippers leaderboard!`,
      emoji: '🏆',
      keyStat: `${userData.totalTips} tips`,
      callToAction: 'Keep tipping!',
      shareable: true
    });

    // Top supporter insight
    if (userData.topSupported.length > 0) {
      const top = userData.topSupported[0];
      insights.push({
        title: `Top Supporter`,
        summary: `You're the top supporter of @${top.username}!`,
        emoji: '💎',
        keyStat: `${top.tips} tips sent`,
        callToAction: 'Continue supporting!',
        shareable: true
      });
    }

    // Growth insight
    if (userData.weeklyGrowth > 0) {
      insights.push({
        title: `Growing Fast!`,
        summary: `You've grown ${userData.weeklyGrowth}% this week!`,
        emoji: '🚀',
        keyStat: `+${userData.weeklyGrowth}% growth`,
        callToAction: 'Keep it up!',
        shareable: true
      });
    }

    // Friends comparison
    if (userData.comparedToFriends.length > 0) {
      const friend = userData.comparedToFriends[0];
      if (friend.difference < 0) {
        insights.push({
          title: `Beat @${friend.username}!`,
          summary: `You're ${Math.abs(friend.difference)} spots ahead of @${friend.username}!`,
          emoji: '🥇',
          keyStat: `#${userData.rank} vs #${friend.rank}`,
          callToAction: 'Stay ahead!',
          shareable: true
        });
      }
    }

    return insights;
  }

  /**
   * Fetch leaderboard data for a user
   */
  async fetchLeaderboardData(userId: string, period: string = 'weekly'): Promise<LeaderboardData> {
    const db = this.db;
    
    // Get user's tips for the period
    const startDate = this.getPeriodStartDate(period);
    
    const tipsSent = await db.tip.findMany({
      where: {
        senderId: userId,
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      },
      include: { recipient: true }
    });

    const tipsReceived = await db.tip.findMany({
      where: {
        recipientId: userId,
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      }
    });

    // Calculate totals
    const totalTips = tipsSent.length;
    const totalAmount = tipsSent.reduce((sum, tip) => sum + BigInt(tip.amount), BigInt(0)).toString();

    // Get top supported users
    const recipientMap = new Map<string, { count: number; total: bigint }>();
    tipsSent.forEach(tip => {
      const recipientId = tip.recipientId;
      const current = recipientMap.get(recipientId) || { count: 0, total: BigInt(0) };
      recipientMap.set(recipientId, {
        count: current.count + 1,
        total: current.total + BigInt(tip.amount)
      });
    });

    // Get recipient data (use wallet address or user ID as username)
    const recipientIds = Array.from(recipientMap.keys());
    const recipients = await db.user.findMany({
      where: { id: { in: recipientIds } },
      select: { id: true, walletAddress: true }
    });
    
    const recipientDataMap = new Map(recipients.map(r => [r.id, r.walletAddress]));
    
    const topSupported = Array.from(recipientMap.entries())
      .map(([recipientId, stats]) => {
        const walletAddress = recipientDataMap.get(recipientId) || recipientId;
        // Use first 8 chars of wallet address or user ID as username
        const username = walletAddress.length > 10 
          ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
          : recipientId.substring(0, 8);
        
        return {
          username: username,
          tips: stats.count,
          amount: stats.total.toString()
        };
      })
      .sort((a, b) => b.tips - a.tips)
      .slice(0, 5);

    // Calculate rank (simplified - would need full leaderboard calculation in production)
    // Fetch all tips and calculate stats manually since amount is a String type
    const allTips = await db.tip.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      },
      select: {
        senderId: true,
        amount: true
      }
    });

    // Group by senderId and calculate stats
    const userStatsMap = new Map<string, { tips: number; amount: bigint }>();
    allTips.forEach(tip => {
      const existing = userStatsMap.get(tip.senderId) || { tips: 0, amount: BigInt(0) };
      existing.tips += 1;
      existing.amount += BigInt(tip.amount);
      userStatsMap.set(tip.senderId, existing);
    });

    const sortedUsers = Array.from(userStatsMap.entries())
      .map(([userId, stats]) => ({
        userId,
        tips: stats.tips,
        amount: stats.amount
      }))
      .sort((a, b) => {
        if (a.amount !== b.amount) {
          return b.amount > a.amount ? 1 : -1;
        }
        return b.tips - a.tips;
      });

    const userRankIndex = sortedUsers.findIndex(u => u.userId === userId);
    const rank = userRankIndex >= 0 ? userRankIndex + 1 : sortedUsers.length + 1;

    // Calculate weekly growth (would need previous period data)
    const weeklyGrowth = 0; // Placeholder

    // Get badges (would need badge system implementation)
    const badges: string[] = []; // Placeholder

    // Friends comparison (would need friend system)
    const comparedToFriends: Array<{ username: string; rank: number; difference: number }> = [];

    // Community stats
    const totalUsers = sortedUsers.length;
    const avgTips = totalUsers > 0 
      ? sortedUsers.reduce((sum, u) => sum + u.tips, 0) / totalUsers 
      : 0;

    return {
      rank,
      totalTips,
      totalAmount,
      topSupported,
      weeklyGrowth,
      badges,
      comparedToFriends,
      communityStats: {
        totalUsers,
        avgTips
      }
    };
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly':
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - daysToMonday);
        monday.setHours(0, 0, 0, 0);
        return monday;
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return new Date(0); // All time
    }
  }
}
