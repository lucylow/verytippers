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
} from '@/lib/web3/index';

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

        // Get network status with timeout
        let networkStatus;
        try {
          networkStatus = await Promise.race([
            getNetworkStatus(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Network status check timed out')), 10000)
            )
          ]);
        } catch (error: unknown) {
          if (!mounted) return;
          
          const errorMessage = error instanceof Error
            ? error.message
            : 'Failed to check network status';
          
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: errorMessage
          }));
          return;
        }
        
        if (!mounted) return;

        if (networkStatus.isConnected) {
          // Get signer address with error handling
          let address: string;
          try {
            address = await Promise.race([
              getSignerAddress(),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Failed to get wallet address')), 5000)
              )
            ]);
          } catch (error: unknown) {
            if (!mounted) return;
            
            const errorMessage = error instanceof Error
              ? error.message
              : 'Failed to get wallet address';
            
            setState((prev) => ({
              ...prev,
              isLoading: false,
              error: errorMessage
            }));
            return;
          }
          
          if (!mounted) return;

          // Fetch balances with error handling
          let veryBalance, nativeBalance;
          try {
            const balanceResults = await Promise.allSettled([
              getVeryBalance(address),
              getNativeBalance(address)
            ]);
            veryBalance = balanceResults[0].status === 'fulfilled' ? balanceResults[0].value : null;
            nativeBalance = balanceResults[1].status === 'fulfilled' ? balanceResults[1].value : null;
          } catch (error: unknown) {
            // Log but don't fail initialization if balance fetch fails
            console.warn('Failed to fetch balances during initialization:', error);
            veryBalance = null;
            nativeBalance = null;
          }

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
      } catch (error: unknown) {
        if (mounted) {
          const errorMessage = error instanceof Error
            ? error.message
            : 'Failed to initialize Web3';
          
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: errorMessage
          }));
          
          console.error('Web3 initialization error:', error);
        }
      }
    }

    init();

    // Listen for network changes
    const cleanup = onNetworkChange(async (chainId: number) => {
      try {
        const networkStatus = await Promise.race([
          getNetworkStatus(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Network status check timed out')), 10000)
          )
        ]);
        
        setState((prev) => ({
          ...prev,
          isCorrectNetwork: networkStatus.isCorrectNetwork,
          networkName: networkStatus.chainName,
          error: null
        }));
      } catch (error: unknown) {
        console.error('Error handling network change:', error);
        // Don't set error state here as it's just a network change listener
      }
    });

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  // Subscribe to tip events
  useEffect(() => {
    if (!state.address) return;

    const cleanup = subscribeTips((event: TipEvent) => {
      setTipEvents((prev) => [event, ...prev.slice(0, 49)]); // Keep last 50
    }, state.address);

    return cleanup;
  }, [state.address]);

  // Subscribe to badge events
  useEffect(() => {
    if (!state.address) return;

    const cleanup = subscribeBadges((event: BadgeEvent) => {
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
        const error = 'No wallet detected. Please install MetaMask or another Web3 wallet.';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error
        }));
        throw new Error(error);
      }

      // Request account access with timeout
      try {
        await Promise.race([
          window.ethereum.request({ method: 'eth_requestAccounts' }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Wallet connection request timed out')), 30000)
          )
        ]);
      } catch (error: unknown) {
        if (error instanceof Error) {
          // Handle user rejection gracefully
          if (error.message.includes('reject') || error.message.includes('denied')) {
            const userError = 'Connection rejected. Please approve the connection request.';
            setState((prev) => ({
              ...prev,
              isLoading: false,
              error: userError
            }));
            throw new Error(userError);
          }
        }
        throw error;
      }

      // Ensure correct network with timeout
      try {
        await Promise.race([
          ensureVeryNetwork(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Network switch timed out')), 30000)
          )
        ]);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error
          ? error.message
          : 'Failed to switch to correct network';
        
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));
        throw error;
      }

      // Get address with timeout
      let address: string;
      try {
        address = await Promise.race([
          getSignerAddress(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Failed to get wallet address')), 10000)
          )
        ]);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error
          ? error.message
          : 'Failed to get wallet address';
        
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));
        throw error;
      }

      // Fetch balances and network status (use allSettled for graceful degradation)
      const [veryResult, nativeResult, networkResult] = await Promise.allSettled([
        getVeryBalance(address),
        getNativeBalance(address),
        getNetworkStatus()
      ]);

      const veryBalance = veryResult.status === 'fulfilled' ? veryResult.value : null;
      const nativeBalance = nativeResult.status === 'fulfilled' ? nativeResult.value : null;
      const networkStatus = networkResult.status === 'fulfilled' ? networkResult.value : null;

      // Log warnings for failed operations
      if (veryResult.status === 'rejected') {
        console.warn('Failed to fetch VERY balance during connect:', veryResult.reason);
      }
      if (nativeResult.status === 'rejected') {
        console.warn('Failed to fetch native balance during connect:', nativeResult.reason);
      }
      if (networkResult.status === 'rejected') {
        console.warn('Failed to get network status during connect:', networkResult.reason);
      }

      setState((prev) => ({
        ...prev,
        isConnected: true,
        address,
        isCorrectNetwork: networkStatus?.isCorrectNetwork ?? false,
        networkName: networkStatus?.chainName ?? null,
        veryBalance,
        nativeBalance,
        isLoading: false,
        error: null
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to connect wallet';
      
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      
      console.error('Wallet connection error:', error);
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
        const error = 'Wallet not connected';
        setState((prev) => ({ ...prev, error }));
        throw new Error(error);
      }

      // Validate inputs
      if (!to || !to.match(/^0x[a-fA-F0-9]{40}$/)) {
        const error = 'Invalid recipient address';
        setState((prev) => ({ ...prev, error }));
        throw new Error(error);
      }

      if (amount <= 0 || !isFinite(amount)) {
        const error = 'Invalid tip amount';
        setState((prev) => ({ ...prev, error }));
        throw new Error(error);
      }

      if (!cid || cid.trim().length === 0) {
        const error = 'Content ID is required';
        setState((prev) => ({ ...prev, error }));
        throw new Error(error);
      }

      try {
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

        // Refresh balances on success (with error handling)
        if (result.success && state.address) {
          try {
            const balanceResults = await Promise.allSettled([
              getVeryBalance(state.address),
              getNativeBalance(state.address)
            ]);
            const veryBalance: TokenBalance | null = balanceResults[0].status === 'fulfilled' ? balanceResults[0].value : null;
            const nativeBalance: number | null = balanceResults[1].status === 'fulfilled' ? balanceResults[1].value : null;

            setState((prev) => ({
              ...prev,
              veryBalance,
              nativeBalance,
              error: null
            }));
          } catch (balanceError) {
            // Don't fail the tip if balance refresh fails
            console.warn('Failed to refresh balances after tip:', balanceError);
          }
        } else if (!result.success) {
          // Set error state if tip failed
          setState((prev) => ({
            ...prev,
            error: result.error || 'Failed to send tip'
          }));
        }

        return result;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error
          ? error.message
          : 'Failed to send tip';
        
        setState((prev) => ({
          ...prev,
          error: errorMessage
        }));
        
        throw error;
      }
    },
    [state.address]
  );

  // Refresh balances
  const refreshBalances = useCallback(async () => {
    if (!state.address) {
      setState((prev) => ({
        ...prev,
        error: 'Wallet not connected'
      }));
      return;
    }

    try {
      // Use Promise.allSettled to handle partial failures gracefully
      const [veryResult, nativeResult] = await Promise.allSettled([
        getVeryBalance(state.address),
        getNativeBalance(state.address)
      ]);

      const veryBalance = veryResult.status === 'fulfilled' ? veryResult.value : null;
      const nativeBalance = nativeResult.status === 'fulfilled' ? nativeResult.value : null;

      // Log warnings for failed balance fetches
      if (veryResult.status === 'rejected') {
        console.warn('Failed to fetch VERY balance:', veryResult.reason);
      }
      if (nativeResult.status === 'rejected') {
        console.warn('Failed to fetch native balance:', nativeResult.reason);
      }

      setState((prev) => ({
        ...prev,
        veryBalance,
        nativeBalance,
        error: null
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to refresh balances';
      
      console.error('Failed to refresh balances:', error);
      setState((prev) => ({
        ...prev,
        error: errorMessage
      }));
    }
  }, [state.address]);

  // Switch network
  const switchNetwork = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      
      await Promise.race([
        ensureVeryNetwork(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Network switch timed out')), 30000)
        )
      ]);
      
      const networkStatus = await Promise.race([
        getNetworkStatus(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Failed to verify network status')), 10000)
        )
      ]);
      
      setState((prev) => ({
        ...prev,
        isCorrectNetwork: networkStatus.isCorrectNetwork,
        networkName: networkStatus.chainName,
        isLoading: false,
        error: null
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to switch network';
      
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      
      console.error('Network switch error:', error);
      throw error;
    }
  }, []);

  // Fetch past tips
  const loadPastTips = useCallback(async (limit: number = 20) => {
    if (!state.address) {
      console.warn('Cannot load past tips: wallet not connected');
      return;
    }

    try {
      const tips = await Promise.race([
        fetchPastTips(0, 'latest', state.address),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Failed to load past tips: timeout')), 15000)
        )
      ]);
      
      setTipEvents(tips.slice(0, limit));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to load past tips';
      
      console.error('Failed to load past tips:', error);
      setState((prev) => ({
        ...prev,
        error: errorMessage
      }));
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

