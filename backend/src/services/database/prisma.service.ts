import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

export class PrismaService {
  private static instance: PrismaService;
  public prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  public async $connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('✅ Prisma connected to database');
    } catch (error) {
      logger.error('❌ Prisma connection failed:', error);
      throw error;
    }
  }

  public async $disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('✅ Prisma disconnected from database');
    } catch (error) {
      logger.error('❌ Prisma disconnection error:', error);
      throw error;
    }
  }
}

