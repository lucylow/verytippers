import { ethers } from 'ethers';
import { VeryChainService } from './blockchain/VeryChain.service';
import { VerychatApiService } from './verychat/VerychatApi.service';
import { UserRepository } from '../repositories/User.repository';
import { TipRepository } from '../repositories/Tip.repository';
import { AbuseDetectionService } from './AbuseDetection.service';
import { RateLimitService } from './RateLimit.service';
import { config } from '../config/config';
import Redis from 'ioredis';
import crypto from 'crypto';
import axios from 'axios';
import FormData from 'form-data';

interface TipRequest {
  senderId: string;
  recipientUsername: string;
  amount: number;
  token: 'VERY' | 'USDC';
  message?: string;
  chatId: string;
  ip?: string; // Optional IP address for rate limiting
}

interface TipResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  tipId?: number;
  message?: string;
}

export class TippingService {
  private redis: Redis;
  private veryChain: VeryChainService;
  private verychat: VerychatApiService;
  private userRepo: UserRepository;
  private tipRepo: TipRepository;
  private abuseDetection: AbuseDetectionService;
  private rateLimitService: RateLimitService;

  constructor() {
    this.redis = new Redis({
      host: config.REDIS.HOST,
      port: config.REDIS.PORT,
      password: config.REDIS.PASSWORD || undefined,
      ...(config.REDIS.URL && { url: config.REDIS.URL })
    });
    this.veryChain = new VeryChainService();
    this.verychat = new VerychatApiService(this.redis);
    this.userRepo = new UserRepository();
    this.tipRepo = new TipRepository();
    this.abuseDetection = new AbuseDetectionService(this.redis, this.tipRepo, this.userRepo);
    this.rateLimitService = new RateLimitService(this.redis);
  }

  async processTip(request: TipRequest): Promise<TipResult> {
    try {
      // 1. Get sender and recipient info (needed for all checks)
      let sender = await this.userRepo.findByVerychatId(request.senderId);
      const recipients = await this.verychat.getUsersByUsername(request.recipientUsername.replace('@', ''));

      if (!recipients.length) {
        return {
          success: false,
          error: `User @${request.recipientUsername} not found.`
        };
      }

      const recipientUser = recipients[0];

      // Create sender if doesn't exist
      if (!sender) {
        const senderVerychatUser = await this.verychat.getUser(request.senderId).catch(() => null);
        if (senderVerychatUser) {
          sender = await this.userRepo.create({
            verychatId: request.senderId,
            username: senderVerychatUser.username,
            walletAddress: senderVerychatUser.walletAddress,
            isKycVerified: senderVerychatUser.kycStatus === 'verified',
            kycMetadata: { kycStatus: senderVerychatUser.kycStatus }
          });
        } else {
          return {
            success: false,
            error: 'Sender not found in VeryChat system.'
          };
        }
      }

      // 2. Get wallet addresses (needed for abuse detection and rate limiting)
      const senderWallet = sender.walletAddress || await this.verychat.getWalletAddress(request.senderId);
      const recipientWallet = recipientUser.walletAddress;

      if (!senderWallet || !recipientWallet) {
        return {
          success: false,
          error: 'Wallet address not found for one or both users.'
        };
      }

      // 3. Enhanced KYC verification with validation
      const senderKYC = await this.verychat.verifyKYCWithValidation(
        request.senderId,
        request.amount,
        'send'
      );
      if (!senderKYC.allowed) {
        return {
          success: false,
          error: senderKYC.reason || 'KYC verification failed.'
        };
      }

      const recipientKYC = await this.verychat.verifyKYCWithValidation(
        recipientUser.id,
        request.amount,
        'receive'
      );
      if (!recipientKYC.allowed) {
        return {
          success: false,
          error: recipientKYC.reason || 'Recipient KYC verification failed.'
        };
      }

      // 4. Multi-layered rate limiting
      const ip = request.ip || 'unknown';
      const rateLimitCheck = await this.rateLimitService.checkAllRateLimits(
        request.senderId,
        ip,
        senderWallet,
        request.amount,
        senderKYC.kyc.level
      );

      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: rateLimitCheck.reason || 'Rate limit exceeded. Please wait before sending more tips.'
        };
      }

      // 5. Abuse detection
      const abuseCheck = await this.abuseDetection.checkAbuse(
        request.senderId,
        recipientUser.id,
        request.amount,
        senderWallet,
        recipientWallet
      );

      if (!abuseCheck.allowed) {
        // Log high-severity abuse attempts
        if (abuseCheck.severity === 'high' || abuseCheck.severity === 'critical') {
          const { logger } = require('../utils/logger');
          logger.warn('Abuse detected', {
            senderId: request.senderId,
            recipientId: recipientUser.id,
            amount: request.amount,
            reason: abuseCheck.reason,
            severity: abuseCheck.severity,
            metadata: abuseCheck.metadata
          });
        }

        return {
          success: false,
          error: abuseCheck.reason || 'Transaction blocked due to abuse detection.'
        };
      }

      // 6. Check sender balance
      const tokenAddress = this.getTokenAddress(request.token);
      const senderBalance = await this.veryChain.getTokenBalance(senderWallet, tokenAddress);
      const amountInWei = ethers.parseUnits(request.amount.toString(), 18);

      if (BigInt(senderBalance) < amountInWei) {
        return {
          success: false,
          error: `Insufficient balance. You have ${ethers.formatUnits(senderBalance, 18)} ${request.token}, need ${request.amount}.`
        };
      }

      // 7. Store message on IPFS if provided
      let messageHash = '';
      if (request.message) {
        messageHash = await this.storeMessageOnIPFS(request.message, recipientUser.id);
      }

      // 8. Send transaction
      const txResult = await this.veryChain.sendTip(
        senderWallet,
        recipientWallet,
        tokenAddress,
        amountInWei.toString(),
        messageHash
      );

      // 9. Record successful tip for abuse detection patterns
      await this.abuseDetection.recordTip(
        request.senderId,
        recipientUser.id,
        request.amount,
        senderWallet,
        recipientWallet
      );

      // 10. Update database
      await this.updateDatabaseAfterTip({
        senderId: request.senderId,
        senderWallet,
        recipientId: recipientUser.id,
        recipientWallet,
        amount: amountInWei.toString(),
        tokenAddress,
        messageHash,
        transactionHash: txResult.txHash,
        tipId: txResult.tipId,
        message: request.message
      });

      // 11. Check and award badges (async, don't wait)
      setTimeout(() => {
        this.veryChain.checkAndAwardBadges(senderWallet).catch((error) => {
          const { logger } = require('../utils/logger');
          logger.error('Error checking and awarding badges', { error, senderWallet });
        });
      }, 5000);

      // 12. Send notification
      await this.sendNotifications(request, recipientUser, txResult.txHash);

      return {
        success: true,
        transactionHash: txResult.txHash,
        tipId: txResult.tipId,
        message: `Successfully sent ${request.amount} ${request.token} to @${recipientUser.username}!`
      };

    } catch (error: any) {
      const { logger } = require('../utils/logger');
      const { ErrorHandler } = require('../utils/errors');
      
      const appError = ErrorHandler.normalizeError(error, {
        userId: request.senderId,
        action: 'process_tip',
      });
      
      ErrorHandler.logError(appError);
      
      return {
        success: false,
        error: appError.message || 'Failed to process tip'
      };
    }
  }

  /**
   * Legacy rate limit check - kept for backward compatibility
   * @deprecated Use RateLimitService instead
   */
  private async checkRateLimit(userId: string): Promise<boolean> {
    const result = await this.rateLimitService.checkUserRateLimit(userId, 0);
    return !result.allowed;
  }

  private getTokenAddress(token: 'VERY' | 'USDC'): string {
    const tokenMap: Record<string, string> = {
      'VERY': config.VERY_CHAIN.VERY_TOKEN_ADDRESS,
      'USDC': config.VERY_CHAIN.USDC_TOKEN_ADDRESS
    };
    return tokenMap[token];
  }

  private async storeMessageOnIPFS(message: string, recipientId: string): Promise<string> {
    // Encrypt message for recipient
    const encrypted = await this.encryptMessage(message, recipientId);
    
    // Upload to IPFS
    try {
      const formData = new FormData();
      formData.append('file', Buffer.from(JSON.stringify({ encrypted })), {
        filename: 'message.json',
        contentType: 'application/json'
      });

      const response = await axios.post(`${config.IPFS.API_URL}/add`, formData, {
        headers: formData.getHeaders()
      });

      return response.data.Hash;
    } catch (error) {
      const { logger } = require('../utils/logger');
      logger.error('Error uploading to IPFS', { error, recipientId });
      // Return empty hash if IPFS fails - in production, you might want to retry or use a different IPFS service
      return '';
    }
  }

  private async encryptMessage(message: string, recipientId: string): Promise<string> {
    // Simplified encryption - in production, use proper ECIES
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(config.SECURITY.ENCRYPTION_KEY.slice(0, 32), 'utf8');
    const iv = crypto.randomBytes(12);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      encrypted,
      authTag,
      recipientId
    });
  }

  private async updateDatabaseAfterTip(data: {
    senderId: string;
    senderWallet: string;
    recipientId: string;
    recipientWallet: string;
    amount: string;
    tokenAddress: string;
    messageHash: string;
    transactionHash: string;
    tipId: number;
    message?: string;
  }): Promise<void> {
    await Promise.all([
      // Update sender stats
      this.userRepo.incrementTipsSent(data.senderId, data.amount),
      // Update recipient stats
      this.userRepo.incrementTipsReceived(data.recipientId, data.amount),
      // Record tip
      this.tipRepo.create({
        senderId: data.senderId,
        recipientId: data.recipientId,
        tokenAddress: data.tokenAddress,
        amount: data.amount,
        messageHash: data.messageHash,
        messageEncrypted: data.message ? await this.encryptMessage(data.message, data.recipientId) : undefined,
        transactionHash: data.transactionHash,
        status: 'confirmed',
        metadata: { tipId: data.tipId }
      }),
      // Update tip streak
      this.updateTipStreak(data.senderId),
      // Update unique users tipped
      this.userRepo.incrementUniqueUsersTipped(data.senderId, data.recipientId)
    ]);
  }

  private async updateTipStreak(userId: string): Promise<void> {
    const user = await this.userRepo.findByVerychatId(userId);
    if (!user) return;

    const now = new Date();
    const lastTip = user.lastTipDate ? new Date(user.lastTipDate) : null;
    
    if (!lastTip || this.isDifferentDay(lastTip, now)) {
      // New day
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastTip && this.isSameDay(lastTip, yesterday)) {
        // Consecutive day
        await this.userRepo.incrementTipStreak(userId);
      } else {
        // Break in streak, reset to 1
        await this.userRepo.setTipStreak(userId, 1);
      }
    }
    
    await this.userRepo.setLastTipDate(userId, now);
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  private isDifferentDay(date1: Date, date2: Date): boolean {
    return !this.isSameDay(date1, date2);
  }

  private async sendNotifications(
    request: TipRequest,
    recipient: any,
    txHash: string
  ): Promise<void> {
    const explorerUrl = `${config.VERY_CHAIN.EXPLORER_URL}/tx/${txHash}`;
    
    // Notify sender
    await this.verychat.sendBotMessage(request.chatId,
      `✅ Tip sent successfully!\n` +
      `To: @${recipient.username}\n` +
      `Amount: ${request.amount} ${request.token}\n` +
      `Transaction: [View on Explorer](${explorerUrl})`
    );

    // Notify recipient (if in a different chat)
    if (request.message) {
      await this.verychat.sendBotMessage(recipient.id,
        `🎉 You received a tip!\n` +
        `From: User in chat\n` +
        `Amount: ${request.amount} ${request.token}\n` +
        `Message: "${request.message}"\n` +
        `Transaction: [View on Explorer](${explorerUrl})`
      );
    }
  }
}

