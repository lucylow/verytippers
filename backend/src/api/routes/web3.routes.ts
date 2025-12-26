import { Router } from 'express';
import { Web3Controller } from '../controllers/web3.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';

const router = Router();
const controller = new Web3Controller();

// Rate limiting for Web3 endpoints
const web3RateLimit = rateLimitMiddleware({
  windowMs: 30 * 1000, // 30 seconds
  max: 5 // 5 requests per 30 seconds
});

// Send tip
router.post(
  '/tip',
  authMiddleware,
  web3RateLimit,
  controller.sendTip.bind(controller)
);

// Get token info
router.get(
  '/token/:tokenAddress',
  authMiddleware,
  controller.getTokenInfo.bind(controller)
);

// Gas sponsorship info
router.get(
  '/gas-sponsorship',
  authMiddleware,
  controller.getGasSponsorshipInfo.bind(controller)
);

export default router;

