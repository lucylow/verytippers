import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { CONTRACTS } from '@/lib/web3/config';

const VERY_GOVERNOR_ABI = [
  'function votingPower(address) view returns (uint256)',
  'function getVotingPowerBreakdown(address) view returns (uint256 tokenPower, uint256 repPower, uint256 nftPower, uint256 totalPower)'
];

export interface VotingPowerData {
  totalPower: string;
  totalPowerFormatted: string;
  tokenPower: string;
  tokenPowerFormatted: string;
  repPower: string;
  repPowerFormatted: string;
  nftPower: string;
  nftPowerFormatted: string;
  breakdown: {
    tokenPercentage: number;
    repPercentage: number;
    nftPercentage: number;
  };
}

export interface UseVeryGovernorReturn {
  votingPower: VotingPowerData | null;
  isLoading: boolean;
  error: string | null;
  refreshVotingPower: () => Promise<void>;
  getVotingPowerFor: (address: string) => Promise<VotingPowerData>;
}

export function useVeryGovernor(): UseVeryGovernorReturn {
  const { isConnected, address, provider } = useWallet();
  const [votingPower, setVotingPower] = useState<VotingPowerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getVotingPowerFor = useCallback(async (userAddress: string): Promise<VotingPowerData> => {
    if (!provider || !ethers.isAddress(userAddress)) {
      throw new Error('Invalid address or provider');
    }

    try {
      const contract = new ethers.Contract(
        CONTRACTS.veryGovernor.address,
        VERY_GOVERNOR_ABI,
        provider
      );

      const [tokenPower, repPower, nftPower, totalPower] = await contract.getVotingPowerBreakdown(userAddress);

      const tokenPowerFormatted = ethers.formatEther(tokenPower);
      const repPowerFormatted = ethers.formatEther(repPower);
      const nftPowerFormatted = ethers.formatEther(nftPower);
      const totalPowerFormatted = ethers.formatEther(totalPower);

      const totalNum = Number(totalPowerFormatted);
      const tokenNum = Number(tokenPowerFormatted);
      const repNum = Number(repPowerFormatted);
      const nftNum = Number(nftPowerFormatted);

      // Calculate percentages
      const tokenPercentage = totalNum > 0 ? (tokenNum / totalNum) * 100 : 0;
      const repPercentage = totalNum > 0 ? (repNum / totalNum) * 100 : 0;
      const nftPercentage = totalNum > 0 ? (nftNum / totalNum) * 100 : 0;

      return {
        totalPower: totalPower.toString(),
        totalPowerFormatted,
        tokenPower: tokenPower.toString(),
        tokenPowerFormatted,
        repPower: repPower.toString(),
        repPowerFormatted,
        nftPower: nftPower.toString(),
        nftPowerFormatted,
        breakdown: {
          tokenPercentage,
          repPercentage,
          nftPercentage
        }
      };
    } catch (err: any) {
      console.error('Failed to fetch voting power:', err);
      throw new Error(err.message || 'Failed to fetch voting power');
    }
  }, [provider]);

  const refreshVotingPower = useCallback(async () => {
    if (!isConnected || !address) {
      setVotingPower(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getVotingPowerFor(address);
      setVotingPower(data);
    } catch (err: any) {
      console.error('Failed to refresh voting power:', err);
      setError(err.message || 'Failed to refresh voting power');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, getVotingPowerFor]);

  useEffect(() => {
    refreshVotingPower();
  }, [refreshVotingPower]);

  return {
    votingPower,
    isLoading,
    error,
    refreshVotingPower,
    getVotingPowerFor
  };
}
