/**
 * Wallet Provider (App-Wide)
 * Unified wallet context supporting MetaMask and Wepin
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { MetaMaskAdapter } from "./metamask";
import { WepinAdapter } from "./wepin";
import { WalletAdapter, WalletType } from "./types";
import { ethers } from "ethers";

interface WalletContextType {
  wallet: WalletAdapter | null;
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  connect: (type: WalletType) => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  // Legacy compatibility - ethers provider/signer for existing code
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
}

const WalletContext = createContext<WalletContextType | null>(null);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [wallet, setWallet] = useState<WalletAdapter | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  const connect = useCallback(async (type: WalletType) => {
    try {
      let adapter: WalletAdapter;

      if (type === "metamask") {
        adapter = new MetaMaskAdapter();
      } else {
        adapter = new WepinAdapter();
      }

      await adapter.connect();
      
      const addr = await adapter.getAddress();
      const chain = await adapter.getChainId();

      setWallet(adapter);
      setAddress(addr);
      setChainId(chain);

      // Create ethers provider/signer for legacy compatibility
      if (type === "metamask" && window.ethereum) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const signerInstance = await browserProvider.getSigner();
        setProvider(browserProvider);
        setSigner(signerInstance);
      } else if (type === "metamask" && adapter instanceof MetaMaskAdapter) {
        // Use adapter's provider/signer
        setProvider(adapter.provider);
        setSigner(adapter.signer);
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (wallet) {
      try {
        await wallet.disconnect();
      } catch (error) {
        console.error("Disconnect error:", error);
      }
    }
    setWallet(null);
    setAddress(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
  }, [wallet]);

  const signMessage = useCallback(
    async (message: string) => {
      if (!wallet) {
        throw new Error("Wallet not connected");
      }
      return wallet.signMessage(message);
    },
    [wallet]
  );

  // Listen for account/chain changes (MetaMask)
  useEffect(() => {
    if (!window.ethereum || !(wallet instanceof MetaMaskAdapter)) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        // Re-fetch address
        wallet.getAddress().then(setAddress).catch(console.error);
      }
    };

    const handleChainChanged = () => {
      // Re-fetch chain ID
      wallet.getChainId().then(setChainId).catch(console.error);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged as (...args: unknown[]) => void);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged as (...args: unknown[]) => void);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [wallet, disconnect]);

  // Check for existing connection on mount (MetaMask)
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;

      try {
        const accounts = (await window.ethereum.request({
          method: "eth_accounts",
        })) as string[];

        if (accounts && accounts.length > 0) {
          // Auto-connect to MetaMask if already connected
          const adapter = new MetaMaskAdapter();
          await adapter.connect();
          const addr = await adapter.getAddress();
          const chain = await adapter.getChainId();

          setWallet(adapter);
          setAddress(addr);
          setChainId(chain);
          setProvider(adapter.provider);
          setSigner(adapter.signer);
        }
      } catch (error) {
        console.error("Error checking existing connection:", error);
      }
    };

    checkConnection();
  }, []);

  const value: WalletContextType = {
    wallet,
    isConnected: wallet !== null,
    address,
    chainId,
    connect,
    disconnect,
    signMessage,
    provider,
    signer,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}

