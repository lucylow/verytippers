// src/components/SocialProfile.tsx
// Social profile component for wallet addresses

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Share2, 
  Copy, 
  TrendingUp,
  Gift,
  Heart,
  Users,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { shareProfile, copyAddress, getProfileLink } from '@/lib/social/share';
import { useWallet } from '@/contexts/WalletContext';

interface SocialProfileProps {
  address: string;
  className?: string;
}

interface ProfileData {
  address: string;
  tipsSent: number;
  tipsReceived: number;
  totalAmount: string;
  rank?: number;
  followers: number;
  following: number;
  badges: number;
  joinedAt?: string;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
}

export function SocialProfile({ address, className = '' }: SocialProfileProps) {
  const { address: connectedAddress } = useWallet();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const isOwnProfile = connectedAddress?.toLowerCase() === address.toLowerCase();

  useEffect(() => {
    fetchProfile();
  }, [address]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/analytics/user/${address}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setProfile({
            address,
            tipsSent: data.data.totalTipsSent || 0,
            tipsReceived: data.data.totalTipsReceived || 0,
            totalAmount: data.data.totalAmount || '0',
            rank: data.data.rank,
            followers: data.data.followers || 0,
            following: data.data.following || 0,
            badges: data.data.badges || 0,
            joinedAt: data.data.createdAt,
            isFollowing: data.data.isFollowing,
            isOwnProfile,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // Set default profile
      setProfile({
        address,
        tipsSent: 0,
        tipsReceived: 0,
        totalAmount: '0',
        followers: 0,
        following: 0,
        badges: 0,
        isOwnProfile,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const usedClipboard = await shareProfile(address, profile || undefined);
      if (usedClipboard) {
        toast.success('Profile shared!');
      } else {
        toast.success('Profile link copied to clipboard!');
      }
    } catch (error) {
      console.error('Failed to share profile:', error);
      toast.error('Failed to share profile');
    } finally {
      setSharing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await copyAddress(address);
      toast.success('Address copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  const handleFollow = async () => {
    // TODO: Implement follow functionality
    toast.info('Follow feature coming soon!');
  };

  const getInitials = (addr: string) => {
    return addr.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Profile not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-4 border-emerald-200">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-500 text-white text-2xl">
                {getInitials(address)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="font-mono text-lg">
                  {address.slice(0, 8)}...{address.slice(-6)}
                </CardTitle>
                {isOwnProfile && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    You
                  </Badge>
                )}
              </div>
              <CardDescription className="font-mono text-xs">
                {address}
              </CardDescription>
              {profile.rank && (
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  Rank #{profile.rank}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={sharing}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            {!isOwnProfile && (
              <Button
                variant={profile.isFollowing ? "secondary" : "default"}
                size="sm"
                onClick={handleFollow}
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                {profile.isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200/20">
            <Gift className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
            <div className="text-2xl font-bold text-emerald-600">{profile.tipsSent}</div>
            <div className="text-xs text-muted-foreground">Tips Sent</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-200/20">
            <Heart className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold text-blue-600">{profile.tipsReceived}</div>
            <div className="text-xs text-muted-foreground">Tips Received</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-200/20">
            <Users className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold text-purple-600">{profile.followers}</div>
            <div className="text-xs text-muted-foreground">Followers</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-200/20">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold text-yellow-600">{profile.badges}</div>
            <div className="text-xs text-muted-foreground">Badges</div>
          </div>
        </div>

        {/* Total Volume */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Volume</span>
            <span className="text-lg font-bold text-emerald-600">
              {parseFloat(profile.totalAmount).toLocaleString()} VERY
            </span>
          </div>
        </div>

        {/* Profile Link */}
        <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-dashed">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Profile Link</p>
              <p className="text-xs font-mono truncate">{getProfileLink(address)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(getProfileLink(address), '_blank')}
              className="ml-2 gap-1"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

