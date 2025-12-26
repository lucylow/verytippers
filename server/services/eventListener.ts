// @ts-nocheck
// server/services/eventListener.ts - Real-time Blockchain Event Listener
import { ethers, JsonRpcProvider, Contract } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

// TipRouter ABI (matches TipRouter.sol TipSubmitted event)
const TIP_ROUTER_ABI = [
    "event TipSubmitted(bytes32 indexed cidHash, address indexed from, address indexed to, uint256 amount, uint256 nonce)",
    "function submitTip(address from, address to, uint256 amount, bytes32 cidHash, uint256 nonce, uint8 v, bytes32 r, bytes32 s) external"
];

// NFT Contract ABI
const NFT_ABI = [
    "event Minted(address indexed to, uint256 tokenId, string tokenURI)"
];

// Marketplace Contract ABI
const MARKETPLACE_ABI = [
    "event Listed(uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price)",
    "event Cancelled(uint256 indexed listingId)",
    "event Purchased(uint256 indexed listingId, address indexed buyer, uint256 price)"
];

// Get contract addresses from config or env
const TIP_ROUTER_ADDRESS = config.TIP_CONTRACT_ADDRESS || process.env.TIP_CONTRACT_ADDRESS;
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;
const MARKETPLACE_CONTRACT_ADDRESS = process.env.MARKETPLACE_CONTRACT_ADDRESS;

export class EventListener {
    private provider: JsonRpcProvider;
    private tipContract: Contract | null = null;
    private nftContract: Contract | null = null;
    private marketplaceContract: Contract | null = null;
    private isListening: boolean = false;

    constructor() {
        this.provider = new JsonRpcProvider(config.VERY_CHAIN_RPC_URL);

        // Initialize TipRouter contract
        if (TIP_ROUTER_ADDRESS && TIP_ROUTER_ADDRESS !== '0xTipContractAddress') {
            this.tipContract = new Contract(
                TIP_ROUTER_ADDRESS,
                TIP_ROUTER_ABI,
                this.provider
            );
        }

        // Initialize NFT contract
        if (NFT_CONTRACT_ADDRESS && NFT_CONTRACT_ADDRESS !== '0xNFTContractAddress') {
            this.nftContract = new Contract(
                NFT_CONTRACT_ADDRESS,
                NFT_ABI,
                this.provider
            );
        }

        // Initialize Marketplace contract
        if (MARKETPLACE_CONTRACT_ADDRESS && MARKETPLACE_CONTRACT_ADDRESS !== '0xMarketplaceAddress') {
            this.marketplaceContract = new Contract(
                MARKETPLACE_CONTRACT_ADDRESS,
                MARKETPLACE_ABI,
                this.provider
            );
        }

        this.startListening();
    }

    /**
     * Start listening for blockchain events
     */
    private startListening() {
        if (this.isListening) {
            console.warn('EventListener: Already listening for events');
            return;
        }

        // Listen for TipRouter events
        if (this.tipContract) {
            console.log(`Starting event listener for TipRouter at ${TIP_ROUTER_ADDRESS}`);
            this.listenToTipEvents();
        }

        // Listen for NFT events
        if (this.nftContract) {
            console.log(`Starting event listener for NFT at ${NFT_CONTRACT_ADDRESS}`);
            this.listenToNFTEvents();
        }

        // Listen for Marketplace events
        if (this.marketplaceContract) {
            console.log(`Starting event listener for Marketplace at ${MARKETPLACE_CONTRACT_ADDRESS}`);
            this.listenToMarketplaceEvents();
        }

        this.isListening = true;
        console.log('✅ Event listeners started successfully');
    }

    /**
     * Listen for TipRouter events
     */
    private listenToTipEvents() {
        if (!this.tipContract) return;

        // Listen for TipSubmitted events (matches TipRouter.sol)
        this.tipContract.on('TipSubmitted', async (
            cidHash: string,
            from: string,
            to: string,
            amount: bigint,
            nonce: bigint,
            event: any
        ) => {
            try {
                console.log(`📥 TipSubmitted event received: ${from} -> ${to}, amount: ${ethers.formatEther(amount)} VERY, cidHash: ${cidHash}`);

                // Find sender and recipient users by wallet address
                const sender = await prisma.user.findUnique({
                    where: { walletAddress: from.toLowerCase() }
                });
                const recipient = await prisma.user.findUnique({
                    where: { walletAddress: to.toLowerCase() }
                });

                if (!sender || !recipient) {
                    console.warn(`Users not found for addresses: ${from} or ${to}`);
                    return;
                }

                // Upsert tip in database using transactionHash as unique identifier
                await prisma.tip.upsert({
                    where: { transactionHash: event.transactionHash },
                    update: {
                        status: 'CONFIRMED',
                        confirmedAt: new Date(),
                        blockNumber: event.blockNumber
                    },
                    create: {
                        senderId: sender.id,
                        recipientId: recipient.id,
                        tokenAddress: config.VERY_TOKEN_ADDRESS || config.TIP_CONTRACT_ADDRESS || '',
                        amount: ethers.formatEther(amount),
                        amountInWei: amount,
                        messageHash: cidHash, // Store cidHash as messageHash
                        transactionHash: event.transactionHash,
                        blockNumber: event.blockNumber,
                        status: 'CONFIRMED',
                        confirmedAt: new Date()
                    }
                });

                // Update User stats
                await prisma.user.update({
                    where: { id: sender.id },
                    data: {
                        totalTipsSent: { increment: amount },
                        lastTipAt: new Date()
                    }
                });

                await prisma.user.update({
                    where: { id: recipient.id },
                    data: {
                        totalTipsReceived: { increment: amount }
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

                console.log(`✅ Tip processed from event: ${cidHash}`);
            } catch (error: any) {
                console.error('Error processing TipSubmitted event:', error);
            }
        });
    }

    /**
     * Listen for NFT Mint events
     */
    private listenToNFTEvents() {
        if (!this.nftContract) return;

        this.nftContract.on('Minted', async (
            to: string,
            tokenId: bigint,
            tokenURI: string,
            event: any
        ) => {
            try {
                console.log(`📥 NFT Minted event: tokenId=${tokenId}, to=${to}, uri=${tokenURI}`);

                // Upsert NFT in database
                await prisma.nFT.upsert({
                    where: {
                        contract_tokenId: {
                            contract: (this.nftContract!.target as string).toLowerCase(),
                            tokenId: tokenId
                        }
                    },
                    update: {
                        owner: to.toLowerCase(),
                        tokenURI: tokenURI
                    },
                    create: {
                        tokenId: tokenId,
                        contract: (this.nftContract!.target as string).toLowerCase(),
                        owner: to.toLowerCase(),
                        tokenURI: tokenURI,
                        mintedAt: new Date()
                    }
                });

                console.log(`✅ NFT processed from event: tokenId=${tokenId}`);
            } catch (error: any) {
                console.error('Error processing Minted event:', error);
            }
        });
    }

    /**
     * Listen for Marketplace events
     */
    private listenToMarketplaceEvents() {
        if (!this.marketplaceContract) return;

        // Listen for Listed events
        this.marketplaceContract.on('Listed', async (
            listingId: bigint,
            seller: string,
            nftContract: string,
            tokenId: bigint,
            price: bigint,
            event: any
        ) => {
            try {
                console.log(`📥 NFT Listed event: listingId=${listingId}, tokenId=${tokenId}, price=${price}`);

                // Find or create NFT
                const nft = await prisma.nFT.upsert({
                    where: {
                        contract_tokenId: {
                            contract: nftContract.toLowerCase(),
                            tokenId: tokenId
                        }
                    },
                    create: {
                        tokenId: tokenId,
                        contract: nftContract.toLowerCase(),
                        owner: seller.toLowerCase(),
                        tokenURI: '',
                        mintedAt: new Date()
                    },
                    update: {}
                });

                // Create or update listing
                await prisma.listing.upsert({
                    where: {
                        listingId: listingId
                    },
                    update: {
                        active: true,
                        price: price.toString(),
                        updatedAt: new Date()
                    },
                    create: {
                        listingId: listingId,
                        nftId: nft.id,
                        seller: seller.toLowerCase(),
                        price: price.toString(),
                        active: true
                    }
                });

                console.log(`✅ Listing processed from event: listingId=${listingId}`);
            } catch (error: any) {
                console.error('Error processing Listed event:', error);
            }
        });

        // Listen for Cancelled events
        this.marketplaceContract.on('Cancelled', async (
            listingId: bigint,
            event: any
        ) => {
            try {
                console.log(`📥 NFT Listing Cancelled: listingId=${listingId}`);

                await prisma.listing.updateMany({
                    where: { listingId: listingId },
                    data: {
                        active: false,
                        updatedAt: new Date()
                    }
                });

                console.log(`✅ Listing cancellation processed: listingId=${listingId}`);
            } catch (error: any) {
                console.error('Error processing Cancelled event:', error);
            }
        });

        // Listen for Purchased events
        this.marketplaceContract.on('Purchased', async (
            listingId: bigint,
            buyer: string,
            price: bigint,
            event: any
        ) => {
            try {
                console.log(`📥 NFT Purchased event: listingId=${listingId}, buyer=${buyer}, price=${price}`);

                // Update listing
                const listing = await prisma.listing.findFirst({
                    where: { listingId: listingId },
                    include: { NFT: true }
                });

                if (listing) {
                    await prisma.listing.update({
                        where: { id: listing.id },
                        data: {
                            active: false,
                            updatedAt: new Date()
                        }
                    });

                    // Update NFT owner
                    await prisma.nFT.update({
                        where: { id: listing.nftId },
                        data: { owner: buyer.toLowerCase() }
                    });
                }

                console.log(`✅ Purchase processed from event: listingId=${listingId}`);
            } catch (error: any) {
                console.error('Error processing Purchased event:', error);
            }
        });
    }

    /**
     * Stop listening for events
     */
    public stopListening() {
        if (this.tipContract) {
            this.tipContract.removeAllListeners('TipSubmitted');
        }
        if (this.nftContract) {
            this.nftContract.removeAllListeners('Minted');
        }
        if (this.marketplaceContract) {
            this.marketplaceContract.removeAllListeners('Listed');
            this.marketplaceContract.removeAllListeners('Cancelled');
            this.marketplaceContract.removeAllListeners('Purchased');
        }
        this.isListening = false;
        console.log('Event listeners stopped');
    }

    /**
     * Check if listener is active
     */
    public getStatus(): { 
        listening: boolean; 
        tipContract: string | null;
        nftContract: string | null;
        marketplaceContract: string | null;
    } {
        return {
            listening: this.isListening,
            tipContract: TIP_ROUTER_ADDRESS || null,
            nftContract: NFT_CONTRACT_ADDRESS || null,
            marketplaceContract: MARKETPLACE_CONTRACT_ADDRESS || null
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
