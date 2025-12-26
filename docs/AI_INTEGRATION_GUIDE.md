# AI Integration Guide for VeryTippers

This document describes the comprehensive AI service layer that has been integrated into VeryTippers, combining OpenAI GPT and Hugging Face models to provide intelligent, context-aware features.

## Overview

The AI integration follows a **layered architecture** that:
- Separates AI concerns from core business logic
- Provides graceful fallbacks when OpenAI is unavailable
- Leverages both OpenAI GPT (when available) and Hugging Face models
- Implements intelligent caching to manage API costs

## Architecture

### Service Layer Structure

```
AIService (server/services/AIService.ts)
├── OpenAI Integration (optional, when API key is configured)
│   ├── GPT-4/GPT-3.5 for intelligent tip suggestions
│   └── Personalized leaderboard insights
├── Hugging Face Integration (always available)
│   ├── Content moderation (toxic-bert)
│   ├── Sentiment analysis (twitter-roberta-base-sentiment)
│   └── Content scoring
└── Fallback Logic
    └── Template-based suggestions when OpenAI unavailable
```

### Key Components

1. **AIService** (`server/services/AIService.ts`)
   - Centralized AI service layer
   - Integrates OpenAI and Hugging Face
   - Provides unified interface for all AI features

2. **TipService** (`server/services/TipService.ts`)
   - Enhanced to use AIService for moderation and suggestions
   - New method: `getIntelligentTipSuggestion()` for GPT-powered suggestions

3. **API Endpoints** (`server/index.ts`)
   - `/api/v1/tip/intelligent-suggestion` - GPT-powered tip suggestions
   - `/api/v1/ai/insights/user/:userId` - Personalized leaderboard insights
   - `/api/v1/ai/badges/user/:userId` - Smart badge recommendations

## Features Implemented

### 1. Intelligent Tip Suggestions

**Endpoint:** `POST /api/v1/tip/intelligent-suggestion`

Uses GPT to analyze chat context and suggest:
- Appropriate tip amounts based on content quality and relationship
- Personalized tip messages
- Confidence scores and reasoning

**Example Request:**
```json
{
  "chatContext": "Great analysis of the market trends! Really insightful.",
  "recipientId": "user123",
  "senderId": "user456",
  "recipientName": "Alice"
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "amount": "15",
    "message": "Excellent analysis! This deserves recognition. 🎯",
    "confidence": 0.85,
    "reasoning": "High-quality content with positive sentiment suggests a generous tip."
  }
}
```

### 2. Sentiment & Toxicity Moderation

Enhanced moderation using AIService that:
- Analyzes messages for toxic content (uses Hugging Face toxic-bert)
- Performs sentiment analysis
- Returns structured moderation results

**Integration:** Automatically called during `processTip()` in TipService

### 3. Personalized Leaderboard Insights

**Endpoint:** `GET /api/v1/ai/insights/user/:userId`

Generates weekly personalized summaries using GPT:
- Highlights top supporters and supported creators
- Recognizes streaks and milestones
- Provides actionable recommendations

**Example Response:**
```json
{
  "success": true,
  "data": {
    "summary": "You've been a top supporter this week, sending 12 tips to 8 different creators!",
    "insights": [
      "You're the top supporter of @alice!",
      "Amazing 5-day tipping streak! 🔥"
    ],
    "recommendations": [
      "Try tipping 5 different creators to unlock new badges!",
      "Share the love - consider tipping back to creators who support you!"
    ]
  }
}
```

### 4. Smart Badge Suggestions

**Endpoint:** `GET /api/v1/ai/badges/user/:userId`

Analyzes user behavior to suggest badges and track progress:
- First Steps, Generous Tipper, Community Builder
- Streak Master, Big Spender badges
- Progress tracking for each badge

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "badgeName": "Generous Tipper",
      "reason": "Sent 12 tips to creators",
      "progress": 120
    },
    {
      "badgeName": "Streak Master",
      "reason": "5-day tipping streak!",
      "progress": 16.67
    }
  ]
}
```

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# OpenAI (Optional - for enhanced GPT features)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini  # or gpt-3.5-turbo, gpt-4

# Hugging Face (Required for moderation)
HUGGINGFACE_API_KEY=hf_...
```

### Dependencies

The integration requires:
- `openai` package (optional, automatically installed)
- `@huggingface/inference` (already in dependencies)

Install with:
```bash
pnpm install
```

## Usage Examples

### Using Intelligent Tip Suggestions in Your Bot

```typescript
// In your Verychat bot integration
const response = await fetch('http://localhost:3001/api/v1/tip/intelligent-suggestion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chatContext: userMessage,
    recipientId: targetUserId,
    senderId: senderUserId,
    recipientName: targetUsername
  })
});

const { data } = await response.json();
// data.amount, data.message, data.confidence, data.reasoning
```

### Generating Personalized Insights

```typescript
const response = await fetch(`http://localhost:3001/api/v1/ai/insights/user/${userId}`);
const { data } = await response.json();
// Use data.summary, data.insights, data.recommendations
```

## Cost Management & Caching

The AIService implements intelligent caching to minimize API costs:

- **Tip Suggestions:** 30-minute cache (1800 seconds)
- **Leaderboard Insights:** 1-hour cache (3600 seconds)
- **Content Analysis:** 30-minute cache

Cache keys are based on content hashes and user IDs to ensure accuracy.

## Fallback Behavior

When OpenAI API key is not configured or unavailable:
1. Tip suggestions fall back to Hugging Face models + custom logic
2. Leaderboard insights use template-based summaries
3. All moderation features continue to work (using Hugging Face)

This ensures the platform remains functional even without OpenAI, while providing enhanced features when available.

## Error Handling

The AIService implements graceful error handling:
- API failures fall back to Hugging Face models
- Network errors are caught and logged
- Default suggestions provided when AI services fail
- Never blocks core tipping functionality

## Performance Considerations

- **Async Initialization:** OpenAI client initializes asynchronously to avoid blocking startup
- **Caching:** Aggressive caching reduces API calls and costs
- **Parallel Processing:** Where possible, multiple AI calls are made in parallel
- **Timeout Protection:** Long-running AI calls have reasonable timeouts

## Future Enhancements

Potential additions to the AI service:
- Voice-activated tipping (AssemblyAI integration)
- Advanced badge engine with pattern recognition
- Predictive tip amount suggestions based on user history
- Multi-language support for tip messages

## Testing

To test the AI integration:

1. **Without OpenAI:**
   ```bash
   # Don't set OPENAI_API_KEY - will use Hugging Face fallback
   ```

2. **With OpenAI:**
   ```bash
   export OPENAI_API_KEY=sk-...
   # Will use GPT for enhanced features
   ```

3. **Test Endpoints:**
   - Health check: `GET /health` (shows AI service status)
   - Tip suggestion: `POST /api/v1/tip/intelligent-suggestion`
   - User insights: `GET /api/v1/ai/insights/user/:userId`

## Security Notes

- **Never expose API keys** in frontend code
- All AI API calls happen server-side
- Environment variables stored securely in `.env`
- API keys validated on service initialization

## Support

For issues or questions:
- Check server logs for AI service initialization messages
- Verify environment variables are set correctly
- Ensure OpenAI/Hugging Face API keys are valid
- Review cache behavior if responses seem stale


