import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { useNetwork } from './NetworkContext';
import {
  transferVeryTokens,
  approveVeryTokens,
  getVeryTokenAllowance,
  hasEnoughAllowance,
  getVeryTokenInfo,
  type TransferResult,
  type ApproveResult,
  type TokenInfo
} from '@/lib/web3/veryToken';
import { getVeryBalance, type TokenBalance } from '@/lib/web3/balance';

export interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connectWallet: (wallet: 'wepin' | 'metamask') => Promise<string[] | null>;
  disconnectWallet: () => Promise<void>;
  switchToVeryChain: () => Promise<void>;
  // VERY Token operations
  veryTokenInfo: TokenInfo | null;
  veryTokenBalance: TokenBalance | null;
  transferVeryToken: (to: string, amount: number) => Promise<TransferResult>;
  approveVeryToken: (spender: string, amount: number | 'max') => Promise<ApproveResult>;
  getVeryTokenAllowanceFor: (spender: string) => Promise<{ allowance: string; rawAllowance: bigint }>;
  checkVeryTokenAllowance: (spender: string, requiredAmount: number) => Promise<boolean>;
  refreshVeryTokenBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { networkConfig, switchToNetwork } = useNetwork();
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [veryTokenInfo, setVeryTokenInfo] = useState<TokenInfo | null>(null);
  const [veryTokenBalance, setVeryTokenBalance] = useState<TokenBalance | null>(null);

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

      const browserProvider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
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

  // Switch to VERY Chain (uses current network from NetworkContext)
  const switchToVeryChain = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      const expectedChainId = `0x${networkConfig.chainId.toString(16)}`;
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: expectedChainId }]
      });
    } catch (switchError: any) {
      // Chain not added
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${networkConfig.chainId.toString(16)}`,
              chainName: networkConfig.chainName,
              rpcUrls: networkConfig.rpcUrls,
              blockExplorerUrls: networkConfig.blockExplorerUrls,
              nativeCurrency: networkConfig.nativeCurrency
            }]
          });
        } catch (addError) {
          console.error('Failed to add VERY Chain:', addError);
          toast.error(`Network Setup Failed: Please manually add ${networkConfig.chainName} or switch networks`);
        }
      } else {
        // Use the switchToNetwork from NetworkContext as fallback
        try {
          await switchToNetwork();
        } catch (error) {
          console.error('Failed to switch network:', error);
        }
      }
    }
  }, [networkConfig, switchToNetwork]);

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

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        setIsConnected(false);
        setAddress(null);
        setProvider(null);
        setSigner(null);
      } else {
        setAddress(accounts[0]);
        setIsConnected(true);
        // Update provider/signer when account changes
        const browserProvider = new ethers.BrowserProvider(window.ethereum! as ethers.Eip1193Provider);
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
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  // Load VERY token info on mount
  useEffect(() => {
    async function loadTokenInfo() {
      try {
        const info = await getVeryTokenInfo();
        setVeryTokenInfo(info);
      } catch (error) {
        console.error('Failed to load VERY token info:', error);
      }
    }

    loadTokenInfo();
  }, []);

  // Load VERY token balance when connected
  const refreshVeryTokenBalance = useCallback(async () => {
    if (!address) {
      setVeryTokenBalance(null);
      return;
    }

    try {
      const balance = await getVeryBalance(address);
      setVeryTokenBalance(balance);
    } catch (error) {
      console.error('Failed to load VERY token balance:', error);
      setVeryTokenBalance(null);
    }
  }, [address]);

  useEffect(() => {
    refreshVeryTokenBalance();
  }, [refreshVeryTokenBalance]);

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;

      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        }) as string[];

        if (accounts && accounts.length > 0) {
          const browserProvider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
          const signerInstance = await browserProvider.getSigner();
          
          setProvider(browserProvider);
          setSigner(signerInstance);
          setAddress(accounts[0]);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Error checking existing connection:', error);
      }
    };

    checkConnection();
  }, []);

  // VERY Token operations
  const transferVeryToken = useCallback(
    async (to: string, amount: number): Promise<TransferResult> => {
      if (!signer) {
        return {
          success: false,
          error: 'Wallet not connected'
        };
      }

      try {
        const result = await transferVeryTokens(to, amount, signer);
        if (result.success) {
          await refreshVeryTokenBalance();
          toast.success(`Successfully transferred ${amount} VERY tokens`);
        } else {
          toast.error(result.error || 'Transfer failed');
        }
        return result;
      } catch (error: any) {
        const errorMsg = error.message || 'Transfer failed';
        toast.error(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    },
    [signer, refreshVeryTokenBalance]
  );

  const approveVeryToken = useCallback(
    async (spender: string, amount: number | 'max'): Promise<ApproveResult> => {
      if (!signer) {
        return {
          success: false,
          error: 'Wallet not connected'
        };
      }

      try {
        const result = await approveVeryTokens(spender, amount, signer);
        if (result.success) {
          toast.success(`Successfully approved ${amount === 'max' ? 'maximum' : amount} VERY tokens`);
        } else {
          toast.error(result.error || 'Approve failed');
        }
        return result;
      } catch (error: any) {
        const errorMsg = error.message || 'Approve failed';
        toast.error(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    },
    [signer]
  );

  const getVeryTokenAllowanceFor = useCallback(
    async (spender: string) => {
      if (!address) {
        return {
          allowance: '0',
          rawAllowance: 0n
        };
      }

      try {
        return await getVeryTokenAllowance(address, spender);
      } catch (error) {
        console.error('Failed to get allowance:', error);
        return {
          allowance: '0',
          rawAllowance: 0n
        };
      }
    },
    [address]
  );

  const checkVeryTokenAllowance = useCallback(
    async (spender: string, requiredAmount: number): Promise<boolean> => {
      if (!address) {
        return false;
      }

      try {
        return await hasEnoughAllowance(address, spender, requiredAmount);
      } catch (error) {
        console.error('Failed to check allowance:', error);
        return false;
      }
    },
    [address]
  );

  const value: WalletContextType = {
    isConnected,
    address,
    provider,
    signer,
    connectWallet,
    disconnectWallet,
    switchToVeryChain,
    veryTokenInfo,
    veryTokenBalance,
    transferVeryToken,
    approveVeryToken,
    getVeryTokenAllowanceFor,
    checkVeryTokenAllowance,
    refreshVeryTokenBalance
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error(
      'useWallet must be used within WalletProvider. ' +
      'Make sure your component is wrapped with <WalletProvider>.'
    );
  }
  return context;
}

