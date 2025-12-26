import { OpenAIService, AITipSuggestion, AISentimentAnalysis } from './openai.service';
import { HuggingFaceService, ModerationResult, EmotionAnalysis } from './huggingface.service';
import { AssemblyAIService } from './assemblyai.service';
import { config } from '../../config/app';
import { logger } from '../../utils/logger';
import { CacheService } from '../database/redis.service';
import { PrismaService } from '../database/prisma.service';

export interface AIAnalysisResult {
  suggestion?: AITipSuggestion;
  sentiment?: AISentimentAnalysis;
  moderation?: ModerationResult;
  emotion?: EmotionAnalysis;
  safetyScore: number;
  isApproved: boolean;
  rejectionReason?: string;
  metadata: {
    processingTime: number;
    modelsUsed: string[];
    confidence: number;
  };
}

export interface VoiceCommandResult {
  intent: 'tip' | 'stats' | 'leaderboard' | 'badges' | 'help' | 'unknown';
  confidence: number;
  parameters: Record<string, any>;
  transcript: string;
  suggestions?: any[];
}

export class AIOrchestratorService {
  private openai: OpenAIService;
  private huggingface: HuggingFaceService;
  private assemblyai: AssemblyAIService;
  private cache: CacheService;
  private prisma: PrismaService;
  
  constructor() {
    this.openai = new OpenAIService();
    this.huggingface = new HuggingFaceService();
    this.assemblyai = new AssemblyAIService();
    this.cache = CacheService.getInstance();
    this.prisma = PrismaService.getInstance();
  }
  
  async analyzeTipContext(
    context: string,
    senderId: string,
    recipientId: string,
    message?: string
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    const modelsUsed: string[] = [];
    
    try {
      // Get user data
      const [sender, recipient] = await Promise.all([
        this.prisma.prisma.user.findUnique({ where: { id: senderId } }),
        this.prisma.prisma.user.findUnique({ where: { id: recipientId } })
      ]);
      
      if (!sender || !recipient) {
        throw new Error('User not found');
      }
      
      // Parallel AI analysis
      const [suggestion, sentiment, moderation] = await Promise.all([
        config.ENABLE_AI_SUGGESTIONS 
          ? this.openai.generateTipSuggestion(
              context,
              sender,
              recipient,
              await this.getRecentConversation(senderId)
            )
          : Promise.resolve(undefined),
        
        message
          ? this.openai.analyzeSentiment(message)
          : Promise.resolve(undefined),
        
        message
          ? this.huggingface.moderateContent(message)
          : Promise.resolve(undefined)
      ]);
      
      modelsUsed.push('openai');
      if (message) modelsUsed.push('huggingface');
      
      // Calculate safety score
      const safetyScore = this.calculateSafetyScore(sentiment, moderation);
      const isApproved = safetyScore >= 0.7;
      
      const processingTime = Date.now() - startTime;
      
      return {
        suggestion,
        sentiment,
        moderation,
        safetyScore,
        isApproved,
        rejectionReason: !isApproved ? 'Content does not meet safety guidelines' : undefined,
        metadata: {
          processingTime,
          modelsUsed,
          confidence: suggestion?.confidence || 0.5
        }
      };
      
    } catch (error) {
      logger.error('AI analysis error:', error);
      
      const processingTime = Date.now() - startTime;
      
      return {
        safetyScore: 0.3,
        isApproved: false,
        rejectionReason: 'AI analysis failed',
        metadata: {
          processingTime,
          modelsUsed: [],
          confidence: 0
        }
      };
    }
  }
  
  async processVoiceCommand(
    audioBuffer: Buffer,
    userId: string
  ): Promise<VoiceCommandResult> {
    if (!config.ENABLE_VOICE_COMMANDS) {
      return {
        intent: 'unknown',
        confidence: 0,
        parameters: {},
        transcript: 'Voice commands disabled',
        suggestions: []
      };
    }
    
    try {
      // Transcribe audio
      const transcription = await this.assemblyai.transcribeAudio(audioBuffer);
      
      if (!transcription.text || transcription.confidence < 0.5) {
        return {
          intent: 'unknown',
          confidence: transcription.confidence,
          parameters: {},
          transcript: transcription.text || '',
          suggestions: []
        };
      }
      
      // Analyze intent using OpenAI
      const intentAnalysis = await this.analyzeVoiceIntent(transcription.text, userId);
      
      // Get additional suggestions if it's a tip
      let suggestions = [];
      if (intentAnalysis.intent === 'tip' && intentAnalysis.confidence > 0.7) {
        const user = await this.prisma.prisma.user.findUnique({ where: { id: userId } });
        const recipient = await this.prisma.prisma.user.findUnique({ 
          where: { username: intentAnalysis.parameters.recipient?.replace('@', '') || undefined }
        });
        
        if (user && recipient) {
          const suggestion = await this.openai.generateTipSuggestion(
            `Voice command: ${transcription.text}`,
            user,
            recipient
          );
          
          suggestions = [suggestion];
        }
      }
      
      return {
        intent: intentAnalysis.intent,
        confidence: Math.min(transcription.confidence, intentAnalysis.confidence),
        parameters: intentAnalysis.parameters,
        transcript: transcription.text,
        suggestions
      };
      
    } catch (error) {
      logger.error('Voice command processing error:', error);
      
      return {
        intent: 'unknown',
        confidence: 0,
        parameters: {},
        transcript: '',
        suggestions: []
      };
    }
  }
  
  private async analyzeVoiceIntent(text: string, userId: string): Promise<{
    intent: VoiceCommandResult['intent'];
    confidence: number;
    parameters: Record<string, any>;
    processingTime?: number;
  }> {
    const startTime = Date.now();
    
    const prompt = `
      Analyze this voice command for a tipping platform:
      "${text}"
      
      Extract:
      1. Intent: "tip", "stats", "leaderboard", "badges", "help", or "unknown"
      2. Parameters: For "tip" intent, extract recipient and amount
      3. Confidence: 0-1
      
      Respond with JSON:
      {
        "intent": "...",
        "confidence": 0.9,
        "parameters": {
          "recipient": "@username",
          "amount": 10,
          "token": "VERY"
        }
      }
    `;
    
    try {
      const result = await this.openai.generateConversationResponse(userId, prompt, {});
      const response = JSON.parse(result.response);
      
      return {
        intent: response.intent || 'unknown',
        confidence: response.confidence || 0,
        parameters: response.parameters || {},
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      logger.error('Voice intent analysis error:', error);
      
      // Fallback regex parsing
      const tipMatch = text.match(/tip\s+@?(\w+)\s+(\d+)/i);
      if (tipMatch) {
        return {
          intent: 'tip',
          confidence: 0.7,
          parameters: {
            recipient: tipMatch[1],
            amount: parseInt(tipMatch[2]),
            token: 'VERY'
          }
        };
      }
      
      return {
        intent: 'unknown',
        confidence: 0.3,
        parameters: {}
      };
    }
  }
  
  private calculateSafetyScore(
    sentiment?: AISentimentAnalysis,
    moderation?: ModerationResult
  ): number {
    let score = 1.0;
    
    if (sentiment) {
      if (sentiment.sentiment === 'negative') {
        score *= 0.7;
      }
      if (sentiment.categories.toxicity > 0.5) {
        score *= 0.5;
      }
    }
    
    if (moderation) {
      if (moderation.flagged) {
        score *= 0.3;
      }
      
      const dangerousCategories = ['hate', 'harassment', 'self_harm', 'violence'];
      dangerousCategories.forEach(category => {
        const catKey = category as keyof typeof moderation.categories;
        if (moderation.categories[catKey] > 0.3) {
          score *= 0.6;
        }
      });
    }
    
    return Math.max(0, Math.min(1, score));
  }
  
  private async getRecentConversation(userId: string): Promise<string[]> {
    try {
      const conversation = await this.prisma.prisma.aIConversation.findFirst({
        where: { userId, isActive: true },
        orderBy: { lastMessageAt: 'desc' }
      });
      
      if (conversation) {
        return (conversation.messages as any[]).map(m => m.content).slice(-10);
      }
      
      return [];
    } catch {
      return [];
    }
  }
}

