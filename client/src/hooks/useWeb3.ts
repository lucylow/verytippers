/**
 * React Hook for Web3 Operations
 * Provides easy access to all Web3 functionality
 */

import { useState, useEffect, useCallback } from 'react';
import {
  sendVeryTip,
  getVeryBalance,
  getNativeBalance,
  getNetworkStatus,
  ensureVeryNetwork,
  onNetworkChange,
  getSignerAddress,
  getGasBudget,
  subscribeTips,
  subscribeBadges,
  fetchPastTips,
  type TokenBalance,
  type TipEvent,
  type BadgeEvent,
  type SendTipResult
} from '@/lib/web3';

export interface Web3State {
  isConnected: boolean;
  address: string | null;
  isCorrectNetwork: boolean;
  networkName: string | null;
  veryBalance: TokenBalance | null;
  nativeBalance: number | null;
  gasBudget: ReturnType<typeof getGasBudget>;
  isLoading: boolean;
  error: string | null;
}

export function useWeb3() {
  const [state, setState] = useState<Web3State>({
    isConnected: false,
    address: null,
    isCorrectNetwork: false,
    networkName: null,
    veryBalance: null,
    nativeBalance: null,
    gasBudget: getGasBudget(),
    isLoading: true,
    error: null
  });

  const [tipEvents, setTipEvents] = useState<TipEvent[]>([]);
  const [badgeEvents, setBadgeEvents] = useState<BadgeEvent[]>([]);

  // Initialize Web3 connection
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Check if wallet is available
        if (!window.ethereum) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'No wallet detected'
          }));
          return;
        }

        // Get network status
        const networkStatus = await getNetworkStatus();
        if (!mounted) return;

        if (networkStatus.isConnected) {
          // Get signer address
          const address = await getSignerAddress();
          if (!mounted) return;

          // Fetch balances
          const [veryBalance, nativeBalance] = await Promise.all([
            getVeryBalance(address),
            getNativeBalance(address)
          ]);

          if (!mounted) return;

          setState((prev) => ({
            ...prev,
            isConnected: true,
            address,
            isCorrectNetwork: networkStatus.isCorrectNetwork,
            networkName: networkStatus.chainName,
            veryBalance,
            nativeBalance,
            isLoading: false,
            error: null
          }));
        } else {
          setState((prev) => ({
            ...prev,
            isLoading: false
          }));
        }
      } catch (error: any) {
        if (mounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error.message || 'Failed to initialize Web3'
          }));
        }
      }
    }

    init();

    // Listen for network changes
    const cleanup = onNetworkChange(async (chainId) => {
      const networkStatus = await getNetworkStatus();
      setState((prev) => ({
        ...prev,
        isCorrectNetwork: networkStatus.isCorrectNetwork,
        networkName: networkStatus.chainName
      }));
    });

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  // Subscribe to tip events
  useEffect(() => {
    if (!state.address) return;

    const cleanup = subscribeTips((event) => {
      setTipEvents((prev) => [event, ...prev.slice(0, 49)]); // Keep last 50
    }, state.address);

    return cleanup;
  }, [state.address]);

  // Subscribe to badge events
  useEffect(() => {
    if (!state.address) return;

    const cleanup = subscribeBadges((event) => {
      setBadgeEvents((prev) => [event, ...prev.slice(0, 49)]);
    }, state.address);

    return cleanup;
  }, [state.address]);

  // Update gas budget periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => ({
        ...prev,
        gasBudget: getGasBudget()
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Connect wallet
  const connect = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (!window.ethereum) {
        throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Ensure correct network
      await ensureVeryNetwork();

      // Get address
      const address = await getSignerAddress();

      // Fetch balances
      const [veryBalance, nativeBalance, networkStatus] = await Promise.all([
        getVeryBalance(address),
        getNativeBalance(address),
        getNetworkStatus()
      ]);

      setState((prev) => ({
        ...prev,
        isConnected: true,
        address,
        isCorrectNetwork: networkStatus.isCorrectNetwork,
        networkName: networkStatus.chainName,
        veryBalance,
        nativeBalance,
        isLoading: false,
        error: null
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to connect wallet'
      }));
      throw error;
    }
  }, []);

  // Send tip
  const sendTip = useCallback(
    async (
      to: string,
      amount: number,
      cid: string,
      options?: { useGasSponsorship?: boolean }
    ): Promise<SendTipResult> => {
      if (!state.address) {
        throw new Error('Wallet not connected');
      }

      const result = await sendVeryTip({
        from: state.address,
        to,
        amount,
        cid,
        options
      });

      // Update gas budget if sponsored
      if (result.sponsored) {
        setState((prev) => ({
          ...prev,
          gasBudget: getGasBudget()
        }));
      }

      // Refresh balances
      if (result.success && state.address) {
        const [veryBalance, nativeBalance] = await Promise.all([
          getVeryBalance(state.address),
          getNativeBalance(state.address)
        ]);

        setState((prev) => ({
          ...prev,
          veryBalance,
          nativeBalance
        }));
      }

      return result;
    },
    [state.address]
  );

  // Refresh balances
  const refreshBalances = useCallback(async () => {
    if (!state.address) return;

    try {
      const [veryBalance, nativeBalance] = await Promise.all([
        getVeryBalance(state.address),
        getNativeBalance(state.address)
      ]);

      setState((prev) => ({
        ...prev,
        veryBalance,
        nativeBalance
      }));
    } catch (error) {
      console.error('Failed to refresh balances:', error);
    }
  }, [state.address]);

  // Switch network
  const switchNetwork = useCallback(async () => {
    try {
      await ensureVeryNetwork();
      const networkStatus = await getNetworkStatus();
      setState((prev) => ({
        ...prev,
        isCorrectNetwork: networkStatus.isCorrectNetwork,
        networkName: networkStatus.chainName
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to switch network'
      }));
      throw error;
    }
  }, []);

  // Fetch past tips
  const loadPastTips = useCallback(async (limit: number = 20) => {
    try {
      const tips = await fetchPastTips(0, 'latest', state.address || undefined);
      setTipEvents(tips.slice(0, limit));
    } catch (error) {
      console.error('Failed to load past tips:', error);
    }
  }, [state.address]);

  return {
    ...state,
    tipEvents,
    badgeEvents,
    connect,
    sendTip,
    refreshBalances,
    switchNetwork,
    loadPastTips
  };
}

