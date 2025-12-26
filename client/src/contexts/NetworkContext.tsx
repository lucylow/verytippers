import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { VERY_TESTNET, VERY_MAINNET } from '@/lib/web3/config';

export type NetworkType = 'testnet' | 'mainnet';

export interface NetworkConfig {
  chainId: number;
  chainName: string;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface NetworkContextType {
  networkType: NetworkType;
  networkConfig: NetworkConfig;
  setNetworkType: (type: NetworkType) => void;
  switchToNetwork: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

interface NetworkProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'verytippers_network_type';

export function NetworkProvider({ children }: NetworkProviderProps) {
  // Default to testnet
  const [networkType, setNetworkTypeState] = useState<NetworkType>(() => {
    // Try to load from localStorage, default to testnet
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as NetworkType | null;
      if (saved === 'testnet' || saved === 'mainnet') {
        return saved;
      }
    }
    return 'testnet';
  });

  // Save to localStorage when network changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, networkType);
    }
  }, [networkType]);

  const setNetworkType = useCallback((type: NetworkType) => {
    setNetworkTypeState(type);
  }, []);

  const networkConfig: NetworkConfig = networkType === 'testnet' ? VERY_TESTNET : VERY_MAINNET;

  const switchToNetwork = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
    }

    try {
      const expectedChainId = `0x${networkConfig.chainId.toString(16)}`;
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });

      if (currentChainId === expectedChainId) {
        return;
      }

      // Try to switch network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: expectedChainId }]
        });
      } catch (switchError: any) {
        // Chain not added, try to add it
        if (switchError.code === 4902 || switchError.code === -32603) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: expectedChainId,
                  chainName: networkConfig.chainName,
                  rpcUrls: networkConfig.rpcUrls,
                  blockExplorerUrls: networkConfig.blockExplorerUrls,
                  nativeCurrency: networkConfig.nativeCurrency
                }
              ]
            });
          } catch (addError) {
            console.error('Failed to add network:', addError);
            throw new Error(`Failed to add ${networkConfig.chainName} to wallet. Please add it manually.`);
          }
        } else {
          throw switchError;
        }
      }
    } catch (error: any) {
      console.error('Network switch error:', error);
      throw new Error(`Failed to switch to ${networkConfig.chainName}: ${error.message}`);
    }
  }, [networkConfig]);

  const value: NetworkContextType = {
    networkType,
    networkConfig,
    setNetworkType,
    switchToNetwork
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
}

