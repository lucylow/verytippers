/**
 * Orchestrator Service
 * Coordinates tip creation, IPFS upload, message hash building, and meta-transaction preparation
 * Ensures consistent encoding between backend and smart contract
 */

import { ethers } from 'ethers';
import { IpfsService } from './IpfsService';
import { DatabaseService } from './DatabaseService';
import { config } from '../config';

export interface TipDraft {
    from: string;
    to: string;
    amount: string;
    message?: string;
    nonce: number;
}

export interface TipPreview {
    from: string;
    to: string;
    amount: string;
    message?: string;
    cid?: string;
    cidHash?: string;
    messageHash?: string;
    walletPayload?: {
        messageHash: string;
        cidHash: string;
        from: string;
        to: string;
        amount: string;
        nonce: number;
    };
}

export class OrchestratorService {
    private ipfsService: IpfsService;
    private db = DatabaseService.getInstance();

    constructor() {
        this.ipfsService = new IpfsService();
    }

    /**
     * Convert IPFS CID to bytes32 hash (keccak256)
     * Matches contract logic: keccak256(cid)
     */
    cidToBytes32(cid: string): string {
        // Remove ipfs:// prefix if present
        const cleanCid = cid.replace('ipfs://', '').replace('/ipfs/', '');
        // Convert to bytes32 hash
        return ethers.keccak256(ethers.toUtf8Bytes(cleanCid));
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
    buildMessageHash(
        from: string,
        to: string,
        amount: string | bigint,
        cidHash: string,
        nonce: number | bigint
    ): string {
        // Normalize addresses to checksum format
        const fromAddr = ethers.getAddress(from);
        const toAddr = ethers.getAddress(to);

        // Build message hash using solidityPacked (matches contract's abi.encodePacked)
        const messageHash = ethers.keccak256(
            ethers.solidityPacked(
                ['address', 'address', 'uint256', 'bytes32', 'uint256'],
                [fromAddr, toAddr, BigInt(amount), cidHash, BigInt(nonce)]
            )
        );

        return messageHash;
    }

    /**
     * Create a tip draft and prepare for user signature
     * Returns preview and wallet payload for frontend signing
     */
    async createTipDraft(draft: TipDraft): Promise<TipPreview> {
        // 1. Upload message to IPFS (if provided)
        let cid: string | undefined;
        let cidHash: string | undefined;

        if (draft.message) {
            try {
                // Encrypt and upload message
                cid = await IpfsService.encryptAndPin(draft.message, this.ipfsService);
                // Convert CID to bytes32 hash
                cidHash = this.cidToBytes32(cid);
            } catch (error) {
                console.error('IPFS upload failed:', error);
                // Continue without message if IPFS fails
            }
        }

        // 2. Build message hash for signing
        const amountWei = ethers.parseEther(draft.amount).toString();
        const messageHash = this.buildMessageHash(
            draft.from,
            draft.to,
            amountWei,
            cidHash || ethers.ZeroHash, // Use zero hash if no message
            draft.nonce
        );

        // 3. Return preview and wallet payload
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
                cidHash: cidHash || ethers.ZeroHash,
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
    async getNextNonce(userAddress: string): Promise<number> {
        // Simple implementation: use timestamp + random
        // In production, use database counter or derive from user's tip history
        const user = await this.db.user.findUnique({
            where: { walletAddress: userAddress },
            include: {
                tipsSent: {
                    where: { status: 'CONFIRMED' },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        if (user && user.tipsSent.length > 0) {
            // Use tip count as base nonce
            return user.tipsSent.length + 1;
        }

        // Default: use timestamp-based nonce
        return Math.floor(Date.now() / 1000);
    }
}

