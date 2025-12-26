// src/hooks/useVeryTippers.ts
// Custom hook for VERY Chain wallet management with full error handling
// This hook now uses the WalletProvider context for shared state

import { useWallet } from '@/contexts/WalletContext';

export interface VeryTippersProvider {
  isConnected: boolean;
  address: string | null;
  provider: any;
  signer: any;
  connectWallet: (wallet: 'wepin' | 'metamask') => Promise<string[] | null>;
  disconnectWallet: () => Promise<void>;
  switchToVeryChain: () => Promise<void>;
}

export const useVeryTippers = (): VeryTippersProvider => {
  return useWallet();
};

