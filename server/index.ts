import express, { Request, Response } from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { TipService } from './services/TipService';
import { TipAnalyticsService } from './services/TipAnalyticsService';
import { HuggingFaceService } from './services/HuggingFaceService';
import { AIService } from './services/AIService';
import { ContentService } from './services/ContentService';
import { AITipSuggestionService } from './services/AITipSuggestionService';
import { BadgeService } from './services/BadgeService';
import { LeaderboardInsightsService } from './services/LeaderboardInsightsService';
import { ModerationService } from './services/ModerationService';
import { config } from './config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tipService = new TipService();
const contentService = new ContentService();
const analyticsService = new TipAnalyticsService();
const hfService = new HuggingFaceService();
const badgeService = new BadgeService();
const leaderboardInsightsService = new LeaderboardInsightsService();
const aiTipSuggestionService = new AITipSuggestionService();
const aiService = new AIService();
const moderationService = new ModerationService();

async function startServer() {
    const app = express();
    const server = createServer(app);

    app.use(express.json());

    // --- API Endpoints (Backend, AI, Web3 Logic) ---

    // Health Check Endpoint
    app.get('/health', (_req: Request, res: Response) => {
        res.status(200).json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            services: {
                backend: 'running',
                ai: 'HuggingFaceService',
                web3: 'BlockchainService',
                moderation: 'ModerationService',
            }
        });
    });

    // Moderation API endpoint for real-time message checking
    app.post('/api/v1/moderation/check', async (req: Request, res: Response) => {
        const { message, senderId, recipientId, context } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        try {
            const result = await moderationService.moderateTipMessage(
                message,
                senderId,
                recipientId,
                context
            );
            
            res.status(200).json({
                success: true,
                result
            });
        } catch (error) {
            console.error('Error checking moderation:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to check message moderation',
                result: {
                    isSafe: true,
                    sentiment: 'neutral',
                    toxicityScore: 0,
                    toxicityLabels: [],
                    flaggedReason: null,
                    action: 'allow'
                }
            });
        }
    });

    // API Endpoint to simulate a tip from the Verychat Bot
    app.post('/api/v1/tip', async (req: Request, res: Response) => {
        const { senderId, recipientId, amount, token, message, contentId } = req.body;

        if (!senderId || !recipientId || !amount || !token) {
            return res.status(400).json({ success: false, message: 'Missing required fields: senderId, recipientId, amount, token' });
        }

        try {
            const result = await tipService.processTip(senderId, recipientId, amount, token, message, contentId);
            
            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: `Tip sent successfully! Tx Hash: ${result.txHash}`,
                    data: result
                });
            } else {
                const statusCode = result.errorCode === 'CONTENT_FLAGGED' ? 403 : 400;
                res.status(statusCode).json({
                    success: false,
                    message: result.message || 'Tip failed due to an unknown error.',
                    errorCode: result.errorCode
                });
            }
        } catch (error) {
            console.error('Error processing tip:', error);
            res.status(500).json({ success: false, message: 'Internal server error during tip processing.' });
        }
    });

    // Get tip status
    app.get('/api/v1/tip/:tipId', async (req: Request, res: Response) => {
        const { tipId } = req.params;
        
        try {
            const result = await tipService.getTipStatus(tipId);
            if (result) {
                res.status(200).json({ success: true, data: result });
            } else {
                res.status(404).json({ success: false, message: 'Tip not found' });
            }
        } catch (error) {
            console.error('Error fetching tip status:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    });

    // AI-powered tip recommendation based on content (enhanced with OpenAI)
    app.post('/api/v1/tip/recommendation', async (req: Request, res: Response) => {
        const { content, authorId, contentType, recipientId, senderId } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, message: 'Content is required' });
        }

        try {
            const recommendation = await tipService.getTipRecommendation(content, { 
                authorId, 
                contentType,
                recipientId,
                senderId
            });
            res.status(200).json({ success: true, data: recommendation });
        } catch (error) {
            console.error('Error generating tip recommendation:', error);
            res.status(500).json({ success: false, message: 'Failed to generate recommendation' });
        }
    });

    // Intelligent tip suggestion with chat context (GPT-powered)
    app.post('/api/v1/tip/intelligent-suggestion', async (req: Request, res: Response) => {
        const { chatContext, recipientId, senderId, recipientName } = req.body;

        if (!chatContext) {
            return res.status(400).json({ success: false, message: 'Chat context is required' });
        }

        try {
            const suggestion = await tipService.getIntelligentTipSuggestion(chatContext, {
                recipientId,
                senderId,
                recipientName
            });
            res.status(200).json({ success: true, data: suggestion });
        } catch (error) {
            console.error('Error generating intelligent tip suggestion:', error);
            res.status(500).json({ success: false, message: 'Failed to generate suggestion' });
        }
    });

    // Generate AI message suggestions
    app.post('/api/v1/tip/message-suggestions', async (req: Request, res: Response) => {
        const { recipientName, contentPreview, tipAmount, relationship } = req.body;

        try {
            const suggestions = await hfService.generateMessageSuggestions({
                recipientName,
                contentPreview,
                tipAmount,
                relationship
            });
            res.status(200).json({ success: true, data: suggestions });
        } catch (error) {
            console.error('Error generating message suggestions:', error);
            res.status(500).json({ success: false, message: 'Failed to generate suggestions' });
        }
    });

    // Voice command parsing endpoint
    app.post('/api/voice/parse', async (req: Request, res: Response) => {
        const { transcript } = req.body;

        if (!transcript || typeof transcript !== 'string') {
            return res.status(400).json({ success: false, message: 'Transcript is required' });
        }

        try {
            // Helper function for fallback parsing
            const parseVoiceCommandFallback = (text: string): any => {
                const normalized = text.toLowerCase()
                    .replace(/ dollars?/g, ' VERY')
                    .replace(/verys?/g, 'VERY')
                    .replace(/send /g, 'tip ')
                    .replace(/give /g, 'tip ')
                    .trim();

                const tipMatch = normalized.match(/tip|send|give/i);
                if (!tipMatch) return null;

                const usernameMatch = normalized.match(/@?(\w+)/i);
                if (!usernameMatch) return null;
                const recipient = usernameMatch[0].startsWith('@') ? usernameMatch[0] : `@${usernameMatch[0]}`;

                const numberWords: Record<string, number> = {
                    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
                    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
                    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
                };

                let amount = 0;
                const numericMatch = normalized.match(/(\d+\.?\d*)/);
                if (numericMatch) {
                    amount = parseFloat(numericMatch[1]);
                } else {
                    for (const [word, value] of Object.entries(numberWords)) {
                        if (normalized.includes(word)) {
                            amount = value;
                            break;
                        }
                    }
                }

                if (amount === 0 || amount < 0.1) return null;

                return {
                    action: 'tip',
                    recipient,
                    amount: Math.min(amount, 100),
                    currency: 'VERY'
                };
            };

            // Use OpenAI if available for better parsing, otherwise use simple regex
            let command: any = null;
            
            // Try OpenAI parsing if available
            if (config.OPENAI_API_KEY && config.OPENAI_API_KEY !== '') {
                try {
                    const OpenAI = (await import('openai')).default;
                    const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

                    const prompt = `Parse this voice command into JSON:
"${transcript}"

Expected format: {action:"tip", recipient:"@username", amount:number, currency:"VERY", message?:"optional message"}
Examples:
"tip @alice 5 very" → {action:"tip", recipient:"@alice", amount:5, currency:"VERY"}
"send bob ten dollars" → {action:"tip", recipient:"@bob", amount:10, currency:"VERY"}
"give @charlie 3.5" → {action:"tip", recipient:"@charlie", amount:3.5, currency:"VERY"}

Return ONLY valid JSON matching the schema.`;

                    const completion = await openai.chat.completions.create({
                        model: config.OPENAI_MODEL || 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'system',
                                content: 'Parse natural voice commands into structured JSON. Return ONLY valid JSON: {action:"tip", recipient:"@username", amount:number, currency:"VERY", message?:"optional"}'
                            },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.1,
                        max_tokens: 150,
                        response_format: { type: 'json_object' }
                    });

                    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
                    if (parsed.action && parsed.recipient && parsed.amount) {
                        command = parsed;
                    }
                } catch (openaiError) {
                    console.warn('OpenAI parsing failed, using fallback:', openaiError);
                }
            }

            // Fallback to regex-based parsing
            if (!command) {
                command = parseVoiceCommandFallback(transcript);
            }

            if (command) {
                return res.status(200).json({ 
                    success: true, 
                    command,
                    confidence: command.confidence || 0.85
                });
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Could not parse voice command',
                    command: null
                });
            }

        } catch (error) {
            console.error('Error parsing voice command:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Internal server error', 
                command: null 
            });
        }
    });

    // AI-powered intelligent tip suggestion (OpenAI GPT-4o)
    app.post('/api/v1/ai/tip-suggestion', async (req: Request, res: Response) => {
        const { context, userPreferences } = req.body;

        if (!context || !context.message || !context.sender) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: context.message, context.sender' 
            });
        }

        try {
            const suggestion = await aiTipSuggestionService.generateTipSuggestion(
                context,
                userPreferences || {}
            );
            res.status(200).json({ success: true, data: suggestion });
        } catch (error) {
            console.error('Error generating AI tip suggestion:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to generate AI tip suggestion' 
            });
        }
    });

    // Dataset-based tip amount suggestion using content similarity
    app.post('/api/v1/tip/dataset-suggestion', async (req: Request, res: Response) => {
        const { content, historicalTips } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, message: 'Content is required' });
        }

        try {
            const suggestion = await hfService.suggestTipAmountFromDataset(content, historicalTips);
            res.status(200).json({ success: true, data: suggestion });
        } catch (error) {
            console.error('Error generating dataset-based suggestion:', error);
            res.status(500).json({ success: false, message: 'Failed to generate dataset-based suggestion' });
        }
    });

    // Analyze content sentiment and quality
    app.post('/api/v1/ai/analyze-content', async (req: Request, res: Response) => {
        const { content, authorId, contentType } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, message: 'Content is required' });
        }

        try {
            const [sentiment, contentScore] = await Promise.all([
                hfService.analyzeSentiment(content),
                hfService.scoreContent(content, { authorId, contentType })
            ]);

            res.status(200).json({
                success: true,
                data: {
                    sentiment,
                    contentScore
                }
            });
        } catch (error) {
            console.error('Error analyzing content:', error);
            res.status(500).json({ success: false, message: 'Failed to analyze content' });
        }
    });

    // Platform analytics
    app.get('/api/v1/analytics/platform', async (req: Request, res: Response) => {
        try {
            const stats = await analyticsService.getPlatformStats();
            res.status(200).json({ success: true, data: stats });
        } catch (error) {
            console.error('Error fetching platform stats:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
        }
    });

    // User analytics
    app.get('/api/v1/analytics/user/:userId', async (req: Request, res: Response) => {
        const { userId } = req.params;

        try {
            const analytics = await analyticsService.getUserAnalytics(userId);
            res.status(200).json({ success: true, data: analytics });
        } catch (error) {
            console.error('Error fetching user analytics:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch user analytics' });
        }
    });

    // Personalized leaderboard insights (GPT-powered)
    app.get('/api/v1/ai/insights/user/:userId', async (req: Request, res: Response) => {
        const { userId } = req.params;

        try {
            // Get user analytics first
            const analytics = await analyticsService.getUserAnalytics(userId);
            
            // Generate personalized insights using AI
            const insights = await aiService.generateLeaderboardInsight(userId, {
                topRecipients: analytics.favoriteRecipients?.map((r: any) => ({
                    id: r.userId || r.id,
                    name: r.username || r.name,
                    tipCount: r.count || 0,
                    totalAmount: parseFloat(r.totalAmount || '0')
                })) || [],
                topSenders: analytics.favoriteSenders?.map((s: any) => ({
                    id: s.userId || s.id,
                    name: s.username || s.name,
                    tipCount: s.count || 0,
                    totalAmount: parseFloat(s.totalAmount || '0')
                })) || [],
                totalTips: analytics.tipsSent || 0,
                totalReceived: parseFloat(analytics.totalReceived || '0'),
                streak: analytics.tipStreak || 0
            });

            res.status(200).json({ success: true, data: insights });
        } catch (error) {
            console.error('Error generating personalized insights:', error);
            res.status(500).json({ success: false, message: 'Failed to generate insights' });
        }
    });

    // AI badge suggestions
    app.get('/api/v1/ai/badges/user/:userId', async (req: Request, res: Response) => {
        const { userId } = req.params;

        try {
            const analytics = await analyticsService.getUserAnalytics(userId);
            
            // Calculate unique recipients count from favoriteRecipients
            const uniqueRecipients = analytics.favoriteRecipients?.length || 0;
            
            const badgeSuggestions = await aiService.suggestBadges(userId, {
                tipCount: analytics.tipsSent || 0,
                totalAmount: parseFloat(analytics.totalSent || '0'),
                uniqueRecipients: uniqueRecipients,
                streak: analytics.tipStreak || 0,
                contentCreated: 0 // Not available in current analytics, can be added later
            });

            res.status(200).json({ success: true, data: badgeSuggestions });
        } catch (error) {
            console.error('Error generating badge suggestions:', error);
            res.status(500).json({ success: false, message: 'Failed to generate badge suggestions' });
        }
    });

    // Tip trends
    app.get('/api/v1/analytics/trends', async (req: Request, res: Response) => {
        const period = (req.query.period as 'day' | 'week' | 'month') || 'day';
        const limit = parseInt(req.query.limit as string) || 30;

        try {
            const trends = await analyticsService.getTipTrends(period, limit);
            res.status(200).json({ success: true, data: trends });
        } catch (error) {
            console.error('Error fetching trends:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch trends' });
        }
    });

    // Real-time tip feed
    app.get('/api/v1/feed', async (req: Request, res: Response) => {
        const limit = parseInt(req.query.limit as string) || 20;

        try {
            const feed = await analyticsService.getTipFeed(limit);
            res.status(200).json({ success: true, data: feed });
        } catch (error) {
            console.error('Error fetching tip feed:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch feed' });
        }
    });

    // --- Leaderboard Insights API Endpoints ---

    // Get leaderboard data for a user
    app.get('/api/v1/leaderboard/:userId', async (req: Request, res: Response) => {
        const { userId } = req.params;
        const period = (req.query.period as string) || 'weekly';

        try {
            const data = await leaderboardInsightsService.fetchLeaderboardData(userId, period);
            res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching leaderboard data:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch leaderboard data' });
        }
    });

    // Generate personalized insights
    app.post('/api/v1/leaderboard/insights', async (req: Request, res: Response) => {
        const { userData, communityStats } = req.body;

        if (!userData) {
            return res.status(400).json({ success: false, message: 'userData is required' });
        }

        try {
            const stats = communityStats || { totalUsers: 1000, avgTips: 10 };
            const insights = await leaderboardInsightsService.generatePersonalizedInsights(userData, stats);
            res.status(200).json({ success: true, insights });
        } catch (error) {
            console.error('Error generating insights:', error);
            res.status(500).json({ success: false, message: 'Failed to generate insights' });
        }
    });

    // --- Content Monetization API Endpoints ---

    // Create new AI-generated content
    app.post('/api/v1/content', async (req: Request, res: Response) => {
        const { creatorId, title, description, contentText, contentType, isAI, aiModel, monetizationType, price, token, isPremium } = req.body;

        if (!creatorId || !title) {
            return res.status(400).json({ success: false, message: 'Missing required fields: creatorId, title' });
        }

        try {
            const result = await contentService.createContent({
                creatorId,
                title,
                description,
                contentText,
                contentType,
                isAI,
                aiModel,
                monetizationType,
                price,
                token,
                isPremium
            });

            if (result.success) {
                res.status(201).json({
                    success: true,
                    contentId: result.contentId,
                    message: 'Content created successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message || 'Failed to create content'
                });
            }
        } catch (error) {
            console.error('Error creating content:', error);
            res.status(500).json({ success: false, message: 'Internal server error during content creation.' });
        }
    });

    // Publish content
    app.post('/api/v1/content/:contentId/publish', async (req: Request, res: Response) => {
        const { contentId } = req.params;

        try {
            const result = await contentService.publishContent(contentId);
            
            if (result.success) {
                res.status(200).json({ success: true, message: 'Content published successfully' });
            } else {
                res.status(400).json({ success: false, message: result.message || 'Failed to publish content' });
            }
        } catch (error) {
            console.error('Error publishing content:', error);
            res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    });

    // Tip content creator
    app.post('/api/v1/content/:contentId/tip', async (req: Request, res: Response) => {
        const { contentId } = req.params;
        const { senderId, amount, token, message } = req.body;

        if (!senderId || !amount || !token) {
            return res.status(400).json({ success: false, message: 'Missing required fields: senderId, amount, token' });
        }

        try {
            const result = await contentService.tipContent(senderId, contentId, amount, token, message);
            
            if (result.success) {
                res.status(200).json({ success: true, tipId: result.tipId, message: 'Tip sent successfully' });
            } else {
                res.status(400).json({ success: false, message: result.message || 'Failed to process tip' });
            }
        } catch (error) {
            console.error('Error tipping content:', error);
            res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    });

    // Get content analytics
    app.get('/api/v1/content/:contentId/analytics', async (req: Request, res: Response) => {
        const { contentId } = req.params;

        try {
            const analytics = await contentService.getContentAnalytics(contentId);
            
            if (analytics) {
                res.status(200).json({ success: true, data: analytics });
            } else {
                res.status(404).json({ success: false, message: 'Content not found' });
            }
        } catch (error) {
            console.error('Error getting content analytics:', error);
            res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    });

    // Get recommended content
    app.get('/api/v1/content/recommended', async (req: Request, res: Response) => {
        const limit = parseInt(req.query.limit as string) || 10;

        try {
            const content = await contentService.getRecommendedContent(limit);
            res.status(200).json({ success: true, data: content, count: content.length });
        } catch (error) {
            console.error('Error getting recommended content:', error);
            res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    });

    // Create subscription
    app.post('/api/v1/subscriptions', async (req: Request, res: Response) => {
        const { subscriberId, creatorId, amount, token } = req.body;

        if (!subscriberId || !creatorId || !amount || !token) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        try {
            const result = await contentService.createSubscription(subscriberId, creatorId, amount, token);
            
            if (result.success) {
                res.status(201).json({ success: true, subscriptionId: result.subscriptionId, message: 'Subscription created' });
            } else {
                res.status(400).json({ success: false, message: result.message || 'Failed to create subscription' });
            }
        } catch (error) {
            console.error('Error creating subscription:', error);
            res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    });

    // Check content access
    app.get('/api/v1/content/:contentId/access/:userId', async (req: Request, res: Response) => {
        const { contentId, userId } = req.params;

        try {
            const hasAccess = await contentService.hasAccessToContent(userId, contentId);
            res.status(200).json({ success: true, hasAccess });
        } catch (error) {
            console.error('Error checking content access:', error);
            res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    });

    // Record content view
    app.post('/api/v1/content/:contentId/view', async (req: Request, res: Response) => {
        const { contentId } = req.params;
        const { userId } = req.body;

        try {
            await contentService.recordView(contentId, userId);
            res.status(200).json({ success: true, message: 'View recorded' });
        } catch (error) {
            console.error('Error recording view:', error);
            res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    });

    // --- Badge & Achievement API Endpoints ---

    // Check and award badges for a user
    app.post('/api/v1/badges/check', async (req: Request, res: Response) => {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'Missing required field: userId' });
        }

        try {
            const newBadges = await badgeService.checkAndAwardBadges(userId);
            res.status(200).json({
                success: true,
                data: {
                    newBadges,
                    count: newBadges.length
                }
            });
        } catch (error) {
            console.error('Error checking badges:', error);
            res.status(500).json({ success: false, message: 'Failed to check badges' });
        }
    });

    // Get all badges for a user
    app.get('/api/v1/badges/user/:userId', async (req: Request, res: Response) => {
        const { userId } = req.params;

        try {
            const badges = await badgeService.getUserBadges(userId);
            const stats = await badgeService.getUserBadgeStats(userId);
            res.status(200).json({
                success: true,
                data: {
                    badges,
                    stats
                }
            });
        } catch (error) {
            console.error('Error fetching user badges:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch badges' });
        }
    });

    // Get all available badge definitions
    app.get('/api/v1/badges', async (req: Request, res: Response) => {
        try {
            const badges = await badgeService.getAllBadges();
            res.status(200).json({
                success: true,
                data: badges,
                count: badges.length
            });
        } catch (error) {
            console.error('Error fetching badges:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch badges' });
        }
    });

    // Get a specific badge by badgeId
    app.get('/api/v1/badges/:badgeId', async (req: Request, res: Response) => {
        const { badgeId } = req.params;

        try {
            const badge = await badgeService.getBadge(badgeId);
            if (badge) {
                res.status(200).json({ success: true, data: badge });
            } else {
                res.status(404).json({ success: false, message: 'Badge not found' });
            }
        } catch (error) {
            console.error('Error fetching badge:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch badge' });
        }
    });

    // Get user badge statistics
    app.get('/api/v1/badges/user/:userId/stats', async (req: Request, res: Response) => {
        const { userId } = req.params;

        try {
            const stats = await badgeService.getUserBadgeStats(userId);
            res.status(200).json({ success: true, data: stats });
        } catch (error) {
            console.error('Error fetching badge stats:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch badge stats' });
        }
    });

    // --- Static File Serving (Frontend) ---

    // Serve static files from dist/public in production
    const staticPath =
        process.env.NODE_ENV === 'production'
            ? path.resolve(__dirname, 'public')
            : path.resolve(__dirname, '..', 'dist', 'public');

    app.use(express.static(staticPath));

    // Handle client-side routing - serve index.html for all routes not starting with /api
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
            // Let the API routes handle this
            return;
        }
        res.sendFile(path.join(staticPath, 'index.html'));
    });

    const port = config.PORT;

    server.listen(port, () => {
        console.log(`Server running on http://localhost:${port}/`);
        console.log(`Environment: ${config.NODE_ENV}`);
    });
}

startServer().catch(console.error);
