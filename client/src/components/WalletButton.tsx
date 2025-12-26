// src/components/WalletButton.tsx
// Compact wallet button for navbar with social features

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  WalletIcon, 
  CheckCircle, 
  ChevronDown, 
  User, 
  Share2, 
  TrendingUp,
  Users,
  Activity,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface WalletButtonProps {
  className?: string;
}

interface UserStats {
  tipsSent: number;
  tipsReceived: number;
  totalAmount: string;
  rank?: number;
  followers?: number;
  following?: number;
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
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Fetch user stats when connected
  useEffect(() => {
    if (isConnected && address) {
      fetchUserStats();
    }
  }, [isConnected, address]);

  const fetchUserStats = async () => {
    if (!address) return;
    setLoadingStats(true);
    try {
      // Try to fetch user stats from API
      const response = await fetch(`/api/v1/analytics/user/${address}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUserStats({
            tipsSent: data.data.totalTipsSent || 0,
            tipsReceived: data.data.totalTipsReceived || 0,
            totalAmount: data.data.totalAmount || '0',
            rank: data.data.rank,
            followers: data.data.followers || 0,
            following: data.data.following || 0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      // Set default stats if API fails
      setUserStats({
        tipsSent: 0,
        tipsReceived: 0,
        totalAmount: '0',
        followers: 0,
        following: 0,
      });
    } finally {
      setLoadingStats(false);
    }
  };

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
      setUserStats(null);
    } catch (error: unknown) {
      console.error('Disconnect failed:', error);
      toast.error('Failed to disconnect wallet', {
        duration: 3000,
      });
    }
  }, [disconnectWallet]);

  const handleCopyAddress = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard!');
    }
  }, [address]);

  const handleShareProfile = useCallback(() => {
    if (!address) return;
    
    const profileUrl = `${window.location.origin}/profile/${address}`;
    const shareText = `Check out my VeryTippers profile! ${address.slice(0, 6)}...${address.slice(-4)}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'My VeryTippers Profile',
        text: shareText,
        url: profileUrl,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(profileUrl);
        toast.success('Profile link copied!');
      });
    } else {
      navigator.clipboard.writeText(profileUrl);
      toast.success('Profile link copied!');
    }
  }, [address]);

  const handleViewProfile = useCallback(() => {
    if (address) {
      window.open(`/profile/${address}`, '_blank');
    }
  }, [address]);

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
        <DropdownMenuContent align="end" className="w-80">
          {/* Profile Header */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-500 text-white">
                  {address.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm font-semibold truncate">
                  {address.slice(0, 8)}...{address.slice(-6)}
                </div>
                {userStats?.rank && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    Rank #{userStats.rank}
                  </div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            {userStats && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-emerald-600">{userStats.tipsSent}</div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-blue-600">{userStats.tipsReceived}</div>
                  <div className="text-xs text-muted-foreground">Received</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-purple-600">
                    {userStats.followers || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Followers</div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Menu Items */}
          <DropdownMenuItem onClick={handleViewProfile} className="cursor-pointer">
            <User className="w-4 h-4 mr-2" />
            View Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer">
            <Copy className="w-4 h-4 mr-2" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShareProfile} className="cursor-pointer">
            <Share2 className="w-4 h-4 mr-2" />
            Share Profile
          </DropdownMenuItem>

          <Separator />

          <DropdownMenuItem onClick={handleDisconnect} className="cursor-pointer text-destructive">
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

