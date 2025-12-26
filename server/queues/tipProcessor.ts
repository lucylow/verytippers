// server/queues/tipProcessor.ts - Production Queue Implementation
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { BlockchainService } from '../services/BlockchainService';
import { IpfsService } from '../services/IpfsService';

const prisma = new PrismaClient();

// Redis connection
const connection = new IORedis(config.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

// Tip processing queue
export const tipQueue = new Queue('tip-processing', { connection });

// Dead letter queue for failed jobs
const deadLetterQueue = new Queue('tip-processing-dlq', { connection });

interface TipJobData {
    senderId: string;
    recipientId: string;
    amount: bigint;
    ipfsCid: string;
    signature: string;
    metaTxData: any;
    moderation?: any;
}

/**
 * Submit meta-transaction to relayer
 */
async function submitMetaTransaction(signature: string, metaTxData: any): Promise<string> {
    const blockchainService = new BlockchainService();
    
    // Build transaction data
    const request = {
        from: metaTxData.sender || metaTxData.from,
        to: config.TIP_CONTRACT_ADDRESS,
        data: metaTxData.data || '',
        signature: signature
    };

    const tx = await blockchainService.sendMetaTransaction(request);
    return tx.hash;
}

/**
 * Update Redis leaderboards
 */
async function updateRedisLeaderboards(
    senderId: string,
    recipientId: string,
    amount: bigint
): Promise<void> {
    // Update sender stats
    await connection.zincrby('leaderboard:global', Number(amount), senderId);
    await connection.zincrby('leaderboard:weekly', Number(amount), senderId);
    
    // Update recipient stats
    await connection.zincrby('leaderboard:recipients:global', Number(amount), recipientId);
    await connection.zincrby('leaderboard:recipients:weekly', Number(amount), recipientId);
    
    // Update weekly leaderboard with TTL (7 days)
    await connection.expire('leaderboard:weekly', 7 * 24 * 60 * 60);
    await connection.expire('leaderboard:recipients:weekly', 7 * 24 * 60 * 60);
}

/**
 * Check and award achievements (placeholder for now)
 */
async function checkAchievements(userId: string): Promise<void> {
    // TODO: Implement achievement checking logic
    console.log(`Checking achievements for user ${userId}`);
}

/**
 * Generate AI insights (placeholder for now)
 */
async function generateAIInsights(userId: string): Promise<void> {
    // TODO: Implement AI insights generation
    console.log(`Generating AI insights for user ${userId}`);
}

/**
 * Production worker with retries + dead letter queue
 */
const tipProcessorWorker = new Worker(
    'tip-processing',
    async (job: Job<TipJobData>) => {
        const { senderId, recipientId, amount, ipfsCid, signature, metaTxData, moderation } = job.data;

        try {
            console.log(`Processing tip job ${job.id} for ${senderId} -> ${recipientId}`);

            // 1. Submit meta-transaction to relayer
            const txHash = await submitMetaTransaction(signature, metaTxData);

            // 2. Update database - find tip by transactionHash or create if not exists
            await prisma.tip.upsert({
                where: { transactionHash: txHash },
                update: {
                    status: 'CONFIRMED',
                    confirmedAt: new Date()
                },
                create: {
                    senderId,
                    recipientId,
                    tokenAddress: config.TIP_CONTRACT_ADDRESS || '',
                    amount: amount.toString(),
                    amountInWei: amount,
                    transactionHash: txHash,
                    status: 'CONFIRMED',
                    confirmedAt: new Date()
                }
            });

            // 3. Update leaderboards (Redis)
            await updateRedisLeaderboards(senderId, recipientId, amount);

            // 4. Update User stats directly on User model
            await prisma.user.update({
                where: { id: senderId },
                data: {
                    totalTipsSent: { increment: amount },
                    updatedAt: new Date()
                }
            });

            await prisma.user.update({
                where: { id: recipientId },
                data: {
                    totalTipsReceived: { increment: amount },
                    updatedAt: new Date()
                }
            });

            // 5. Trigger achievements + insights (async, don't wait)
            Promise.all([
                checkAchievements(senderId),
                generateAIInsights(senderId)
            ]).catch(err => console.error('Error in achievements/insights:', err));

            console.log(`✅ Tip job ${job.id} completed successfully with txHash: ${txHash}`);
            return { success: true, txHash };

        } catch (error: any) {
            console.error(`❌ Tip processing failed for job ${job.id}:`, error);

            // Update status to FAILED - try to find by ipfsCid or transactionHash
            try {
                // Try to find tip by any available identifier
                const existingTip = await prisma.tip.findFirst({
                    where: {
                        OR: [
                            { senderId },
                            { recipientId }
                        ]
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                });
                
                if (existingTip) {
                    await prisma.tip.update({
                        where: { id: existingTip.id },
                        data: { 
                            status: 'FAILED',
                            errorReason: error.message
                        }
                    });
                }
            } catch (dbError) {
                console.error('Failed to update tip status in database:', dbError);
            }

            // Move to dead letter queue after max retries
            if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
                console.log(`Moving job ${job.id} to dead letter queue after ${job.attemptsMade} attempts`);
                await deadLetterQueue.add('failed-tip', {
                    originalJobId: job.id,
                    originalData: job.data,
                    error: error.message,
                    attempts: job.attemptsMade,
                    timestamp: Date.now()
                }, {
                    removeOnComplete: true,
                    removeOnFail: false
                });
            }

            throw error;
        }
    },
    {
        connection,
        concurrency: 5, // 5 concurrent workers
        limiter: {
            max: 100,
            duration: 1000 // 100 jobs per second max
        }
    }
);

// Event listeners
tipProcessorWorker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
});

tipProcessorWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
});

tipProcessorWorker.on('error', (err) => {
    console.error('Worker error:', err);
});

/**
 * Add tip job to processing queue
 */
export async function addTipJob(data: TipJobData) {
    return await tipQueue.add('process-tip', data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000 // Keep last 1000 completed jobs
        },
        removeOnFail: false // Keep failed jobs for debugging
    });
}

/**
 * Job processor for blockchain confirmation monitoring
 */
export const confirmationWorker = new Worker(
    'tip-confirmation',
    async (job: Job<{ txHash: string }>) => {
        const { txHash } = job.data;
        const blockchainService = new BlockchainService();
        const provider = (blockchainService as any).provider;

        if (!provider) {
            throw new Error('Blockchain provider not available');
        }

        // Wait for transaction confirmation (1 confirmation)
        const receipt = await provider.waitForTransaction(txHash, 1, 60000); // 60s timeout

        if (receipt.status === 1) {
            // Transaction confirmed successfully
            // TODO: Emit WebSocket event or update via pubsub
            console.log(`✅ Transaction ${txHash} confirmed`);
            return { confirmed: true, txHash, blockNumber: receipt.blockNumber };
        } else {
            throw new Error(`Transaction ${txHash} failed`);
        }
    },
    {
        connection,
        concurrency: 10
    }
);

/**
 * Add confirmation monitoring job
 */
export async function addConfirmationJob(txHash: string) {
    const confirmationQueue = new Queue('tip-confirmation', { connection });
    return await confirmationQueue.add('confirm-tip', { txHash }, {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: true
    });
}
