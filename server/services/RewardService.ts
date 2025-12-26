import { ethers, Wallet, JsonRpcProvider, Contract } from 'ethers';
import { config } from '../config';

// ABI for VeryRewards contract
const VERY_REWARDS_ABI = [
    "function grantReward(address user, uint256 amount, string calldata reason, uint256 nonce, uint8 v, bytes32 r, bytes32 s) external",
    "function getRewardHash(address user, uint256 amount, string calldata reason, uint256 nonce) external view returns (bytes32)",
    "function isRewardUsed(bytes32 rewardHash) external view returns (bool)",
    "function contractInfo() external view returns (uint256 version, address token, address signer, uint256 totalRewards)",
    "event RewardGranted(address indexed user, uint256 amount, string reason, bytes32 indexed rewardHash)"
];

/**
 * Reward action types
 */
export enum RewardActionType {
    TIP_SENT = 'TIP_SENT',
    TIP_RECEIVED = 'TIP_RECEIVED',
    QUALITY_CONTENT = 'QUALITY_CONTENT',
    DAILY_STREAK = 'DAILY_STREAK',
    REFERRAL = 'REFERRAL',
    DAO_VOTE = 'DAO_VOTE',
}

/**
 * Reward table mapping action types to $VERY amounts (in wei)
 * Amounts are in wei (1e18 = 1 VERY token)
 */
export const REWARD_TABLE: Record<RewardActionType, bigint> = {
    [RewardActionType.TIP_SENT]: BigInt(5 * 1e18),        // 5 VERY
    [RewardActionType.TIP_RECEIVED]: BigInt(3 * 1e18),    // 3 VERY
    [RewardActionType.QUALITY_CONTENT]: BigInt(20 * 1e18), // 20 VERY
    [RewardActionType.DAILY_STREAK]: BigInt(15 * 1e18),    // 15 VERY
    [RewardActionType.REFERRAL]: BigInt(25 * 1e18),        // 25 VERY
    [RewardActionType.DAO_VOTE]: BigInt(10 * 1e18),        // 10 VERY
};

/**
 * Reward evaluation result
 */
export interface RewardEligibility {
    eligible: boolean;
    amount: bigint;
    reason: string;
    error?: string;
}

/**
 * Signed reward payload for on-chain claim
 */
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

/**
 * RewardService - Handles reward policy, signing, and validation
 */
export class RewardService {
    private provider: JsonRpcProvider;
    private rewardSigner: Wallet;
    private rewardsContract: Contract | null = null;
    private rewardsContractAddress: string;

    constructor() {
        this.provider = new JsonRpcProvider(config.VERY_CHAIN_RPC_URL);
        
        // Reward signer private key (should be from KMS/HSM in production)
        const rewardSignerKey = process.env.REWARD_SIGNER_PRIVATE_KEY || config.SPONSOR_PRIVATE_KEY;
        if (!rewardSignerKey || rewardSignerKey === '0x0000000000000000000000000000000000000000000000000000000000000001') {
            throw new Error('REWARD_SIGNER_PRIVATE_KEY must be set in environment variables');
        }
        
        this.rewardSigner = new Wallet(rewardSignerKey, this.provider);
        this.rewardsContractAddress = process.env.VERY_REWARDS_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

        // Initialize contract if address is configured
        if (this.rewardsContractAddress && this.rewardsContractAddress !== '0x0000000000000000000000000000000000000000') {
            this.rewardsContract = new Contract(
                this.rewardsContractAddress,
                VERY_REWARDS_ABI,
                this.provider
            );
        }
    }

    /**
     * Get reward signer address (public key)
     */
    public getRewardSignerAddress(): string {
        return this.rewardSigner.address;
    }

    /**
     * Evaluate if an action is eligible for reward
     * @param actionType Type of action
     * @param context Context for evaluation (tip amount, content quality, etc.)
     */
    public evaluateReward(
        actionType: RewardActionType,
        context?: {
            tipAmount?: number;
            contentQualityScore?: number;
            streakDays?: number;
            referralVerified?: boolean;
        }
    ): RewardEligibility {
        // Check if action type exists in reward table
        if (!REWARD_TABLE[actionType]) {
            return {
                eligible: false,
                amount: BigInt(0),
                reason: actionType,
                error: `Unknown action type: ${actionType}`
            };
        }

        const baseAmount = REWARD_TABLE[actionType];

        // Apply conditional logic based on action type
        switch (actionType) {
            case RewardActionType.TIP_SENT:
                // Only reward tips >= $1 equivalent (assuming VERY is pegged, adjust threshold as needed)
                if (context?.tipAmount && context.tipAmount < 1) {
                    return {
                        eligible: false,
                        amount: BigInt(0),
                        reason: actionType,
                        error: 'Tip amount must be >= $1 equivalent'
                    };
                }
                break;

            case RewardActionType.QUALITY_CONTENT:
                // Only reward content with quality score >= 0.8
                if (!context?.contentQualityScore || context.contentQualityScore < 0.8) {
                    return {
                        eligible: false,
                        amount: BigInt(0),
                        reason: actionType,
                        error: 'Content quality score must be >= 0.8'
                    };
                }
                break;

            case RewardActionType.DAILY_STREAK:
                // Only reward streaks of 7+ days
                if (!context?.streakDays || context.streakDays < 7) {
                    return {
                        eligible: false,
                        amount: BigInt(0),
                        reason: actionType,
                        error: 'Streak must be >= 7 days'
                    };
                }
                break;

            case RewardActionType.REFERRAL:
                // Only reward verified referrals
                if (!context?.referralVerified) {
                    return {
                        eligible: false,
                        amount: BigInt(0),
                        reason: actionType,
                        error: 'Referral must be verified'
                    };
                }
                break;

            case RewardActionType.DAO_VOTE:
            case RewardActionType.TIP_RECEIVED:
                // No additional conditions
                break;
        }

        return {
            eligible: true,
            amount: baseAmount,
            reason: actionType
        };
    }

    /**
     * Sign a reward payload for on-chain claim
     * @param user Address receiving the reward
     * @param amount Reward amount in wei
     * @param reason Reward reason
     * @param nonce Unique nonce (timestamp recommended)
     * @param rewardsContractAddress Address of VeryRewards contract
     */
    public async signReward(
        user: string,
        amount: bigint,
        reason: string,
        nonce: number,
        rewardsContractAddress: string = this.rewardsContractAddress
    ): Promise<SignedRewardPayload> {
        if (rewardsContractAddress === '0x0000000000000000000000000000000000000000') {
            throw new Error('VERY_REWARDS_CONTRACT_ADDRESS not configured');
        }

        // Compute reward hash (must match contract's getRewardHash)
        // Contract uses: keccak256(abi.encodePacked(user, amount, reason, nonce, address(this)))
        const rewardHash = ethers.keccak256(
            ethers.solidityPacked(
                ['address', 'uint256', 'string', 'uint256', 'address'],
                [ethers.getAddress(user), amount, reason, nonce, ethers.getAddress(rewardsContractAddress)]
            )
        );

        // Sign with EIP-191 format (Ethereum Signed Message)
        const messageBytes = ethers.getBytes(
            ethers.concat([
                ethers.toUtf8Bytes('\x19Ethereum Signed Message:\n32'),
                ethers.getBytes(rewardHash)
            ])
        );

        const signature = await this.rewardSigner.signMessage(ethers.getBytes(rewardHash));
        const sig = ethers.Signature.from(signature);

        return {
            user,
            amount: amount.toString(),
            reason,
            nonce,
            signature,
            v: sig.v,
            r: sig.r,
            s: sig.s
        };
    }

    /**
     * Issue a reward by evaluating eligibility and signing payload
     * @param user Address receiving the reward
     * @param actionType Type of action
     * @param context Context for evaluation
     */
    public async issueReward(
        user: string,
        actionType: RewardActionType,
        context?: {
            tipAmount?: number;
            contentQualityScore?: number;
            streakDays?: number;
            referralVerified?: boolean;
        }
    ): Promise<SignedRewardPayload> {
        // Validate user address
        if (!ethers.isAddress(user)) {
            throw new Error(`Invalid user address: ${user}`);
        }

        // Evaluate eligibility
        const evaluation = this.evaluateReward(actionType, context);
        if (!evaluation.eligible) {
            throw new Error(evaluation.error || 'Action not eligible for reward');
        }

        // Generate unique nonce (use timestamp + random)
        const nonce = Date.now();

        // Sign reward
        const signedPayload = await this.signReward(
            user,
            evaluation.amount,
            evaluation.reason,
            nonce
        );

        return signedPayload;
    }

    /**
     * Check if a reward has already been claimed on-chain
     * @param rewardHash Reward hash to check
     */
    public async isRewardClaimed(rewardHash: string): Promise<boolean> {
        if (!this.rewardsContract) {
            return false;
        }

        try {
            return await this.rewardsContract.isRewardUsed(rewardHash);
        } catch (error) {
            console.error('Error checking reward claim status:', error);
            return false;
        }
    }

    /**
     * Get contract info
     */
    public async getContractInfo(): Promise<{
        version: bigint;
        token: string;
        signer: string;
        totalRewards: bigint;
    } | null> {
        if (!this.rewardsContract) {
            return null;
        }

        try {
            const info = await this.rewardsContract.contractInfo();
            return {
                version: info[0],
                token: info[1],
                signer: info[2],
                totalRewards: info[3]
            };
        } catch (error) {
            console.error('Error fetching contract info:', error);
            return null;
        }
    }
}

