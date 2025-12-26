// @ts-nocheck
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';

export class UserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  async findByVerychatId(verychatId: string): Promise<User | null> {
    return this.repository.findOne({ where: { verychatId } });
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.repository.findOne({ where: { walletAddress } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    await this.repository.update(id, userData);
    const user = await this.repository.findOne({ where: { id } });
    if (!user) throw new Error('User not found');
    return user;
  }

  async incrementTipsSent(userId: string, amount: string): Promise<void> {
    const user = await this.repository.findOne({ where: { id: userId } });
    if (user) {
      user.totalTipsSent += parseFloat(amount);
      await this.repository.save(user);
    }
  }

  async incrementTipsReceived(userId: string, amount: string): Promise<void> {
    const user = await this.repository.findOne({ where: { id: userId } });
    if (user) {
      user.totalTipsReceived += parseFloat(amount);
      await this.repository.save(user);
    }
  }

  async incrementUniqueUsersTipped(userId: string, recipientId: string): Promise<void> {
    // This would need a more sophisticated check to ensure uniqueness
    // For now, we'll just increment - proper implementation would check if this recipient was already tipped
    const user = await this.repository.findOne({ where: { id: userId } });
    if (user) {
      // In a real implementation, you'd check if this recipient was already in the tipped users list
      user.uniqueUsersTipped += 1;
      await this.repository.save(user);
    }
  }

  async incrementTipStreak(userId: string): Promise<void> {
    const user = await this.repository.findOne({ where: { id: userId } });
    if (user) {
      user.tipStreak += 1;
      await this.repository.save(user);
    }
  }

  async setTipStreak(userId: string, streak: number): Promise<void> {
    await this.repository.update(userId, { tipStreak: streak });
  }

  async setLastTipDate(userId: string, date: Date): Promise<void> {
    await this.repository.update(userId, { lastTipDate: date });
  }
}

