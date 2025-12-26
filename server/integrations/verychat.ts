/**
 * VeryChat Integration
 * Handles webhook events from VeryChat bot and processes /tip commands
 */

import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { OrchestratorService, TipDraft } from '../services/OrchestratorService';
import { TipService } from '../services/TipService';
import { VerychatService } from '../services/VerychatService';
import { DatabaseService } from '../services/DatabaseService';
import { config } from '../config';

export interface VeryChatWebhookPayload {
    type: 'command' | 'message' | 'callback';
    user: string; // User ID or wallet address
    command?: string; // e.g., '/tip'
    args?: string; // e.g., '@alice 5'
    channel?: string; // e.g., 'discord', 'telegram'
    message?: string;
    timestamp?: number;
}

export class VeryChatIntegration {
    private orchestrator: OrchestratorService;
    private tipService: TipService;
    private verychatService: VerychatService;
    private db = DatabaseService.getInstance();

    constructor() {
        this.orchestrator = new OrchestratorService();
        this.tipService = new TipService();
        this.verychatService = new VerychatService();
    }

    /**
     * Parse /tip command arguments
     * Format: /tip @username amount [message]
     * Example: /tip @alice 5 VERY Great work!
     */
    private parseTipCommand(args: string): { recipient: string; amount: string; message?: string } | null {
        if (!args || !args.trim()) {
            return null;
        }

        // Match: @username amount [message]
        const match = args.match(/^@?(\w+)\s+(\d+(?:\.\d+)?)\s*(?:VERY)?\s*(.*)?$/i);
        if (!match) {
            return null;
        }

        const [, recipient, amount, message] = match;
        return {
            recipient: recipient.startsWith('@') ? recipient : `@${recipient}`,
            amount: amount,
            message: message?.trim() || undefined
        };
    }

    /**
     * Handle VeryChat webhook
     * POST /webhook/verychat
     */
    async handleWebhook(req: Request, res: Response): Promise<void> {
        try {
            const payload: VeryChatWebhookPayload = req.body;

            // In development, skip signature verification
            // In production, verify webhook signature here
            if (config.NODE_ENV === 'production' && !this.verifyWebhookSignature(req)) {
                res.status(401).json({ success: false, error: 'Invalid signature' });
                return;
            }

            // Handle command type
            if (payload.type === 'command' && payload.command === '/tip') {
                await this.handleTipCommand(payload, res);
                return;
            }

            // Handle message type (fallback)
            if (payload.type === 'message' && payload.message?.startsWith('/tip')) {
                const args = payload.message.replace('/tip', '').trim();
                await this.handleTipCommand({ ...payload, command: '/tip', args }, res);
                return;
            }

            // Unknown command
            res.status(200).json({
                success: true,
                message: 'Webhook received',
                handled: false
            });
        } catch (error: any) {
            console.error('VeryChat webhook error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }

    /**
     * Handle /tip command
     */
    private async handleTipCommand(payload: VeryChatWebhookPayload, res: Response): Promise<void> {
        if (!payload.args) {
            res.status(400).json({
                success: false,
                error: 'Usage: /tip @username amount [message]'
            });
            return;
        }

        // Parse command arguments
        const parsed = this.parseTipCommand(payload.args);
        if (!parsed) {
            res.status(400).json({
                success: false,
                error: 'Invalid format. Use: /tip @username amount [message]'
            });
            return;
        }

        // Get or create sender user
        const sender = await this.getOrCreateUser(payload.user);
        if (!sender) {
            res.status(400).json({
                success: false,
                error: 'User not found. Please link your wallet first.'
            });
            return;
        }

        // Get or create recipient user (by username)
        const recipientUsername = parsed.recipient.replace('@', '');
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

        // Create tip draft
        const nonce = await this.orchestrator.getNextNonce(sender.walletAddress);
        const draft: TipDraft = {
            from: sender.walletAddress,
            to: recipient.walletAddress,
            amount: parsed.amount,
            message: parsed.message,
            nonce
        };

        // Generate preview and wallet payload
        const preview = await this.orchestrator.createTipDraft(draft);

        // Return preview for VeryChat to display
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
     * Get or create user from VeryChat user ID
     */
    private async getOrCreateUser(verychatId: string) {
        // Try to find by verychatId
        let user = await this.db.user.findUnique({
            where: { verychatId }
        });

        if (!user) {
            // In dev mode, create mock user
            if (config.NODE_ENV === 'development') {
                // Generate a mock wallet address
                const mockWallet = ethers.Wallet.createRandom();
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
    private verifyWebhookSignature(req: Request): boolean {
        // TODO: Implement webhook signature verification
        // For now, skip in development
        if (config.NODE_ENV === 'development') {
            return true;
        }

        const signature = req.headers['x-verychat-signature'] as string;
        const timestamp = req.headers['x-verychat-timestamp'] as string;
        const secret = config.WEBHOOK_SECRET;

        if (!signature || !timestamp || !secret) {
            return false;
        }

        // TODO: Implement HMAC verification
        // const expectedSignature = crypto.createHmac('sha256', secret)
        //     .update(timestamp + JSON.stringify(req.body))
        //     .digest('hex');
        // return signature === expectedSignature;

        return true; // Placeholder
    }
}

// Export handler function for Express route
export async function handleVeryChatWebhook(req: Request, res: Response): Promise<void> {
    const integration = new VeryChatIntegration();
    await integration.handleWebhook(req, res);
}

