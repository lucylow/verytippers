/**
 * Shared TypeScript types for API requests and responses
 */

// Base API response structure
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorCode?: string;
}

// Tip API Types
export interface SendTipRequest {
  senderId: string;
  recipientId: string;
  amount: string | number;
  token: string;
  message?: string;
  contentId?: string;
  signature?: string;
}

export interface SendTipResponse {
  success: boolean;
  message?: string;
  data?: {
    tipId?: string;
    txHash?: string;
    ipfsCid?: string;
    status?: string;
  };
  error?: string;
  errorCode?: string;
}

export interface TipStatusResponse {
  success: boolean;
  data?: {
    tipId: string;
    status: 'pending' | 'submitted' | 'confirmed' | 'failed';
    txHash?: string;
    confirmations?: number;
  };
  error?: string;
}

// Tip Recommendation API Types
export interface TipRecommendationRequest {
  content: string;
  authorId?: string;
  contentType?: string;
  recipientId?: string;
  senderId?: string;
}

export interface TipRecommendationResponse {
  success: boolean;
  data?: {
    amount: number;
    message?: string;
    confidence?: number;
    reason?: string;
    sentiment?: 'low' | 'medium' | 'high';
    category?: string;
  };
  error?: string;
}

export interface MessageSuggestionsRequest {
  recipientName: string;
  contentPreview?: string;
  tipAmount?: number;
  relationship?: string;
}

export interface MessageSuggestion {
  message: string;
  tone: 'friendly' | 'professional' | 'casual' | 'enthusiastic';
  confidence?: number;
}

export interface MessageSuggestionsResponse {
  success: boolean;
  data?: MessageSuggestion[];
  error?: string;
}

// Analytics API Types
export interface PlatformAnalyticsResponse {
  success: boolean;
  data?: {
    totalUsers?: number;
    totalTips?: number;
    totalAmount?: string;
    averageTip?: string;
    topTippers?: Array<{
      userId: string;
      username?: string;
      tipCount: number;
      totalAmount: string;
    }>;
  };
  error?: string;
}

export interface UserAnalyticsResponse {
  success: boolean;
  data?: {
    userId: string;
    tipsSent?: number;
    tipsReceived?: number;
    totalSent?: string;
    totalReceived?: string;
    totalAmount?: string;
    rank?: number;
    followers?: number;
    following?: number;
    tipStreak?: number;
    favoriteRecipients?: Array<{
      userId: string;
      username?: string;
      count: number;
      totalAmount: string;
    }>;
    favoriteSenders?: Array<{
      userId: string;
      username?: string;
      count: number;
      totalAmount: string;
    }>;
  };
  error?: string;
}

// Leaderboard API Types
export interface LeaderboardRequest {
  userId: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'all';
}

export interface LeaderboardResponse {
  success: boolean;
  data?: {
    rank: number;
    totalTips: number;
    totalAmount: string;
    topSupported?: Array<{
      username: string;
      tips: number;
      amount: string;
    }>;
    weeklyGrowth?: number;
    badges?: string[];
    comparedToFriends?: Array<{
      username: string;
      rank: number;
      difference: number;
    }>;
    communityStats?: {
      totalUsers: number;
      avgTips: number;
    };
  };
  error?: string;
}

// Badge API Types
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt?: string;
}

export interface UserBadgesResponse {
  success: boolean;
  data?: {
    badges: Badge[];
    stats?: {
      totalBadges: number;
      byRarity?: Record<string, number>;
    };
  };
  error?: string;
}

export interface CheckBadgesResponse {
  success: boolean;
  data?: {
    newBadges: Badge[];
    count: number;
  };
  error?: string;
}

// Feed API Types
export interface TipFeedItem {
  id: string;
  senderId: string;
  senderUsername?: string;
  recipientId: string;
  recipientUsername?: string;
  amount: string;
  token: string;
  message?: string;
  timestamp: string;
  txHash?: string;
}

export interface TipFeedResponse {
  success: boolean;
  data?: TipFeedItem[];
  error?: string;
}

// Moderation API Types
export interface ModerationCheckRequest {
  message: string;
  senderId?: string;
  recipientId?: string;
  context?: {
    channel?: string;
    recentTips?: unknown[];
  };
}

export interface ModerationCheckResponse {
  success: boolean;
  result?: {
    isSafe: boolean;
    sentiment: 'positive' | 'neutral' | 'negative';
    toxicityScore: number;
    toxicityLabels?: Array<{
      label: string;
      score: number;
    }>;
    flaggedReason?: string | null;
    action: 'allow' | 'warn' | 'block' | 'quarantine';
  };
  error?: string;
}

// Rewards API Types
export interface IssueRewardRequest {
  user: string;
  actionType: string;
  context?: {
    tipAmount?: number;
    contentQualityScore?: number;
    streakDays?: number;
    referralVerified?: boolean;
  };
}

export interface SignedRewardPayload {
  user: string;
  actionType: string;
  amount: string;
  nonce: string;
  deadline: number;
  signature: string;
}

export interface IssueRewardResponse {
  success: boolean;
  data?: SignedRewardPayload;
  error?: string;
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services?: {
    database?: string;
    redis?: string;
    ipfs?: string;
    blockchain?: string;
  };
  uptime?: number;
  version?: string;
}

