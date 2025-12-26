// @ts-nocheck
import Redis from 'ioredis';
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import type { LeaderboardUser, UserStats } from '../types';

/**
 * Leaderboard Service for Redis + PostgreSQL indexing
 */
export class LeaderboardService {
  private redis: Redis;
  private pgPool: Pool;

  constructor(redis: Redis, pgPool: Pool) {
    this.redis = redis;
    this.pgPool = pgPool;
  }

  /**
   * Update leaderboards after tip processing
   */
  async updateLeaderboards(
    senderId: string,
    recipientId: string,
    amount: bigint,
    ipfsCid: string
  ): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      const amountNumber = Number(amount);

      // Update sender stats
      pipeline.zincrby('leaderboard:total_tips', 1, senderId);
      pipeline.zincrby('leaderboard:total_amount', amountNumber, senderId);
      pipeline.hincrby(`user:${senderId}`, 'tips_sent', 1);
      pipeline.hincrby(`user:${senderId}`, 'amount_sent', amountNumber);

      // Update recipient stats
      pipeline.hincrby(`user:${recipientId}`, 'tips_received', 1);
      pipeline.hincrby(`user:${recipientId}`, 'amount_received', amountNumber);

      // Weekly rolling window
      const weekKey = `leaderboard:weekly:${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`;
      pipeline.zincrby(weekKey, amountNumber, senderId);

      await pipeline.exec();

      // Persist to PostgreSQL (async, don't wait)
      this.pgPool.query(
        `INSERT INTO tips (sender_id, recipient_id, amount, ipfs_cid, created_at, status)
         VALUES ($1, $2, $3, $4, NOW(), 'confirmed')
         ON CONFLICT DO NOTHING`,
        [senderId, recipientId, amount.toString(), ipfsCid]
      ).catch(err => {
        logger.error('Failed to persist tip to PostgreSQL', { error: err });
      });

      logger.debug('Leaderboards updated', { senderId, recipientId, amount: amountNumber });
    } catch (error) {
      logger.error('Leaderboard update failed', { error, senderId, recipientId });
      throw error;
    }
  }

  /**
   * Get leaderboard by period
   */
  async getLeaderboard(period: 'all' | 'weekly' = 'all', limit: number = 100): Promise<LeaderboardUser[]> {
    try {
      const key = period === 'weekly'
        ? `leaderboard:weekly:${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`
        : 'leaderboard:total_amount';

      const topUsers = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
      
      const users: LeaderboardUser[] = [];
      for (let i = 0; i < topUsers.length; i += 2) {
        const userId = topUsers[i];
        const amount = parseFloat(topUsers[i + 1] || '0');
        
        // Get tip count
        const tips = await this.redis.zscore('leaderboard:total_tips', userId) || 0;

        users.push({
          rank: Math.floor(i / 2) + 1,
          userId,
          tips: parseInt(tips.toString()),
          amount
        });
      }

      return users;
    } catch (error) {
      logger.error('Failed to get leaderboard', { error, period, limit });
      throw error;
    }
  }

  /**
   * Get user stats
   */
  async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const stats = await this.redis.hgetall(`user:${userId}`);
      
      if (!stats || Object.keys(stats).length === 0) {
        return null;
      }

      const rankGlobal = await this.redis.zrevrank('leaderboard:total_amount', userId);
      const weekKey = `leaderboard:weekly:${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`;
      const rankWeekly = await this.redis.zrevrank(weekKey, userId);

      return {
        userId,
        tipsSent: parseInt(stats.tips_sent || '0'),
        tipsReceived: parseInt(stats.tips_received || '0'),
        amountSent: BigInt(stats.amount_sent || '0'),
        amountReceived: BigInt(stats.amount_received || '0'),
        weeklyTips: parseInt(stats.weekly_tips || '0'),
        weeklyAmount: BigInt(stats.weekly_amount || '0'),
        rankGlobal: rankGlobal !== null ? rankGlobal + 1 : undefined,
        rankWeekly: rankWeekly !== null ? rankWeekly + 1 : undefined
      };
    } catch (error) {
      logger.error('Failed to get user stats', { error, userId });
      throw error;
    }
  }

  /**
   * Get total leaderboard count
   */
  async getTotalCount(period: 'all' | 'weekly' = 'all'): Promise<number> {
    try {
      const key = period === 'weekly'
        ? `leaderboard:weekly:${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`
        : 'leaderboard:total_amount';

      return await this.redis.zcard(key);
    } catch (error) {
      logger.error('Failed to get leaderboard count', { error, period });
      return 0;
    }
  }
}
