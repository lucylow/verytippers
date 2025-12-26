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
    recommendedAmount?: string;
    message?: string;
    confidence?: number;
    reason?: string;
    reasoning?: string;
    sentiment?: 'low' | 'medium' | 'high';
    category?: string;
    contentScore?: {
      quality: number;
      engagement: number;
      sentiment: string;
    };
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
  score?: number;
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
  badgeId: string;
  name: string;
  emoji: string;
  description: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  awardedAt: string | Date;
  metadata?: any;
}

export interface UserBadgesResponse {
  success: boolean;
  data?: {
    badges: Badge[];
    stats?: {
      totalBadges: number;
      rarityCounts: Record<string, number>;
      latestBadge: Badge | null;
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

// Rewards API Types (Extended)
export interface EvaluateRewardRequest {
  actionType: string;
  tipAmount?: number;
  contentQualityScore?: number;
  streakDays?: number;
  referralVerified?: boolean;
}

export interface EvaluateRewardResponse {
  success: boolean;
  data?: {
    eligible: boolean;
    amount: string;
    amountFormatted: string;
    reason?: string;
    error?: string;
  };
  error?: string;
}

export interface RewardInfoResponse {
  success: boolean;
  data?: {
    contract: {
      version: bigint;
      token: string;
      signer: string;
      totalRewards: bigint;
    };
    signerAddress: string;
  };
  error?: string;
}

export interface RewardTableResponse {
  success: boolean;
  data?: {
    rewardTable: Record<string, string>;
    note?: string;
  };
  error?: string;
}

// Checkout API Types
export interface CreateCheckoutSessionRequest {
  userId: string;
  credits: number;
  success_url?: string;
  cancel_url?: string;
}

export interface CreateCheckoutSessionResponse {
  url?: string;
  sessionId?: string;
  error?: string;
}

export interface CreateMetaTxRequest {
  userId: string;
  toAddress: string;
  amount: number;
  cid?: string | null;
  nonceHint?: number;
  fromAddress?: string;
  signature?: string;
}

export interface CreateMetaTxResponse {
  queuedId?: string;
  message?: string;
  error?: string;
}

export interface UserBalanceResponse {
  credits: number;
  userId: string;
  error?: string;
}

export interface Order {
  id: string;
  user_id: string;
  amount_cents: number;
  credits: number;
  stripe_session_id: string;
  status: 'pending' | 'paid' | 'failed';
  created_at: string;
  updated_at?: string;
}

export interface UserOrdersResponse {
  orders: Order[];
  error?: string;
}

// Ads API Types
export interface GetAdSlotRequest {
  tags?: string[];
  guild?: string;
}

export interface Ad {
  id: string;
  advertiser: string;
  title: string;
  description?: string;
  imageUrl?: string;
  targetTags?: string[];
  targetGuild?: string;
  url: string;
  budget?: number;
  active: boolean;
  impressions?: number;
  clicks?: number;
}

export interface AdSlotResponse {
  ad: Ad | null;
  error?: string;
}

export interface RecordImpressionRequest {
  adId: string;
  userId?: string;
  ipHash?: string;
}

export interface RecordImpressionResponse {
  ok?: boolean;
  success: boolean;
  error?: string;
}

export interface RecordClickRequest {
  adId: string;
  userId?: string;
  ipHash?: string;
}

export interface RecordClickResponse {
  redirectUrl: string;
  success: boolean;
  error?: string;
}

export interface CreateAdRequest {
  advertiser: string;
  title: string;
  description?: string;
  imageUrl?: string;
  targetTags?: string[];
  targetGuild?: string;
  url: string;
  budget?: number;
}

export interface CreateAdResponse {
  success: boolean;
  ad?: Ad;
  error?: string;
}

export interface UpdateAdRequest {
  advertiser?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  targetTags?: string[];
  targetGuild?: string;
  url?: string;
  budget?: number;
}

export interface UpdateAdResponse {
  success: boolean;
  ad?: Ad;
  error?: string;
}

export interface ListAdsResponse {
  success: boolean;
  ads?: Ad[];
  error?: string;
}

// Voice API Types
export interface VoiceParseRequest {
  transcript: string;
}

export interface VoiceParseResponse {
  success: boolean;
  data?: {
    recipient?: string;
    amount?: number;
    message?: string;
    intent?: string;
  };
  error?: string;
}

// Intelligent Tip Suggestion Types
export interface IntelligentTipSuggestionRequest {
  chatContext: string;
  recipientId?: string;
  senderId?: string;
  recipientName?: string;
}

export interface IntelligentTipSuggestionResponse {
  success: boolean;
  data?: {
    amount?: number;
    message?: string;
    reasoning?: string;
  };
  error?: string;
}

