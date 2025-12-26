/**
 * React Hook for VERY Token Operations
 * Provides easy access to VERY token ERC-20 functions
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import {
  getVeryTokenInfo,
  transferVeryTokens,
  approveVeryTokens,
  getVeryTokenAllowance,
  hasEnoughAllowance,
  transferFromVeryTokens,
  type TokenInfo,
  type TransferResult,
  type ApproveResult
} from '@/lib/web3/veryToken';
import { getVeryBalance, type TokenBalance } from '@/lib/web3/balance';

export interface UseVeryTokenReturn {
  // Token info
  tokenInfo: TokenInfo | null;
  isLoading: boolean;
  error: string | null;

  // Balance
  balance: TokenBalance | null;
  refreshBalance: () => Promise<void>;

  // Operations
  transfer: (to: string, amount: number) => Promise<TransferResult>;
  approve: (spender: string, amount: number | 'max') => Promise<ApproveResult>;
  getAllowance: (spender: string) => Promise<{ allowance: string; rawAllowance: bigint }>;
  checkAllowance: (spender: string, requiredAmount: number) => Promise<boolean>;
  transferFrom: (from: string, to: string, amount: number) => Promise<TransferResult>;
}

/**
 * Hook for VERY token operations
 */
export function useVeryToken(): UseVeryTokenReturn {
  const { isConnected, address, signer } = useWallet();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load token info on mount
  useEffect(() => {
    async function loadTokenInfo() {
      try {
        setIsLoading(true);
        const info = await getVeryTokenInfo();
        setTokenInfo(info);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load token info:', err);
        setError(err.message || 'Failed to load token info');
      } finally {
        setIsLoading(false);
      }
    }

    loadTokenInfo();
  }, []);

  // Load balance when connected
  useEffect(() => {
    async function loadBalance() {
      if (!isConnected || !address) {
        setBalance(null);
        return;
      }

      try {
        const tokenBalance = await getVeryBalance(address);
        setBalance(tokenBalance);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load balance:', err);
        setError(err.message || 'Failed to load balance');
      }
    }

    loadBalance();
  }, [isConnected, address]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!isConnected || !address) {
      setBalance(null);
      return;
    }

    try {
      const tokenBalance = await getVeryBalance(address);
      setBalance(tokenBalance);
      setError(null);
    } catch (err: any) {
      console.error('Failed to refresh balance:', err);
      setError(err.message || 'Failed to refresh balance');
    }
  }, [isConnected, address]);

  // Transfer tokens
  const transfer = useCallback(
    async (to: string, amount: number): Promise<TransferResult> => {
      if (!isConnected || !signer) {
        return {
          success: false,
          error: 'Wallet not connected'
        };
      }

      try {
        setError(null);
        const result = await transferVeryTokens(to, amount, signer);
        
        // Refresh balance on success
        if (result.success) {
          await refreshBalance();
        } else {
          setError(result.error || 'Transfer failed');
        }

        return result;
      } catch (err: any) {
        const errorMsg = err.message || 'Transfer failed';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    },
    [isConnected, signer, refreshBalance]
  );

  // Approve tokens
  const approve = useCallback(
    async (spender: string, amount: number | 'max'): Promise<ApproveResult> => {
      if (!isConnected || !signer) {
        return {
          success: false,
          error: 'Wallet not connected'
        };
      }

      try {
        setError(null);
        const result = await approveVeryTokens(spender, amount, signer);
        
        if (!result.success) {
          setError(result.error || 'Approve failed');
        }

        return result;
      } catch (err: any) {
        const errorMsg = err.message || 'Approve failed';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    },
    [isConnected, signer]
  );

  // Get allowance
  const getAllowance = useCallback(
    async (spender: string) => {
      if (!isConnected || !address) {
        return {
          allowance: '0',
          rawAllowance: 0n
        };
      }

      try {
        return await getVeryTokenAllowance(address, spender);
      } catch (err: any) {
        console.error('Failed to get allowance:', err);
        return {
          allowance: '0',
          rawAllowance: 0n
        };
      }
    },
    [isConnected, address]
  );

  // Check allowance
  const checkAllowance = useCallback(
    async (spender: string, requiredAmount: number): Promise<boolean> => {
      if (!isConnected || !address) {
        return false;
      }

      try {
        return await hasEnoughAllowance(address, spender, requiredAmount);
      } catch (err) {
        console.error('Failed to check allowance:', err);
        return false;
      }
    },
    [isConnected, address]
  );

  // Transfer from (requires approval)
  const transferFrom = useCallback(
    async (from: string, to: string, amount: number): Promise<TransferResult> => {
      if (!isConnected || !signer) {
        return {
          success: false,
          error: 'Wallet not connected'
        };
      }

      try {
        setError(null);
        const result = await transferFromVeryTokens(from, to, amount, signer);
        
        // Refresh balance on success
        if (result.success) {
          await refreshBalance();
        } else {
          setError(result.error || 'TransferFrom failed');
        }

        return result;
      } catch (err: any) {
        const errorMsg = err.message || 'TransferFrom failed';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    },
    [isConnected, signer, refreshBalance]
  );

  return {
    tokenInfo,
    isLoading,
    error,
    balance,
    refreshBalance,
    transfer,
    approve,
    getAllowance,
    checkAllowance,
    transferFrom
  };
}

