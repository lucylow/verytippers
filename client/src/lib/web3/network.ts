/**
 * Network Auto-Switch and Health Check
 * Ensures user is on VERY Chain before transactions
 */

import { VERY_CHAIN } from './config';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
    };
  }
}

export interface NetworkStatus {
  isConnected: boolean;
  isCorrectNetwork: boolean;
  chainId: number | null;
  chainName: string | null;
  rpcUrl: string | null;
  isHealthy: boolean;
}

/**
 * Ensures the user's wallet is connected to VERY Chain
 * Automatically switches or adds the network if needed
 */
export async function ensureVeryNetwork(): Promise<boolean> {
  if (!window.ethereum) {
    throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
  }

  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const expectedChainId = `0x${VERY_CHAIN.chainId.toString(16)}`;

    if (chainId === expectedChainId) {
      return true;
    }

    // Try to switch network
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: expectedChainId }]
      });
      return true;
    } catch (switchError: any) {
      // Chain not added, try to add it
      if (switchError.code === 4902 || switchError.code === -32603) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: expectedChainId,
                chainName: VERY_CHAIN.chainName,
                rpcUrls: VERY_CHAIN.rpcUrls,
                blockExplorerUrls: VERY_CHAIN.blockExplorerUrls,
                nativeCurrency: VERY_CHAIN.nativeCurrency
              }
            ]
          });
          return true;
        } catch (addError) {
          console.error('Failed to add Very Chain:', addError);
          throw new Error('Failed to add Very Chain to wallet. Please add it manually.');
        }
      }
      throw switchError;
    }
  } catch (error: any) {
    console.error('Network switch error:', error);
    throw new Error(`Failed to switch to Very Chain: ${error.message}`);
  }
}

/**
 * Gets the current network status
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  if (!window.ethereum) {
    return {
      isConnected: false,
      isCorrectNetwork: false,
      chainId: null,
      chainName: null,
      rpcUrl: null,
      isHealthy: false
    };
  }

  try {
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    const isCorrectNetwork = chainId === VERY_CHAIN.chainId;

    // Health check - try to fetch block number
    let isHealthy = false;
    try {
      const provider = new (await import('ethers')).BrowserProvider(window.ethereum);
      await provider.getBlockNumber();
      isHealthy = true;
    } catch {
      isHealthy = false;
    }

    return {
      isConnected: true,
      isCorrectNetwork,
      chainId,
      chainName: isCorrectNetwork ? VERY_CHAIN.chainName : `Unknown (${chainId})`,
      rpcUrl: isCorrectNetwork ? VERY_CHAIN.rpcUrls[0] : null,
      isHealthy
    };
  } catch (error) {
    console.error('Failed to get network status:', error);
    return {
      isConnected: false,
      isCorrectNetwork: false,
      chainId: null,
      chainName: null,
      rpcUrl: null,
      isHealthy: false
    };
  }
}

/**
 * Listens for network changes
 */
export function onNetworkChange(callback: (chainId: number) => void): () => void {
  if (!window.ethereum) {
    return () => {};
  }

  const handleChainChanged = (chainIdHex: string) => {
    const chainId = parseInt(chainIdHex, 16);
    callback(chainId);
  };

  window.ethereum.on('chainChanged', handleChainChanged);

  // Return cleanup function
  return () => {
    if (window.ethereum) {
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
  };
}

/**
 * Checks if RPC endpoint is healthy
 */
export async function checkRpcHealth(rpcUrl: string): Promise<boolean> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });

    const data = await response.json();
    return data.result !== undefined;
  } catch {
    return false;
  }
}

