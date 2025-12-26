// server/index.ts
import express from "express";
import { createServer } from "http";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// server/services/BlockchainService.ts
import { Wallet, Contract, JsonRpcProvider } from "ethers";

// server/config.ts
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
var config2 = {
  // Server
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3001"),
  API_VERSION: process.env.API_VERSION || "v1",
  // Database
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/verytippers",
  // Verychat Bot
  VERYCHAT_API_URL: process.env.VERYCHAT_API_URL || "https://api.verychat.io/v1",
  VERYCHAT_API_KEY: process.env.VERYCHAT_API_KEY || "",
  VERYCHAT_BOT_TOKEN: process.env.VERYCHAT_BOT_TOKEN || "dummy_token",
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "dummy_secret",
  // Redis
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  // IPFS - Infura
  IPFS_PROJECT_ID: process.env.IPFS_PROJECT_ID || "",
  IPFS_PROJECT_SECRET: process.env.IPFS_PROJECT_SECRET || "",
  // IPFS - Pinata (Free tier: 1GB storage, recommended for demo/hack)
  PINATA_API_KEY: process.env.PINATA_API_KEY || "",
  PINATA_SECRET_API_KEY: process.env.PINATA_SECRET_API_KEY || "",
  PINATA_GATEWAY_URL: process.env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud",
  // Blockchain
  VERY_CHAIN_RPC_URL: process.env.VERY_CHAIN_RPC_URL || "http://localhost:8545",
  SPONSOR_PRIVATE_KEY: process.env.SPONSOR_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001",
  // Contract Addresses
  TIP_CONTRACT_ADDRESS: process.env.TIP_CONTRACT_ADDRESS || "0xTipContractAddress",
  BADGE_CONTRACT_ADDRESS: process.env.BADGE_CONTRACT_ADDRESS || "0xBadgeContractAddress",
  VERY_TOKEN_ADDRESS: process.env.VERY_TOKEN_ADDRESS || "0xVeryTokenAddress",
  // AI/HuggingFace
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || "dummy_hf_key",
  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini"
};

// server/services/BlockchainService.ts
var TIP_CONTRACT_ABI = [
  "function tip(address recipient, address token, uint256 amount, string memory messageHash) external",
  "function totalTipsSent(address) view returns (uint256)",
  "event TipSent(address indexed from, address indexed to, address token, uint256 amount, string messageHash, uint256 tipId)"
];
var BADGE_CONTRACT_ABI = [
  "function checkAndAwardBadges(address user, uint256 totalTipsSent) external"
];
var BlockchainService = class {
  constructor() {
    this.provider = new JsonRpcProvider(config2.VERY_CHAIN_RPC_URL);
    this.relayerWallet = new Wallet(config2.SPONSOR_PRIVATE_KEY, this.provider);
    this.tipContract = new Contract(
      config2.TIP_CONTRACT_ADDRESS,
      TIP_CONTRACT_ABI,
      this.relayerWallet
    );
    this.badgeContract = new Contract(
      config2.BADGE_CONTRACT_ADDRESS,
      BADGE_CONTRACT_ABI,
      this.relayerWallet
    );
  }
  getTipContract() {
    return this.tipContract;
  }
  async sendMetaTransaction(request) {
    console.log(`Relaying meta-transaction from ${request.from}`);
    try {
      const tx = await this.relayerWallet.sendTransaction({
        to: request.to,
        data: request.data,
        gasLimit: 5e5
        // Estimated
      });
      return tx;
    } catch (error) {
      console.error("Error relaying transaction:", error);
      throw error;
    }
  }
  listenToEvents(callback) {
    this.tipContract.on("TipSent", (from, to, token, amount, messageHash, tipId, event) => {
      callback({ from, to, token, amount, messageHash, tipId, event });
    });
  }
  async getTotalTipsSent(userAddress) {
    return await this.tipContract.totalTipsSent(userAddress);
  }
};

// server/services/HuggingFaceService.ts
import { HfInference } from "@huggingface/inference";

// server/services/CacheService.ts
import { createClient } from "redis";
var CacheService = class _CacheService {
  constructor() {
    this.client = createClient({
      url: config2.REDIS_URL
    });
    this.client.on("error", (err) => console.error("Redis Client Error", err));
    this.client.connect().catch((err) => console.error("Failed to connect to Redis", err));
  }
  static getInstance() {
    if (!_CacheService.instance) {
      _CacheService.instance = new _CacheService();
    }
    return _CacheService.instance;
  }
  async get(key) {
    return this.client.get(key);
  }
  async set(key, value, ttlSeconds) {
    await this.client.set(key, value, {
      EX: ttlSeconds
    });
  }
  async del(key) {
    return this.client.del(key);
  }
};

// server/services/HuggingFaceService.ts
var HuggingFaceService = class {
  constructor() {
    this.client = new HfInference(config2.HUGGINGFACE_API_KEY);
    this.cache = CacheService.getInstance();
  }
  getScore(result, label) {
    const item = result.find((r) => r.label === label);
    return item ? item.score : 0;
  }
  async moderateContent(text) {
    const cacheKey = `hf:moderation:${Buffer.from(text).toString("base64").slice(0, 50)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    try {
      const keywords = ["scam", "spam", "offensive_word_placeholder"];
      if (keywords.some((k) => text.toLowerCase().includes(k))) {
        return { isSafe: false, flagged: true, categories: { keyword: 1 }, scores: [1], needsManualReview: true };
      }
      const result = await this.client.textClassification({
        model: "unitary/toxic-bert",
        inputs: text
      });
      const categories = {
        toxic: this.getScore(result, "toxic"),
        severe_toxic: this.getScore(result, "severe_toxic"),
        obscene: this.getScore(result, "obscene"),
        threat: this.getScore(result, "threat"),
        insult: this.getScore(result, "insult"),
        identity_hate: this.getScore(result, "identity_hate")
      };
      const scores = Object.values(categories);
      const maxScore = Math.max(...scores);
      const flagged = maxScore > 0.8;
      const needsManualReview = maxScore > 0.5 && maxScore <= 0.8;
      const moderationResult = {
        isSafe: !flagged && !needsManualReview,
        categories,
        flagged,
        scores,
        needsManualReview
      };
      await this.cache.set(cacheKey, JSON.stringify(moderationResult), 3600);
      return moderationResult;
    } catch (error) {
      console.error("HuggingFace API Error:", error);
      return { isSafe: true, flagged: false, categories: {}, scores: [], needsManualReview: false };
    }
  }
  /**
   * Analyze sentiment of content to help with tip recommendations
   */
  async analyzeSentiment(text) {
    const cacheKey = `hf:sentiment:${Buffer.from(text).toString("base64").slice(0, 50)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    try {
      const result = await this.client.textClassification({
        model: "cardiffnlp/twitter-roberta-base-sentiment-latest",
        inputs: text
      });
      const positive = this.getScore(result, "POSITIVE") || this.getScore(result, "LABEL_2") || 0;
      const negative = this.getScore(result, "NEGATIVE") || this.getScore(result, "LABEL_0") || 0;
      const neutral = this.getScore(result, "NEUTRAL") || this.getScore(result, "LABEL_1") || 0;
      const maxScore = Math.max(positive, negative, neutral);
      let label = "neutral";
      if (maxScore === positive) label = "positive";
      else if (maxScore === negative) label = "negative";
      const sentimentResult = {
        positive,
        negative,
        neutral,
        label,
        score: maxScore
      };
      await this.cache.set(cacheKey, JSON.stringify(sentimentResult), 1800);
      return sentimentResult;
    } catch (error) {
      console.error("HuggingFace Sentiment Analysis Error:", error);
      return { positive: 0.33, negative: 0.33, neutral: 0.34, label: "neutral", score: 0.34 };
    }
  }
  /**
   * Score content quality and engagement potential
   */
  async scoreContent(text, context) {
    const cacheKey = `hf:content-score:${Buffer.from(text + (context?.authorId || "")).toString("base64").slice(0, 50)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    try {
      const sentiment = await this.analyzeSentiment(text);
      const wordCount = text.split(/\s+/).length;
      const hasQuestions = /\?/.test(text);
      const hasEmojis = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(text);
      const hasLinks = /https?:\/\//.test(text);
      let qualityScore = 50;
      if (sentiment.label === "positive") qualityScore += 20;
      else if (sentiment.label === "negative") qualityScore -= 10;
      if (wordCount >= 50 && wordCount <= 200) qualityScore += 15;
      else if (wordCount < 20) qualityScore -= 10;
      let engagementScore = 50;
      if (hasQuestions) engagementScore += 10;
      if (hasEmojis) engagementScore += 5;
      if (hasLinks) engagementScore += 5;
      if (wordCount > 100) engagementScore += 10;
      qualityScore = Math.max(0, Math.min(100, qualityScore));
      engagementScore = Math.max(0, Math.min(100, engagementScore));
      const baseTip = 2;
      const qualityMultiplier = qualityScore / 100;
      const engagementMultiplier = engagementScore / 100;
      const recommendedTipAmount = Math.round(baseTip * (1 + qualityMultiplier * 2) * (1 + engagementMultiplier * 1.5));
      const contentScore = {
        quality: Math.round(qualityScore),
        engagement: Math.round(engagementScore),
        sentiment,
        recommendedTipAmount
      };
      await this.cache.set(cacheKey, JSON.stringify(contentScore), 3600);
      return contentScore;
    } catch (error) {
      console.error("HuggingFace Content Scoring Error:", error);
      return {
        quality: 50,
        engagement: 50,
        sentiment: { positive: 0.33, negative: 0.33, neutral: 0.34, label: "neutral", score: 0.34 },
        recommendedTipAmount: 5
      };
    }
  }
  /**
   * Generate personalized tip message suggestions
   */
  async generateMessageSuggestions(context) {
    const cacheKey = `hf:message-suggestions:${JSON.stringify(context).slice(0, 50)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    try {
      const suggestions = [];
      const recipientName = context.recipientName || "there";
      const amount = context.tipAmount || 5;
      suggestions.push({
        message: `Great work, ${recipientName}! Keep it up! \u{1F680}`,
        tone: "friendly",
        score: 0.9
      });
      suggestions.push({
        message: `Loved this! Thanks for sharing. \u{1F496}`,
        tone: "friendly",
        score: 0.85
      });
      if (amount >= 20) {
        suggestions.push({
          message: `Excellent content. This deserves recognition.`,
          tone: "professional",
          score: 0.8
        });
      }
      suggestions.push({
        message: `This is amazing! ${amount} VERY well deserved! \u{1F389}`,
        tone: "enthusiastic",
        score: 0.88
      });
      suggestions.push({
        message: `Nice one! Keep creating \u{1F525}`,
        tone: "casual",
        score: 0.82
      });
      try {
        const prompt = `Generate 2 short, friendly tip messages (under 50 characters) for someone who created great content. Recipient: ${recipientName}. Tip amount: ${amount} VERY. Make them warm and encouraging.`;
        const generated = await this.client.textGeneration({
          model: "gpt2",
          // Using GPT-2 as fallback (requires API key)
          inputs: prompt,
          parameters: {
            max_new_tokens: 100,
            return_full_text: false,
            temperature: 0.7
          }
        });
        const generatedText = generated.generated_text || "";
        const lines = generatedText.split("\n").filter((line) => line.trim().length > 0 && line.length < 100);
        lines.slice(0, 2).forEach((line, index) => {
          suggestions.push({
            message: line.trim(),
            tone: index % 2 === 0 ? "friendly" : "casual",
            score: 0.75
          });
        });
      } catch (genError) {
        console.log("Using predefined message suggestions");
      }
      const sortedSuggestions = suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
      await this.cache.set(cacheKey, JSON.stringify(sortedSuggestions), 1800);
      return sortedSuggestions;
    } catch (error) {
      console.error("HuggingFace Message Generation Error:", error);
      return [
        { message: "Great work! Keep it up! \u{1F680}", tone: "friendly", score: 0.8 },
        { message: "Loved this content! \u{1F496}", tone: "casual", score: 0.75 },
        { message: "Thanks for sharing this!", tone: "professional", score: 0.7 }
      ];
    }
  }
  /**
   * Generate tip amount suggestions based on content similarity using embeddings
   * This uses a lightweight embedding model to find similar content and suggest amounts
   * based on historical tip patterns (can be enhanced with real dataset)
   */
  async suggestTipAmountFromDataset(content, historicalTips) {
    const cacheKey = `hf:tip-suggestion:${Buffer.from(content).toString("base64").slice(0, 50)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    try {
      const embedding = await this.client.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: content
      });
      if (historicalTips && historicalTips.length > 0) {
        const historicalTexts = historicalTips.map((t) => t.content);
        const historicalEmbeddings = await this.client.featureExtraction({
          model: "sentence-transformers/all-MiniLM-L6-v2",
          inputs: historicalTexts
        });
        const similarities = historicalTips.map((tip, index) => {
          const histEmb = Array.isArray(historicalEmbeddings) ? historicalEmbeddings[index] : historicalEmbeddings[index];
          const contentEmb = Array.isArray(embedding) ? embedding : embedding[0];
          const dotProduct = contentEmb.reduce((sum, val, i) => sum + val * histEmb[i], 0);
          const magnitudeA = Math.sqrt(contentEmb.reduce((sum, val) => sum + val * val, 0));
          const magnitudeB = Math.sqrt(histEmb.reduce((sum, val) => sum + val * val, 0));
          const similarity = dotProduct / (magnitudeA * magnitudeB);
          return {
            amount: tip.amount,
            similarity
          };
        });
        const topSimilar = similarities.sort((a, b) => b.similarity - a.similarity).slice(0, 5).filter((item) => item.similarity > 0.5);
        if (topSimilar.length > 0) {
          const weightedSum = topSimilar.reduce((sum, item) => sum + item.amount * item.similarity, 0);
          const weightSum = topSimilar.reduce((sum, item) => sum + item.similarity, 0);
          const suggestedAmount2 = Math.round(weightedSum / weightSum * 10) / 10;
          const avgSimilarity = topSimilar.reduce((sum, item) => sum + item.similarity, 0) / topSimilar.length;
          const confidence = Math.min(0.95, avgSimilarity);
          const suggestion2 = {
            suggestedAmount: suggestedAmount2,
            confidence,
            reasoning: `Based on ${topSimilar.length} similar historical tips with ${(avgSimilarity * 100).toFixed(0)}% average similarity`,
            similarContentTips: topSimilar
          };
          await this.cache.set(cacheKey, JSON.stringify(suggestion2), 3600);
          return suggestion2;
        }
      }
      const contentScore = await this.scoreContent(content);
      const baseAmount = 2;
      const qualityMultiplier = contentScore.quality / 100;
      const engagementMultiplier = contentScore.engagement / 100;
      const suggestedAmount = Math.round(
        baseAmount * (1 + qualityMultiplier * 2) * (1 + engagementMultiplier * 1.5) * 10
      ) / 10;
      const suggestion = {
        suggestedAmount,
        confidence: 0.6,
        reasoning: `Based on content quality (${contentScore.quality}/100) and engagement score (${contentScore.engagement}/100)`
      };
      await this.cache.set(cacheKey, JSON.stringify(suggestion), 3600);
      return suggestion;
    } catch (error) {
      console.error("Error generating dataset-based tip suggestion:", error);
      try {
        const contentScore = await this.scoreContent(content);
        return {
          suggestedAmount: contentScore.recommendedTipAmount || 5,
          confidence: 0.5,
          reasoning: "Using fallback content scoring method"
        };
      } catch (fallbackError) {
        return {
          suggestedAmount: 5,
          confidence: 0.3,
          reasoning: "Unable to analyze content, using default suggestion"
        };
      }
    }
  }
  /**
   * Load and prepare a dataset for tip suggestions (for offline training/analysis)
   * This method can be used to prepare datasets from Hugging Face for local analysis
   * Example: loadDataset('daily_dialog') for conversational datasets
   */
  async prepareDatasetForTraining(datasetName = "daily_dialog", sampleSize = 1e3) {
    try {
      console.log(`Preparing dataset: ${datasetName} (sample size: ${sampleSize})`);
      return [];
    } catch (error) {
      console.error("Error preparing dataset:", error);
      return [];
    }
  }
};

// server/services/AIService.ts
var AIService = class {
  constructor() {
    this.openai = null;
    this.hfService = new HuggingFaceService();
    this.cache = CacheService.getInstance();
    this.openaiAvailable = false;
    this.openai = null;
    this.initializeOpenAI();
  }
  async initializeOpenAI() {
    if (!config2.OPENAI_API_KEY || config2.OPENAI_API_KEY === "") {
      console.log("OpenAI API key not configured. Using Hugging Face models only.");
      return;
    }
    try {
      const OpenAI = (await import("openai")).default;
      this.openai = new OpenAI({ apiKey: config2.OPENAI_API_KEY });
      this.openaiAvailable = true;
      console.log("OpenAI initialized successfully");
    } catch (error) {
      console.warn("OpenAI package not available or failed to initialize:", error);
      this.openaiAvailable = false;
    }
  }
  /**
   * Generate intelligent tip suggestion based on chat context
   * Uses GPT-4 if available, falls back to Hugging Face models
   */
  async generateTipSuggestion(chatContext, context) {
    if (!this.openai && config2.OPENAI_API_KEY && config2.OPENAI_API_KEY !== "") {
      await this.initializeOpenAI();
    }
    const cacheKey = `ai:tip-suggestion:${Buffer.from(chatContext + JSON.stringify(context || {})).toString("base64").slice(0, 80)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    try {
      if (this.openaiAvailable && this.openai) {
        const prompt = this.buildTipSuggestionPrompt(chatContext, context);
        const completion = await this.openai.chat.completions.create({
          model: config2.OPENAI_MODEL || "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that suggests appropriate tip amounts and personalized messages for a social tipping platform. Analyze the context and provide practical, friendly suggestions."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 200
        });
        const content = completion.choices[0]?.message?.content || "";
        const parsed = this.parseTipSuggestionResponse(content);
        await this.cache.set(cacheKey, JSON.stringify(parsed), 1800);
        return parsed;
      } else {
        return this.generateTipSuggestionFallback(chatContext, context);
      }
    } catch (error) {
      console.error("Error generating tip suggestion with OpenAI:", error);
      return this.generateTipSuggestionFallback(chatContext, context);
    }
  }
  /**
   * Fallback tip suggestion using Hugging Face models
   */
  async generateTipSuggestionFallback(chatContext, context) {
    const [sentiment, contentScore] = await Promise.all([
      this.hfService.analyzeSentiment(chatContext),
      this.hfService.scoreContent(chatContext)
    ]);
    let baseAmount = 5;
    if (contentScore.quality >= 80) baseAmount = 20;
    else if (contentScore.quality >= 60) baseAmount = 10;
    else if (contentScore.quality < 40) baseAmount = 2;
    if (sentiment.label === "positive") baseAmount = Math.round(baseAmount * 1.2);
    else if (sentiment.label === "negative") baseAmount = Math.max(1, Math.round(baseAmount * 0.7));
    if (context?.relationship === "friend" || context?.relationship === "regular") {
      baseAmount = Math.round(baseAmount * 1.3);
    }
    const messageSuggestions = await this.hfService.generateMessageSuggestions({
      recipientName: context?.recipientName,
      contentPreview: chatContext.substring(0, 100),
      tipAmount: baseAmount,
      relationship: context?.relationship
    });
    const bestMessage = messageSuggestions[0]?.message || "Great work! Keep it up! \u{1F680}";
    const confidence = (sentiment.score + contentScore.quality / 100) / 2;
    const suggestion = {
      amount: baseAmount.toString(),
      message: bestMessage,
      confidence: Math.min(0.95, confidence),
      reasoning: `Based on content analysis: Quality ${contentScore.quality}/100, Sentiment: ${sentiment.label} (${Math.round(sentiment.score * 100)}% confidence).`
    };
    return suggestion;
  }
  /**
   * Build prompt for OpenAI tip suggestion
   */
  buildTipSuggestionPrompt(chatContext, context) {
    let prompt = `Analyze this chat message and suggest an appropriate tip amount and personalized message:

"${chatContext}"

`;
    if (context?.recipientName) {
      prompt += `Recipient: ${context.recipientName}
`;
    }
    if (context?.relationship) {
      prompt += `Relationship: ${context.relationship}
`;
    }
    if (context?.previousTips) {
      prompt += `Previous tips to this user: ${context.previousTips}
`;
    }
    if (context?.contentQuality) {
      prompt += `Content quality score: ${context.contentQuality}/100
`;
    }
    prompt += `
Return a JSON object with this exact structure:
`;
    prompt += `{"amount": "suggested_amount_as_string", "message": "personalized_tip_message", "confidence": 0.0-1.0, "reasoning": "brief_explanation"}
`;
    prompt += `Keep the message under 60 characters, friendly, and appropriate for the context.`;
    return prompt;
  }
  /**
   * Parse OpenAI response into TipSuggestion
   */
  parseTipSuggestionResponse(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          amount: parsed.amount?.toString() || "5",
          message: parsed.message || "Great work! Keep it up! \u{1F680}",
          confidence: parsed.confidence || 0.7,
          reasoning: parsed.reasoning || "AI-generated suggestion based on context."
        };
      }
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
    }
    return {
      amount: "5",
      message: "Great work! Keep it up! \u{1F680}",
      confidence: 0.6,
      reasoning: "Unable to parse AI response, using default suggestion."
    };
  }
  /**
   * Moderate message for toxicity and sentiment
   * Delegates to HuggingFaceService
   */
  async moderateMessage(message) {
    const moderation = await this.hfService.moderateContent(message);
    const sentiment = await this.hfService.analyzeSentiment(message);
    return {
      isToxic: moderation.flagged || !moderation.isSafe,
      sentiment: sentiment.label,
      details: moderation
    };
  }
  /**
   * Generate personalized leaderboard insights
   */
  async generateLeaderboardInsight(userId, analytics) {
    if (!this.openai && config2.OPENAI_API_KEY && config2.OPENAI_API_KEY !== "") {
      await this.initializeOpenAI();
    }
    const cacheKey = `ai:leaderboard-insight:${userId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    try {
      if (this.openaiAvailable && this.openai) {
        const prompt = this.buildLeaderboardInsightPrompt(userId, analytics);
        const completion = await this.openai.chat.completions.create({
          model: config2.OPENAI_MODEL || "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a friendly analytics assistant that provides personalized, encouraging insights about user tipping behavior. Keep insights positive, actionable, and under 200 characters each."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 300
        });
        const content = completion.choices[0]?.message?.content || "";
        const parsed = this.parseLeaderboardInsight(content, analytics);
        await this.cache.set(cacheKey, JSON.stringify(parsed), 3600);
        return parsed;
      } else {
        return this.generateLeaderboardInsightFallback(userId, analytics);
      }
    } catch (error) {
      console.error("Error generating leaderboard insight:", error);
      return this.generateLeaderboardInsightFallback(userId, analytics);
    }
  }
  /**
   * Build prompt for leaderboard insights
   */
  buildLeaderboardInsightPrompt(userId, analytics) {
    let prompt = `Generate a personalized weekly summary for a user on a tipping platform.

`;
    prompt += `User Stats:
`;
    prompt += `- Total tips sent: ${analytics.totalTips || 0}
`;
    prompt += `- Total received: ${analytics.totalReceived || 0}
`;
    if (analytics.streak) {
      prompt += `- Current tip streak: ${analytics.streak} days
`;
    }
    if (analytics.topRecipients && analytics.topRecipients.length > 0) {
      prompt += `
Top recipients:
`;
      analytics.topRecipients.slice(0, 3).forEach((r, i) => {
        prompt += `${i + 1}. ${r.name || r.id}: ${r.tipCount} tips, ${r.totalAmount} total
`;
      });
    }
    if (analytics.topSenders && analytics.topSenders.length > 0) {
      prompt += `
Top tippers to this user:
`;
      analytics.topSenders.slice(0, 3).forEach((r, i) => {
        prompt += `${i + 1}. ${r.name || r.id}: ${r.tipCount} tips, ${r.totalAmount} total
`;
      });
    }
    prompt += `
Return a JSON object:
`;
    prompt += `{"summary": "brief_summary_under_150_chars", "insights": ["insight1", "insight2"], "recommendations": ["rec1", "rec2"]}
`;
    prompt += `Make it warm, encouraging, and specific to their activity.`;
    return prompt;
  }
  /**
   * Parse leaderboard insight response
   */
  parseLeaderboardInsight(content, analytics) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || "Your tipping activity this week",
          insights: Array.isArray(parsed.insights) ? parsed.insights : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
        };
      }
    } catch (error) {
      console.error("Error parsing leaderboard insight:", error);
    }
    return this.generateLeaderboardInsightFallback("", analytics);
  }
  /**
   * Fallback template-based leaderboard insights
   */
  generateLeaderboardInsightFallback(userId, analytics) {
    const insights = [];
    const recommendations = [];
    if (analytics.totalTips > 0) {
      insights.push(`You've sent ${analytics.totalTips} tip${analytics.totalTips > 1 ? "s" : ""} this period!`);
    }
    if (analytics.topRecipients && analytics.topRecipients.length > 0) {
      const topRecipient = analytics.topRecipients[0];
      insights.push(`You're the top supporter of ${topRecipient.name || "your favorite creator"}!`);
    }
    if (analytics.streak && analytics.streak >= 3) {
      insights.push(`Amazing ${analytics.streak}-day tipping streak! \u{1F525}`);
    }
    if (analytics.totalTips < 5) {
      recommendations.push("Try tipping 5 different creators to unlock new badges!");
    }
    if (analytics.totalReceived > analytics.totalTips * 2) {
      recommendations.push("Share the love - consider tipping back to creators who support you!");
    }
    const summary = insights.length > 0 ? insights[0] : "Keep up the great work supporting creators!";
    return {
      summary,
      insights: insights.slice(0, 3),
      recommendations: recommendations.slice(0, 2)
    };
  }
  /**
   * Suggest badges based on user behavior
   */
  async suggestBadges(userId, behavior) {
    const suggestions = [];
    if (behavior.tipCount >= 1 && behavior.tipCount < 5) {
      suggestions.push({
        badgeName: "First Steps",
        reason: "Sent your first tip!",
        progress: 100
      });
    }
    if (behavior.tipCount >= 5) {
      suggestions.push({
        badgeName: "Generous Tipper",
        reason: `Sent ${behavior.tipCount} tips to creators`,
        progress: Math.min(100, behavior.tipCount / 10 * 100)
      });
    }
    if (behavior.uniqueRecipients >= 10) {
      suggestions.push({
        badgeName: "Community Builder",
        reason: `Supported ${behavior.uniqueRecipients} different creators`,
        progress: Math.min(100, behavior.uniqueRecipients / 20 * 100)
      });
    }
    if (behavior.streak >= 7) {
      suggestions.push({
        badgeName: "Streak Master",
        reason: `${behavior.streak}-day tipping streak!`,
        progress: Math.min(100, behavior.streak / 30 * 100)
      });
    }
    if (parseFloat(behavior.totalAmount.toString()) >= 100) {
      suggestions.push({
        badgeName: "Big Spender",
        reason: `Tipped over ${behavior.totalAmount} VERY tokens`,
        progress: Math.min(100, parseFloat(behavior.totalAmount.toString()) / 500 * 100)
      });
    }
    return suggestions;
  }
  /**
   * Expose Hugging Face service methods for backward compatibility
   */
  get moderation() {
    return {
      moderateContent: (text) => this.hfService.moderateContent(text),
      analyzeSentiment: (text) => this.hfService.analyzeSentiment(text)
    };
  }
  get content() {
    return {
      scoreContent: (text, context) => this.hfService.scoreContent(text, context),
      generateMessageSuggestions: (context) => this.hfService.generateMessageSuggestions(context)
    };
  }
};

// server/services/VerychatService.ts
import axios from "axios";
var VerychatService = class {
  constructor() {
    this.baseUrl = config2.VERYCHAT_API_URL || "https://api.verychat.io/v1";
    this.apiKey = config2.VERYCHAT_API_KEY || "";
  }
  async getUser(userId) {
    try {
      const response = await axios.get(`${this.baseUrl}/users/${userId}`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${userId} from Verychat:`, error);
      if (!this.apiKey) {
        console.warn("Verychat API Key missing, using mock data");
        if (userId === "userA") return { id: "userA", walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", publicKey: "mockPublicKeyA" };
        if (userId === "userB") return { id: "userB", walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", publicKey: "mockPublicKeyB" };
      }
      return null;
    }
  }
  async sendMessage(userId, message) {
    try {
      await axios.post(`${this.baseUrl}/messages`, {
        recipientId: userId,
        text: message
      }, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      return true;
    } catch (error) {
      console.error(`Error sending message to user ${userId}:`, error);
      return false;
    }
  }
};

// server/services/IpfsService.ts
import { create } from "ipfs-http-client";
import axios2 from "axios";
var IpfsService = class {
  constructor() {
    this.client = null;
    if (config2.PINATA_API_KEY && config2.PINATA_SECRET_API_KEY) {
      this.provider = "pinata";
    } else if (config2.IPFS_PROJECT_ID && config2.IPFS_PROJECT_SECRET) {
      this.provider = "infura";
      const auth = "Basic " + Buffer.from(config2.IPFS_PROJECT_ID + ":" + config2.IPFS_PROJECT_SECRET).toString("base64");
      this.client = create({
        host: "ipfs.infura.io",
        port: 5001,
        protocol: "https",
        headers: {
          authorization: auth
        }
      });
    } else {
      this.provider = "pinata";
    }
  }
  /**
   * Upload content to IPFS using the configured provider (Pinata or Infura)
   */
  async upload(content) {
    if (this.provider === "pinata") {
      return this.uploadToPinata(content);
    }
    if (!this.client) {
      console.warn("IPFS client not configured, returning mock hash");
      return `ipfs://mockhash_${Date.now()}`;
    }
    try {
      const added = await this.client.add(content);
      return `ipfs://${added.path}`;
    } catch (error) {
      console.error("Error uploading to IPFS (Infura):", error);
      throw new Error("Failed to upload to IPFS");
    }
  }
  /**
   * Upload JSON content to Pinata IPFS (free tier: 1GB storage)
   * Documentation: https://docs.pinata.cloud/api-pinning/pin-json
   */
  async uploadToPinata(content) {
    const pinataApiKey = config2.PINATA_API_KEY;
    const pinataSecret = config2.PINATA_SECRET_API_KEY;
    if (!pinataApiKey || !pinataSecret) {
      console.warn("Pinata credentials not configured, returning mock hash");
      return `ipfs://mockhash_${Date.now()}`;
    }
    try {
      let pinataContent;
      try {
        pinataContent = JSON.parse(content);
      } catch {
        pinataContent = { message: content, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
      }
      const response = await axios2.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        { pinataContent },
        {
          headers: {
            "Content-Type": "application/json",
            "pinata_api_key": pinataApiKey,
            "pinata_secret_api_key": pinataSecret
          }
        }
      );
      const cid = response.data.IpfsHash;
      if (!cid) {
        throw new Error("Pinata response missing IpfsHash");
      }
      return `ipfs://${cid}`;
    } catch (error) {
      console.error("Error uploading to Pinata:", error.response?.data || error.message);
      if (config2.NODE_ENV === "development") {
        console.warn("Falling back to mock hash in development");
        return `ipfs://mockhash_${Date.now()}`;
      }
      throw new Error("Failed to upload to Pinata IPFS");
    }
  }
  /**
   * Upload file/buffer to Pinata IPFS
   * Note: For Node.js, you'll need to install 'form-data' package:
   * npm install form-data
   */
  async uploadFile(file, filename) {
    if (this.provider !== "pinata") {
      throw new Error("File upload currently only supported with Pinata provider");
    }
    const pinataApiKey = config2.PINATA_API_KEY;
    const pinataSecret = config2.PINATA_SECRET_API_KEY;
    if (!pinataApiKey || !pinataSecret) {
      console.warn("Pinata credentials not configured, returning mock hash");
      return `ipfs://mockhash_${Date.now()}`;
    }
    try {
      let FormData;
      try {
        const formDataModule = await import("form-data");
        FormData = formDataModule.default || formDataModule.FormData;
      } catch {
        throw new Error("form-data package not installed. Install it with: npm install form-data");
      }
      const formData = new FormData();
      formData.append("file", file, filename || "file");
      const metadata = JSON.stringify({
        name: filename || "uploaded-file"
      });
      formData.append("pinataMetadata", metadata);
      const response = await axios2.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            "pinata_api_key": pinataApiKey,
            "pinata_secret_api_key": pinataSecret
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      const cid = response.data.IpfsHash;
      if (!cid) {
        throw new Error("Pinata response missing IpfsHash");
      }
      return `ipfs://${cid}`;
    } catch (error) {
      console.error("Error uploading file to Pinata:", error.response?.data || error.message);
      throw new Error("Failed to upload file to Pinata IPFS");
    }
  }
  /**
   * Fetch content from IPFS
   */
  async fetch(hash) {
    const cleanHash = hash.replace("ipfs://", "").replace("/ipfs/", "");
    if (this.provider === "pinata" && config2.PINATA_GATEWAY_URL) {
      try {
        const response = await axios2.get(`${config2.PINATA_GATEWAY_URL}/ipfs/${cleanHash}`, {
          timeout: 1e4
        });
        return typeof response.data === "string" ? response.data : JSON.stringify(response.data);
      } catch (error) {
        console.warn("Failed to fetch from Pinata gateway, trying public gateway");
      }
    }
    try {
      const response = await axios2.get(`https://ipfs.io/ipfs/${cleanHash}`, {
        timeout: 1e4
      });
      return typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    } catch (error) {
      console.error("Error fetching from public IPFS gateway:", error);
    }
    if (this.client) {
      try {
        const stream = this.client.cat(cleanHash);
        let data = "";
        for await (const chunk of stream) {
          data += new TextDecoder().decode(chunk);
        }
        return data;
      } catch (error) {
        console.error("Error fetching from Infura IPFS:", error);
      }
    }
    throw new Error("Failed to fetch from IPFS (all methods failed)");
  }
  /**
   * Get the current IPFS provider
   */
  getProvider() {
    return this.provider;
  }
};

// server/services/DatabaseService.ts
import { PrismaClient } from "@prisma/client";
var DatabaseService = class _DatabaseService {
  constructor() {
  }
  static getInstance() {
    if (!_DatabaseService.instance) {
      _DatabaseService.instance = new PrismaClient();
    }
    return _DatabaseService.instance;
  }
};

// server/services/QueueService.ts
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
var connection = new IORedis(config2.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null
});
var tipQueue = new Queue("tip-processing", { connection });
var QueueService = class {
  constructor(processCallback) {
    this.worker = new Worker("tip-processing", processCallback, {
      connection,
      concurrency: 5
    });
    this.worker.on("completed", (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });
    this.worker.on("failed", (job, err) => {
      console.error(`Job ${job?.id} failed with error: ${err.message}`);
    });
  }
  async addTipJob(data) {
    return await tipQueue.add("process-tip", data, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1e3
      }
    });
  }
};

// server/services/TipAnalyticsService.ts
var TipAnalyticsService = class {
  constructor() {
    this.db = DatabaseService.getInstance();
    this.cache = CacheService.getInstance();
  }
  /**
   * Get overall platform statistics
   */
  async getPlatformStats(useCache = true) {
    const cacheKey = "analytics:platform-stats";
    if (useCache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }
    const [totalTips, tips] = await Promise.all([
      this.db.tip.count({ where: { status: "COMPLETED" } }),
      this.db.tip.findMany({
        where: { status: "COMPLETED" },
        include: { sender: true, recipient: true },
        orderBy: { createdAt: "desc" }
      })
    ]);
    let totalAmount = BigInt(0);
    const tokenMap = {};
    tips.forEach((tip) => {
      const amount = BigInt(tip.amount);
      totalAmount += amount;
      if (!tokenMap[tip.token]) {
        tokenMap[tip.token] = { count: 0, total: BigInt(0) };
      }
      tokenMap[tip.token].count++;
      tokenMap[tip.token].total += amount;
    });
    const averageAmount = totalTips > 0 ? totalAmount / BigInt(totalTips) : BigInt(0);
    const uniqueUsers = /* @__PURE__ */ new Set([
      ...tips.map((t) => t.senderId),
      ...tips.map((t) => t.recipientId)
    ]);
    const tipperMap = {};
    tips.forEach((tip) => {
      if (!tipperMap[tip.senderId]) {
        tipperMap[tip.senderId] = { count: 0, total: BigInt(0) };
      }
      tipperMap[tip.senderId].count++;
      tipperMap[tip.senderId].total += BigInt(tip.amount);
    });
    const topTippers = Object.entries(tipperMap).map(([userId, stats2]) => ({
      userId,
      count: stats2.count,
      totalAmount: stats2.total.toString()
    })).sort((a, b) => b.count - a.count).slice(0, 10);
    const recipientMap = {};
    tips.forEach((tip) => {
      if (!recipientMap[tip.recipientId]) {
        recipientMap[tip.recipientId] = { count: 0, total: BigInt(0) };
      }
      recipientMap[tip.recipientId].count++;
      recipientMap[tip.recipientId].total += BigInt(tip.amount);
    });
    const topRecipients = Object.entries(recipientMap).map(([userId, stats2]) => ({
      userId,
      count: stats2.count,
      totalAmount: stats2.total.toString()
    })).sort((a, b) => b.count - a.count).slice(0, 10);
    const tipsByToken = {};
    Object.entries(tokenMap).forEach(([token, stats2]) => {
      tipsByToken[token] = {
        count: stats2.count,
        totalAmount: stats2.total.toString()
      };
    });
    const thirtyDaysAgo = /* @__PURE__ */ new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTips = tips.filter((t) => new Date(t.createdAt) >= thirtyDaysAgo);
    const dayMap = {};
    recentTips.forEach((tip) => {
      const date = new Date(tip.createdAt).toISOString().split("T")[0];
      if (!dayMap[date]) {
        dayMap[date] = { count: 0, total: BigInt(0) };
      }
      dayMap[date].count++;
      dayMap[date].total += BigInt(tip.amount);
    });
    const tipsByDay = Object.entries(dayMap).map(([date, stats2]) => ({
      date,
      count: stats2.count,
      totalAmount: stats2.total.toString()
    })).sort((a, b) => a.date.localeCompare(b.date));
    const stats = {
      totalTips,
      totalAmount: totalAmount.toString(),
      averageAmount: averageAmount.toString(),
      totalUsers: uniqueUsers.size,
      topTippers,
      topRecipients,
      tipsByToken,
      tipsByDay
    };
    await this.cache.set(cacheKey, JSON.stringify(stats), 300);
    return stats;
  }
  /**
   * Get analytics for a specific user
   */
  async getUserAnalytics(userId, useCache = true) {
    const cacheKey = `analytics:user:${userId}`;
    if (useCache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }
    const [sentTips, receivedTips] = await Promise.all([
      this.db.tip.findMany({
        where: { senderId: userId, status: "COMPLETED" },
        include: { recipient: true },
        orderBy: { createdAt: "desc" }
      }),
      this.db.tip.findMany({
        where: { recipientId: userId, status: "COMPLETED" },
        include: { sender: true },
        orderBy: { createdAt: "desc" }
      })
    ]);
    let totalSent = BigInt(0);
    let totalReceived = BigInt(0);
    sentTips.forEach((tip) => {
      totalSent += BigInt(tip.amount);
    });
    receivedTips.forEach((tip) => {
      totalReceived += BigInt(tip.amount);
    });
    const averageSent = sentTips.length > 0 ? totalSent / BigInt(sentTips.length) : BigInt(0);
    const averageReceived = receivedTips.length > 0 ? totalReceived / BigInt(receivedTips.length) : BigInt(0);
    const recipientMap = {};
    sentTips.forEach((tip) => {
      if (!recipientMap[tip.recipientId]) {
        recipientMap[tip.recipientId] = { count: 0, total: BigInt(0) };
      }
      recipientMap[tip.recipientId].count++;
      recipientMap[tip.recipientId].total += BigInt(tip.amount);
    });
    const favoriteRecipients = Object.entries(recipientMap).map(([userId2, stats]) => ({
      userId: userId2,
      count: stats.count,
      totalAmount: stats.total.toString()
    })).sort((a, b) => b.count - a.count).slice(0, 5);
    const senderMap = {};
    receivedTips.forEach((tip) => {
      if (!senderMap[tip.senderId]) {
        senderMap[tip.senderId] = { count: 0, total: BigInt(0) };
      }
      senderMap[tip.senderId].count++;
      senderMap[tip.senderId].total += BigInt(tip.amount);
    });
    const favoriteSenders = Object.entries(senderMap).map(([userId2, stats]) => ({
      userId: userId2,
      count: stats.count,
      totalAmount: stats.total.toString()
    })).sort((a, b) => b.count - a.count).slice(0, 5);
    let tipStreak = 0;
    let lastTipDate = null;
    if (sentTips.length > 0) {
      lastTipDate = sentTips[0].createdAt;
      const sortedByDate = [...sentTips].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      let currentDate = /* @__PURE__ */ new Date();
      currentDate.setHours(0, 0, 0, 0);
      for (const tip of sortedByDate) {
        const tipDate = new Date(tip.createdAt);
        tipDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((currentDate.getTime() - tipDate.getTime()) / (1e3 * 60 * 60 * 24));
        if (daysDiff === tipStreak) {
          tipStreak++;
          currentDate = tipDate;
        } else if (daysDiff > tipStreak) {
          break;
        }
      }
    }
    const analytics = {
      userId,
      tipsSent: sentTips.length,
      tipsReceived: receivedTips.length,
      totalSent: totalSent.toString(),
      totalReceived: totalReceived.toString(),
      averageSent: averageSent.toString(),
      averageReceived: averageReceived.toString(),
      favoriteRecipients,
      favoriteSenders,
      tipStreak,
      lastTipDate
    };
    await this.cache.set(cacheKey, JSON.stringify(analytics), 600);
    return analytics;
  }
  /**
   * Get tip trends over time
   */
  async getTipTrends(period = "day", limit = 30) {
    const cacheKey = `analytics:trends:${period}:${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    const tips = await this.db.tip.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: limit * 10
      // Get more to ensure we have enough data
    });
    const periodMap = {};
    tips.forEach((tip) => {
      const date = new Date(tip.createdAt);
      let key;
      if (period === "day") {
        key = date.toISOString().split("T")[0];
      } else if (period === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }
      if (!periodMap[key]) {
        periodMap[key] = { count: 0, total: BigInt(0) };
      }
      periodMap[key].count++;
      periodMap[key].total += BigInt(tip.amount);
    });
    const trends = Object.entries(periodMap).map(([period2, stats]) => ({
      period: period2,
      count: stats.count,
      totalAmount: stats.total.toString(),
      growth: 0
      // Will calculate below
    })).sort((a, b) => a.period.localeCompare(b.period)).slice(0, limit);
    for (let i = 1; i < trends.length; i++) {
      const prev = trends[i - 1];
      const current = trends[i];
      if (prev.count > 0) {
        current.growth = (current.count - prev.count) / prev.count * 100;
      }
    }
    await this.cache.set(cacheKey, JSON.stringify(trends), 600);
    return trends;
  }
  /**
   * Get real-time tip feed (recent tips)
   */
  async getTipFeed(limit = 20) {
    const cacheKey = `analytics:feed:${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    const tips = await this.db.tip.findMany({
      where: { status: "COMPLETED" },
      include: {
        sender: true,
        recipient: true
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    const feed = tips.map((tip) => ({
      id: tip.id,
      senderId: tip.senderId,
      recipientId: tip.recipientId,
      amount: tip.amount,
      token: tip.token,
      message: tip.message,
      createdAt: tip.createdAt,
      txHash: tip.txHash
    }));
    await this.cache.set(cacheKey, JSON.stringify(feed), 60);
    return feed;
  }
  /**
   * Clear analytics cache (useful after major updates)
   */
  async clearCache(pattern) {
    if (pattern) {
      console.log(`Clearing cache pattern: ${pattern}`);
    } else {
      const keys = ["analytics:platform-stats", "analytics:trends", "analytics:feed"];
      for (const key of keys) {
        await this.cache.del(key);
      }
    }
  }
};

// server/services/TipService.ts
import { ethers as ethers2 } from "ethers";
var TipService = class {
  constructor() {
    this.db = DatabaseService.getInstance();
    this.blockchainService = new BlockchainService();
    this.hfService = new HuggingFaceService();
    this.aiService = new AIService();
    this.verychatService = new VerychatService();
    this.ipfsService = new IpfsService();
    this.analyticsService = new TipAnalyticsService();
    this.queueService = new QueueService(this.processQueueJob.bind(this));
    this.blockchainService.listenToEvents(this.handleBlockchainEvent.bind(this));
  }
  /**
   * Validate tip input parameters
   */
  validateTipInput(senderId, recipientId, amount, token) {
    if (!senderId || !recipientId || !amount || !token) {
      return {
        valid: false,
        error: "Missing required fields: senderId, recipientId, amount, token",
        errorCode: "MISSING_FIELDS"
      };
    }
    if (senderId === recipientId) {
      return {
        valid: false,
        error: "Cannot tip yourself",
        errorCode: "INVALID_RECIPIENT"
      };
    }
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return {
          valid: false,
          error: "Amount must be a positive number",
          errorCode: "INVALID_AMOUNT"
        };
      }
      if (amountNum > 1e6) {
        return {
          valid: false,
          error: "Amount exceeds maximum allowed (1,000,000)",
          errorCode: "AMOUNT_TOO_LARGE"
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: "Invalid amount format",
        errorCode: "INVALID_AMOUNT_FORMAT"
      };
    }
    return { valid: true };
  }
  async encryptMessage(message, recipientPublicKey) {
    if (!message || !recipientPublicKey) {
      return "";
    }
    return `encrypted_${message}_for_${recipientPublicKey}`;
  }
  /**
   * Get AI-powered tip recommendation based on content
   */
  async getTipRecommendation(content, context) {
    try {
      const contentScore = await this.hfService.scoreContent(content, context);
      const recommendedAmount = contentScore.recommendedTipAmount || 5;
      const quality = contentScore.quality;
      const engagement = contentScore.engagement;
      const sentiment = contentScore.sentiment.label;
      const scoreVariance = Math.abs(quality - engagement) / 100;
      const confidence = Math.max(0.5, 1 - scoreVariance);
      let reasoning = `Based on content analysis: Quality score ${quality}/100, Engagement score ${engagement}/100, Sentiment: ${sentiment}.`;
      if (quality >= 80) {
        reasoning += " High-quality content deserves generous tipping.";
      } else if (quality >= 60) {
        reasoning += " Good content with room for improvement.";
      } else {
        reasoning += " Content could benefit from more detail and engagement.";
      }
      return {
        recommendedAmount: recommendedAmount.toString(),
        confidence,
        reasoning,
        contentScore: {
          quality,
          engagement,
          sentiment
        }
      };
    } catch (error) {
      console.error("Error generating tip recommendation:", error);
      return {
        recommendedAmount: "5",
        confidence: 0.5,
        reasoning: "Unable to analyze content. Using default recommendation."
      };
    }
  }
  async processTip(senderId, recipientId, amount, token, message, contentId, options) {
    const validation = this.validateTipInput(senderId, recipientId, amount, token);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.error,
        errorCode: validation.errorCode
      };
    }
    try {
      let sender = await this.db.user.findUnique({ where: { id: senderId } });
      if (!sender) {
        const vUser = await this.verychatService.getUser(senderId);
        if (!vUser) {
          return {
            success: false,
            message: "Sender not found on Verychat.",
            errorCode: "SENDER_NOT_FOUND"
          };
        }
        try {
          sender = await this.db.user.create({
            data: { id: vUser.id, walletAddress: vUser.walletAddress, publicKey: vUser.publicKey }
          });
        } catch (createError) {
          if (createError.code === "P2002") {
            sender = await this.db.user.findUnique({ where: { id: senderId } });
            if (!sender) {
              return {
                success: false,
                message: "Failed to create sender account.",
                errorCode: "USER_CREATION_FAILED"
              };
            }
          } else {
            throw createError;
          }
        }
      }
      let recipient = await this.db.user.findUnique({ where: { id: recipientId } });
      if (!recipient) {
        const vUser = await this.verychatService.getUser(recipientId);
        if (!vUser) {
          return {
            success: false,
            message: "Recipient not found on Verychat.",
            errorCode: "RECIPIENT_NOT_FOUND"
          };
        }
        try {
          recipient = await this.db.user.create({
            data: { id: vUser.id, walletAddress: vUser.walletAddress, publicKey: vUser.publicKey }
          });
        } catch (createError) {
          if (createError.code === "P2002") {
            recipient = await this.db.user.findUnique({ where: { id: recipientId } });
            if (!recipient) {
              return {
                success: false,
                message: "Failed to create recipient account.",
                errorCode: "USER_CREATION_FAILED"
              };
            }
          } else {
            throw createError;
          }
        }
      }
      if (message && !options?.skipModeration) {
        try {
          const moderation = await this.aiService.moderateMessage(message);
          if (moderation.isToxic) {
            return {
              success: false,
              message: "Tip message flagged by content moderation.",
              errorCode: "CONTENT_FLAGGED"
            };
          }
          if (moderation.details.needsManualReview) {
            console.warn(`Tip message requires manual review: ${message.substring(0, 50)}`);
          }
        } catch (moderationError) {
          console.error("Moderation error:", moderationError);
        }
      }
      let tip;
      try {
        tip = await this.db.tip.create({
          data: {
            senderId,
            recipientId,
            amount,
            token,
            message: message || null,
            contentId: contentId || null,
            status: "PENDING"
          }
        });
      } catch (dbError) {
        console.error("Database error creating tip:", dbError);
        return {
          success: false,
          message: "Failed to create tip record.",
          errorCode: "DATABASE_ERROR"
        };
      }
      if (!options?.skipQueue) {
        try {
          await this.queueService.addTipJob({ tipId: tip.id });
        } catch (queueError) {
          console.error("Queue error:", queueError);
          await this.db.tip.update({
            where: { id: tip.id },
            data: { status: "FAILED" }
          });
          return {
            success: false,
            message: "Failed to queue tip for processing.",
            errorCode: "QUEUE_ERROR"
          };
        }
      }
      return {
        success: true,
        tipId: tip.id,
        message: "Tip is being processed asynchronously."
      };
    } catch (error) {
      console.error("Unexpected error processing tip:", error);
      return {
        success: false,
        message: error.message || "An unexpected error occurred.",
        errorCode: "UNEXPECTED_ERROR"
      };
    }
  }
  async processQueueJob(job) {
    const { tipId } = job.data;
    const tip = await this.db.tip.findUnique({
      where: { id: tipId },
      include: { sender: true, recipient: true }
    });
    if (!tip) {
      console.error(`Tip ${tipId} not found in database`);
      return;
    }
    try {
      await this.db.tip.update({ where: { id: tipId }, data: { status: "PROCESSING" } });
      let messageHash = "";
      if (tip.message) {
        try {
          const encrypted = await this.encryptMessage(tip.message, tip.recipient.publicKey);
          messageHash = await this.ipfsService.upload(encrypted);
          await this.db.tip.update({ where: { id: tipId }, data: { messageHash } });
        } catch (ipfsError) {
          console.error(`IPFS upload failed for tip ${tipId}:`, ipfsError);
        }
      }
      try {
        const tipContract = this.blockchainService.getTipContract();
        const amountWei = ethers2.parseUnits(tip.amount, 18);
        const txData = tipContract.interface.encodeFunctionData("tip", [
          tip.recipient.walletAddress,
          tip.token,
          amountWei,
          messageHash
        ]);
        const txResponse = await this.blockchainService.sendMetaTransaction({
          from: tip.sender.walletAddress,
          to: config2.TIP_CONTRACT_ADDRESS,
          data: txData,
          signature: "0x_user_signature_placeholder"
          // In real app, signature comes from frontend
        });
        await this.db.tip.update({
          where: { id: tipId },
          data: { txHash: txResponse.hash }
        });
        const confirmationPromise = txResponse.wait();
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Transaction confirmation timeout")), 6e4)
        );
        await Promise.race([confirmationPromise, timeoutPromise]);
        await this.analyticsService.clearCache();
      } catch (blockchainError) {
        console.error(`Blockchain transaction failed for tip ${tipId}:`, blockchainError);
        throw blockchainError;
      }
    } catch (error) {
      console.error(`Error processing tip ${tipId}:`, error);
      await this.db.tip.update({ where: { id: tipId }, data: { status: "FAILED" } });
      const retriableErrors = ["TIMEOUT", "NETWORK_ERROR", "RATE_LIMIT"];
      const shouldRetry = retriableErrors.some((code) => error.message?.includes(code));
      if (!shouldRetry) {
        console.error(`Non-retriable error for tip ${tipId}, marking as failed permanently`);
      } else {
        throw error;
      }
    }
  }
  async handleBlockchainEvent(eventData) {
    try {
      const { from, to, amount, messageHash, txHash } = eventData;
      console.log(`Received TipSent event: ${txHash}`);
      const tip = await this.db.tip.findFirst({
        where: {
          sender: { walletAddress: from },
          recipient: { walletAddress: to },
          messageHash: messageHash || null,
          status: "PROCESSING"
        }
      });
      if (tip) {
        await this.db.tip.update({
          where: { id: tip.id },
          data: { status: "COMPLETED", txHash: eventData.event?.transactionHash || txHash }
        });
        if (tip.contentId) {
          try {
            const content = await this.db.content.findUnique({ where: { id: tip.contentId } });
            if (content) {
              const currentEarnings = ethers2.parseUnits(content.totalEarnings || "0", 18);
              const tipAmount = ethers2.parseUnits(tip.amount, 18);
              const newEarnings = currentEarnings + tipAmount;
              const newEarningsString = ethers2.formatUnits(newEarnings, 18);
              const viewCount = content.viewCount || 0;
              const tipCount = (content.totalTips || 0) + 1;
              const viewsPerTip = viewCount > 0 ? tipCount / viewCount : 0;
              const earnings = parseFloat(newEarningsString) || 0;
              const viewScore = Math.min(1, viewCount / 1e3);
              const tipScore = Math.min(1, viewsPerTip * 10);
              const earningsScore = Math.min(1, earnings / 100);
              const engagementScore = Math.round((viewScore * 0.4 + tipScore * 0.3 + earningsScore * 0.3) * 100) / 100;
              await this.db.content.update({
                where: { id: tip.contentId },
                data: {
                  totalEarnings: newEarningsString,
                  totalTips: { increment: 1 },
                  engagementScore
                }
              });
            }
          } catch (contentError) {
            console.error(`Error updating content earnings for tip ${tip.id}:`, contentError);
          }
        }
        await this.analyticsService.clearCache();
        this.verychatService.sendMessage(
          tip.senderId,
          `Your tip of ${tip.amount} ${tip.token} was successful! Tx: ${txHash?.slice(0, 10)}...`
        ).catch((err) => console.error("Failed to notify sender:", err));
        this.verychatService.sendMessage(
          tip.recipientId,
          `You received a tip of ${tip.amount} ${tip.token}! \u{1F389}`
        ).catch((err) => console.error("Failed to notify recipient:", err));
      } else {
        console.warn(`No matching tip found for event: ${txHash}`);
      }
    } catch (error) {
      console.error("Error handling blockchain event:", error);
    }
  }
  /**
   * Get tip status by ID
   */
  async getTipStatus(tipId) {
    const tip = await this.db.tip.findUnique({
      where: { id: tipId },
      include: { sender: true, recipient: true }
    });
    if (!tip) return null;
    return {
      tip: {
        id: tip.id,
        senderId: tip.senderId,
        recipientId: tip.recipientId,
        amount: tip.amount,
        token: tip.token,
        message: tip.message,
        createdAt: tip.createdAt
      },
      status: tip.status
    };
  }
};

// server/services/ContentService.ts
var ContentService = class {
  constructor() {
    this.db = DatabaseService.getInstance();
    this.hfService = new HuggingFaceService();
    this.ipfsService = new IpfsService();
    this.tipService = new TipService();
  }
  /**
   * Create new AI-generated content with monetization settings
   */
  async createContent(input) {
    try {
      let creator = await this.db.user.findUnique({ where: { id: input.creatorId } });
      if (!creator) {
        return { success: false, message: "Creator not found" };
      }
      let qualityScore = null;
      if (input.contentText) {
        qualityScore = await this.assessContentQuality(input.contentText);
      }
      let contentHash;
      if (input.contentText) {
        const contentData = JSON.stringify({
          title: input.title,
          description: input.description,
          text: input.contentText,
          contentType: input.contentType || "TEXT",
          aiModel: input.aiModel,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        contentHash = await this.ipfsService.upload(contentData);
      }
      const content = await this.db.content.create({
        data: {
          creatorId: input.creatorId,
          title: input.title,
          description: input.description,
          contentText: input.contentText,
          contentHash,
          contentType: input.contentType || "TEXT",
          isAI: input.isAI ?? true,
          aiModel: input.aiModel,
          qualityScore: qualityScore?.overall,
          monetizationType: input.monetizationType || "TIP",
          price: input.price,
          token: input.token,
          isPremium: input.isPremium ?? false,
          isPublished: false
          // Requires review/publishing step
        }
      });
      return { success: true, contentId: content.id };
    } catch (error) {
      console.error("Error creating content:", error);
      return { success: false, message: "Failed to create content" };
    }
  }
  /**
   * Assess content quality using AI models
   */
  async assessContentQuality(contentText) {
    try {
      const moderationResult = await this.hfService.moderateContent(contentText);
      const words = contentText.split(/\s+/).length;
      const sentences = contentText.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
      const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;
      const readability = Math.min(1, Math.max(0, 1 - Math.abs(avgWordsPerSentence - 15) / 30));
      const hasQuestions = contentText.includes("?");
      const hasExclamations = contentText.includes("!");
      const hasNumbers = /\d/.test(contentText);
      const engagement = Math.min(1, readability * 0.4 + (hasQuestions ? 0.2 : 0) + (hasExclamations ? 0.2 : 0) + (hasNumbers ? 0.2 : 0));
      const uniqueWords = new Set(contentText.toLowerCase().split(/\W+/)).size;
      const totalWords = contentText.split(/\W+/).filter((w) => w.length > 0).length;
      const uniqueness = totalWords > 0 ? uniqueWords / totalWords : 0;
      const originality = Math.min(1, uniqueness * 0.8 + (contentText.length > 500 ? 0.2 : 0));
      const safetyScore = moderationResult.isSafe ? 1 : 0.5;
      const monetizationPotential = readability * 0.25 + engagement * 0.35 + originality * 0.25 + safetyScore * 0.15;
      const overall = readability * 0.3 + engagement * 0.3 + originality * 0.2 + safetyScore * 0.2;
      return {
        overall: Math.round(overall * 100) / 100,
        readability: Math.round(readability * 100) / 100,
        engagement: Math.round(engagement * 100) / 100,
        originality: Math.round(originality * 100) / 100,
        monetizationPotential: Math.round(monetizationPotential * 100) / 100
      };
    } catch (error) {
      console.error("Error assessing content quality:", error);
      return {
        overall: 0.5,
        readability: 0.5,
        engagement: 0.5,
        originality: 0.5,
        monetizationPotential: 0.5
      };
    }
  }
  /**
   * Publish content (make it available for monetization)
   */
  async publishContent(contentId) {
    try {
      const content = await this.db.content.findUnique({ where: { id: contentId } });
      if (!content) {
        return { success: false, message: "Content not found" };
      }
      if (content.contentText) {
        const moderationResult = await this.hfService.moderateContent(content.contentText);
        if (moderationResult.flagged) {
          return { success: false, message: "Content cannot be published due to moderation issues" };
        }
      }
      await this.db.content.update({
        where: { id: contentId },
        data: { isPublished: true }
      });
      return { success: true };
    } catch (error) {
      console.error("Error publishing content:", error);
      return { success: false, message: "Failed to publish content" };
    }
  }
  /**
   * Record content view
   */
  async recordView(contentId, userId) {
    try {
      await this.db.content.update({
        where: { id: contentId },
        data: {
          viewCount: { increment: 1 }
        }
      });
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const existingAnalytics = await this.db.contentAnalytics.findFirst({
        where: {
          contentId,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1e3)
          }
        }
      });
      if (existingAnalytics) {
        await this.db.contentAnalytics.update({
          where: { id: existingAnalytics.id },
          data: { views: { increment: 1 } }
        });
      } else {
        await this.db.contentAnalytics.create({
          data: {
            contentId,
            date: today,
            views: 1
          }
        });
      }
    } catch (error) {
      console.error("Error recording view:", error);
      await this.db.content.update({
        where: { id: contentId },
        data: { viewCount: { increment: 1 } }
      });
    }
  }
  /**
   * Tip content creator for specific content
   */
  async tipContent(senderId, contentId, amount, token, message) {
    try {
      const content = await this.db.content.findUnique({
        where: { id: contentId },
        include: { creator: true }
      });
      if (!content) {
        return { success: false, message: "Content not found" };
      }
      if (!content.isPublished) {
        return { success: false, message: "Content is not published" };
      }
      const tipResult = await this.tipService.processTip(
        senderId,
        content.creatorId,
        amount,
        token,
        message,
        contentId,
        void 0
        // options
      );
      if (!tipResult.success) {
        return tipResult;
      }
      return { success: true, tipId: tipResult.tipId };
    } catch (error) {
      console.error("Error tipping content:", error);
      return { success: false, message: "Failed to process tip" };
    }
  }
  /**
   * Calculate engagement score for content
   */
  calculateEngagementScore(viewCount, tipCount, totalEarnings) {
    const viewsPerTip = viewCount > 0 ? tipCount / viewCount : 0;
    const earnings = parseFloat(totalEarnings) || 0;
    const viewScore = Math.min(1, viewCount / 1e3);
    const tipScore = Math.min(1, viewsPerTip * 10);
    const earningsScore = Math.min(1, earnings / 100);
    return Math.round((viewScore * 0.4 + tipScore * 0.3 + earningsScore * 0.3) * 100) / 100;
  }
  /**
   * Get content analytics
   */
  async getContentAnalytics(contentId) {
    try {
      const content = await this.db.content.findUnique({
        where: { id: contentId },
        include: {
          tips: {
            include: { sender: true },
            where: { status: "COMPLETED" }
          }
        }
      });
      if (!content) {
        return null;
      }
      const tips = content.tips.filter((t) => t.status === "COMPLETED");
      const totalTipAmount = tips.reduce((sum, tip) => sum + parseFloat(tip.amount || "0"), 0);
      const averageTipAmount = tips.length > 0 ? (totalTipAmount / tips.length).toFixed(6) : "0";
      const contributorMap = /* @__PURE__ */ new Map();
      tips.forEach((tip) => {
        const current = contributorMap.get(tip.senderId) || 0;
        contributorMap.set(tip.senderId, current + parseFloat(tip.amount || "0"));
      });
      const topContributors = Array.from(contributorMap.entries()).map(([userId, totalTipped]) => ({ userId, totalTipped: totalTipped.toFixed(6) })).sort((a, b) => parseFloat(b.totalTipped) - parseFloat(a.totalTipped)).slice(0, 10);
      return {
        totalEarnings: content.totalEarnings || "0",
        totalTips: content.totalTips,
        viewCount: content.viewCount,
        engagementScore: content.engagementScore,
        averageTipAmount,
        topContributors
      };
    } catch (error) {
      console.error("Error getting content analytics:", error);
      return null;
    }
  }
  /**
   * Get recommended content based on monetization potential
   */
  async getRecommendedContent(limit = 10) {
    try {
      const content = await this.db.content.findMany({
        where: {
          isPublished: true
        },
        include: {
          creator: true
        },
        orderBy: [
          { engagementScore: "desc" },
          { qualityScore: "desc" },
          { totalEarnings: "desc" }
        ],
        take: limit
      });
      return content;
    } catch (error) {
      console.error("Error getting recommended content:", error);
      return [];
    }
  }
  /**
   * Create subscription for creator's premium content
   */
  async createSubscription(subscriberId, creatorId, amount, token) {
    try {
      const existing = await this.db.contentSubscription.findUnique({
        where: {
          subscriberId_creatorId: {
            subscriberId,
            creatorId
          }
        }
      });
      if (existing && existing.status === "ACTIVE") {
        return { success: false, message: "Active subscription already exists" };
      }
      const endDate = /* @__PURE__ */ new Date();
      endDate.setDate(endDate.getDate() + 30);
      const subscription = await this.db.contentSubscription.upsert({
        where: {
          subscriberId_creatorId: {
            subscriberId,
            creatorId
          }
        },
        create: {
          subscriberId,
          creatorId,
          token,
          amount,
          status: "ACTIVE",
          endDate
        },
        update: {
          status: "ACTIVE",
          startDate: /* @__PURE__ */ new Date(),
          endDate,
          amount,
          token
        }
      });
      return { success: true, subscriptionId: subscription.id };
    } catch (error) {
      console.error("Error creating subscription:", error);
      return { success: false, message: "Failed to create subscription" };
    }
  }
  /**
   * Check if user has access to premium content
   */
  async hasAccessToContent(userId, contentId) {
    try {
      const content = await this.db.content.findUnique({
        where: { id: contentId }
      });
      if (!content) {
        return false;
      }
      if (content.monetizationType === "FREE" || content.creatorId === userId) {
        return true;
      }
      if (content.isPremium || content.monetizationType === "SUBSCRIPTION") {
        const subscription = await this.db.contentSubscription.findUnique({
          where: {
            subscriberId_creatorId: {
              subscriberId: userId,
              creatorId: content.creatorId
            }
          }
        });
        if (!subscription || subscription.status !== "ACTIVE") {
          return false;
        }
        if (subscription.endDate && subscription.endDate < /* @__PURE__ */ new Date()) {
          return false;
        }
        return true;
      }
      return true;
    } catch (error) {
      console.error("Error checking content access:", error);
      return false;
    }
  }
};

// server/index.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var tipService = new TipService();
var contentService = new ContentService();
var analyticsService = new TipAnalyticsService();
var hfService = new HuggingFaceService();
async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "OK",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      version: "1.0.0",
      services: {
        backend: "running",
        ai: "HuggingFaceService",
        web3: "BlockchainService"
      }
    });
  });
  app.post("/api/v1/tip", async (req, res) => {
    const { senderId, recipientId, amount, token, message, contentId } = req.body;
    if (!senderId || !recipientId || !amount || !token) {
      return res.status(400).json({ success: false, message: "Missing required fields: senderId, recipientId, amount, token" });
    }
    try {
      const result = await tipService.processTip(senderId, recipientId, amount, token, message, contentId);
      if (result.success) {
        res.status(200).json({
          success: true,
          message: `Tip sent successfully! Tx Hash: ${result.txHash}`,
          data: result
        });
      } else {
        const statusCode = result.errorCode === "CONTENT_FLAGGED" ? 403 : 400;
        res.status(statusCode).json({
          success: false,
          message: result.message || "Tip failed due to an unknown error.",
          errorCode: result.errorCode
        });
      }
    } catch (error) {
      console.error("Error processing tip:", error);
      res.status(500).json({ success: false, message: "Internal server error during tip processing." });
    }
  });
  app.get("/api/v1/tip/:tipId", async (req, res) => {
    const { tipId } = req.params;
    try {
      const result = await tipService.getTipStatus(tipId);
      if (result) {
        res.status(200).json({ success: true, data: result });
      } else {
        res.status(404).json({ success: false, message: "Tip not found" });
      }
    } catch (error) {
      console.error("Error fetching tip status:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });
  app.post("/api/v1/tip/recommendation", async (req, res) => {
    const { content, authorId, contentType } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: "Content is required" });
    }
    try {
      const recommendation = await tipService.getTipRecommendation(content, { authorId, contentType });
      res.status(200).json({ success: true, data: recommendation });
    } catch (error) {
      console.error("Error generating tip recommendation:", error);
      res.status(500).json({ success: false, message: "Failed to generate recommendation" });
    }
  });
  app.post("/api/v1/tip/message-suggestions", async (req, res) => {
    const { recipientName, contentPreview, tipAmount, relationship } = req.body;
    try {
      const suggestions = await hfService.generateMessageSuggestions({
        recipientName,
        contentPreview,
        tipAmount,
        relationship
      });
      res.status(200).json({ success: true, data: suggestions });
    } catch (error) {
      console.error("Error generating message suggestions:", error);
      res.status(500).json({ success: false, message: "Failed to generate suggestions" });
    }
  });
  app.post("/api/v1/tip/dataset-suggestion", async (req, res) => {
    const { content, historicalTips } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: "Content is required" });
    }
    try {
      const suggestion = await hfService.suggestTipAmountFromDataset(content, historicalTips);
      res.status(200).json({ success: true, data: suggestion });
    } catch (error) {
      console.error("Error generating dataset-based suggestion:", error);
      res.status(500).json({ success: false, message: "Failed to generate dataset-based suggestion" });
    }
  });
  app.post("/api/v1/ai/analyze-content", async (req, res) => {
    const { content, authorId, contentType } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: "Content is required" });
    }
    try {
      const [sentiment, contentScore] = await Promise.all([
        hfService.analyzeSentiment(content),
        hfService.scoreContent(content, { authorId, contentType })
      ]);
      res.status(200).json({
        success: true,
        data: {
          sentiment,
          contentScore
        }
      });
    } catch (error) {
      console.error("Error analyzing content:", error);
      res.status(500).json({ success: false, message: "Failed to analyze content" });
    }
  });
  app.get("/api/v1/analytics/platform", async (req, res) => {
    try {
      const stats = await analyticsService.getPlatformStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
  });
  app.get("/api/v1/analytics/user/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      const analytics = await analyticsService.getUserAnalytics(userId);
      res.status(200).json({ success: true, data: analytics });
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      res.status(500).json({ success: false, message: "Failed to fetch user analytics" });
    }
  });
  app.get("/api/v1/analytics/trends", async (req, res) => {
    const period = req.query.period || "day";
    const limit = parseInt(req.query.limit) || 30;
    try {
      const trends = await analyticsService.getTipTrends(period, limit);
      res.status(200).json({ success: true, data: trends });
    } catch (error) {
      console.error("Error fetching trends:", error);
      res.status(500).json({ success: false, message: "Failed to fetch trends" });
    }
  });
  app.get("/api/v1/feed", async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    try {
      const feed = await analyticsService.getTipFeed(limit);
      res.status(200).json({ success: true, data: feed });
    } catch (error) {
      console.error("Error fetching tip feed:", error);
      res.status(500).json({ success: false, message: "Failed to fetch feed" });
    }
  });
  app.post("/api/v1/content", async (req, res) => {
    const { creatorId, title, description, contentText, contentType, isAI, aiModel, monetizationType, price, token, isPremium } = req.body;
    if (!creatorId || !title) {
      return res.status(400).json({ success: false, message: "Missing required fields: creatorId, title" });
    }
    try {
      const result = await contentService.createContent({
        creatorId,
        title,
        description,
        contentText,
        contentType,
        isAI,
        aiModel,
        monetizationType,
        price,
        token,
        isPremium
      });
      if (result.success) {
        res.status(201).json({
          success: true,
          contentId: result.contentId,
          message: "Content created successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || "Failed to create content"
        });
      }
    } catch (error) {
      console.error("Error creating content:", error);
      res.status(500).json({ success: false, message: "Internal server error during content creation." });
    }
  });
  app.post("/api/v1/content/:contentId/publish", async (req, res) => {
    const { contentId } = req.params;
    try {
      const result = await contentService.publishContent(contentId);
      if (result.success) {
        res.status(200).json({ success: true, message: "Content published successfully" });
      } else {
        res.status(400).json({ success: false, message: result.message || "Failed to publish content" });
      }
    } catch (error) {
      console.error("Error publishing content:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  app.post("/api/v1/content/:contentId/tip", async (req, res) => {
    const { contentId } = req.params;
    const { senderId, amount, token, message } = req.body;
    if (!senderId || !amount || !token) {
      return res.status(400).json({ success: false, message: "Missing required fields: senderId, amount, token" });
    }
    try {
      const result = await contentService.tipContent(senderId, contentId, amount, token, message);
      if (result.success) {
        res.status(200).json({ success: true, tipId: result.tipId, message: "Tip sent successfully" });
      } else {
        res.status(400).json({ success: false, message: result.message || "Failed to process tip" });
      }
    } catch (error) {
      console.error("Error tipping content:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  app.get("/api/v1/content/:contentId/analytics", async (req, res) => {
    const { contentId } = req.params;
    try {
      const analytics = await contentService.getContentAnalytics(contentId);
      if (analytics) {
        res.status(200).json({ success: true, data: analytics });
      } else {
        res.status(404).json({ success: false, message: "Content not found" });
      }
    } catch (error) {
      console.error("Error getting content analytics:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  app.get("/api/v1/content/recommended", async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    try {
      const content = await contentService.getRecommendedContent(limit);
      res.status(200).json({ success: true, data: content, count: content.length });
    } catch (error) {
      console.error("Error getting recommended content:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  app.post("/api/v1/subscriptions", async (req, res) => {
    const { subscriberId, creatorId, amount, token } = req.body;
    if (!subscriberId || !creatorId || !amount || !token) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    try {
      const result = await contentService.createSubscription(subscriberId, creatorId, amount, token);
      if (result.success) {
        res.status(201).json({ success: true, subscriptionId: result.subscriptionId, message: "Subscription created" });
      } else {
        res.status(400).json({ success: false, message: result.message || "Failed to create subscription" });
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  app.get("/api/v1/content/:contentId/access/:userId", async (req, res) => {
    const { contentId, userId } = req.params;
    try {
      const hasAccess = await contentService.hasAccessToContent(userId, contentId);
      res.status(200).json({ success: true, hasAccess });
    } catch (error) {
      console.error("Error checking content access:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  app.post("/api/v1/content/:contentId/view", async (req, res) => {
    const { contentId } = req.params;
    const { userId } = req.body;
    try {
      await contentService.recordView(contentId, userId);
      res.status(200).json({ success: true, message: "View recorded" });
    } catch (error) {
      console.error("Error recording view:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  const staticPath = process.env.NODE_ENV === "production" ? path2.resolve(__dirname2, "public") : path2.resolve(__dirname2, "..", "dist", "public");
  app.use(express.static(staticPath));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return;
    }
    res.sendFile(path2.join(staticPath, "index.html"));
  });
  const port = config2.PORT;
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`Environment: ${config2.NODE_ENV}`);
  });
}
startServer().catch(console.error);
