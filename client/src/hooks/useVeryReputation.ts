import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { CONTRACTS } from '@/lib/web3/config';

const VERY_REPUTATION_ABI = [
  'function lifetimeTipped(address) view returns (uint256)',
  'function lifetimeReceived(address) view returns (uint256)',
  'function tipMultiplier(address) view returns (uint256)',
  'function getReputation(address) view returns (uint256 tipped, uint256 received, uint256 multiplier)',
  'event ReputationUpdated(address indexed user, uint256 tipped, uint256 received)'
];

export interface ReputationData {
  tipped: string;
  received: string;
  multiplier: number; // basis points (100 = 1x, 120 = 1.2x, 150 = 1.5x)
  tippedFormatted: string;
  receivedFormatted: string;
  multiplierFormatted: string; // e.g., "1.5x"
}

export interface UseVeryReputationReturn {
  reputation: ReputationData | null;
  isLoading: boolean;
  error: string | null;
  refreshReputation: () => Promise<void>;
  getReputationFor: (address: string) => Promise<ReputationData>;
}

export function useVeryReputation(): UseVeryReputationReturn {
  const { isConnected, address, provider } = useWallet();
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getReputationFor = useCallback(async (userAddress: string): Promise<ReputationData> => {
    if (!provider || !ethers.isAddress(userAddress)) {
      throw new Error('Invalid address or provider');
    }

    try {
      const contract = new ethers.Contract(
        CONTRACTS.veryReputation.address,
        VERY_REPUTATION_ABI,
        provider
      );

      const [tipped, received, multiplier] = await contract.getReputation(userAddress);

      const tippedFormatted = ethers.formatEther(tipped);
      const receivedFormatted = ethers.formatEther(received);
      const multiplierNum = Number(multiplier);
      const multiplierFormatted = `${(multiplierNum / 100).toFixed(1)}x`;

      return {
        tipped: tipped.toString(),
        received: received.toString(),
        multiplier: multiplierNum,
        tippedFormatted,
        receivedFormatted,
        multiplierFormatted
      };
    } catch (err: any) {
      console.error('Failed to fetch reputation:', err);
      throw new Error(err.message || 'Failed to fetch reputation');
    }
  }, [provider]);

  const refreshReputation = useCallback(async () => {
    if (!isConnected || !address) {
      setReputation(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getReputationFor(address);
      setReputation(data);
    } catch (err: any) {
      console.error('Failed to refresh reputation:', err);
      setError(err.message || 'Failed to refresh reputation');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, getReputationFor]);

  useEffect(() => {
    refreshReputation();
  }, [refreshReputation]);

  return {
    reputation,
    isLoading,
    error,
    refreshReputation,
    getReputationFor
  };
}
