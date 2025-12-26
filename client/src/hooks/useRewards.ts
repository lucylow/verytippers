/**
 * React Hook for $VERY Token Rewards
 * Handles claiming rewards and checking reward status
 */

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { claimReward, isRewardClaimed, getRewardsContractInfo, type SignedRewardPayload, type ClaimRewardResult } from '@/lib/web3/rewards';
import { getVeryBalance } from '@/lib/web3/balance';

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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

            const response = await fetch(`${API_BASE_URL}/api/rewards/issue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user: address,
                    actionType,
                    context
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to issue reward');
            }

            return data.data as SignedRewardPayload;
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
            const result = await claimReward(payload, signer);
            
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
            const params = new URLSearchParams({
                actionType
            });

            if (context?.tipAmount) params.append('tipAmount', context.tipAmount.toString());
            if (context?.contentQualityScore) params.append('contentQualityScore', context.contentQualityScore.toString());
            if (context?.streakDays) params.append('streakDays', context.streakDays.toString());
            if (context?.referralVerified !== undefined) params.append('referralVerified', context.referralVerified.toString());

            const response = await fetch(`${API_BASE_URL}/api/rewards/evaluate?${params.toString()}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to check eligibility');
            }

            return data.data as RewardEligibility;
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
            const info = await getRewardsContractInfo(provider);
            setContractInfo(info);
        } catch (err) {
            console.error('Error fetching contract info:', err);
        }
    }, [provider]);

    /**
     * Get reward table
     */
    const getRewardTable = useCallback(async (): Promise<Record<string, string>> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/rewards/table`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch reward table');
            }

            return data.data.rewardTable as Record<string, string>;
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

