/**
 * VeryTippers Backend - Production-Ready API Server
 * Fastify + PostgreSQL + Redis + BullMQ + WebSockets + GraphQL
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import mercurius from 'mercurius';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { config } from './config/config';
import { logger } from './utils/logger';
import { ErrorHandler, NotFoundError } from './utils/errors';

// Services
import { EncryptionService } from './services/encryption.service';
import { IPFSService } from './services/ipfs.service';
import { ModerationService } from './services/moderation.service';
import { BlockchainService } from './services/blockchain.service';
import { LeaderboardService } from './services/leaderboard.service';
import { AIInsightsService } from './services/ai-insights.service';
import { VerychatApiService } from './services/verychat/VerychatApi.service';

// Workers
import { TipProcessorWorker } from './workers/tip-processor.worker';

// GraphQL
import { schema } from './graphql/schema';
import { createResolvers } from './graphql/resolvers';

// WebSocket
import { WebSocketManager, setupWebSocketRoutes } from './websocket/handlers';

// Validation
import { sendTipSchema, leaderboardSchema, userStatsSchema } from './validation/schemas';

// Types
import type { TipRequest, TipResponse, ModerationResult, TipJobData } from './types';

/**
 * VeryTippers Backend Application
 */
class VeryTippersBackend {
  private fastify: FastifyInstance;
  private pgPool: Pool;
  private redis: Redis;
  private encryptionService: EncryptionService;
  private ipfsService: IPFSService;
  private moderationService: ModerationService;
  private blockchainService: BlockchainService;
  private tipProcessor: TipProcessorWorker;
  private wsManager: WebSocketManager;
  private verychatApi: VerychatApiService;
  private startTime: number;

  constructor() {
    this.fastify = Fastify({
      logger: config.SERVER.NODE_ENV === 'development',
      requestIdLogLabel: 'reqId',
      disableRequestLogging: false
    });
    this.startTime = Date.now();

    // Initialize services
    this.pgPool = new Pool({
      connectionString: config.DATABASE.URL,
      max: config.DATABASE.POOL_SIZE,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    this.redis = new Redis(config.REDIS.URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    this.encryptionService = new EncryptionService();
    this.ipfsService = new IPFSService();
    this.moderationService = new ModerationService();
    this.blockchainService = new BlockchainService();
    this.tipProcessor = new TipProcessorWorker(this.redis, this.pgPool);
    this.wsManager = new WebSocketManager(this.fastify);
    this.verychatApi = new VerychatApiService(this.redis);
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      // Register plugins
      await this.fastify.register(fastifyWebsocket);

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup GraphQL
      await this.setupGraphQL();

      // Setup WebSocket
      setupWebSocketRoutes(this.fastify, this.wsManager);

      // Setup error handlers
      this.setupErrorHandlers();

      // Health checks
      await this.setupHealthChecks();

      logger.info('VeryTippers Backend initialized successfully');
    } catch (error) {
      logger.error('Initialization failed', { error });
      throw error;
    }
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // CORS
    this.fastify.register(require('@fastify/cors'), {
      origin: true,
      credentials: true
    });

    // Rate limiting
    this.fastify.register(require('@fastify/rate-limit'), {
      max: 100,
      timeWindow: '1 minute'
    });

    // Request logging
    this.fastify.addHook('onRequest', async (request) => {
      request.log.info({ url: request.url, method: request.method }, 'incoming request');
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Root endpoint
    this.fastify.get('/', async () => {
      return {
        name: 'VeryTippers Backend',
        version: '1.0.0',
        description: 'AI-Powered Social Micro-Tipping Platform',
        endpoints: {
          health: '/api/health',
          sendTip: 'POST /api/tips/send',
          leaderboard: 'GET /api/leaderboard/:period?',
          userStats: 'GET /api/users/:userId/stats',
          verychatStatus: 'GET /api/verychat/status',
          graphql: '/graphql',
          websocket: '/ws'
        },
        resources: {
          developersPortal: 'https://developers.verylabs.io/',
          veryChainDocs: 'https://wp.verylabs.io/verychain'
        }
      };
    });

    // Send tip endpoint
    this.fastify.post<{ Body: TipRequest }>(
      '/api/tips/send',
      { schema: sendTipSchema },
      async (request, reply) => {
        try {
          const { senderId, recipientId, amount, message } = request.body;

          // 1. Real-time moderation
          const moderationResult: ModerationResult = await this.moderationService.moderateTipMessage(
            message,
            senderId,
            recipientId
          );

          if (moderationResult.action === 'block') {
            return reply.status(400).send({
              success: false,
              error: 'Message blocked by moderation',
              details: moderationResult
            });
          }

          // 2. Encrypt message payload
          const encryptedPayload = await this.encryptionService.encryptMessage(message);

          // 3. Pin to IPFS
          const ipfsCid = await this.ipfsService.pinEncryptedPayload(encryptedPayload);

          // 4. Queue for blockchain processing + indexing
          const amountBigInt = typeof amount === 'string'
            ? BigInt(Math.floor(parseFloat(amount) * 1e18))
            : BigInt(Math.floor(amount * 1e18));

          const jobData: TipJobData = {
            senderId,
            recipientId,
            amount: amountBigInt,
            ipfsCid,
            moderation: moderationResult,
            encryptedPayload,
            timestamp: Date.now(),
            message
          };

          const jobId = await this.tipProcessor.addTipToQueue(jobData);

          // 5. Emit real-time update
          this.wsManager.broadcast({
            type: 'tip-queued',
            data: {
              senderId,
              recipientId,
              amount: typeof amount === 'string' ? parseFloat(amount) : amount,
              message: '💸',
              jobId
            }
          });

          const response: TipResponse = {
            success: true,
            ipfsCid,
            status: 'queued'
          };

          return reply.status(200).send(response);
        } catch (error: any) {
          logger.error('Send tip failed', { error, body: request.body });
          return reply.status(500).send({
            success: false,
            error: error.message || 'Failed to process tip',
            status: 'failed'
          });
        }
      }
    );

    // Leaderboard endpoint
    this.fastify.get<{ Params: { period?: string }; Querystring: { limit?: number } }>(
      '/api/leaderboard/:period?',
      { schema: leaderboardSchema },
      async (request) => {
        try {
          const period = (request.params.period || 'all') as 'all' | 'weekly';
          const limit = request.query.limit || 100;

          const leaderboardService = new LeaderboardService(this.redis, this.pgPool);
          const users = await leaderboardService.getLeaderboard(period, limit);
          const total = await leaderboardService.getTotalCount(period);

          return {
            users,
            total,
            period
          };
        } catch (error: any) {
          logger.error('Get leaderboard failed', { error });
          throw error;
        }
      }
    );

    // User stats endpoint
    this.fastify.get<{ Params: { userId: string } }>(
      '/api/users/:userId/stats',
      { schema: userStatsSchema },
      async (request) => {
        try {
          const { userId } = request.params;
          const leaderboardService = new LeaderboardService(this.redis, this.pgPool);
          const stats = await leaderboardService.getUserStats(userId);

          if (!stats) {
            return { error: 'User not found' };
          }

          return {
            ...stats,
            amountSent: Number(stats.amountSent) / 1e18,
            amountReceived: Number(stats.amountReceived) / 1e18,
            weeklyAmount: Number(stats.weeklyAmount) / 1e18
          };
        } catch (error: any) {
          logger.error('Get user stats failed', { error });
          throw error;
        }
      }
    );

    // Queue stats endpoint (admin)
    this.fastify.get('/api/admin/queue-stats', async () => {
      try {
        return await this.tipProcessor.getQueueStats();
      } catch (error: any) {
        logger.error('Get queue stats failed', { error });
        throw error;
      }
    });

    // VeryChat API status endpoint
    this.fastify.get('/api/verychat/status', async () => {
      try {
        const status = await this.verychatApi.checkApiStatus();
        return {
          ...status,
          lastCheck: status.lastCheck?.toISOString(),
          developersPortal: 'https://developers.verylabs.io/',
          configuration: this.verychatApi.validateConfiguration()
        };
      } catch (error: any) {
        logger.error('Get VeryChat API status failed', { error });
        return {
          isConfigured: false,
          isHealthy: false,
          error: error.message || 'Failed to check API status',
          developersPortal: 'https://developers.verylabs.io/'
        };
      }
    });
  }

  /**
   * Setup GraphQL
   */
  private async setupGraphQL(): Promise<void> {
    const resolvers = createResolvers(
      this.pgPool,
      this.redis,
      this.ipfsService,
      this.encryptionService,
      this.blockchainService
    );

    await this.fastify.register(mercurius, {
      schema,
      resolvers,
      graphiql: config.SERVER.NODE_ENV === 'development',
      context: (request: FastifyRequest) => {
        return {
          userId: (request.headers['x-user-id'] as string) || undefined,
          ip: request.ip
        };
      }
    });
  }

  /**
   * Setup health checks
   */
  private async setupHealthChecks(): Promise<void> {
    this.fastify.get('/api/health', async () => {
      const uptime = (Date.now() - this.startTime) / 1000;

      // Check service health
      const [dbHealth, redisHealth, ipfsHealth, blockchainHealth] = await Promise.allSettled([
        this.pgPool.query('SELECT 1').then(() => 'up').catch(() => 'down'),
        this.redis.ping().then(() => 'up').catch(() => 'down'),
        this.ipfsService.healthCheck().then(ok => ok ? 'up' : 'down'),
        this.blockchainService.healthCheck().then(ok => ok ? 'up' : 'down')
      ]);

      const services = {
        database: dbHealth.status === 'fulfilled' ? dbHealth.value : 'down',
        redis: redisHealth.status === 'fulfilled' ? redisHealth.value : 'down',
        ipfs: ipfsHealth.status === 'fulfilled' ? ipfsHealth.value : 'down',
        blockchain: blockchainHealth.status === 'fulfilled' ? blockchainHealth.value : 'down'
      };

      const allUp = Object.values(services).every(status => status === 'up');
      const anyDown = Object.values(services).some(status => status === 'down');

      return {
        status: allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services,
        uptime,
        version: '1.0.0'
      };
    });
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers(): void {
    this.fastify.setErrorHandler((error, request, reply) => {
      // Normalize error to AppError
      const appError = ErrorHandler.normalizeError(error, {
        path: request.url,
        method: request.method,
        userId: (request as any).user?.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      // Log the error
      ErrorHandler.logError(appError, {
        path: request.url,
        method: request.method,
      });

      // Format error response
      const errorResponse = ErrorHandler.formatErrorResponse(
        appError,
        process.env.NODE_ENV === 'development'
      );

      reply.status(appError.statusCode).send(errorResponse);
    });

    this.fastify.setNotFoundHandler((request, reply) => {
      const error = new NotFoundError('Route', {
        path: request.url,
        method: request.method,
      });

      logger.warn('Route not found', {
        path: request.url,
        method: request.method,
      });

      const errorResponse = ErrorHandler.formatErrorResponse(error);
      reply.status(404).send(errorResponse);
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      await this.initialize();

      const port = config.SERVER.PORT;
      const host = '0.0.0.0';

      await this.fastify.listen({ port, host });

      logger.info('🚀 VeryTippers Backend started', {
        port,
        host,
        environment: config.SERVER.NODE_ENV,
        veryChain: config.VERY_CHAIN.RPC_URL
      });
    } catch (error) {
      logger.error('Failed to start server', { error });
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down VeryTippers Backend...');

    try {
      // Close tip processor
      await this.tipProcessor.shutdown();

      // Close Fastify
      await this.fastify.close();

      // Close database connections
      await this.pgPool.end();

      // Close Redis
      await this.redis.quit();

      logger.info('Shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', { error });
      throw error;
    }
  }
}

// Start the application
const app = new VeryTippersBackend();

// Handle graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  try {
    await app.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

// Start the server
app.start().catch((error) => {
  logger.error('Failed to start application', { error });
  process.exit(1);
});
