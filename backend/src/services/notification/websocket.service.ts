import { Server as HttpServer } from 'http';
// import { Server as SocketIOServer } from 'socket.io'; // TODO: Install socket.io if needed
import { logger } from '../../utils/logger';
import jwt from 'jsonwebtoken';
import { config } from '../../config/app';
import { PrismaService } from '../database/prisma.service';

export class WebSocketService {
  private io: any | null = null; // TODO: Use SocketIOServer type when socket.io is installed
  private prisma: PrismaService;
  
  constructor() {
    this.prisma = PrismaService.getInstance();
  }
  
  initialize(httpServer: HttpServer): any {
    // TODO: Install socket.io package and uncomment
    throw new Error('Socket.io not installed. Please install socket.io package to use WebSocketService.');
    /* this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.CORS_ORIGINS,
        credentials: true
      },
      transports: ['websocket', 'polling']
    });
    
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }
        
        const decoded = jwt.verify(token, config.JWT_SECRET) as any;
        const user = await this.prisma.prisma.user.findUnique({
          where: { id: decoded.userId }
        });
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }
        
        socket.data.user = {
          id: user.id,
          walletAddress: user.walletAddress,
          verychatId: user.verychatId
        };
        
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
    
    // Connection handling
    this.io.on('connection', (socket) => {
      const userId = socket.data.user?.id;
      logger.info(`WebSocket client connected: ${userId}`);
      
      // Join user's room
      if (userId) {
        socket.join(`user:${userId}`);
      }
      
      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${userId}`);
      });
      
      // Handle errors
      socket.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });
    });
    
    logger.info('✅ WebSocket server initialized');
    return this.io;
    */
  }
  
  emitToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }
  
  emitTipSent(userId: string, tipData: any): void {
    this.emitToUser(userId, 'tip:sent', tipData);
  }
  
  emitTipReceived(userId: string, tipData: any): void {
    this.emitToUser(userId, 'tip:received', tipData);
  }
  
  emitBadgeEarned(userId: string, badgeData: any): void {
    this.emitToUser(userId, 'badge:earned', badgeData);
  }
  
  emitLeaderboardUpdate(data: any): void {
    if (this.io) {
      this.io.emit('leaderboard:update', data);
    }
  }
  
  getIO(): any | null {
    return this.io;
  }
}

export const setupWebSocket = (httpServer: HttpServer): any => {
  const wsService = new WebSocketService();
  return wsService.initialize(httpServer);
};

