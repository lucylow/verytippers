/**
 * React Hook for $VERY Token Rewards
 * Handles claiming rewards and checking reward status
 */

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { claimReward, isRewardClaimed, getRewardsContractInfo, type SignedRewardPayload as Web3SignedRewardPayload, type ClaimRewardResult } from '@/lib/web3/rewards';
import { getVeryBalance } from '@/lib/web3/balance';
import { issueReward as issueRewardApi, evaluateReward, getRewardInfo, getRewardTable as getRewardTableApi } from '@/lib/api';
import type { EvaluateRewardRequest, SignedRewardPayload } from '@/lib/api/types';

export enum RewardActionType {
    TIP_SENT = 'TIP_SENT',
    TIP_RECEIVED = 'TIP_RECEIVED',
    QUALITY_CONTENT = 'QUALITY_CONTENT',
    DAILY_STREAK = 'DAILY_STREAK',
    REFERRAL = 'REFERRAL',
    DAO_VOTE = 'DAO_VOTE',
}

export interface RewardEligibility {
    eligible: boolean;
    amount: string;
    amountFormatted: string;
    reason: string;
    error?: string;
}

export interface UseRewardsReturn {
    // State
    isClaiming: boolean;
    error: string | null;
    contractInfo: {
        version: bigint;
        token: string;
        signer: string;
        totalRewards: bigint;
    } | null;

    // Operations
    issueReward: (actionType: RewardActionType, context?: {
        tipAmount?: number;
        contentQualityScore?: number;
        streakDays?: number;
        referralVerified?: boolean;
    }) => Promise<SignedRewardPayload | null>;
    claimRewardOnChain: (payload: SignedRewardPayload) => Promise<ClaimRewardResult>;
    checkRewardEligibility: (actionType: RewardActionType, context?: any) => Promise<RewardEligibility>;
    refreshContractInfo: () => Promise<void>;
    getRewardTable: () => Promise<Record<string, string>>;
}

/**
 * Hook for $VERY token rewards
 */
export function useRewards(): UseRewardsReturn {
    const { isConnected, address, signer, provider } = useWallet();
    const [isClaiming, setIsClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [contractInfo, setContractInfo] = useState<{
        version: bigint;
        token: string;
        signer: string;
        totalRewards: bigint;
    } | null>(null);

    /**
     * Issue a reward by requesting signed payload from backend
     */
    const issueReward = useCallback(async (
        actionType: RewardActionType,
        context?: {
            tipAmount?: number;
            contentQualityScore?: number;
            streakDays?: number;
            referralVerified?: boolean;
        }
    ): Promise<SignedRewardPayload | null> => {
        if (!isConnected || !address) {
            setError('Wallet not connected');
            return null;
        }

        try {
            setError(null);

            const result = await issueRewardApi({
                user: address,
                actionType: actionType as string,
                context,
            });

            if (!result.success || !result.data) {
                throw new Error(result.error || 'Failed to issue reward');
            }

            return result.data;
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to issue reward';
            setError(errorMessage);
            console.error('Error issuing reward:', err);
            return null;
        }
    }, [isConnected, address]);

    /**
     * Claim reward on-chain using signed payload
     */
    const claimRewardOnChain = useCallback(async (
        payload: SignedRewardPayload
    ): Promise<ClaimRewardResult> => {
        if (!isConnected || !signer) {
            return {
                success: false,
                error: 'Wallet not connected or signer not available'
            };
        }

        setIsClaiming(true);
        setError(null);

        try {
            // Convert API payload format to web3 format
            // Extract signature components from signature string
            const sig = ethers.Signature.from(payload.signature);
            const web3Payload: Web3SignedRewardPayload = {
                user: payload.user,
                amount: payload.amount,
                reason: payload.actionType, // Use actionType as reason
                nonce: parseInt(payload.nonce, 10),
                signature: payload.signature,
                v: sig.v,
                r: sig.r,
                s: sig.s,
            };
            const result = await claimReward(web3Payload, signer);
            
            if (result.success) {
                // Refresh balance after successful claim
                // This is handled by the balance hook automatically
            } else {
                setError(result.error || 'Failed to claim reward');
            }

            return result;
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to claim reward';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setIsClaiming(false);
        }
    }, [isConnected, signer]);

    /**
     * Check reward eligibility without issuing
     */
    const checkRewardEligibility = useCallback(async (
        actionType: RewardActionType,
        context?: any
    ): Promise<RewardEligibility> => {
        try {
            const request: EvaluateRewardRequest = {
                actionType: actionType as string,
                tipAmount: context?.tipAmount,
                contentQualityScore: context?.contentQualityScore,
                streakDays: context?.streakDays,
                referralVerified: context?.referralVerified,
            };

            const result = await evaluateReward(request);

            if (!result.success || !result.data) {
                throw new Error(result.error || 'Failed to check eligibility');
            }

            return {
                eligible: result.data.eligible,
                amount: result.data.amount,
                amountFormatted: result.data.amountFormatted,
                reason: result.data.reason || actionType,
                error: result.data.error,
            };
        } catch (err: any) {
            return {
                eligible: false,
                amount: '0',
                amountFormatted: '0',
                reason: actionType,
                error: err.message || 'Failed to check eligibility'
            };
        }
    }, []);

    /**
     * Refresh contract info
     */
    const refreshContractInfo = useCallback(async () => {
        if (!provider) return;

        try {
            // Try to get info from API first, fallback to on-chain
            const apiResult = await getRewardInfo();
            if (apiResult.success && apiResult.data?.contract) {
                const contract = apiResult.data.contract;
                setContractInfo({
                    version: BigInt(contract.version.toString()),
                    token: contract.token,
                    signer: contract.signer,
                    totalRewards: BigInt(contract.totalRewards.toString()),
                });
            } else {
                // Fallback to on-chain call
                const info = await getRewardsContractInfo(provider);
                setContractInfo(info);
            }
        } catch (err) {
            console.error('Error fetching contract info:', err);
            // Fallback to on-chain call if API fails
            if (provider) {
                try {
                    const info = await getRewardsContractInfo(provider);
                    setContractInfo(info);
                } catch (fallbackErr) {
                    console.error('Error fetching contract info from chain:', fallbackErr);
                }
            }
        }
    }, [provider]);

    /**
     * Get reward table
     */
    const getRewardTable = useCallback(async (): Promise<Record<string, string>> => {
        try {
            const result = await getRewardTableApi();

            if (!result.success || !result.data?.rewardTable) {
                throw new Error(result.error || 'Failed to fetch reward table');
            }

            return result.data.rewardTable;
        } catch (err: any) {
            console.error('Error fetching reward table:', err);
            return {};
        }
    }, []);

    return {
        isClaiming,
        error,
        contractInfo,
        issueReward,
        claimRewardOnChain,
        checkRewardEligibility,
        refreshContractInfo,
        getRewardTable
    };
}

