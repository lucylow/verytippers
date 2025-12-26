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
            const content = await this.db.content.create({
                data: {
                    creatorId: input.creatorId,
                    title: input.title,
                    description: input.description,
                    contentText: input.contentText,
                    contentHash: contentHash,
                    contentType: input.contentType || 'TEXT',
                    isAI: input.isAI ?? true,
                    aiModel: input.aiModel,
                    qualityScore: qualityScore?.overall,
                    monetizationType: input.monetizationType || 'TIP',
                    price: input.price,
                    token: input.token,
                    isPremium: input.isPremium ?? false,
                    isPublished: false // Requires review/publishing step
                }
            });

            return { success: true, contentId: content.id };
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
        try {
            const content = await this.db.content.findUnique({ where: { id: contentId } });
            if (!content) {
                return { success: false, message: 'Content not found' };
            }

            // Final moderation check before publishing
            if (content.contentText) {
                const moderationResult = await this.hfService.moderateContent(content.contentText);
                if (moderationResult.flagged) {
                    return { success: false, message: 'Content cannot be published due to moderation issues' };
                }
            }

            await this.db.content.update({
                where: { id: contentId },
                data: { isPublished: true }
            });

            return { success: true };
        } catch (error) {
            console.error('Error publishing content:', error);
            return { success: false, message: 'Failed to publish content' };
        }
    }

    /**
     * Record content view
     */
    public async recordView(contentId: string, userId?: string): Promise<void> {
        try {
            await this.db.content.update({
                where: { id: contentId },
                data: {
                    viewCount: { increment: 1 }
                }
            });

            // Record analytics (create new entry for today)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const existingAnalytics = await this.db.contentAnalytics.findFirst({
                where: {
                    contentId: contentId,
                    date: {
                        gte: today,
                        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                    }
                }
            });

            if (existingAnalytics) {
                await this.db.contentAnalytics.update({
                    where: { id: existingAnalytics.id },
                    data: { views: { increment: 1 } }
                });
            } else {
                await this.db.contentAnalytics.create({
                    data: {
                        contentId: contentId,
                        date: today,
                        views: 1
                    }
                });
            }
        } catch (error) {
            // Use fallback if upsert fails (might need different approach for date-based unique key)
            console.error('Error recording view:', error);
            await this.db.content.update({
                where: { id: contentId },
                data: { viewCount: { increment: 1 } }
            });
        }
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
        try {
            const content = await this.db.content.findUnique({
                where: { id: contentId },
                include: { creator: true }
            });

            if (!content) {
                return { success: false, message: 'Content not found' };
            }

            if (!content.isPublished) {
                return { success: false, message: 'Content is not published' };
            }

            // Process tip through TipService (contentId will be linked automatically)
            const tipResult = await this.tipService.processTip(
                senderId,
                content.creatorId,
                amount,
                token,
                message,
                contentId,
                undefined // options
            );

            if (!tipResult.success) {
                return tipResult;
            }

            // Note: Content earnings will be updated by TipService's handleBlockchainEvent
            // when the tip transaction is confirmed on-chain

            return { success: true, tipId: tipResult.tipId };
        } catch (error) {
            console.error('Error tipping content:', error);
            return { success: false, message: 'Failed to process tip' };
        }
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
        try {
            const content = await this.db.content.findUnique({
                where: { id: contentId },
                include: {
                    tips: {
                        include: { sender: true },
                        where: { status: 'COMPLETED' }
                    }
                }
            });

            if (!content) {
                return null;
            }

            // Calculate average tip amount
            const tips = content.tips.filter((t: { status: string }) => t.status === 'COMPLETED');
            const totalTipAmount = tips.reduce((sum: number, tip: { amount?: string | null }) => sum + parseFloat(tip.amount || '0'), 0);
            const averageTipAmount = tips.length > 0 ? (totalTipAmount / tips.length).toFixed(6) : '0';

            // Get top contributors
            const contributorMap = new Map<string, number>();
            tips.forEach((tip: { senderId: string; amount?: string | null }) => {
                const current = contributorMap.get(tip.senderId) || 0;
                contributorMap.set(tip.senderId, current + parseFloat(tip.amount || '0'));
            });

            const topContributors = Array.from(contributorMap.entries())
                .map(([userId, totalTipped]) => ({ userId, totalTipped: totalTipped.toFixed(6) }))
                .sort((a, b) => parseFloat(b.totalTipped) - parseFloat(a.totalTipped))
                .slice(0, 10);

            return {
                totalEarnings: content.totalEarnings || '0',
                totalTips: content.totalTips,
                viewCount: content.viewCount,
                engagementScore: content.engagementScore,
                averageTipAmount,
                topContributors
            };
        } catch (error) {
            console.error('Error getting content analytics:', error);
            return null;
        }
    }

    /**
     * Get recommended content based on monetization potential
     */
    public async getRecommendedContent(limit: number = 10): Promise<any[]> {
        try {
            const content = await this.db.content.findMany({
                where: {
                    isPublished: true
                },
                include: {
                    creator: true
                },
                orderBy: [
                    { engagementScore: 'desc' },
                    { qualityScore: 'desc' },
                    { totalEarnings: 'desc' }
                ],
                take: limit
            });

            return content;
        } catch (error) {
            console.error('Error getting recommended content:', error);
            return [];
        }
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
        try {
            // Check if subscription already exists
            const existing = await this.db.contentSubscription.findUnique({
                where: {
                    subscriberId_creatorId: {
                        subscriberId,
                        creatorId
                    }
                }
            });

            if (existing && existing.status === 'ACTIVE') {
                return { success: false, message: 'Active subscription already exists' };
            }

            // Calculate end date (30 days from now)
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);

            const subscription = await this.db.contentSubscription.upsert({
                where: {
                    subscriberId_creatorId: {
                        subscriberId,
                        creatorId
                    }
                },
                create: {
                    subscriberId,
                    creatorId,
                    token,
                    amount,
                    status: 'ACTIVE',
                    endDate
                },
                update: {
                    status: 'ACTIVE',
                    startDate: new Date(),
                    endDate,
                    amount,
                    token
                }
            });

            return { success: true, subscriptionId: subscription.id };
        } catch (error) {
            console.error('Error creating subscription:', error);
            return { success: false, message: 'Failed to create subscription' };
        }
    }

    /**
     * Check if user has access to premium content
     */
    public async hasAccessToContent(userId: string, contentId: string): Promise<boolean> {
        try {
            const content = await this.db.content.findUnique({
                where: { id: contentId }
            });

            if (!content) {
                return false;
            }

            // Free content or own content
            if (content.monetizationType === 'FREE' || content.creatorId === userId) {
                return true;
            }

            // Premium content requires subscription
            if (content.isPremium || content.monetizationType === 'SUBSCRIPTION') {
                const subscription = await this.db.contentSubscription.findUnique({
                    where: {
                        subscriberId_creatorId: {
                            subscriberId: userId,
                            creatorId: content.creatorId
                        }
                    }
                });

                if (!subscription || subscription.status !== 'ACTIVE') {
                    return false;
                }

                // Check if subscription hasn't expired
                if (subscription.endDate && subscription.endDate < new Date()) {
                    return false;
                }

                return true;
            }

            // Pay-per-view handled separately
            return true;
        } catch (error) {
            console.error('Error checking content access:', error);
            return false;
        }
    }
}

