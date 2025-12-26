// @ts-nocheck
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { DatabaseError, NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export class UserRepository {
  private repository: Repository<User>;

  constructor() {
    try {
      this.repository = AppDataSource.getRepository(User);
    } catch (error) {
      logger.error('Failed to initialize UserRepository', { error });
      throw new DatabaseError('Failed to initialize User repository', error as Error);
    }
  }

  async findByVerychatId(verychatId: string): Promise<User | null> {
    try {
      if (!verychatId) {
        throw new ValidationError('VeryChat ID is required');
      }

      const user = await this.repository.findOne({ where: { verychatId } });
      return user || null;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Failed to find user by VeryChat ID', { error, verychatId });
      throw new DatabaseError('Failed to retrieve user by VeryChat ID', error as Error, { verychatId });
    }
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    try {
      if (!walletAddress) {
        throw new ValidationError('Wallet address is required');
      }

      const user = await this.repository.findOne({ where: { walletAddress } });
      return user || null;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Failed to find user by wallet address', { error, walletAddress });
      throw new DatabaseError('Failed to retrieve user by wallet address', error as Error, { walletAddress });
    }
  }

  async create(userData: Partial<User>): Promise<User> {
    try {
      if (!userData) {
        throw new ValidationError('User data is required');
      }

      const user = this.repository.create(userData);
      return await this.repository.save(user);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Failed to create user', { error, userData });
      throw new DatabaseError('Failed to create user', error as Error, { userData });
    }
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    try {
      if (!id) {
        throw new ValidationError('User ID is required');
      }

      if (!userData || Object.keys(userData).length === 0) {
        throw new ValidationError('User data is required for update');
      }

      const result = await this.repository.update(id, userData);
      
      if (result.affected === 0) {
        throw new NotFoundError('User', { id });
      }

      const user = await this.repository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundError('User', { id });
      }

      return user;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to update user', { error, id, userData });
      throw new DatabaseError('Failed to update user', error as Error, { id, userData });
    }
  }

  async incrementTipsSent(userId: string, amount: string): Promise<void> {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!amount || isNaN(parseFloat(amount))) {
        throw new ValidationError('Valid amount is required');
      }

      const user = await this.repository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundError('User', { userId });
      }

      user.totalTipsSent += parseFloat(amount);
      await this.repository.save(user);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to increment tips sent', { error, userId, amount });
      throw new DatabaseError('Failed to increment tips sent', error as Error, { userId, amount });
    }
  }

  async incrementTipsReceived(userId: string, amount: string): Promise<void> {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!amount || isNaN(parseFloat(amount))) {
        throw new ValidationError('Valid amount is required');
      }

      const user = await this.repository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundError('User', { userId });
      }

      user.totalTipsReceived += parseFloat(amount);
      await this.repository.save(user);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to increment tips received', { error, userId, amount });
      throw new DatabaseError('Failed to increment tips received', error as Error, { userId, amount });
    }
  }

  async incrementUniqueUsersTipped(userId: string, recipientId: string): Promise<void> {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!recipientId) {
        throw new ValidationError('Recipient ID is required');
      }

      const user = await this.repository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundError('User', { userId });
      }

      // In a real implementation, you'd check if this recipient was already in the tipped users list
      user.uniqueUsersTipped += 1;
      await this.repository.save(user);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to increment unique users tipped', { error, userId, recipientId });
      throw new DatabaseError('Failed to increment unique users tipped', error as Error, { userId, recipientId });
    }
  }

  async incrementTipStreak(userId: string): Promise<void> {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const user = await this.repository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundError('User', { userId });
      }

      user.tipStreak += 1;
      await this.repository.save(user);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to increment tip streak', { error, userId });
      throw new DatabaseError('Failed to increment tip streak', error as Error, { userId });
    }
  }

  async setTipStreak(userId: string, streak: number): Promise<void> {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (streak < 0) {
        throw new ValidationError('Streak must be non-negative');
      }

      const result = await this.repository.update(userId, { tipStreak: streak });
      
      if (result.affected === 0) {
        throw new NotFoundError('User', { userId });
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to set tip streak', { error, userId, streak });
      throw new DatabaseError('Failed to set tip streak', error as Error, { userId, streak });
    }
  }

  async setLastTipDate(userId: string, date: Date): Promise<void> {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!date || !(date instanceof Date)) {
        throw new ValidationError('Valid date is required');
      }

      const result = await this.repository.update(userId, { lastTipDate: date });
      
      if (result.affected === 0) {
        throw new NotFoundError('User', { userId });
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to set last tip date', { error, userId, date });
      throw new DatabaseError('Failed to set last tip date', error as Error, { userId, date });
    }
  }
}

