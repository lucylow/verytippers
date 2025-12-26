/**
 * React Hook for Wepin Wallet Integration
 * 
 * Usage:
 * ```tsx
 * const { connect, disconnect, account, isConnected, wallet } = useWepin();
 * ```
 */

import { useState, useCallback, useMemo } from 'react';
import { WepinWallet, WepinAccount } from '../lib/wepin/wepin';

export function useWepin() {
  const [account, setAccount] = useState<WepinAccount | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wallet = useMemo(() => new WepinWallet(), []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const appId = import.meta.env.VITE_WEPIN_APP_ID;
      const appKey = import.meta.env.VITE_WEPIN_APP_KEY;
      
      if (!appId || !appKey) {
        throw new Error(
          'Wepin App ID and App Key must be set in environment variables.\n' +
          'Set VITE_WEPIN_APP_ID and VITE_WEPIN_APP_KEY in your .env file.'
        );
      }

      await wallet.initialize(appId, appKey);
      const acc = await wallet.connect();
      setAccount(acc);
      setIsConnected(true);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect Wepin wallet';
      setError(errorMessage);
      console.error('Failed to connect Wepin:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [wallet]);

  const disconnect = useCallback(async () => {
    try {
      await wallet.disconnect();
      setAccount(null);
      setIsConnected(false);
      setError(null);
    } catch (err) {
      console.error('Failed to disconnect Wepin:', err);
      setError('Failed to disconnect wallet');
    }
  }, [wallet]);

  const signTransaction = useCallback(async (transaction: any) => {
    if (!isConnected || !account) {
      throw new Error('Wallet not connected');
    }
    
    try {
      return await wallet.signTransaction(transaction);
    } catch (err) {
      console.error('Failed to sign transaction:', err);
      throw err;
    }
  }, [wallet, isConnected, account]);

  const getProvider = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      return await wallet.getProvider();
    } catch (err) {
      console.error('Failed to get provider:', err);
      throw err;
    }
  }, [wallet, isConnected]);

  return {
    connect,
    disconnect,
    signTransaction,
    getProvider,
    account,
    isConnected,
    isConnecting,
    error,
    wallet
  };
}

