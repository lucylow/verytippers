import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @Index()
  verychatId!: string;

  @Column({ nullable: true })
  username!: string | null;

  @Column()
  walletAddress!: string;

  @Column({ default: false })
  isKycVerified!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  kycMetadata!: any;

  @Column({ default: 0 })
  totalTipsSent!: number; // in smallest unit

  @Column({ default: 0 })
  totalTipsReceived!: number;

  @Column({ default: 0 })
  uniqueUsersTipped!: number;

  @Column({ default: 0 })
  tipStreak!: number; // consecutive days of tipping

  @Column({ type: 'timestamp', nullable: true })
  lastTipDate!: Date | null;

  @Column({ type: 'jsonb', default: {} })
  tokenBalances!: Record<string, number>; // token address -> balance

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

