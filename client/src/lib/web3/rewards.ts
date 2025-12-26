/**
 * VeryRewards Contract Operations
 * Handles claiming $VERY token rewards
 */

import { ethers } from 'ethers';
import { CONTRACTS } from './config';
import { ensureVeryNetwork } from './network';

const VERY_REWARDS_ABI = [
    'function grantReward(address user, uint256 amount, string calldata reason, uint256 nonce, uint8 v, bytes32 r, bytes32 s) external',
    'function getRewardHash(address user, uint256 amount, string calldata reason, uint256 nonce) external view returns (bytes32)',
    'function isRewardUsed(bytes32 rewardHash) external view returns (bool)',
    'function contractInfo() external view returns (uint256 version, address token, address signer, uint256 totalRewards)',
    'event RewardGranted(address indexed user, uint256 amount, string reason, bytes32 indexed rewardHash)'
];

export interface SignedRewardPayload {
    user: string;
    amount: string;
    reason: string;
    nonce: number;
    signature: string;
    v: number;
    r: string;
    s: string;
}

export interface ClaimRewardResult {
    success: boolean;
    transactionHash?: string;
    error?: string;
}

/**
 * Gets the VeryRewards contract instance
 */
export function getRewardsContract(
    signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
    const rewardsAddress = CONTRACTS.veryRewards?.address || import.meta.env.VITE_VERY_REWARDS_CONTRACT_ADDRESS || '';
    
    if (!rewardsAddress || rewardsAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('VERY_REWARDS_CONTRACT_ADDRESS not configured');
    }

    return new ethers.Contract(
        rewardsAddress,
        VERY_REWARDS_ABI,
        signerOrProvider
    );
}

/**
 * Claim a reward on-chain using signed payload
 * @param payload Signed reward payload from API
 * @param signer Signer to execute the transaction
 */
export async function claimReward(
    payload: SignedRewardPayload,
    signer: ethers.Signer
): Promise<ClaimRewardResult> {
    try {
        // Ensure correct network
        await ensureVeryNetwork();

        // Get contract
        const rewardsContract = getRewardsContract(signer);

        // Convert signature components
        const sig = ethers.Signature.from(payload.signature);

        // Call grantReward
        const tx = await rewardsContract.grantReward(
            payload.user,
            payload.amount,
            payload.reason,
            payload.nonce,
            sig.v,
            sig.r,
            sig.s,
            {
                gasLimit: 200000 // Estimate gas for mint operation
            }
        );

        // Wait for confirmation
        const receipt = await tx.wait();

        return {
            success: true,
            transactionHash: receipt.hash
        };
    } catch (error: any) {
        console.error('Error claiming reward:', error);
        
        // Handle common errors
        let errorMessage = 'Failed to claim reward';
        if (error.message?.includes('Reward already claimed')) {
            errorMessage = 'This reward has already been claimed';
        } else if (error.message?.includes('Invalid signer')) {
            errorMessage = 'Invalid reward signature';
        } else if (error.message?.includes('user rejected') || error.code === 4001) {
            errorMessage = 'Transaction rejected by user';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Check if a reward has already been claimed
 * @param rewardHash Reward hash to check
 * @param provider Provider to query on-chain
 */
export async function isRewardClaimed(
    rewardHash: string,
    provider: ethers.Provider
): Promise<boolean> {
    try {
        const rewardsContract = getRewardsContract(provider);
        return await rewardsContract.isRewardUsed(rewardHash);
    } catch (error) {
        console.error('Error checking reward claim status:', error);
        return false;
    }
}

/**
 * Get reward contract information
 */
export async function getRewardsContractInfo(provider: ethers.Provider): Promise<{
    version: bigint;
    token: string;
    signer: string;
    totalRewards: bigint;
} | null> {
    try {
        const rewardsContract = getRewardsContract(provider);
        const info = await rewardsContract.contractInfo();
        return {
            version: info[0],
            token: info[1],
            signer: info[2],
            totalRewards: info[3]
        };
    } catch (error) {
        console.error('Error fetching rewards contract info:', error);
        return null;
    }
}

