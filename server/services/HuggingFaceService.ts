import { HfInference } from '@huggingface/inference';
import { config } from '../config';
import { CacheService } from './CacheService';

export interface ModerationResult {
    isSafe: boolean;
    flagged: boolean;
    categories: { [key: string]: number };
    scores: number[];
    needsManualReview: boolean;
}

export interface SentimentResult {
    positive: number;
    negative: number;
    neutral: number;
    label: 'positive' | 'negative' | 'neutral';
    score: number;
}

export interface ContentScore {
    quality: number; // 0-100
    engagement: number; // 0-100
    sentiment: SentimentResult;
    recommendedTipAmount?: number;
}

export interface MessageSuggestion {
    message: string;
    tone: 'friendly' | 'professional' | 'casual' | 'enthusiastic';
    score: number;
}

export class HuggingFaceService {
    private client: HfInference;
    private cache: CacheService;

    constructor() {
        this.client = new HfInference(config.HUGGINGFACE_API_KEY);
        this.cache = CacheService.getInstance();
    }

    private getScore(result: any[], label: string): number {
        const item = result.find(r => r.label === label);
        return item ? item.score : 0;
    }

    public async moderateContent(text: string): Promise<ModerationResult> {
        const cacheKey = `hf:moderation:${Buffer.from(text).toString('base64').slice(0, 50)}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached);

        try {
            // Stage 1: Fast keyword check (simplified)
            const keywords = ['scam', 'spam', 'offensive_word_placeholder'];
            if (keywords.some(k => text.toLowerCase().includes(k))) {
                return { isSafe: false, flagged: true, categories: { keyword: 1 }, scores: [1], needsManualReview: true };
            }

            // Stage 2: AI Model Check
            const result = await this.client.textClassification({
                model: 'unitary/toxic-bert',
                inputs: text,
            });

            const categories = {
                toxic: this.getScore(result, 'toxic'),
                severe_toxic: this.getScore(result, 'severe_toxic'),
                obscene: this.getScore(result, 'obscene'),
                threat: this.getScore(result, 'threat'),
                insult: this.getScore(result, 'insult'),
                identity_hate: this.getScore(result, 'identity_hate'),
            };

            const scores = Object.values(categories);
            const maxScore = Math.max(...scores);
            
            // Multi-stage logic:
            // > 0.8: Immediate flag
            // 0.5 - 0.8: Manual review
            // < 0.5: Safe
            const flagged = maxScore > 0.8;
            const needsManualReview = maxScore > 0.5 && maxScore <= 0.8;

            const moderationResult: ModerationResult = {
                isSafe: !flagged && !needsManualReview,
                categories,
                flagged,
                scores,
                needsManualReview
            };

            await this.cache.set(cacheKey, JSON.stringify(moderationResult), 3600);
            return moderationResult;
        } catch (error) {
            console.error('HuggingFace API Error:', error);
            return { isSafe: true, flagged: false, categories: {}, scores: [], needsManualReview: false };
        }
    }

    /**
     * Analyze sentiment of content to help with tip recommendations
     */
    public async analyzeSentiment(text: string): Promise<SentimentResult> {
        const cacheKey = `hf:sentiment:${Buffer.from(text).toString('base64').slice(0, 50)}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached);

        try {
            const result = await this.client.textClassification({
                model: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
                inputs: text,
            });

            const positive = this.getScore(result, 'POSITIVE') || this.getScore(result, 'LABEL_2') || 0;
            const negative = this.getScore(result, 'NEGATIVE') || this.getScore(result, 'LABEL_0') || 0;
            const neutral = this.getScore(result, 'NEUTRAL') || this.getScore(result, 'LABEL_1') || 0;

            const maxScore = Math.max(positive, negative, neutral);
            let label: 'positive' | 'negative' | 'neutral' = 'neutral';
            if (maxScore === positive) label = 'positive';
            else if (maxScore === negative) label = 'negative';

            const sentimentResult: SentimentResult = {
                positive,
                negative,
                neutral,
                label,
                score: maxScore
            };

            await this.cache.set(cacheKey, JSON.stringify(sentimentResult), 1800);
            return sentimentResult;
        } catch (error) {
            console.error('HuggingFace Sentiment Analysis Error:', error);
            return { positive: 0.33, negative: 0.33, neutral: 0.34, label: 'neutral', score: 0.34 };
        }
    }

    /**
     * Score content quality and engagement potential
     */
    public async scoreContent(text: string, context?: { authorId?: string; contentType?: string }): Promise<ContentScore> {
        const cacheKey = `hf:content-score:${Buffer.from(text + (context?.authorId || '')).toString('base64').slice(0, 50)}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached);

        try {
            const sentiment = await this.analyzeSentiment(text);
            
            // Analyze text characteristics
            const wordCount = text.split(/\s+/).length;
            const hasQuestions = /\?/.test(text);
            const hasEmojis = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(text);
            const hasLinks = /https?:\/\//.test(text);
            
            // Quality score based on multiple factors
            let qualityScore = 50; // Base score
            
            // Sentiment boost (positive content gets higher score)
            if (sentiment.label === 'positive') qualityScore += 20;
            else if (sentiment.label === 'negative') qualityScore -= 10;
            
            // Length considerations (optimal: 50-200 words)
            if (wordCount >= 50 && wordCount <= 200) qualityScore += 15;
            else if (wordCount < 20) qualityScore -= 10;
            
            // Engagement indicators
            let engagementScore = 50;
            if (hasQuestions) engagementScore += 10;
            if (hasEmojis) engagementScore += 5;
            if (hasLinks) engagementScore += 5;
            if (wordCount > 100) engagementScore += 10;
            
            // Normalize scores to 0-100
            qualityScore = Math.max(0, Math.min(100, qualityScore));
            engagementScore = Math.max(0, Math.min(100, engagementScore));
            
            // Recommend tip amount based on quality and engagement
            // Base tip: 1-5 tokens, scaled by quality (up to 50 tokens for excellent content)
            const baseTip = 2;
            const qualityMultiplier = qualityScore / 100;
            const engagementMultiplier = engagementScore / 100;
            const recommendedTipAmount = Math.round(baseTip * (1 + qualityMultiplier * 2) * (1 + engagementMultiplier * 1.5));
            
            const contentScore: ContentScore = {
                quality: Math.round(qualityScore),
                engagement: Math.round(engagementScore),
                sentiment,
                recommendedTipAmount
            };

            await this.cache.set(cacheKey, JSON.stringify(contentScore), 3600);
            return contentScore;
        } catch (error) {
            console.error('HuggingFace Content Scoring Error:', error);
            return {
                quality: 50,
                engagement: 50,
                sentiment: { positive: 0.33, negative: 0.33, neutral: 0.34, label: 'neutral', score: 0.34 },
                recommendedTipAmount: 5
            };
        }
    }

    /**
     * Generate personalized tip message suggestions
     */
    public async generateMessageSuggestions(
        context: {
            recipientName?: string;
            contentPreview?: string;
            tipAmount?: number;
            relationship?: 'friend' | 'creator' | 'stranger' | 'regular';
        }
    ): Promise<MessageSuggestion[]> {
        const cacheKey = `hf:message-suggestions:${JSON.stringify(context).slice(0, 50)}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached);

        try {
            const suggestions: MessageSuggestion[] = [];
            
            // Generate suggestions based on context
            const recipientName = context.recipientName || 'there';
            const amount = context.tipAmount || 5;
            
            // Friendly tone suggestions
            suggestions.push({
                message: `Great work, ${recipientName}! Keep it up! 🚀`,
                tone: 'friendly',
                score: 0.9
            });
            
            suggestions.push({
                message: `Loved this! Thanks for sharing. 💖`,
                tone: 'friendly',
                score: 0.85
            });
            
            // Professional tone
            if (amount >= 20) {
                suggestions.push({
                    message: `Excellent content. This deserves recognition.`,
                    tone: 'professional',
                    score: 0.8
                });
            }
            
            // Enthusiastic tone
            suggestions.push({
                message: `This is amazing! ${amount} VERY well deserved! 🎉`,
                tone: 'enthusiastic',
                score: 0.88
            });
            
            // Casual tone
            suggestions.push({
                message: `Nice one! Keep creating 🔥`,
                tone: 'casual',
                score: 0.82
            });
            
            // Generate AI-powered suggestions using text generation if API key is available
            try {
                const prompt = `Generate 2 short, friendly tip messages (under 50 characters) for someone who created great content. Recipient: ${recipientName}. Tip amount: ${amount} VERY. Make them warm and encouraging.`;
                
                const generated = await this.client.textGeneration({
                    model: 'gpt2', // Using GPT-2 as fallback (requires API key)
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 100,
                        return_full_text: false,
                        temperature: 0.7,
                    }
                });
                
                // Parse generated text and add to suggestions (basic parsing)
                const generatedText = generated.generated_text || '';
                const lines = generatedText.split('\n').filter(line => line.trim().length > 0 && line.length < 100);
                
                lines.slice(0, 2).forEach((line, index) => {
                    suggestions.push({
                        message: line.trim(),
                        tone: index % 2 === 0 ? 'friendly' : 'casual',
                        score: 0.75
                    });
                });
            } catch (genError) {
                // Fallback if text generation fails - use predefined suggestions
                console.log('Using predefined message suggestions');
            }
            
            // Sort by score and return top suggestions
            const sortedSuggestions = suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
            
            await this.cache.set(cacheKey, JSON.stringify(sortedSuggestions), 1800);
            return sortedSuggestions;
        } catch (error) {
            console.error('HuggingFace Message Generation Error:', error);
            // Return fallback suggestions
            return [
                { message: 'Great work! Keep it up! 🚀', tone: 'friendly', score: 0.8 },
                { message: 'Loved this content! 💖', tone: 'casual', score: 0.75 },
                { message: 'Thanks for sharing this!', tone: 'professional', score: 0.7 }
            ];
        }
    }
}
