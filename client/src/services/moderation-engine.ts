// src/services/moderation-engine.ts
// Sentiment & Toxicity Moderation with Hugging Face
// Real-time scanning for negative/abusive tip messages

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
 * Real-time tip message moderation engine
 * Calls backend API for moderation (keeps API keys secure)
 */
export class ModerationEngine {
  
  /**
   * Scan tip message for toxicity/sentiment before submission
   */
  async moderateTipMessage(
    message: string,
    senderId?: string,
    recipientId?: string,
    context?: { channel: string; recentTips: number }
  ): Promise<ModerationResult> {
    
    const normalizedMessage = message.trim().toLowerCase();
    
    // Quick heuristic filters (zero-cost, client-side)
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
      // Call backend API for AI moderation
      const response = await fetch('/api/v1/moderation/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          senderId,
          recipientId,
          context
        })
      });

      if (!response.ok) {
        throw new Error(`Moderation API error: ${response.status}`);
      }

      const data = await response.json();
      const result = data.result || data;
      
      console.log(`✅ Moderation: "${message}" → ${result.action} (toxicity: ${result.toxicityScore?.toFixed(2) || 'N/A'})`);
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
}


