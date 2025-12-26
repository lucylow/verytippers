import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('leaderboards')
export class Leaderboard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';

  @Column()
  category: 'tips_sent' | 'tips_received' | 'unique_tippers' | 'badge_collectors';

  @Column({ type: 'jsonb' })
  rankings: Array<{
    userId: string;
    score: number;
    rank: number;
    change?: number; // rank change from previous period
  }>;

  @Column({ type: 'timestamp' })
  periodStart: Date;

  @Column({ type: 'timestamp' })
  periodEnd: Date;

  @CreateDateColumn()
  calculatedAt: Date;
}

