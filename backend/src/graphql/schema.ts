/**
 * GraphQL Schema for VeryTippers API
 */
export const schema = `
  type Tip {
    id: ID!
    senderId: String!
    recipientId: String!
    amount: Float!
    ipfsCid: String!
    decryptedMessage: String
    timestamp: String!
    txHash: String
    status: String!
  }

  type LeaderboardUser {
    rank: Int!
    userId: String!
    tips: Int!
    amount: Float!
    displayName: String
    avatarUrl: String
  }

  type UserStats {
    userId: String!
    tipsSent: Int!
    tipsReceived: Int!
    amountSent: Float!
    amountReceived: Float!
    weeklyTips: Int!
    weeklyAmount: Float!
    rankGlobal: Int
    rankWeekly: Int
  }

  type Insight {
    emoji: String!
    title: String!
    summary: String!
  }

  type LeaderboardResponse {
    users: [LeaderboardUser!]!
    total: Int!
    period: String!
  }

  type Query {
    recentTips(limit: Int = 50): [Tip!]!
    leaderboard(limit: Int = 100, period: String = "all"): LeaderboardResponse!
    userStats(userId: String!): UserStats
    myInsights(userId: String!): [Insight!]!
    health: HealthCheck!
  }

  type Mutation {
    sendTip(
      senderId: String!
      recipientId: String!
      amount: Float!
      message: String!
    ): TipResponse!
  }

  type TipResponse {
    success: Boolean!
    ipfsCid: String
    status: String!
    txHash: String
    error: String
  }

  type HealthCheck {
    status: String!
    timestamp: String!
    services: ServiceHealth!
    uptime: Float!
    version: String!
  }

  type ServiceHealth {
    database: String!
    redis: String!
    ipfs: String!
    blockchain: String!
  }

  type Subscription {
    tipUpdates: TipUpdate!
    leaderboardUpdates: LeaderboardResponse!
  }

  type TipUpdate {
    type: String!
    data: Tip!
  }
`;

