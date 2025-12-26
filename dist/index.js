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
      const openaiModule = await import("openai");
      const OpenAI = openaiModule.default || openaiModule;
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
          model: config2.OPENAI_MODEL || "gpt-4o-mini",
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
          model: config2.OPENAI_MODEL || "gpt-4o-mini",
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
        FormData = formDataModule.default || formDataModule;
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

// server/services/BadgeEngine.ts
import { HfInference as HfInference2 } from "@huggingface/inference";
import { z } from "zod";
var BadgeSchema = z.object({
  id: z.string(),
  badgeId: z.string(),
  name: z.string(),
  emoji: z.string(),
  rarity: z.enum(["bronze", "silver", "gold", "platinum", "diamond"]),
  description: z.string(),
  criteria: z.object({
    type: z.enum(["milestone", "streak", "pattern", "support", "volume"]),
    threshold: z.number(),
    period: z.enum(["daily", "weekly", "monthly", "all-time"])
  }),
  awardedAt: z.string().datetime().optional(),
  isActive: z.boolean().optional()
});
var BADGE_CATEGORIES = {
  milestones: [
    { badgeId: "first-tip", name: "First Tip", emoji: "\u{1F389}", rarity: "bronze", criteria: { type: "milestone", threshold: 1, period: "all-time" }, description: "Sent your first tip!" },
    { badgeId: "tip-10", name: "Tip Master", emoji: "\u{1F947}", rarity: "silver", criteria: { type: "milestone", threshold: 10, period: "all-time" }, description: "Sent 10 tips" },
    { badgeId: "tip-50", name: "Tip Veteran", emoji: "\u2B50", rarity: "gold", criteria: { type: "milestone", threshold: 50, period: "all-time" }, description: "Sent 50 tips" },
    { badgeId: "tip-100", name: "Tipping Legend", emoji: "\u{1F3C6}", rarity: "gold", criteria: { type: "milestone", threshold: 100, period: "all-time" }, description: "Sent 100 tips" },
    { badgeId: "tip-1000", name: "Whale Tipper", emoji: "\u{1F40B}", rarity: "diamond", criteria: { type: "milestone", threshold: 1e3, period: "all-time" }, description: "Sent 1000 tips" }
  ],
  streaks: [
    { badgeId: "daily-streak-7", name: "Week Streaker", emoji: "\u{1F525}", rarity: "bronze", criteria: { type: "streak", threshold: 7, period: "daily" }, description: "7 day tipping streak" },
    { badgeId: "daily-streak-30", name: "Month Master", emoji: "\u{1F4C5}", rarity: "silver", criteria: { type: "streak", threshold: 30, period: "daily" }, description: "30 day tipping streak" },
    { badgeId: "daily-streak-100", name: "Century Streak", emoji: "\u{1F4AF}", rarity: "gold", criteria: { type: "streak", threshold: 100, period: "daily" }, description: "100 day tipping streak" }
  ],
  patterns: [
    { badgeId: "micro-tipper", name: "Micro Master", emoji: "\u{1F48E}", rarity: "silver", criteria: { type: "pattern", threshold: 50, period: "monthly" }, description: "50+ micro tips in a month" },
    { badgeId: "generous", name: "Big Spender", emoji: "\u{1F4B0}", rarity: "gold", criteria: { type: "pattern", threshold: 100, period: "monthly" }, description: "100+ VERY in tips per month" },
    { badgeId: "early-bird", name: "Early Bird", emoji: "\u{1F305}", rarity: "bronze", criteria: { type: "pattern", threshold: 10, period: "monthly" }, description: "Tips before 9AM" },
    { badgeId: "night-owl", name: "Night Owl", emoji: "\u{1F989}", rarity: "bronze", criteria: { type: "pattern", threshold: 10, period: "monthly" }, description: "Tips after 11PM" }
  ],
  support: [
    { badgeId: "top-supporter", name: "Creator Angel", emoji: "\u{1F607}", rarity: "gold", criteria: { type: "support", threshold: 25, period: "monthly" }, description: "Top 1% supporter of a creator" },
    { badgeId: "consistent", name: "Loyal Fan", emoji: "\u2764\uFE0F", rarity: "silver", criteria: { type: "support", threshold: 10, period: "monthly" }, description: "10+ tips to the same creator" },
    { badgeId: "community-builder", name: "Community Builder", emoji: "\u{1F465}", rarity: "gold", criteria: { type: "support", threshold: 50, period: "all-time" }, description: "Supported 50+ different creators" }
  ]
};
var BADGE_RARITY_ORDER = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
  diamond: 5
};
var BadgeEngine = class {
  // 5 minutes
  constructor() {
    this.db = DatabaseService.getInstance();
    this.hf = null;
    this.userStatsCache = /* @__PURE__ */ new Map();
    this.CACHE_TTL = 5 * 60 * 1e3;
    if (config2.HUGGINGFACE_API_KEY && config2.HUGGINGFACE_API_KEY !== "dummy_hf_key") {
      this.hf = new HfInference2(config2.HUGGINGFACE_API_KEY);
    }
  }
  /**
   * Check all achievements for a user based on their tips
   */
  async checkAllAchievements(userId, tips) {
    const stats = await this.calculateStats(userId, tips);
    const badges = [];
    for (const category of Object.values(BADGE_CATEGORIES)) {
      for (const badgeDef of category) {
        if (this.meetsCriteria(stats, badgeDef.criteria, tips)) {
          badges.push({
            id: badgeDef.badgeId,
            badgeId: badgeDef.badgeId,
            name: badgeDef.name,
            emoji: badgeDef.emoji,
            rarity: badgeDef.rarity,
            description: badgeDef.description,
            criteria: badgeDef.criteria,
            isActive: true
          });
        }
      }
    }
    if (this.hf) {
      try {
        const aiBadges = await this.generateAIBadges(stats, tips);
        badges.push(...aiBadges);
      } catch (error) {
        console.error("AI badge generation failed:", error);
      }
    }
    return badges.sort((a, b) => (BADGE_RARITY_ORDER[b.rarity] || 0) - (BADGE_RARITY_ORDER[a.rarity] || 0));
  }
  /**
   * Calculate comprehensive user statistics
   */
  async calculateStats(userId, tips) {
    const cached = this.userStatsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.stats;
    }
    const filteredTips = tips.filter((t) => t.senderId === userId);
    let totalAmount = BigInt(0);
    const recipientMap = /* @__PURE__ */ new Map();
    let microTips = 0;
    let earlyTips = 0;
    let lateTips = 0;
    for (const tip of filteredTips) {
      const amount = BigInt(tip.amount);
      totalAmount += amount;
      if (amount < BigInt("1000000000000000000")) {
        microTips++;
      }
      const recipientData = recipientMap.get(tip.recipientId) || { tips: 0, amount: BigInt(0) };
      recipientData.tips++;
      recipientData.amount += amount;
      recipientMap.set(tip.recipientId, recipientData);
      const hour = new Date(tip.createdAt).getHours();
      if (hour < 9) earlyTips++;
      if (hour >= 23 || hour < 3) lateTips++;
    }
    const topRecipients = Array.from(recipientMap.entries()).map(([username, data]) => ({ username, tips: data.tips, amount: data.amount })).sort((a, b) => b.tips - a.tips).slice(0, 5);
    const thirtyDaysAgo = /* @__PURE__ */ new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyTips = filteredTips.filter((t) => new Date(t.createdAt) >= thirtyDaysAgo);
    const monthlyVolume = monthlyTips.reduce((sum, tip) => sum + BigInt(tip.amount), BigInt(0));
    const monthlyRecipients = /* @__PURE__ */ new Map();
    monthlyTips.forEach((tip) => {
      monthlyRecipients.set(tip.recipientId, (monthlyRecipients.get(tip.recipientId) || 0) + 1);
    });
    const supportConsistency = Math.max(...Array.from(monthlyRecipients.values()), 0);
    const stats = {
      totalTips: filteredTips.length,
      totalAmount,
      dailyStreak: this.calculateStreak(filteredTips),
      topRecipients,
      microTips,
      avgTipSize: filteredTips.length > 0 ? totalAmount / BigInt(filteredTips.length) : BigInt(0),
      monthlyVolume,
      supportConsistency,
      earlyTips,
      lateTips
    };
    this.userStatsCache.set(userId, { stats, timestamp: Date.now() });
    return stats;
  }
  /**
   * Check if user meets badge criteria
   */
  meetsCriteria(stats, criteria, tips) {
    switch (criteria.type) {
      case "milestone":
        return stats.totalTips >= criteria.threshold;
      case "streak":
        return stats.dailyStreak >= criteria.threshold;
      case "pattern":
        return this.checkPattern(stats, criteria, tips);
      case "support":
        if (criteria.threshold === 25) {
          return stats.topRecipients.some((r) => r.tips >= criteria.threshold);
        }
        return stats.supportConsistency >= criteria.threshold;
      case "volume":
        const thresholdAmount = BigInt(criteria.threshold) * BigInt("1000000000000000000");
        if (criteria.period === "monthly") {
          return stats.monthlyVolume >= thresholdAmount;
        }
        return stats.totalAmount >= thresholdAmount;
      default:
        return false;
    }
  }
  /**
   * Check pattern-based badges
   */
  checkPattern(stats, criteria, tips) {
    if (criteria.type === "pattern") {
      if (criteria.threshold === 50 && stats.microTips >= 50) {
        return true;
      }
      const monthlyThreshold = BigInt(100) * BigInt("1000000000000000000");
      if (criteria.threshold === 100 && stats.monthlyVolume >= monthlyThreshold) {
        return true;
      }
      if (criteria.threshold === 10 && stats.earlyTips >= 10) {
        return true;
      }
      if (criteria.threshold === 10 && stats.lateTips >= 10) {
        return true;
      }
    }
    return false;
  }
  /**
   * Generate AI-powered dynamic badges using Hugging Face
   */
  async generateAIBadges(stats, tips) {
    if (!this.hf) return [];
    try {
      const recentTips = tips.slice(0, 20).map((t) => ({
        amount: t.amount,
        hour: new Date(t.createdAt).getHours(),
        day: new Date(t.createdAt).getDay()
      }));
      const weekendTips = recentTips.filter((t) => t.day === 0 || t.day === 6).length;
      if (weekendTips >= 5 && stats.totalTips >= 10) {
        return [{
          id: "weekend-warrior",
          badgeId: "weekend-warrior",
          name: "Weekend Warrior",
          emoji: "\u{1F3AF}",
          rarity: "silver",
          description: "Most tips on weekends",
          criteria: { type: "pattern", threshold: 5, period: "all-time" },
          isActive: true
        }];
      }
      const roundAmounts = recentTips.filter((t) => {
        const amount = BigInt(t.amount);
        return amount % BigInt("1000000000000000000") === BigInt(0);
      }).length;
      if (roundAmounts >= 5 && stats.totalTips >= 10) {
        return [{
          id: "round-numberer",
          badgeId: "round-numberer",
          name: "Round Numberer",
          emoji: "\u{1F3B2}",
          rarity: "bronze",
          description: "Prefers round tip amounts",
          criteria: { type: "pattern", threshold: 5, period: "all-time" },
          isActive: true
        }];
      }
      return [];
    } catch (error) {
      console.error("AI badge generation error:", error);
      return [];
    }
  }
  /**
   * Calculate daily tipping streak
   */
  calculateStreak(tips) {
    if (tips.length === 0) return 0;
    const sortedTips = [...tips].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    let streak = 0;
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const todayTip = sortedTips.find((t) => {
      const tipDate = new Date(t.createdAt);
      tipDate.setHours(0, 0, 0, 0);
      return tipDate.getTime() === today.getTime();
    });
    if (!todayTip) return 0;
    let currentDate = new Date(today);
    let tipIndex = 0;
    while (tipIndex < sortedTips.length) {
      const tipDate = new Date(sortedTips[tipIndex].createdAt);
      tipDate.setHours(0, 0, 0, 0);
      const currentDateStr = currentDate.getTime();
      if (tipDate.getTime() === currentDateStr) {
        streak++;
        tipIndex++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (tipDate.getTime() < currentDateStr) {
        break;
      } else {
        tipIndex++;
      }
    }
    return streak;
  }
};

// server/services/BadgeService.ts
var BadgeService = class {
  constructor() {
    this.db = DatabaseService.getInstance();
    this.badgeEngine = new BadgeEngine();
    this.analyticsService = new TipAnalyticsService();
  }
  /**
   * Check and award badges for a user
   * Returns newly awarded badges
   */
  async checkAndAwardBadges(userId) {
    const tips = await this.db.tip.findMany({
      where: {
        senderId: userId,
        status: "COMPLETED"
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    const existingBadges = await this.db.userBadge.findMany({
      where: {
        userId,
        revokedAt: null
      },
      include: {
        badge: true
      }
    });
    const existingBadgeIds = new Set(existingBadges.map((ub) => ub.badge.badgeId));
    const qualifiedBadges = await this.badgeEngine.checkAllAchievements(userId, tips);
    const newBadges = qualifiedBadges.filter((b) => !existingBadgeIds.has(b.badgeId));
    const awardedBadges = [];
    for (const badge of newBadges) {
      try {
        await this.ensureBadgeExists(badge);
        await this.db.userBadge.create({
          data: {
            userId,
            badgeId: badge.badgeId,
            metadata: {
              criteria: badge.criteria,
              awardedAt: (/* @__PURE__ */ new Date()).toISOString()
            }
          }
        });
        awardedBadges.push(badge);
      } catch (error) {
        if (!error.message?.includes("Unique constraint") && error.code !== "P2002") {
          console.error(`Error awarding badge ${badge.badgeId} to user ${userId}:`, error);
        }
      }
    }
    return awardedBadges;
  }
  /**
   * Ensure a badge definition exists in the database
   */
  async ensureBadgeExists(badge) {
    const existing = await this.db.badge.findUnique({
      where: { badgeId: badge.badgeId }
    });
    if (!existing) {
      await this.db.badge.create({
        data: {
          badgeId: badge.badgeId,
          name: badge.name,
          emoji: badge.emoji,
          description: badge.description,
          rarity: badge.rarity,
          criteria: badge.criteria,
          isActive: badge.isActive ?? true
        }
      });
    }
  }
  /**
   * Get all badges for a user
   */
  async getUserBadges(userId) {
    const userBadges = await this.db.userBadge.findMany({
      where: {
        userId,
        revokedAt: null
      },
      include: {
        badge: true
      },
      orderBy: {
        awardedAt: "desc"
      }
    });
    return userBadges.map((ub) => ({
      id: ub.id,
      badgeId: ub.badge.badgeId,
      name: ub.badge.name,
      emoji: ub.badge.emoji,
      rarity: ub.badge.rarity,
      description: ub.badge.description,
      awardedAt: ub.awardedAt,
      metadata: ub.metadata
    }));
  }
  /**
   * Get badge details by badgeId
   */
  async getBadge(badgeId) {
    return await this.db.badge.findUnique({
      where: { badgeId }
    });
  }
  /**
   * Get all available badges (definitions)
   */
  async getAllBadges() {
    return await this.db.badge.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        rarity: "asc"
      }
    });
  }
  /**
   * Revoke a badge from a user
   */
  async revokeBadge(userId, badgeId) {
    try {
      await this.db.userBadge.updateMany({
        where: {
          userId,
          badgeId,
          revokedAt: null
        },
        data: {
          revokedAt: /* @__PURE__ */ new Date()
        }
      });
      return true;
    } catch (error) {
      console.error(`Error revoking badge ${badgeId} from user ${userId}:`, error);
      return false;
    }
  }
  /**
   * Get badge statistics for a user
   */
  async getUserBadgeStats(userId) {
    const badges = await this.getUserBadges(userId);
    const rarityCounts = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0
    };
    badges.forEach((b) => {
      rarityCounts[b.rarity] = (rarityCounts[b.rarity] || 0) + 1;
    });
    return {
      totalBadges: badges.length,
      rarityCounts,
      latestBadge: badges[0] || null
    };
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
    this.badgeService = new BadgeService();
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
   * Enhanced version that can use OpenAI for intelligent suggestions
   */
  async getTipRecommendation(content, context) {
    try {
      let relationship;
      let previousTips = 0;
      if (context?.senderId && context?.recipientId) {
        try {
          const tipHistory = await this.db.tip.count({
            where: {
              senderId: context.senderId,
              recipientId: context.recipientId,
              status: "COMPLETED"
            }
          });
          previousTips = tipHistory;
          if (tipHistory > 5) relationship = "regular";
          else if (tipHistory > 0) relationship = "friend";
          else relationship = "stranger";
        } catch (error) {
        }
      }
      const suggestion = await this.aiService.generateTipSuggestion(content, {
        recipientName: context?.recipientId,
        relationship,
        previousTips,
        contentQuality: void 0
        // Will be calculated by AI service
      });
      const contentScore = await this.hfService.scoreContent(content, context);
      return {
        recommendedAmount: suggestion.amount,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        contentScore: {
          quality: contentScore.quality,
          engagement: contentScore.engagement,
          sentiment: contentScore.sentiment.label
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
  /**
   * Get intelligent tip suggestion with personalized message
   * Uses OpenAI GPT if available for context-aware suggestions
   */
  async getIntelligentTipSuggestion(chatContext, options) {
    try {
      let relationship;
      let previousTips = 0;
      if (options?.senderId && options?.recipientId) {
        try {
          const tipHistory = await this.db.tip.count({
            where: {
              senderId: options.senderId,
              recipientId: options.recipientId,
              status: "COMPLETED"
            }
          });
          previousTips = tipHistory;
          if (tipHistory > 5) relationship = "regular";
          else if (tipHistory > 0) relationship = "friend";
          else relationship = "stranger";
        } catch (error) {
        }
      }
      const suggestion = await this.aiService.generateTipSuggestion(chatContext, {
        recipientName: options?.recipientName || options?.recipientId,
        relationship,
        previousTips
      });
      return {
        amount: suggestion.amount,
        message: suggestion.message,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning
      };
    } catch (error) {
      console.error("Error generating intelligent tip suggestion:", error);
      return {
        amount: "5",
        message: "Great work! Keep it up! \u{1F680}",
        confidence: 0.5,
        reasoning: "Using default suggestion due to error."
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
        this.badgeService.checkAndAwardBadges(tip.senderId).catch((error) => {
          console.error(`Error checking badges for user ${tip.senderId}:`, error);
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

// server/services/AITipSuggestionService.ts
import { z as z2 } from "zod";
var TipSuggestionSchema = z2.object({
  amount: z2.number().min(0.1).max(100).describe("Suggested tip amount in VERY"),
  message: z2.string().max(280).describe("Personalized tip message"),
  confidence: z2.number().min(0).max(1).describe("AI confidence score (0-1)"),
  reason: z2.string().max(200).describe("Why this amount/message?"),
  sentiment: z2.enum(["low", "medium", "high"]).describe("Appreciation level"),
  category: z2.enum(["help", "content", "insight", "shoutout"]).describe("Tip category")
});
var AITipSuggestionService = class {
  constructor() {
    this.openai = null;
    this.openaiAvailable = false;
    this.cache = CacheService.getInstance();
    this.openaiAvailable = false;
    this.openai = null;
    this.initializeOpenAI();
  }
  async initializeOpenAI() {
    if (!config2.OPENAI_API_KEY || config2.OPENAI_API_KEY === "") {
      console.log("\u26A0\uFE0F OpenAI API key not configured. AI Tip Suggestions will use fallback.");
      return;
    }
    try {
      const openaiModule = await import("openai");
      const OpenAI = openaiModule.default || openaiModule;
      this.openai = new OpenAI({ apiKey: config2.OPENAI_API_KEY });
      this.openaiAvailable = true;
      console.log("\u2705 OpenAI initialized for AI Tip Suggestions");
    } catch (error) {
      console.warn("OpenAI package not available or failed to initialize:", error);
      this.openaiAvailable = false;
    }
  }
  /**
   * Generate intelligent tip suggestion using OpenAI GPT-4o-mini
   */
  async generateTipSuggestion(context, userPreferences = {}) {
    const cacheKey = `ai:tip-suggestion:${Buffer.from(
      context.message + context.sender + context.recipient + JSON.stringify(userPreferences)
    ).toString("base64").slice(0, 80)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    if (!this.openai && config2.OPENAI_API_KEY && config2.OPENAI_API_KEY !== "") {
      await this.initializeOpenAI();
    }
    if (!this.openaiAvailable || !this.openai) {
      return this.getFallbackSuggestion(context);
    }
    try {
      const systemPrompt = `
You are a tip suggestion AI for VeryTippers (gasless chat tipping on VERY Chain).

ANALYZE chat context and suggest:
1. PERFECT tip amount (0.5-50 VERY, precise to 2 decimals)
2. PERSONALIZED message (under 100 chars, warm/authentic)  
3. CONFIDENCE score (0.0-1.0 based on clear appreciation signals)
4. SENTIMENT level (low/medium/high)
5. CATEGORY (help/content/insight/shoutout)

CRITICAL RULES:
- "thanks" alone \u2192 low confidence, 0.5-1 VERY
- Code fixes/tutorials \u2192 high confidence, 3-10 VERY  
- "life-changing"/"saved hours" \u2192 15-30 VERY
- Emoji spam \u2192 low/no suggestion
- Recent tips \u2192 avoid over-tipping
- Match community norms (dev chat = higher, casual = lower)

EXAMPLE OUTPUTS:
{
  "amount": 5.00,
  "message": "Thanks for the detailed fix! \u{1F525}",
  "confidence": 0.95,
  "reason": "Code solution + strong appreciation emojis",
  "sentiment": "high",
  "category": "help"
}

Always return valid JSON matching schema exactly.
`;
      const userPrompt = `
CHAT CONTEXT:
Message: "${context.message}"
From: ${context.sender} 
To: ${context.recipient}
Channel: ${context.channel}
Reactions: ${context.reactions?.length || 0} 
Time: ${new Date(context.timestamp).toLocaleString()}
Prev tips: ${JSON.stringify(context.previousTips || [])}

USER PREFERENCES:
Avg tip: ${userPreferences.avgTip || "N/A"}
Max tip: ${userPreferences.maxTip || "N/A"}

Generate 1 optimal tip suggestion.
`;
      const completion = await this.openai.chat.completions.create({
        model: config2.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        // Low creativity, high consistency
        max_tokens: 300,
        response_format: { type: "json_object" }
      });
      const rawResponse = completion.choices[0]?.message?.content;
      if (!rawResponse) {
        throw new Error("No response from OpenAI");
      }
      const parsed = JSON.parse(rawResponse);
      const validated = TipSuggestionSchema.parse(parsed);
      await this.cache.set(cacheKey, JSON.stringify(validated), 1800);
      console.log("\u2705 AI Tip Suggestion generated:", validated);
      return validated;
    } catch (error) {
      console.error("AI Tip Suggestion failed:", error);
      return this.getFallbackSuggestion(context);
    }
  }
  /**
   * Fallback suggestion when AI is unavailable
   */
  getFallbackSuggestion(context) {
    const message = context.message.toLowerCase();
    let amount = 1;
    let confidence = 0.5;
    let sentiment = "medium";
    let category = "shoutout";
    if (message.includes("thank") || message.includes("thanks")) {
      amount = 1;
      confidence = 0.6;
      sentiment = "low";
    }
    if (message.includes("fix") || message.includes("solution") || message.includes("help")) {
      amount = 5;
      confidence = 0.75;
      sentiment = "high";
      category = "help";
    }
    if (message.includes("saved") || message.includes("life") || message.includes("amazing")) {
      amount = 10;
      confidence = 0.8;
      sentiment = "high";
    }
    if (context.reactions && context.reactions.length > 5) {
      amount *= 1.5;
      confidence = Math.min(0.95, confidence + 0.1);
    }
    return {
      amount: Math.min(50, Math.max(0.5, amount)),
      message: `Thanks ${context.sender}!`,
      confidence,
      reason: "Fallback suggestion (AI unavailable)",
      sentiment,
      category
    };
  }
};

// server/services/LeaderboardInsightsService.ts
import { z as z3 } from "zod";
var InsightSchema = z3.object({
  title: z3.string().max(60),
  summary: z3.string().max(280),
  emoji: z3.string().length(1),
  keyStat: z3.string(),
  callToAction: z3.string().max(100),
  shareable: z3.boolean()
});
var LeaderboardInsightsService = class {
  constructor() {
    this.db = DatabaseService.getInstance();
    this.cache = CacheService.getInstance();
    this.openai = null;
    this.openaiAvailable = false;
    this.initializeOpenAI();
  }
  async initializeOpenAI() {
    if (!config2.OPENAI_API_KEY || config2.OPENAI_API_KEY === "") {
      console.log("OpenAI API key not configured for leaderboard insights. Using fallback.");
      return;
    }
    try {
      const OpenAI = (await import("openai")).default;
      this.openai = new OpenAI({ apiKey: config2.OPENAI_API_KEY });
      this.openaiAvailable = true;
      console.log("OpenAI initialized for leaderboard insights");
    } catch (error) {
      console.warn("OpenAI package not available for leaderboard insights:", error);
      this.openaiAvailable = false;
    }
  }
  /**
   * Generate personalized weekly leaderboard insights
   */
  async generatePersonalizedInsights(userData, communityStats) {
    if (!this.openai && config2.OPENAI_API_KEY && config2.OPENAI_API_KEY !== "") {
      await this.initializeOpenAI();
    }
    const cacheKey = `leaderboard:insights:${userData.rank}:${userData.totalTips}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return z3.array(InsightSchema).parse(parsed);
      } catch (e) {
      }
    }
    try {
      if (this.openaiAvailable && this.openai) {
        const insights = await this.generateInsightsWithOpenAI(userData, communityStats);
        await this.cache.set(cacheKey, JSON.stringify(insights), 3600);
        return insights;
      } else {
        return this.generateFallbackInsights(userData);
      }
    } catch (error) {
      console.error("Leaderboard insights generation failed:", error);
      return this.generateFallbackInsights(userData);
    }
  }
  /**
   * Generate insights using OpenAI
   */
  async generateInsightsWithOpenAI(userData, communityStats) {
    const systemPrompt = `You are a social leaderboard insights generator for VeryTippers (chat tipping platform).

Generate 3-5 ENGAGING, POSITIVE weekly summaries for users based on their:
- Overall rank (#1-#10000)
- Total tips sent/received
- Top supported creators
- Weekly growth %
- Special badges/achievements
- Comparison to friends

TONE: Excited, encouraging, social, gamified \u{1F3C6}
STYLE: Short, punchy, shareable (Twitter/X ready)
EMOJI: 1 perfect emoji per insight

EXAMPLES:
\u{1F3C6} "You're #3 overall! Up 12 spots this week!"
\u{1F48E} "Top supporter of @alice - she sent you a shoutout!"
\u{1F680} "150% growth! You're crushing it!"

ALWAYS include:
- 1 emoji
- Personal achievement
- Social proof (# rank, top supporter)
- Growth/call-to-action
- Under 280 chars total

Return VALID JSON array matching this exact schema:
[{
  "title": "string (max 60 chars)",
  "summary": "string (max 280 chars)",
  "emoji": "single emoji character",
  "keyStat": "string",
  "callToAction": "string (max 100 chars)",
  "shareable": true
}]`;
    const percentile = ((communityStats.totalUsers - userData.rank) / communityStats.totalUsers * 100).toFixed(1);
    const userPrompt = `USER DATA:
Rank: #${userData.rank} (${percentile}th percentile)
Total tips: ${userData.totalTips}
Total amount: ${userData.totalAmount} VERY
Weekly growth: ${userData.weeklyGrowth > 0 ? "+" : ""}${userData.weeklyGrowth}%
Badges: ${userData.badges.length > 0 ? userData.badges.join(", ") : "None yet"}

TOP SUPPORTED:
${userData.topSupported.slice(0, 5).map((u) => `@${u.username}: ${u.tips} tips (${u.amount} VERY)`).join("\n") || "None yet"}

FRIENDS COMPARISON:
${userData.comparedToFriends.slice(0, 5).map((f) => `@${f.username} (#${f.rank}, ${f.difference > 0 ? "+" : ""}${f.difference} spots ${f.difference > 0 ? "above" : "below"} you)`).join("\n") || "No friends data"}

COMMUNITY:
${communityStats.totalUsers} users, avg ${communityStats.avgTips.toFixed(1)} tips/user

Generate 3-5 personalized insights (most important first). Return ONLY valid JSON array.`;
    const completion = await this.openai.chat.completions.create({
      model: config2.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: "json_object" }
    });
    const rawResponse = completion.choices[0]?.message?.content;
    if (!rawResponse) {
      throw new Error("Empty response from OpenAI");
    }
    try {
      const parsed = JSON.parse(rawResponse);
      const insightsArray = parsed.insights || parsed;
      const validated = z3.array(InsightSchema).parse(insightsArray);
      return validated.slice(0, 5);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
      throw parseError;
    }
  }
  /**
   * Fallback insights when AI unavailable
   */
  generateFallbackInsights(userData) {
    const insights = [];
    insights.push({
      title: `Rank #${userData.rank}`,
      summary: `You're #${userData.rank} on the VeryTippers leaderboard!`,
      emoji: "\u{1F3C6}",
      keyStat: `${userData.totalTips} tips`,
      callToAction: "Keep tipping!",
      shareable: true
    });
    if (userData.topSupported.length > 0) {
      const top = userData.topSupported[0];
      insights.push({
        title: `Top Supporter`,
        summary: `You're the top supporter of @${top.username}!`,
        emoji: "\u{1F48E}",
        keyStat: `${top.tips} tips sent`,
        callToAction: "Continue supporting!",
        shareable: true
      });
    }
    if (userData.weeklyGrowth > 0) {
      insights.push({
        title: `Growing Fast!`,
        summary: `You've grown ${userData.weeklyGrowth}% this week!`,
        emoji: "\u{1F680}",
        keyStat: `+${userData.weeklyGrowth}% growth`,
        callToAction: "Keep it up!",
        shareable: true
      });
    }
    if (userData.comparedToFriends.length > 0) {
      const friend = userData.comparedToFriends[0];
      if (friend.difference < 0) {
        insights.push({
          title: `Beat @${friend.username}!`,
          summary: `You're ${Math.abs(friend.difference)} spots ahead of @${friend.username}!`,
          emoji: "\u{1F947}",
          keyStat: `#${userData.rank} vs #${friend.rank}`,
          callToAction: "Stay ahead!",
          shareable: true
        });
      }
    }
    return insights;
  }
  /**
   * Fetch leaderboard data for a user
   */
  async fetchLeaderboardData(userId, period = "weekly") {
    const db = this.db;
    const startDate = this.getPeriodStartDate(period);
    const tipsSent = await db.tip.findMany({
      where: {
        senderId: userId,
        status: "COMPLETED",
        createdAt: { gte: startDate }
      },
      include: { recipient: true }
    });
    const tipsReceived = await db.tip.findMany({
      where: {
        recipientId: userId,
        status: "COMPLETED",
        createdAt: { gte: startDate }
      }
    });
    const totalTips = tipsSent.length;
    const totalAmount = tipsSent.reduce((sum, tip) => sum + BigInt(tip.amount), BigInt(0)).toString();
    const recipientMap = /* @__PURE__ */ new Map();
    tipsSent.forEach((tip) => {
      const recipientId = tip.recipientId;
      const current = recipientMap.get(recipientId) || { count: 0, total: BigInt(0) };
      recipientMap.set(recipientId, {
        count: current.count + 1,
        total: current.total + BigInt(tip.amount)
      });
    });
    const recipientIds = Array.from(recipientMap.keys());
    const recipients = await db.user.findMany({
      where: { id: { in: recipientIds } },
      select: { id: true, walletAddress: true }
    });
    const recipientDataMap = new Map(recipients.map((r) => [r.id, r.walletAddress]));
    const topSupported = Array.from(recipientMap.entries()).map(([recipientId, stats]) => {
      const walletAddress = recipientDataMap.get(recipientId) || recipientId;
      const username = walletAddress.length > 10 ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : recipientId.substring(0, 8);
      return {
        username,
        tips: stats.count,
        amount: stats.total.toString()
      };
    }).sort((a, b) => b.tips - a.tips).slice(0, 5);
    const allTips = await db.tip.findMany({
      where: {
        status: "COMPLETED",
        createdAt: { gte: startDate }
      },
      select: {
        senderId: true,
        amount: true
      }
    });
    const userStatsMap = /* @__PURE__ */ new Map();
    allTips.forEach((tip) => {
      const existing = userStatsMap.get(tip.senderId) || { tips: 0, amount: BigInt(0) };
      existing.tips += 1;
      existing.amount += BigInt(tip.amount);
      userStatsMap.set(tip.senderId, existing);
    });
    const sortedUsers = Array.from(userStatsMap.entries()).map(([userId2, stats]) => ({
      userId: userId2,
      tips: stats.tips,
      amount: stats.amount
    })).sort((a, b) => {
      if (a.amount !== b.amount) {
        return b.amount > a.amount ? 1 : -1;
      }
      return b.tips - a.tips;
    });
    const userRankIndex = sortedUsers.findIndex((u) => u.userId === userId);
    const rank = userRankIndex >= 0 ? userRankIndex + 1 : sortedUsers.length + 1;
    const weeklyGrowth = 0;
    const badges = [];
    const comparedToFriends = [];
    const totalUsers = sortedUsers.length;
    const avgTips = totalUsers > 0 ? sortedUsers.reduce((sum, u) => sum + u.tips, 0) / totalUsers : 0;
    return {
      rank,
      totalTips,
      totalAmount,
      topSupported,
      weeklyGrowth,
      badges,
      comparedToFriends,
      communityStats: {
        totalUsers,
        avgTips
      }
    };
  }
  getPeriodStartDate(period) {
    const now = /* @__PURE__ */ new Date();
    switch (period) {
      case "daily":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case "weekly":
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - daysToMonday);
        monday.setHours(0, 0, 0, 0);
        return monday;
      case "monthly":
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return /* @__PURE__ */ new Date(0);
    }
  }
};

// server/services/ModerationService.ts
import { HfInference as HfInference3 } from "@huggingface/inference";
import { z as z4 } from "zod";
var ModerationResultSchema = z4.object({
  isSafe: z4.boolean(),
  sentiment: z4.enum(["positive", "neutral", "negative"]),
  toxicityScore: z4.number().min(0).max(1),
  toxicityLabels: z4.array(z4.object({
    label: z4.string(),
    score: z4.number().min(0).max(1)
  })),
  flaggedReason: z4.string().nullable(),
  action: z4.enum(["allow", "warn", "block", "quarantine"])
});
var MODERATION_THRESHOLDS = {
  toxicityBlock: 0.85,
  // Hard block highly toxic
  toxicityWarn: 0.65,
  // Show warning
  negativeSentiment: 0.75
};
var ModerationService = class {
  constructor() {
    this.hf = new HfInference3(config2.HUGGINGFACE_API_KEY);
  }
  /**
   * Moderate a tip message using AI models
   */
  async moderateTipMessage(message, senderId, recipientId, context) {
    const normalizedMessage = message.trim().toLowerCase();
    const quickBlock = this.quickHeuristicCheck(normalizedMessage);
    if (quickBlock) {
      return {
        isSafe: false,
        sentiment: "negative",
        toxicityScore: 1,
        toxicityLabels: [{ label: "heuristic_block", score: 1 }],
        flaggedReason: quickBlock,
        action: "block"
      };
    }
    try {
      const [sentimentResult, toxicityResult] = await Promise.all([
        this.analyzeSentiment(normalizedMessage),
        this.analyzeToxicity(normalizedMessage)
      ]);
      const result = this.combineResults(sentimentResult, toxicityResult);
      console.log(`\u2705 Moderation: "${message.substring(0, 50)}..." \u2192 ${result.action} (toxicity: ${result.toxicityScore.toFixed(2)})`);
      return ModerationResultSchema.parse(result);
    } catch (error) {
      console.error("Moderation failed:", error);
      return {
        isSafe: true,
        sentiment: "neutral",
        toxicityScore: 0,
        toxicityLabels: [],
        flaggedReason: null,
        action: "allow"
      };
    }
  }
  quickHeuristicCheck(message) {
    const blocks = [
      /\b(fuck|shit|damn|asshole|retard|cunt)\b/gi,
      /\b(kys|kill yourself|die|suicide)\b/gi,
      /\b(scam|fraud|rug)\b.*\b(you|ur)\b/gi,
      /\b(gay|fag|tranny|nigger)\b/gi
    ];
    for (const pattern of blocks) {
      if (pattern.test(message)) {
        return "Contains prohibited language";
      }
    }
    if (message.includes("@") && message.includes("block") && message.includes("wallet")) {
      return "Suspicious wallet/block report";
    }
    return null;
  }
  async analyzeSentiment(text) {
    try {
      const result = await this.hf.textClassification({
        model: "cardiffnlp/twitter-roberta-base-sentiment-latest",
        inputs: text
      });
      const scores = Array.isArray(result) ? result : [result];
      const firstResult = scores[0];
      if (firstResult && Array.isArray(firstResult)) {
        const scoreValues = firstResult.map((r) => typeof r === "number" ? r : r.score || 0);
        const labels = ["negative", "neutral", "positive"];
        const maxScore = Math.max(...scoreValues);
        const sentiment = labels[scoreValues.indexOf(maxScore)];
        return { sentiment, confidence: maxScore };
      } else if (firstResult && firstResult.label) {
        const label = firstResult.label.toLowerCase();
        const sentiment = label.includes("positive") ? "positive" : label.includes("negative") ? "negative" : "neutral";
        return { sentiment, confidence: firstResult.score || 0.5 };
      }
      return { sentiment: "neutral", confidence: 0.5 };
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      return { sentiment: "neutral", confidence: 0.5 };
    }
  }
  async analyzeToxicity(text) {
    try {
      const result = await this.hf.textClassification({
        model: "unitary/toxic-bert",
        inputs: text,
        parameters: { return_all_scores: true }
      });
      const scores = Array.isArray(result) ? result : [result];
      const firstResult = scores[0];
      if (Array.isArray(firstResult)) {
        const toxicityScores = firstResult.map(
          (r) => typeof r === "number" ? r : r.score || 0
        );
        const toxicityScore = Math.max(...toxicityScores);
        return {
          toxicityScore,
          labels: firstResult.map((r, i) => ({
            label: r.label || `label_${i}`,
            score: typeof r === "number" ? r : r.score || 0
          })),
          scores: toxicityScores
        };
      } else if (firstResult && firstResult.scores && Array.isArray(firstResult.scores)) {
        const toxicityScores = firstResult.scores.map((s) => s.score || 0);
        const toxicityScore = Math.max(...toxicityScores);
        return {
          toxicityScore,
          labels: firstResult.labels || [],
          scores: toxicityScores
        };
      }
      return {
        toxicityScore: 0,
        labels: [],
        scores: []
      };
    } catch (error) {
      console.error("Toxicity analysis error:", error);
      return {
        toxicityScore: 0,
        labels: [],
        scores: []
      };
    }
  }
  combineResults(sentiment, toxicity) {
    const toxicityScore = toxicity.toxicityScore || 0;
    const sentimentScore = sentiment.sentiment === "negative" ? 1 : 0;
    if (toxicityScore >= MODERATION_THRESHOLDS.toxicityBlock) {
      return {
        isSafe: false,
        sentiment: "negative",
        toxicityScore,
        toxicityLabels: toxicity.labels || [],
        flaggedReason: "High toxicity detected",
        action: "block"
      };
    }
    if (toxicityScore >= MODERATION_THRESHOLDS.toxicityWarn || sentimentScore > MODERATION_THRESHOLDS.negativeSentiment) {
      return {
        isSafe: true,
        sentiment: sentiment.sentiment || "neutral",
        toxicityScore,
        toxicityLabels: toxicity.labels || [],
        flaggedReason: "Moderate toxicity",
        action: "warn"
      };
    }
    return {
      isSafe: true,
      sentiment: sentiment.sentiment || "positive",
      toxicityScore,
      toxicityLabels: toxicity.labels || [],
      flaggedReason: null,
      action: "allow"
    };
  }
};

// server/index.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var tipService = new TipService();
var contentService = new ContentService();
var analyticsService = new TipAnalyticsService();
var hfService = new HuggingFaceService();
var badgeService = new BadgeService();
var leaderboardInsightsService = new LeaderboardInsightsService();
var aiTipSuggestionService = new AITipSuggestionService();
var aiService = new AIService();
var moderationService = new ModerationService();
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
        web3: "BlockchainService",
        moderation: "ModerationService"
      }
    });
  });
  app.post("/api/v1/moderation/check", async (req, res) => {
    const { message, senderId, recipientId, context } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }
    try {
      const result = await moderationService.moderateTipMessage(
        message,
        senderId,
        recipientId,
        context
      );
      res.status(200).json({
        success: true,
        result
      });
    } catch (error) {
      console.error("Error checking moderation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check message moderation",
        result: {
          isSafe: true,
          sentiment: "neutral",
          toxicityScore: 0,
          toxicityLabels: [],
          flaggedReason: null,
          action: "allow"
        }
      });
    }
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
    const { content, authorId, contentType, recipientId, senderId } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: "Content is required" });
    }
    try {
      const recommendation = await tipService.getTipRecommendation(content, {
        authorId,
        contentType,
        recipientId,
        senderId
      });
      res.status(200).json({ success: true, data: recommendation });
    } catch (error) {
      console.error("Error generating tip recommendation:", error);
      res.status(500).json({ success: false, message: "Failed to generate recommendation" });
    }
  });
  app.post("/api/v1/tip/intelligent-suggestion", async (req, res) => {
    const { chatContext, recipientId, senderId, recipientName } = req.body;
    if (!chatContext) {
      return res.status(400).json({ success: false, message: "Chat context is required" });
    }
    try {
      const suggestion = await tipService.getIntelligentTipSuggestion(chatContext, {
        recipientId,
        senderId,
        recipientName
      });
      res.status(200).json({ success: true, data: suggestion });
    } catch (error) {
      console.error("Error generating intelligent tip suggestion:", error);
      res.status(500).json({ success: false, message: "Failed to generate suggestion" });
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
  app.post("/api/voice/parse", async (req, res) => {
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== "string") {
      return res.status(400).json({ success: false, message: "Transcript is required" });
    }
    try {
      const parseVoiceCommandFallback = (text) => {
        const normalized = text.toLowerCase().replace(/ dollars?/g, " VERY").replace(/verys?/g, "VERY").replace(/send /g, "tip ").replace(/give /g, "tip ").trim();
        const tipMatch = normalized.match(/tip|send|give/i);
        if (!tipMatch) return null;
        const usernameMatch = normalized.match(/@?(\w+)/i);
        if (!usernameMatch) return null;
        const recipient = usernameMatch[0].startsWith("@") ? usernameMatch[0] : `@${usernameMatch[0]}`;
        const numberWords = {
          "one": 1,
          "two": 2,
          "three": 3,
          "four": 4,
          "five": 5,
          "six": 6,
          "seven": 7,
          "eight": 8,
          "nine": 9,
          "ten": 10,
          "eleven": 11,
          "twelve": 12,
          "thirteen": 13,
          "fourteen": 14,
          "fifteen": 15,
          "sixteen": 16,
          "seventeen": 17,
          "eighteen": 18,
          "nineteen": 19,
          "twenty": 20
        };
        let amount = 0;
        const numericMatch = normalized.match(/(\d+\.?\d*)/);
        if (numericMatch) {
          amount = parseFloat(numericMatch[1]);
        } else {
          for (const [word, value] of Object.entries(numberWords)) {
            if (normalized.includes(word)) {
              amount = value;
              break;
            }
          }
        }
        if (amount === 0 || amount < 0.1) return null;
        return {
          action: "tip",
          recipient,
          amount: Math.min(amount, 100),
          currency: "VERY"
        };
      };
      let command = null;
      if (config2.OPENAI_API_KEY && config2.OPENAI_API_KEY !== "") {
        try {
          const OpenAI = (await import("openai")).default;
          const openai = new OpenAI({ apiKey: config2.OPENAI_API_KEY });
          const prompt = `Parse this voice command into JSON:
"${transcript}"

Expected format: {action:"tip", recipient:"@username", amount:number, currency:"VERY", message?:"optional message"}
Examples:
"tip @alice 5 very" \u2192 {action:"tip", recipient:"@alice", amount:5, currency:"VERY"}
"send bob ten dollars" \u2192 {action:"tip", recipient:"@bob", amount:10, currency:"VERY"}
"give @charlie 3.5" \u2192 {action:"tip", recipient:"@charlie", amount:3.5, currency:"VERY"}

Return ONLY valid JSON matching the schema.`;
          const completion = await openai.chat.completions.create({
            model: config2.OPENAI_MODEL || "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: 'Parse natural voice commands into structured JSON. Return ONLY valid JSON: {action:"tip", recipient:"@username", amount:number, currency:"VERY", message?:"optional"}'
              },
              { role: "user", content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 150,
            response_format: { type: "json_object" }
          });
          const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
          if (parsed.action && parsed.recipient && parsed.amount) {
            command = parsed;
          }
        } catch (openaiError) {
          console.warn("OpenAI parsing failed, using fallback:", openaiError);
        }
      }
      if (!command) {
        command = parseVoiceCommandFallback(transcript);
      }
      if (command) {
        return res.status(200).json({
          success: true,
          command,
          confidence: command.confidence || 0.85
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Could not parse voice command",
          command: null
        });
      }
    } catch (error) {
      console.error("Error parsing voice command:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        command: null
      });
    }
  });
  app.post("/api/v1/ai/tip-suggestion", async (req, res) => {
    const { context, userPreferences } = req.body;
    if (!context || !context.message || !context.sender) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: context.message, context.sender"
      });
    }
    try {
      const suggestion = await aiTipSuggestionService.generateTipSuggestion(
        context,
        userPreferences || {}
      );
      res.status(200).json({ success: true, data: suggestion });
    } catch (error) {
      console.error("Error generating AI tip suggestion:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate AI tip suggestion"
      });
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
  app.get("/api/v1/ai/insights/user/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      const analytics = await analyticsService.getUserAnalytics(userId);
      const insights = await aiService.generateLeaderboardInsight(userId, {
        topRecipients: analytics.favoriteRecipients?.map((r) => ({
          id: r.userId || r.id,
          name: r.username || r.name,
          tipCount: r.count || 0,
          totalAmount: parseFloat(r.totalAmount || "0")
        })) || [],
        topSenders: analytics.favoriteSenders?.map((s) => ({
          id: s.userId || s.id,
          name: s.username || s.name,
          tipCount: s.count || 0,
          totalAmount: parseFloat(s.totalAmount || "0")
        })) || [],
        totalTips: analytics.tipsSent || 0,
        totalReceived: parseFloat(analytics.totalReceived || "0"),
        streak: analytics.tipStreak || 0
      });
      res.status(200).json({ success: true, data: insights });
    } catch (error) {
      console.error("Error generating personalized insights:", error);
      res.status(500).json({ success: false, message: "Failed to generate insights" });
    }
  });
  app.get("/api/v1/ai/badges/user/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      const analytics = await analyticsService.getUserAnalytics(userId);
      const uniqueRecipients = analytics.favoriteRecipients?.length || 0;
      const badgeSuggestions = await aiService.suggestBadges(userId, {
        tipCount: analytics.tipsSent || 0,
        totalAmount: parseFloat(analytics.totalSent || "0"),
        uniqueRecipients,
        streak: analytics.tipStreak || 0,
        contentCreated: 0
        // Not available in current analytics, can be added later
      });
      res.status(200).json({ success: true, data: badgeSuggestions });
    } catch (error) {
      console.error("Error generating badge suggestions:", error);
      res.status(500).json({ success: false, message: "Failed to generate badge suggestions" });
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
  app.get("/api/v1/leaderboard/:userId", async (req, res) => {
    const { userId } = req.params;
    const period = req.query.period || "weekly";
    try {
      const data = await leaderboardInsightsService.fetchLeaderboardData(userId, period);
      res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      res.status(500).json({ success: false, message: "Failed to fetch leaderboard data" });
    }
  });
  app.post("/api/v1/leaderboard/insights", async (req, res) => {
    const { userData, communityStats } = req.body;
    if (!userData) {
      return res.status(400).json({ success: false, message: "userData is required" });
    }
    try {
      const stats = communityStats || { totalUsers: 1e3, avgTips: 10 };
      const insights = await leaderboardInsightsService.generatePersonalizedInsights(userData, stats);
      res.status(200).json({ success: true, insights });
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ success: false, message: "Failed to generate insights" });
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
  app.post("/api/v1/badges/check", async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "Missing required field: userId" });
    }
    try {
      const newBadges = await badgeService.checkAndAwardBadges(userId);
      res.status(200).json({
        success: true,
        data: {
          newBadges,
          count: newBadges.length
        }
      });
    } catch (error) {
      console.error("Error checking badges:", error);
      res.status(500).json({ success: false, message: "Failed to check badges" });
    }
  });
  app.get("/api/v1/badges/user/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      const badges = await badgeService.getUserBadges(userId);
      const stats = await badgeService.getUserBadgeStats(userId);
      res.status(200).json({
        success: true,
        data: {
          badges,
          stats
        }
      });
    } catch (error) {
      console.error("Error fetching user badges:", error);
      res.status(500).json({ success: false, message: "Failed to fetch badges" });
    }
  });
  app.get("/api/v1/badges", async (req, res) => {
    try {
      const badges = await badgeService.getAllBadges();
      res.status(200).json({
        success: true,
        data: badges,
        count: badges.length
      });
    } catch (error) {
      console.error("Error fetching badges:", error);
      res.status(500).json({ success: false, message: "Failed to fetch badges" });
    }
  });
  app.get("/api/v1/badges/:badgeId", async (req, res) => {
    const { badgeId } = req.params;
    try {
      const badge = await badgeService.getBadge(badgeId);
      if (badge) {
        res.status(200).json({ success: true, data: badge });
      } else {
        res.status(404).json({ success: false, message: "Badge not found" });
      }
    } catch (error) {
      console.error("Error fetching badge:", error);
      res.status(500).json({ success: false, message: "Failed to fetch badge" });
    }
  });
  app.get("/api/v1/badges/user/:userId/stats", async (req, res) => {
    const { userId } = req.params;
    try {
      const stats = await badgeService.getUserBadgeStats(userId);
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      console.error("Error fetching badge stats:", error);
      res.status(500).json({ success: false, message: "Failed to fetch badge stats" });
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
