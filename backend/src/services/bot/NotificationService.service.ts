/**
 * Automated Notification Service
 * Handles bot notifications with retry logic, batching, and rate limiting
 */

import { VerychatApiService } from '../verychat/VerychatApi.service';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../../config/config';
import { circuitBreakers } from '../../utils/circuitBreaker';
import { logger } from '../../utils/logger';

export interface Notification {
  chatId: string;
  message: string;
  parseMode?: 'Markdown' | 'HTML' | 'Plain';
  priority?: 'low' | 'normal' | 'high';
  retryable?: boolean;
  metadata?: Record<string, any>;
}

interface NotificationJob {
  notification: Notification;
  attempts: number;
  lastAttempt?: number;
}

export class NotificationService {
  private queue: Queue;
  private worker: Worker;
  private verychat: VerychatApiService;
  private redis: Redis;
  private batchTimer: NodeJS.Timeout | null = null;
  private batchQueue: NotificationJob[] = [];
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 1000; // 1 second

  constructor(redis: Redis) {
    this.redis = redis;
    this.verychat = new VerychatApiService();

    // Initialize notification queue
    this.queue = new Queue('notifications', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep for 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed for 7 days
        },
      },
    });

    // Initialize worker
    this.worker = new Worker(
      'notifications',
      this.processNotification.bind(this),
      {
        connection: redis,
        concurrency: 5,
        limiter: {
          max: 50, // Max 50 notifications per second
          duration: 1000,
        },
      }
    );

    this.setupEventHandlers();
    this.startBatchProcessor();
  }

  /**
   * Send a notification (queued)
   */
  async send(notification: Notification): Promise<string> {
    const priority = this.getPriorityValue(notification.priority || 'normal');

    const job = await this.queue.add(
      'send-notification',
      {
        notification,
        attempts: 0,
      } as NotificationJob,
      {
        priority,
        jobId: `notif-${notification.chatId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      }
    );

    logger.info('Notification queued', {
      jobId: job.id,
      chatId: notification.chatId,
      priority: notification.priority,
    });

    return job.id!;
  }

  /**
   * Send multiple notifications (batched)
   */
  async sendBatch(notifications: Notification[]): Promise<string[]> {
    const jobIds: string[] = [];

    for (const notification of notifications) {
      const jobId = await this.send(notification);
      jobIds.push(jobId);
    }

    return jobIds;
  }

  /**
   * Process a single notification
   */
  private async processNotification(job: Job<NotificationJob>): Promise<void> {
    const { notification, attempts } = job.data;

    try {
      // Check circuit breaker
      if (circuitBreakers.verychat.getState() === 'OPEN') {
        throw new Error('VeryChat API circuit breaker is OPEN');
      }

      // Check rate limit
      const rateLimited = await this.checkRateLimit(notification.chatId);
      if (rateLimited) {
        // Reschedule for later
        await job.moveToDelayed(Date.now() + 5000);
        return;
      }

      // Send notification via circuit breaker
      const sent = await circuitBreakers.verychat.execute(async () => {
        return await this.verychat.sendBotMessage(
          notification.chatId,
          notification.message,
          {
            parse_mode: notification.parseMode || 'Markdown',
          }
        );
      });

      if (!sent) {
        throw new Error('Failed to send notification');
      }

      // Update rate limit counter
      await this.updateRateLimit(notification.chatId);

      logger.info('Notification sent successfully', {
        jobId: job.id,
        chatId: notification.chatId,
        attempts: attempts + 1,
      });
    } catch (error: any) {
      logger.error('Notification send failed', {
        jobId: job.id,
        chatId: notification.chatId,
        error: error.message,
        attempts: attempts + 1,
      });

      // Update job data
      job.data.attempts = attempts + 1;
      job.data.lastAttempt = Date.now();

      // Check if we should retry
      if (notification.retryable !== false && attempts < 2) {
        throw error; // Will trigger retry
      }

      // Max retries exceeded, move to dead letter or log
      await this.handleFailedNotification(job.data.notification, error);
      throw error;
    }
  }

  /**
   * Check rate limit for a chat
   */
  private async checkRateLimit(chatId: string): Promise<boolean> {
    const key = `notification:rate_limit:${chatId}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, 60); // 1 minute window
    }

    // Max 10 notifications per minute per chat
    return current > 10;
  }

  /**
   * Update rate limit counter
   */
  private async updateRateLimit(chatId: string): Promise<void> {
    const key = `notification:rate_limit:${chatId}`;
    // Already incremented in checkRateLimit, just ensure TTL
    await this.redis.expire(key, 60);
  }

  /**
   * Handle failed notifications
   */
  private async handleFailedNotification(
    notification: Notification,
    error: Error
  ): Promise<void> {
    // Log to dead letter queue in Redis
    const dlqKey = `notification:dlq:${Date.now()}`;
    await this.redis.setex(
      dlqKey,
      7 * 24 * 3600, // 7 days
      JSON.stringify({
        notification,
        error: error.message,
        timestamp: Date.now(),
      })
    );

    logger.error('Notification moved to DLQ', {
      chatId: notification.chatId,
      error: error.message,
    });
  }

  /**
   * Batch processor for notifications
   */
  private startBatchProcessor(): void {
    this.batchTimer = setInterval(async () => {
      if (this.batchQueue.length === 0) {
        return;
      }

      const batch = this.batchQueue.splice(0, this.BATCH_SIZE);
      
      try {
        // Process batch in parallel
        await Promise.allSettled(
          batch.map(job => this.send(job.notification))
        );
      } catch (error) {
        logger.error('Batch notification processing error', { error });
      }
    }, this.BATCH_DELAY);
  }

  /**
   * Get priority value for queue
   */
  private getPriorityValue(priority: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high':
        return 1;
      case 'normal':
        return 5;
      case 'low':
        return 10;
      default:
        return 5;
    }
  }

  /**
   * Setup worker event handlers
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      logger.debug('Notification job completed', { jobId: job.id });
    });

    this.worker.on('failed', (job, err) => {
      logger.error('Notification job failed', {
        jobId: job?.id,
        error: err.message,
      });
    });

    this.worker.on('error', (err) => {
      logger.error('Notification worker error', { error: err });
    });
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    await this.worker.close();
    await this.queue.close();
  }
}

