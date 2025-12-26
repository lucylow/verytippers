// server/services/AITipSuggestionService.ts
// Intelligent Tip Suggestions using OpenAI GPT-4o API

import { z } from 'zod';
import { config } from '../config';
import { CacheService } from './CacheService';

// Tip suggestion response schema (TypeScript + Zod validation)
const TipSuggestionSchema = z.object({
  amount: z.number().min(0.1).max(100).describe('Suggested tip amount in VERY'),
  message: z.string().max(280).describe('Personalized tip message'),
  confidence: z.number().min(0).max(1).describe('AI confidence score (0-1)'),
  reason: z.string().max(200).describe('Why this amount/message?'),
  sentiment: z.enum(['low', 'medium', 'high']).describe('Appreciation level'),
  category: z.enum(['help', 'content', 'insight', 'shoutout']).describe('Tip category')
});

export type TipSuggestion = z.infer<typeof TipSuggestionSchema>;

export interface ChatContext {
  message: string;
  sender: string;
  recipient: string;
  channel: string;
  timestamp: number;
  reactions?: number[];
  previousTips?: { amount: number; message: string }[];
}

export interface UserPreferences {
  avgTip?: number;
  maxTip?: number;
}

export class AITipSuggestionService {
  private openai: any = null;
  private cache: CacheService;
  private openaiAvailable: boolean = false;

  constructor() {
    this.cache = CacheService.getInstance();
    this.openaiAvailable = false;
    this.openai = null;
    
    // Initialize OpenAI if API key is available (async initialization)
    this.initializeOpenAI();
  }

  private async initializeOpenAI() {
    if (!config.OPENAI_API_KEY || config.OPENAI_API_KEY === '') {
      console.log('⚠️ OpenAI API key not configured. AI Tip Suggestions will use fallback.');
      return;
    }

    try {
      // Dynamically import OpenAI (optional dependency)
      // @ts-ignore - openai is an optional dependency
      const openaiModule = await import('openai');
      const OpenAI = openaiModule.default || openaiModule;
      this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
      this.openaiAvailable = true;
      console.log('✅ OpenAI initialized for AI Tip Suggestions');
    } catch (error) {
      console.warn('OpenAI package not available or failed to initialize:', error);
      this.openaiAvailable = false;
    }
  }

  /**
   * Generate intelligent tip suggestion using OpenAI GPT-4o-mini
   */
  async generateTipSuggestion(
    context: ChatContext,
    userPreferences: UserPreferences = {}
  ): Promise<TipSuggestion> {
    // Check cache first
    const cacheKey = `ai:tip-suggestion:${Buffer.from(
      context.message + context.sender + context.recipient + JSON.stringify(userPreferences)
    ).toString('base64').slice(0, 80)}`;
    
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Ensure OpenAI is initialized if API key exists
    if (!this.openai && config.OPENAI_API_KEY && config.OPENAI_API_KEY !== '') {
      await this.initializeOpenAI();
    }

    // If OpenAI is not available, return fallback
    if (!this.openaiAvailable || !this.openai) {
      return this.getFallbackSuggestion(context);
    }

    try {
      const systemPrompt = `
You are a tip suggestion AI for VeryTippers (gasless chat tipping on VERY Chain).

ANALYZE chat context and suggest:
1. PERFECT tip amount (0.5-50 VERY, precise to 2 decimals)
2. PERSONALIZED message (under 100 chars, warm/authentic)  
3. CONFIDENCE score (0.0-1.0 based on clear appreciation signals)
4. SENTIMENT level (low/medium/high)
5. CATEGORY (help/content/insight/shoutout)

CRITICAL RULES:
- "thanks" alone → low confidence, 0.5-1 VERY
- Code fixes/tutorials → high confidence, 3-10 VERY  
- "life-changing"/"saved hours" → 15-30 VERY
- Emoji spam → low/no suggestion
- Recent tips → avoid over-tipping
- Match community norms (dev chat = higher, casual = lower)

EXAMPLE OUTPUTS:
{
  "amount": 5.00,
  "message": "Thanks for the detailed fix! 🔥",
  "confidence": 0.95,
  "reason": "Code solution + strong appreciation emojis",
  "sentiment": "high",
  "category": "help"
}

Always return valid JSON matching schema exactly.
`;

      const userPrompt = `
CHAT CONTEXT:
Message: "${context.message}"
From: ${context.sender} 
To: ${context.recipient}
Channel: ${context.channel}
Reactions: ${context.reactions?.length || 0} 
Time: ${new Date(context.timestamp).toLocaleString()}
Prev tips: ${JSON.stringify(context.previousTips || [])}

USER PREFERENCES:
Avg tip: ${userPreferences.avgTip || 'N/A'}
Max tip: ${userPreferences.maxTip || 'N/A'}

Generate 1 optimal tip suggestion.
`;

      const completion = await this.openai.chat.completions.create({
        model: config.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Low creativity, high consistency
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });

      const rawResponse = completion.choices[0]?.message?.content;
      if (!rawResponse) {
        throw new Error('No response from OpenAI');
      }

      // Parse + validate JSON response
      const parsed = JSON.parse(rawResponse);
      const validated = TipSuggestionSchema.parse(parsed);

      // Cache the result for 30 minutes
      await this.cache.set(cacheKey, JSON.stringify(validated), 1800);

      console.log('✅ AI Tip Suggestion generated:', validated);
      return validated;

    } catch (error) {
      console.error('AI Tip Suggestion failed:', error);
      
      // Return graceful fallback
      return this.getFallbackSuggestion(context);
    }
  }

  /**
   * Fallback suggestion when AI is unavailable
   */
  private getFallbackSuggestion(context: ChatContext): TipSuggestion {
    // Simple heuristic-based fallback
    const message = context.message.toLowerCase();
    let amount = 1.0;
    let confidence = 0.5;
    let sentiment: 'low' | 'medium' | 'high' = 'medium';
    let category: 'help' | 'content' | 'insight' | 'shoutout' = 'shoutout';

    // Detect appreciation keywords
    if (message.includes('thank') || message.includes('thanks')) {
      amount = 1.0;
      confidence = 0.6;
      sentiment = 'low';
    }

    // Detect code/help keywords
    if (message.includes('fix') || message.includes('solution') || message.includes('help')) {
      amount = 5.0;
      confidence = 0.75;
      sentiment = 'high';
      category = 'help';
    }

    // Detect high-value keywords
    if (message.includes('saved') || message.includes('life') || message.includes('amazing')) {
      amount = 10.0;
      confidence = 0.8;
      sentiment = 'high';
    }

    // Adjust based on reactions
    if (context.reactions && context.reactions.length > 5) {
      amount *= 1.5;
      confidence = Math.min(0.95, confidence + 0.1);
    }

    return {
      amount: Math.min(50, Math.max(0.5, amount)),
      message: `Thanks ${context.sender}!`,
      confidence,
      reason: 'Fallback suggestion (AI unavailable)',
      sentiment,
      category
    };
  }
}

