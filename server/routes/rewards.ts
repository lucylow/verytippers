import express, { Request, Response } from 'express';
import { RewardService, RewardActionType } from '../services/RewardService';

const router = express.Router();
const rewardService = new RewardService();

/**
 * POST /api/rewards/issue
 * Issue a reward based on user action
 * 
 * Body:
 * {
 *   "user": "0x...",           // User address receiving reward
 *   "actionType": "TIP_SENT",  // Action type (TIP_SENT, TIP_RECEIVED, etc.)
 *   "context": {               // Optional context for evaluation
 *     "tipAmount": 1.5,
 *     "contentQualityScore": 0.9,
 *     "streakDays": 7,
 *     "referralVerified": true
 *   }
 * }
 */
router.post('/issue', async (req: Request, res: Response) => {
    try {
        const { user, actionType, context } = req.body;

        // Validate required fields
        if (!user || !actionType) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: user, actionType'
            });
        }

        // Validate action type
        if (!Object.values(RewardActionType).includes(actionType)) {
            return res.status(400).json({
                success: false,
                error: `Invalid actionType. Must be one of: ${Object.values(RewardActionType).join(', ')}`
            });
        }

        // Issue reward
        const signedPayload = await rewardService.issueReward(
            user,
            actionType as RewardActionType,
            context
        );

        res.status(200).json({
            success: true,
            data: signedPayload
        });
    } catch (error: any) {
        console.error('Error issuing reward:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to issue reward'
        });
    }
});

/**
 * GET /api/rewards/evaluate
 * Evaluate if an action is eligible for reward (without issuing)
 * 
 * Query params:
 * - actionType: Action type to evaluate
 * - tipAmount: Optional tip amount for TIP_SENT
 * - contentQualityScore: Optional quality score for QUALITY_CONTENT
 * - streakDays: Optional streak days for DAILY_STREAK
 * - referralVerified: Optional verification status for REFERRAL
 */
router.get('/evaluate', async (req: Request, res: Response) => {
    try {
        const { actionType, tipAmount, contentQualityScore, streakDays, referralVerified } = req.query;

        if (!actionType) {
            return res.status(400).json({
                success: false,
                error: 'actionType query parameter is required'
            });
        }

        if (!Object.values(RewardActionType).includes(actionType as RewardActionType)) {
            return res.status(400).json({
                success: false,
                error: `Invalid actionType. Must be one of: ${Object.values(RewardActionType).join(', ')}`
            });
        }

        const context: any = {};
        if (tipAmount) context.tipAmount = parseFloat(tipAmount as string);
        if (contentQualityScore) context.contentQualityScore = parseFloat(contentQualityScore as string);
        if (streakDays) context.streakDays = parseInt(streakDays as string);
        if (referralVerified) context.referralVerified = referralVerified === 'true';

        const evaluation = rewardService.evaluateReward(
            actionType as RewardActionType,
            Object.keys(context).length > 0 ? context : undefined
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
    } catch (error: any) {
        console.error('Error evaluating reward:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to evaluate reward'
        });
    }
});

/**
 * GET /api/rewards/info
 * Get reward contract information
 */
router.get('/info', async (req: Request, res: Response) => {
    try {
        const contractInfo = await rewardService.getContractInfo();
        const signerAddress = rewardService.getRewardSignerAddress();

        res.status(200).json({
            success: true,
            data: {
                contract: contractInfo,
                signerAddress: signerAddress
            }
        });
    } catch (error: any) {
        console.error('Error fetching reward info:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch reward info'
        });
    }
});

/**
 * GET /api/rewards/table
 * Get reward table (action types and amounts)
 */
router.get('/table', async (req: Request, res: Response) => {
    const { REWARD_TABLE } = await import('../services/RewardService');
    
    const table: Record<string, string> = {};
    for (const [action, amount] of Object.entries(REWARD_TABLE)) {
        table[action] = (Number(amount) / 1e18).toString();
    }

    res.status(200).json({
        success: true,
        data: {
            rewardTable: table,
            note: 'Amounts are in VERY tokens (1 VERY = 1e18 wei)'
        }
    });
});

export default router;

