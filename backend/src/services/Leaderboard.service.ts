// @ts-nocheck
import { CronJob } from 'cron';
import { UserRepository } from '../repositories/User.repository';
import { TipRepository } from '../repositories/Tip.repository';
import { LeaderboardRepository } from '../repositories/Leaderboard.repository';
import { config } from '../config/config';
import Redis from 'ioredis';

interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
  change?: number;
}

export class LeaderboardService {
  private redis: Redis;
  private userRepo: UserRepository;
  private tipRepo: TipRepository;
  private leaderboardRepo: LeaderboardRepository;

  constructor() {
    this.redis = new Redis({
      host: config.REDIS.HOST,
      port: config.REDIS.PORT,
      password: config.REDIS.PASSWORD || undefined,
      ...(config.REDIS.URL && { url: config.REDIS.URL })
    });
    this.userRepo = new UserRepository();
    this.tipRepo = new TipRepository();
    this.leaderboardRepo = new LeaderboardRepository();
  }

  async startCronJobs(): Promise<void> {
    // Update daily leaderboard at midnight
    new CronJob('0 0 * * *', () => this.updateDailyLeaderboard()).start();
    
    // Update weekly leaderboard on Sunday at 1 AM
    new CronJob('0 1 * * 0', () => this.updateWeeklyLeaderboard()).start();
    
    // Update monthly leaderboard on 1st of month at 2 AM
    new CronJob('0 2 1 * *', () => this.updateMonthlyLeaderboard()).start();
    
    console.log('✅ Leaderboard cron jobs started');
  }

  async updateDailyLeaderboard(): Promise<void> {
    const periodStart = new Date();
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 1);

    // Get tips from last 24 hours
    const tips = await this.tipRepo.findByPeriod(periodStart, periodEnd);
    
    // Calculate scores
    const scores: Record<string, number> = {};
    
    tips.forEach(tip => {
      scores[tip.senderId] = (scores[tip.senderId] || 0) + parseFloat(tip.amount);
    });

    // Sort and rank
    const entries = await this.createEntries(scores, 'tips_sent');
    
    // Save to database
    await this.leaderboardRepo.create({
      period: 'daily',
      category: 'tips_sent',
      rankings: entries,
      periodStart,
      periodEnd,
      calculatedAt: new Date()
    });

    // Cache in Redis
    await this.redis.set(
      `leaderboard:daily:tips_sent`,
      JSON.stringify(entries),
      'EX',
      86400 // 24 hours
    );
  }

  async updateWeeklyLeaderboard(): Promise<void> {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 7);
    periodStart.setHours(0, 0, 0, 0);
    
    const periodEnd = new Date();
    periodEnd.setHours(23, 59, 59, 999);

    // Multiple categories
    await Promise.all([
      this.updateCategory('weekly', 'tips_sent', periodStart, periodEnd),
      this.updateCategory('weekly', 'tips_received', periodStart, periodEnd),
      this.updateCategory('weekly', 'unique_tippers', periodStart, periodEnd)
    ]);
  }

  async updateMonthlyLeaderboard(): Promise<void> {
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
    
    const periodEnd = new Date();
    periodEnd.setHours(23, 59, 59, 999);

    await Promise.all([
      this.updateCategory('monthly', 'tips_sent', periodStart, periodEnd),
      this.updateCategory('monthly', 'tips_received', periodStart, periodEnd),
      this.updateCategory('monthly', 'unique_tippers', periodStart, periodEnd)
    ]);
  }

  private async updateCategory(
    period: string,
    category: string,
    start: Date,
    end: Date
  ): Promise<void> {
    let scores: Record<string, number> = {};

    switch (category) {
      case 'tips_sent':
        const tips = await this.tipRepo.findByPeriod(start, end);
        tips.forEach(tip => {
          scores[tip.senderId] = (scores[tip.senderId] || 0) + parseFloat(tip.amount);
        });
        break;
      
      case 'tips_received':
        const receivedTips = await this.tipRepo.findByPeriod(start, end);
        receivedTips.forEach(tip => {
          scores[tip.recipientId] = (scores[tip.recipientId] || 0) + parseFloat(tip.amount);
        });
        break;
      
      case 'unique_tippers':
        const uniqueTips = await this.tipRepo.findByPeriod(start, end);
        const uniqueCounts: Record<string, Set<string>> = {};
        
        uniqueTips.forEach(tip => {
          if (!uniqueCounts[tip.senderId]) {
            uniqueCounts[tip.senderId] = new Set();
          }
          uniqueCounts[tip.senderId].add(tip.recipientId);
        });
        
        Object.entries(uniqueCounts).forEach(([userId, recipients]) => {
          scores[userId] = recipients.size;
        });
        break;
    }

    const entries = await this.createEntries(scores, category);
    
    await this.leaderboardRepo.create({
      period: period as any,
      category: category as any,
      rankings: entries,
      periodStart: start,
      periodEnd: end,
      calculatedAt: new Date()
    });

    await this.redis.set(
      `leaderboard:${period}:${category}`,
      JSON.stringify(entries),
      'EX',
      7 * 86400 // 7 days
    );
  }

  private async createEntries(
    scores: Record<string, number>,
    category: string
  ): Promise<LeaderboardEntry[]> {
    // Sort by score descending
    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 100); // Top 100

    // Get user info
    const entries: LeaderboardEntry[] = [];
    
    for (let i = 0; i < sorted.length; i++) {
      const [userId, score] = sorted[i];
      const user = await this.userRepo.findByVerychatId(userId);
      
      if (user) {
        entries.push({
          userId,
          username: user.username || `user_${userId.slice(-4)}`,
          score,
          rank: i + 1,
          change: await this.calculateRankChange(userId, category, i + 1)
        });
      }
    }

    return entries;
  }

  private async calculateRankChange(
    userId: string,
    category: string,
    currentRank: number
  ): Promise<number | undefined> {
    // Get previous rank from last period
    const previous = await this.leaderboardRepo.findPreviousRank(userId, category);
    return previous ? previous - currentRank : undefined;
  }

  async getLeaderboard(
    period: string,
    category: string,
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    // Try cache first
    const cached = await this.redis.get(`leaderboard:${period}:${category}`);
    if (cached) {
      const entries = JSON.parse(cached);
      return entries.slice(0, limit);
    }

    // Fallback to database
    const leaderboard = await this.leaderboardRepo.findLatest(period, category);
    if (!leaderboard) {
      return [];
    }

    return leaderboard.rankings.slice(0, limit);
  }

  async getUserRank(userId: string, period: string, category: string): Promise<LeaderboardEntry | null> {
    const entries = await this.getLeaderboard(period, category, 100);
    return entries.find(entry => entry.userId === userId) || null;
  }
}

