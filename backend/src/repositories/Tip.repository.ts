import { Repository, Between } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Tip } from '../models/Tip.entity';

export class TipRepository {
  private repository: Repository<Tip>;

  constructor() {
    this.repository = AppDataSource.getRepository(Tip);
  }

  async create(tipData: Partial<Tip>): Promise<Tip> {
    const tip = this.repository.create(tipData);
    return this.repository.save(tip);
  }

  async findByPeriod(start: Date, end: Date): Promise<Tip[]> {
    return this.repository.find({
      where: {
        createdAt: Between(start, end),
        status: 'confirmed'
      }
    });
  }

  async findBySenderId(senderId: string, limit: number = 10): Promise<Tip[]> {
    return this.repository.find({
      where: { senderId, status: 'confirmed' },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  async findByRecipientId(recipientId: string, limit: number = 10): Promise<Tip[]> {
    return this.repository.find({
      where: { recipientId, status: 'confirmed' },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  async findByTransactionHash(txHash: string): Promise<Tip | null> {
    return this.repository.findOne({ where: { transactionHash: txHash } });
  }

  async updateStatus(id: string, status: 'pending' | 'confirmed' | 'failed'): Promise<void> {
    await this.repository.update(id, { status });
  }
}

