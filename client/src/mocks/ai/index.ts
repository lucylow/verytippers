// Mock AI Service - Loads JSON fixtures and simulates AI responses with latency
// Designed for demos, screenshots, and development when backend AI is disabled

import type {
  AITipSuggestionMock,
  AITipPolicyEvaluationMock,
  AIAbuseDetectionMock,
  AIMessageToneAnalysisMock,
  AILeaderboardTaggingMock,
  AINotificationCopyMock,
  AIGasOptimizationMock,
  AIDemoModeMock,
} from "./types";

// Import mock JSON fixtures (Vite handles these imports)
import tipSuggestionMock from "./tip-suggestion.json";
import policyEvaluationMock from "./policy-evaluation.json";
import abuseDetectionMock from "./abuse-detection.json";
import messageToneAnalysisMock from "./message-tone-analysis.json";
import leaderboardTaggingMock from "./leaderboard-tagging.json";
import notificationCopyMock from "./notification-copy.json";
import gasOptimizationMock from "./gas-optimization.json";
import demoModeMock from "./demo-mode.json";

// Check if demo mode is enabled
const isDemoMode = (): boolean => {
  return import.meta.env.VITE_DEMO_MODE === "true" || 
         import.meta.env.VITE_ENABLE_MOCK_MODE === "true" ||
         import.meta.env.DEV;
};

// Simulate network latency for realistic demo experience
const simulateLatency = (ms: number = 420): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Mock AI Tip Suggestion
 * Used when user types /tip @alice but hasn't entered amount or message yet
 */
export async function mockAITipSuggestion(
  command: string,
  context: {
    chat_platform?: string;
    channel_type?: string;
    sender_username?: string;
    recipient_username?: string;
    recent_messages?: string[];
  } = {}
): Promise<AITipSuggestionMock["output"]> {
  if (!isDemoMode()) {
    throw new Error("Mock AI is disabled. Enable DEMO_MODE to use mocks.");
  }

  await simulateLatency(420);

  const mock = tipSuggestionMock as AITipSuggestionMock;
  
  // Merge with actual context for dynamic responses
  return {
    ...mock.output,
    suggested_amount: context.recent_messages?.length ? 5 : 3,
    suggested_message: context.recipient_username 
      ? `Nice work, ${context.recipient_username}!` 
      : mock.output.suggested_message,
  };
}

/**
 * Mock AI Tip Policy Evaluation
 * Used by Orchestrator before meta-tx creation
 */
export async function mockAITipPolicyEvaluation(params: {
  from_user: string;
  to_user: string;
  amount: number;
  currency?: string;
  historical_context?: {
    tips_last_24h?: number;
    total_amount_24h?: number;
    account_age_days?: number;
  };
}): Promise<AITipPolicyEvaluationMock["output"]> {
  if (!isDemoMode()) {
    throw new Error("Mock AI is disabled. Enable DEMO_MODE to use mocks.");
  }

  await simulateLatency(250);

  const mock = policyEvaluationMock as AITipPolicyEvaluationMock;
  
  // Adjust based on amount
  const riskScore = params.amount > 40 ? 0.15 : 0.08;
  const allowed = params.amount <= 50 && riskScore < 0.6;

  return {
    ...mock.output,
    allowed,
    risk_score: riskScore,
    decision: allowed ? "approved" : "pending_review",
    explanation: params.amount > 40
      ? "Large amount requires additional review."
      : mock.output.explanation,
  };
}

/**
 * Mock AI Abuse Detection
 * Used for large or repeated tips
 */
export async function mockAIAbuseDetection(params: {
  from_user: string;
  to_user: string;
  amount: number;
  currency?: string;
  recent_behavior?: {
    tips_last_hour?: number;
    unique_recipients?: number;
    account_age_days?: number;
  };
}): Promise<AIAbuseDetectionMock["output"]> {
  if (!isDemoMode()) {
    throw new Error("Mock AI is disabled. Enable DEMO_MODE to use mocks.");
  }

  await simulateLatency(300);

  const mock = abuseDetectionMock as AIAbuseDetectionMock;
  
  const tipsLastHour = params.recent_behavior?.tips_last_hour || 0;
  const accountAge = params.recent_behavior?.account_age_days || 30;
  
  const isNewAccount = accountAge < 7;
  const isHighFrequency = tipsLastHour > 5;
  
  const riskScore = isNewAccount && isHighFrequency ? 0.71 : 0.15;
  const classification = riskScore > 0.6 ? "potential_spam" : "normal";

  return {
    ...mock.output,
    risk_score: riskScore,
    classification,
    recommended_action: riskScore > 0.6 ? "manual_review" : "allow",
    explanation: riskScore > 0.6
      ? "High frequency of tips from a new account detected."
      : "Behavior appears normal.",
  };
}

/**
 * Mock AI Message Tone Classification
 * Used for analytics, moderation, and UI badges
 */
export async function mockAIMessageToneAnalysis(
  message: string
): Promise<AIMessageToneAnalysisMock["output"]> {
  if (!isDemoMode()) {
    throw new Error("Mock AI is disabled. Enable DEMO_MODE to use mocks.");
  }

  await simulateLatency(200);

  const mock = messageToneAnalysisMock as AIMessageToneAnalysisMock;
  
  const lowerMessage = message.toLowerCase();
  const isPositive = lowerMessage.includes("amazing") || 
                     lowerMessage.includes("great") || 
                     lowerMessage.includes("thanks") ||
                     lowerMessage.includes("appreciate");

  return {
    ...mock.output,
    tone: isPositive ? "positive" : "neutral",
    emotion: isPositive ? "gratitude" : "neutral",
    labels: isPositive 
      ? ["praise", "appreciation", "collaboration"]
      : ["informational"],
  };
}

/**
 * Mock AI Leaderboard Categorization
 * Used to generate social labels & badges
 */
export async function mockAILeaderboardTagging(params: {
  user: string;
  metrics: {
    tips_received_30d?: number;
    unique_tippers?: number;
    average_tip?: number;
  };
}): Promise<AILeaderboardTaggingMock["output"]> {
  if (!isDemoMode()) {
    throw new Error("Mock AI is disabled. Enable DEMO_MODE to use mocks.");
  }

  await simulateLatency(350);

  const mock = leaderboardTaggingMock as AILeaderboardTaggingMock;
  
  const tipsCount = params.metrics.tips_received_30d || 0;
  const avgTip = params.metrics.average_tip || 0;

  let primaryBadge = "Community Member";
  let secondaryBadges: string[] = [];

  if (tipsCount > 30 && avgTip > 5) {
    primaryBadge = "Community MVP";
    secondaryBadges = ["Top Helper", "Most Appreciated"];
  } else if (tipsCount > 15) {
    primaryBadge = "Active Contributor";
    secondaryBadges = ["Helper"];
  }

  return {
    ...mock.output,
    primary_badge: primaryBadge,
    secondary_badges: secondaryBadges,
    description: tipsCount > 30
      ? "Recognized for consistent high-value contributions to the community."
      : "Active member of the community.",
  };
}

/**
 * Mock AI Notification Copy Generator
 * Used for recipient notifications
 */
export async function mockAINotificationCopy(params: {
  from_user: string;
  to_user: string;
  amount: number;
  currency?: string;
  message?: string;
}): Promise<AINotificationCopyMock["output"]> {
  if (!isDemoMode()) {
    throw new Error("Mock AI is disabled. Enable DEMO_MODE to use mocks.");
  }

  await simulateLatency(180);

  const mock = notificationCopyMock as AINotificationCopyMock;
  
  const currency = params.currency || "VERY";
  const message = params.message || "for your contribution";

  return {
    ...mock.output,
    title: "You received a tip 🎉",
    body: `${params.from_user} tipped you ${params.amount} ${currency} ${message}.`,
    short_toast: "Tip received ✓",
  };
}

/**
 * Mock AI Gas Optimization
 * Used internally to tune gas sponsorship
 */
export async function mockAIGasOptimization(params: {
  current_gas_price_gwei?: number;
  tips_pending?: number;
  average_tip_value?: number;
}): Promise<AIGasOptimizationMock["output"]> {
  if (!isDemoMode()) {
    throw new Error("Mock AI is disabled. Enable DEMO_MODE to use mocks.");
  }

  await simulateLatency(280);

  const mock = gasOptimizationMock as AIGasOptimizationMock;
  
  const tipsPending = params.tips_pending || 0;
  const shouldBatch = tipsPending >= 5;

  return {
    ...mock.output,
    recommendation: shouldBatch ? "batch_transactions" : "immediate",
    batch_size: shouldBatch ? 5 : 1,
    estimated_savings_percent: shouldBatch ? 37 : 0,
  };
}

/**
 * Get Demo Mode Configuration
 */
export async function getDemoModeConfig(): Promise<AIDemoModeMock> {
  const mock = demoModeMock as AIDemoModeMock;
  return {
    ...mock,
    status: isDemoMode() ? "enabled" : "disabled",
  };
}

// Export convenience function to check demo mode
export { isDemoMode };

