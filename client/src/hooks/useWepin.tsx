/**
 * React Hook for Wepin Wallet Integration
 * 
 * Usage:
 * ```tsx
 * const { 
 *   connect, 
 *   disconnect, 
 *   account, 
 *   isConnected, 
 *   isConnecting,
 *   error,
 *   signTransaction,
 *   signMessage,
 *   getProvider,
 *   openWidget,
 *   closeWidget,
 *   wallet 
 * } = useWepin();
 * ```
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { WepinWallet, WepinAccount, WepinConnectOptions } from '../lib/wepin/wepin';
import type { WepinLifeCycle } from '@wepin/sdk-js';

export interface UseWepinOptions {
  autoConnect?: boolean;
  onAccountChanged?: (account: WepinAccount | null) => void;
  onError?: (error: Error) => void;
}

export function useWepin(options?: UseWepinOptions) {
  const [account, setAccount] = useState<WepinAccount | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<WepinLifeCycle>('not_initialized');

  const wallet = useMemo(() => new WepinWallet(), []);

  // Initialize wallet on mount if credentials are available
  useEffect(() => {
    const initializeWallet = async () => {
      const appId = import.meta.env.VITE_WEPIN_APP_ID;
      const appKey = import.meta.env.VITE_WEPIN_APP_KEY;

      if (!appId || !appKey) {
        return; // Credentials not set, skip initialization
      }

      try {
        setIsInitializing(true);
        setError(null);
        
        await wallet.initialize({
          appId,
          appKey,
          attributes: {
            defaultLanguage: 'en',
            defaultCurrency: 'USD',
          },
        });

        // Check current status
        const currentStatus = await wallet.getStatus();
        setStatus(currentStatus);

        // Auto-connect if enabled and user is logged in
        if (options?.autoConnect && (currentStatus === 'login' || currentStatus === 'login_before_register')) {
          try {
            const acc = await wallet.connect();
            setAccount(acc);
            setIsConnected(true);
          } catch (err) {
            // Auto-connect failed, but initialization succeeded
            console.warn('Auto-connect failed:', err);
          }
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to initialize Wepin wallet';
        setError(errorMessage);
        if (options?.onError) {
          options.onError(err);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initializeWallet();

    // Cleanup on unmount
    return () => {
      wallet.finalize().catch(console.error);
    };
  }, []); // Only run once on mount

  // Set up event listeners
  useEffect(() => {
    const handleAccountChanged = (newAccount: WepinAccount | null) => {
      setAccount(newAccount);
      setIsConnected(!!newAccount);
      if (options?.onAccountChanged) {
        options.onAccountChanged(newAccount);
      }
    };

    const handleError = (err: Error) => {
      setError(err.message);
      if (options?.onError) {
        options.onError(err);
      }
    };

    const handleLifecycleChanged = async (lifecycle: WepinLifeCycle) => {
      setStatus(lifecycle);
      if (lifecycle === 'login') {
        // Try to get account if logged in
        try {
          const acc = wallet.getAccount();
          if (acc) {
            handleAccountChanged(acc);
          }
        } catch (err) {
          // Ignore errors when getting account
        }
      } else if (lifecycle === 'before_login' || lifecycle === 'not_initialized') {
        handleAccountChanged(null);
        setIsConnected(false);
      }
    };

    wallet.on('accountChanged', handleAccountChanged);
    wallet.on('error', handleError);
    wallet.on('lifecycleChanged', handleLifecycleChanged);

    return () => {
      wallet.off('accountChanged', handleAccountChanged);
      wallet.off('error', handleError);
      wallet.off('lifecycleChanged', handleLifecycleChanged);
    };
  }, [wallet, options]);

  const connect = useCallback(async (connectOptions?: WepinConnectOptions) => {
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

      // Check if wallet is initialized, if not initialize it
      const initialStatus = await wallet.getStatus().catch(() => 'not_initialized' as WepinLifeCycle);
      if (initialStatus === 'not_initialized') {
        await wallet.initialize({
          appId,
          appKey,
          attributes: {
            defaultLanguage: 'en',
            defaultCurrency: 'USD',
          },
        });
      }

      const acc = await wallet.connect(connectOptions);
      setAccount(acc);
      setIsConnected(true);
      const newStatus = await wallet.getStatus();
      setStatus(newStatus);
      return acc;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect Wepin wallet';
      setError(errorMessage);
      if (options?.onError) {
        options.onError(err);
      }
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [wallet, options]);

  const disconnect = useCallback(async () => {
    try {
      await wallet.disconnect();
      setAccount(null);
      setIsConnected(false);
      setError(null);
      setStatus('before_login');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to disconnect wallet';
      setError(errorMessage);
      if (options?.onError) {
        options.onError(err);
      }
      throw err;
    }
  }, [wallet, options]);

  const signTransaction = useCallback(async (transaction: {
    to?: string;
    value?: string;
    data?: string;
    gas?: string;
    gasPrice?: string;
  }) => {
    if (!isConnected || !account) {
      throw new Error('Wallet not connected');
    }
    
    try {
      setError(null);
      return await wallet.signTransaction(transaction);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign transaction';
      setError(errorMessage);
      if (options?.onError) {
        options.onError(err);
      }
      throw err;
    }
  }, [wallet, isConnected, account, options]);

  const signMessage = useCallback(async (message: string) => {
    if (!isConnected || !account) {
      throw new Error('Wallet not connected');
    }
    
    try {
      setError(null);
      return await wallet.signMessage(message);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign message';
      setError(errorMessage);
      if (options?.onError) {
        options.onError(err);
      }
      throw err;
    }
  }, [wallet, isConnected, account, options]);

  const getProvider = useCallback(async (network?: string) => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      setError(null);
      return await wallet.getProvider(network);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get provider';
      setError(errorMessage);
      if (options?.onError) {
        options.onError(err);
      }
      throw err;
    }
  }, [wallet, isConnected, options]);

  const openWidget = useCallback(async () => {
    try {
      setError(null);
      await wallet.openWidget();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to open widget';
      setError(errorMessage);
      if (options?.onError) {
        options.onError(err);
      }
      throw err;
    }
  }, [wallet, options]);

  const closeWidget = useCallback(() => {
    try {
      wallet.closeWidget();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to close widget';
      setError(errorMessage);
      if (options?.onError) {
        options.onError(err);
      }
    }
  }, [wallet, options]);

  return {
    connect,
    disconnect,
    signTransaction,
    signMessage,
    getProvider,
    openWidget,
    closeWidget,
    account,
    isConnected,
    isConnecting,
    isInitializing,
    error,
    status,
    wallet,
  };
}

