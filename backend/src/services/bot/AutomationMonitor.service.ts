/**
 * Automation Monitor Service
 * Monitors automation health, queue status, and service availability
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { circuitBreakers } from '../../utils/circuitBreaker';
import { logger } from '../../utils/logger';

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  lastCheck: Date;
  metadata?: Record<string, any>;
}

export interface AutomationMetrics {
  queueStats: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  circuitBreakers: Array<{
    name: string;
    state: string;
    failureCount: number;
  }>;
  healthChecks: HealthCheck[];
  timestamp: Date;
}

export class AutomationMonitorService {
  private redis: Redis;
  private tipQueue: Queue;
  private notificationQueue: Queue;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor(redis: Redis, tipQueue: Queue, notificationQueue: Queue) {
    this.redis = redis;
    this.tipQueue = tipQueue;
    this.notificationQueue = notificationQueue;
  }

  /**
   * Start automated health monitoring
   */
  startMonitoring(): void {
    if (this.healthCheckInterval) {
      return; // Already monitoring
    }

    // Run initial health check
    this.performHealthCheck();

    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);

    logger.info('Automation monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    logger.info('Automation monitoring stopped');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Check Redis
    checks.push(await this.checkRedis());

    // Check queues
    checks.push(await this.checkQueue('tip-processing', this.tipQueue));
    checks.push(await this.checkQueue('notifications', this.notificationQueue));

    // Check circuit breakers
    checks.push(...this.checkCircuitBreakers());

    // Log critical issues
    const unhealthy = checks.filter(c => c.status === 'unhealthy');
    if (unhealthy.length > 0) {
      logger.warn('Unhealthy services detected', {
        services: unhealthy.map(c => c.service),
      });
    }

    // Store health check results in Redis
    await this.redis.setex(
      'automation:health:latest',
      300, // 5 minutes TTL
      JSON.stringify(checks)
    );

    return checks;
  }

  /**
   * Check Redis health
   */
  private async checkRedis(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      await this.redis.ping();
      const latency = Date.now() - startTime;

      return {
        service: 'redis',
        status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
        latency,
        lastCheck: new Date(),
        metadata: {
          info: await this.redis.info('server').catch(() => null),
        },
      };
    } catch (error: any) {
      return {
        service: 'redis',
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check queue health
   */
  private async checkQueue(name: string, queue: Queue): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);

      const latency = Date.now() - startTime;
      const total = waiting + active;
      const failureRate = failed / (completed + failed || 1);

      // Determine status based on metrics
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (failureRate > 0.1 || total > 1000) {
        status = 'unhealthy';
      } else if (failureRate > 0.05 || total > 500) {
        status = 'degraded';
      }

      return {
        service: `queue:${name}`,
        status,
        latency,
        lastCheck: new Date(),
        metadata: {
          waiting,
          active,
          completed,
          failed,
          failureRate: (failureRate * 100).toFixed(2) + '%',
        },
      };
    } catch (error: any) {
      return {
        service: `queue:${name}`,
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check circuit breaker states
   */
  private checkCircuitBreakers(): HealthCheck[] {
    return Object.entries(circuitBreakers).map(([name, breaker]) => {
      const stats = breaker.getStats();
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (stats.state === 'OPEN') {
        status = 'unhealthy';
      } else if (stats.state === 'HALF_OPEN' || stats.failureCount > 0) {
        status = 'degraded';
      }

      return {
        service: `circuit-breaker:${name}`,
        status,
        lastCheck: new Date(),
        metadata: {
          state: stats.state,
          failureCount: stats.failureCount,
          lastFailureTime: stats.lastFailureTime,
        },
      };
    });
  }

  /**
   * Get current metrics
   */
  async getMetrics(): Promise<AutomationMetrics> {
    const [tipStats, notifStats, healthChecks] = await Promise.all([
      this.getQueueStats(this.tipQueue),
      this.getQueueStats(this.notificationQueue),
      this.getLatestHealthChecks(),
    ]);

    return {
      queueStats: {
        waiting: tipStats.waiting + notifStats.waiting,
        active: tipStats.active + notifStats.active,
        completed: tipStats.completed + notifStats.completed,
        failed: tipStats.failed + notifStats.failed,
      },
      circuitBreakers: Object.entries(circuitBreakers).map(([name, breaker]) => {
        const stats = breaker.getStats();
        return {
          name,
          state: stats.state,
          failureCount: stats.failureCount,
        };
      }),
      healthChecks,
      timestamp: new Date(),
    };
  }

  /**
   * Get queue statistics
   */
  private async getQueueStats(queue: Queue) {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  /**
   * Get latest health check results
   */
  private async getLatestHealthChecks(): Promise<HealthCheck[]> {
    const cached = await this.redis.get('automation:health:latest');
    if (cached) {
      return JSON.parse(cached);
    }

    // If no cached results, perform new check
    return await this.performHealthCheck();
  }

  /**
   * Check if automation system is healthy
   */
  async isHealthy(): Promise<boolean> {
    const checks = await this.performHealthCheck();
    const criticalServices = ['redis', 'queue:tip-processing'];
    
    const criticalStatuses = checks
      .filter(c => criticalServices.includes(c.service))
      .map(c => c.status);

    // System is healthy if no critical service is unhealthy
    return !criticalStatuses.includes('unhealthy');
  }

  /**
   * Get health summary
   */
  async getHealthSummary(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: HealthCheck[];
  }> {
    const checks = await this.performHealthCheck();
    const statuses = checks.map(c => c.status);

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (statuses.includes('unhealthy')) {
      overall = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overall = 'degraded';
    }

    return {
      overall,
      services: checks,
    };
  }
}

