// server/middleware/tip-moderation.ts
// Server-side tip submission middleware

import { ModerationService, ModerationResult } from '../services/ModerationService';

export class TipModerationMiddleware {
  private moderation: ModerationService;

  constructor() {
    this.moderation = new ModerationService();
  }

  async validateTip(payload: {
    message: string;
    senderId: string;
    recipientId: string;
    amount: number;
  }): Promise<ModerationResult> {
    
    if (!payload.message) {
      // No message means no moderation needed
      return {
        isSafe: true,
        sentiment: 'neutral',
        toxicityScore: 0,
        toxicityLabels: [],
        flaggedReason: null,
        action: 'allow'
      };
    }

    // Pre-send moderation
    const result = await this.moderation.moderateTipMessage(
      payload.message,
      payload.senderId,
      payload.recipientId,
      { channel: 'general', recentTips: 3 }
    );

    // Log for review
    console.log(`Tip moderation [${payload.senderId} → ${payload.recipientId}]:`, {
      message: payload.message.substring(0, 50),
      result: result.action,
      toxicity: result.toxicityScore.toFixed(3)
    });

    // Quarantine high-risk tips
    if (result.action === 'block') {
      throw new Error(`Message blocked: ${result.flaggedReason}`);
    }

    if (result.action === 'warn') {
      // Log for manual review, but allow
      await this.logForReview(payload, result);
    }

    return result;
  }

  private async logForReview(payload: any, result: ModerationResult) {
    // Send to moderation queue / Discord alerts
    const webhookUrl = process.env.MODERATION_WEBHOOK;
    
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sender: payload.senderId,
            message: payload.message,
            toxicity: result.toxicityScore,
            sentiment: result.sentiment,
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Failed to send moderation webhook:', error);
      }
    } else {
      // Fallback: log to console
      console.warn('⚠️ Moderation warning (manual review recommended):', {
        sender: payload.senderId,
        message: payload.message,
        toxicity: result.toxicityScore,
        sentiment: result.sentiment
      });
    }
  }
}


