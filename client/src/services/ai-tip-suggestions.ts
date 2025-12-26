// src/services/ai-tip-suggestions.ts
// Intelligent Tip Suggestions using OpenAI GPT-4o API
// Analyzes chat context → suggests personalized amounts + messages

import { z } from 'zod';

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

/**
 * Analyze chat context → Generate intelligent tip suggestion
 * @param context Chat message + metadata
 * @param userPreferences User tip history/preferences
 * @returns Validated tip suggestion
 */
export async function generateTipSuggestion(
  context: ChatContext,
  userPreferences: { avgTip?: number; maxTip?: number } = {}
): Promise<TipSuggestion> {
  try {
    const response = await fetch('/api/v1/ai/tip-suggestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context,
        userPreferences,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to generate suggestion');
    }

    // Validate response with Zod
    const validated = TipSuggestionSchema.parse(data.data);
    
    console.log('✅ AI Tip Suggestion:', validated);
    return validated;

  } catch (error) {
    console.error('AI Tip Suggestion failed:', error);
    
    // Graceful fallback
    return {
      amount: 1.00,
      message: `Thanks ${context.sender}!`,
      confidence: 0.5,
      reason: 'Fallback suggestion (AI unavailable)',
      sentiment: 'medium',
      category: 'shoutout'
    };
  }
}

/**
 * Batch analyze multiple messages for tip opportunities
 */
export async function analyzeChatForTips(messages: ChatContext[]): Promise<TipSuggestion[]> {
  const suggestions = await Promise.all(
    messages.map(async (msg, index) => {
      // Skip own messages, spam, etc.
      if (msg.sender === 'you' || msg.message.length < 10) {
        return null;
      }
      
      // Throttle API calls
      await new Promise(r => setTimeout(r, index * 100));
      
      return generateTipSuggestion(msg);
    })
  );
  
  return suggestions.filter((s): s is TipSuggestion => s !== null);
}

/**
 * Real-time chat analyzer (WebSocket integration)
 */
export class RealTimeTipAnalyzer {
  private recentMessages: ChatContext[] = [];
  private suggestionCache = new Map<string, TipSuggestion>();

  async analyzeMessage(message: ChatContext): Promise<TipSuggestion | null> {
    // Rolling window (last 10 messages)
    this.recentMessages.push(message);
    if (this.recentMessages.length > 10) {
      this.recentMessages.shift();
    }

    const messageId = `${message.sender}-${message.timestamp}`;
    if (this.suggestionCache.has(messageId)) {
      return this.suggestionCache.get(messageId)!;
    }

    // Check if message warrants suggestion
    const quickHeuristic = this.quickTipHeuristic(message);
    if (!quickHeuristic) return null;

    const suggestion = await generateTipSuggestion(message, {
      avgTip: this.getUserAvgTip(message.recipient)
    });

    this.suggestionCache.set(messageId, suggestion);
    return suggestion;
  }

  private quickTipHeuristic(msg: ChatContext): boolean {
    const appreciationKeywords = [
      'thank', 'thanks', 'amazing', 'perfect', 'fixed', 'works', 
      'saved', 'life', 'game changer', 'tutorial', 'guide'
    ];
    
    const hasAppreciation = appreciationKeywords.some(kw => 
      msg.message.toLowerCase().includes(kw)
    );
    
    const reactionScore = (msg.reactions?.length || 0) / 10;
    
    return hasAppreciation || reactionScore > 0.5;
  }

  private getUserAvgTip(recipient: string): number {
    // Implement user tip history lookup
    return 2.5; // Default
  }
}

