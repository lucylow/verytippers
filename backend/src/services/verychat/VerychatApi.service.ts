import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/config';

interface VeryChatUser {
  id: string;
  username: string;
  displayName: string;
  walletAddress: string;
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

export class VerychatApiService {
  private client: AxiosInstance;
  private cache: Map<string, { user: VeryChatUser; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.client = axios.create({
      baseURL: config.VERYCHAT_API.BASE_URL,
      headers: {
        'X-Project-ID': config.VERYCHAT_API.PROJECT_ID,
        'X-API-Key': config.VERYCHAT_API.API_KEY,
        'Content-Type': 'application/json'
      }
    });
  }

  async getUser(userId: string): Promise<VeryChatUser> {
    // Check cache first
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.user;
    }

    try {
      // Using hackathon API endpoint for user lookup
      const response = await this.client.get(`/hackathon/users/${userId}`);
      const user: VeryChatUser = response.data;
      
      // Cache the user
      this.cache.set(userId, { user, timestamp: Date.now() });
      
      return user;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`User ${userId} not found in VeryChat`);
      }
      throw new Error(`Failed to fetch user: ${error.message}`);
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

  async verifyKYC(userId: string): Promise<{ isVerified: boolean; level: number }> {
    try {
      const user = await this.getUser(userId);
      
      // Map VeryChat KYC status to levels
      const kycLevels: Record<string, number> = {
        'none': 0,
        'pending': 1,
        'verified': 2,
        'rejected': 0
      };

      return {
        isVerified: user.kycStatus === 'verified',
        level: kycLevels[user.kycStatus] || 0
      };
    } catch (error) {
      console.error('Error verifying KYC:', error);
      return { isVerified: false, level: 0 };
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
      { command: 'tip', description: 'Tip another user' },
      { command: 'stats', description: 'View your tipping stats' },
      { command: 'leaderboard', description: 'View top tippers' },
      { command: 'badges', description: 'View your badges' },
      { command: 'withdraw', description: 'Withdraw your tips' },
      { command: 'help', description: 'Show help information' }
    ];

    try {
      await this.client.post('/hackathon/bot/commands', { commands });
    } catch (error) {
      console.error('Error setting bot commands:', error);
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
}

