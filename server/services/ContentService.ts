import { DatabaseService } from './DatabaseService';
import { HuggingFaceService } from './HuggingFaceService';
import { IpfsService } from './IpfsService';
import { TipService } from './TipService';
import { ethers } from 'ethers';

export interface ContentCreateInput {
    creatorId: string;
    title: string;
    description?: string;
    contentText?: string;
    contentType?: string;
    isAI?: boolean;
    aiModel?: string;
    monetizationType?: 'TIP' | 'SUBSCRIPTION' | 'PAY_PER_VIEW' | 'FREE';
    price?: string;
    token?: string;
    isPremium?: boolean;
}

export interface ContentQualityScore {
    overall: number;
    readability: number;
    engagement: number;
    originality: number;
    monetizationPotential: number;
}

export interface ContentAnalyticsData {
    totalEarnings: string;
    totalTips: number;
    viewCount: number;
    engagementScore: number;
    averageTipAmount: string;
    topContributors: Array<{ userId: string; totalTipped: string }>;
}

export class ContentService {
    private db = DatabaseService.getInstance();
    private hfService: HuggingFaceService;
    private ipfsService: IpfsService;
    private tipService: TipService;

    constructor() {
        this.hfService = new HuggingFaceService();
        this.ipfsService = new IpfsService();
        this.tipService = new TipService();
    }

    /**
     * Create new AI-generated content with monetization settings
     */
    public async createContent(input: ContentCreateInput): Promise<{ success: boolean; contentId?: string; message?: string }> {
        try {
            // 1. Validate creator exists
            let creator = await this.db.user.findUnique({ where: { id: input.creatorId } });
            if (!creator) {
                return { success: false, message: 'Creator not found' };
            }

            // 2. Assess content quality using AI if content text is provided
            let qualityScore: ContentQualityScore | null = null;
            if (input.contentText) {
                qualityScore = await this.assessContentQuality(input.contentText);
            }

            // 3. Upload content to IPFS if provided
            let contentHash: string | undefined;
            if (input.contentText) {
                const contentData = JSON.stringify({
                    title: input.title,
                    description: input.description,
                    text: input.contentText,
                    contentType: input.contentType || 'TEXT',
                    aiModel: input.aiModel,
                    createdAt: new Date().toISOString()
                });
                contentHash = await this.ipfsService.upload(contentData);
            }

            // 4. Create content in database
            // Note: Content model not yet implemented in Prisma schema
            // This is a placeholder implementation
            throw new Error('Content model not yet implemented in database schema');
        } catch (error) {
            console.error('Error creating content:', error);
            return { success: false, message: 'Failed to create content' };
        }
    }

    /**
     * Assess content quality using AI models
     */
    private async assessContentQuality(contentText: string): Promise<ContentQualityScore> {
        try {
            // Use multiple AI models to assess different aspects
            const moderationResult = await this.hfService.moderateContent(contentText);

            // Calculate readability (simplified - word count, sentence length)
            const words = contentText.split(/\s+/).length;
            const sentences = contentText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
            const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;
            const readability = Math.min(1, Math.max(0, 1 - Math.abs(avgWordsPerSentence - 15) / 30)); // Optimal ~15 words/sentence

            // Engagement score based on content characteristics
            const hasQuestions = contentText.includes('?');
            const hasExclamations = contentText.includes('!');
            const hasNumbers = /\d/.test(contentText);
            const engagement = Math.min(1, (readability * 0.4 + (hasQuestions ? 0.2 : 0) + (hasExclamations ? 0.2 : 0) + (hasNumbers ? 0.2 : 0)));

            // Originality (simplified - based on length and uniqueness of phrases)
            const uniqueWords = new Set(contentText.toLowerCase().split(/\W+/)).size;
            const totalWords = contentText.split(/\W+/).filter(w => w.length > 0).length;
            const uniqueness = totalWords > 0 ? uniqueWords / totalWords : 0;
            const originality = Math.min(1, uniqueness * 0.8 + (contentText.length > 500 ? 0.2 : 0));

            // Monetization potential based on quality metrics
            const safetyScore = moderationResult.isSafe ? 1 : 0.5;
            const monetizationPotential = (readability * 0.25 + engagement * 0.35 + originality * 0.25 + safetyScore * 0.15);

            const overall = (readability * 0.3 + engagement * 0.3 + originality * 0.2 + safetyScore * 0.2);

            return {
                overall: Math.round(overall * 100) / 100,
                readability: Math.round(readability * 100) / 100,
                engagement: Math.round(engagement * 100) / 100,
                originality: Math.round(originality * 100) / 100,
                monetizationPotential: Math.round(monetizationPotential * 100) / 100
            };
        } catch (error) {
            console.error('Error assessing content quality:', error);
            // Return default scores if assessment fails
            return {
                overall: 0.5,
                readability: 0.5,
                engagement: 0.5,
                originality: 0.5,
                monetizationPotential: 0.5
            };
        }
    }

    /**
     * Publish content (make it available for monetization)
     */
    public async publishContent(contentId: string): Promise<{ success: boolean; message?: string }> {
        // Note: Content model not yet implemented in Prisma schema
        return { success: false, message: 'Content model not yet implemented in database schema' };
    }

    /**
     * Record content view
     */
    public async recordView(contentId: string, userId?: string): Promise<void> {
        // Note: Content model not yet implemented in Prisma schema
        console.warn('Content model not yet implemented - view recording skipped');
    }

    /**
     * Tip content creator for specific content
     */
    public async tipContent(
        senderId: string,
        contentId: string,
        amount: string,
        token: string,
        message?: string
    ): Promise<{ success: boolean; tipId?: string; message?: string }> {
        // Note: Content model not yet implemented in Prisma schema
        return { success: false, message: 'Content model not yet implemented in database schema' };
    }

    /**
     * Calculate engagement score for content
     */
    private calculateEngagementScore(viewCount: number, tipCount: number, totalEarnings: string): number {
        // Normalize metrics and calculate weighted engagement score
        const viewsPerTip = viewCount > 0 ? tipCount / viewCount : 0;
        const earnings = parseFloat(totalEarnings) || 0;
        
        // Engagement formula: 40% views, 30% tips, 30% earnings
        const viewScore = Math.min(1, viewCount / 1000); // Normalize to 1000 views = 1.0
        const tipScore = Math.min(1, viewsPerTip * 10); // 10% tip rate = 1.0
        const earningsScore = Math.min(1, earnings / 100); // 100 tokens = 1.0

        return Math.round((viewScore * 0.4 + tipScore * 0.3 + earningsScore * 0.3) * 100) / 100;
    }

    /**
     * Get content analytics
     */
    public async getContentAnalytics(contentId: string): Promise<ContentAnalyticsData | null> {
        // Note: Content model not yet implemented in Prisma schema
        return null;
    }

    /**
     * Get recommended content based on monetization potential
     */
    public async getRecommendedContent(limit: number = 10): Promise<any[]> {
        // Note: Content model not yet implemented in Prisma schema
        return [];
    }

    /**
     * Create subscription for creator's premium content
     */
    public async createSubscription(
        subscriberId: string,
        creatorId: string,
        amount: string,
        token: string
    ): Promise<{ success: boolean; subscriptionId?: string; message?: string }> {
        // Note: ContentSubscription model not yet implemented in Prisma schema
        return { success: false, message: 'ContentSubscription model not yet implemented in database schema' };
    }

    /**
     * Check if user has access to premium content
     */
    public async hasAccessToContent(userId: string, contentId: string): Promise<boolean> {
        // Note: Content model not yet implemented in Prisma schema
        return false;
    }
}

