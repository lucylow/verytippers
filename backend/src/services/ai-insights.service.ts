import OpenAI from 'openai';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import type { Insight, UserStats } from '../types';

/**
 * AI-Powered Insights Generation Service
 */
export class AIInsightsService {
  private openai: OpenAI | null = null;
  private redis: Redis;
  private initialized = false;

  constructor(redis: Redis) {
    this.redis = redis;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        this.openai = new OpenAI({ apiKey });
        this.initialized = true;
        logger.info('AI Insights service initialized');
      } else {
        logger.warn('OPENAI_API_KEY not set, AI insights disabled');
      }
    } catch (error) {
      logger.error('AI Insights service initialization failed', { error });
    }
  }

  /**
   * Generate personalized insights for a user
   */
  async generatePersonalizedInsights(userId: string, stats: UserStats): Promise<Insight[]> {
    if (!this.openai || !this.initialized) {
      logger.warn('AI insights unavailable, returning default insights', { userId });
      return this.getDefaultInsights(stats);
    }

    try {
      // Check cache first
      const cached = await this.redis.hget(`user:${userId}:insights`, 'weekly');
      if (cached) {
        const insights = JSON.parse(cached);
        logger.debug('Returning cached insights', { userId });
        return insights;
      }

      const prompt = this.buildInsightsPrompt(stats);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates personalized insights for VeryTippers users. Always return valid JSON arrays with emoji, title, and summary fields.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse response - handle both array and object formats
      let insights: Insight[];
      try {
        const parsed = JSON.parse(responseContent);
        if (Array.isArray(parsed)) {
          insights = parsed;
        } else if (parsed.insights && Array.isArray(parsed.insights)) {
          insights = parsed.insights;
        } else {
          throw new Error('Invalid response format');
        }
      } catch (parseError) {
        logger.error('Failed to parse AI insights', { error: parseError, responseContent });
        return this.getDefaultInsights(stats);
      }

      // Validate insights structure
      insights = insights
        .filter(insight => insight.emoji && insight.title && insight.summary)
        .slice(0, 3); // Limit to 3 insights

      // Cache insights for 1 week
      await this.redis.hset(
        `user:${userId}:insights`,
        'weekly',
        JSON.stringify(insights)
      );
      await this.redis.expire(`user:${userId}:insights`, 7 * 24 * 60 * 60);

      logger.info('Generated AI insights', { userId, count: insights.length });
      return insights;
    } catch (error) {
      logger.error('AI insights generation failed', { error, userId });
      return this.getDefaultInsights(stats);
    }
  }

  /**
   * Build prompt for AI insights
   */
  private buildInsightsPrompt(stats: UserStats): string {
    return `
Generate 3 personalized insights for a VeryTippers user based on their stats:

Stats:
- Tips Sent: ${stats.tipsSent}
- Tips Received: ${stats.tipsReceived}
- Total Sent: ${stats.amountSent.toString()} VERY
- Total Received: ${stats.amountReceived.toString()} VERY
- Global Rank: ${stats.rankGlobal || 'N/A'}
- Weekly Rank: ${stats.rankWeekly || 'N/A'}

Return a JSON object with an "insights" array containing exactly 3 objects, each with:
- "emoji": A relevant emoji (1-2 characters)
- "title": A short title (max 50 chars)
- "summary": A brief summary (max 100 chars)

Make the insights encouraging, specific to their stats, and actionable.
Example format:
{
  "insights": [
    {"emoji": "🏆", "title": "Top Tipper", "summary": "You're in the top 10% of tippers this week!"},
    {"emoji": "💫", "title": "Community Builder", "summary": "You've sent ${stats.tipsSent} tips - keep spreading the love!"},
    {"emoji": "📈", "title": "Rising Star", "summary": "Your weekly rank is ${stats.rankWeekly || 'improving'} - great progress!"}
  ]
}
`;
  }

  /**
   * Get default insights when AI is unavailable
   */
  private getDefaultInsights(stats: UserStats): Insight[] {
    const insights: Insight[] = [];

    if (stats.tipsSent > 0) {
      insights.push({
        emoji: '💸',
        title: 'Active Tipper',
        summary: `You've sent ${stats.tipsSent} tip${stats.tipsSent > 1 ? 's' : ''} to the community!`
      });
    }

    if (stats.rankGlobal && stats.rankGlobal <= 100) {
      insights.push({
        emoji: '🏆',
        title: 'Top 100',
        summary: `You're ranked #${stats.rankGlobal} globally - amazing work!`
      });
    }

    if (stats.tipsReceived > 0) {
      insights.push({
        emoji: '❤️',
        title: 'Appreciated',
        summary: `You've received ${stats.tipsReceived} tip${stats.tipsReceived > 1 ? 's' : ''} from the community!`
      });
    }

    // Fill remaining slots with generic insights
    while (insights.length < 3) {
      insights.push({
        emoji: '✨',
        title: 'Keep Tipping',
        summary: 'Every tip makes the community stronger!'
      });
    }

    return insights.slice(0, 3);
  }
}

