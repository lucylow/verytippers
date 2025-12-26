import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('badges')
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column()
  imageUrl!: string;

  @Column({ type: 'jsonb' })
  requirements!: {
    minTipsSent?: number;
    minTipsReceived?: number;
    minUniqueUsers?: number;
    minStreakDays?: number;
    minCommunityContribution?: number;
  };

  @Column({ default: false })
  isCommunityFunded!: boolean;

  @Column({ type: 'decimal', precision: 36, scale: 18, default: '0' })
  poolBalance!: string;

  @Column({ default: 0 })
  totalMinted!: number;
}

