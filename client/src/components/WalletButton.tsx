// src/components/WalletButton.tsx
// Compact wallet button for navbar

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { WalletIcon, CheckCircle, ChevronDown } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WalletButtonProps {
  className?: string;
}

export const WalletButton: React.FC<WalletButtonProps> = ({ className }) => {
  const { 
    isConnected, 
    address, 
    connectWallet, 
    disconnectWallet,
    switchToVeryChain,
    provider
  } = useWallet();
  
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = useCallback(async (wallet: 'wepin' | 'metamask') => {
    setIsConnecting(true);
    
    try {
      let accounts: string[] | null;
      try {
        accounts = await Promise.race([
          connectWallet(wallet),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Wallet connection timed out')), 30000)
          )
        ]);
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (error.message.includes('reject') || error.message.includes('denied') || error.message.includes('User rejected')) {
            throw new Error('Connection rejected. Please approve the connection request in your wallet.');
          }
        }
        throw error;
      }

      if (!accounts?.[0]) {
        throw new Error('No accounts returned from wallet. Please unlock your wallet and try again.');
      }

      // Switch to VERY Chain
      try {
        await Promise.race([
          switchToVeryChain(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Network switch timed out')), 30000)
          )
        ]);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error
          ? error.message
          : 'Failed to switch to VERY Chain';
        
        toast.error(`Network Switch Failed: ${errorMessage}`);
        throw error;
      }

      toast.success(`Wallet Connected! ${accounts[0]?.slice(0, 6)}...${accounts[0]?.slice(-4)}`);
      
    } catch (error: unknown) {
      console.error('Wallet connection failed:', error);
      
      let errorMessage = 'Connection failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(`Connection Failed: ${errorMessage}`, {
        duration: 5000,
      });
    } finally {
      setIsConnecting(false);
    }
  }, [connectWallet, switchToVeryChain]);

  const handleDisconnect = useCallback(async () => {
    try {
      await Promise.race([
        disconnectWallet(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Disconnect timed out')), 10000)
        )
      ]);
      
      toast.success('Wallet Disconnected');
    } catch (error: unknown) {
      console.error('Disconnect failed:', error);
      toast.error('Failed to disconnect wallet', {
        duration: 3000,
      });
    }
  }, [disconnectWallet]);

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`flex items-center gap-2 ${className}`}
          >
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-mono text-sm">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDisconnect}>
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={isConnecting}
          className={`flex items-center gap-2 ${className}`}
        >
          <WalletIcon className="w-4 h-4" />
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleConnect('metamask')}
          disabled={isConnecting}
        >
          MetaMask
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleConnect('wepin')}
          disabled={isConnecting}
        >
          Wepin
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

