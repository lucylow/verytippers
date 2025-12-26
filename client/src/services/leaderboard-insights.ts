// Personalized Leaderboard Insights using OpenAI GPT-4o
// Generates weekly summaries: "You're #3 overall, top supporter of @alice!"

import { z } from 'zod';

// Leaderboard data schema
const LeaderboardDataSchema = z.object({
  rank: z.number().min(1).max(10000),
  totalTips: z.number(),
  totalAmount: z.string(), // Keep as string for BigInt compatibility
  topSupported: z.array(z.object({
    username: z.string(),
    tips: z.number(),
    amount: z.string()
  })),
  weeklyGrowth: z.number().min(-100).max(1000),
  badges: z.array(z.string()),
  comparedToFriends: z.array(z.object({
    username: z.string(),
    rank: z.number(),
    difference: z.number()
  })),
  communityStats: z.object({
    totalUsers: z.number(),
    avgTips: z.number()
  })
});

const InsightSchema = z.object({
  title: z.string().max(60),
  summary: z.string().max(280),
  emoji: z.string().length(1),
  keyStat: z.string(),
  callToAction: z.string().max(100),
  shareable: z.boolean()
});

export type LeaderboardData = z.infer<typeof LeaderboardDataSchema>;
export type Insight = z.infer<typeof InsightSchema>;

/**
 * Generate personalized weekly leaderboard insights
 */
export async function generatePersonalizedInsights(
  userData: LeaderboardData,
  communityStats: { totalUsers: number; avgTips: number }
): Promise<Insight[]> {
  
  // For now, we'll use the API endpoint which handles OpenAI on the backend
  try {
    const response = await fetch('/api/v1/leaderboard/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userData,
        communityStats
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate insights');
    }

    const data = await response.json();
    const validated = z.array(InsightSchema).parse(data.insights);
    return validated.slice(0, 5); // Max 5 insights
  } catch (error) {
    console.error('Leaderboard insights failed:', error);
    return fallbackInsights(userData);
  }
}

/**
 * Fetch real leaderboard data from backend
 */
export async function fetchLeaderboardData(userId: string, period: string = 'weekly'): Promise<LeaderboardData> {
  const response = await fetch(`/api/v1/leaderboard/${userId}?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard data');
  }
  const data = await response.json();
  return LeaderboardDataSchema.parse(data);
}

/**
 * Fallback insights when AI unavailable
 */
function fallbackInsights(data: LeaderboardData): Insight[] {
  const insights: Insight[] = [];
  
  // Rank insight
  insights.push({
    title: `Rank #${data.rank}`,
    summary: `You're #${data.rank} on the VeryTippers leaderboard!`,
    emoji: '🏆',
    keyStat: `${data.totalTips} tips`,
    callToAction: 'Keep tipping!',
    shareable: true
  });

  // Top supporter insight
  if (data.topSupported.length > 0) {
    const top = data.topSupported[0];
    insights.push({
      title: `Top Supporter`,
      summary: `You're the top supporter of @${top.username}!`,
      emoji: '💎',
      keyStat: `${top.tips} tips sent`,
      callToAction: 'Continue supporting!',
      shareable: true
    });
  }

  // Growth insight
  if (data.weeklyGrowth > 0) {
    insights.push({
      title: `Growing Fast!`,
      summary: `You've grown ${data.weeklyGrowth}% this week!`,
      emoji: '🚀',
      keyStat: `+${data.weeklyGrowth}% growth`,
      callToAction: 'Keep it up!',
      shareable: true
    });
  }

  return insights;
}
