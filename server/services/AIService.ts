import { HuggingFaceService, ModerationResult, SentimentResult, ContentScore, MessageSuggestion } from './HuggingFaceService';
import { CacheService } from './CacheService';
import { config } from '../config';

// OpenAI integration (optional - falls back to HF if not available)
// Dynamically import OpenAI if needed
let OpenAIClient: any = null;

export interface TipSuggestion {
    amount: string;
    message: string;
    confidence: number;
    reasoning: string;
}

export interface PersonalizedInsight {
    summary: string;
    insights: string[];
    recommendations: string[];
}

/**
 * Comprehensive AI Service Layer
 * 
 * Integrates OpenAI GPT-4 and Hugging Face models to provide:
 * - Intelligent tip suggestions with context awareness
 * - Sentiment & toxicity moderation
 * - Personalized leaderboard insights
 * - Smart badge recommendations
 */
export class AIService {
    private hfService: HuggingFaceService;
    private openai: any = null;
    private cache: CacheService;
    private openaiAvailable: boolean;

    constructor() {
        this.hfService = new HuggingFaceService();
        this.cache = CacheService.getInstance();
        this.openaiAvailable = false;
        this.openai = null;

        // Initialize OpenAI if available (async initialization)
        this.initializeOpenAI();
    }

    private async initializeOpenAI() {
        if (!config.OPENAI_API_KEY || config.OPENAI_API_KEY === '') {
            console.log('OpenAI API key not configured. Using Hugging Face models only.');
            return;
        }

        try {
            // Dynamically import OpenAI (optional dependency)
            // @ts-ignore - openai is an optional dependency
            const openaiModule = await import('openai');
            const OpenAI = openaiModule.default || openaiModule;
            this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
            this.openaiAvailable = true;
            console.log('OpenAI initialized successfully');
        } catch (error) {
            console.warn('OpenAI package not available or failed to initialize:', error);
            this.openaiAvailable = false;
        }
    }

    /**
     * Generate intelligent tip suggestion based on chat context
     * Uses GPT-4 if available, falls back to Hugging Face models
     */
    async generateTipSuggestion(chatContext: string, context?: {
        recipientName?: string;
        relationship?: 'friend' | 'creator' | 'stranger' | 'regular';
        previousTips?: number;
        contentQuality?: number;
    }): Promise<TipSuggestion> {
        // Ensure OpenAI is initialized if API key exists
        if (!this.openai && config.OPENAI_API_KEY && config.OPENAI_API_KEY !== '') {
            await this.initializeOpenAI();
        }

        const cacheKey = `ai:tip-suggestion:${Buffer.from(chatContext + JSON.stringify(context || {})).toString('base64').slice(0, 80)}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        try {
            if (this.openaiAvailable && this.openai) {
                // Use OpenAI GPT for intelligent suggestions
                const prompt = this.buildTipSuggestionPrompt(chatContext, context);
                
                const completion = await this.openai.chat.completions.create({
                    model: config.OPENAI_MODEL || 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that suggests appropriate tip amounts and personalized messages for a social tipping platform. Analyze the context and provide practical, friendly suggestions.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 200,
                });

                const content = completion.choices[0]?.message?.content || '';
                const parsed = this.parseTipSuggestionResponse(content);
                
                await this.cache.set(cacheKey, JSON.stringify(parsed), 1800); // 30 min cache
                return parsed;
            } else {
                // Fallback to Hugging Face + custom logic
                return this.generateTipSuggestionFallback(chatContext, context);
            }
        } catch (error) {
            console.error('Error generating tip suggestion with OpenAI:', error);
            // Fallback to Hugging Face
            return this.generateTipSuggestionFallback(chatContext, context);
        }
    }

    /**
     * Fallback tip suggestion using Hugging Face models
     */
    private async generateTipSuggestionFallback(
        chatContext: string,
        context?: { recipientName?: string; relationship?: string; previousTips?: number; contentQuality?: number }
    ): Promise<TipSuggestion> {
        // Analyze sentiment and content quality
        const [sentiment, contentScore] = await Promise.all([
            this.hfService.analyzeSentiment(chatContext),
            this.hfService.scoreContent(chatContext)
        ]);

        // Calculate suggested amount based on sentiment and quality
        let baseAmount = 5;
        if (contentScore.quality >= 80) baseAmount = 20;
        else if (contentScore.quality >= 60) baseAmount = 10;
        else if (contentScore.quality < 40) baseAmount = 2;

        // Adjust based on sentiment
        if (sentiment.label === 'positive') baseAmount = Math.round(baseAmount * 1.2);
        else if (sentiment.label === 'negative') baseAmount = Math.max(1, Math.round(baseAmount * 0.7));

        // Adjust based on relationship
        if (context?.relationship === 'friend' || context?.relationship === 'regular') {
            baseAmount = Math.round(baseAmount * 1.3);
        }

        // Generate message suggestions
        const messageSuggestions = await this.hfService.generateMessageSuggestions({
            recipientName: context?.recipientName,
            contentPreview: chatContext.substring(0, 100),
            tipAmount: baseAmount,
            relationship: context?.relationship as any
        });

        const bestMessage = messageSuggestions[0]?.message || 'Great work! Keep it up! 🚀';
        const confidence = (sentiment.score + contentScore.quality / 100) / 2;

        const suggestion: TipSuggestion = {
            amount: baseAmount.toString(),
            message: bestMessage,
            confidence: Math.min(0.95, confidence),
            reasoning: `Based on content analysis: Quality ${contentScore.quality}/100, Sentiment: ${sentiment.label} (${Math.round(sentiment.score * 100)}% confidence).`
        };

        return suggestion;
    }

    /**
     * Build prompt for OpenAI tip suggestion
     */
    private buildTipSuggestionPrompt(chatContext: string, context?: any): string {
        let prompt = `Analyze this chat message and suggest an appropriate tip amount and personalized message:\n\n"${chatContext}"\n\n`;
        
        if (context?.recipientName) {
            prompt += `Recipient: ${context.recipientName}\n`;
        }
        if (context?.relationship) {
            prompt += `Relationship: ${context.relationship}\n`;
        }
        if (context?.previousTips) {
            prompt += `Previous tips to this user: ${context.previousTips}\n`;
        }
        if (context?.contentQuality) {
            prompt += `Content quality score: ${context.contentQuality}/100\n`;
        }

        prompt += `\nReturn a JSON object with this exact structure:\n`;
        prompt += `{"amount": "suggested_amount_as_string", "message": "personalized_tip_message", "confidence": 0.0-1.0, "reasoning": "brief_explanation"}\n`;
        prompt += `Keep the message under 60 characters, friendly, and appropriate for the context.`;

        return prompt;
    }

    /**
     * Parse OpenAI response into TipSuggestion
     */
    private parseTipSuggestionResponse(content: string): TipSuggestion {
        try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    amount: parsed.amount?.toString() || '5',
                    message: parsed.message || 'Great work! Keep it up! 🚀',
                    confidence: parsed.confidence || 0.7,
                    reasoning: parsed.reasoning || 'AI-generated suggestion based on context.'
                };
            }
        } catch (error) {
            console.error('Error parsing OpenAI response:', error);
        }

        // Fallback if parsing fails
        return {
            amount: '5',
            message: 'Great work! Keep it up! 🚀',
            confidence: 0.6,
            reasoning: 'Unable to parse AI response, using default suggestion.'
        };
    }

    /**
     * Moderate message for toxicity and sentiment
     * Delegates to HuggingFaceService
     */
    async moderateMessage(message: string): Promise<{ isToxic: boolean; sentiment: string; details: ModerationResult }> {
        const moderation = await this.hfService.moderateContent(message);
        const sentiment = await this.hfService.analyzeSentiment(message);

        return {
            isToxic: moderation.flagged || !moderation.isSafe,
            sentiment: sentiment.label,
            details: moderation
        };
    }

    /**
     * Generate personalized leaderboard insights
     */
    async generateLeaderboardInsight(userId: string, analytics: {
        topRecipients?: Array<{ id: string; name?: string; tipCount: number; totalAmount: number }>;
        topSenders?: Array<{ id: string; name?: string; tipCount: number; totalAmount: number }>;
        totalTips: number;
        totalReceived: number;
        streak?: number;
    }): Promise<PersonalizedInsight> {
        // Ensure OpenAI is initialized if API key exists
        if (!this.openai && config.OPENAI_API_KEY && config.OPENAI_API_KEY !== '') {
            await this.initializeOpenAI();
        }

        const cacheKey = `ai:leaderboard-insight:${userId}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        try {
            if (this.openaiAvailable && this.openai) {
                const prompt = this.buildLeaderboardInsightPrompt(userId, analytics);
                
                const completion = await this.openai.chat.completions.create({
                    model: config.OPENAI_MODEL || 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a friendly analytics assistant that provides personalized, encouraging insights about user tipping behavior. Keep insights positive, actionable, and under 200 characters each.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.8,
                    max_tokens: 300,
                });

                const content = completion.choices[0]?.message?.content || '';
                const parsed = this.parseLeaderboardInsight(content, analytics);
                
                await this.cache.set(cacheKey, JSON.stringify(parsed), 3600); // 1 hour cache
                return parsed;
            } else {
                // Fallback to template-based insights
                return this.generateLeaderboardInsightFallback(userId, analytics);
            }
        } catch (error) {
            console.error('Error generating leaderboard insight:', error);
            return this.generateLeaderboardInsightFallback(userId, analytics);
        }
    }

    /**
     * Build prompt for leaderboard insights
     */
    private buildLeaderboardInsightPrompt(userId: string, analytics: any): string {
        let prompt = `Generate a personalized weekly summary for a user on a tipping platform.\n\n`;
        prompt += `User Stats:\n`;
        prompt += `- Total tips sent: ${analytics.totalTips || 0}\n`;
        prompt += `- Total received: ${analytics.totalReceived || 0}\n`;
        
        if (analytics.streak) {
            prompt += `- Current tip streak: ${analytics.streak} days\n`;
        }

        if (analytics.topRecipients && analytics.topRecipients.length > 0) {
            prompt += `\nTop recipients:\n`;
            analytics.topRecipients.slice(0, 3).forEach((r: any, i: number) => {
                prompt += `${i + 1}. ${r.name || r.id}: ${r.tipCount} tips, ${r.totalAmount} total\n`;
            });
        }

        if (analytics.topSenders && analytics.topSenders.length > 0) {
            prompt += `\nTop tippers to this user:\n`;
            analytics.topSenders.slice(0, 3).forEach((r: any, i: number) => {
                prompt += `${i + 1}. ${r.name || r.id}: ${r.tipCount} tips, ${r.totalAmount} total\n`;
            });
        }

        prompt += `\nReturn a JSON object:\n`;
        prompt += `{"summary": "brief_summary_under_150_chars", "insights": ["insight1", "insight2"], "recommendations": ["rec1", "rec2"]}\n`;
        prompt += `Make it warm, encouraging, and specific to their activity.`;

        return prompt;
    }

    /**
     * Parse leaderboard insight response
     */
    private parseLeaderboardInsight(content: string, analytics: any): PersonalizedInsight {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    summary: parsed.summary || 'Your tipping activity this week',
                    insights: Array.isArray(parsed.insights) ? parsed.insights : [],
                    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
                };
            }
        } catch (error) {
            console.error('Error parsing leaderboard insight:', error);
        }

        return this.generateLeaderboardInsightFallback('', analytics);
    }

    /**
     * Fallback template-based leaderboard insights
     */
    private generateLeaderboardInsightFallback(userId: string, analytics: any): PersonalizedInsight {
        const insights: string[] = [];
        const recommendations: string[] = [];

        if (analytics.totalTips > 0) {
            insights.push(`You've sent ${analytics.totalTips} tip${analytics.totalTips > 1 ? 's' : ''} this period!`);
        }

        if (analytics.topRecipients && analytics.topRecipients.length > 0) {
            const topRecipient = analytics.topRecipients[0];
            insights.push(`You're the top supporter of ${topRecipient.name || 'your favorite creator'}!`);
        }

        if (analytics.streak && analytics.streak >= 3) {
            insights.push(`Amazing ${analytics.streak}-day tipping streak! 🔥`);
        }

        if (analytics.totalTips < 5) {
            recommendations.push('Try tipping 5 different creators to unlock new badges!');
        }

        if (analytics.totalReceived > analytics.totalTips * 2) {
            recommendations.push('Share the love - consider tipping back to creators who support you!');
        }

        const summary = insights.length > 0 
            ? insights[0] 
            : 'Keep up the great work supporting creators!';

        return {
            summary,
            insights: insights.slice(0, 3),
            recommendations: recommendations.slice(0, 2)
        };
    }

    /**
     * Suggest badges based on user behavior
     */
    async suggestBadges(userId: string, behavior: {
        tipCount: number;
        totalAmount: number;
        uniqueRecipients: number;
        streak: number;
        contentCreated?: number;
    }): Promise<Array<{ badgeName: string; reason: string; progress?: number }>> {
        const suggestions: Array<{ badgeName: string; reason: string; progress?: number }> = [];

        // First Tip badge
        if (behavior.tipCount >= 1 && behavior.tipCount < 5) {
            suggestions.push({
                badgeName: 'First Steps',
                reason: 'Sent your first tip!',
                progress: 100
            });
        }

        // Generous Tipper badge
        if (behavior.tipCount >= 5) {
            suggestions.push({
                badgeName: 'Generous Tipper',
                reason: `Sent ${behavior.tipCount} tips to creators`,
                progress: Math.min(100, (behavior.tipCount / 10) * 100)
            });
        }

        // Community Builder badge
        if (behavior.uniqueRecipients >= 10) {
            suggestions.push({
                badgeName: 'Community Builder',
                reason: `Supported ${behavior.uniqueRecipients} different creators`,
                progress: Math.min(100, (behavior.uniqueRecipients / 20) * 100)
            });
        }

        // Streak Master badge
        if (behavior.streak >= 7) {
            suggestions.push({
                badgeName: 'Streak Master',
                reason: `${behavior.streak}-day tipping streak!`,
                progress: Math.min(100, (behavior.streak / 30) * 100)
            });
        }

        // Big Spender badge
        if (parseFloat(behavior.totalAmount.toString()) >= 100) {
            suggestions.push({
                badgeName: 'Big Spender',
                reason: `Tipped over ${behavior.totalAmount} VERY tokens`,
                progress: Math.min(100, (parseFloat(behavior.totalAmount.toString()) / 500) * 100)
            });
        }

        return suggestions;
    }

    /**
     * Expose Hugging Face service methods for backward compatibility
     */
    get moderation() {
        return {
            moderateContent: (text: string) => this.hfService.moderateContent(text),
            analyzeSentiment: (text: string) => this.hfService.analyzeSentiment(text),
        };
    }

    get content() {
        return {
            scoreContent: (text: string, context?: any) => this.hfService.scoreContent(text, context),
            generateMessageSuggestions: (context: any) => this.hfService.generateMessageSuggestions(context),
        };
    }
}

