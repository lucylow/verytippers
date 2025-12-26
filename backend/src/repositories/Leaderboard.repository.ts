// @ts-nocheck
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Leaderboard } from '../models/Leaderboard.entity';

export class LeaderboardRepository {
  private repository: Repository<Leaderboard>;

  constructor() {
    this.repository = AppDataSource.getRepository(Leaderboard);
  }

  async create(leaderboardData: Partial<Leaderboard>): Promise<Leaderboard> {
    const leaderboard = this.repository.create(leaderboardData);
    return this.repository.save(leaderboard);
  }

  async findLatest(period: string, category: string): Promise<Leaderboard | null> {
    return this.repository.findOne({
      where: { period: period as any, category: category as any },
      order: { calculatedAt: 'DESC' }
    });
  }

  async findPreviousRank(userId: string, category: string): Promise<number | null> {
    // Find the most recent leaderboard entry before the current one
    const leaderboard = await this.repository.findOne({
      where: { category: category as any },
      order: { calculatedAt: 'DESC' },
      skip: 1, // Skip the most recent one
      take: 1
    });

    if (!leaderboard) return null;

    const userEntry = leaderboard.rankings.find(r => r.userId === userId);
    return userEntry ? userEntry.rank : null;
  }
}

