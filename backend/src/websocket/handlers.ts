import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';
import type { WebSocketMessage } from '../types';

// WebSocket type for Fastify
type FastifyWebSocket = {
  send: (data: string) => void;
  on: (event: string, handler: (data?: any) => void) => void;
  close: (code?: number, reason?: string) => void;
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
    try {
      this.connections.add(ws);
      logger.info('WebSocket connection registered', {
        totalConnections: this.connections.size
      });

      ws.on('close', (code?: number, reason?: string) => {
        try {
          this.connections.delete(ws);
          logger.info('WebSocket connection closed', {
            totalConnections: this.connections.size,
            code,
            reason: reason?.toString()
          });
        } catch (error) {
          logger.error('Error handling WebSocket close', { error });
        }
      });

      ws.on('error', (error) => {
        try {
          logger.error('WebSocket error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          this.connections.delete(ws);
        } catch (handlerError) {
          logger.error('Error handling WebSocket error', { error: handlerError });
        }
      });

      // Handle ping/pong for connection health
      let pingInterval: NodeJS.Timeout | null = null;
      let pongTimeout: NodeJS.Timeout | null = null;

      const startPingPong = () => {
        pingInterval = setInterval(() => {
          try {
            if (ws.readyState === 1) { // OPEN
              ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
              
              // Set timeout for pong response
              pongTimeout = setTimeout(() => {
                logger.warn('WebSocket pong timeout, closing connection');
                try {
                  ws.close(1000, 'Pong timeout');
                } catch (error) {
                  logger.error('Error closing WebSocket after pong timeout', { error });
                }
              }, 5000);
            }
          } catch (error) {
            logger.error('Error sending WebSocket ping', { error });
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.on('close', () => {
        if (pingInterval) {
          clearInterval(pingInterval);
        }
        if (pongTimeout) {
          clearTimeout(pongTimeout);
        }
      });

      startPingPong();
    } catch (error) {
      logger.error('Error registering WebSocket connection', { error });
      try {
        this.connections.delete(ws);
        ws.close(1011, 'Server error during registration');
      } catch (closeError) {
        logger.error('Error closing WebSocket after registration error', { error: closeError });
      }
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WebSocketMessage): void {
    if (!message) {
      logger.warn('Attempted to broadcast empty message');
      return;
    }

    let messageStr: string;
    try {
      messageStr = JSON.stringify({
        ...message,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Failed to serialize WebSocket message', {
        error: error instanceof Error ? error.message : String(error),
        messageType: message.type
      });
      return;
    }

    let sentCount = 0;
    let errorCount = 0;
    const OPEN = 1; // WebSocket.OPEN constant
    const connectionsToRemove: FastifyWebSocket[] = [];

    this.connections.forEach((ws) => {
      try {
        if (ws.readyState === OPEN) {
          ws.send(messageStr);
          sentCount++;
        } else {
          // Mark closed connections for removal
          connectionsToRemove.push(ws);
        }
      } catch (error) {
        errorCount++;
        logger.error('Failed to send WebSocket message', {
          error: error instanceof Error ? error.message : String(error),
          messageType: message.type
        });
        connectionsToRemove.push(ws);
      }
    });

    // Remove closed/failed connections
    connectionsToRemove.forEach(ws => {
      try {
        this.connections.delete(ws);
      } catch (error) {
        logger.error('Error removing WebSocket connection', { error });
      }
    });

    logger.debug('WebSocket broadcast', {
      type: message.type,
      sentCount,
      errorCount,
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
        if (!message || message.length === 0) {
          logger.warn('Received empty WebSocket message');
          return;
        }

        let data: any;
        try {
          data = JSON.parse(message.toString());
        } catch (parseError) {
          logger.error('Failed to parse WebSocket message', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            messageLength: message.length
          });
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format',
            timestamp: Date.now()
          }));
          return;
        }

        if (!data || typeof data !== 'object') {
          logger.warn('Invalid WebSocket message format', { data });
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format',
            timestamp: Date.now()
          }));
          return;
        }
        
        // Handle subscription requests
        if (data.type === 'subscribe') {
          try {
            logger.debug('WebSocket subscription', { topics: data.topics });
            // Store subscription preferences if needed
            ws.send(JSON.stringify({
              type: 'subscribed',
              topics: data.topics,
              timestamp: Date.now()
            }));
          } catch (error) {
            logger.error('Error handling subscription', { error });
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Failed to process subscription',
              timestamp: Date.now()
            }));
          }
        }

        // Handle ping/pong
        if (data.type === 'ping') {
          try {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          } catch (error) {
            logger.error('Error sending pong', { error });
          }
        }
      } catch (error) {
        logger.error('Error handling WebSocket message', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        try {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Internal server error',
            timestamp: Date.now()
          }));
        } catch (sendError) {
          logger.error('Error sending error message to WebSocket', { error: sendError });
        }
      }
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: Date.now()
    }));

    // Setup periodic leaderboard updates (every 30 seconds)
    let leaderboardInterval: NodeJS.Timeout | null = null;
    
    try {
      leaderboardInterval = setInterval(async () => {
        try {
          if (ws.readyState !== 1) { // Not OPEN
            if (leaderboardInterval) {
              clearInterval(leaderboardInterval);
            }
            return;
          }

          // This would fetch from Redis/DB and send update
          // For now, just send a heartbeat
          ws.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: Date.now()
          }));
        } catch (error) {
          logger.error('Failed to send leaderboard update', {
            error: error instanceof Error ? error.message : String(error)
          });
          // Don't clear interval on error, allow retry on next interval
        }
      }, 30000);
    } catch (error) {
      logger.error('Failed to setup leaderboard interval', { error });
    }

    // Cleanup on close
    ws.on('close', () => {
      clearInterval(leaderboardInterval);
    });
  });
}

