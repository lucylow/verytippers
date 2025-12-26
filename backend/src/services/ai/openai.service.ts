import OpenAI from 'openai';
import { config } from '../../config/app';
import { logger } from '../../utils/logger';
import { CacheService } from '../database/redis.service';

export interface AITipSuggestion {
  amount: string;
  message: string;
  reasoning: string;
  confidence: number;
  contextScore: number;
  recommendedToken: string;
}

export interface AISentimentAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  categories: {
    toxicity: number;
    spam: number;
    hate_speech: number;
    harassment: number;
    self_harm: number;
  };
  flags: string[];
  suggestions: string[];
}

export interface AIConversationResponse {
  response: string;
  suggestions?: {
    type: 'tip' | 'badge' | 'leaderboard';
    data: any;
  }[];
  metadata: {
    model: string;
    tokens: number;
    processingTime: number;
  };
}

export class OpenAIService {
  private client: OpenAI | null = null;
  private cache: CacheService;
  private model: string;
  
  constructor() {
    if (config.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: config.OPENAI_API_KEY,
      });
    }
    this.cache = CacheService.getInstance();
    this.model = config.NODE_ENV === 'production' ? 'gpt-4' : 'gpt-3.5-turbo';
  }
  
  async generateTipSuggestion(
    context: string,
    senderData: any,
    recipientData: any,
    chatHistory: string[] = []
  ): Promise<AITipSuggestion> {
    if (!this.client) {
      return this.getFallbackSuggestion();
    }

    const cacheKey = `ai:suggestion:${Buffer.from(context).toString('base64').slice(0, 50)}`;
    
    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const prompt = this.buildTipSuggestionPrompt(context, senderData, recipientData, chatHistory);
    
    try {
      const startTime = Date.now();
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are VeryTippers AI, an intelligent assistant for social crypto tipping on Very Network.
            
            Your purpose:
            1. Suggest appropriate tip amounts based on context
            2. Generate personalized, positive messages
            3. Consider user history and relationship
            4. Follow platform guidelines
            5. Encourage positive community engagement
            
            Guidelines:
            - Minimum tip: 0.1 VERY
            - Maximum tip: 1000 VERY
            - Default token: VERY (native token)
            - Consider tip amounts: 1, 5, 10, 25, 50, 100 VERY
            - Messages should be positive and encouraging
            - Never suggest inappropriate content`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });
      
      const processingTime = Date.now() - startTime;
      logger.info(`AI suggestion generated in ${processingTime}ms`);
      
      const response = JSON.parse(completion.choices[0].message.content || '{}');
      
      const suggestion: AITipSuggestion = {
        amount: response.amount || '10',
        message: response.message || 'Great content!',
        reasoning: response.reasoning || 'Default suggestion',
        confidence: response.confidence || 0.5,
        contextScore: response.contextScore || 0.5,
        recommendedToken: response.recommendedToken || config.VERY_TOKEN_ADDRESS
      };
      
      // Cache for 5 minutes
      await this.cache.set(cacheKey, JSON.stringify(suggestion), 300);
      
      return suggestion;
      
    } catch (error) {
      logger.error('OpenAI suggestion error:', error);
      return this.getFallbackSuggestion();
    }
  }
  
  async analyzeSentiment(message: string): Promise<AISentimentAnalysis> {
    if (!this.client) {
      return this.getFallbackSentiment();
    }

    const cacheKey = `ai:sentiment:${Buffer.from(message).toString('base64').slice(0, 50)}`;
    
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const prompt = `
      Analyze this message for Very Network tipping platform:
      "${message}"
      
      Provide a JSON response with:
      1. sentiment: "positive", "neutral", or "negative"
      2. score: 0-1 confidence
      3. categories: { toxicity: 0-1, spam: 0-1, hate_speech: 0-1, harassment: 0-1, self_harm: 0-1 }
      4. flags: array of specific issues if any (e.g., ["hate_speech", "harassment"])
      5. suggestions: array of improvement suggestions if negative
      
      Be strict with platform safety but allow positive encouragement.
    `;
    
    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a content safety analyzer for a social tipping platform.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });
      
      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      const analysis: AISentimentAnalysis = {
        sentiment: result.sentiment || 'neutral',
        score: result.score || 0.5,
        categories: result.categories || {
          toxicity: 0,
          spam: 0,
          hate_speech: 0,
          harassment: 0,
          self_harm: 0
        },
        flags: result.flags || [],
        suggestions: result.suggestions || []
      };
      
      // Cache for 1 hour
      await this.cache.set(cacheKey, JSON.stringify(analysis), 3600);
      
      return analysis;
      
    } catch (error) {
      logger.error('OpenAI sentiment analysis error:', error);
      return this.getFallbackSentiment();
    }
  }
  
  async generateConversationResponse(
    userId: string,
    message: string,
    context: any
  ): Promise<AIConversationResponse> {
    if (!this.client) {
      return {
        response: 'AI services are not configured. Please set OPENAI_API_KEY.',
        metadata: {
          model: 'none',
          tokens: 0,
          processingTime: 0
        }
      };
    }

    const prompt = `
      User message: ${message}
      
      Context:
      - User ID: ${userId}
      - Platform: VeryTippers on Very Network
      - User is asking about tipping functionality
      
      Available actions:
      1. Send a tip: /tip @username amount [message]
      2. Check stats: /stats
      3. View leaderboard: /leaderboard
      4. View badges: /badges
      5. Get help: /help
      
      If user wants to send a tip, ask for:
      - Recipient username
      - Amount (suggest reasonable amount)
      - Optional message
      
      Keep responses friendly, helpful, and concise.
    `;
    
    try {
      const startTime = Date.now();
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are VeryTippers AI assistant. Help users with tipping, answer questions, and provide suggestions.
            
            Always be:
            - Friendly and encouraging
            - Clear and concise
            - Helpful with specific instructions
            - Positive about the community
            
            Never:
            - Give financial advice
            - Suggest inappropriate tips
            - Share personal information
            - Make promises about returns`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 300,
      });
      
      const processingTime = Date.now() - startTime;
      const response = completion.choices[0].message.content || 'I cannot help with that right now.';
      
      // Extract suggestions if present
      const suggestions = this.extractSuggestions(response);
      
      return {
        response,
        suggestions,
        metadata: {
          model: this.model,
          tokens: completion.usage?.total_tokens || 0,
          processingTime
        }
      };
      
    } catch (error) {
      logger.error('OpenAI conversation error:', error);
      
      return {
        response: 'I apologize, but I cannot process your request right now. Please try again or use /help for commands.',
        metadata: {
          model: this.model,
          tokens: 0,
          processingTime: 0
        }
      };
    }
  }
  
  async generatePersonalizedInsights(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly',
    userData: any
  ): Promise<string> {
    if (!this.client) {
      return 'Thank you for being part of the VeryTippers community!';
    }

    const prompt = `
      Generate personalized insights for user ${userId} for the ${period} period.
      
      User data:
      - Total tips sent: ${userData.totalTipsSent || 0}
      - Total tips received: ${userData.totalTipsReceived || 0}
      - Unique users tipped: ${userData.uniqueUsersTipped || 0}
      - Current streak: ${userData.tipStreak || 0} days
      - Badges earned: ${userData.badges?.length || 0}
      
      Make the insights:
      1. Positive and encouraging
      2. Specific to their activity
      3. Suggest next goals
      4. Highlight community impact
      5. Keep under 150 words
    `;
    
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You generate personalized, positive insights for social tipping platform users.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9,
        max_tokens: 200,
      });
      
      return completion.choices[0].message.content || 'Thank you for being part of the VeryTippers community!';
      
    } catch (error) {
      logger.error('OpenAI insights error:', error);
      return 'Thank you for being part of the VeryTippers community!';
    }
  }
  
  private buildTipSuggestionPrompt(
    context: string,
    senderData: any,
    recipientData: any,
    chatHistory: string[]
  ): string {
    return `
      Analyze this tipping context and provide a suggestion:
      
      Conversation Context: "${context}"
      
      Chat History (last 5 messages):
      ${chatHistory.slice(-5).join('\n')}
      
      Sender Profile:
      - Total tips sent: ${senderData.totalTipsSent || 0}
      - Average tip amount: ${senderData.averageTip || 'Unknown'}
      - Tip streak: ${senderData.tipStreak || 0} days
      - Badges: ${senderData.badges?.join(', ') || 'None'}
      
      Recipient Profile:
      - Total tips received: ${recipientData.totalTipsReceived || 0}
      - Recent activity: ${recipientData.recentActivity || 'Unknown'}
      - Community role: ${recipientData.communityRole || 'Member'}
      
      Provide JSON response with:
      1. amount: suggested tip amount (1-1000 VERY, typical: 1, 5, 10, 25, 50, 100)
      2. message: personalized, positive message (1-2 sentences)
      3. reasoning: brief explanation of suggestion
      4. confidence: 0-1 confidence score
      5. contextScore: 0-1 how well suggestion fits context
      6. recommendedToken: "VERY" or "USDC"
      
      Consider:
      - Relationship between users
      - Conversation tone
      - Typical tip amounts
      - Platform guidelines
    `;
  }
  
  private extractSuggestions(response: string): any[] {
    const suggestions = [];
    
    // Check for tip suggestions
    const tipRegex = /(?:tip|send|give)\s+@?(\w+)\s+(\d+)/gi;
    const tipMatches = response.match(tipRegex);
    
    if (tipMatches) {
      suggestions.push({
        type: 'tip',
        data: {
          matches: tipMatches
        }
      });
    }
    
    // Check for badge mentions
    const badgeRegex = /badge|achievement|earn|unlock/gi;
    if (badgeRegex.test(response)) {
      suggestions.push({
        type: 'badge',
        data: {}
      });
    }
    
    // Check for leaderboard mentions
    const leaderboardRegex = /leaderboard|top|rank|score/gi;
    if (leaderboardRegex.test(response)) {
      suggestions.push({
        type: 'leaderboard',
        data: {}
      });
    }
    
    return suggestions;
  }

  private getFallbackSuggestion(): AITipSuggestion {
    return {
      amount: '10',
      message: 'Great content! Keep up the amazing work!',
      reasoning: 'Default fallback suggestion',
      confidence: 0.3,
      contextScore: 0.3,
      recommendedToken: config.VERY_TOKEN_ADDRESS
    };
  }

  private getFallbackSentiment(): AISentimentAnalysis {
    return {
      sentiment: 'neutral',
      score: 0.5,
      categories: {
        toxicity: 0,
        spam: 0,
        hate_speech: 0,
        harassment: 0,
        self_harm: 0
      },
      flags: [],
      suggestions: []
    };
  }
}

