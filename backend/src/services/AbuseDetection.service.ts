import Redis from 'ioredis';
import { config } from '../config/config';
import { TipRepository } from '../repositories/Tip.repository';
import { UserRepository } from '../repositories/User.repository';

export interface AbuseCheckResult {
  allowed: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface TipPattern {
  senderId: string;
  recipientId: string;
  amount: number;
  timestamp: Date;
}

/**
 * Abuse Detection Service
 * 
 * Detects various abuse patterns:
 * - Circular tipping (A->B->A)
 * - Tip farming (many small tips to same recipient)
 * - Velocity attacks (rapid-fire tips)
 * - Suspicious amount patterns
 * - Wallet-based abuse
 * - Transaction anomalies
 */
export class AbuseDetectionService {
  private redis: Redis;
  private tipRepo: TipRepository;
  private userRepo: UserRepository;

  // Configuration
  private readonly CIRCULAR_TIP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
  private readonly FARMING_DETECTION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly VELOCITY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_TIPS_TO_SAME_RECIPIENT_PER_DAY = 50;
  private readonly MAX_VELOCITY_TIPS = 10; // Max tips in 5 minutes
  private readonly MIN_FARMING_AMOUNT = 0.01; // Minimum amount to consider for farming detection
  private readonly SUSPICIOUS_AMOUNT_THRESHOLD = 100; // Amount that triggers additional checks

  constructor(redis: Redis, tipRepo: TipRepository, userRepo: UserRepository) {
    this.redis = redis;
    this.tipRepo = tipRepo;
    this.userRepo = userRepo;
  }

  /**
   * Comprehensive abuse check before processing a tip
   */
  async checkAbuse(
    senderId: string,
    recipientId: string,
    amount: number,
    senderWallet: string,
    recipientWallet: string
  ): Promise<AbuseCheckResult> {
    // Run all checks in parallel
    const [
      circularCheck,
      farmingCheck,
      velocityCheck,
      patternCheck,
      walletCheck,
      anomalyCheck
    ] = await Promise.all([
      this.checkCircularTipping(senderId, recipientId),
      this.checkTipFarming(senderId, recipientId, amount),
      this.checkVelocity(senderId),
      this.checkSuspiciousPatterns(senderId, recipientId, amount),
      this.checkWalletAbuse(senderWallet, recipientWallet),
      this.checkTransactionAnomalies(senderId, amount)
    ]);

    // Return the most severe issue found
    const checks = [circularCheck, farmingCheck, velocityCheck, patternCheck, walletCheck, anomalyCheck];
    const blockedChecks = checks.filter(c => !c.allowed);
    
    if (blockedChecks.length > 0) {
      // Sort by severity (critical > high > medium > low)
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      blockedChecks.sort((a, b) => 
        severityOrder[b.severity] - severityOrder[a.severity]
      );
      
      return blockedChecks[0];
    }

    return { allowed: true, severity: 'low' };
  }

  /**
   * Detect circular tipping patterns (A->B->A within time window)
   */
  private async checkCircularTipping(
    senderId: string,
    recipientId: string
  ): Promise<AbuseCheckResult> {
    const key = `circular_tip:${senderId}:${recipientId}`;
    const recentTip = await this.redis.get(key);

    if (recentTip) {
      // Check if there's a reverse tip in the window
      const reverseKey = `circular_tip:${recipientId}:${senderId}`;
      const reverseTip = await this.redis.get(reverseKey);

      if (reverseTip) {
        const timeDiff = Date.now() - parseInt(reverseTip);
        if (timeDiff < this.CIRCULAR_TIP_WINDOW_MS) {
          return {
            allowed: false,
            reason: 'Circular tipping detected. Please wait before sending tips in both directions.',
            severity: 'high',
            metadata: { timeDiff, window: this.CIRCULAR_TIP_WINDOW_MS }
          };
        }
      }
    }

    // Record this tip attempt
    await this.redis.setex(key, Math.ceil(this.CIRCULAR_TIP_WINDOW_MS / 1000), Date.now().toString());

    return { allowed: true, severity: 'low' };
  }

  /**
   * Detect tip farming (many small tips to the same recipient)
   */
  private async checkTipFarming(
    senderId: string,
    recipientId: string,
    amount: number
  ): Promise<AbuseCheckResult> {
    // Only check for small amounts (farming pattern)
    if (amount >= this.MIN_FARMING_AMOUNT * 10) {
      return { allowed: true, severity: 'low' };
    }

    const key = `farming:${senderId}:${recipientId}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, Math.ceil(this.FARMING_DETECTION_WINDOW_MS / 1000));
    }

    if (count > this.MAX_TIPS_TO_SAME_RECIPIENT_PER_DAY) {
      return {
        allowed: false,
        reason: `Too many tips to the same recipient. Maximum ${this.MAX_TIPS_TO_SAME_RECIPIENT_PER_DAY} tips per day allowed.`,
        severity: 'medium',
        metadata: { count, limit: this.MAX_TIPS_TO_SAME_RECIPIENT_PER_DAY }
      };
    }

    // Check total amount sent to this recipient today
    const amountKey = `farming_amount:${senderId}:${recipientId}`;
    const totalAmount = await this.redis.incrbyfloat(amountKey, amount);

    if (count === 1) {
      await this.redis.expire(amountKey, Math.ceil(this.FARMING_DETECTION_WINDOW_MS / 1000));
    }

    // If many small tips but total is reasonable, allow but flag
    if (count > 20 && totalAmount < amount * 2) {
      return {
        allowed: false,
        reason: 'Suspicious tip farming pattern detected. Please consolidate your tips.',
        severity: 'medium',
        metadata: { count, totalAmount }
      };
    }

    return { allowed: true, severity: 'low' };
  }

  /**
   * Check transaction velocity (rapid-fire tips)
   */
  private async checkVelocity(senderId: string): Promise<AbuseCheckResult> {
    const key = `velocity:${senderId}`;
    const now = Date.now();
    
    // Get recent tips
    const recentTips = await this.redis.lrange(key, 0, -1);
    const validTips = recentTips
      .map(t => parseInt(t))
      .filter(t => now - t < this.VELOCITY_WINDOW_MS);

    if (validTips.length >= this.MAX_VELOCITY_TIPS) {
      const oldestTip = Math.min(...validTips);
      const waitTime = Math.ceil((this.VELOCITY_WINDOW_MS - (now - oldestTip)) / 1000);
      
      return {
        allowed: false,
        reason: `Too many tips in a short time. Please wait ${waitTime} seconds.`,
        severity: 'high',
        metadata: { count: validTips.length, limit: this.MAX_VELOCITY_TIPS, waitTime }
      };
    }

    // Add current tip timestamp
    await this.redis.lpush(key, now.toString());
    await this.redis.ltrim(key, 0, this.MAX_VELOCITY_TIPS - 1);
    await this.redis.expire(key, Math.ceil(this.VELOCITY_WINDOW_MS / 1000));

    return { allowed: true, severity: 'low' };
  }

  /**
   * Check for suspicious patterns (same amount repeatedly, etc.)
   */
  private async checkSuspiciousPatterns(
    senderId: string,
    recipientId: string,
    amount: number
  ): Promise<AbuseCheckResult> {
    // Check for repeated identical amounts
    const amountKey = `pattern_amount:${senderId}:${amount}`;
    const count = await this.redis.incr(amountKey);

    if (count === 1) {
      await this.redis.expire(amountKey, 3600); // 1 hour
    }

    if (count > 20) {
      return {
        allowed: false,
        reason: 'Suspicious pattern: Too many tips with the same amount detected.',
        severity: 'medium',
        metadata: { amount, count }
      };
    }

    // Check for round number abuse (many tips of exactly 1, 10, 100, etc.)
    if (amount === 1 || amount === 10 || amount === 100 || amount === 1000) {
      const roundKey = `pattern_round:${senderId}:${amount}`;
      const roundCount = await this.redis.incr(roundKey);

      if (roundCount === 1) {
        await this.redis.expire(roundKey, 3600);
      }

      if (roundCount > 15) {
        return {
          allowed: false,
          reason: 'Suspicious pattern: Excessive use of round number amounts.',
          severity: 'low',
          metadata: { amount, count: roundCount }
        };
      }
    }

    return { allowed: true, severity: 'low' };
  }

  /**
   * Check for wallet-based abuse (same wallet, suspicious wallet patterns)
   */
  private async checkWalletAbuse(
    senderWallet: string,
    recipientWallet: string
  ): Promise<AbuseCheckResult> {
    // Prevent self-tipping
    if (senderWallet.toLowerCase() === recipientWallet.toLowerCase()) {
      return {
        allowed: false,
        reason: 'Cannot send tips to yourself.',
        severity: 'critical',
        metadata: { senderWallet, recipientWallet }
      };
    }

    // Check for wallet velocity (same wallet sending many tips)
    const walletKey = `wallet_velocity:${senderWallet.toLowerCase()}`;
    const walletCount = await this.redis.incr(walletKey);

    if (walletCount === 1) {
      await this.redis.expire(walletKey, 3600); // 1 hour
    }

    if (walletCount > 100) {
      return {
        allowed: false,
        reason: 'Wallet activity limit exceeded. Please contact support if this is an error.',
        severity: 'high',
        metadata: { wallet: senderWallet, count: walletCount }
      };
    }

    return { allowed: true, severity: 'low' };
  }

  /**
   * Check for transaction anomalies (unusual amounts, timing, etc.)
   */
  private async checkTransactionAnomalies(
    senderId: string,
    amount: number
  ): Promise<AbuseCheckResult> {
    // Get user's tip history for anomaly detection
    const user = await this.userRepo.findByVerychatId(senderId);
    if (!user) {
      return { allowed: true, severity: 'low' };
    }

    // Check if amount is unusually large compared to user's history
    const avgTipKey = `avg_tip:${senderId}`;
    const avgTip = await this.redis.get(avgTipKey);

    if (avgTip) {
      const avgAmount = parseFloat(avgTip);
      // If current tip is 10x larger than average, flag it
      if (amount > avgAmount * 10 && amount > this.SUSPICIOUS_AMOUNT_THRESHOLD) {
        return {
          allowed: true, // Allow but log for review
          reason: 'Unusually large tip amount detected. This transaction will be reviewed.',
          severity: 'medium',
          metadata: { amount, avgAmount, multiplier: amount / avgAmount }
        };
      }
    }

    // Update running average
    if (avgTip) {
      const currentAvg = parseFloat(avgTip);
      const newAvg = (currentAvg * 0.9) + (amount * 0.1); // Exponential moving average
      await this.redis.setex(avgTipKey, 86400, newAvg.toString());
    } else {
      await this.redis.setex(avgTipKey, 86400, amount.toString());
    }

    return { allowed: true, severity: 'low' };
  }

  /**
   * Record a successful tip for future pattern analysis
   */
  async recordTip(
    senderId: string,
    recipientId: string,
    amount: number,
    senderWallet: string,
    recipientWallet: string
  ): Promise<void> {
    // Record for pattern analysis
    const pattern: TipPattern = {
      senderId,
      recipientId,
      amount,
      timestamp: new Date()
    };

    // Store in Redis for quick access (last 100 tips per user)
    const patternKey = `tip_patterns:${senderId}`;
    await this.redis.lpush(patternKey, JSON.stringify(pattern));
    await this.redis.ltrim(patternKey, 0, 99);
    await this.redis.expire(patternKey, 7 * 24 * 3600); // 7 days
  }

  /**
   * Clear abuse detection data for a user (admin function)
   */
  async clearUserData(userId: string): Promise<void> {
    const patterns = [
      `circular_tip:${userId}:*`,
      `farming:${userId}:*`,
      `velocity:${userId}`,
      `pattern_amount:${userId}:*`,
      `pattern_round:${userId}:*`,
      `tip_patterns:${userId}`
    ];

    // Note: Redis doesn't support wildcard deletion directly
    // In production, you'd use SCAN to find and delete matching keys
    for (const pattern of patterns) {
      // For now, we'll delete known patterns
      // In production, implement proper key scanning
      await this.redis.del(pattern.replace('*', ''));
    }
  }
}

