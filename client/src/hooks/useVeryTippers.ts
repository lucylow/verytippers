// src/hooks/useVeryTippers.ts
// Custom hook for VERY Chain wallet management with full error handling

import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { VERY_CHAIN_CONFIG } from '@/config/chains';

export interface VeryTippersProvider {
  isConnected: boolean;
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connectWallet: (wallet: 'wepin' | 'metamask') => Promise<string[] | null>;
  disconnectWallet: () => Promise<void>;
  switchToVeryChain: () => Promise<void>;
}

export const useVeryTippers = (): VeryTippersProvider => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  // Connect wallet function
  const connectWallet = useCallback(async (wallet: 'wepin' | 'metamask'): Promise<string[] | null> => {
    try {
      let accounts: string[] = [];
      
      if (wallet === 'wepin') {
        // Wepin SDK integration
        if (typeof window !== 'undefined' && (window as any).Wepin) {
          accounts = await (window as any).Wepin.requestAccounts();
        } else {
          throw new Error('Wepin not installed. Please install Wepin extension.');
        }
      } else {
        // MetaMask / EIP-1193 compatible
        if (!window.ethereum) {
          throw new Error('No wallet found. Please install MetaMask or Wepin.');
        }
        accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        }) as string[];
      }

      if (!accounts?.length) {
        throw new Error('No accounts available');
      }

      // Create provider (ethers v6 uses BrowserProvider)
      if (!window.ethereum) {
        throw new Error('Ethereum provider not found');
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signerInstance = await browserProvider.getSigner();
      
      setProvider(browserProvider);
      setSigner(signerInstance);
      setAddress(accounts[0]);
      setIsConnected(true);

      return accounts;
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  }, []);

  // Switch to VERY Chain
  const switchToVeryChain = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: VERY_CHAIN_CONFIG.chainId }]
      });
    } catch (switchError: any) {
      // Chain not added
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [VERY_CHAIN_CONFIG]
          });
        } catch (addError) {
          console.error('Failed to add VERY Chain:', addError);
          toast.error('Network Setup Failed: Please manually add VERY Chain or switch networks');
        }
      }
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }]
        });
      }
      setIsConnected(false);
      setAddress(null);
      setProvider(null);
      setSigner(null);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setIsConnected(false);
        setAddress(null);
      } else {
        setAddress(accounts[0]);
        setIsConnected(true);
        // Update provider/signer when account changes
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        browserProvider.getSigner().then((signerInstance) => {
          setProvider(browserProvider);
          setSigner(signerInstance);
        });
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  return {
    isConnected,
    address,
    provider,
    signer,
    connectWallet,
    disconnectWallet,
    switchToVeryChain
  };
};

