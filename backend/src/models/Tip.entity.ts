// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('tips')
export class Tip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  senderId!: string;

  @Column()
  @Index()
  recipientId!: string;

  @Column()
  tokenAddress!: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount!: string;

  @Column({ nullable: true })
  messageHash!: string | null; // IPFS hash

  @Column({ nullable: true })
  messageEncrypted!: string | null; // Encrypted message for recipient

  @Column()
  transactionHash!: string;

  @Column({ nullable: true })
  blockNumber!: number | null;

  @Column({ default: 'pending' })
  status!: 'pending' | 'confirmed' | 'failed';

  @Column({ type: 'jsonb', nullable: true })
  metadata!: any;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;
}

