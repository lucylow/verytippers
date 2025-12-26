import { ethers, Wallet, Contract, JsonRpcProvider } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { IpfsService } from './IpfsService';

const prisma = new PrismaClient();

// NFT Contract ABI
const NFT_ABI = [
    "function mintTo(address to, string calldata tokenURI) external returns (uint256)",
    "function setAdmin(address _admin) external",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "event Minted(address indexed to, uint256 tokenId, string tokenURI)"
];

// Marketplace Contract ABI
const MARKETPLACE_ABI = [
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

// ERC721 ABI for approvals
const ERC721_ABI = [
    "function approve(address to, uint256 tokenId) external",
    "function getApproved(uint256 tokenId) view returns (address)",
    "function isApprovedForAll(address owner, address operator) view returns (bool)",
    "function setApprovalForAll(address operator, bool approved) external"
];

export interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    attributes?: Array<{
        trait_type: string;
        value: string | number;
    }>;
    boostMultiplier?: number;
}

export interface MintRequest {
    toAddress: string;
    name: string;
    description: string;
    imageBase64?: string;
    imageUrl?: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
    boostMultiplier?: number;
}

export interface ListRequest {
    nftContract: string;
    tokenId: number;
    price: string; // in wei
}

export interface BuyRequest {
    listingId: number;
}

export class NFTService {
    private provider: JsonRpcProvider;
    private relayerWallet: Wallet;
    private ipfsService: IpfsService;
    private nftContract: Contract | null = null;
    private marketplaceContract: Contract | null = null;

    constructor() {
        this.provider = new JsonRpcProvider(config.VERY_CHAIN_RPC_URL);
        this.relayerWallet = new Wallet(config.SPONSOR_PRIVATE_KEY, this.provider);
        this.ipfsService = new IpfsService();

        // Initialize contracts if addresses are configured
        const nftAddress = process.env.NFT_CONTRACT_ADDRESS;
        const marketplaceAddress = process.env.MARKETPLACE_CONTRACT_ADDRESS;

        if (nftAddress && nftAddress !== '0xNFTContractAddress') {
            this.nftContract = new Contract(nftAddress, NFT_ABI, this.relayerWallet);
        }

        if (marketplaceAddress && marketplaceAddress !== '0xMarketplaceAddress') {
            this.marketplaceContract = new Contract(marketplaceAddress, MARKETPLACE_ABI, this.relayerWallet);
        }
    }

    /**
     * Create NFT metadata JSON and pin to IPFS
     */
    async createMetadata(metadata: NFTMetadata): Promise<string> {
        const metadataJson = JSON.stringify(metadata, null, 2);
        const tokenURI = await this.ipfsService.upload(metadataJson);
        return tokenURI;
    }

    /**
     * Mint NFT with metadata
     */
    async mint(request: MintRequest): Promise<{ tokenId: number; tokenURI: string; txHash: string }> {
        if (!this.nftContract) {
            throw new Error('NFT contract not configured. Set NFT_CONTRACT_ADDRESS in .env');
        }

        const nftContract = this.nftContract; // Store for TypeScript narrowing

        // Create metadata
        const metadata: NFTMetadata = {
            name: request.name,
            description: request.description,
            image: request.imageUrl || `data:image/png;base64,${request.imageBase64}`,
            attributes: request.attributes || [],
            boostMultiplier: request.boostMultiplier || 1.0
        };

        // Upload metadata to IPFS
        const tokenURI = await this.createMetadata(metadata);

        // Mint NFT via contract
        const tx = await nftContract.mintTo(request.toAddress, tokenURI);
        const receipt = await tx.wait();

        // Extract tokenId from event
        const mintEvent = receipt.logs.find((log: any) => {
            try {
                const parsed = nftContract.interface.parseLog(log);
                return parsed !== null && parsed.name === 'Minted';
            } catch {
                return false;
            }
        });

        let tokenId: number;
        if (mintEvent) {
            const parsed = nftContract.interface.parseLog(mintEvent);
            if (!parsed) {
                throw new Error('Could not parse mint event');
            }
            tokenId = Number(parsed.args.tokenId);
        } else {
            // Fallback: query the contract or use a workaround
            throw new Error('Could not extract tokenId from mint event');
        }

        // Save to database
        await prisma.nFT.create({
            data: {
                tokenId: BigInt(tokenId),
                contract: nftContract.target as string,
                owner: request.toAddress.toLowerCase(),
                tokenURI: tokenURI,
                metadata: metadata as any
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
    async list(request: ListRequest): Promise<{ listingId: number; txHash: string }> {
        if (!this.marketplaceContract) {
            throw new Error('Marketplace contract not configured. Set MARKETPLACE_CONTRACT_ADDRESS in .env');
        }

        // Verify NFT exists and get owner
        const nftContract = new Contract(request.nftContract, ERC721_ABI, this.provider);
        const owner = await nftContract.ownerOf(request.tokenId);
        
        // Check if marketplace is approved
        const approved = await nftContract.getApproved(request.tokenId);
        const isApprovedForAll = await nftContract.isApprovedForAll(owner, this.marketplaceContract.target);
        
        if (approved !== this.marketplaceContract.target && !isApprovedForAll) {
            throw new Error('Marketplace contract not approved. User must approve first.');
        }

        // List on marketplace
        const priceWei = ethers.parseEther(request.price);
        const tx = await this.marketplaceContract.listItem(
            request.nftContract,
            request.tokenId,
            priceWei
        );
        const receipt = await tx.wait();

        // Extract listingId from event
        const listEvent = receipt.logs.find((log: any) => {
            try {
                const parsed = this.marketplaceContract!.interface.parseLog(log);
                return parsed?.name === 'Listed';
            } catch {
                return false;
            }
        });

        let listingId: number;
        if (listEvent) {
            const parsed = this.marketplaceContract!.interface.parseLog(listEvent);
            listingId = Number(parsed?.args.listingId);
        } else {
            throw new Error('Could not extract listingId from list event');
        }

        // Find or create NFT in database
        const nft = await prisma.nFT.upsert({
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
                tokenURI: await nftContract.tokenURI(request.tokenId).catch(() => ''),
            },
            update: {}
        });

        // Save listing to database
        await prisma.listing.create({
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
    async buy(request: BuyRequest, buyerAddress: string): Promise<{ txHash: string }> {
        if (!this.marketplaceContract) {
            throw new Error('Marketplace contract not configured');
        }

        // Get listing details
        const listing = await this.marketplaceContract.getListing(request.listingId);
        if (!listing.active) {
            throw new Error('Listing is not active');
        }

        // Execute purchase
        const tx = await this.marketplaceContract.buy(request.listingId, {
            value: listing.price
        });
        const receipt = await tx.wait();

        // Update database
        await prisma.listing.updateMany({
            where: {
                listingId: BigInt(request.listingId)
            },
            data: {
                active: false,
                updatedAt: new Date()
            }
        });

        // Update NFT owner
        const listingRecord = await prisma.listing.findFirst({
            where: { listingId: BigInt(request.listingId) },
            include: { NFT: true }
        });

        if (listingRecord) {
            await prisma.nFT.update({
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
    async getNFT(contract: string, tokenId: number) {
        const nft = await prisma.nFT.findUnique({
            where: {
                contract_tokenId: {
                    contract: contract.toLowerCase(),
                    tokenId: BigInt(tokenId)
                }
            },
            include: {
                listings: {
                    where: { active: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        return nft;
    }

    /**
     * Get active listings
     */
    async getActiveListings(limit: number = 50, offset: number = 0) {
        const listings = await prisma.listing.findMany({
            where: { active: true },
            include: {
                NFT: true
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });

        return listings;
    }

    /**
     * Get user's NFTs
     */
    async getUserNFTs(userAddress: string) {
        const nfts = await prisma.nFT.findMany({
            where: {
                owner: userAddress.toLowerCase()
            },
            include: {
                listings: {
                    where: { active: true }
                }
            },
            orderBy: { mintedAt: 'desc' }
        });

        return nfts;
    }

    /**
     * Get platform fee recipient address
     */
    async getFeeRecipient(): Promise<string> {
        if (!this.marketplaceContract) {
            throw new Error('Marketplace contract not configured');
        }

        try {
            const feeRecipient = await this.marketplaceContract.feeRecipient();
            return feeRecipient;
        } catch (error: any) {
            console.error('Error fetching fee recipient:', error);
            // Return a default address if contract call fails
            return this.relayerWallet.address;
        }
    }
}

