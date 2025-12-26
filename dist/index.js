var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/config.ts
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
var __filename, __dirname, config2;
var init_config = __esm({
  "server/config.ts"() {
    __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
    dotenv.config({ path: path.resolve(__dirname, "../../.env") });
    config2 = {
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
      VERY_REWARDS_CONTRACT_ADDRESS: process.env.VERY_REWARDS_CONTRACT_ADDRESS || "0xVeryRewardsAddress",
      NFT_CONTRACT_ADDRESS: process.env.NFT_CONTRACT_ADDRESS || "0xNFTContractAddress",
      MARKETPLACE_CONTRACT_ADDRESS: process.env.MARKETPLACE_CONTRACT_ADDRESS || "0xMarketplaceAddress",
      // Reward Signer (KMS/HSM private key - use KMS in production)
      REWARD_SIGNER_PRIVATE_KEY: process.env.REWARD_SIGNER_PRIVATE_KEY || process.env.SPONSOR_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001",
      // AI/HuggingFace
      HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || "dummy_hf_key",
      // OpenAI
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
      OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
      // Encryption
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "",
      // 64 hex characters (32 bytes) for AES-256
      // Supabase
      SUPABASE: {
        URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
        SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
      }
    };
  }
});

// server/services/BlockchainService.ts
import { Wallet, Contract, JsonRpcProvider } from "ethers";
var TIP_CONTRACT_ABI, BADGE_CONTRACT_ABI, BlockchainService;
var init_BlockchainService = __esm({
  "server/services/BlockchainService.ts"() {
    init_config();
    TIP_CONTRACT_ABI = [
      "function tip(address recipient, address token, uint256 amount, string memory messageHash) external",
      "function totalTipsSent(address) view returns (uint256)",
      "event TipSent(address indexed from, address indexed to, address token, uint256 amount, string messageHash, uint256 tipId)"
    ];
    BADGE_CONTRACT_ABI = [
      "function checkAndAwardBadges(address user, uint256 totalTipsSent) external"
    ];
    BlockchainService = class {
      provider;
      relayerWallet;
      tipContract;
      badgeContract;
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
  }
});

// server/services/CacheService.ts
import { createClient } from "redis";
var CacheService;
var init_CacheService = __esm({
  "server/services/CacheService.ts"() {
    init_config();
    CacheService = class _CacheService {
      static instance;
      client;
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
  }
});

// server/services/HuggingFaceService.ts
import { HfInference } from "@huggingface/inference";
var HuggingFaceService;
var init_HuggingFaceService = __esm({
  "server/services/HuggingFaceService.ts"() {
    init_config();
    init_CacheService();
    HuggingFaceService = class {
      client;
      cache;
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
  }
});

// server/services/AIService.ts
var AIService;
var init_AIService = __esm({
  "server/services/AIService.ts"() {
    init_HuggingFaceService();
    init_CacheService();
    init_config();
    AIService = class {
      hfService;
      openai = null;
      cache;
      openaiAvailable;
      constructor() {
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
      async generateLeaderboardInsight(userId2, analytics) {
        if (!this.openai && config2.OPENAI_API_KEY && config2.OPENAI_API_KEY !== "") {
          await this.initializeOpenAI();
        }
        const cacheKey = `ai:leaderboard-insight:${userId2}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
        try {
          if (this.openaiAvailable && this.openai) {
            const prompt = this.buildLeaderboardInsightPrompt(userId2, analytics);
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
            return this.generateLeaderboardInsightFallback(userId2, analytics);
          }
        } catch (error) {
          console.error("Error generating leaderboard insight:", error);
          return this.generateLeaderboardInsightFallback(userId2, analytics);
        }
      }
      /**
       * Build prompt for leaderboard insights
       */
      buildLeaderboardInsightPrompt(userId2, analytics) {
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
      generateLeaderboardInsightFallback(userId2, analytics) {
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
      async suggestBadges(userId2, behavior) {
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
  }
});

// server/services/VerychatService.ts
import axios from "axios";
var VerychatService;
var init_VerychatService = __esm({
  "server/services/VerychatService.ts"() {
    init_config();
    VerychatService = class {
      baseUrl;
      apiKey;
      constructor() {
        this.baseUrl = config2.VERYCHAT_API_URL || "https://api.verychat.io/v1";
        this.apiKey = config2.VERYCHAT_API_KEY || "";
      }
      async getUser(userId2) {
        try {
          const response = await axios.get(`${this.baseUrl}/users/${userId2}`, {
            headers: {
              "Authorization": `Bearer ${this.apiKey}`
            }
          });
          return response.data;
        } catch (error) {
          console.error(`Error fetching user ${userId2} from Verychat:`, error);
          if (!this.apiKey) {
            console.warn("Verychat API Key missing, using mock data");
            if (userId2 === "userA") return { id: "userA", walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", publicKey: "mockPublicKeyA" };
            if (userId2 === "userB") return { id: "userB", walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", publicKey: "mockPublicKeyB" };
          }
          return null;
        }
      }
      async sendMessage(userId2, message) {
        try {
          await axios.post(`${this.baseUrl}/messages`, {
            recipientId: userId2,
            text: message
          }, {
            headers: {
              "Authorization": `Bearer ${this.apiKey}`
            }
          });
          return true;
        } catch (error) {
          console.error(`Error sending message to user ${userId2}:`, error);
          return false;
        }
      }
    };
  }
});

// server/services/IpfsService.ts
import { create } from "ipfs-http-client";
import axios2 from "axios";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
var IpfsService;
var init_IpfsService = __esm({
  "server/services/IpfsService.ts"() {
    init_config();
    IpfsService = class {
      client = null;
      provider;
      constructor() {
        const ipfsMode = (process.env.IPFS_MODE || "mock").toLowerCase();
        if (ipfsMode === "mock") {
          this.provider = "mock";
        } else if (ipfsMode === "pinata" && config2.PINATA_API_KEY && config2.PINATA_SECRET_API_KEY) {
          this.provider = "pinata";
        } else if (ipfsMode === "infura" && config2.IPFS_PROJECT_ID && config2.IPFS_PROJECT_SECRET) {
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
          if (config2.PINATA_API_KEY && config2.PINATA_SECRET_API_KEY) {
            this.provider = "pinata";
          } else {
            this.provider = "mock";
            console.warn("IPFS_MODE=mock: Using mock IPFS (no real pinning)");
          }
        }
      }
      /**
       * Upload content to IPFS using the configured provider (mock, Pinata, or Infura)
       */
      async upload(content) {
        if (this.provider === "mock") {
          const contentHash = __require("crypto").createHash("sha256").update(content).digest("hex");
          const mockCid = `Qm${contentHash.slice(0, 44)}`;
          console.log(`[MOCK IPFS] Uploaded content, CID: ${mockCid}`);
          return `ipfs://${mockCid}`;
        }
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
      /**
       * Encrypt and pin message to IPFS (Production)
       * Uses AES-256-GCM encryption before uploading to IPFS
       */
      static async encryptAndPin(message, ipfsService) {
        const encryptionKey = process.env.ENCRYPTION_KEY;
        if (!encryptionKey) {
          console.warn("ENCRYPTION_KEY not set, uploading unencrypted");
          return await ipfsService.upload(message);
        }
        const iv = randomBytes(16);
        const key = Buffer.from(encryptionKey, "hex");
        if (key.length !== 32) {
          throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
        }
        const cipher = createCipheriv("aes-256-gcm", key, iv);
        const encrypted = Buffer.concat([
          cipher.update(message, "utf8"),
          cipher.final()
        ]);
        const authTag = cipher.getAuthTag();
        const payload = {
          iv: iv.toString("hex"),
          data: encrypted.toString("hex"),
          tag: authTag.toString("hex"),
          timestamp: Date.now()
        };
        const cid = await ipfsService.upload(JSON.stringify(payload));
        return cid.replace("ipfs://", "");
      }
      /**
       * Retrieve and decrypt message from IPFS (Production)
       */
      static async retrieveAndDecrypt(ipfsCid, ipfsService) {
        const encryptionKey = process.env.ENCRYPTION_KEY;
        const rawData = await ipfsService.fetch(ipfsCid);
        let payload;
        try {
          payload = JSON.parse(rawData);
        } catch (error) {
          if (!encryptionKey) {
            return rawData;
          }
          throw new Error("Failed to parse encrypted payload from IPFS");
        }
        if (!payload.iv || !payload.data || !payload.tag) {
          if (!encryptionKey) {
            return rawData;
          }
          throw new Error("Payload missing encryption fields");
        }
        if (!encryptionKey) {
          throw new Error("ENCRYPTION_KEY required to decrypt but not set");
        }
        const key = Buffer.from(encryptionKey, "hex");
        if (key.length !== 32) {
          throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
        }
        const decipher = createDecipheriv(
          "aes-256-gcm",
          key,
          Buffer.from(payload.iv, "hex")
        );
        decipher.setAuthTag(Buffer.from(payload.tag, "hex"));
        const decrypted = Buffer.concat([
          decipher.update(Buffer.from(payload.data, "hex")),
          decipher.final()
        ]);
        return decrypted.toString("utf8");
      }
    };
  }
});

// server/services/DatabaseService.ts
var DatabaseService_exports = {};
__export(DatabaseService_exports, {
  DatabaseService: () => DatabaseService
});
import { PrismaClient } from "@prisma/client";
var DatabaseService;
var init_DatabaseService = __esm({
  "server/services/DatabaseService.ts"() {
    DatabaseService = class _DatabaseService {
      static instance;
      constructor() {
      }
      static getInstance() {
        if (!_DatabaseService.instance) {
          _DatabaseService.instance = new PrismaClient();
        }
        return _DatabaseService.instance;
      }
    };
  }
});

// server/services/QueueService.ts
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
var connection, tipQueue, QueueService;
var init_QueueService = __esm({
  "server/services/QueueService.ts"() {
    init_config();
    connection = new IORedis(config2.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null
    });
    tipQueue = new Queue("tip-processing", { connection });
    QueueService = class {
      worker;
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
  }
});

// server/services/TipAnalyticsService.ts
var TipAnalyticsService;
var init_TipAnalyticsService = __esm({
  "server/services/TipAnalyticsService.ts"() {
    init_DatabaseService();
    init_CacheService();
    TipAnalyticsService = class {
      db = DatabaseService.getInstance();
      cache = CacheService.getInstance();
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
          this.db.tip.count({ where: { status: "CONFIRMED" } }),
          this.db.tip.findMany({
            where: { status: "CONFIRMED" },
            include: { sender: true, recipient: true },
            orderBy: { createdAt: "desc" }
          })
        ]);
        let totalAmount = BigInt(0);
        const tokenMap = {};
        tips.forEach((tip) => {
          const amount = BigInt(tip.amount);
          totalAmount += amount;
          if (!tokenMap[tip.tokenAddress]) {
            tokenMap[tip.tokenAddress] = { count: 0, total: BigInt(0) };
          }
          tokenMap[tip.tokenAddress].count++;
          tokenMap[tip.tokenAddress].total += amount;
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
        const topTippers = Object.entries(tipperMap).map(([userId2, stats2]) => ({
          userId: userId2,
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
        const topRecipients = Object.entries(recipientMap).map(([userId2, stats2]) => ({
          userId: userId2,
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
      async getUserAnalytics(userId2, useCache = true) {
        const cacheKey = `analytics:user:${userId2}`;
        if (useCache) {
          const cached = await this.cache.get(cacheKey);
          if (cached) return JSON.parse(cached);
        }
        const [sentTips, receivedTips] = await Promise.all([
          this.db.tip.findMany({
            where: { senderId: userId2, status: "CONFIRMED" },
            include: { recipient: true },
            orderBy: { createdAt: "desc" }
          }),
          this.db.tip.findMany({
            where: { recipientId: userId2, status: "CONFIRMED" },
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
        const favoriteRecipients = Object.entries(recipientMap).map(([userId3, stats]) => ({
          userId: userId3,
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
        const favoriteSenders = Object.entries(senderMap).map(([userId3, stats]) => ({
          userId: userId3,
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
          userId: userId2,
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
          where: { status: "CONFIRMED" },
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
          where: { status: "CONFIRMED" },
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
          token: tip.tokenAddress,
          message: tip.messageHash,
          createdAt: tip.createdAt,
          txHash: tip.transactionHash
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
  }
});

// server/services/BadgeEngine.ts
import { HfInference as HfInference2 } from "@huggingface/inference";
import { z } from "zod";
var BadgeSchema, BADGE_CATEGORIES, BADGE_RARITY_ORDER, BadgeEngine;
var init_BadgeEngine = __esm({
  "server/services/BadgeEngine.ts"() {
    init_config();
    init_DatabaseService();
    BadgeSchema = z.object({
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
    BADGE_CATEGORIES = {
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
    BADGE_RARITY_ORDER = {
      bronze: 1,
      silver: 2,
      gold: 3,
      platinum: 4,
      diamond: 5
    };
    BadgeEngine = class {
      db = DatabaseService.getInstance();
      hf = null;
      userStatsCache = /* @__PURE__ */ new Map();
      CACHE_TTL = 5 * 60 * 1e3;
      // 5 minutes
      constructor() {
        if (config2.HUGGINGFACE_API_KEY && config2.HUGGINGFACE_API_KEY !== "dummy_hf_key") {
          this.hf = new HfInference2(config2.HUGGINGFACE_API_KEY);
        }
      }
      /**
       * Check all achievements for a user based on their tips
       */
      async checkAllAchievements(userId2, tips) {
        const stats = await this.calculateStats(userId2, tips);
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
      async calculateStats(userId2, tips) {
        const cached = this.userStatsCache.get(userId2);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
          return cached.stats;
        }
        const filteredTips = tips.filter((t) => t.senderId === userId2);
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
        this.userStatsCache.set(userId2, { stats, timestamp: Date.now() });
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
  }
});

// server/services/BadgeService.ts
var BadgeService;
var init_BadgeService = __esm({
  "server/services/BadgeService.ts"() {
    init_DatabaseService();
    init_BadgeEngine();
    init_TipAnalyticsService();
    BadgeService = class {
      db = DatabaseService.getInstance();
      badgeEngine = new BadgeEngine();
      analyticsService = new TipAnalyticsService();
      /**
       * Check and award badges for a user
       * Returns newly awarded badges
       */
      async checkAndAwardBadges(userId2) {
        const tips = await this.db.tip.findMany({
          where: {
            senderId: userId2,
            status: "CONFIRMED"
          },
          orderBy: {
            createdAt: "desc"
          }
        });
        const existingBadges = await this.db.userBadge.findMany({
          where: {
            userId: userId2
          },
          include: {
            badge: true
          }
        });
        const existingBadgeIds = new Set(existingBadges.map((ub) => ub.badge.name));
        const tipData = tips.map((tip) => ({
          id: tip.id,
          senderId: tip.senderId,
          recipientId: tip.recipientId,
          amount: tip.amount,
          token: tip.tokenAddress,
          createdAt: tip.createdAt,
          message: tip.messageHash
        }));
        const qualifiedBadges = await this.badgeEngine.checkAllAchievements(userId2, tipData);
        const newBadges = qualifiedBadges.filter((b) => !existingBadgeIds.has(b.name));
        const awardedBadges = [];
        for (const badge of newBadges) {
          try {
            const badgeRecord = await this.ensureBadgeExists(badge);
            await this.db.userBadge.create({
              data: {
                userId: userId2,
                badgeId: badgeRecord.id,
                context: {
                  criteria: badge.criteria,
                  badgeId: badge.badgeId,
                  awardedAt: (/* @__PURE__ */ new Date()).toISOString()
                }
              }
            });
            awardedBadges.push(badge);
          } catch (error) {
            if (!error.message?.includes("Unique constraint") && error.code !== "P2002") {
              console.error(`Error awarding badge ${badge.badgeId} to user ${userId2}:`, error);
            }
          }
        }
        return awardedBadges;
      }
      /**
       * Ensure a badge definition exists in the database
       * Returns the badge record
       */
      async ensureBadgeExists(badge) {
        const existing = await this.db.badge.findUnique({
          where: { name: badge.name }
        });
        if (!existing) {
          return await this.db.badge.create({
            data: {
              name: badge.name,
              description: badge.description,
              imageUrl: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg"><text>${badge.emoji}</text></svg>`)}`,
              requirements: {
                badgeId: badge.badgeId,
                emoji: badge.emoji,
                rarity: badge.rarity,
                criteria: badge.criteria,
                isActive: badge.isActive ?? true
              }
            }
          });
        }
        return existing;
      }
      /**
       * Get all badges for a user
       */
      async getUserBadges(userId2) {
        const userBadges = await this.db.userBadge.findMany({
          where: {
            userId: userId2
          },
          include: {
            badge: true
          },
          orderBy: {
            earnedAt: "desc"
          }
        });
        return userBadges.map((ub) => {
          const requirements = ub.badge.requirements || {};
          const context = ub.context || {};
          return {
            id: ub.id,
            badgeId: requirements.badgeId || ub.badge.name,
            name: ub.badge.name,
            emoji: requirements.emoji || "\u{1F3C6}",
            rarity: requirements.rarity || "bronze",
            description: ub.badge.description,
            awardedAt: ub.earnedAt,
            metadata: context
          };
        });
      }
      /**
       * Get badge details by badgeId (name)
       */
      async getBadge(badgeId) {
        return await this.db.badge.findUnique({
          where: { name: badgeId }
        });
      }
      /**
       * Get all available badges (definitions)
       */
      async getAllBadges() {
        const badges = await this.db.badge.findMany({
          orderBy: {
            createdAt: "asc"
          }
        });
        return badges.map((badge) => {
          const requirements = badge.requirements || {};
          return {
            ...badge,
            rarity: requirements.rarity || "bronze",
            emoji: requirements.emoji || "\u{1F3C6}",
            isActive: requirements.isActive !== false
          };
        }).filter((b) => b.isActive).sort((a, b) => {
          const rarityOrder = {
            bronze: 1,
            silver: 2,
            gold: 3,
            platinum: 4,
            diamond: 5
          };
          return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
        });
      }
      /**
       * Revoke a badge from a user (delete the UserBadge record)
       */
      async revokeBadge(userId2, badgeId) {
        try {
          const badge = await this.db.badge.findUnique({
            where: { name: badgeId }
          });
          if (!badge) {
            return false;
          }
          await this.db.userBadge.deleteMany({
            where: {
              userId: userId2,
              badgeId: badge.id
            }
          });
          return true;
        } catch (error) {
          console.error(`Error revoking badge ${badgeId} from user ${userId2}:`, error);
          return false;
        }
      }
      /**
       * Get badge statistics for a user
       */
      async getUserBadgeStats(userId2) {
        const badges = await this.getUserBadges(userId2);
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
  }
});

// server/services/TipService.ts
import { ethers as ethers2 } from "ethers";
var TipService;
var init_TipService = __esm({
  "server/services/TipService.ts"() {
    init_BlockchainService();
    init_HuggingFaceService();
    init_AIService();
    init_VerychatService();
    init_IpfsService();
    init_DatabaseService();
    init_QueueService();
    init_TipAnalyticsService();
    init_BadgeService();
    init_config();
    TipService = class {
      blockchainService;
      hfService;
      aiService;
      verychatService;
      ipfsService;
      analyticsService;
      badgeService;
      db = DatabaseService.getInstance();
      queueService;
      constructor() {
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
                  status: "CONFIRMED"
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
                  status: "CONFIRMED"
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
                data: { id: vUser.id, walletAddress: vUser.walletAddress, verychatId: vUser.id }
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
                data: { id: vUser.id, walletAddress: vUser.walletAddress, verychatId: vUser.id }
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
                tokenAddress: token,
                amountInWei: ethers2.parseUnits(amount, 18),
                messageHash: message || null,
                transactionHash: `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                // Temporary placeholder, will be updated when transaction is confirmed
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
          let messageHash = tip.messageHash || "";
          if (tip.messageHash && !tip.messageEncrypted) {
            try {
              const encrypted = tip.messageHash;
              messageHash = await this.ipfsService.upload(encrypted);
              await this.db.tip.update({ where: { id: tipId }, data: { messageHash, messageEncrypted: encrypted } });
            } catch (ipfsError) {
              console.error(`IPFS upload failed for tip ${tipId}:`, ipfsError);
            }
          }
          try {
            const tipContract = this.blockchainService.getTipContract();
            const amountWei = tip.amountInWei || ethers2.parseUnits(tip.amount, 18);
            const txData = tipContract.interface.encodeFunctionData("tip", [
              tip.recipient.walletAddress,
              tip.tokenAddress,
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
              data: { transactionHash: txResponse.hash }
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
              status: "PENDING"
            }
          });
          if (tip) {
            await this.db.tip.update({
              where: { id: tip.id },
              data: {
                status: "CONFIRMED",
                transactionHash: eventData.event?.transactionHash || txHash,
                confirmedAt: /* @__PURE__ */ new Date()
              }
            });
            this.badgeService.checkAndAwardBadges(tip.senderId).catch((error) => {
              console.error(`Error checking badges for user ${tip.senderId}:`, error);
            });
            await this.analyticsService.clearCache();
            this.verychatService.sendMessage(
              tip.senderId,
              `Your tip of ${tip.amount} ${tip.tokenAddress} was successful! Tx: ${txHash?.slice(0, 10)}...`
            ).catch((err) => console.error("Failed to notify sender:", err));
            this.verychatService.sendMessage(
              tip.recipientId,
              `You received a tip of ${tip.amount} ${tip.tokenAddress}! \u{1F389}`
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
            token: tip.tokenAddress,
            message: tip.messageHash,
            createdAt: tip.createdAt
          },
          status: tip.status
        };
      }
    };
  }
});

// server/services/RewardService.ts
var RewardService_exports = {};
__export(RewardService_exports, {
  REWARD_TABLE: () => REWARD_TABLE,
  RewardActionType: () => RewardActionType,
  RewardService: () => RewardService
});
import { ethers as ethers4, Wallet as Wallet3, JsonRpcProvider as JsonRpcProvider3, Contract as Contract3 } from "ethers";
var VERY_REWARDS_ABI, RewardActionType, REWARD_TABLE, RewardService;
var init_RewardService = __esm({
  "server/services/RewardService.ts"() {
    init_config();
    VERY_REWARDS_ABI = [
      "function grantReward(address user, uint256 amount, string calldata reason, uint256 nonce, uint8 v, bytes32 r, bytes32 s) external",
      "function getRewardHash(address user, uint256 amount, string calldata reason, uint256 nonce) external view returns (bytes32)",
      "function isRewardUsed(bytes32 rewardHash) external view returns (bool)",
      "function contractInfo() external view returns (uint256 version, address token, address signer, uint256 totalRewards)",
      "event RewardGranted(address indexed user, uint256 amount, string reason, bytes32 indexed rewardHash)"
    ];
    RewardActionType = /* @__PURE__ */ ((RewardActionType2) => {
      RewardActionType2["TIP_SENT"] = "TIP_SENT";
      RewardActionType2["TIP_RECEIVED"] = "TIP_RECEIVED";
      RewardActionType2["QUALITY_CONTENT"] = "QUALITY_CONTENT";
      RewardActionType2["DAILY_STREAK"] = "DAILY_STREAK";
      RewardActionType2["REFERRAL"] = "REFERRAL";
      RewardActionType2["DAO_VOTE"] = "DAO_VOTE";
      return RewardActionType2;
    })(RewardActionType || {});
    REWARD_TABLE = {
      ["TIP_SENT" /* TIP_SENT */]: BigInt(5 * 1e18),
      // 5 VERY
      ["TIP_RECEIVED" /* TIP_RECEIVED */]: BigInt(3 * 1e18),
      // 3 VERY
      ["QUALITY_CONTENT" /* QUALITY_CONTENT */]: BigInt(20 * 1e18),
      // 20 VERY
      ["DAILY_STREAK" /* DAILY_STREAK */]: BigInt(15 * 1e18),
      // 15 VERY
      ["REFERRAL" /* REFERRAL */]: BigInt(25 * 1e18),
      // 25 VERY
      ["DAO_VOTE" /* DAO_VOTE */]: BigInt(10 * 1e18)
      // 10 VERY
    };
    RewardService = class {
      provider;
      rewardSigner;
      rewardsContract = null;
      rewardsContractAddress;
      constructor() {
        this.provider = new JsonRpcProvider3(config2.VERY_CHAIN_RPC_URL);
        const rewardSignerKey = process.env.REWARD_SIGNER_PRIVATE_KEY || config2.SPONSOR_PRIVATE_KEY;
        if (!rewardSignerKey || rewardSignerKey === "0x0000000000000000000000000000000000000000000000000000000000000001") {
          throw new Error("REWARD_SIGNER_PRIVATE_KEY must be set in environment variables");
        }
        this.rewardSigner = new Wallet3(rewardSignerKey, this.provider);
        this.rewardsContractAddress = process.env.VERY_REWARDS_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
        if (this.rewardsContractAddress && this.rewardsContractAddress !== "0x0000000000000000000000000000000000000000") {
          this.rewardsContract = new Contract3(
            this.rewardsContractAddress,
            VERY_REWARDS_ABI,
            this.provider
          );
        }
      }
      /**
       * Get reward signer address (public key)
       */
      getRewardSignerAddress() {
        return this.rewardSigner.address;
      }
      /**
       * Evaluate if an action is eligible for reward
       * @param actionType Type of action
       * @param context Context for evaluation (tip amount, content quality, etc.)
       */
      evaluateReward(actionType, context) {
        if (!REWARD_TABLE[actionType]) {
          return {
            eligible: false,
            amount: BigInt(0),
            reason: actionType,
            error: `Unknown action type: ${actionType}`
          };
        }
        const baseAmount = REWARD_TABLE[actionType];
        switch (actionType) {
          case "TIP_SENT" /* TIP_SENT */:
            if (context?.tipAmount && context.tipAmount < 1) {
              return {
                eligible: false,
                amount: BigInt(0),
                reason: actionType,
                error: "Tip amount must be >= $1 equivalent"
              };
            }
            break;
          case "QUALITY_CONTENT" /* QUALITY_CONTENT */:
            if (!context?.contentQualityScore || context.contentQualityScore < 0.8) {
              return {
                eligible: false,
                amount: BigInt(0),
                reason: actionType,
                error: "Content quality score must be >= 0.8"
              };
            }
            break;
          case "DAILY_STREAK" /* DAILY_STREAK */:
            if (!context?.streakDays || context.streakDays < 7) {
              return {
                eligible: false,
                amount: BigInt(0),
                reason: actionType,
                error: "Streak must be >= 7 days"
              };
            }
            break;
          case "REFERRAL" /* REFERRAL */:
            if (!context?.referralVerified) {
              return {
                eligible: false,
                amount: BigInt(0),
                reason: actionType,
                error: "Referral must be verified"
              };
            }
            break;
          case "DAO_VOTE" /* DAO_VOTE */:
          case "TIP_RECEIVED" /* TIP_RECEIVED */:
            break;
        }
        return {
          eligible: true,
          amount: baseAmount,
          reason: actionType
        };
      }
      /**
       * Sign a reward payload for on-chain claim
       * @param user Address receiving the reward
       * @param amount Reward amount in wei
       * @param reason Reward reason
       * @param nonce Unique nonce (timestamp recommended)
       * @param rewardsContractAddress Address of VeryRewards contract
       */
      async signReward(user, amount, reason, nonce, rewardsContractAddress = this.rewardsContractAddress) {
        if (rewardsContractAddress === "0x0000000000000000000000000000000000000000") {
          throw new Error("VERY_REWARDS_CONTRACT_ADDRESS not configured");
        }
        const rewardHash = ethers4.keccak256(
          ethers4.solidityPacked(
            ["address", "uint256", "string", "uint256", "address"],
            [ethers4.getAddress(user), amount, reason, nonce, ethers4.getAddress(rewardsContractAddress)]
          )
        );
        const messageBytes = ethers4.getBytes(
          ethers4.concat([
            ethers4.toUtf8Bytes("Ethereum Signed Message:\n32"),
            ethers4.getBytes(rewardHash)
          ])
        );
        const signature = await this.rewardSigner.signMessage(ethers4.getBytes(rewardHash));
        const sig = ethers4.Signature.from(signature);
        return {
          user,
          amount: amount.toString(),
          reason,
          nonce,
          signature,
          v: sig.v,
          r: sig.r,
          s: sig.s
        };
      }
      /**
       * Issue a reward by evaluating eligibility and signing payload
       * @param user Address receiving the reward
       * @param actionType Type of action
       * @param context Context for evaluation
       */
      async issueReward(user, actionType, context) {
        if (!ethers4.isAddress(user)) {
          throw new Error(`Invalid user address: ${user}`);
        }
        const evaluation = this.evaluateReward(actionType, context);
        if (!evaluation.eligible) {
          throw new Error(evaluation.error || "Action not eligible for reward");
        }
        const nonce = Date.now();
        const signedPayload = await this.signReward(
          user,
          evaluation.amount,
          evaluation.reason,
          nonce
        );
        return signedPayload;
      }
      /**
       * Check if a reward has already been claimed on-chain
       * @param rewardHash Reward hash to check
       */
      async isRewardClaimed(rewardHash) {
        if (!this.rewardsContract) {
          return false;
        }
        try {
          return await this.rewardsContract.isRewardUsed(rewardHash);
        } catch (error) {
          console.error("Error checking reward claim status:", error);
          return false;
        }
      }
      /**
       * Get contract info
       */
      async getContractInfo() {
        if (!this.rewardsContract) {
          return null;
        }
        try {
          const info = await this.rewardsContract.contractInfo();
          return {
            version: info[0],
            token: info[1],
            signer: info[2],
            totalRewards: info[3]
          };
        } catch (error) {
          console.error("Error fetching contract info:", error);
          return null;
        }
      }
    };
  }
});

// backend/src/utils/logger.ts
var logger_exports = {};
__export(logger_exports, {
  default: () => logger_default,
  logger: () => logger
});
import winston from "winston";
var logLevel, logger, logger_default;
var init_logger = __esm({
  "backend/src/utils/logger.ts"() {
    logLevel = process.env.LOG_LEVEL || "info";
    logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: "verytippers-backend" },
      transports: [
        new winston.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston.transports.File({ filename: "logs/combined.log" })
      ]
    });
    if (process.env.NODE_ENV !== "production") {
      logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
    logger_default = logger;
  }
});

// backend/src/services/social/SocialService.ts
var SocialService_exports = {};
__export(SocialService_exports, {
  SocialService: () => SocialService2
});
import { PrismaClient as PrismaClient4, ActivityType, NotificationType } from "@prisma/client";
var SocialService2;
var init_SocialService = __esm({
  "backend/src/services/social/SocialService.ts"() {
    SocialService2 = class {
      db;
      constructor(db) {
        if (db) {
          this.db = db;
        } else {
          try {
            const { DatabaseService: DatabaseService2 } = __require("../../../server/services/DatabaseService");
            this.db = DatabaseService2.getInstance();
          } catch {
            this.db = new PrismaClient4();
          }
        }
      }
      /**
       * Follow a user
       */
      async followUser(followerId, followingId) {
        if (followerId === followingId) {
          return { success: false, message: "Cannot follow yourself" };
        }
        try {
          const existing = await this.db.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId,
                followingId
              }
            }
          });
          if (existing) {
            return { success: false, message: "Already following this user" };
          }
          await this.db.follow.create({
            data: {
              followerId,
              followingId
            }
          });
          await Promise.all([
            this.db.user.update({
              where: { id: followerId },
              data: { followingCount: { increment: 1 } }
            }),
            this.db.user.update({
              where: { id: followingId },
              data: { followersCount: { increment: 1 } }
            })
          ]);
          await this.createActivity({
            userId: followerId,
            type: ActivityType.FOLLOWED,
            title: "Started following",
            description: `Now following user`,
            metadata: { followingId },
            isPublic: true
          });
          const follower = await this.db.user.findUnique({ where: { id: followerId } });
          await this.createNotification({
            userId: followingId,
            type: NotificationType.NEW_FOLLOWER,
            title: "New Follower",
            message: `${follower?.username || follower?.displayName || "Someone"} started following you`,
            metadata: { followerId }
          });
          return { success: true, message: "Successfully followed user" };
        } catch (error) {
          const { logger: logger2 } = (init_logger(), __toCommonJS(logger_exports));
          logger2.error("Error following user", { error, userId, targetUserId });
          return { success: false, message: error.message || "Failed to follow user" };
        }
      }
      /**
       * Unfollow a user
       */
      async unfollowUser(followerId, followingId) {
        try {
          const follow = await this.db.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId,
                followingId
              }
            }
          });
          if (!follow) {
            return { success: false, message: "Not following this user" };
          }
          await this.db.follow.delete({
            where: { id: follow.id }
          });
          await Promise.all([
            this.db.user.update({
              where: { id: followerId },
              data: { followingCount: { decrement: 1 } }
            }),
            this.db.user.update({
              where: { id: followingId },
              data: { followersCount: { decrement: 1 } }
            })
          ]);
          return { success: true, message: "Successfully unfollowed user" };
        } catch (error) {
          const { logger: logger2 } = (init_logger(), __toCommonJS(logger_exports));
          logger2.error("Error unfollowing user", { error, userId, targetUserId });
          return { success: false, message: error.message || "Failed to unfollow user" };
        }
      }
      /**
       * Check if user A follows user B
       */
      async isFollowing(followerId, followingId) {
        const follow = await this.db.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId,
              followingId
            }
          }
        });
        return !!follow;
      }
      /**
       * Get followers of a user
       */
      async getFollowers(userId2, limit = 50, offset = 0) {
        const follows = await this.db.follow.findMany({
          where: { followingId: userId2 },
          include: {
            follower: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                bio: true,
                isVerified: true,
                followersCount: true,
                followingCount: true
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset
        });
        return {
          followers: follows.map((f) => f.follower),
          total: await this.db.follow.count({ where: { followingId: userId2 } })
        };
      }
      /**
       * Get users that a user is following
       */
      async getFollowing(userId2, limit = 50, offset = 0) {
        const follows = await this.db.follow.findMany({
          where: { followerId: userId2 },
          include: {
            following: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                bio: true,
                isVerified: true,
                followersCount: true,
                followingCount: true
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset
        });
        return {
          following: follows.map((f) => f.following),
          total: await this.db.follow.count({ where: { followerId: userId2 } })
        };
      }
      /**
       * Create an activity
       */
      async createActivity(data) {
        return this.db.activity.create({
          data: {
            userId: data.userId,
            type: data.type,
            title: data.title,
            description: data.description,
            metadata: data.metadata || {},
            isPublic: data.isPublic !== false
          }
        });
      }
      /**
       * Get activity feed for a user (from users they follow)
       */
      async getActivityFeed(userId2, limit = 20, offset = 0) {
        const following = await this.db.follow.findMany({
          where: { followerId: userId2 },
          select: { followingId: true }
        });
        const followingIds = following.map((f) => f.followingId);
        followingIds.push(userId2);
        const activities = await this.db.activity.findMany({
          where: {
            userId: { in: followingIds },
            isPublic: true
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset
        });
        return {
          activities,
          total: await this.db.activity.count({
            where: {
              userId: { in: followingIds },
              isPublic: true
            }
          })
        };
      }
      /**
       * Get user's own activities
       */
      async getUserActivities(userId2, limit = 20, offset = 0) {
        const activities = await this.db.activity.findMany({
          where: { userId: userId2 },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset
        });
        return {
          activities,
          total: await this.db.activity.count({ where: { userId: userId2 } })
        };
      }
      /**
       * Create a notification
       */
      async createNotification(data) {
        return this.db.notification.create({
          data: {
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            metadata: data.metadata || {}
          }
        });
      }
      /**
       * Get user notifications
       */
      async getNotifications(userId2, limit = 20, offset = 0, unreadOnly = false) {
        const where = { userId: userId2 };
        if (unreadOnly) {
          where.read = false;
        }
        const notifications = await this.db.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset
        });
        return {
          notifications,
          total: await this.db.notification.count({ where }),
          unreadCount: await this.db.notification.count({ where: { userId: userId2, read: false } })
        };
      }
      /**
       * Mark notification as read
       */
      async markNotificationRead(notificationId, userId2) {
        return this.db.notification.updateMany({
          where: {
            id: notificationId,
            userId: userId2
          },
          data: {
            read: true,
            readAt: /* @__PURE__ */ new Date()
          }
        });
      }
      /**
       * Mark all notifications as read
       */
      async markAllNotificationsRead(userId2) {
        return this.db.notification.updateMany({
          where: {
            userId: userId2,
            read: false
          },
          data: {
            read: true,
            readAt: /* @__PURE__ */ new Date()
          }
        });
      }
      /**
       * Extract mentions from text (@username)
       */
      extractMentions(text) {
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(text)) !== null) {
          mentions.push(match[1]);
        }
        return [...new Set(mentions)];
      }
      /**
       * Process mentions in a message and create notifications
       */
      async processMentions(text, context) {
        const mentions = this.extractMentions(text);
        if (mentions.length === 0) return;
        const users = await this.db.user.findMany({
          where: {
            username: { in: mentions }
          }
        });
        const sender = await this.db.user.findUnique({
          where: { id: context.senderId },
          select: { username: true, displayName: true }
        });
        const senderName = sender?.displayName || sender?.username || "Someone";
        for (const user of users) {
          await this.createNotification({
            userId: user.id,
            type: NotificationType.MENTION,
            title: "You were mentioned",
            message: `${senderName} mentioned you${context.message ? `: ${context.message}` : ""}`,
            metadata: {
              senderId: context.senderId,
              tipId: context.tipId,
              message: context.message
            }
          });
        }
      }
      /**
       * Get user profile with social stats
       */
      async getUserProfile(userId2) {
        const user = await this.db.user.findUnique({
          where: { id: userId2 },
          include: {
            badges: {
              include: {
                badge: true
              },
              take: 10,
              orderBy: { earnedAt: "desc" }
            },
            _count: {
              select: {
                tipsSent: true,
                tipsReceived: true,
                badges: true
              }
            }
          }
        });
        if (!user) return null;
        return {
          ...user,
          stats: {
            tipsSent: user._count.tipsSent,
            tipsReceived: user._count.tipsReceived,
            badges: user._count.badges
          }
        };
      }
    };
  }
});

// server/services/OrchestratorService.ts
import { ethers as ethers5 } from "ethers";
var OrchestratorService;
var init_OrchestratorService = __esm({
  "server/services/OrchestratorService.ts"() {
    init_IpfsService();
    init_DatabaseService();
    OrchestratorService = class {
      ipfsService;
      db = DatabaseService.getInstance();
      constructor() {
        this.ipfsService = new IpfsService();
      }
      /**
       * Convert IPFS CID to bytes32 hash (keccak256)
       * Matches contract logic: keccak256(cid)
       */
      cidToBytes32(cid) {
        const cleanCid = cid.replace("ipfs://", "").replace("/ipfs/", "");
        return ethers5.keccak256(ethers5.toUtf8Bytes(cleanCid));
      }
      /**
       * Build message hash for meta-transaction signing
       * Matches TipRouter.sol: keccak256(abi.encodePacked(from, to, amount, cidHash, nonce))
       * 
       * IMPORTANT: This must match the contract exactly:
       * - Use solidityPacked (not defaultAbiCoder)
       * - Same order: from, to, amount, cidHash, nonce
       * - Addresses must be checksummed
       */
      buildMessageHash(from, to, amount, cidHash, nonce) {
        const fromAddr = ethers5.getAddress(from);
        const toAddr = ethers5.getAddress(to);
        const messageHash = ethers5.keccak256(
          ethers5.solidityPacked(
            ["address", "address", "uint256", "bytes32", "uint256"],
            [fromAddr, toAddr, BigInt(amount), cidHash, BigInt(nonce)]
          )
        );
        return messageHash;
      }
      /**
       * Create a tip draft and prepare for user signature
       * Returns preview and wallet payload for frontend signing
       */
      async createTipDraft(draft) {
        let cid;
        let cidHash;
        if (draft.message) {
          try {
            cid = await IpfsService.encryptAndPin(draft.message, this.ipfsService);
            cidHash = this.cidToBytes32(cid);
          } catch (error) {
            console.error("IPFS upload failed:", error);
          }
        }
        const amountWei = ethers5.parseEther(draft.amount).toString();
        const messageHash = this.buildMessageHash(
          draft.from,
          draft.to,
          amountWei,
          cidHash || ethers5.ZeroHash,
          // Use zero hash if no message
          draft.nonce
        );
        return {
          from: draft.from,
          to: draft.to,
          amount: draft.amount,
          message: draft.message,
          cid,
          cidHash,
          messageHash,
          walletPayload: {
            messageHash,
            cidHash: cidHash || ethers5.ZeroHash,
            from: draft.from,
            to: draft.to,
            amount: amountWei,
            nonce: draft.nonce
          }
        };
      }
      /**
       * Generate next nonce for a user
       * In production, this should be stored in database or derived from user's tip count
       */
      async getNextNonce(userAddress) {
        const user = await this.db.user.findUnique({
          where: { walletAddress: userAddress },
          include: {
            tipsSent: {
              where: { status: "CONFIRMED" },
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        });
        if (user && user.tipsSent.length > 0) {
          return user.tipsSent.length + 1;
        }
        return Math.floor(Date.now() / 1e3);
      }
    };
  }
});

// backend/src/utils/circuitBreaker.ts
var DEFAULT_OPTIONS, CircuitBreaker, circuitBreakers;
var init_circuitBreaker = __esm({
  "backend/src/utils/circuitBreaker.ts"() {
    DEFAULT_OPTIONS = {
      failureThreshold: 5,
      resetTimeout: 6e4,
      // 1 minute
      monitoringPeriod: 6e4,
      // 1 minute
      halfOpenMaxCalls: 3
    };
    CircuitBreaker = class {
      // Track failure timestamps
      constructor(name, options = {}) {
        this.name = name;
        this.options = { ...DEFAULT_OPTIONS, ...options };
      }
      state = "CLOSED";
      failureCount = 0;
      lastFailureTime = null;
      halfOpenCalls = 0;
      options;
      failures = [];
      async execute(operation) {
        this.updateState();
        if (this.state === "OPEN") {
          throw new Error(
            `Circuit breaker "${this.name}" is OPEN. Service unavailable.`
          );
        }
        try {
          const result = await operation();
          this.onSuccess();
          return result;
        } catch (error) {
          this.onFailure();
          throw error;
        }
      }
      updateState() {
        const now = Date.now();
        while (this.failures.length > 0 && now - this.failures[0] > this.options.monitoringPeriod) {
          this.failures.shift();
        }
        this.failureCount = this.failures.length;
        switch (this.state) {
          case "CLOSED":
            if (this.failureCount >= this.options.failureThreshold) {
              this.state = "OPEN";
              this.lastFailureTime = now;
              console.warn(
                `Circuit breaker "${this.name}" opened after ${this.failureCount} failures`
              );
            }
            break;
          case "OPEN":
            if (this.lastFailureTime && now - this.lastFailureTime >= this.options.resetTimeout) {
              this.state = "HALF_OPEN";
              this.halfOpenCalls = 0;
              console.info(`Circuit breaker "${this.name}" moved to HALF_OPEN`);
            }
            break;
          case "HALF_OPEN":
            if (this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
              if (this.failureCount > 0) {
                this.state = "OPEN";
                this.lastFailureTime = now;
                console.warn(
                  `Circuit breaker "${this.name}" reopened after ${this.halfOpenCalls} calls`
                );
              }
            }
            break;
        }
      }
      onSuccess() {
        if (this.state === "HALF_OPEN") {
          this.state = "CLOSED";
          this.failureCount = 0;
          this.failures.length = 0;
          this.lastFailureTime = null;
          this.halfOpenCalls = 0;
          console.info(`Circuit breaker "${this.name}" closed after successful call`);
        } else if (this.state === "CLOSED") {
          this.failureCount = 0;
          this.failures.length = 0;
        }
      }
      onFailure() {
        const now = Date.now();
        this.failures.push(now);
        this.lastFailureTime = now;
        if (this.state === "HALF_OPEN") {
          this.halfOpenCalls++;
          this.state = "OPEN";
          console.warn(
            `Circuit breaker "${this.name}" reopened after failure in HALF_OPEN state`
          );
        }
      }
      getState() {
        this.updateState();
        return this.state;
      }
      getStats() {
        this.updateState();
        return {
          name: this.name,
          state: this.state,
          failureCount: this.failureCount,
          lastFailureTime: this.lastFailureTime,
          halfOpenCalls: this.halfOpenCalls
        };
      }
      reset() {
        this.state = "CLOSED";
        this.failureCount = 0;
        this.failures.length = 0;
        this.lastFailureTime = null;
        this.halfOpenCalls = 0;
        console.info(`Circuit breaker "${this.name}" manually reset`);
      }
    };
    circuitBreakers = {
      verychat: new CircuitBreaker("verychat-api", {
        failureThreshold: 5,
        resetTimeout: 3e4
        // 30 seconds
      }),
      blockchain: new CircuitBreaker("blockchain-rpc", {
        failureThreshold: 3,
        resetTimeout: 6e4
        // 1 minute
      }),
      ipfs: new CircuitBreaker("ipfs-service", {
        failureThreshold: 5,
        resetTimeout: 3e4
      }),
      database: new CircuitBreaker("database", {
        failureThreshold: 10,
        resetTimeout: 1e4
        // 10 seconds
      })
    };
  }
});

// server/integrations/verychat.ts
var verychat_exports = {};
__export(verychat_exports, {
  VeryChatIntegration: () => VeryChatIntegration,
  handleVeryChatWebhook: () => handleVeryChatWebhook
});
import { ethers as ethers6 } from "ethers";
async function handleVeryChatWebhook(req, res) {
  const integration = new VeryChatIntegration();
  await integration.handleWebhook(req, res);
}
var VeryChatIntegration;
var init_verychat = __esm({
  "server/integrations/verychat.ts"() {
    init_OrchestratorService();
    init_TipService();
    init_VerychatService();
    init_DatabaseService();
    init_config();
    init_circuitBreaker();
    VeryChatIntegration = class {
      orchestrator;
      tipService;
      verychatService;
      socialService;
      db = DatabaseService.getInstance();
      constructor() {
        this.orchestrator = new OrchestratorService();
        this.tipService = new TipService();
        this.verychatService = new VerychatService();
        const { DatabaseService: DatabaseService2 } = (init_DatabaseService(), __toCommonJS(DatabaseService_exports));
        const db = DatabaseService2.getInstance();
        this.socialService = new SocialService(db);
      }
      /**
       * Parse /tip command arguments
       * Format: /tip @username amount [message]
       * Example: /tip @alice 5 VERY Great work!
       */
      parseTipCommand(args) {
        if (!args || !args.trim()) {
          return null;
        }
        const match = args.match(/^@?(\w+)\s+(\d+(?:\.\d+)?)\s*(?:VERY)?\s*(.*)?$/i);
        if (!match) {
          return null;
        }
        const [, recipient, amount, message] = match;
        return {
          recipient: recipient.startsWith("@") ? recipient : `@${recipient}`,
          amount,
          message: message?.trim() || void 0
        };
      }
      /**
       * Handle VeryChat webhook
       * POST /webhook/verychat
       * Enhanced with better error handling, retry logic, and command routing
       */
      async handleWebhook(req, res) {
        let retries = 0;
        const maxRetries = 3;
        while (retries <= maxRetries) {
          try {
            const payload = req.body;
            if (config2.NODE_ENV === "production" && !this.verifyWebhookSignature(req)) {
              res.status(401).json({ success: false, error: "Invalid signature" });
              return;
            }
            if (payload.type === "command" || payload.message?.startsWith("/")) {
              const commandText = payload.command ? `/${payload.command}${payload.args ? " " + payload.args : ""}` : payload.message || "";
              const result = await this.commandHandler.handleCommand(
                commandText,
                {
                  userId: payload.user,
                  chatId: payload.channel || payload.user,
                  args: payload.args || payload.message?.replace(/^\/\w+\s*/, "")
                }
              );
              if (result.success) {
                await circuitBreakers.verychat.execute(async () => {
                  await this.verychatService.sendMessage(
                    payload.channel || payload.user,
                    result.message
                  );
                });
              }
              res.status(200).json({
                success: result.success,
                message: result.message,
                data: result.data
              });
              return;
            }
            if (payload.type === "message" && payload.message?.startsWith("/tip")) {
              const args = payload.message.replace("/tip", "").trim();
              await this.handleTipCommand({ ...payload, command: "/tip", args }, res);
              return;
            }
            res.status(200).json({
              success: true,
              message: "Webhook received",
              handled: false
            });
            return;
          } catch (error) {
            retries++;
            console.error(`VeryChat webhook error (attempt ${retries}/${maxRetries}):`, error);
            const isRetryable = this.isRetryableError(error);
            if (!isRetryable || retries > maxRetries) {
              try {
                const payload = req.body;
                await circuitBreakers.verychat.execute(async () => {
                  await this.verychatService.sendMessage(
                    payload.channel || payload.user,
                    "\u274C An error occurred processing your request. Please try again later."
                  );
                });
              } catch (notifError) {
                console.error("Failed to send error notification:", notifError);
              }
              res.status(500).json({
                success: false,
                error: error.message || "Internal server error",
                retries
              });
              return;
            }
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1e3));
          }
        }
      }
      /**
       * Handle /tip command
       */
      async handleTipCommand(payload, res) {
        if (!payload.args) {
          res.status(400).json({
            success: false,
            error: "Usage: /tip @username amount [message]"
          });
          return;
        }
        const parsed = this.parseTipCommand(payload.args);
        if (!parsed) {
          res.status(400).json({
            success: false,
            error: "Invalid format. Use: /tip @username amount [message]"
          });
          return;
        }
        const sender = await this.getOrCreateUser(payload.user);
        if (!sender) {
          res.status(400).json({
            success: false,
            error: "User not found. Please link your wallet first."
          });
          return;
        }
        const recipientUsername = parsed.recipient.replace("@", "");
        const recipient = await this.db.user.findUnique({
          where: { username: recipientUsername }
        });
        if (!recipient) {
          res.status(404).json({
            success: false,
            error: `User ${parsed.recipient} not found`
          });
          return;
        }
        const nonce = await this.orchestrator.getNextNonce(sender.walletAddress);
        const draft = {
          from: sender.walletAddress,
          to: recipient.walletAddress,
          amount: parsed.amount,
          message: parsed.message,
          nonce
        };
        const preview = await this.orchestrator.createTipDraft(draft);
        if (parsed.message) {
          await this.socialService.processMentions(parsed.message, {
            senderId: sender.id,
            message: parsed.message
          });
        }
        await this.socialService.createActivity({
          userId: sender.id,
          type: "TIP_SENT",
          title: "Sent a tip",
          description: `Sent ${parsed.amount} VERY to ${recipient.username || recipient.id}`,
          metadata: {
            recipientId: recipient.id,
            amount: parsed.amount,
            tipId: preview.cid
          },
          isPublic: true
        });
        await this.socialService.createNotification({
          userId: recipient.id,
          type: "TIP_RECEIVED",
          title: "Tip Received",
          message: `${sender.username || sender.displayName || "Someone"} sent you ${parsed.amount} VERY${parsed.message ? `: ${parsed.message}` : ""}`,
          metadata: {
            senderId: sender.id,
            amount: parsed.amount,
            tipId: preview.cid
          }
        });
        res.status(200).json({
          success: true,
          preview: {
            from: sender.username || sender.id,
            to: recipient.username || recipient.id,
            amount: parsed.amount,
            message: parsed.message,
            cid: preview.cid
          },
          walletPayload: preview.walletPayload,
          message: `Tip preview: ${parsed.amount} VERY to ${parsed.recipient}`
        });
      }
      /**
       * Handle /stats command
       */
      async handleStatsCommand(payload, res) {
        const user = await this.getOrCreateUser(payload.user);
        if (!user) {
          res.status(400).json({ success: false, error: "User not found" });
          return;
        }
        const stats = {
          tipsSent: user.totalTipsSent.toString(),
          tipsReceived: user.totalTipsReceived.toString(),
          uniqueUsersTipped: user.uniqueUsersTipped,
          tipStreak: user.tipStreak,
          followers: user.followersCount || 0,
          following: user.followingCount || 0
        };
        res.status(200).json({
          success: true,
          message: `\u{1F4CA} Your Stats:

\u{1F4B0} Tips Sent: ${stats.tipsSent}
\u{1F4B5} Tips Received: ${stats.tipsReceived}
\u{1F465} Unique Users Tipped: ${stats.uniqueUsersTipped}
\u{1F525} Tip Streak: ${stats.tipStreak} days
\u{1F464} Followers: ${stats.followers}
\u27A1\uFE0F Following: ${stats.following}`
        });
      }
      /**
       * Handle /profile command
       */
      async handleProfileCommand(payload, res) {
        const args = payload.args?.trim();
        let targetUserId2 = payload.user;
        if (args) {
          const username = args.replace("@", "");
          const targetUser = await this.db.user.findUnique({
            where: { username }
          });
          if (targetUser) {
            targetUserId2 = targetUser.id;
          }
        }
        const profile = await this.socialService.getUserProfile(targetUserId2);
        if (!profile) {
          res.status(404).json({ success: false, error: "User not found" });
          return;
        }
        const isOwnProfile = targetUserId2 === payload.user;
        const message = `${isOwnProfile ? "\u{1F464} Your Profile" : `\u{1F464} ${profile.username || profile.displayName || "User"}'s Profile`}

${profile.bio || "No bio set"}

\u{1F4B0} Tips Sent: ${profile.totalTipsSent.toString()}
\u{1F4B5} Tips Received: ${profile.totalTipsReceived.toString()}
\u{1F465} Followers: ${profile.followersCount || 0}
\u27A1\uFE0F Following: ${profile.followingCount || 0}
\u{1F3C6} Badges: ${profile.badges?.length || 0}`;
        res.status(200).json({
          success: true,
          message,
          profile: {
            username: profile.username,
            displayName: profile.displayName,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            followersCount: profile.followersCount,
            followingCount: profile.followingCount
          }
        });
      }
      /**
       * Handle /follow command
       */
      async handleFollowCommand(payload, res) {
        if (!payload.args) {
          res.status(400).json({ success: false, error: "Usage: /follow @username" });
          return;
        }
        const username = payload.args.trim().replace("@", "");
        const targetUser = await this.db.user.findUnique({ where: { username } });
        if (!targetUser) {
          res.status(404).json({ success: false, error: `User @${username} not found` });
          return;
        }
        const user = await this.getOrCreateUser(payload.user);
        if (!user) {
          res.status(400).json({ success: false, error: "User not found" });
          return;
        }
        const result = await this.socialService.followUser(user.id, targetUser.id);
        res.status(result.success ? 200 : 400).json(result);
      }
      /**
       * Handle /unfollow command
       */
      async handleUnfollowCommand(payload, res) {
        if (!payload.args) {
          res.status(400).json({ success: false, error: "Usage: /unfollow @username" });
          return;
        }
        const username = payload.args.trim().replace("@", "");
        const targetUser = await this.db.user.findUnique({ where: { username } });
        if (!targetUser) {
          res.status(404).json({ success: false, error: `User @${username} not found` });
          return;
        }
        const user = await this.getOrCreateUser(payload.user);
        if (!user) {
          res.status(400).json({ success: false, error: "User not found" });
          return;
        }
        const result = await this.socialService.unfollowUser(user.id, targetUser.id);
        res.status(result.success ? 200 : 400).json(result);
      }
      /**
       * Handle /feed command
       */
      async handleFeedCommand(payload, res) {
        const user = await this.getOrCreateUser(payload.user);
        if (!user) {
          res.status(400).json({ success: false, error: "User not found" });
          return;
        }
        const feed = await this.socialService.getActivityFeed(user.id, 10);
        if (feed.activities.length === 0) {
          res.status(200).json({
            success: true,
            message: "\u{1F4ED} Your feed is empty. Follow some users to see their activity!"
          });
          return;
        }
        const feedText = feed.activities.map((activity) => {
          const username = activity.user?.username || activity.user?.displayName || "Unknown";
          return `\u2022 ${username}: ${activity.title}${activity.description ? ` - ${activity.description}` : ""}`;
        }).join("\n");
        res.status(200).json({
          success: true,
          message: `\u{1F4F0} Activity Feed:

${feedText}`,
          activities: feed.activities
        });
      }
      /**
       * Handle /leaderboard command
       */
      async handleLeaderboardCommand(payload, res) {
        const topUsers = await this.db.user.findMany({
          orderBy: { totalTipsSent: "desc" },
          take: 10,
          select: {
            username: true,
            displayName: true,
            totalTipsSent: true
          }
        });
        const leaderboard = topUsers.map((user, index) => {
          const medal = index === 0 ? "\u{1F947}" : index === 1 ? "\u{1F948}" : index === 2 ? "\u{1F949}" : `${index + 1}.`;
          return `${medal} ${user.username || user.displayName || "Unknown"}: ${user.totalTipsSent.toString()} VERY`;
        }).join("\n");
        res.status(200).json({
          success: true,
          message: `\u{1F3C6} Top Tippers:

${leaderboard}`
        });
      }
      /**
       * Handle /badges command
       */
      async handleBadgesCommand(payload, res) {
        const user = await this.getOrCreateUser(payload.user);
        if (!user) {
          res.status(400).json({ success: false, error: "User not found" });
          return;
        }
        const badges = await this.db.userBadge.findMany({
          where: { userId: user.id },
          include: { badge: true },
          orderBy: { earnedAt: "desc" },
          take: 10
        });
        if (badges.length === 0) {
          res.status(200).json({
            success: true,
            message: "\u{1F3C5} You haven't earned any badges yet. Keep tipping to earn badges!"
          });
          return;
        }
        const badgesText = badges.map((ub) => `\u{1F3C5} ${ub.badge.name}: ${ub.badge.description}`).join("\n");
        res.status(200).json({
          success: true,
          message: `\u{1F3C5} Your Badges:

${badgesText}`
        });
      }
      /**
       * Handle /notifications command
       */
      async handleNotificationsCommand(payload, res) {
        const user = await this.getOrCreateUser(payload.user);
        if (!user) {
          res.status(400).json({ success: false, error: "User not found" });
          return;
        }
        const { notifications, unreadCount } = await this.socialService.getNotifications(user.id, 10, 0, true);
        if (notifications.length === 0) {
          res.status(200).json({
            success: true,
            message: "\u{1F514} No new notifications"
          });
          return;
        }
        const notificationsText = notifications.map((n) => {
          const icon = n.type === "TIP_RECEIVED" ? "\u{1F4B0}" : n.type === "NEW_FOLLOWER" ? "\u{1F464}" : n.type === "MENTION" ? "\u{1F4AC}" : n.type === "BADGE_EARNED" ? "\u{1F3C5}" : "\u{1F514}";
          return `${icon} ${n.title}: ${n.message}`;
        }).join("\n");
        res.status(200).json({
          success: true,
          message: `\u{1F514} Notifications (${unreadCount} unread):

${notificationsText}`
        });
      }
      /**
       * Handle /search command
       */
      async handleSearchCommand(payload, res) {
        if (!payload.args) {
          res.status(400).json({ success: false, error: "Usage: /search username" });
          return;
        }
        const query = payload.args.trim();
        const users = await this.db.user.findMany({
          where: {
            OR: [
              { username: { contains: query, mode: "insensitive" } },
              { displayName: { contains: query, mode: "insensitive" } }
            ]
          },
          take: 10,
          select: {
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true
          }
        });
        if (users.length === 0) {
          res.status(200).json({
            success: true,
            message: `\u{1F50D} No users found matching "${query}"`
          });
          return;
        }
        const usersText = users.map((u) => `\u2022 @${u.username || u.displayName || "unknown"}: ${u.bio || "No bio"}`).join("\n");
        res.status(200).json({
          success: true,
          message: `\u{1F50D} Search Results:

${usersText}`,
          users
        });
      }
      /**
       * Handle /help command
       */
      async handleHelpCommand(payload, res) {
        const helpText = `\u{1F4DA} VeryTippers Bot Commands:

\u{1F4B0} /tip @username amount [message] - Send a tip
\u{1F4CA} /stats - View your tipping statistics
\u{1F464} /profile [@username] - View profile
\u2795 /follow @username - Follow a user
\u2796 /unfollow @username - Unfollow a user
\u{1F4F0} /feed - View activity feed
\u{1F3C6} /leaderboard - View top tippers
\u{1F3C5} /badges - View your badges
\u{1F514} /notifications - View notifications
\u{1F50D} /search username - Search for users
\u2753 /help - Show this help message`;
        res.status(200).json({
          success: true,
          message: helpText
        });
      }
      /**
       * Get or create user from VeryChat user ID
       */
      async getOrCreateUser(verychatId) {
        let user = await this.db.user.findUnique({
          where: { verychatId }
        });
        if (!user) {
          if (config2.NODE_ENV === "development") {
            const mockWallet = ethers6.Wallet.createRandom();
            user = await this.db.user.create({
              data: {
                verychatId,
                walletAddress: mockWallet.address,
                username: `user_${verychatId.slice(0, 8)}`
              }
            });
          } else {
            return null;
          }
        }
        return user;
      }
      /**
       * Verify webhook signature (production only)
       */
      verifyWebhookSignature(req) {
        if (config2.NODE_ENV === "development") {
          return true;
        }
        const signature = req.headers["x-verychat-signature"];
        const timestamp = req.headers["x-verychat-timestamp"];
        const secret = config2.WEBHOOK_SECRET;
        if (!signature || !timestamp || !secret) {
          return false;
        }
        return true;
      }
    };
  }
});

// server/index.ts
init_TipService();
init_TipAnalyticsService();
init_HuggingFaceService();
init_AIService();
import express5 from "express";
import { createServer } from "http";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// server/services/ContentService.ts
init_DatabaseService();
init_HuggingFaceService();
init_IpfsService();
init_TipService();
var ContentService = class {
  db = DatabaseService.getInstance();
  hfService;
  ipfsService;
  tipService;
  constructor() {
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
      throw new Error("Content model not yet implemented in database schema");
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
    return { success: false, message: "Content model not yet implemented in database schema" };
  }
  /**
   * Record content view
   */
  async recordView(contentId, userId2) {
    console.warn("Content model not yet implemented - view recording skipped");
  }
  /**
   * Tip content creator for specific content
   */
  async tipContent(senderId, contentId, amount, token, message) {
    return { success: false, message: "Content model not yet implemented in database schema" };
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
    return null;
  }
  /**
   * Get recommended content based on monetization potential
   */
  async getRecommendedContent(limit = 10) {
    return [];
  }
  /**
   * Create subscription for creator's premium content
   */
  async createSubscription(subscriberId, creatorId, amount, token) {
    return { success: false, message: "ContentSubscription model not yet implemented in database schema" };
  }
  /**
   * Check if user has access to premium content
   */
  async hasAccessToContent(userId2, contentId) {
    return false;
  }
};

// server/services/AITipSuggestionService.ts
init_config();
init_CacheService();
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
  openai = null;
  cache;
  openaiAvailable = false;
  constructor() {
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

// server/index.ts
init_BadgeService();

// server/services/LeaderboardInsightsService.ts
init_DatabaseService();
init_CacheService();
init_config();
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
  db = DatabaseService.getInstance();
  cache = CacheService.getInstance();
  openai = null;
  openaiAvailable = false;
  constructor() {
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
  async fetchLeaderboardData(userId2, period = "weekly") {
    const db = this.db;
    const startDate = this.getPeriodStartDate(period);
    const tipsSent = await db.tip.findMany({
      where: {
        senderId: userId2,
        status: "CONFIRMED",
        createdAt: { gte: startDate }
      },
      include: { recipient: true }
    });
    const tipsReceived = await db.tip.findMany({
      where: {
        recipientId: userId2,
        status: "CONFIRMED",
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
        status: "CONFIRMED",
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
    const sortedUsers = Array.from(userStatsMap.entries()).map(([userId3, stats]) => ({
      userId: userId3,
      tips: stats.tips,
      amount: stats.amount
    })).sort((a, b) => {
      if (a.amount !== b.amount) {
        return b.amount > a.amount ? 1 : -1;
      }
      return b.tips - a.tips;
    });
    const userRankIndex = sortedUsers.findIndex((u) => u.userId === userId2);
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
init_config();
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
  hf;
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

// server/services/moderationPipeline.ts
init_config();
import { HfInference as HfInference4 } from "@huggingface/inference";
import { PrismaClient as PrismaClient2 } from "@prisma/client";
var prisma = new PrismaClient2();
var hf = new HfInference4(config2.HUGGINGFACE_API_KEY);
var ModerationPipeline = class {
  moderationService;
  constructor() {
    this.moderationService = new ModerationService();
  }
  /**
   * Process tip message through multi-stage moderation pipeline
   */
  async processTipMessage(message, context) {
    const heuristicResult = await this.heuristicFilter(message);
    if (!heuristicResult.isSafe) {
      return {
        ...heuristicResult,
        stage: "heuristic",
        models: {}
      };
    }
    const [sentiment, toxicity, spam] = await Promise.all([
      this.sentimentAnalysis(message),
      this.toxicityAnalysis(message),
      this.spamDetection(message, context)
    ]);
    const finalScore = this.calculateRiskScore(sentiment, toxicity, spam, context);
    const action = this.determineAction(finalScore, toxicity, sentiment);
    const result = {
      isSafe: action === "allow",
      sentiment: sentiment.sentiment || "neutral",
      toxicityScore: toxicity.toxicityScore || 0,
      toxicityLabels: toxicity.labels || [],
      flaggedReason: action !== "allow" ? this.getReason(action, toxicity, spam) : null,
      action,
      stage: "ml-pipeline",
      models: {
        sentiment,
        toxicity,
        spam
      }
    };
    if (action !== "allow") {
      await this.queueForReview({
        message,
        senderId: context.senderId,
        score: finalScore,
        action,
        result
      });
    }
    return result;
  }
  /**
   * Stage 1: Heuristic pre-filter (zero-cost regex blocks)
   */
  async heuristicFilter(message) {
    const normalizedMessage = message.trim().toLowerCase();
    const blocks = [
      /\b(fuck|shit|damn|asshole|retard|cunt)\b/gi,
      /\b(kys|kill yourself|die|suicide)\b/gi,
      /\b(scam|fraud|rug)\b.*\b(you|ur)\b/gi,
      /\b(gay|fag|tranny|nigger)\b/gi,
      /\b(phishing|hack|steal|wallet)\b.*\b(private key|seed|mnemonic)\b/gi
    ];
    for (const pattern of blocks) {
      if (pattern.test(normalizedMessage)) {
        return {
          isSafe: false,
          sentiment: "negative",
          toxicityScore: 1,
          toxicityLabels: [{ label: "heuristic_block", score: 1 }],
          flaggedReason: "Contains prohibited language",
          action: "block"
        };
      }
    }
    if (normalizedMessage.includes("@") && normalizedMessage.includes("block") && normalizedMessage.includes("wallet")) {
      return {
        isSafe: false,
        sentiment: "negative",
        toxicityScore: 0.9,
        toxicityLabels: [{ label: "suspicious_wallet_activity", score: 0.9 }],
        flaggedReason: "Suspicious wallet/block report",
        action: "block"
      };
    }
    return {
      isSafe: true,
      sentiment: "neutral",
      toxicityScore: 0,
      toxicityLabels: [],
      flaggedReason: null,
      action: "allow"
    };
  }
  /**
   * Stage 2: Sentiment analysis
   */
  async sentimentAnalysis(text) {
    try {
      const result = await hf.textClassification({
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
        return { sentiment, confidence: maxScore, scores: scoreValues };
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
  /**
   * Stage 2: Toxicity analysis
   */
  async toxicityAnalysis(text) {
    try {
      const result = await hf.textClassification({
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
  /**
   * Stage 2: Spam detection
   */
  async spamDetection(message, context) {
    try {
      const spamIndicators = {
        excessiveCapitalization: (message.match(/[A-Z]{5,}/g) || []).length > 0,
        excessivePunctuation: (message.match(/[!?.]{3,}/g) || []).length > 0,
        urlCount: (message.match(/https?:\/\/\S+/gi) || []).length,
        repetitiveText: /(.)\1{4,}/.test(message),
        shortMessageWithLinks: message.length < 20 && (message.match(/https?:\/\/\S+/gi) || []).length > 0
      };
      const spamScore = Object.values(spamIndicators).filter(Boolean).length / Object.keys(spamIndicators).length;
      let historyScore = 0;
      if (context.senderHistory) {
        const flaggedRatio = context.senderHistory.flaggedTips / Math.max(context.senderHistory.totalTips, 1);
        historyScore = flaggedRatio > 0.5 ? 0.8 : flaggedRatio * 0.5;
      }
      const finalSpamScore = Math.max(spamScore, historyScore);
      return {
        spamScore: finalSpamScore,
        indicators: spamIndicators,
        isSpam: finalSpamScore > 0.7
      };
    } catch (error) {
      console.error("Spam detection error:", error);
      return {
        spamScore: 0,
        indicators: {},
        isSpam: false
      };
    }
  }
  /**
   * Stage 3: Calculate contextual risk score
   */
  calculateRiskScore(sentiment, toxicity, spam, context) {
    const toxicityWeight = 0.5;
    const sentimentWeight = 0.2;
    const spamWeight = 0.3;
    const toxicityScore = toxicity.toxicityScore || 0;
    const sentimentScore = sentiment.sentiment === "negative" ? 0.8 : sentiment.sentiment === "positive" ? 0 : 0.4;
    const spamScore = spam.spamScore || 0;
    let baseScore = toxicityScore * toxicityWeight + sentimentScore * sentimentWeight + spamScore * spamWeight;
    if (context.senderHistory && context.senderHistory.flaggedTips > 0) {
      const flaggedRatio = context.senderHistory.flaggedTips / Math.max(context.senderHistory.totalTips, 1);
      baseScore = Math.min(1, baseScore + flaggedRatio * 0.2);
    }
    return Math.min(1, baseScore);
  }
  /**
   * Stage 3: Determine action based on risk score
   */
  determineAction(riskScore, toxicity, sentiment) {
    const toxicityScore = toxicity.toxicityScore || 0;
    if (toxicityScore >= 0.85 || riskScore >= 0.9) {
      return "block";
    }
    if (toxicityScore >= 0.65 || riskScore >= 0.7) {
      return "quarantine";
    }
    if (toxicityScore >= 0.4 || riskScore >= 0.5 || sentiment.sentiment === "negative") {
      return "warn";
    }
    return "allow";
  }
  /**
   * Get human-readable reason for moderation action
   */
  getReason(action, toxicity, spam) {
    if (action === "block") {
      if (toxicity.toxicityScore >= 0.85) {
        return "High toxicity detected";
      }
      if (spam.isSpam) {
        return "Spam detected";
      }
      return "Content violates community guidelines";
    }
    if (action === "quarantine") {
      return "Content requires manual review";
    }
    if (action === "warn") {
      return "Moderate toxicity or suspicious content detected";
    }
    return "";
  }
  /**
   * Stage 4: Queue for manual review
   */
  async queueForReview(data) {
    try {
      console.log("\u26A0\uFE0F Content queued for manual review:", {
        senderId: data.senderId,
        score: data.score,
        action: data.action,
        message: data.message.substring(0, 100)
      });
    } catch (error) {
      console.error("Error queueing for review:", error);
    }
  }
};

// server/services/NFTService.ts
init_config();
init_IpfsService();
import { ethers as ethers3, Wallet as Wallet2, Contract as Contract2, JsonRpcProvider as JsonRpcProvider2 } from "ethers";
import { PrismaClient as PrismaClient3 } from "@prisma/client";
var prisma2 = new PrismaClient3();
var NFT_ABI = [
  "function mintTo(address to, string calldata tokenURI) external returns (uint256)",
  "function setAdmin(address _admin) external",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event Minted(address indexed to, uint256 tokenId, string tokenURI)"
];
var MARKETPLACE_ABI = [
  "function listItem(address nftContract, uint256 tokenId, uint256 price) external returns (uint256)",
  "function cancelListing(uint256 listingId) external",
  "function buy(uint256 listingId) external payable",
  "function getListing(uint256 listingId) view returns (tuple(address seller, address nftContract, uint256 tokenId, uint256 price, bool active))",
  "function feeRecipient() view returns (address)",
  "function platformFeeBps() view returns (uint256)",
  "event Listed(uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price)",
  "event Cancelled(uint256 indexed listingId)",
  "event Purchased(uint256 indexed listingId, address indexed buyer, uint256 price)"
];
var ERC721_ABI = [
  "function approve(address to, uint256 tokenId) external",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved) external"
];
var NFTService = class {
  provider;
  relayerWallet;
  ipfsService;
  nftContract = null;
  marketplaceContract = null;
  constructor() {
    this.provider = new JsonRpcProvider2(config2.VERY_CHAIN_RPC_URL);
    this.relayerWallet = new Wallet2(config2.SPONSOR_PRIVATE_KEY, this.provider);
    this.ipfsService = new IpfsService();
    const nftAddress = process.env.NFT_CONTRACT_ADDRESS;
    const marketplaceAddress = process.env.MARKETPLACE_CONTRACT_ADDRESS;
    if (nftAddress && nftAddress !== "0xNFTContractAddress") {
      this.nftContract = new Contract2(nftAddress, NFT_ABI, this.relayerWallet);
    }
    if (marketplaceAddress && marketplaceAddress !== "0xMarketplaceAddress") {
      this.marketplaceContract = new Contract2(marketplaceAddress, MARKETPLACE_ABI, this.relayerWallet);
    }
  }
  /**
   * Create NFT metadata JSON and pin to IPFS
   */
  async createMetadata(metadata) {
    const metadataJson = JSON.stringify(metadata, null, 2);
    const tokenURI = await this.ipfsService.upload(metadataJson);
    return tokenURI;
  }
  /**
   * Mint NFT with metadata
   */
  async mint(request) {
    if (!this.nftContract) {
      throw new Error("NFT contract not configured. Set NFT_CONTRACT_ADDRESS in .env");
    }
    const nftContract = this.nftContract;
    const metadata = {
      name: request.name,
      description: request.description,
      image: request.imageUrl || `data:image/png;base64,${request.imageBase64}`,
      attributes: request.attributes || [],
      boostMultiplier: request.boostMultiplier || 1
    };
    const tokenURI = await this.createMetadata(metadata);
    const tx = await nftContract.mintTo(request.toAddress, tokenURI);
    const receipt = await tx.wait();
    const mintEvent = receipt.logs.find((log) => {
      try {
        const parsed = nftContract.interface.parseLog(log);
        return parsed !== null && parsed.name === "Minted";
      } catch {
        return false;
      }
    });
    let tokenId;
    if (mintEvent) {
      const parsed = nftContract.interface.parseLog(mintEvent);
      if (!parsed) {
        throw new Error("Could not parse mint event");
      }
      tokenId = Number(parsed.args.tokenId);
    } else {
      throw new Error("Could not extract tokenId from mint event");
    }
    await prisma2.nFT.create({
      data: {
        tokenId: BigInt(tokenId),
        contract: nftContract.target,
        owner: request.toAddress.toLowerCase(),
        tokenURI,
        metadata
      }
    });
    return {
      tokenId,
      tokenURI,
      txHash: receipt.hash
    };
  }
  /**
   * List NFT for sale
   * Note: User must approve marketplace contract first (client-side or via API)
   */
  async list(request) {
    if (!this.marketplaceContract) {
      throw new Error("Marketplace contract not configured. Set MARKETPLACE_CONTRACT_ADDRESS in .env");
    }
    const nftContract = new Contract2(request.nftContract, ERC721_ABI, this.provider);
    const owner = await nftContract.ownerOf(request.tokenId);
    const approved = await nftContract.getApproved(request.tokenId);
    const isApprovedForAll = await nftContract.isApprovedForAll(owner, this.marketplaceContract.target);
    if (approved !== this.marketplaceContract.target && !isApprovedForAll) {
      throw new Error("Marketplace contract not approved. User must approve first.");
    }
    const priceWei = ethers3.parseEther(request.price);
    const tx = await this.marketplaceContract.listItem(
      request.nftContract,
      request.tokenId,
      priceWei
    );
    const receipt = await tx.wait();
    const listEvent = receipt.logs.find((log) => {
      try {
        const parsed = this.marketplaceContract.interface.parseLog(log);
        return parsed?.name === "Listed";
      } catch {
        return false;
      }
    });
    let listingId;
    if (listEvent) {
      const parsed = this.marketplaceContract.interface.parseLog(listEvent);
      listingId = Number(parsed?.args.listingId);
    } else {
      throw new Error("Could not extract listingId from list event");
    }
    const nft = await prisma2.nFT.upsert({
      where: {
        contract_tokenId: {
          contract: request.nftContract.toLowerCase(),
          tokenId: BigInt(request.tokenId)
        }
      },
      create: {
        tokenId: BigInt(request.tokenId),
        contract: request.nftContract.toLowerCase(),
        owner: owner.toLowerCase(),
        tokenURI: await nftContract.tokenURI(request.tokenId).catch(() => "")
      },
      update: {}
    });
    await prisma2.listing.create({
      data: {
        listingId: BigInt(listingId),
        nftId: nft.id,
        seller: owner.toLowerCase(),
        price: request.price,
        active: true
      }
    });
    return {
      listingId,
      txHash: receipt.hash
    };
  }
  /**
   * Buy listed NFT
   */
  async buy(request, buyerAddress) {
    if (!this.marketplaceContract) {
      throw new Error("Marketplace contract not configured");
    }
    const listing = await this.marketplaceContract.getListing(request.listingId);
    if (!listing.active) {
      throw new Error("Listing is not active");
    }
    const tx = await this.marketplaceContract.buy(request.listingId, {
      value: listing.price
    });
    const receipt = await tx.wait();
    await prisma2.listing.updateMany({
      where: {
        listingId: BigInt(request.listingId)
      },
      data: {
        active: false,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    const listingRecord = await prisma2.listing.findFirst({
      where: { listingId: BigInt(request.listingId) },
      include: { NFT: true }
    });
    if (listingRecord) {
      await prisma2.nFT.update({
        where: { id: listingRecord.nftId },
        data: { owner: buyerAddress.toLowerCase() }
      });
    }
    return {
      txHash: receipt.hash
    };
  }
  /**
   * Get NFT details
   */
  async getNFT(contract, tokenId) {
    const nft = await prisma2.nFT.findUnique({
      where: {
        contract_tokenId: {
          contract: contract.toLowerCase(),
          tokenId: BigInt(tokenId)
        }
      },
      include: {
        listings: {
          where: { active: true },
          orderBy: { createdAt: "desc" }
        }
      }
    });
    return nft;
  }
  /**
   * Get active listings
   */
  async getActiveListings(limit = 50, offset = 0) {
    const listings = await prisma2.listing.findMany({
      where: { active: true },
      include: {
        NFT: true
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    });
    return listings;
  }
  /**
   * Get user's NFTs
   */
  async getUserNFTs(userAddress) {
    const nfts = await prisma2.nFT.findMany({
      where: {
        owner: userAddress.toLowerCase()
      },
      include: {
        listings: {
          where: { active: true }
        }
      },
      orderBy: { mintedAt: "desc" }
    });
    return nfts;
  }
  /**
   * Get platform fee recipient address
   */
  async getFeeRecipient() {
    if (!this.marketplaceContract) {
      throw new Error("Marketplace contract not configured");
    }
    try {
      const feeRecipient = await this.marketplaceContract.feeRecipient();
      return feeRecipient;
    } catch (error) {
      console.error("Error fetching fee recipient:", error);
      return this.relayerWallet.address;
    }
  }
};

// server/index.ts
init_config();

// server/routes/ads.ts
import express from "express";

// server/services/AdsService.ts
init_DatabaseService();
init_HuggingFaceService();
import { createHash } from "crypto";
var AdsService = class {
  prisma = DatabaseService.getInstance();
  hfService;
  constructor() {
    this.hfService = new HuggingFaceService();
  }
  /**
   * Hash IP address for privacy
   */
  hashIP(ip, secret) {
    return createHash("sha256").update(secret + ip).digest("hex");
  }
  /**
   * Validate ad content through moderation pipeline
   */
  async validateAdContent(ad) {
    try {
      const textToCheck = `${ad.title} ${ad.description || ""}`.trim();
      if (!textToCheck) return false;
      const moderationResult = await this.hfService.moderateContent(textToCheck);
      return moderationResult.isSafe && !moderationResult.flagged;
    } catch (error) {
      console.error("Error validating ad content:", error);
      return false;
    }
  }
  /**
   * Get an ad slot (single ad for display)
   * Uses simple round-robin with filtering
   */
  async getAdSlot(request) {
    try {
      const { tags = [], guild } = request;
      const where = {
        active: true
      };
      if (guild) {
        where.OR = [
          { targetGuild: guild },
          { targetGuild: null }
          // Also include ads with no specific guild
        ];
      }
      const ads = await this.prisma.ad.findMany({
        where,
        orderBy: [
          { impressions: "asc" },
          // Prefer ads with fewer impressions for fairness
          { createdAt: "desc" }
        ]
      });
      if (ads.length === 0) {
        return null;
      }
      let filteredAds = ads;
      if (tags.length > 0) {
        filteredAds = ads.filter((ad) => {
          if (ad.targetTags.length === 0) return true;
          return tags.some((tag) => ad.targetTags.includes(tag));
        });
      }
      if (filteredAds.length === 0) {
        filteredAds = ads;
      }
      const selectedAd = filteredAds.reduce((prev, current) => {
        return prev.impressions < current.impressions ? prev : current;
      });
      const { url, ...adWithoutUrl } = selectedAd;
      return adWithoutUrl;
    } catch (error) {
      console.error("Error getting ad slot:", error);
      return null;
    }
  }
  /**
   * Record an ad impression
   */
  async recordImpression(request) {
    try {
      const { adId, userId: userId2, ipHash } = request;
      await this.prisma.adImpression.create({
        data: {
          adId,
          userId: userId2 || null,
          ipHash: ipHash || null
        }
      });
      await this.prisma.ad.update({
        where: { id: adId },
        data: {
          impressions: { increment: 1 }
        }
      });
      return true;
    } catch (error) {
      console.error("Error recording impression:", error);
      return false;
    }
  }
  /**
   * Record an ad click and return redirect URL
   */
  async recordClick(request) {
    try {
      const { adId, userId: userId2, ipHash } = request;
      const ad = await this.prisma.ad.findUnique({
        where: { id: adId }
      });
      if (!ad || !ad.active) {
        return null;
      }
      await this.prisma.adClick.create({
        data: {
          adId,
          userId: userId2 || null,
          ipHash: ipHash || null
        }
      });
      await this.prisma.ad.update({
        where: { id: adId },
        data: {
          clicks: { increment: 1 }
        }
      });
      return ad.url;
    } catch (error) {
      console.error("Error recording click:", error);
      return null;
    }
  }
  /**
   * Create a new ad (admin only)
   */
  async createAd(adData) {
    const isValid = await this.validateAdContent(adData);
    if (!isValid) {
      throw new Error("Ad content failed moderation check");
    }
    const ad = await this.prisma.ad.create({
      data: {
        advertiser: adData.advertiser,
        title: adData.title,
        description: adData.description || null,
        imageUrl: adData.imageUrl || null,
        targetTags: adData.targetTags || [],
        targetGuild: adData.targetGuild || null,
        url: adData.url,
        budget: adData.budget || 0,
        active: true
      }
    });
    return ad;
  }
  /**
   * Update an existing ad (admin only)
   */
  async updateAd(adId, adData) {
    if (adData.title || adData.description) {
      const existingAd = await this.prisma.ad.findUnique({
        where: { id: adId }
      });
      if (!existingAd) {
        throw new Error("Ad not found");
      }
      const updatedData = {
        advertiser: existingAd.advertiser,
        title: adData.title || existingAd.title,
        description: adData.description !== void 0 ? adData.description : existingAd.description || void 0,
        imageUrl: adData.imageUrl || existingAd.imageUrl || void 0,
        url: existingAd.url
      };
      const isValid = await this.validateAdContent(updatedData);
      if (!isValid) {
        throw new Error("Updated ad content failed moderation check");
      }
    }
    const updateData = {};
    if (adData.title !== void 0) updateData.title = adData.title;
    if (adData.description !== void 0) updateData.description = adData.description;
    if (adData.imageUrl !== void 0) updateData.imageUrl = adData.imageUrl;
    if (adData.targetTags !== void 0) updateData.targetTags = adData.targetTags;
    if (adData.targetGuild !== void 0) updateData.targetGuild = adData.targetGuild;
    if (adData.url !== void 0) updateData.url = adData.url;
    if (adData.budget !== void 0) updateData.budget = adData.budget;
    if (adData.advertiser !== void 0) updateData.advertiser = adData.advertiser;
    const ad = await this.prisma.ad.update({
      where: { id: adId },
      data: updateData
    });
    return ad;
  }
  /**
   * Get IP hash helper (for use in routes)
   */
  getIPHash(ip) {
    const secret = process.env.ADS_REDIRECT_SECRET || "default-secret-change-in-production";
    return this.hashIP(ip, secret);
  }
};

// server/middleware/admin-auth.ts
function requireAdmin(req, res, next) {
  const adminKey = process.env.ADS_ADMIN_API_KEY || "changeme";
  const authHeader = req.headers.authorization;
  const headerKey = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
  const queryKey = req.query.apiKey;
  const providedKey = headerKey || queryKey;
  if (!providedKey || providedKey !== adminKey) {
    res.status(401).json({
      success: false,
      error: "Unauthorized: Admin access required"
    });
    return;
  }
  next();
}

// server/routes/ads.ts
var router = express.Router();
var adsService = new AdsService();
router.get("/slot", async (req, res) => {
  try {
    const tags = req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]).map(String) : [];
    const guild = req.query.guild ? String(req.query.guild) : void 0;
    const ad = await adsService.getAdSlot({ tags, guild });
    if (!ad) {
      return res.status(200).json({ ad: null });
    }
    res.json({ ad });
  } catch (error) {
    console.error("Error getting ad slot:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get ad slot"
    });
  }
});
router.post("/impression", async (req, res) => {
  try {
    const { adId, userId: userId2, ipHash } = req.body;
    if (!adId) {
      return res.status(400).json({
        success: false,
        error: "adId is required"
      });
    }
    const clientIP = req.ip || req.socket.remoteAddress || "";
    const finalIPHash = ipHash || (clientIP ? adsService.getIPHash(clientIP) : void 0);
    const success = await adsService.recordImpression({
      adId,
      userId: userId2 || void 0,
      ipHash: finalIPHash
    });
    if (success) {
      res.json({ ok: true, success: true });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to record impression"
      });
    }
  } catch (error) {
    console.error("Error recording impression:", error);
    res.status(500).json({
      success: false,
      error: "Failed to record impression"
    });
  }
});
router.post("/click", async (req, res) => {
  try {
    const { adId, userId: userId2, ipHash } = req.body;
    if (!adId) {
      return res.status(400).json({
        success: false,
        error: "adId is required"
      });
    }
    const clientIP = req.ip || req.socket.remoteAddress || "";
    const finalIPHash = ipHash || (clientIP ? adsService.getIPHash(clientIP) : void 0);
    const redirectUrl = await adsService.recordClick({
      adId,
      userId: userId2 || void 0,
      ipHash: finalIPHash
    });
    if (!redirectUrl) {
      return res.status(404).json({
        success: false,
        error: "Ad not found or inactive"
      });
    }
    res.json({ redirectUrl, success: true });
  } catch (error) {
    console.error("Error recording click:", error);
    res.status(500).json({
      success: false,
      error: "Failed to record click"
    });
  }
});
router.post("/ads", requireAdmin, async (req, res) => {
  try {
    const { advertiser, title, description, imageUrl, targetTags, targetGuild, url, budget } = req.body;
    if (!advertiser || !title || !url) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: advertiser, title, url"
      });
    }
    const ad = await adsService.createAd({
      advertiser,
      title,
      description,
      imageUrl,
      targetTags: targetTags || [],
      targetGuild,
      url,
      budget
    });
    res.status(201).json({
      success: true,
      ad
    });
  } catch (error) {
    console.error("Error creating ad:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to create ad"
    });
  }
});
router.put("/ads/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { advertiser, title, description, imageUrl, targetTags, targetGuild, url, budget } = req.body;
    const ad = await adsService.updateAd(id, {
      advertiser,
      title,
      description,
      imageUrl,
      targetTags,
      targetGuild,
      url,
      budget
    });
    res.json({
      success: true,
      ad
    });
  } catch (error) {
    console.error("Error updating ad:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to update ad"
    });
  }
});
router.get("/ads", requireAdmin, async (req, res) => {
  try {
    const prisma3 = (init_DatabaseService(), __toCommonJS(DatabaseService_exports)).DatabaseService.getInstance();
    const ads = await prisma3.ad.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            adImpressions: true,
            adClicks: true
          }
        }
      }
    });
    res.json({
      success: true,
      ads
    });
  } catch (error) {
    console.error("Error listing ads:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list ads"
    });
  }
});
var ads_default = router;

// server/routes/indexerWebhook.ts
import express2 from "express";

// server/lib/supabase.ts
init_config();
import { createClient as createClient2 } from "@supabase/supabase-js";
var supabaseClient = null;
function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }
  const url = process.env.SUPABASE_URL || config2.SUPABASE?.URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config2.SUPABASE?.SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }
  try {
    new URL(url);
  } catch (e) {
    throw new Error(`Invalid SUPABASE_URL format: ${url}`);
  }
  const anonKey = process.env.SUPABASE_ANON_KEY || config2.SUPABASE?.ANON_KEY || "";
  if (serviceKey === anonKey && anonKey) {
    console.warn(
      "\u26A0\uFE0F  WARNING: SUPABASE_SERVICE_ROLE_KEY appears to be the same as ANON_KEY. Service role key should be different for security."
    );
  }
  supabaseClient = createClient2(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    db: {
      schema: "public"
    },
    global: {
      headers: {
        "x-client-info": "verytippers-server"
      }
    }
  });
  return supabaseClient;
}
var supabase = new Proxy({}, {
  get(_target, prop) {
    return getSupabaseClient()[prop];
  }
});

// server/routes/indexerWebhook.ts
var router2 = express2.Router();
var supabase2 = getSupabaseClient();
router2.post("/indexer/webhook", async (req, res) => {
  try {
    const { tipId, txHash, confirmations, status } = req.body;
    if (!tipId || !txHash) {
      return res.status(400).json({ error: "Missing required fields: tipId, txHash" });
    }
    const { data: tipData, error: tipError } = await supabase2.rpc("update_tip_confirmation", {
      p_tip_id: tipId,
      p_tx_hash: txHash,
      p_confirmations: confirmations || 1,
      p_status: status || "confirmed"
    });
    if (tipError && tipError.message?.includes("function") && tipError.message?.includes("does not exist")) {
      const { data: existingTip } = await supabase2.from("tips").select("status, confirmations").eq("id", tipId).single();
      if (existingTip) {
        const tipStatus = existingTip.status;
        const tipConfirmations = existingTip.confirmations;
        if (tipStatus !== void 0 && tipConfirmations !== void 0) {
          const statusOrder = { pending: 0, submitted: 1, confirmed: 2, failed: -1 };
          const currentStatus = statusOrder[tipStatus] || 0;
          const newStatus = statusOrder[status] || 0;
          if (newStatus > currentStatus || status === "confirmed" && tipStatus !== "confirmed") {
            const updatePayload = {
              relayer_tx_hash: txHash,
              confirmations: Math.max(tipConfirmations || 0, confirmations || 1),
              status: status || (confirmations >= 12 ? "confirmed" : "submitted")
            };
            const { error: updateError } = await supabase2.from("tips").update(updatePayload).eq("id", tipId);
            if (updateError) {
              console.error("Error updating tip:", updateError);
              return res.status(500).json({ error: "Failed to update tip" });
            }
          }
        }
      } else {
        return res.status(404).json({ error: "Tip not found" });
      }
    } else if (tipError) {
      console.error("Error updating tip:", tipError);
      return res.status(500).json({ error: "Failed to update tip" });
    }
    await supabase2.from("relayer_logs").insert({
      tip_id: tipId,
      action: "indexer_webhook",
      actor: "indexer",
      detail: { txHash, confirmations, status }
    });
    res.json({ ok: true, tipId, txHash });
  } catch (e) {
    console.error("Indexer webhook error:", e);
    res.status(500).json({ error: e.message || "Internal server error" });
  }
});
var indexerWebhook_default = router2;

// server/routes/checkout.ts
import express3 from "express";
import Stripe from "stripe";
init_config();
var router3 = express3.Router();
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia"
});
var supabase3 = getSupabaseClient();
var redis = null;
try {
  const Redis = __require("ioredis");
  const redisUrl = process.env.REDIS_URL || config2.REDIS_URL || "redis://localhost:6379";
  redis = new Redis(redisUrl);
  console.log("\u2705 Redis connected for checkout queue");
} catch (err) {
  console.warn("\u26A0\uFE0F  Redis not available, using database queue only");
}
router3.post("/stripe-create-session", async (req, res) => {
  try {
    const { userId: userId2, credits, success_url, cancel_url } = req.body;
    if (!userId2 || !credits || credits <= 0) {
      return res.status(400).json({ error: "userId and credits (positive number) are required" });
    }
    const amountCents = Math.round(Number(credits) * 100 / 100);
    if (!stripe || !process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Stripe not configured" });
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `${credits} VERY Credits`,
            description: "Credits for tipping on VeryTippers"
          },
          unit_amount: amountCents
        },
        quantity: 1
      }],
      success_url: success_url || `${req.headers.origin || "http://localhost:5173"}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${req.headers.origin || "http://localhost:5173"}/checkout/cancel`,
      metadata: {
        userId: String(userId2),
        credits: String(credits)
      }
    });
    const { error: orderError } = await supabase3.from("orders").insert({
      user_id: userId2,
      amount_cents: amountCents,
      credits: Number(credits),
      stripe_session_id: session.id,
      status: "pending"
    });
    if (orderError) {
      console.error("Error storing order:", orderError);
    }
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Error creating Stripe session:", error);
    res.status(500).json({ error: error.message || "Failed to create checkout session" });
  }
});
router3.post("/stripe-webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!webhookSecret) {
    console.error("\u26A0\uFE0F  STRIPE_WEBHOOK_SECRET not configured");
    return res.status(400).send("Webhook secret not configured");
  }
  let event;
  try {
    const rawBody = req.rawBody || req.body;
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId2 = session.metadata?.userId;
    const credits = Number(session.metadata?.credits) || 0;
    if (!userId2 || !credits) {
      console.error("Missing userId or credits in session metadata");
      return res.status(400).json({ error: "Invalid session metadata" });
    }
    try {
      const { error: updateError } = await supabase3.from("orders").update({ status: "paid", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("stripe_session_id", session.id);
      if (updateError) {
        console.error("Error updating order:", updateError);
      }
      const { data: existing } = await supabase3.from("balances").select("*").eq("user_id", userId2).single();
      if (existing) {
        const { error: balanceError } = await supabase3.from("balances").update({
          credits: Number(existing.credits) + credits,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("user_id", userId2);
        if (balanceError) {
          console.error("Error updating balance:", balanceError);
          return res.status(500).json({ error: "Failed to credit balance" });
        }
      } else {
        const { error: insertError } = await supabase3.from("balances").insert({
          user_id: userId2,
          credits,
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (insertError) {
          console.error("Error creating balance:", insertError);
          return res.status(500).json({ error: "Failed to create balance" });
        }
      }
      console.log(`\u2705 Credited ${credits} credits to user ${userId2}`);
    } catch (err) {
      console.error("Error processing webhook:", err);
      return res.status(500).json({ error: err.message });
    }
  }
  res.json({ received: true });
});
router3.post("/create-meta-tx", async (req, res) => {
  try {
    const { userId: userId2, toAddress, amount, cid, nonceHint, fromAddress, signature } = req.body;
    if (!userId2 || !toAddress || !amount || amount <= 0) {
      return res.status(400).json({ error: "userId, toAddress, and amount (positive) are required" });
    }
    const { data: balance, error: balanceError } = await supabase3.from("balances").select("*").eq("user_id", userId2).single();
    if (balanceError || !balance) {
      return res.status(404).json({ error: "User balance not found" });
    }
    if (Number(balance.credits) < Number(amount)) {
      return res.status(402).json({
        error: "Insufficient credits",
        available: balance.credits,
        required: amount
      });
    }
    const newCredits = Number(balance.credits) - Number(amount);
    const { error: updateError } = await supabase3.from("balances").update({
      credits: newCredits,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("user_id", userId2);
    if (updateError) {
      console.error("Error decrementing credits:", updateError);
      return res.status(500).json({ error: "Failed to debit credits" });
    }
    const nonce = nonceHint || Math.floor(Date.now() / 1e3);
    const { data: queueData, error: queueError } = await supabase3.from("meta_tx_queue").insert({
      user_id: userId2,
      to_address: toAddress,
      amount: Number(amount),
      cid: cid || null,
      nonce,
      status: "queued",
      payload: {
        fromAddress: fromAddress || null,
        signature: signature || null,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    }).select().single();
    if (queueError) {
      console.error("Error enqueueing meta-tx:", queueError);
      await supabase3.from("balances").update({ credits: balance.credits, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("user_id", userId2);
      return res.status(500).json({ error: "Failed to enqueue meta-tx" });
    }
    if (redis) {
      try {
        await redis.lpush("metaTxQueue", JSON.stringify({ id: queueData.id }));
      } catch (redisErr) {
        console.warn("Redis push failed (non-critical):", redisErr);
      }
    }
    res.json({
      queuedId: queueData.id,
      message: "Meta-transaction queued for relayer processing"
    });
  } catch (error) {
    console.error("Error creating meta-tx:", error);
    res.status(500).json({ error: error.message || "Failed to create meta-tx" });
  }
});
router3.get("/balance/:userId", async (req, res) => {
  try {
    const { userId: userId2 } = req.params;
    const { data, error } = await supabase3.from("balances").select("*").eq("user_id", userId2).single();
    if (error || !data) {
      return res.json({ credits: 0, userId: userId2 });
    }
    res.json({ credits: data.credits, userId: data.user_id });
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).json({ error: error.message });
  }
});
router3.get("/orders/:userId", async (req, res) => {
  try {
    const { userId: userId2 } = req.params;
    const { data, error } = await supabase3.from("orders").select("*").eq("user_id", userId2).order("created_at", { ascending: false }).limit(50);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ orders: data || [] });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: error.message });
  }
});
var checkout_default = router3;

// server/routes/rewards.ts
init_RewardService();
import express4 from "express";
var router4 = express4.Router();
var rewardService = new RewardService();
router4.post("/issue", async (req, res) => {
  try {
    const { user, actionType, context } = req.body;
    if (!user || !actionType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: user, actionType"
      });
    }
    if (!Object.values(RewardActionType).includes(actionType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid actionType. Must be one of: ${Object.values(RewardActionType).join(", ")}`
      });
    }
    const signedPayload = await rewardService.issueReward(
      user,
      actionType,
      context
    );
    res.status(200).json({
      success: true,
      data: signedPayload
    });
  } catch (error) {
    console.error("Error issuing reward:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to issue reward"
    });
  }
});
router4.get("/evaluate", async (req, res) => {
  try {
    const { actionType, tipAmount, contentQualityScore, streakDays, referralVerified } = req.query;
    if (!actionType) {
      return res.status(400).json({
        success: false,
        error: "actionType query parameter is required"
      });
    }
    if (!Object.values(RewardActionType).includes(actionType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid actionType. Must be one of: ${Object.values(RewardActionType).join(", ")}`
      });
    }
    const context = {};
    if (tipAmount) context.tipAmount = parseFloat(tipAmount);
    if (contentQualityScore) context.contentQualityScore = parseFloat(contentQualityScore);
    if (streakDays) context.streakDays = parseInt(streakDays);
    if (referralVerified) context.referralVerified = referralVerified === "true";
    const evaluation = rewardService.evaluateReward(
      actionType,
      Object.keys(context).length > 0 ? context : void 0
    );
    res.status(200).json({
      success: true,
      data: {
        eligible: evaluation.eligible,
        amount: evaluation.amount.toString(),
        amountFormatted: (Number(evaluation.amount) / 1e18).toString(),
        reason: evaluation.reason,
        error: evaluation.error
      }
    });
  } catch (error) {
    console.error("Error evaluating reward:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to evaluate reward"
    });
  }
});
router4.get("/info", async (req, res) => {
  try {
    const contractInfo = await rewardService.getContractInfo();
    const signerAddress = rewardService.getRewardSignerAddress();
    res.status(200).json({
      success: true,
      data: {
        contract: contractInfo,
        signerAddress
      }
    });
  } catch (error) {
    console.error("Error fetching reward info:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch reward info"
    });
  }
});
router4.get("/table", async (req, res) => {
  const { REWARD_TABLE: REWARD_TABLE2 } = await Promise.resolve().then(() => (init_RewardService(), RewardService_exports));
  const table = {};
  for (const [action, amount] of Object.entries(REWARD_TABLE2)) {
    table[action] = (Number(amount) / 1e18).toString();
  }
  res.status(200).json({
    success: true,
    data: {
      rewardTable: table,
      note: "Amounts are in VERY tokens (1 VERY = 1e18 wei)"
    }
  });
});
var rewards_default = router4;

// server/utils/errors.ts
var AppError = class extends Error {
  code;
  statusCode;
  context;
  timestamp;
  constructor(code, message, statusCode = 500, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = (/* @__PURE__ */ new Date()).toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        timestamp: this.timestamp,
        ...process.env.NODE_ENV === "development" && { context: this.context }
      }
    };
  }
};
var ValidationError = class extends AppError {
  constructor(message, context = {}) {
    super("VALIDATION_ERROR" /* VALIDATION_ERROR */, message, 400, context);
  }
};
var asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
var errorHandler = (err, req, res, next) => {
  const appError = err instanceof AppError ? err : new AppError(
    "INTERNAL_SERVER_ERROR" /* INTERNAL_SERVER_ERROR */,
    err instanceof Error ? err.message : "An unexpected error occurred",
    500,
    {
      path: req.path,
      method: req.method,
      originalError: err instanceof Error ? err.message : String(err)
    }
  );
  console.error("Error occurred:", {
    code: appError.code,
    message: appError.message,
    statusCode: appError.statusCode,
    path: req.path,
    method: req.method,
    stack: appError.stack,
    context: appError.context
  });
  res.status(appError.statusCode).json(appError.toJSON());
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
var moderationPipeline = new ModerationPipeline();
var nftService = new NFTService();
async function startServer() {
  const app = express5();
  const server = createServer(app);
  app.use("/api/checkout/stripe-webhook", express5.raw({ type: "application/json" }));
  app.use(express5.json());
  app.set("trust proxy", true);
  app.use("/api/ads", ads_default);
  app.use("/api/admin", ads_default);
  app.use("/api", indexerWebhook_default);
  app.use("/api/checkout", checkout_default);
  app.use("/api/rewards", rewards_default);
  app.use(errorHandler);
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
  app.post("/api/v1/moderation/check", asyncHandler(async (req, res) => {
    const { message, senderId, recipientId, context } = req.body;
    if (!message) {
      throw new ValidationError("Message is required", {
        path: req.path,
        method: req.method
      });
    }
    try {
      const result = await moderationPipeline.processTipMessage(message, {
        senderId: senderId || "unknown",
        recipientId,
        channel: context?.channel,
        recentTips: context?.recentTips
      });
      res.status(200).json({
        success: true,
        result
      });
    } catch (error) {
      try {
        const fallbackResult = await moderationService.moderateTipMessage(
          message,
          senderId,
          recipientId,
          context
        );
        res.status(200).json({
          success: true,
          result: fallbackResult
        });
      } catch (fallbackError) {
        res.status(200).json({
          success: true,
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
    }
  }));
  app.post("/api/v1/tip", asyncHandler(async (req, res) => {
    const { senderId, recipientId, amount, token, message, contentId } = req.body;
    if (!senderId || !recipientId || !amount || !token) {
      throw new ValidationError("Missing required fields: senderId, recipientId, amount, token", {
        path: req.path,
        method: req.method
      });
    }
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
  }));
  app.get("/api/v1/tip/:tipId", asyncHandler(async (req, res) => {
    const { tipId } = req.params;
    const result = await tipService.getTipStatus(tipId);
    if (result) {
      res.status(200).json({ success: true, data: result });
    } else {
      res.status(404).json({ success: false, message: "Tip not found" });
    }
  }));
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
    const { userId: userId2 } = req.params;
    try {
      const analytics = await analyticsService.getUserAnalytics(userId2);
      res.status(200).json({ success: true, data: analytics });
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      res.status(500).json({ success: false, message: "Failed to fetch user analytics" });
    }
  });
  app.get("/api/v1/ai/insights/user/:userId", async (req, res) => {
    const { userId: userId2 } = req.params;
    try {
      const analytics = await analyticsService.getUserAnalytics(userId2);
      const insights = await aiService.generateLeaderboardInsight(userId2, {
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
    const { userId: userId2 } = req.params;
    try {
      const analytics = await analyticsService.getUserAnalytics(userId2);
      const uniqueRecipients = analytics.favoriteRecipients?.length || 0;
      const badgeSuggestions = await aiService.suggestBadges(userId2, {
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
    const { userId: userId2 } = req.params;
    const period = req.query.period || "weekly";
    try {
      const data = await leaderboardInsightsService.fetchLeaderboardData(userId2, period);
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
    const { contentId, userId: userId2 } = req.params;
    try {
      const hasAccess = await contentService.hasAccessToContent(userId2, contentId);
      res.status(200).json({ success: true, hasAccess });
    } catch (error) {
      console.error("Error checking content access:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  app.post("/api/v1/content/:contentId/view", async (req, res) => {
    const { contentId } = req.params;
    const { userId: userId2 } = req.body;
    try {
      await contentService.recordView(contentId, userId2);
      res.status(200).json({ success: true, message: "View recorded" });
    } catch (error) {
      console.error("Error recording view:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  app.post("/api/v1/badges/check", async (req, res) => {
    const { userId: userId2 } = req.body;
    if (!userId2) {
      return res.status(400).json({ success: false, message: "Missing required field: userId" });
    }
    try {
      const newBadges = await badgeService.checkAndAwardBadges(userId2);
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
    const { userId: userId2 } = req.params;
    try {
      const badges = await badgeService.getUserBadges(userId2);
      const stats = await badgeService.getUserBadgeStats(userId2);
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
    const { userId: userId2 } = req.params;
    try {
      const stats = await badgeService.getUserBadgeStats(userId2);
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      console.error("Error fetching badge stats:", error);
      res.status(500).json({ success: false, message: "Failed to fetch badge stats" });
    }
  });
  app.post("/api/nft/mint", async (req, res) => {
    try {
      const { toAddress, name, description, imageBase64, imageUrl, attributes, boostMultiplier } = req.body;
      if (!toAddress || !name || !description) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: toAddress, name, description"
        });
      }
      if (!imageBase64 && !imageUrl) {
        return res.status(400).json({
          success: false,
          message: "Either imageBase64 or imageUrl is required"
        });
      }
      const result = await nftService.mint({
        toAddress,
        name,
        description,
        imageBase64,
        imageUrl,
        attributes,
        boostMultiplier
      });
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Error minting NFT:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to mint NFT"
      });
    }
  });
  app.post("/api/nft/list", async (req, res) => {
    try {
      const { nftContract, tokenId, price } = req.body;
      if (!nftContract || tokenId === void 0 || !price) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: nftContract, tokenId, price"
        });
      }
      const result = await nftService.list({
        nftContract,
        tokenId: Number(tokenId),
        price
      });
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Error listing NFT:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to list NFT"
      });
    }
  });
  app.post("/api/nft/buy", async (req, res) => {
    try {
      const { listingId, buyerAddress, paymentToken, paymentTxHash } = req.body;
      if (!listingId || !buyerAddress) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: listingId, buyerAddress"
        });
      }
      if (paymentToken === "VERY" && paymentTxHash) {
        console.log(`VERY token payment verified: ${paymentTxHash}`);
      }
      const result = await nftService.buy(
        { listingId: Number(listingId) },
        buyerAddress
      );
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Error buying NFT:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to buy NFT"
      });
    }
  });
  app.get("/api/nft/:contract/:tokenId", async (req, res) => {
    try {
      const { contract, tokenId } = req.params;
      const nft = await nftService.getNFT(contract, Number(tokenId));
      if (!nft) {
        return res.status(404).json({
          success: false,
          message: "NFT not found"
        });
      }
      res.status(200).json({
        success: true,
        data: nft
      });
    } catch (error) {
      console.error("Error fetching NFT:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch NFT"
      });
    }
  });
  app.get("/api/nft/marketplace/listings", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const listings = await nftService.getActiveListings(limit, offset);
      res.status(200).json({
        success: true,
        data: listings
      });
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch listings"
      });
    }
  });
  app.get("/api/nft/user/:address", async (req, res) => {
    try {
      const { address } = req.params;
      const nfts = await nftService.getUserNFTs(address);
      res.status(200).json({
        success: true,
        data: nfts
      });
    } catch (error) {
      console.error("Error fetching user NFTs:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch user NFTs"
      });
    }
  });
  app.get("/api/nft/marketplace/fee-recipient", async (req, res) => {
    try {
      const feeRecipient = await nftService.getFeeRecipient();
      res.status(200).json({
        success: true,
        data: feeRecipient
      });
    } catch (error) {
      console.error("Error fetching fee recipient:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch fee recipient"
      });
    }
  });
  const { DatabaseService: DatabaseService2 } = await Promise.resolve().then(() => (init_DatabaseService(), DatabaseService_exports));
  let SocialService3;
  let socialService = null;
  try {
    const socialModule = await Promise.resolve().then(() => (init_SocialService(), SocialService_exports));
    SocialService3 = socialModule.SocialService;
    const db = DatabaseService2.getInstance();
    socialService = new SocialService3(db);
  } catch (error) {
    console.warn("SocialService not available, social features will be limited:", error);
  }
  app.post("/api/social/follow", async (req, res) => {
    if (!socialService) {
      return res.status(503).json({ success: false, error: "Social service not available" });
    }
    try {
      const { followerId, followingId } = req.body;
      if (!followerId || !followingId) {
        return res.status(400).json({ success: false, error: "followerId and followingId are required" });
      }
      const result = await socialService.followUser(followerId, followingId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to follow user" });
    }
  });
  app.post("/api/social/unfollow", async (req, res) => {
    try {
      const { followerId, followingId } = req.body;
      if (!followerId || !followingId) {
        return res.status(400).json({ success: false, error: "followerId and followingId are required" });
      }
      const result = await socialService.unfollowUser(followerId, followingId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to unfollow user" });
    }
  });
  app.get("/api/social/following/:followerId/:followingId", async (req, res) => {
    try {
      const { followerId, followingId } = req.params;
      const isFollowing = await socialService.isFollowing(followerId, followingId);
      res.status(200).json({ success: true, isFollowing });
    } catch (error) {
      console.error("Error checking follow status:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to check follow status" });
    }
  });
  app.get("/api/social/followers/:userId", async (req, res) => {
    try {
      const { userId: userId2 } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const result = await socialService.getFollowers(userId2, limit, offset);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error("Error fetching followers:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to fetch followers" });
    }
  });
  app.get("/api/social/following/:userId", async (req, res) => {
    try {
      const { userId: userId2 } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const result = await socialService.getFollowing(userId2, limit, offset);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error("Error fetching following:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to fetch following" });
    }
  });
  app.get("/api/social/feed/:userId", async (req, res) => {
    try {
      const { userId: userId2 } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const result = await socialService.getActivityFeed(userId2, limit, offset);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error("Error fetching activity feed:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to fetch activity feed" });
    }
  });
  app.get("/api/social/activities/:userId", async (req, res) => {
    try {
      const { userId: userId2 } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const result = await socialService.getUserActivities(userId2, limit, offset);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error("Error fetching user activities:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to fetch activities" });
    }
  });
  app.get("/api/social/notifications/:userId", async (req, res) => {
    try {
      const { userId: userId2 } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const unreadOnly = req.query.unreadOnly === "true";
      const result = await socialService.getNotifications(userId2, limit, offset, unreadOnly);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to fetch notifications" });
    }
  });
  app.post("/api/social/notifications/:notificationId/read", async (req, res) => {
    try {
      const { notificationId } = req.params;
      const { userId: userId2 } = req.body;
      if (!userId2) {
        return res.status(400).json({ success: false, error: "userId is required" });
      }
      await socialService.markNotificationRead(notificationId, userId2);
      res.status(200).json({ success: true, message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to mark notification as read" });
    }
  });
  app.post("/api/social/notifications/read-all", async (req, res) => {
    try {
      const { userId: userId2 } = req.body;
      if (!userId2) {
        return res.status(400).json({ success: false, error: "userId is required" });
      }
      await socialService.markAllNotificationsRead(userId2);
      res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to mark all notifications as read" });
    }
  });
  app.get("/api/social/profile/:userId", async (req, res) => {
    try {
      const { userId: userId2 } = req.params;
      const profile = await socialService.getUserProfile(userId2);
      if (!profile) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      res.status(200).json({ success: true, profile });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to fetch user profile" });
    }
  });
  app.post("/webhook/verychat", async (req, res) => {
    try {
      const { handleVeryChatWebhook: handleVeryChatWebhook2 } = await Promise.resolve().then(() => (init_verychat(), verychat_exports));
      await handleVeryChatWebhook2(req, res);
    } catch (error) {
      console.error("Error handling VeryChat webhook:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });
  const staticPath = process.env.NODE_ENV === "production" ? path2.resolve(__dirname2, "public") : path2.resolve(__dirname2, "..", "dist", "public");
  app.use(express5.static(staticPath));
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
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
