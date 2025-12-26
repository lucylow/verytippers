// server/services/moderationPipeline.ts - Production Moderation Pipeline
import { ModerationService, ModerationResult } from './ModerationService';
import { HfInference } from '@huggingface/inference';
import { config } from '../config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const hf = new HfInference(config.HUGGINGFACE_API_KEY);

export interface TipContext {
    senderId: string;
    recipientId?: string;
    channel?: string;
    recentTips?: number;
    senderHistory?: {
        totalTips: number;
        flaggedTips: number;
    };
}

export interface ModerationPipelineResult extends ModerationResult {
    stage: string;
    models?: {
        sentiment?: any;
        toxicity?: any;
        spam?: any;
    };
}

export class ModerationPipeline {
    private moderationService: ModerationService;

    constructor() {
        this.moderationService = new ModerationService();
    }

    /**
     * Process tip message through multi-stage moderation pipeline
     */
    async processTipMessage(
        message: string,
        context: TipContext
    ): Promise<ModerationPipelineResult> {
        // Stage 1: Heuristic pre-filter (0ms cost)
        const heuristicResult = await this.heuristicFilter(message);
        if (!heuristicResult.isSafe) {
            return {
                ...heuristicResult,
                stage: 'heuristic',
                models: {}
            };
        }

        // Stage 2: Parallel ML inference (<200ms)
        const [sentiment, toxicity, spam] = await Promise.all([
            this.sentimentAnalysis(message),
            this.toxicityAnalysis(message),
            this.spamDetection(message, context)
        ]);

        // Stage 3: Contextual scoring
        const finalScore = this.calculateRiskScore(sentiment, toxicity, spam, context);
        const action = this.determineAction(finalScore, toxicity, sentiment);

        const result: ModerationPipelineResult = {
            isSafe: action === 'allow',
            sentiment: sentiment.sentiment || 'neutral',
            toxicityScore: toxicity.toxicityScore || 0,
            toxicityLabels: toxicity.labels || [],
            flaggedReason: action !== 'allow' ? this.getReason(action, toxicity, spam) : null,
            action: action,
            stage: 'ml-pipeline',
            models: {
                sentiment,
                toxicity,
                spam
            }
        };

        // Stage 4: Queue for manual review if needed
        if (action !== 'allow') {
            await this.queueForReview({
                message,
                senderId: context.senderId,
                score: finalScore,
                action,
                result
            });
        }

        return result;
    }

    /**
     * Stage 1: Heuristic pre-filter (zero-cost regex blocks)
     */
    private async heuristicFilter(message: string): Promise<ModerationResult> {
        const normalizedMessage = message.trim().toLowerCase();

        // Zero-cost regex blocks
        const blocks = [
            /\b(fuck|shit|damn|asshole|retard|cunt)\b/gi,
            /\b(kys|kill yourself|die|suicide)\b/gi,
            /\b(scam|fraud|rug)\b.*\b(you|ur)\b/gi,
            /\b(gay|fag|tranny|nigger)\b/gi,
            /\b(phishing|hack|steal|wallet)\b.*\b(private key|seed|mnemonic)\b/gi
        ];

        for (const pattern of blocks) {
            if (pattern.test(normalizedMessage)) {
                return {
                    isSafe: false,
                    sentiment: 'negative',
                    toxicityScore: 1.0,
                    toxicityLabels: [{ label: 'heuristic_block', score: 1.0 }],
                    flaggedReason: 'Contains prohibited language',
                    action: 'block'
                };
            }
        }

        // Context-aware blocks
        if (normalizedMessage.includes('@') && 
            normalizedMessage.includes('block') && 
            normalizedMessage.includes('wallet')) {
            return {
                isSafe: false,
                sentiment: 'negative',
                toxicityScore: 0.9,
                toxicityLabels: [{ label: 'suspicious_wallet_activity', score: 0.9 }],
                flaggedReason: 'Suspicious wallet/block report',
                action: 'block'
            };
        }

        return {
            isSafe: true,
            sentiment: 'neutral',
            toxicityScore: 0,
            toxicityLabels: [],
            flaggedReason: null,
            action: 'allow'
        };
    }

    /**
     * Stage 2: Sentiment analysis
     */
    private async sentimentAnalysis(text: string): Promise<any> {
        try {
            const result = await hf.textClassification({
                model: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
                inputs: text
            });

            const scores = Array.isArray(result) ? result : [result];
            const firstResult = scores[0];

            if (firstResult && Array.isArray(firstResult)) {
                const scoreValues = firstResult.map((r: any) => typeof r === 'number' ? r : r.score || 0);
                const labels = ['negative', 'neutral', 'positive'];
                const maxScore = Math.max(...scoreValues);
                const sentiment = labels[scoreValues.indexOf(maxScore)];
                return { sentiment, confidence: maxScore, scores: scoreValues };
            } else if (firstResult && firstResult.label) {
                const label = firstResult.label.toLowerCase();
                const sentiment = label.includes('positive') ? 'positive' :
                                 label.includes('negative') ? 'negative' : 'neutral';
                return { sentiment, confidence: firstResult.score || 0.5 };
            }

            return { sentiment: 'neutral', confidence: 0.5 };
        } catch (error) {
            console.error('Sentiment analysis error:', error);
            return { sentiment: 'neutral', confidence: 0.5 };
        }
    }

    /**
     * Stage 2: Toxicity analysis
     */
    private async toxicityAnalysis(text: string): Promise<any> {
        try {
            const result = await hf.textClassification({
                model: 'unitary/toxic-bert',
                inputs: text,
                parameters: { return_all_scores: true }
            });

            const scores = Array.isArray(result) ? result : [result];
            const firstResult = scores[0];

            if (Array.isArray(firstResult)) {
                const toxicityScores = firstResult.map((r: any) =>
                    typeof r === 'number' ? r : (r.score || 0)
                );
                const toxicityScore = Math.max(...toxicityScores);

                return {
                    toxicityScore,
                    labels: firstResult.map((r: any, i: number) => ({
                        label: r.label || `label_${i}`,
                        score: typeof r === 'number' ? r : (r.score || 0)
                    })),
                    scores: toxicityScores
                };
            }

            return {
                toxicityScore: 0,
                labels: [],
                scores: []
            };
        } catch (error) {
            console.error('Toxicity analysis error:', error);
            return {
                toxicityScore: 0,
                labels: [],
                scores: []
            };
        }
    }

    /**
     * Stage 2: Spam detection
     */
    private async spamDetection(message: string, context: TipContext): Promise<any> {
        try {
            // Simple spam heuristics
            const spamIndicators = {
                excessiveCapitalization: (message.match(/[A-Z]{5,}/g) || []).length > 0,
                excessivePunctuation: (message.match(/[!?.]{3,}/g) || []).length > 0,
                urlCount: (message.match(/https?:\/\/\S+/gi) || []).length,
                repetitiveText: /(.)\1{4,}/.test(message),
                shortMessageWithLinks: message.length < 20 && (message.match(/https?:\/\/\S+/gi) || []).length > 0
            };

            const spamScore = Object.values(spamIndicators).filter(Boolean).length / Object.keys(spamIndicators).length;

            // Check sender history if available
            let historyScore = 0;
            if (context.senderHistory) {
                const flaggedRatio = context.senderHistory.flaggedTips / Math.max(context.senderHistory.totalTips, 1);
                historyScore = flaggedRatio > 0.5 ? 0.8 : flaggedRatio * 0.5;
            }

            const finalSpamScore = Math.max(spamScore, historyScore);

            return {
                spamScore: finalSpamScore,
                indicators: spamIndicators,
                isSpam: finalSpamScore > 0.7
            };
        } catch (error) {
            console.error('Spam detection error:', error);
            return {
                spamScore: 0,
                indicators: {},
                isSpam: false
            };
        }
    }

    /**
     * Stage 3: Calculate contextual risk score
     */
    private calculateRiskScore(
        sentiment: any,
        toxicity: any,
        spam: any,
        context: TipContext
    ): number {
        const toxicityWeight = 0.5;
        const sentimentWeight = 0.2;
        const spamWeight = 0.3;

        const toxicityScore = toxicity.toxicityScore || 0;
        const sentimentScore = sentiment.sentiment === 'negative' ? 0.8 : sentiment.sentiment === 'positive' ? 0 : 0.4;
        const spamScore = spam.spamScore || 0;

        let baseScore = (
            toxicityScore * toxicityWeight +
            sentimentScore * sentimentWeight +
            spamScore * spamWeight
        );

        // Adjust based on context
        if (context.senderHistory && context.senderHistory.flaggedTips > 0) {
            const flaggedRatio = context.senderHistory.flaggedTips / Math.max(context.senderHistory.totalTips, 1);
            baseScore = Math.min(1, baseScore + flaggedRatio * 0.2);
        }

        return Math.min(1, baseScore);
    }

    /**
     * Stage 3: Determine action based on risk score
     */
    private determineAction(
        riskScore: number,
        toxicity: any,
        sentiment: any
    ): 'allow' | 'warn' | 'block' | 'quarantine' {
        const toxicityScore = toxicity.toxicityScore || 0;

        if (toxicityScore >= 0.85 || riskScore >= 0.9) {
            return 'block';
        }

        if (toxicityScore >= 0.65 || riskScore >= 0.7) {
            return 'quarantine';
        }

        if (toxicityScore >= 0.4 || riskScore >= 0.5 || sentiment.sentiment === 'negative') {
            return 'warn';
        }

        return 'allow';
    }

    /**
     * Get human-readable reason for moderation action
     */
    private getReason(action: string, toxicity: any, spam: any): string {
        if (action === 'block') {
            if (toxicity.toxicityScore >= 0.85) {
                return 'High toxicity detected';
            }
            if (spam.isSpam) {
                return 'Spam detected';
            }
            return 'Content violates community guidelines';
        }

        if (action === 'quarantine') {
            return 'Content requires manual review';
        }

        if (action === 'warn') {
            return 'Moderate toxicity or suspicious content detected';
        }

        return '';
    }

    /**
     * Stage 4: Queue for manual review
     */
    private async queueForReview(data: {
        message: string;
        senderId: string;
        score: number;
        action: string;
        result: ModerationPipelineResult;
    }): Promise<void> {
        try {
            // Store in database for manual review
            // TODO: Create a ModerationReview table in Prisma schema
            // For now, log it
            console.log('⚠️ Content queued for manual review:', {
                senderId: data.senderId,
                score: data.score,
                action: data.action,
                message: data.message.substring(0, 100)
            });

            // TODO: Send Discord alert or notification
            // await sendDiscordAlert({
            //     type: 'moderation_review',
            //     data: data
            // });
        } catch (error) {
            console.error('Error queueing for review:', error);
        }
    }
}
