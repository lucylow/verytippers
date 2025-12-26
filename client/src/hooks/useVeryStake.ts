import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { CONTRACTS } from '@/lib/web3/config';

const VERY_STAKE_ABI = [
  'function staked(address) view returns (uint256)',
  'function canTip(address) view returns (bool)',
  'function minStakeRequired() view returns (uint256)',
  'function getStakeInfo(address) view returns (uint256 stakedAmount, bool canTipUser)',
  'function stake(uint256 amount) external',
  'function unstake(uint256 amount) external',
  'event Staked(address indexed user, uint256 amount)',
  'event Unstaked(address indexed user, uint256 amount)'
];

const VERY_TOKEN_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

export interface StakeData {
  stakedAmount: string;
  stakedFormatted: string;
  canTip: boolean;
  minStakeRequired: string;
  minStakeFormatted: string;
  needsMoreStake: boolean;
  stakeProgress: number; // 0-100 percentage
}

export interface UseVeryStakeReturn {
  stakeData: StakeData | null;
  isLoading: boolean;
  error: string | null;
  refreshStake: () => Promise<void>;
  stake: (amount: number) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  unstake: (amount: number) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  getStakeFor: (address: string) => Promise<StakeData>;
}

export function useVeryStake(): UseVeryStakeReturn {
  const { isConnected, address, signer, provider } = useWallet();
  const [stakeData, setStakeData] = useState<StakeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getStakeFor = useCallback(async (userAddress: string): Promise<StakeData> => {
    if (!provider || !ethers.isAddress(userAddress)) {
      throw new Error('Invalid address or provider');
    }

    try {
      const contract = new ethers.Contract(
        CONTRACTS.veryStake.address,
        VERY_STAKE_ABI,
        provider
      );

      const [stakedAmount, canTip] = await contract.getStakeInfo(userAddress);
      const minStakeRequired = await contract.minStakeRequired();

      const stakedFormatted = ethers.formatEther(stakedAmount);
      const minStakeFormatted = ethers.formatEther(minStakeRequired);
      const needsMoreStake = !canTip;
      
      // Calculate progress percentage
      const stakedNum = Number(stakedFormatted);
      const minStakeNum = Number(minStakeFormatted);
      const stakeProgress = minStakeNum > 0 
        ? Math.min(100, (stakedNum / minStakeNum) * 100)
        : 0;

      return {
        stakedAmount: stakedAmount.toString(),
        stakedFormatted,
        canTip,
        minStakeRequired: minStakeRequired.toString(),
        minStakeFormatted,
        needsMoreStake,
        stakeProgress
      };
    } catch (err: any) {
      console.error('Failed to fetch stake data:', err);
      throw new Error(err.message || 'Failed to fetch stake data');
    }
  }, [provider]);

  const refreshStake = useCallback(async () => {
    if (!isConnected || !address) {
      setStakeData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getStakeFor(address);
      setStakeData(data);
    } catch (err: any) {
      console.error('Failed to refresh stake:', err);
      setError(err.message || 'Failed to refresh stake');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, getStakeFor]);

  const stake = useCallback(async (amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    if (!signer || !address) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      // First, approve the stake contract to spend tokens
      const veryTokenContract = new ethers.Contract(
        CONTRACTS.veryToken.address,
        VERY_TOKEN_ABI,
        signer
      );

      const stakeContract = new ethers.Contract(
        CONTRACTS.veryStake.address,
        VERY_STAKE_ABI,
        signer
      );

      const amountWei = ethers.parseEther(amount.toString());
      
      // Check current allowance
      const allowance = await veryTokenContract.allowance(address, CONTRACTS.veryStake.address);
      if (allowance < amountWei) {
        // Approve max amount for convenience
        const approveTx = await veryTokenContract.approve(CONTRACTS.veryStake.address, ethers.MaxUint256);
        await approveTx.wait();
      }

      // Stake tokens
      const tx = await stakeContract.stake(amountWei);
      const receipt = await tx.wait();

      // Refresh stake data
      await refreshStake();

      return { success: true, txHash: receipt.hash };
    } catch (err: any) {
      console.error('Failed to stake:', err);
      return { success: false, error: err.message || 'Failed to stake tokens' };
    }
  }, [signer, address, refreshStake]);

  const unstake = useCallback(async (amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    if (!signer) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const stakeContract = new ethers.Contract(
        CONTRACTS.veryStake.address,
        VERY_STAKE_ABI,
        signer
      );

      const amountWei = ethers.parseEther(amount.toString());
      const tx = await stakeContract.unstake(amountWei);
      const receipt = await tx.wait();

      // Refresh stake data
      await refreshStake();

      return { success: true, txHash: receipt.hash };
    } catch (err: any) {
      console.error('Failed to unstake:', err);
      return { success: false, error: err.message || 'Failed to unstake tokens' };
    }
  }, [signer, refreshStake]);

  useEffect(() => {
    refreshStake();
  }, [refreshStake]);

  return {
    stakeData,
    isLoading,
    error,
    refreshStake,
    stake,
    unstake,
    getStakeFor
  };
}
