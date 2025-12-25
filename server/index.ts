import express, { Request, Response } from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { TipService } from './services/TipService';
import { TipAnalyticsService } from './services/TipAnalyticsService';
import { HuggingFaceService } from './services/HuggingFaceService';
import { config } from './config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tipService = new TipService();
const analyticsService = new TipAnalyticsService();
const hfService = new HuggingFaceService();

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
            }
        });
    });

    // API Endpoint to simulate a tip from the Verychat Bot
    app.post('/api/v1/tip', async (req: Request, res: Response) => {
        const { senderId, recipientId, amount, token, message } = req.body;

        if (!senderId || !recipientId || !amount || !token) {
            return res.status(400).json({ success: false, message: 'Missing required fields: senderId, recipientId, amount, token' });
        }

        try {
            const result = await tipService.processTip(senderId, recipientId, amount, token, message);
            
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

    // AI-powered tip recommendation based on content
    app.post('/api/v1/tip/recommendation', async (req: Request, res: Response) => {
        const { content, authorId, contentType } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, message: 'Content is required' });
        }

        try {
            const recommendation = await tipService.getTipRecommendation(content, { authorId, contentType });
            res.status(200).json({ success: true, data: recommendation });
        } catch (error) {
            console.error('Error generating tip recommendation:', error);
            res.status(500).json({ success: false, message: 'Failed to generate recommendation' });
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
