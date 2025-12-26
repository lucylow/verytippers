import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { BlockchainService } from '../services/blockchain.service';
import { LeaderboardService } from '../services/Leaderboard.service';
import { AIInsightsService } from '../services/ai-insights.service';
import { Pool } from 'pg';
import type { TipJobData } from '../types';
import { circuitBreakers } from '../utils/circuitBreaker';

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
      amount: amount.toString(),
      attemptsMade: job.attemptsMade
    });

    try {
      // Validate job data
      if (!senderId || !recipientId) {
        throw new Error('Missing required fields: senderId or recipientId');
      }

      if (!amount || amount <= 0n) {
        throw new Error('Invalid amount: must be greater than zero');
      }

      // Update progress
      try {
        await job.updateProgress(10);
      } catch (progressError) {
        logger.warn('Failed to update job progress', {
          error: progressError,
          jobId: job.id,
          progress: 10
        });
        // Continue processing even if progress update fails
      }

      // 1. Submit to VERY Chain relayer (gasless) with circuit breaker
      let txHash: string;
      try {
        await job.updateProgress(20);
        txHash = await circuitBreakers.blockchain.execute(async () => {
          return await this.blockchainService.submitToRelayer(
            senderId,
            amount,
            recipientId,
            ipfsCid
          );
        });
      } catch (blockchainError) {
        logger.error('Blockchain submission failed', {
          error: blockchainError,
          jobId: job.id,
          senderId,
          recipientId
        });
        throw blockchainError; // Will trigger retry
      }

      // 2. Update leaderboards (Redis + PostgreSQL) with circuit breaker
      try {
        await job.updateProgress(50);
        await circuitBreakers.database.execute(async () => {
          await this.leaderboardService.updateLeaderboards(
            senderId,
            recipientId,
            amount,
            ipfsCid
          );
        });
      } catch (leaderboardError) {
        logger.error('Leaderboard update failed', {
          error: leaderboardError,
          jobId: job.id,
          senderId,
          recipientId
        });
        // Don't throw - leaderboard update failure shouldn't fail the entire tip
        // But log it for monitoring
      }

      // 3. Generate AI insights (async, don't block)
      try {
        await job.updateProgress(70);
        this.generateInsightsAsync(senderId).catch(err => {
          logger.error('Failed to generate insights', {
            error: err,
            userId: senderId,
            jobId: job.id
          });
        });
      } catch (insightsError) {
        logger.warn('Failed to trigger insights generation', {
          error: insightsError,
          userId: senderId,
          jobId: job.id
        });
        // Don't throw - insights are optional
      }

      // 4. Check achievements (async)
      try {
        this.checkAchievementsAsync(senderId).catch(err => {
          logger.error('Failed to check achievements', {
            error: err,
            userId: senderId,
            jobId: job.id
          });
        });
      } catch (achievementsError) {
        logger.warn('Failed to trigger achievement check', {
          error: achievementsError,
          userId: senderId,
          jobId: job.id
        });
        // Don't throw - achievements are optional
      }

      // 5. Update job progress
      try {
        await job.updateProgress(100);
      } catch (progressError) {
        logger.warn('Failed to update final job progress', {
          error: progressError,
          jobId: job.id
        });
        // Continue even if progress update fails
      }

      logger.info('Tip processed successfully', {
        jobId: job.id,
        senderId,
        recipientId,
        txHash,
        ipfsCid,
        attemptsMade: job.attemptsMade
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Tip processing failed', {
        error: errorMessage,
        stack: errorStack,
        jobId: job.id,
        senderId,
        recipientId,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts?.attempts || 3
      });

      // Check if we should retry
      const isRetryable = this.isRetryableError(error as Error);
      const maxAttempts = job.opts?.attempts || 3;

      if (!isRetryable || (job.attemptsMade || 0) >= maxAttempts) {
        logger.error('Tip processing failed permanently', {
          jobId: job.id,
          senderId,
          recipientId,
          isRetryable,
          attemptsMade: job.attemptsMade
        });
      }

      throw error; // Will trigger retry if retryable
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const retryablePatterns = [
      'network',
      'timeout',
      'connection',
      'econnrefused',
      'etimedout',
      'rate limit',
      'service unavailable',
      'bad gateway',
      'gateway timeout',
      'circuit breaker open'
    ];

    const nonRetryablePatterns = [
      'validation',
      'invalid',
      'unauthorized',
      'forbidden',
      'not found',
      'insufficient funds'
    ];

    // Check for non-retryable patterns first
    if (nonRetryablePatterns.some(pattern => message.includes(pattern))) {
      return false;
    }

    // Check for retryable patterns
    return retryablePatterns.some(pattern => message.includes(pattern));
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
      try {
        logger.info('Tip job completed', {
          jobId: job.id,
          duration: job.finishedOn && job.processedOn
            ? job.finishedOn - job.processedOn
            : undefined
        });
      } catch (error) {
        logger.error('Error handling job completion event', { error });
      }
    });

    this.worker.on('failed', (job, err) => {
      try {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack : undefined;

        logger.error('Tip job failed', {
          jobId: job?.id,
          error: errorMessage,
          stack: errorStack,
          attemptsMade: job?.attemptsMade,
          maxAttempts: job?.opts?.attempts,
          data: job?.data ? {
            senderId: (job.data as TipJobData).senderId,
            recipientId: (job.data as TipJobData).recipientId
          } : undefined
        });
      } catch (handlerError) {
        logger.error('Error handling job failure event', { error: handlerError });
      }
    });

    this.worker.on('error', (err) => {
      try {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack : undefined;

        logger.error('Worker error', {
          error: errorMessage,
          stack: errorStack
        });
      } catch (handlerError) {
        logger.error('Error handling worker error event', { error: handlerError });
      }
    });

    this.worker.on('stalled', (jobId) => {
      try {
        logger.warn('Job stalled', { jobId });
      } catch (error) {
        logger.error('Error handling job stalled event', { error });
      }
    });

    this.worker.on('active', (job) => {
      try {
        logger.debug('Job started processing', {
          jobId: job.id,
          attemptsMade: job.attemptsMade
        });
      } catch (error) {
        logger.error('Error handling job active event', { error });
      }
    });

    this.worker.on('progress', (job, progress) => {
      try {
        logger.debug('Job progress update', {
          jobId: job.id,
          progress
        });
      } catch (error) {
        logger.error('Error handling job progress event', { error });
      }
    });
  }

  /**
   * Add tip to processing queue
   */
  async addTipToQueue(data: TipJobData): Promise<string> {
    try {
      // Validate job data
      if (!data || !data.senderId || !data.recipientId) {
        throw new Error('Invalid job data: senderId and recipientId are required');
      }

      if (!data.amount || data.amount <= 0n) {
        throw new Error('Invalid job data: amount must be greater than zero');
      }

      const job = await this.queue.add('process-tip', data, {
        priority: 1, // Normal priority
        jobId: `tip-${data.senderId}-${data.recipientId}-${Date.now()}`
      });

      if (!job || !job.id) {
        throw new Error('Failed to create job: job ID is missing');
      }

      logger.info('Tip added to queue', {
        jobId: job.id,
        senderId: data.senderId,
        recipientId: data.recipientId
      });

      return job.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to add tip to queue', {
        error: errorMessage,
        data: {
          senderId: data?.senderId,
          recipientId: data?.recipientId
        }
      });
      throw new Error(`Failed to add tip to queue: ${errorMessage}`);
    }
  }

  /**
   * Get queue stats
   */
  async getQueueStats() {
    try {
      const [waiting, active, completed, failed] = await Promise.allSettled([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount()
      ]);

      return {
        waiting: waiting.status === 'fulfilled' ? waiting.value : 0,
        active: active.status === 'fulfilled' ? active.value : 0,
        completed: completed.status === 'fulfilled' ? completed.value : 0,
        failed: failed.status === 'fulfilled' ? failed.value : 0,
        total: (
          (waiting.status === 'fulfilled' ? waiting.value : 0) +
          (active.status === 'fulfilled' ? active.value : 0) +
          (completed.status === 'fulfilled' ? completed.value : 0) +
          (failed.status === 'fulfilled' ? failed.value : 0)
        ),
        errors: {
          waiting: waiting.status === 'rejected' ? (waiting.reason as Error).message : undefined,
          active: active.status === 'rejected' ? (active.reason as Error).message : undefined,
          completed: completed.status === 'rejected' ? (completed.reason as Error).message : undefined,
          failed: failed.status === 'rejected' ? (failed.reason as Error).message : undefined
        }
      };
    } catch (error) {
      logger.error('Failed to get queue stats', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to get queue stats: ${error instanceof Error ? error.message : String(error)}`);
    }
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

