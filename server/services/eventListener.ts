// server/services/eventListener.ts - Real-time Blockchain Event Listener
import { ethers, JsonRpcProvider, Contract } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

// TipRouter ABI (minimal interface for TipSent event)
const TIP_ROUTER_ABI = [
    "event TipSent(address indexed from, address indexed to, uint256 amount, string ipfsCid, uint256 tipId)",
    "function executeMetaTransaction(address from, tuple(address recipient, uint256 amount, string ipfsCid) metaTx, bytes signature) external"
];

// Get contract address from config or env
const TIP_ROUTER_ADDRESS = config.TIP_CONTRACT_ADDRESS || process.env.TIP_CONTRACT_ADDRESS;

export class EventListener {
    private provider: JsonRpcProvider;
    private contract: Contract;
    private isListening: boolean = false;

    constructor() {
        if (!TIP_ROUTER_ADDRESS || TIP_ROUTER_ADDRESS === '0xTipContractAddress') {
            console.warn('TIP_CONTRACT_ADDRESS not configured, EventListener will not start');
            this.provider = null as any;
            this.contract = null as any;
            return;
        }

        this.provider = new JsonRpcProvider(config.VERY_CHAIN_RPC_URL);
        this.contract = new Contract(
            TIP_ROUTER_ADDRESS,
            TIP_ROUTER_ABI,
            this.provider
        );

        this.startListening();
    }

    /**
     * Start listening for TipSent events
     */
    private startListening() {
        if (!this.contract || !this.provider) {
            console.warn('EventListener: Contract or provider not initialized, skipping event listener');
            return;
        }

        if (this.isListening) {
            console.warn('EventListener: Already listening for events');
            return;
        }

        console.log(`Starting event listener for TipRouter at ${TIP_ROUTER_ADDRESS}`);

        // Listen for TipSent events
        this.contract.on('TipSent', async (
            from: string,
            to: string,
            amount: bigint,
            ipfsCid: string,
            tipId: bigint,
            event: any
        ) => {
            try {
                console.log(`📥 TipSent event received: ${from} -> ${to}, amount: ${amount}, cid: ${ipfsCid}`);

                // Upsert tip in database
                await prisma.tip.upsert({
                    where: { ipfsCid },
                    update: {
                        txHash: event.transactionHash,
                        status: 'PROCESSED',
                        updatedAt: new Date()
                    },
                    create: {
                        senderId: from.toLowerCase(),
                        recipientId: to.toLowerCase(),
                        amount: amount,
                        ipfsCid: ipfsCid,
                        txHash: event.transactionHash,
                        status: 'PROCESSED'
                    }
                });

                // Update UserStats
                await prisma.userStats.upsert({
                    where: { userId: from.toLowerCase() },
                    update: {
                        tipsSent: { increment: 1 },
                        amountSent: { increment: amount },
                        updatedAt: new Date()
                    },
                    create: {
                        userId: from.toLowerCase(),
                        tipsSent: 1,
                        amountSent: amount
                    }
                });

                await prisma.userStats.upsert({
                    where: { userId: to.toLowerCase() },
                    update: {
                        tipsReceived: { increment: 1 },
                        amountRecv: { increment: amount },
                        updatedAt: new Date()
                    },
                    create: {
                        userId: to.toLowerCase(),
                        tipsReceived: 1,
                        amountRecv: amount
                    }
                });

                // TODO: Emit WebSocket event or publish to pubsub
                // pubsub.publish('TIP_PROCESSED', {
                //     senderId: from,
                //     recipientId: to,
                //     amount: ethers.formatEther(amount),
                //     ipfsCid,
                //     txHash: event.transactionHash
                // });

                console.log(`✅ Tip processed from event: ${ipfsCid}`);
            } catch (error: any) {
                console.error('Error processing TipSent event:', error);
            }
        });

        this.isListening = true;
        console.log('✅ Event listener started successfully');
    }

    /**
     * Stop listening for events
     */
    public stopListening() {
        if (!this.contract) {
            return;
        }

        this.contract.removeAllListeners('TipSent');
        this.isListening = false;
        console.log('Event listener stopped');
    }

    /**
     * Check if listener is active
     */
    public getStatus(): { listening: boolean; contractAddress: string | null } {
        return {
            listening: this.isListening,
            contractAddress: TIP_ROUTER_ADDRESS || null
        };
    }
}

// Singleton instance
let eventListenerInstance: EventListener | null = null;

export function getEventListener(): EventListener {
    if (!eventListenerInstance) {
        eventListenerInstance = new EventListener();
    }
    return eventListenerInstance;
}
