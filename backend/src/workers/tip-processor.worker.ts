import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { BlockchainService } from '../services/blockchain.service';
import { LeaderboardService } from '../services/leaderboard.service';
import { AIInsightsService } from '../services/ai-insights.service';
import { Pool } from 'pg';
import type { TipJobData } from '../types';

/**
 * BullMQ Worker for processing tips in the background
 */
export class TipProcessorWorker {
  private queue: Queue;
  private worker: Worker;
  private redis: Redis;
  private pgPool: Pool;
  private blockchainService: BlockchainService;
  private leaderboardService: LeaderboardService;
  private aiInsightsService: AIInsightsService;

  constructor(redis: Redis, pgPool: Pool) {
    this.redis = redis;
    this.pgPool = pgPool;
    this.blockchainService = new BlockchainService();
    this.leaderboardService = new LeaderboardService(redis, pgPool);
    this.aiInsightsService = new AIInsightsService(redis);

    // Initialize BullMQ queue
    this.queue = new Queue('tip-processing', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000
        },
        removeOnFail: {
          age: 7 * 24 * 3600 // Keep failed jobs for 7 days
        }
      }
    });

    // Initialize worker
    this.worker = new Worker(
      'tip-processing',
      this.processTipJob.bind(this),
      {
        connection: redis,
        concurrency: 10, // Process up to 10 tips concurrently
        limiter: {
          max: 100,
          duration: 1000 // Max 100 jobs per second
        }
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process a tip job
   */
  private async processTipJob(job: Job<TipJobData>): Promise<void> {
    const { senderId, recipientId, amount, ipfsCid, moderation, timestamp } = job.data;

    logger.info('Processing tip job', {
      jobId: job.id,
      senderId,
      recipientId,
      amount: amount.toString()
    });

    try {
      // 1. Submit to VERY Chain relayer (gasless)
      const txHash = await this.blockchainService.submitToRelayer(
        senderId,
        amount,
        recipientId,
        ipfsCid
      );

      // 2. Update leaderboards (Redis + PostgreSQL)
      await this.leaderboardService.updateLeaderboards(
        senderId,
        recipientId,
        amount,
        ipfsCid
      );

      // 3. Generate AI insights (async, don't block)
      this.generateInsightsAsync(senderId).catch(err => {
        logger.error('Failed to generate insights', { error: err, userId: senderId });
      });

      // 4. Check achievements (async)
      this.checkAchievementsAsync(senderId).catch(err => {
        logger.error('Failed to check achievements', { error: err, userId: senderId });
      });

      // 5. Update job progress
      await job.updateProgress(100);

      logger.info('Tip processed successfully', {
        jobId: job.id,
        senderId,
        recipientId,
        txHash,
        ipfsCid
      });

      // Return result for WebSocket broadcasting
      return {
        success: true,
        txHash,
        ipfsCid,
        senderId,
        recipientId,
        amount: amount.toString()
      } as any;
    } catch (error) {
      logger.error('Tip processing failed', {
        error,
        jobId: job.id,
        senderId,
        recipientId
      });
      throw error; // Will trigger retry
    }
  }

  /**
   * Generate insights asynchronously
   */
  private async generateInsightsAsync(userId: string): Promise<void> {
    try {
      const stats = await this.leaderboardService.getUserStats(userId);
      if (stats) {
        await this.aiInsightsService.generatePersonalizedInsights(userId, stats);
      }
    } catch (error) {
      logger.error('Insights generation failed', { error, userId });
    }
  }

  /**
   * Check achievements asynchronously
   */
  private async checkAchievementsAsync(userId: string): Promise<void> {
    try {
      // TODO: Implement achievement checking logic
      // This would check user stats against badge criteria
      logger.debug('Achievement check', { userId });
    } catch (error) {
      logger.error('Achievement check failed', { error, userId });
    }
  }

  /**
   * Setup worker event handlers
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      logger.info('Tip job completed', { jobId: job.id });
    });

    this.worker.on('failed', (job, err) => {
      logger.error('Tip job failed', {
        jobId: job?.id,
        error: err,
        attemptsMade: job?.attemptsMade
      });
    });

    this.worker.on('error', (err) => {
      logger.error('Worker error', { error: err });
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn('Job stalled', { jobId });
    });
  }

  /**
   * Add tip to processing queue
   */
  async addTipToQueue(data: TipJobData): Promise<string> {
    const job = await this.queue.add('process-tip', data, {
      priority: 1, // Normal priority
      jobId: `tip-${data.senderId}-${data.recipientId}-${Date.now()}`
    });

    logger.info('Tip added to queue', {
      jobId: job.id,
      senderId: data.senderId,
      recipientId: data.recipientId
    });

    return job.id!;
  }

  /**
   * Get queue stats
   */
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down tip processor worker');
    await this.worker.close();
    await this.queue.close();
  }
}

