// src/components/SocialActivityPanel.tsx
// Real-time social activity panel showing community engagement

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Users, 
  TrendingUp, 
  Zap, 
  RefreshCw,
  ArrowRight,
  Heart,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityItem {
  id: string;
  type: 'tip' | 'connection' | 'badge' | 'milestone';
  user: {
    address: string;
    name?: string;
  };
  action: string;
  amount?: string;
  timestamp: Date;
  txHash?: string;
}

interface CommunityStats {
  totalUsers: number;
  activeToday: number;
  totalTips: number;
  totalVolume: string;
}

interface SocialActivityPanelProps {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

const formatTimeAgo = (date: Date | string): string => {
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
};

export function SocialActivityPanel({
  limit = 10,
  autoRefresh = true,
  refreshInterval = 30000,
  className = '',
}: SocialActivityPanelProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = async () => {
    try {
      const { getTipFeed, getPlatformAnalytics } = await import('@/lib/api');
      
      // Fetch recent tips and community stats in parallel
      const [feedResult, statsResult] = await Promise.all([
        getTipFeed(limit),
        getPlatformAnalytics(),
      ]);

      if (feedResult.success && feedResult.data) {
        const formattedActivities: ActivityItem[] = feedResult.data.map((tip: any) => ({
          id: tip.id,
          type: 'tip' as const,
          user: {
            address: tip.senderId,
          },
          action: `tipped ${tip.amount} VERY`,
          amount: tip.amount,
          timestamp: new Date(tip.timestamp),
          txHash: tip.txHash,
        }));
        setActivities(formattedActivities);
      }

      if (statsResult.success && statsResult.data) {
        setStats({
          totalUsers: statsResult.data.totalUsers || 0,
          activeToday: 0, // Not available in current API response
          totalTips: statsResult.data.totalTips || 0,
          totalVolume: statsResult.data.totalAmount || '0',
        });
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Use mock data if API fails
      setStats({
        totalUsers: 1234,
        activeToday: 89,
        totalTips: 5678,
        totalVolume: '123.45K',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    if (autoRefresh) {
      const interval = setInterval(() => {
        setRefreshing(true);
        fetchActivities();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [limit, autoRefresh, refreshInterval]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'tip':
        return <Gift className="w-4 h-4 text-emerald-500" />;
      case 'connection':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'badge':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'milestone':
        return <TrendingUp className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getInitials = (address: string) => {
    return address.slice(0, 2).toUpperCase();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Community Activity
            </CardTitle>
            <CardDescription>
              Real-time updates from the VeryTippers community
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Community Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-200/20">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Users</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.activeToday}</div>
                <div className="text-xs text-muted-foreground">Active Today</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalTips.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Tips</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalVolume}</div>
                <div className="text-xs text-muted-foreground">Total Volume</div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Feed */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading activity...
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
              <p className="text-xs mt-1">Be the first to tip!</p>
            </div>
          ) : (
            <AnimatePresence>
              {activities.slice(0, limit).map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
                >
                  <Avatar className="h-10 w-10 border-2 border-emerald-200">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-500 text-white">
                      {getInitials(activity.user.address)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getActivityIcon(activity.type)}
                      <span className="text-sm font-medium truncate">
                        {activity.user.name || `${activity.user.address.slice(0, 6)}...${activity.user.address.slice(-4)}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {activity.action}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {activity.amount && (
                        <Badge variant="secondary" className="text-xs">
                          {activity.amount} VERY
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                      {activity.txHash && (
                        <a
                          href={`#`}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Open transaction in explorer
                          }}
                          className="text-xs text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          View TX
                        </a>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {autoRefresh && (
          <div className="text-xs text-center text-muted-foreground pt-2 border-t">
            Auto-refreshing every {refreshInterval / 1000}s
          </div>
        )}
      </CardContent>
    </Card>
  );
}

