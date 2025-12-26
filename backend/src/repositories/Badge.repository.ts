import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Badge } from '../models/Badge.entity';

export class BadgeRepository {
  private repository: Repository<Badge>;

  constructor() {
    this.repository = AppDataSource.getRepository(Badge);
  }

  async findAll(): Promise<Badge[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<Badge | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Badge | null> {
    return this.repository.findOne({ where: { name } });
  }

  async create(badgeData: Partial<Badge>): Promise<Badge> {
    const badge = this.repository.create(badgeData);
    return this.repository.save(badge);
  }

  async updatePoolBalance(badgeId: string, balance: string): Promise<void> {
    await this.repository.update(badgeId, { poolBalance: balance });
  }

  async recordContribution(badgeId: string, contributorId: string, amount: string): Promise<void> {
    // This would typically be stored in a separate contributions table
    // For now, we'll just update the pool balance
    const badge = await this.findById(badgeId);
    if (badge) {
      const newBalance = (parseFloat(badge.poolBalance) + parseFloat(amount)).toString();
      await this.updatePoolBalance(badgeId, newBalance);
    }
  }
}

