import { BigNumber } from 'ethers';
import { PrismaService } from '../database/prisma.service';
import { config } from '../../config/app';
import { logger } from '../../utils/logger';

export interface SponsorshipEligibility {
  eligible: boolean;
  reason?: string;
  remainingCredits: number;
  dailyRemaining: number;
}

export class GasSponsorshipService {
  private prisma: PrismaService;
  
  constructor() {
    this.prisma = PrismaService.getInstance();
  }
  
  async checkEligibility(userId: string): Promise<SponsorshipEligibility> {
    try {
      let sponsorship = await this.prisma.prisma.gasSponsorship.findUnique({
        where: { userId }
      });
      
      // Create if doesn't exist
      if (!sponsorship) {
        sponsorship = await this.prisma.prisma.gasSponsorship.create({
          data: {
            userId,
            totalCredits: config.GAS_SPONSORSHIP_DAILY_LIMIT,
            usedCredits: 0,
            remainingCredits: config.GAS_SPONSORSHIP_DAILY_LIMIT,
            dailyUsed: 0,
            dailyLimit: config.GAS_SPONSORSHIP_DAILY_LIMIT,
            lastResetAt: new Date(),
            nextResetAt: this.getNextResetTime(),
            totalSponsored: BigInt(0)
          }
        });
      }
      
      // Reset daily limit if needed
      if (new Date() >= sponsorship.nextResetAt) {
        sponsorship = await this.resetDailyLimit(userId);
      }
      
      // Check eligibility
      if (sponsorship.remainingCredits <= 0) {
        return {
          eligible: false,
          reason: 'No remaining credits',
          remainingCredits: 0,
          dailyRemaining: sponsorship.dailyLimit - sponsorship.dailyUsed
        };
      }
      
      if (sponsorship.dailyUsed >= sponsorship.dailyLimit) {
        return {
          eligible: false,
          reason: 'Daily limit reached',
          remainingCredits: sponsorship.remainingCredits,
          dailyRemaining: 0
        };
      }
      
      return {
        eligible: true,
        remainingCredits: sponsorship.remainingCredits,
        dailyRemaining: sponsorship.dailyLimit - sponsorship.dailyUsed
      };
      
    } catch (error) {
      logger.error('Gas sponsorship eligibility check error:', error);
      return {
        eligible: false,
        reason: 'Service error',
        remainingCredits: 0,
        dailyRemaining: 0
      };
    }
  }
  
  async useCredit(userId: string, gasUsed: BigNumber): Promise<void> {
    try {
      const sponsorship = await this.prisma.prisma.gasSponsorship.findUnique({
        where: { userId }
      });
      
      if (!sponsorship) {
        throw new Error('Gas sponsorship not found');
      }
      
      await this.prisma.prisma.gasSponsorship.update({
        where: { userId },
        data: {
          usedCredits: { increment: 1 },
          remainingCredits: { decrement: 1 },
          dailyUsed: { increment: 1 },
          totalSponsored: { increment: gasUsed }
        }
      });
      
      logger.info(`Gas sponsorship credit used for user ${userId}`, {
        gasUsed: gasUsed.toString(),
        remainingCredits: sponsorship.remainingCredits - 1
      });
      
    } catch (error) {
      logger.error('Gas sponsorship credit use error:', error);
      throw error;
    }
  }
  
  async getInfo(userId: string): Promise<any> {
    try {
      let sponsorship = await this.prisma.prisma.gasSponsorship.findUnique({
        where: { userId }
      });
      
      if (!sponsorship) {
        // Create default
        sponsorship = await this.prisma.prisma.gasSponsorship.create({
          data: {
            userId,
            totalCredits: config.GAS_SPONSORSHIP_DAILY_LIMIT,
            usedCredits: 0,
            remainingCredits: config.GAS_SPONSORSHIP_DAILY_LIMIT,
            dailyUsed: 0,
            dailyLimit: config.GAS_SPONSORSHIP_DAILY_LIMIT,
            lastResetAt: new Date(),
            nextResetAt: this.getNextResetTime(),
            totalSponsored: BigInt(0)
          }
        });
      }
      
      // Reset if needed
      if (new Date() >= sponsorship.nextResetAt) {
        sponsorship = await this.resetDailyLimit(userId);
      }
      
      return {
        totalCredits: sponsorship.totalCredits,
        usedCredits: sponsorship.usedCredits,
        remainingCredits: sponsorship.remainingCredits,
        dailyUsed: sponsorship.dailyUsed,
        dailyLimit: sponsorship.dailyLimit,
        nextResetAt: sponsorship.nextResetAt,
        totalSponsored: sponsorship.totalSponsored.toString()
      };
      
    } catch (error) {
      logger.error('Get gas sponsorship info error:', error);
      throw error;
    }
  }
  
  private async resetDailyLimit(userId: string): Promise<any> {
    return await this.prisma.prisma.gasSponsorship.update({
      where: { userId },
      data: {
        dailyUsed: 0,
        lastResetAt: new Date(),
        nextResetAt: this.getNextResetTime()
      }
    });
  }
  
  private getNextResetTime(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}

