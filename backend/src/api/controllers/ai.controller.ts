import { Request, Response } from 'express';
import { AIOrchestratorService } from '../../services/ai/aiOrchestrator.service';
import { OpenAIService } from '../../services/ai/openai.service';
import { HuggingFaceService } from '../../services/ai/huggingface.service';
import { logger } from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class AIController {
  private aiOrchestrator: AIOrchestratorService;
  private openai: OpenAIService;
  private huggingface: HuggingFaceService;
  
  constructor() {
    this.aiOrchestrator = new AIOrchestratorService();
    this.openai = new OpenAIService();
    this.huggingface = new HuggingFaceService();
  }
  
  async getTipSuggestion(req: AuthRequest, res: Response) {
    try {
      const { context, recipientId, message } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }
      
      if (!context) {
        return res.status(400).json({
          success: false,
          error: 'Context is required'
        });
      }
      
      const analysis = await this.aiOrchestrator.analyzeTipContext(
        context,
        userId,
        recipientId,
        message
      );
      
      if (!analysis.isApproved) {
        return res.status(400).json({
          success: false,
          error: 'Content does not meet safety guidelines',
          details: analysis.rejectionReason,
          analysis
        });
      }
      
      res.json({
        success: true,
        data: {
          suggestion: analysis.suggestion,
          analysis: {
            sentiment: analysis.sentiment,
            safetyScore: analysis.safetyScore
          },
          metadata: analysis.metadata
        }
      });
      
    } catch (error: any) {
      logger.error('Tip suggestion error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate suggestion'
      });
    }
  }
  
  async analyzeSentiment(req: AuthRequest, res: Response) {
    try {
      const { message } = req.body;
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }
      
      const sentiment = await this.openai.analyzeSentiment(message);
      const moderation = await this.huggingface.moderateContent(message);
      const emotion = await this.huggingface.analyzeEmotion(message);
      
      res.json({
        success: true,
        data: {
          sentiment,
          moderation,
          emotion,
          summary: {
            isSafe: moderation.isSafe,
            primaryEmotion: emotion.emotion,
            shouldWarn: sentiment.sentiment === 'negative' || moderation.flagged
          }
        }
      });
      
    } catch (error: any) {
      logger.error('Sentiment analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze sentiment'
      });
    }
  }
  
  async processVoiceCommand(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Audio file is required'
        });
      }
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }
      
      const audioBuffer = req.file.buffer;
      
      const result = await this.aiOrchestrator.processVoiceCommand(
        audioBuffer,
        userId
      );
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error: any) {
      logger.error('Voice command error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process voice command'
      });
    }
  }
  
  async chatWithAI(req: AuthRequest, res: Response) {
    try {
      const { message, context } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }
      
      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }
      
      const response = await this.openai.generateConversationResponse(
        userId,
        message,
        context || {}
      );
      
      res.json({
        success: true,
        data: response
      });
      
    } catch (error: any) {
      logger.error('AI chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process chat message'
      });
    }
  }
}

