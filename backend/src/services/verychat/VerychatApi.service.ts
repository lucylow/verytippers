import axios, { AxiosInstance } from 'axios';
import Redis from 'ioredis';
import { config } from '../../config/config';

/**
 * VeryChat API Service
 * 
 * Integration with VeryChat API for hackathon projects
 * Base URL: https://gapi.veryapi.io
 * 
 * 📚 Full Documentation: https://developers.verylabs.io/
 * 🔐 Project Registration: https://developers.verylabs.io/ (Register to get Project ID & API Key)
 * 
 * Setup Steps:
 * 1. Register your project at https://developers.verylabs.io/
 * 2. Obtain Project ID and API Key from the developer console
 * 3. Set VERYCHAT_PROJECT_ID and VERYCHAT_API_KEY in environment variables
 * 4. Configure webhook URL if using bot features
 * 
 * API Rate Limits:
 * - Per-project quotas are provided during hackathon events
 * - 429 status code indicates rate limit exceeded
 * - This service includes automatic retry with exponential backoff
 * 
 * Error Codes:
 * - 200: Success
 * - 400: Bad Request (check request parameters)
 * - 401: Authentication failed (check Project ID and API Key)
 * - 404: Resource not found
 * - 429: Rate limit exceeded (wait before retrying)
 * - 500: Server error (contact hackathon operations team)
 */
interface VeryChatUser {
  id: string;
  username: string;
  displayName: string;
  walletAddress: string;
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  createdAt: string;
  kycVerifiedAt?: string;
  kycLevel?: number;
}

interface VeryChatAuthResponse {
  verified: boolean;
  userId: string;
  walletAddress?: string;
}

export interface KYCVerificationResult {
  isVerified: boolean;
  level: number;
  status: 'none' | 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date;
  lastChecked: Date;
  cached: boolean;
}

export interface VeryChatApiStatus {
  isConfigured: boolean;
  isHealthy: boolean;
  lastCheck?: Date;
  rateLimitRemaining?: number;
  error?: string;
}

export class VerychatApiService {
  private client: AxiosInstance;
  private redis?: Redis;
  private cache: Map<string, { user: VeryChatUser; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  private kycCacheTTL = 10 * 60; // 10 minutes in seconds (for Redis)
  private rateLimitRemaining: number | null = null;
  private rateLimitReset: number | null = null;
  private apiStatus: VeryChatApiStatus = {
    isConfigured: false,
    isHealthy: false
  };
  private readonly DEVELOPERS_PORTAL_URL = 'https://developers.verylabs.io/';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1 second base delay

  constructor(redis?: Redis) {
    const baseURL = config.VERYCHAT_API.BASE_URL || 'https://gapi.veryapi.io';
    const projectId = config.VERYCHAT_API.PROJECT_ID;
    const apiKey = config.VERYCHAT_API.API_KEY;

    this.apiStatus.isConfigured = !!(projectId && apiKey);

    if (!projectId || !apiKey) {
      console.warn(
        `⚠️  VeryChat API not fully configured.\n` +
        `   Missing: ${!projectId ? 'VERYCHAT_PROJECT_ID' : ''}${!projectId && !apiKey ? ' and ' : ''}${!apiKey ? 'VERYCHAT_API_KEY' : ''}\n` +
        `   📝 Register your project at: ${this.DEVELOPERS_PORTAL_URL}\n` +
        `   📚 Documentation: ${this.DEVELOPERS_PORTAL_URL}`
      );
    }

    this.redis = redis;
    this.client = axios.create({
      baseURL,
      headers: {
        'X-Project-ID': projectId || '',
        'X-API-Key': apiKey || '',
        'Content-Type': 'application/json',
        'User-Agent': 'VeryTippers/1.0'
      },
      timeout: 10000 // 10 second timeout
    });

    // Enhanced request interceptor with rate limiting awareness
    this.client.interceptors.request.use(
      (config) => {
        // Check if we're rate limited
        if (this.rateLimitReset && Date.now() < this.rateLimitReset) {
          throw new Error(`Rate limit exceeded. Reset at ${new Date(this.rateLimitReset).toISOString()}`);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Enhanced response interceptor with rate limit tracking
    this.client.interceptors.response.use(
      (response) => {
        // Track rate limits from headers if available
        const remaining = response.headers['x-ratelimit-remaining'];
        const reset = response.headers['x-ratelimit-reset'];
        if (remaining !== undefined) {
          this.rateLimitRemaining = parseInt(remaining, 10);
        }
        if (reset !== undefined) {
          this.rateLimitReset = parseInt(reset, 10) * 1000; // Convert to milliseconds
        }
        return response;
      },
      async (error) => {
        const status = error.response?.status;
        const config = error.config;

        // Handle rate limiting (429) with retry
        if (status === 429 && config && !config.__retryCount) {
          config.__retryCount = config.__retryCount || 0;
          if (config.__retryCount < this.MAX_RETRIES) {
            config.__retryCount++;
            const retryAfter = error.response?.headers['retry-after'] || 60;
            const delay = this.RETRY_DELAY_BASE * Math.pow(2, config.__retryCount - 1);
            console.warn(
              `⚠️  Rate limit exceeded. Retrying in ${delay}ms (attempt ${config.__retryCount}/${this.MAX_RETRIES})`
            );
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.client(config);
          }
        }

        // Enhanced error messages with helpful links
        if (status === 401) {
          console.error(
            `❌ VeryChat API authentication failed.\n` +
            `   Please verify your Project ID and API Key.\n` +
            `   📝 Register/Update at: ${this.DEVELOPERS_PORTAL_URL}\n` +
            `   📚 Documentation: ${this.DEVELOPERS_PORTAL_URL}`
          );
        } else if (status === 429) {
          console.error(
            `⚠️  VeryChat API rate limit exceeded.\n` +
            `   Please wait before making more requests.\n` +
            `   📚 Check quotas at: ${this.DEVELOPERS_PORTAL_URL}`
          );
        } else if (status === 404) {
          console.warn(`⚠️  VeryChat API resource not found: ${config?.url}`);
        } else if (status >= 500) {
          console.error(
            `❌ VeryChat API server error (${status}).\n` +
            `   Contact hackathon operations team for support.\n` +
            `   📚 Support: ${this.DEVELOPERS_PORTAL_URL}`
          );
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get user information from VeryChat
   * @param userId - VeryChat user ID
   * @returns User information including wallet address
   */
  async getUser(userId: string): Promise<VeryChatUser> {
    // Check cache first
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.user;
    }

    try {
      // Using hackathon API endpoint for user lookup
      // Endpoint: GET /hackathon/users/{userId}
      const response = await this.client.get(`/hackathon/users/${userId}`);
      const user: VeryChatUser = response.data;
      
      // Cache the user
      this.cache.set(userId, { user, timestamp: Date.now() });
      
      return user;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`User ${userId} not found in VeryChat`);
      }
      if (error.response?.status === 401) {
        throw new Error('VeryChat API authentication failed. Check your Project ID and API Key.');
      }
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  /**
   * Verify user identity using verification code
   * @param userId - VeryChat user ID
   * @param verificationCode - Verification code from user
   * @returns Authentication result with wallet address if available
   */
  async verifyUser(userId: string, verificationCode: string): Promise<VeryChatAuthResponse> {
    try {
      const response = await this.client.post('/hackathon/auth/verify', {
        user_id: userId,
        verification_code: verificationCode
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid verification code');
      }
      throw new Error(`Failed to verify user: ${error.message}`);
    }
  }

  async getUsersByUsername(username: string): Promise<VeryChatUser[]> {
    try {
      const response = await this.client.get(`/hackathon/users/search`, {
        params: { username }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  async getWalletAddress(userId: string): Promise<string> {
    const user = await this.getUser(userId);
    if (!user.walletAddress) {
      throw new Error(`User ${userId} has no wallet address linked`);
    }
    return user.walletAddress;
  }

  /**
   * Enhanced KYC verification with Redis caching and validation
   */
  async verifyKYC(userId: string, forceRefresh: boolean = false): Promise<KYCVerificationResult> {
    const cacheKey = `kyc:${userId}`;
    let cached = false;

    // Try Redis cache first (if available)
    if (this.redis && !forceRefresh) {
      try {
        const cachedData = await this.redis.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          cached = true;
          return {
            ...parsed,
            lastChecked: new Date(parsed.lastChecked),
            verifiedAt: parsed.verifiedAt ? new Date(parsed.verifiedAt) : undefined,
            cached: true
          };
        }
      } catch (error) {
        console.warn('Error reading KYC cache from Redis:', error);
      }
    }

    try {
      const user = await this.getUser(userId);
      
      // Map VeryChat KYC status to levels
      const kycLevels: Record<string, number> = {
        'none': 0,
        'pending': 1,
        'verified': 2,
        'rejected': 0
      };

      const level = kycLevels[user.kycStatus] || 0;
      const isVerified = user.kycStatus === 'verified';
      const verifiedAt = user.kycVerifiedAt ? new Date(user.kycVerifiedAt) : undefined;

      const result: KYCVerificationResult = {
        isVerified,
        level,
        status: user.kycStatus,
        verifiedAt,
        lastChecked: new Date(),
        cached: false
      };

      // Cache in Redis (if available)
      if (this.redis) {
        try {
          await this.redis.setex(
            cacheKey,
            this.kycCacheTTL,
            JSON.stringify({
              ...result,
              lastChecked: result.lastChecked.toISOString(),
              verifiedAt: result.verifiedAt?.toISOString()
            })
          );
        } catch (error) {
          console.warn('Error caching KYC result in Redis:', error);
        }
      }

      return result;
    } catch (error) {
      console.error('Error verifying KYC:', error);
      
      // Return safe default, but don't cache errors
      return {
        isVerified: false,
        level: 0,
        status: 'none',
        lastChecked: new Date(),
        cached: false
      };
    }
  }

  /**
   * Verify KYC with additional validation checks
   */
  async verifyKYCWithValidation(
    userId: string,
    amount: number,
    transactionType: 'send' | 'receive' = 'send'
  ): Promise<{ allowed: boolean; reason?: string; kyc: KYCVerificationResult }> {
    const kyc = await this.verifyKYC(userId);

    // Define limits based on KYC level
    const limits: Record<number, number> = {
      0: 100,  // 100 VERY/USDC max without KYC
      1: 1000, // 1000 VERY/USDC max with basic KYC
      2: Infinity // No limit with full KYC
    };

    const limit = limits[kyc.level] || 0;

    if (amount > limit) {
      return {
        allowed: false,
        reason: `Your KYC level (${kyc.level}) allows max ${limit === Infinity ? 'unlimited' : limit} VERY/USDC per transaction. Please complete KYC verification to increase your limit.`,
        kyc
      };
    }

    // Additional validation: Check if KYC status is stale
    const now = Date.now();
    const lastChecked = kyc.lastChecked.getTime();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes

    if (now - lastChecked > staleThreshold && amount > limits[0]) {
      // For larger amounts, force refresh KYC status
      const freshKYC = await this.verifyKYC(userId, true);
      if (freshKYC.level !== kyc.level) {
        // KYC level changed, re-check limits
        const newLimit = limits[freshKYC.level] || 0;
        if (amount > newLimit) {
          return {
            allowed: false,
            reason: `KYC status updated. Your current level (${freshKYC.level}) allows max ${newLimit === Infinity ? 'unlimited' : newLimit} VERY/USDC.`,
            kyc: freshKYC
          };
        }
        return { allowed: true, kyc: freshKYC };
      }
    }

    return { allowed: true, kyc };
  }

  /**
   * Invalidate KYC cache for a user (call when KYC status changes)
   */
  async invalidateKYCCache(userId: string): Promise<void> {
    const cacheKey = `kyc:${userId}`;
    
    // Clear in-memory cache
    this.cache.delete(userId);
    
    // Clear Redis cache
    if (this.redis) {
      try {
        await this.redis.del(cacheKey);
      } catch (error) {
        console.warn('Error invalidating KYC cache in Redis:', error);
      }
    }
  }

  async sendBotMessage(chatId: string, message: string, options?: any): Promise<boolean> {
    try {
      await this.client.post('/hackathon/bot/messages', {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        ...options
      });
      return true;
    } catch (error) {
      console.error('Error sending bot message:', error);
      return false;
    }
  }

  async setBotCommands(): Promise<void> {
    const commands = [
      { command: 'tip', description: 'Tip another user: /tip @username amount [message]' },
      { command: 'stats', description: 'View your tipping stats and profile' },
      { command: 'profile', description: 'View your or another user\'s profile: /profile [@username]' },
      { command: 'follow', description: 'Follow a user: /follow @username' },
      { command: 'unfollow', description: 'Unfollow a user: /unfollow @username' },
      { command: 'feed', description: 'View activity feed from users you follow' },
      { command: 'leaderboard', description: 'View top tippers leaderboard' },
      { command: 'badges', description: 'View your badges and achievements' },
      { command: 'notifications', description: 'View your recent notifications' },
      { command: 'search', description: 'Search for users: /search username' },
      { command: 'help', description: 'Show help information and available commands' }
    ];

    try {
      await this.client.post('/hackathon/bot/commands', { commands });
    } catch (error) {
      console.error('Error setting bot commands:', error);
    }
  }

  /**
   * Get user profile with extended information
   */
  async getUserProfile(userId: string): Promise<VeryChatUser> {
    return this.getUser(userId);
  }

  /**
   * Search users by username or display name
   */
  async searchUsers(query: string, limit: number = 20): Promise<VeryChatUser[]> {
    try {
      const response = await this.client.get('/hackathon/users/search', {
        params: { 
          q: query,
          limit 
        }
      });
      return response.data || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Send rich message with buttons/inline keyboard
   */
  async sendRichMessage(
    chatId: string, 
    message: string, 
    buttons?: Array<Array<{ text: string; callback_data: string }>>
  ): Promise<boolean> {
    try {
      const payload: any = {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      };

      if (buttons && buttons.length > 0) {
        payload.reply_markup = {
          inline_keyboard: buttons
        };
      }

      await this.client.post('/hackathon/bot/messages', payload);
      return true;
    } catch (error) {
      console.error('Error sending rich message:', error);
      return false;
    }
  }

  /**
   * Edit message text
   */
  async editMessage(chatId: string, messageId: string, newText: string): Promise<boolean> {
    try {
      await this.client.post('/hackathon/bot/messages/edit', {
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        parse_mode: 'Markdown'
      });
      return true;
    } catch (error) {
      console.error('Error editing message:', error);
      return false;
    }
  }

  /**
   * Answer callback query (for button presses)
   */
  async answerCallbackQuery(callbackQueryId: string, text?: string, showAlert?: boolean): Promise<boolean> {
    try {
      await this.client.post('/hackathon/bot/callback', {
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert || false
      });
      return true;
    } catch (error) {
      console.error('Error answering callback query:', error);
      return false;
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    // Process incoming VeryChat webhook events
    switch (payload.type) {
      case 'message':
        await this.handleMessage(payload.message);
        break;
      case 'callback_query':
        await this.handleCallbackQuery(payload.callback_query);
        break;
      case 'inline_query':
        await this.handleInlineQuery(payload.inline_query);
        break;
      default:
        console.log('Unhandled webhook type:', payload.type);
    }
  }

  private async handleMessage(message: any): Promise<void> {
    if (!message.text) return;

    const commandMatch = message.text.match(/^\/(\w+)(?:\s+(.*))?$/);
    if (!commandMatch) return;

    const [, command, args] = commandMatch;
    
    // Route to appropriate command handler
    // These would be handled by the webhook controller
    console.log(`Received command: ${command} with args: ${args}`);
  }

  private async handleCallbackQuery(callbackQuery: any): Promise<void> {
    console.log('Callback query received:', callbackQuery);
  }

  private async handleInlineQuery(inlineQuery: any): Promise<void> {
    console.log('Inline query received:', inlineQuery);
  }

  /**
   * Check API health and configuration status
   * @returns Current API status including configuration and health
   */
  async checkApiStatus(): Promise<VeryChatApiStatus> {
    const status: VeryChatApiStatus = {
      isConfigured: this.apiStatus.isConfigured,
      isHealthy: false,
      lastCheck: new Date(),
      rateLimitRemaining: this.rateLimitRemaining ?? undefined
    };

    if (!this.apiStatus.isConfigured) {
      status.error = 'API not configured. Please register at https://developers.verylabs.io/';
      this.apiStatus = status;
      return status;
    }

    try {
      // Try a lightweight API call to check health
      // Using a search endpoint that should always be available
      await this.client.get('/hackathon/users/search', {
        params: { q: 'healthcheck', limit: 1 }
      });
      status.isHealthy = true;
    } catch (error: any) {
      status.isHealthy = false;
      if (error.response?.status === 401) {
        status.error = 'Authentication failed. Check your Project ID and API Key.';
      } else if (error.response?.status === 429) {
        status.error = 'Rate limit exceeded. Please wait before retrying.';
      } else {
        status.error = `API health check failed: ${error.message}`;
      }
    }

    this.apiStatus = status;
    return status;
  }

  /**
   * Get current API status (cached)
   */
  getApiStatus(): VeryChatApiStatus {
    return { ...this.apiStatus };
  }

  /**
   * Get rate limit information
   */
  getRateLimitInfo(): { remaining: number | null; resetAt: Date | null } {
    return {
      remaining: this.rateLimitRemaining,
      resetAt: this.rateLimitReset ? new Date(this.rateLimitReset) : null
    };
  }

  /**
   * Get developers portal URL for easy access
   */
  getDevelopersPortalUrl(): string {
    return this.DEVELOPERS_PORTAL_URL;
  }

  /**
   * Validate API configuration
   * @returns Object with validation results and helpful messages
   */
  validateConfiguration(): {
    isValid: boolean;
    missing: string[];
    message: string;
    helpUrl: string;
  } {
    const projectId = config.VERYCHAT_API.PROJECT_ID;
    const apiKey = config.VERYCHAT_API.API_KEY;
    const missing: string[] = [];

    if (!projectId) missing.push('VERYCHAT_PROJECT_ID');
    if (!apiKey) missing.push('VERYCHAT_API_KEY');

    return {
      isValid: missing.length === 0,
      missing,
      message: missing.length > 0
        ? `Missing configuration: ${missing.join(', ')}. Register at ${this.DEVELOPERS_PORTAL_URL}`
        : 'Configuration is valid',
      helpUrl: this.DEVELOPERS_PORTAL_URL
    };
  }
}

