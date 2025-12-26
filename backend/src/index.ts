import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebhookController } from './controllers/Webhook.controller';
import { BadgeService } from './services/Badge.service';
import { LeaderboardService } from './services/Leaderboard.service';
import { config } from './config/config';
import { initializeDatabase } from './config/database';

class VeryTippersBackend {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.SERVER.PORT;
    this.initializeMiddleware();
    this.initializeDatabase();
    this.initializeServices();
    this.initializeRoutes();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.SECURITY.RATE_LIMIT_WINDOW,
      max: config.SECURITY.RATE_LIMIT_MAX_REQUESTS,
      message: 'Too many requests from this IP'
    });
    this.app.use('/api/', limiter);
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await initializeDatabase();
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      process.exit(1);
    }
  }

  private async initializeServices(): Promise<void> {
    // Initialize default badges
    const badgeService = new BadgeService();
    await badgeService.initializeDefaultBadges();

    // Start leaderboard cron jobs
    const leaderboardService = new LeaderboardService();
    await leaderboardService.startCronJobs();
  }

  private initializeRoutes(): void {
    const webhookController = new WebhookController();
    
    this.app.use('/api', webhookController.router);
    
    // Admin API (protected)
    // this.app.use('/api/admin', require('./routes/admin.routes'));
    
    // Public API for stats
    // this.app.use('/api/public', require('./routes/public.routes'));
    
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'VeryTippers Backend',
        version: '1.0.0',
        description: 'Social tipping bot for Very Network',
        endpoints: {
          webhook: '/api/webhook/verychat',
          health: '/api/health',
          admin: '/api/admin',
          public: '/api/public'
        }
      });
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`
      🚀 VeryTippers Backend Server Started!
      📍 Port: ${this.port}
      🔗 Environment: ${config.SERVER.NODE_ENV}
      🌐 VERY Chain: ${config.VERY_CHAIN.RPC_URL}
      👥 VeryChat Project ID: ${config.VERYCHAT_API.PROJECT_ID}
      🕒 Started at: ${new Date().toISOString()}
      `);
    });
  }
}

// Start the application
const server = new VeryTippersBackend();
server.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

