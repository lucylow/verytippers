import { HfInference } from '@huggingface/inference';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import type { ModerationResult } from '../types';

/**
 * Real-time Moderation Service using HuggingFace models
 */
export class ModerationService {
  private hf: HfInference | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const token = process.env.HUGGINGFACE_TOKEN;
      if (token) {
        this.hf = new HfInference(token);
        this.initialized = true;
        logger.info('Moderation service initialized');
      } else {
        logger.warn('HUGGINGFACE_TOKEN not set, moderation will use heuristics only');
      }
    } catch (error) {
      logger.error('Moderation service initialization failed', { error });
    }
  }

  /**
   * Quick heuristic check for obvious violations
   */
  private async quickHeuristicCheck(message: string): Promise<string | null> {
    const lowerMessage = message.toLowerCase();
    
    // Block list of obvious violations
    const blockPatterns = [
      /\b(spam|scam|phishing|hack)\b/i,
      /(http|https):\/\/[^\s]+/i, // URLs (can be adjusted)
      /\b(buy\s+followers|click\s+here|limited\s+time)\b/i
    ];

    for (const pattern of blockPatterns) {
      if (pattern.test(message)) {
        return `Message contains blocked pattern: ${pattern}`;
      }
    }

    // Check for excessive repetition
    if (message.length > 1000) {
      return 'Message exceeds maximum length';
    }

    return null;
  }

  /**
   * Moderate tip message using AI models
   */
  async moderateTipMessage(
    message: string,
    senderId: string,
    recipientId: string
  ): Promise<ModerationResult> {
    try {
      // 1. Quick heuristic filter
      const heuristicBlock = await this.quickHeuristicCheck(message);
      if (heuristicBlock) {
        logger.warn('Message blocked by heuristics', {
          senderId,
          recipientId,
          reason: heuristicBlock
        });
        return {
          isSafe: false,
          action: 'block',
          flaggedReason: heuristicBlock
        };
      }

      // 2. If HF is not available, allow with warning
      if (!this.hf || !this.initialized) {
        logger.warn('HF moderation unavailable, allowing message', { senderId });
        return {
          isSafe: true,
          action: 'allow',
          toxicityScore: 0
        };
      }

      // 3. Parallel HF inference for sentiment and toxicity
      const [sentimentResult, toxicityResult] = await Promise.allSettled([
        this.hf.textClassification({
          model: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
          inputs: message
        }),
        this.hf.textClassification({
          model: 'unitary/toxic-bert',
          inputs: message
        })
      ]);

      // Process toxicity results
      let toxicityScore = 0;
      if (toxicityResult.status === 'fulfilled') {
        const toxicity = toxicityResult.value;
        if (Array.isArray(toxicity) && toxicity.length > 0) {
          toxicityScore = Math.max(
            ...toxicity[0].map((item: any) => item.score || 0)
          );
        }
      }

      // Process sentiment
      let sentimentScore = 0;
      if (sentimentResult.status === 'fulfilled') {
        const sentiment = sentimentResult.value;
        if (Array.isArray(sentiment) && sentiment.length > 0) {
          // Find positive/negative scores
          const positive = sentiment[0].find((s: any) => s.label?.toLowerCase().includes('positive'));
          sentimentScore = positive?.score || 0;
        }
      }

      // Decision logic
      if (toxicityScore > 0.85) {
        logger.warn('Message blocked by toxicity filter', {
          senderId,
          recipientId,
          toxicityScore
        });
        return {
          isSafe: false,
          action: 'block',
          toxicityScore,
          sentimentScore
        };
      }

      if (toxicityScore > 0.65) {
        logger.info('Message flagged with warning', {
          senderId,
          recipientId,
          toxicityScore
        });
        return {
          isSafe: true,
          action: 'warn',
          toxicityScore,
          sentimentScore
        };
      }

      return {
        isSafe: true,
        action: 'allow',
        toxicityScore,
        sentimentScore
      };
    } catch (error) {
      logger.error('Moderation check failed', { error, senderId, recipientId });
      // Fail open - allow message if moderation fails
      return {
        isSafe: true,
        action: 'allow',
        toxicityScore: 0,
        details: { error: 'Moderation service unavailable' }
      };
    }
  }
}

