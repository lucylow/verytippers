// TypeScript types for AI mock responses

export interface AITipSuggestionMock {
  type: "ai_tip_suggestion";
  input: {
    command: string;
    context: {
      chat_platform: string;
      channel_type: string;
      sender_username: string;
      recipient_username: string;
      recent_messages: string[];
    };
  };
  output: {
    suggested_amount: number;
    currency: string;
    confidence: number;
    suggested_message: string;
    reasoning_summary: string;
  };
  ui_hints: {
    display_style: string;
    accept_button: string;
    edit_button: string;
    badge: string;
  };
}

export interface AITipPolicyEvaluationMock {
  type: "ai_tip_policy_evaluation";
  input: {
    from_user: string;
    to_user: string;
    amount: number;
    currency: string;
    historical_context: {
      tips_last_24h: number;
      total_amount_24h: number;
      account_age_days: number;
    };
  };
  output: {
    allowed: boolean;
    risk_score: number;
    flags: string[];
    decision: "approved" | "rejected" | "pending_review";
    explanation: string;
  };
  policy_thresholds: {
    max_single_tip: number;
    max_daily_amount: number;
    risk_cutoff: number;
  };
}

export interface AIAbuseDetectionMock {
  type: "ai_abuse_detection";
  input: {
    from_user: string;
    to_user: string;
    amount: number;
    currency: string;
    recent_behavior: {
      tips_last_hour: number;
      unique_recipients: number;
      account_age_days: number;
    };
  };
  output: {
    risk_score: number;
    classification: "potential_spam" | "suspicious" | "normal";
    recommended_action: "manual_review" | "allow" | "block";
    explanation: string;
  };
}

export interface AIMessageToneAnalysisMock {
  type: "ai_message_tone_analysis";
  input: {
    message: string;
  };
  output: {
    tone: "positive" | "neutral" | "negative";
    emotion: string;
    confidence: number;
    labels: string[];
  };
}

export interface AILeaderboardTaggingMock {
  type: "ai_leaderboard_tagging";
  input: {
    user: string;
    metrics: {
      tips_received_30d: number;
      unique_tippers: number;
      average_tip: number;
    };
  };
  output: {
    primary_badge: string;
    secondary_badges: string[];
    description: string;
  };
}

export interface AINotificationCopyMock {
  type: "ai_notification_copy";
  input: {
    from_user: string;
    to_user: string;
    amount: number;
    currency: string;
    message: string;
  };
  output: {
    title: string;
    body: string;
    short_toast: string;
    confidence: number;
  };
}

export interface AIGasOptimizationMock {
  type: "ai_gas_optimization";
  input: {
    current_gas_price_gwei: number;
    tips_pending: number;
    average_tip_value: number;
  };
  output: {
    recommendation: "batch_transactions" | "immediate" | "wait";
    estimated_savings_percent: number;
    batch_size: number;
    explanation: string;
  };
}

export interface AIDemoModeMock {
  type: "ai_demo_mode";
  status: "enabled" | "disabled";
  mock_latency_ms: number;
  responses: {
    tip_suggestion: string;
    policy_check: string;
    notification: string;
  };
}


