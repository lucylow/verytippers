import Redis from 'ioredis';
import { config } from '../config/config';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds until next request allowed
  reason?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  blockDurationMs?: number; // Optional: block user after exceeding limit
}

/**
 * Enhanced Rate Limiting Service
 * 
 * Provides multi-layered rate limiting:
 * - User-based rate limiting
 * - IP-based rate limiting
 * - Wallet-based rate limiting
 * - Amount-based rate limiting (for large transactions)
 * - KYC-level based rate limiting (higher limits for verified users)
 */
export class RateLimitService {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Check rate limit with sliding window algorithm
   */
  async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const { windowMs, maxRequests, keyPrefix, blockDurationMs } = config;
    const fullKey = `${keyPrefix}:${key}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Use sorted set for sliding window
      const zsetKey = `${fullKey}:zset`;
      
      // Remove old entries outside the window
      await this.redis.zremrangebyscore(zsetKey, 0, windowStart);
      
      // Count current requests in window
      const count = await this.redis.zcard(zsetKey);
      
      if (count >= maxRequests) {
        // Get oldest request to calculate retry time
        const oldest = await this.redis.zrange(zsetKey, 0, 0, 'WITHSCORES');
        const oldestTime = oldest.length > 0 ? parseInt(oldest[1]) : now;
        const retryAfter = Math.ceil((oldestTime + windowMs - now) / 1000);
        const resetAt = new Date(oldestTime + windowMs);

        // Optionally block the user
        if (blockDurationMs) {
          const blockKey = `${fullKey}:blocked`;
          await this.redis.setex(blockKey, Math.ceil(blockDurationMs / 1000), '1');
        }

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfter,
          reason: `Rate limit exceeded. Maximum ${maxRequests} requests per ${Math.ceil(windowMs / 1000 / 60)} minutes.`
        };
      }

      // Add current request
      await this.redis.zadd(zsetKey, now, `${now}-${Math.random()}`);
      await this.redis.expire(zsetKey, Math.ceil(windowMs / 1000));

      const remaining = maxRequests - count - 1;
      const resetAt = new Date(now + windowMs);

      return {
        allowed: true,
        remaining,
        resetAt
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if Redis fails
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: new Date(now + windowMs)
      };
    }
  }

  /**
   * Check if user is blocked
   */
  async isBlocked(key: string, keyPrefix: string): Promise<boolean> {
    const blockKey = `${keyPrefix}:${key}:blocked`;
    const blocked = await this.redis.get(blockKey);
    return blocked === '1';
  }

  /**
   * User-based rate limiting (per user ID)
   */
  async checkUserRateLimit(
    userId: string,
    kycLevel: number = 0
  ): Promise<RateLimitResult> {
    // Higher limits for verified users
    const baseConfig: RateLimitConfig = {
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      maxRequests: kycLevel >= 2 ? 500 : kycLevel >= 1 ? 200 : 100, // Higher limits for KYC
      keyPrefix: 'rate_limit:user',
      blockDurationMs: 60 * 60 * 1000 // 1 hour block after exceeding
    };

    return this.checkRateLimit(userId, baseConfig);
  }

  /**
   * IP-based rate limiting
   */
  async checkIPRateLimit(ip: string): Promise<RateLimitResult> {
    const config: RateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      keyPrefix: 'rate_limit:ip',
      blockDurationMs: 30 * 60 * 1000 // 30 minute block
    };

    return this.checkRateLimit(ip, config);
  }

  /**
   * Wallet-based rate limiting
   */
  async checkWalletRateLimit(
    walletAddress: string,
    kycLevel: number = 0
  ): Promise<RateLimitResult> {
    const normalizedWallet = walletAddress.toLowerCase();
    const config: RateLimitConfig = {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: kycLevel >= 2 ? 200 : kycLevel >= 1 ? 100 : 50,
      keyPrefix: 'rate_limit:wallet',
      blockDurationMs: 2 * 60 * 60 * 1000 // 2 hour block
    };

    return this.checkRateLimit(normalizedWallet, config);
  }

  /**
   * Amount-based rate limiting (for large transactions)
   */
  async checkAmountRateLimit(
    userId: string,
    amount: number,
    kycLevel: number = 0
  ): Promise<RateLimitResult> {
    // Only apply to large amounts
    const threshold = kycLevel >= 2 ? 10000 : kycLevel >= 1 ? 5000 : 1000;
    
    if (amount < threshold) {
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    }

    // Stricter limits for large transactions
    const config: RateLimitConfig = {
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      maxRequests: kycLevel >= 2 ? 10 : kycLevel >= 1 ? 5 : 2,
      keyPrefix: 'rate_limit:amount',
      blockDurationMs: 24 * 60 * 60 * 1000 // 24 hour block for large transaction abuse
    };

    return this.checkRateLimit(`${userId}:large`, config);
  }

  /**
   * Comprehensive rate limit check (all layers)
   */
  async checkAllRateLimits(
    userId: string,
    ip: string,
    walletAddress: string,
    amount: number,
    kycLevel: number = 0
  ): Promise<{ allowed: boolean; reason?: string; results: RateLimitResult[] }> {
    const [
      userCheck,
      ipCheck,
      walletCheck,
      amountCheck
    ] = await Promise.all([
      this.checkUserRateLimit(userId, kycLevel),
      this.checkIPRateLimit(ip),
      this.checkWalletRateLimit(walletAddress, kycLevel),
      this.checkAmountRateLimit(userId, amount, kycLevel)
    ]);

    const results = [userCheck, ipCheck, walletCheck, amountCheck];
    const blocked = results.find(r => !r.allowed);

    if (blocked) {
      return {
        allowed: false,
        reason: blocked.reason,
        results
      };
    }

    return {
      allowed: true,
      results
    };
  }

  /**
   * Clear rate limit for a key (admin function)
   */
  async clearRateLimit(key: string, keyPrefix: string): Promise<void> {
    const fullKey = `${keyPrefix}:${key}`;
    const zsetKey = `${fullKey}:zset`;
    const blockKey = `${fullKey}:blocked`;
    
    await Promise.all([
      this.redis.del(zsetKey),
      this.redis.del(blockKey)
    ]);
  }

  /**
   * Get rate limit status for a key
   */
  async getRateLimitStatus(
    key: string,
    config: RateLimitConfig
  ): Promise<{ count: number; remaining: number; resetAt: Date }> {
    const fullKey = `${config.keyPrefix}:${key}`;
    const zsetKey = `${fullKey}:zset`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Remove old entries
    await this.redis.zremrangebyscore(zsetKey, 0, windowStart);
    
    const count = await this.redis.zcard(zsetKey);
    const remaining = Math.max(0, config.maxRequests - count);
    
    // Get oldest request to calculate reset time
    const oldest = await this.redis.zrange(zsetKey, 0, 0, 'WITHSCORES');
    const oldestTime = oldest.length > 0 ? parseInt(oldest[1]) : now;
    const resetAt = new Date(oldestTime + config.windowMs);

    return { count, remaining, resetAt };
  }
}

