import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { WalletIcon, CheckCircle, ChevronDown, Loader2 } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useTransactionAnnouncer } from './TransactionAnnouncer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface AccessibleWalletButtonProps {
  className?: string;
}

type WalletStatus = 'idle' | 'connecting' | 'connected' | 'disconnecting';

/**
 * AccessibleWalletButton - Screen reader friendly wallet connection
 * 
 * Features:
 * - ARIA live announcements for connection state
 * - Clear status narration
 * - Keyboard accessible
 * - No silent wallet popups
 */
export function AccessibleWalletButton({ className }: AccessibleWalletButtonProps) {
  const { 
    isConnected, 
    address, 
    connectWallet, 
    disconnectWallet,
    switchToVeryChain,
  } = useWallet();
  
  const { announce } = useTransactionAnnouncer();
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [walletType, setWalletType] = useState<'wepin' | 'metamask' | null>(null);

  const handleConnect = useCallback(async (wallet: 'wepin' | 'metamask') => {
    setStatus('connecting');
    setWalletType(wallet);
    announce(`Connecting ${wallet} wallet. Please approve the connection request in your wallet.`, 'assertive');
    
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
            const message = 'Connection rejected. Please approve the connection request in your wallet.';
            announce(message, 'assertive');
            throw new Error(message);
          }
        }
        throw error;
      }

      if (!accounts?.[0]) {
        const message = 'No accounts returned from wallet. Please unlock your wallet and try again.';
        announce(message, 'assertive');
        throw new Error(message);
      }

      // Switch to VERY Chain
      try {
        announce('Switching to VERY Chain network. Please approve the network switch in your wallet.', 'polite');
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
        
        announce(`Network switch failed: ${errorMessage}`, 'assertive');
        toast.error(`Network Switch Failed: ${errorMessage}`);
        throw error;
      }

      setStatus('connected');
      const shortAddress = `${accounts[0]?.slice(0, 6)}...${accounts[0]?.slice(-4)}`;
      announce(`Wallet connected successfully. Address: ${shortAddress}`, 'assertive');
      toast.success(`Wallet Connected! ${shortAddress}`);
      
    } catch (error: unknown) {
      console.error('Wallet connection failed:', error);
      setStatus('idle');
      
      let errorMessage = 'Connection failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      announce(`Connection failed: ${errorMessage}`, 'assertive');
      toast.error(`Connection Failed: ${errorMessage}`, {
        duration: 5000,
      });
    }
  }, [connectWallet, switchToVeryChain, announce]);

  const handleDisconnect = useCallback(async () => {
    setStatus('disconnecting');
    announce('Disconnecting wallet', 'polite');
    
    try {
      await Promise.race([
        disconnectWallet(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Disconnect timed out')), 10000)
        )
      ]);
      
      setStatus('idle');
      announce('Wallet disconnected successfully', 'polite');
      toast.success('Wallet Disconnected');
    } catch (error: unknown) {
      console.error('Disconnect failed:', error);
      setStatus('connected');
      announce('Failed to disconnect wallet', 'assertive');
      toast.error('Failed to disconnect wallet', {
        duration: 3000,
      });
    }
  }, [disconnectWallet, announce]);

  if (isConnected && address) {
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            aria-label={`Wallet connected: ${shortAddress}. Click to open wallet menu.`}
            aria-busy={status === 'disconnecting'}
            className={`flex items-center gap-2 ${className}`}
          >
            <CheckCircle className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            <span className="font-mono text-sm" aria-label={`Address: ${address}`}>
              {shortAddress}
            </span>
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" role="menu">
          <DropdownMenuItem 
            onClick={handleDisconnect}
            role="menuitem"
            aria-label="Disconnect wallet"
            disabled={status === 'disconnecting'}
          >
            {status === 'disconnecting' ? 'Disconnecting...' : 'Disconnect'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const isConnecting = status === 'connecting';
  const ariaLabel = isConnecting
    ? `Connecting ${walletType || 'wallet'}. Please approve in your wallet.`
    : 'Connect wallet. Opens menu to select wallet provider.';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={isConnecting}
          aria-busy={isConnecting}
          aria-label={ariaLabel}
          className={`flex items-center gap-2 ${className}`}
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Connecting…</span>
            </>
          ) : (
            <>
              <WalletIcon className="w-4 h-4" aria-hidden="true" />
              <span>Connect Wallet</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" role="menu">
        <DropdownMenuItem 
          onClick={() => handleConnect('metamask')}
          disabled={isConnecting}
          role="menuitem"
          aria-label="Connect MetaMask wallet"
        >
          MetaMask
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleConnect('wepin')}
          disabled={isConnecting}
          role="menuitem"
          aria-label="Connect Wepin wallet"
        >
          Wepin
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

