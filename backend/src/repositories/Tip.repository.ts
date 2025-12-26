// @ts-nocheck
import { Repository, Between } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Tip } from '../models/Tip.entity';
import { DatabaseError, NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export class TipRepository {
  private repository: Repository<Tip>;

  constructor() {
    try {
      this.repository = AppDataSource.getRepository(Tip);
    } catch (error) {
      logger.error('Failed to initialize TipRepository', { error });
      throw new DatabaseError('Failed to initialize Tip repository', error as Error);
    }
  }

  async create(tipData: Partial<Tip>): Promise<Tip> {
    try {
      if (!tipData) {
        throw new ValidationError('Tip data is required');
      }

      const tip = this.repository.create(tipData);
      return await this.repository.save(tip);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Failed to create tip', { error, tipData });
      throw new DatabaseError('Failed to create tip', error as Error, { tipData });
    }
  }

  async findByPeriod(start: Date, end: Date): Promise<Tip[]> {
    try {
      if (!start || !end) {
        throw new ValidationError('Start and end dates are required');
      }

      if (start > end) {
        throw new ValidationError('Start date must be before end date');
      }

      return await this.repository.find({
        where: {
          createdAt: Between(start, end),
          status: 'confirmed'
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Failed to find tips by period', { error, start, end });
      throw new DatabaseError('Failed to retrieve tips by period', error as Error, { start, end });
    }
  }

  async findBySenderId(senderId: string, limit: number = 10): Promise<Tip[]> {
    try {
      if (!senderId) {
        throw new ValidationError('Sender ID is required');
      }

      if (limit < 1 || limit > 1000) {
        throw new ValidationError('Limit must be between 1 and 1000');
      }

      return await this.repository.find({
        where: { senderId, status: 'confirmed' },
        order: { createdAt: 'DESC' },
        take: limit
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Failed to find tips by sender', { error, senderId, limit });
      throw new DatabaseError('Failed to retrieve tips by sender', error as Error, { senderId, limit });
    }
  }

  async findByRecipientId(recipientId: string, limit: number = 10): Promise<Tip[]> {
    try {
      if (!recipientId) {
        throw new ValidationError('Recipient ID is required');
      }

      if (limit < 1 || limit > 1000) {
        throw new ValidationError('Limit must be between 1 and 1000');
      }

      return await this.repository.find({
        where: { recipientId, status: 'confirmed' },
        order: { createdAt: 'DESC' },
        take: limit
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Failed to find tips by recipient', { error, recipientId, limit });
      throw new DatabaseError('Failed to retrieve tips by recipient', error as Error, { recipientId, limit });
    }
  }

  async findByTransactionHash(txHash: string): Promise<Tip | null> {
    try {
      if (!txHash) {
        throw new ValidationError('Transaction hash is required');
      }

      const tip = await this.repository.findOne({ where: { transactionHash: txHash } });
      return tip || null;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Failed to find tip by transaction hash', { error, txHash });
      throw new DatabaseError('Failed to retrieve tip by transaction hash', error as Error, { txHash });
    }
  }

  async updateStatus(id: string, status: 'pending' | 'confirmed' | 'failed'): Promise<void> {
    try {
      if (!id) {
        throw new ValidationError('Tip ID is required');
      }

      if (!['pending', 'confirmed', 'failed'].includes(status)) {
        throw new ValidationError(`Invalid status: ${status}`);
      }

      const result = await this.repository.update(id, { status });
      
      if (result.affected === 0) {
        throw new NotFoundError('Tip', { id, status });
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to update tip status', { error, id, status });
      throw new DatabaseError('Failed to update tip status', error as Error, { id, status });
    }
  }
}

