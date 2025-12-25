import { BlockchainService } from './BlockchainService';
import { HuggingFaceService } from './HuggingFaceService';
import { VerychatService } from './VerychatService';
import { IpfsService } from './IpfsService';
import { DatabaseService } from './DatabaseService';
import { QueueService } from './QueueService';
import { TipAnalyticsService } from './TipAnalyticsService';
import { config } from '../config';
import { ethers } from 'ethers';
import { Job } from 'bullmq';

export interface TipResult {
    success: boolean;
    txHash?: string;
    tipId?: string;
    message?: string;
    errorCode?: string;
}

export interface TipRecommendation {
    recommendedAmount: string;
    confidence: number;
    reasoning: string;
    contentScore?: {
        quality: number;
        engagement: number;
        sentiment: string;
    };
}

export class TipService {
    private blockchainService: BlockchainService;
    private hfService: HuggingFaceService;
    private verychatService: VerychatService;
    private ipfsService: IpfsService;
    private analyticsService: TipAnalyticsService;
    private db = DatabaseService.getInstance();
    private queueService: QueueService;

    constructor() {
        this.blockchainService = new BlockchainService();
        this.hfService = new HuggingFaceService();
        this.verychatService = new VerychatService();
        this.ipfsService = new IpfsService();
        this.analyticsService = new TipAnalyticsService();
        this.queueService = new QueueService(this.processQueueJob.bind(this));
        
        // Start listening to blockchain events
        this.blockchainService.listenToEvents(this.handleBlockchainEvent.bind(this));
    }

    /**
     * Validate tip input parameters
     */
    private validateTipInput(
        senderId: string,
        recipientId: string,
        amount: string,
        token: string
    ): { valid: boolean; error?: string; errorCode?: string } {
        // Check for required fields
        if (!senderId || !recipientId || !amount || !token) {
            return {
                valid: false,
                error: 'Missing required fields: senderId, recipientId, amount, token',
                errorCode: 'MISSING_FIELDS'
            };
        }

        // Validate sender and recipient are different
        if (senderId === recipientId) {
            return {
                valid: false,
                error: 'Cannot tip yourself',
                errorCode: 'INVALID_RECIPIENT'
            };
        }

        // Validate amount
        try {
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                return {
                    valid: false,
                    error: 'Amount must be a positive number',
                    errorCode: 'INVALID_AMOUNT'
                };
            }
            if (amountNum > 1000000) {
                return {
                    valid: false,
                    error: 'Amount exceeds maximum allowed (1,000,000)',
                    errorCode: 'AMOUNT_TOO_LARGE'
                };
            }
        } catch (error) {
            return {
                valid: false,
                error: 'Invalid amount format',
                errorCode: 'INVALID_AMOUNT_FORMAT'
            };
        }

        return { valid: true };
    }

    private async encryptMessage(message: string, recipientPublicKey: string): Promise<string> {
        // In a real app, use a library like 'eth-crypto' or 'openpgp'
        // For now, return a placeholder
        if (!message || !recipientPublicKey) {
            return '';
        }
        return `encrypted_${message}_for_${recipientPublicKey}`;
    }

    /**
     * Get AI-powered tip recommendation based on content
     */
    public async getTipRecommendation(
        content: string,
        context?: { authorId?: string; contentType?: string }
    ): Promise<TipRecommendation> {
        try {
            const contentScore = await this.hfService.scoreContent(content, context);
            
            const recommendedAmount = contentScore.recommendedTipAmount || 5;
            const quality = contentScore.quality;
            const engagement = contentScore.engagement;
            const sentiment = contentScore.sentiment.label;

            // Calculate confidence based on score consistency
            const scoreVariance = Math.abs(quality - engagement) / 100;
            const confidence = Math.max(0.5, 1 - scoreVariance);

            let reasoning = `Based on content analysis: Quality score ${quality}/100, Engagement score ${engagement}/100, Sentiment: ${sentiment}.`;
            if (quality >= 80) {
                reasoning += ' High-quality content deserves generous tipping.';
            } else if (quality >= 60) {
                reasoning += ' Good content with room for improvement.';
            } else {
                reasoning += ' Content could benefit from more detail and engagement.';
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
            console.error('Error generating tip recommendation:', error);
            // Return default recommendation on error
            return {
                recommendedAmount: '5',
                confidence: 0.5,
                reasoning: 'Unable to analyze content. Using default recommendation.',
            };
        }
    }

    public async processTip(
        senderId: string,
        recipientId: string,
        amount: string,
        token: string,
        message?: string,
        contentId?: string,
        options?: { skipModeration?: boolean; skipQueue?: boolean }
    ): Promise<TipResult> {
        // 1. Validate input
        const validation = this.validateTipInput(senderId, recipientId, amount, token);
        if (!validation.valid) {
            return {
                success: false,
                message: validation.error,
                errorCode: validation.errorCode
            };
        }

        try {
            // 2. Validate and sync users with DB
            let sender = await this.db.user.findUnique({ where: { id: senderId } });
            if (!sender) {
                const vUser = await this.verychatService.getUser(senderId);
                if (!vUser) {
                    return {
                        success: false,
                        message: 'Sender not found on Verychat.',
                        errorCode: 'SENDER_NOT_FOUND'
                    };
                }
                try {
                    sender = await this.db.user.create({
                        data: { id: vUser.id, walletAddress: vUser.walletAddress, publicKey: vUser.publicKey }
                    });
                } catch (createError: any) {
                    // User might have been created concurrently
                    if (createError.code === 'P2002') {
                        sender = await this.db.user.findUnique({ where: { id: senderId } });
                        if (!sender) {
                            return {
                                success: false,
                                message: 'Failed to create sender account.',
                                errorCode: 'USER_CREATION_FAILED'
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
                        message: 'Recipient not found on Verychat.',
                        errorCode: 'RECIPIENT_NOT_FOUND'
                    };
                }
                try {
                    recipient = await this.db.user.create({
                        data: { id: vUser.id, walletAddress: vUser.walletAddress, publicKey: vUser.publicKey }
                    });
                } catch (createError: any) {
                    if (createError.code === 'P2002') {
                        recipient = await this.db.user.findUnique({ where: { id: recipientId } });
                        if (!recipient) {
                            return {
                                success: false,
                                message: 'Failed to create recipient account.',
                                errorCode: 'USER_CREATION_FAILED'
                            };
                        }
                    } else {
                        throw createError;
                    }
                }
            }

            // 3. AI Moderation (unless skipped)
            if (message && !options?.skipModeration) {
                try {
                    const moderationResult = await this.hfService.moderateContent(message);
                    if (moderationResult.flagged) {
                        return {
                            success: false,
                            message: 'Tip message flagged by content moderation.',
                            errorCode: 'CONTENT_FLAGGED'
                        };
                    }
                    if (moderationResult.needsManualReview) {
                        // Log for manual review but allow the tip to proceed
                        console.warn(`Tip message requires manual review: ${message.substring(0, 50)}`);
                    }
                } catch (moderationError) {
                    console.error('Moderation error:', moderationError);
                    // Continue with tip if moderation fails (fail-open for availability)
                }
            }

            // 4. Create pending tip in DB
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
                        status: 'PENDING'
                    }
                });
            } catch (dbError: any) {
                console.error('Database error creating tip:', dbError);
                return {
                    success: false,
                    message: 'Failed to create tip record.',
                    errorCode: 'DATABASE_ERROR'
                };
            }

            // 5. Add to queue for async processing (unless skipped)
            if (!options?.skipQueue) {
                try {
                    await this.queueService.addTipJob({ tipId: tip.id });
                } catch (queueError) {
                    console.error('Queue error:', queueError);
                    // Update tip status to failed if queue fails
                    await this.db.tip.update({
                        where: { id: tip.id },
                        data: { status: 'FAILED' }
                    });
                    return {
                        success: false,
                        message: 'Failed to queue tip for processing.',
                        errorCode: 'QUEUE_ERROR'
                    };
                }
            }

            return {
                success: true,
                tipId: tip.id,
                message: 'Tip is being processed asynchronously.'
            };
        } catch (error: any) {
            console.error('Unexpected error processing tip:', error);
            return {
                success: false,
                message: error.message || 'An unexpected error occurred.',
                errorCode: 'UNEXPECTED_ERROR'
            };
        }
    }

    private async processQueueJob(job: Job): Promise<void> {
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
            await this.db.tip.update({ where: { id: tipId }, data: { status: 'PROCESSING' } });

            // 1. IPFS Upload for message (if exists)
            let messageHash = '';
            if (tip.message) {
                try {
                    const encrypted = await this.encryptMessage(tip.message, tip.recipient.publicKey);
                    messageHash = await this.ipfsService.upload(encrypted);
                    await this.db.tip.update({ where: { id: tipId }, data: { messageHash } });
                } catch (ipfsError) {
                    console.error(`IPFS upload failed for tip ${tipId}:`, ipfsError);
                    // Continue without message hash if IPFS fails
                }
            }

            // 2. Blockchain Transaction
            try {
                const tipContract = this.blockchainService.getTipContract();
                const amountWei = ethers.parseUnits(tip.amount, 18);
                const txData = tipContract.interface.encodeFunctionData('tip', [
                    tip.recipient.walletAddress,
                    tip.token,
                    amountWei,
                    messageHash
                ]);

                const txResponse = await this.blockchainService.sendMetaTransaction({
                    from: tip.sender.walletAddress,
                    to: config.TIP_CONTRACT_ADDRESS,
                    data: txData,
                    signature: '0x_user_signature_placeholder' // In real app, signature comes from frontend
                });

                await this.db.tip.update({ 
                    where: { id: tipId }, 
                    data: { txHash: txResponse.hash } 
                });

                // Wait for transaction confirmation (with timeout)
                const confirmationPromise = txResponse.wait();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
                );
                
                await Promise.race([confirmationPromise, timeoutPromise]);
                
                // Clear analytics cache after successful tip
                await this.analyticsService.clearCache();
            } catch (blockchainError: any) {
                console.error(`Blockchain transaction failed for tip ${tipId}:`, blockchainError);
                throw blockchainError; // Allow retry
            }

            // Status will be updated by the event listener
        } catch (error: any) {
            console.error(`Error processing tip ${tipId}:`, error);
            await this.db.tip.update({ where: { id: tipId }, data: { status: 'FAILED' } });
            
            // Determine if we should retry based on error type
            const retriableErrors = ['TIMEOUT', 'NETWORK_ERROR', 'RATE_LIMIT'];
            const shouldRetry = retriableErrors.some(code => error.message?.includes(code));
            
            if (!shouldRetry) {
                // Non-retriable error, don't throw to prevent retries
                console.error(`Non-retriable error for tip ${tipId}, marking as failed permanently`);
            } else {
                throw error; // Allow BullMQ to retry
            }
        }
    }

    private async handleBlockchainEvent(eventData: any) {
        try {
            const { from, to, amount, messageHash, txHash } = eventData;
            console.log(`Received TipSent event: ${txHash}`);

            // Update tip status in DB
            const tip = await this.db.tip.findFirst({
                where: {
                    sender: { walletAddress: from },
                    recipient: { walletAddress: to },
                    messageHash: messageHash || null,
                    status: 'PROCESSING'
                }
            });

            if (tip) {
                await this.db.tip.update({
                    where: { id: tip.id },
                    data: { status: 'COMPLETED', txHash: eventData.event?.transactionHash || txHash }
                });

                // Update content earnings if tip is linked to content
                if (tip.contentId) {
                    try {
                        const content = await this.db.content.findUnique({ where: { id: tip.contentId } });
                        if (content) {
                            const currentEarnings = ethers.parseUnits(content.totalEarnings || '0', 18);
                            const tipAmount = ethers.parseUnits(tip.amount, 18);
                            const newEarnings = currentEarnings + tipAmount;
                            const newEarningsString = ethers.formatUnits(newEarnings, 18);

                            // Calculate engagement score
                            const viewCount = content.viewCount || 0;
                            const tipCount = (content.totalTips || 0) + 1;
                            const viewsPerTip = viewCount > 0 ? tipCount / viewCount : 0;
                            const earnings = parseFloat(newEarningsString) || 0;
                            const viewScore = Math.min(1, viewCount / 1000);
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
                        // Don't fail the entire event handling if content update fails
                    }
                }

                // Clear analytics cache
                await this.analyticsService.clearCache();

                // Notify users via Verychat (fire and forget)
                this.verychatService.sendMessage(tip.senderId, 
                    `Your tip of ${tip.amount} ${tip.token} was successful! Tx: ${txHash?.slice(0, 10)}...`
                ).catch(err => console.error('Failed to notify sender:', err));
                
                this.verychatService.sendMessage(tip.recipientId, 
                    `You received a tip of ${tip.amount} ${tip.token}! 🎉`
                ).catch(err => console.error('Failed to notify recipient:', err));
            } else {
                console.warn(`No matching tip found for event: ${txHash}`);
            }
        } catch (error) {
            console.error('Error handling blockchain event:', error);
        }
    }

    /**
     * Get tip status by ID
     */
    public async getTipStatus(tipId: string): Promise<{ tip: any; status: string } | null> {
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
}
