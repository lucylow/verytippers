// server/services/ModerationService.ts
// Server-side moderation service using Hugging Face

import { HfInference } from '@huggingface/inference';
import { config } from '../config';
import { z } from 'zod';

// Moderation result schema
const ModerationResultSchema = z.object({
  isSafe: z.boolean(),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  toxicityScore: z.number().min(0).max(1),
  toxicityLabels: z.array(z.object({
    label: z.string(),
    score: z.number().min(0).max(1)
  })),
  flaggedReason: z.string().nullable(),
  action: z.enum(['allow', 'warn', 'block', 'quarantine'])
});

export type ModerationResult = z.infer<typeof ModerationResultSchema>;

// Moderation thresholds (tunable)
const MODERATION_THRESHOLDS = {
  toxicityBlock: 0.85,  // Hard block highly toxic
  toxicityWarn: 0.65,   // Show warning
  negativeSentiment: 0.75
} as const;

/**
 * Server-side moderation service
 * Uses Hugging Face models for sentiment and toxicity analysis
 */
export class ModerationService {
  private hf: HfInference;

  constructor() {
    this.hf = new HfInference(config.HUGGINGFACE_API_KEY);
  }

  /**
   * Moderate a tip message using AI models
   */
  async moderateTipMessage(
    message: string,
    senderId?: string,
    recipientId?: string,
    context?: { channel: string; recentTips: number }
  ): Promise<ModerationResult> {
    
    const normalizedMessage = message.trim().toLowerCase();
    
    // Quick heuristic filters (zero-cost)
    const quickBlock = this.quickHeuristicCheck(normalizedMessage);
    if (quickBlock) {
      return {
        isSafe: false,
        sentiment: 'negative',
        toxicityScore: 1.0,
        toxicityLabels: [{ label: 'heuristic_block', score: 1.0 }],
        flaggedReason: quickBlock,
        action: 'block'
      };
    }

    try {
      // Parallel model inference
      const [sentimentResult, toxicityResult] = await Promise.all([
        this.analyzeSentiment(normalizedMessage),
        this.analyzeToxicity(normalizedMessage)
      ]);

      const result = this.combineResults(sentimentResult, toxicityResult);
      
      console.log(`✅ Moderation: "${message.substring(0, 50)}..." → ${result.action} (toxicity: ${result.toxicityScore.toFixed(2)})`);
      return ModerationResultSchema.parse(result);

    } catch (error) {
      console.error('Moderation failed:', error);
      // Fail open on error (better UX)
      return {
        isSafe: true,
        sentiment: 'neutral',
        toxicityScore: 0,
        toxicityLabels: [],
        flaggedReason: null,
        action: 'allow'
      };
    }
  }

  private quickHeuristicCheck(message: string): string | null {
    // Zero-cost regex blocks
    const blocks = [
      /\b(fuck|shit|damn|asshole|retard|cunt)\b/gi,
      /\b(kys|kill yourself|die|suicide)\b/gi,
      /\b(scam|fraud|rug)\b.*\b(you|ur)\b/gi,
      /\b(gay|fag|tranny|nigger)\b/gi
    ];

    for (const pattern of blocks) {
      if (pattern.test(message)) {
        return 'Contains prohibited language';
      }
    }

    // Context-aware blocks
    if (message.includes('@') && message.includes('block') && message.includes('wallet')) {
      return 'Suspicious wallet/block report';
    }

    return null;
  }

  private async analyzeSentiment(text: string): Promise<any> {
    try {
      const result = await this.hf.textClassification({
        model: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
        inputs: text
      });

      // Handle different response formats
      const scores = Array.isArray(result) ? result : [result];
      const firstResult = scores[0];
      
      if (firstResult && Array.isArray(firstResult)) {
        // Handle array of scores
        const scoreValues = firstResult.map((r: any) => typeof r === 'number' ? r : r.score || 0);
        const labels = ['negative', 'neutral', 'positive'];
        const maxScore = Math.max(...scoreValues);
        const sentiment = labels[scoreValues.indexOf(maxScore)] as any;
        return { sentiment, confidence: maxScore };
      } else if (firstResult && firstResult.label) {
        // Handle labeled result
        const label = firstResult.label.toLowerCase();
        const sentiment = label.includes('positive') ? 'positive' : 
                         label.includes('negative') ? 'negative' : 'neutral';
        return { sentiment, confidence: firstResult.score || 0.5 };
      }

      // Fallback
      return { sentiment: 'neutral', confidence: 0.5 };
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return { sentiment: 'neutral', confidence: 0.5 };
    }
  }

  private async analyzeToxicity(text: string): Promise<any> {
    try {
      const result = await this.hf.textClassification({
        model: 'unitary/toxic-bert',
        inputs: text,
        parameters: { return_all_scores: true }
      });

      const scores = Array.isArray(result) ? result : [result];
      const firstResult = scores[0];
      
      if (Array.isArray(firstResult)) {
        // Extract scores from array format
        const toxicityScores = firstResult.map((r: any) => 
          typeof r === 'number' ? r : (r.score || 0)
        );
        const toxicityScore = Math.max(...toxicityScores);
        
        return {
          toxicityScore,
          labels: firstResult.map((r: any, i: number) => ({
            label: r.label || `label_${i}`,
            score: typeof r === 'number' ? r : (r.score || 0)
          })),
          scores: toxicityScores
        };
      } else if (firstResult && firstResult.scores && Array.isArray(firstResult.scores)) {
        // Handle structured format
        const toxicityScores = firstResult.scores.map((s: any) => s.score || 0);
        const toxicityScore = Math.max(...toxicityScores);
        
        return {
          toxicityScore,
          labels: firstResult.labels || [],
          scores: toxicityScores
        };
      }

      // Fallback
      return {
        toxicityScore: 0,
        labels: [],
        scores: []
      };
    } catch (error) {
      console.error('Toxicity analysis error:', error);
      return {
        toxicityScore: 0,
        labels: [],
        scores: []
      };
    }
  }

  private combineResults(sentiment: any, toxicity: any): any {
    const toxicityScore = toxicity.toxicityScore || 0;
    const sentimentScore = sentiment.sentiment === 'negative' ? 1 : 0;

    // Decision matrix
    if (toxicityScore >= MODERATION_THRESHOLDS.toxicityBlock) {
      return {
        isSafe: false,
        sentiment: 'negative',
        toxicityScore,
        toxicityLabels: toxicity.labels || [],
        flaggedReason: 'High toxicity detected',
        action: 'block'
      };
    }

    if (toxicityScore >= MODERATION_THRESHOLDS.toxicityWarn || sentimentScore > MODERATION_THRESHOLDS.negativeSentiment) {
      return {
        isSafe: true,
        sentiment: sentiment.sentiment || 'neutral',
        toxicityScore,
        toxicityLabels: toxicity.labels || [],
        flaggedReason: 'Moderate toxicity',
        action: 'warn'
      };
    }

    return {
      isSafe: true,
      sentiment: sentiment.sentiment || 'positive',
      toxicityScore,
      toxicityLabels: toxicity.labels || [],
      flaggedReason: null,
      action: 'allow'
    };
  }
}

