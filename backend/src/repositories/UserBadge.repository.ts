import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { UserBadge } from '../models/UserBadge.entity';

export class UserBadgeRepository {
  private repository: Repository<UserBadge>;

  constructor() {
    this.repository = AppDataSource.getRepository(UserBadge);
  }

  async create(userBadgeData: Partial<UserBadge>): Promise<UserBadge> {
    const userBadge = this.repository.create(userBadgeData);
    return this.repository.save(userBadge);
  }

  async findByUserId(userId: string): Promise<UserBadge[]> {
    return this.repository.find({
      where: { userId },
      order: { earnedAt: 'DESC' }
    });
  }

  async hasBadge(userId: string, badgeId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { userId, badgeId }
    });
    return count > 0;
  }
}

