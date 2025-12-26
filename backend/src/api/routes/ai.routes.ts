import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';
import multer from 'multer';

const router = Router();
const controller = new AIController();
const upload = multer({ storage: multer.memoryStorage() });

// Rate limiting for AI endpoints
const aiRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // 10 requests per minute
});

// Tip suggestions
router.post(
  '/suggest',
  authMiddleware,
  aiRateLimit,
  controller.getTipSuggestion.bind(controller)
);

// Sentiment analysis
router.post(
  '/analyze/sentiment',
  authMiddleware,
  aiRateLimit,
  controller.analyzeSentiment.bind(controller)
);

// Voice commands
router.post(
  '/voice',
  authMiddleware,
  aiRateLimit,
  upload.single('audio'),
  controller.processVoiceCommand.bind(controller)
);

// AI Chat
router.post(
  '/chat',
  authMiddleware,
  aiRateLimit,
  controller.chatWithAI.bind(controller)
);

export default router;

