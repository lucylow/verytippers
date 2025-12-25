import express, { Request, Response } from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { TipService } from './services/TipService';
import { config } from './config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tipService = new TipService();

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
                res.status(400).json({
                    success: false,
                    message: result.message || 'Tip failed due to an unknown error.',
                });
            }
        } catch (error) {
            console.error('Error processing tip:', error);
            res.status(500).json({ success: false, message: 'Internal server error during tip processing.' });
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
