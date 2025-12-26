// Type definitions for VeryTippers Backend

export interface TipRequest {
  senderId: string;
  recipientId: string;
  amount: string | number;
  message: string;
  metadata?: Record<string, any>;
}

export interface TipResponse {
  success: boolean;
  ipfsCid?: string;
  status: 'queued' | 'processing' | 'confirmed' | 'failed';
  txHash?: string;
  error?: string;
}

export interface ModerationResult {
  isSafe: boolean;
  action: 'allow' | 'warn' | 'block';
  toxicityScore?: number;
  sentimentScore?: number;
  flaggedReason?: string;
  details?: Record<string, any>;
}

export interface EncryptedPayload {
  iv: string;
  encrypted: string;
  authTag: string;
}

export interface TipJobData {
  senderId: string;
  recipientId: string;
  amount: bigint;
  ipfsCid: string;
  moderation: ModerationResult;
  encryptedPayload: EncryptedPayload;
  timestamp: number;
  message?: string;
}

export interface LeaderboardUser {
  rank: number;
  userId: string;
  tips: number;
  amount: number;
  displayName?: string;
  avatarUrl?: string;
}

export interface UserStats {
  userId: string;
  tipsSent: number;
  tipsReceived: number;
  amountSent: bigint;
  amountReceived: bigint;
  weeklyTips: number;
  weeklyAmount: bigint;
  rankGlobal?: number;
  rankWeekly?: number;
}

export interface Insight {
  emoji: string;
  title: string;
  summary: string;
}

export interface WebSocketMessage {
  type: 'tip-queued' | 'tip-confirmed' | 'tip-failed' | 'leaderboard-update' | 'user-stats-update';
  data: any;
  timestamp?: number;
}

export interface GraphQLContext {
  userId?: string;
  ip?: string;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    ipfs: 'up' | 'down';
    blockchain: 'up' | 'down';
  };
  uptime: number;
  version: string;
}

