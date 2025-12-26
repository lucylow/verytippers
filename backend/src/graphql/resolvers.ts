import { Pool } from 'pg';
import Redis from 'ioredis';
import { LeaderboardService } from '../services/leaderboard.service';
import { AIInsightsService } from '../services/ai-insights.service';
import { IPFSService } from '../services/ipfs.service';
import { EncryptionService } from '../services/encryption.service';
import { BlockchainService } from '../services/blockchain.service';
import { logger } from '../utils/logger';
import type { GraphQLContext } from '../types';

/**
 * GraphQL Resolvers
 */
export function createResolvers(
  pgPool: Pool,
  redis: Redis,
  ipfsService: IPFSService,
  encryptionService: EncryptionService,
  blockchainService: BlockchainService
) {
  const leaderboardService = new LeaderboardService(redis, pgPool);
  const aiInsightsService = new AIInsightsService(redis);

  return {
    Query: {
      recentTips: async (_: any, { limit }: { limit: number }) => {
        try {
          const result = await pgPool.query(
            `SELECT id, sender_id, recipient_id, amount, ipfs_cid, tx_hash, status, created_at
             FROM tips
             WHERE status = 'confirmed'
             ORDER BY created_at DESC
             LIMIT $1`,
            [limit]
          );

          return result.rows.map((row: any) => ({
            id: row.id,
            senderId: row.sender_id,
            recipientId: row.recipient_id,
            amount: parseFloat(row.amount) / 1e18, // Convert from wei
            ipfsCid: row.ipfs_cid,
            timestamp: row.created_at.toISOString(),
            txHash: row.tx_hash,
            status: row.status,
            decryptedMessage: null // Only decrypt on demand for authorized users
          }));
        } catch (error) {
          logger.error('Failed to fetch recent tips', { error });
          throw new Error('Failed to fetch recent tips');
        }
      },

      leaderboard: async (
        _: any,
        { limit, period }: { limit: number; period: string }
      ) => {
        try {
          const users = await leaderboardService.getLeaderboard(
            period === 'weekly' ? 'weekly' : 'all',
            limit
          );
          const total = await leaderboardService.getTotalCount(
            period === 'weekly' ? 'weekly' : 'all'
          );

          return {
            users,
            total,
            period: period || 'all'
          };
        } catch (error) {
          logger.error('Failed to fetch leaderboard', { error });
          throw new Error('Failed to fetch leaderboard');
        }
      },

      userStats: async (_: any, { userId }: { userId: string }) => {
        try {
          const stats = await leaderboardService.getUserStats(userId);
          if (!stats) {
            return null;
          }

          return {
            ...stats,
            amountSent: Number(stats.amountSent) / 1e18,
            amountReceived: Number(stats.amountReceived) / 1e18,
            weeklyAmount: Number(stats.weeklyAmount) / 1e18
          };
        } catch (error) {
          logger.error('Failed to fetch user stats', { error, userId });
          throw new Error('Failed to fetch user stats');
        }
      },

      myInsights: async (_: any, { userId }: { userId: string }) => {
        try {
          const stats = await leaderboardService.getUserStats(userId);
          if (!stats) {
            return [];
          }

          return await aiInsightsService.generatePersonalizedInsights(userId, stats);
        } catch (error) {
          logger.error('Failed to fetch insights', { error, userId });
          return [];
        }
      },

      health: async () => {
        const startTime = process.uptime();
        
        // Check service health
        const [dbHealth, redisHealth, ipfsHealth, blockchainHealth] = await Promise.allSettled([
          pgPool.query('SELECT 1').then(() => 'up').catch(() => 'down'),
          redis.ping().then(() => 'up').catch(() => 'down'),
          ipfsService.healthCheck().then(ok => ok ? 'up' : 'down'),
          blockchainService.healthCheck().then(ok => ok ? 'up' : 'down')
        ]);

        const services = {
          database: dbHealth.status === 'fulfilled' ? dbHealth.value : 'down',
          redis: redisHealth.status === 'fulfilled' ? redisHealth.value : 'down',
          ipfs: ipfsHealth.status === 'fulfilled' ? ipfsHealth.value : 'down',
          blockchain: blockchainHealth.status === 'fulfilled' ? blockchainHealth.value : 'down'
        };

        const allUp = Object.values(services).every(status => status === 'up');
        const anyDown = Object.values(services).some(status => status === 'down');

        return {
          status: allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
          timestamp: new Date().toISOString(),
          services,
          uptime: startTime,
          version: process.env.npm_package_version || '1.0.0'
        };
      }
    },

    Mutation: {
      sendTip: async (
        _: any,
        {
          senderId,
          recipientId,
          amount,
          message
        }: { senderId: string; recipientId: string; amount: number; message: string },
        context: GraphQLContext
      ) => {
        // Note: Actual tip sending is handled by REST API endpoint
        // This mutation is a placeholder for GraphQL interface
        return {
          success: false,
          status: 'error',
          error: 'Use POST /api/tips/send endpoint for tip submission'
        };
      }
    }
  };
}

