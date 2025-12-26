// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('user_badges')
export class UserBadge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  userId!: string;

  @Column()
  @Index()
  badgeId!: string;

  @Column()
  badgeName!: string;

  @Column()
  transactionHash!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  earnedAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: any;
}

