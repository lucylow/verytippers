import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';
import type { WebSocketMessage } from '../types';

// WebSocket type for Fastify
type FastifyWebSocket = {
  send: (data: string) => void;
  on: (event: string, handler: (data?: any) => void) => void;
  readyState: number;
};

/**
 * WebSocket connection manager
 */
export class WebSocketManager {
  private connections: Set<FastifyWebSocket> = new Set();
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Register a new WebSocket connection
   */
  registerConnection(ws: FastifyWebSocket): void {
    this.connections.add(ws);
    logger.info('WebSocket connection registered', {
      totalConnections: this.connections.size
    });

    ws.on('close', () => {
      this.connections.delete(ws);
      logger.info('WebSocket connection closed', {
        totalConnections: this.connections.size
      });
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', { error });
      this.connections.delete(ws);
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify({
      ...message,
      timestamp: Date.now()
    });

    let sentCount = 0;
    const OPEN = 1; // WebSocket.OPEN constant
    this.connections.forEach((ws) => {
      try {
        if (ws.readyState === OPEN) {
          ws.send(messageStr);
          sentCount++;
        } else {
          // Remove closed connections
          this.connections.delete(ws);
        }
      } catch (error) {
        logger.error('Failed to send WebSocket message', { error });
        this.connections.delete(ws);
      }
    });

    logger.debug('WebSocket broadcast', {
      type: message.type,
      sentCount,
      totalConnections: this.connections.size
    });
  }

  /**
   * Send message to specific user (if we track user connections)
   */
  sendToUser(userId: string, message: WebSocketMessage): void {
    // TODO: Implement user-specific routing if needed
    this.broadcast(message);
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}

/**
 * Setup WebSocket routes
 */
export function setupWebSocketRoutes(fastify: FastifyInstance, wsManager: WebSocketManager): void {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    const ws = connection.socket as FastifyWebSocket;

    // Register connection
    wsManager.registerConnection(ws);

    // Handle incoming messages
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle subscription requests
        if (data.type === 'subscribe') {
          logger.debug('WebSocket subscription', { topics: data.topics });
          // Store subscription preferences if needed
        }

        // Handle ping/pong
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (error) {
        logger.error('Failed to parse WebSocket message', { error });
      }
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: Date.now()
    }));

    // Setup periodic leaderboard updates (every 30 seconds)
    const leaderboardInterval = setInterval(async () => {
      try {
        // This would fetch from Redis/DB and send update
        // For now, just send a heartbeat
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now()
        }));
      } catch (error) {
        logger.error('Failed to send leaderboard update', { error });
      }
    }, 30000);

    // Cleanup on close
    ws.on('close', () => {
      clearInterval(leaderboardInterval);
    });
  });
}

