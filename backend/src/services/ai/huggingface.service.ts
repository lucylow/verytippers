import { HfInference } from '@huggingface/inference';
import { config } from '../../config/app';
import { logger } from '../../utils/logger';
import { CacheService } from '../database/redis.service';

export interface ModerationResult {
  isSafe: boolean;
  categories: {
    sexual: number;
    hate: number;
    harassment: number;
    self_harm: number;
    sexual_minors: number;
    hate_threatening: number;
    violence: number;
    violence_graphic: number;
  };
  flagged: boolean;
  scores: number[];
}

export interface EmotionAnalysis {
  emotion: string;
  scores: {
    anger: number;
    disgust: number;
    fear: number;
    joy: number;
    neutral: number;
    sadness: number;
    surprise: number;
  };
  dominant: string;
}

export class HuggingFaceService {
  private client: HfInference | null = null;
  private cache: CacheService;
  
  constructor() {
    if (config.HUGGINGFACE_API_KEY) {
      this.client = new HfInference(config.HUGGINGFACE_API_KEY);
    }
    this.cache = CacheService.getInstance();
  }
  
  async moderateContent(text: string): Promise<ModerationResult> {
    if (!this.client) {
      return this.getFallbackModeration();
    }

    const cacheKey = `hf:moderation:${Buffer.from(text).toString('base64').slice(0, 50)}`;
    
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    try {
      const result = await this.client.textClassification({
        model: 'unitary/toxic-bert',
        inputs: text,
      });
      
      // Map results to our format
      const categories = {
        sexual: this.getScore(result, 'obscene'),
        hate: this.getScore(result, 'identity_attack'),
        harassment: this.getScore(result, 'insult'),
        self_harm: this.getScore(result, 'threat'),
        sexual_minors: this.getScore(result, 'obscene') * 0.8,
        hate_threatening: this.getScore(result, 'identity_attack') * 0.9,
        violence: this.getScore(result, 'threat'),
        violence_graphic: this.getScore(result, 'threat') * 0.7,
      };
      
      const scores = Object.values(categories);
      const maxScore = Math.max(...scores);
      const flagged = maxScore > 0.7; // Threshold for flagging
      
      const moderationResult: ModerationResult = {
        isSafe: !flagged,
        categories,
        flagged,
        scores
      };
      
      // Cache for 1 hour
      await this.cache.set(cacheKey, JSON.stringify(moderationResult), 3600);
      
      return moderationResult;
      
    } catch (error) {
      logger.error('HuggingFace moderation error:', error);
      return this.getFallbackModeration();
    }
  }
  
  async analyzeEmotion(text: string): Promise<EmotionAnalysis> {
    if (!this.client) {
      return this.getFallbackEmotion();
    }

    const cacheKey = `hf:emotion:${Buffer.from(text).toString('base64').slice(0, 50)}`;
    
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    try {
      const result = await this.client.textClassification({
        model: 'j-hartmann/emotion-english-distilroberta-base',
        inputs: text,
      });
      
      const scores = {
        anger: this.getEmotionScore(result, 'anger'),
        disgust: this.getEmotionScore(result, 'disgust'),
        fear: this.getEmotionScore(result, 'fear'),
        joy: this.getEmotionScore(result, 'joy'),
        neutral: this.getEmotionScore(result, 'neutral'),
        sadness: this.getEmotionScore(result, 'sadness'),
        surprise: this.getEmotionScore(result, 'surprise'),
      };
      
      // Find dominant emotion
      let dominant = 'neutral';
      let maxScore = 0;
      
      Object.entries(scores).forEach(([emotion, score]) => {
        if (score > maxScore) {
          maxScore = score;
          dominant = emotion;
        }
      });
      
      const emotionAnalysis: EmotionAnalysis = {
        emotion: dominant,
        scores,
        dominant
      };
      
      // Cache for 1 hour
      await this.cache.set(cacheKey, JSON.stringify(emotionAnalysis), 3600);
      
      return emotionAnalysis;
      
    } catch (error) {
      logger.error('HuggingFace emotion analysis error:', error);
      return this.getFallbackEmotion();
    }
  }
  
  async generateBadgeDescription(
    badgeName: string,
    userActions: string[],
    communityContext: string
  ): Promise<string> {
    if (!this.client) {
      return `Achievement unlocked: ${badgeName}`;
    }

    try {
      const prompt = `
        Generate a fun, engaging description for badge: "${badgeName}"
        
        User actions: ${userActions.join(', ')}
        Community context: ${communityContext}
        
        Make it:
        - 1-2 sentences
        - Encouraging and positive
        - Game-like feeling
        - Specific to the achievement
        
        Example format: "You've shown amazing generosity by tipping 10+ users! Keep spreading the love!"
      `;
      
      const result = await this.client.textGeneration({
        model: 'gpt2',
        inputs: prompt,
        parameters: {
          max_length: 100,
          temperature: 0.9,
          top_p: 0.95,
          repetition_penalty: 1.2,
        },
      });
      
      return result.generated_text?.trim() || `Earned for ${badgeName}`;
      
    } catch (error) {
      logger.error('HuggingFace badge description error:', error);
      return `Achievement unlocked: ${badgeName}`;
    }
  }
  
  async summarizeConversation(messages: string[]): Promise<string> {
    if (!this.client) {
      return 'Conversation about tipping and community engagement.';
    }

    try {
      const conversation = messages.join('\n');
      
      const result = await this.client.summarization({
        model: 'facebook/bart-large-cnn',
        inputs: conversation,
        parameters: {
          max_length: 100,
          min_length: 30,
        },
      });
      
      return result.summary_text || 'Conversation about tipping and community engagement.';
      
    } catch (error) {
      logger.error('HuggingFace conversation summary error:', error);
      return 'Conversation about tipping and community engagement.';
    }
  }
  
  private getScore(result: any, label: string): number {
    if (!Array.isArray(result)) {
      return 0;
    }
    const item = result.find((r: any) => r.label?.toLowerCase().includes(label));
    return item ? item.score : 0;
  }
  
  private getEmotionScore(result: any, emotion: string): number {
    if (!Array.isArray(result)) {
      return emotion === 'neutral' ? 1 : 0;
    }
    const item = result.find((r: any) => r.label === emotion);
    return item ? item.score : 0;
  }

  private getFallbackModeration(): ModerationResult {
    return {
      isSafe: true,
      categories: {
        sexual: 0,
        hate: 0,
        harassment: 0,
        self_harm: 0,
        sexual_minors: 0,
        hate_threatening: 0,
        violence: 0,
        violence_graphic: 0,
      },
      flagged: false,
      scores: [0, 0, 0, 0, 0, 0, 0, 0]
    };
  }

  private getFallbackEmotion(): EmotionAnalysis {
    return {
      emotion: 'neutral',
      scores: {
        anger: 0,
        disgust: 0,
        fear: 0,
        joy: 0,
        neutral: 1,
        sadness: 0,
        surprise: 0,
      },
      dominant: 'neutral'
    };
  }
}

