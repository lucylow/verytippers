// src/components/WalletConnect.tsx
// Complete VERY Chain wallet connection with Wepin + Ethers.js
// Handles VERY Chain mainnet, error handling, and UX polish

import React, { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { WalletIcon, CheckCircle } from 'lucide-react';
import { useVeryTippers } from '@/hooks/useVeryTippers';

interface WalletConnectProps {
  className?: string;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({ className }) => {
  const { 
    isConnected, 
    address, 
    connectWallet, 
    disconnectWallet,
    switchToVeryChain,
    provider
  } = useVeryTippers();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletType, setWalletType] = useState<'wepin' | 'metamask' | null>(null);

  // VERY Chain configuration (Mainnet)
  const VERY_CHAIN_ID = 8888;
  const VERY_CURRENCY = 'VERY';

  const handleConnect = useCallback(async (wallet: 'wepin' | 'metamask') => {
    setIsConnecting(true);
    setWalletType(wallet);
    
    try {
      // Step 1: Connect wallet
      const accounts = await connectWallet(wallet);
      if (!accounts?.[0]) {
        throw new Error('No accounts returned from wallet');
      }

      // Step 2: Switch to VERY Chain
      await switchToVeryChain();

      // Step 3: Verify connection
      if (provider) {
        const network = await provider.getNetwork();
        if (Number(network.chainId) !== VERY_CHAIN_ID) {
          toast.error(`Wrong Network: Please switch to VERY Chain (Chain ID: ${VERY_CHAIN_ID})`);
          return;
        }
      }

      toast.success(`Wallet Connected! Welcome back, ${accounts[0]?.slice(0, 6)}...${accounts[0]?.slice(-4)}`);
      
    } catch (error) {
      console.error('Wallet connection failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      toast.error(`Connection Failed: ${errorMessage}`);
    } finally {
      setIsConnecting(false);
      setWalletType(null);
    }
  }, [connectWallet, switchToVeryChain, provider]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectWallet();
      toast.success('Wallet Disconnected: Your session has been cleared.');
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast.error('Failed to disconnect wallet');
    }
  }, [disconnectWallet]);

  // Auto-reconnect on mount if previously connected
  useEffect(() => {
    if (isConnected && address) {
      // Verify VERY Chain on reconnect
      switchToVeryChain().catch(console.error);
    }
  }, [isConnected, address, switchToVeryChain]);

  if (isConnected && address) {
    return (
      <div className={`flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl border border-emerald-200/50 ${className}`}>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="font-mono text-sm font-medium text-emerald-900">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          className="h-8 px-3 text-xs"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 p-4 bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <WalletIcon className="w-8 h-8 text-cyan-400" />
        <div>
          <h3 className="font-semibold text-lg text-white">Connect VERY Wallet</h3>
          <p className="text-sm text-slate-400">Connect to VERY Chain mainnet (ID: {VERY_CHAIN_ID})</p>
        </div>
      </div>

      {/* Wallet Options */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button
          onClick={() => handleConnect('wepin')}
          disabled={isConnecting}
          className="h-14 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 group"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-semibold">Wepin</span>
            <span className="text-xs opacity-90 group-hover:opacity-100">Recommended</span>
          </div>
        </Button>
        
        <Button
          variant="outline"
          onClick={() => handleConnect('metamask')}
          disabled={isConnecting}
          className="h-14 border-slate-600 hover:border-slate-500 hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-200"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-semibold">MetaMask</span>
            <span className="text-xs opacity-90">Compatible</span>
          </div>
        </Button>
      </div>

      {/* Network Info */}
      {!isConnecting && (
        <div className="pt-3 pb-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>VERY Chain Mainnet</span>
            <span className="font-mono">ID: {VERY_CHAIN_ID} • {VERY_CURRENCY}</span>
          </div>
        </div>
      )}

      {isConnecting && (
        <div className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-xl border border-slate-700 animate-pulse">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">
            Connecting {walletType === 'wepin' ? 'Wepin' : 'MetaMask'}...
          </span>
        </div>
      )}
    </div>
  );
};

