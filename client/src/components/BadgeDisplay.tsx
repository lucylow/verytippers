// BadgeDisplay Component - Animated 3D badge showcase

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Award, RefreshCw } from 'lucide-react';
import { useVeryTippers } from '@/hooks/useVeryTippers';

export interface Badge {
  id: string;
  badgeId: string;
  name: string;
  emoji: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  description: string;
  awardedAt: string;
  metadata?: any;
}

interface BadgeDisplayProps {
  userId?: string;
  className?: string;
}

export function BadgeDisplay({ userId: propUserId, className }: BadgeDisplayProps) {
  const { address } = useVeryTippers();
  const userId = propUserId || address;
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [stats, setStats] = useState<{
    totalBadges: number;
    rarityCounts: Record<string, number>;
    latestBadge: Badge | null;
  } | null>(null);

  useEffect(() => {
    if (userId) {
      fetchBadges();
    }
  }, [userId]);

  const fetchBadges = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/badges/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setBadges(data.data.badges || []);
          setStats(data.data.stats || null);
        }
      }
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAchievements = async () => {
    if (!userId) return;

    setIsChecking(true);
    try {
      const response = await fetch('/api/v1/badges/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.newBadges.length > 0) {
          // Refresh badges after checking
          await fetchBadges();
          // Could show a notification here for new badges
          console.log('New badges awarded!', data.data.newBadges);
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      bronze: 'from-orange-500 to-orange-600',
      silver: 'from-slate-400 to-slate-300',
      gold: 'from-yellow-500 to-yellow-600',
      platinum: 'from-indigo-500 to-indigo-600',
      diamond: 'from-purple-500 to-pink-500',
    };
    return colors[rarity] || 'from-gray-500 to-gray-400';
  };

  const getRarityGradient = (rarity: string) => {
    const gradients: Record<string, string> = {
      bronze: 'bg-gradient-to-br from-orange-500/20 to-orange-600/10',
      silver: 'bg-gradient-to-br from-slate-400/20 to-slate-300/10',
      gold: 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10',
      platinum: 'bg-gradient-to-br from-indigo-500/20 to-indigo-600/10',
      diamond: 'bg-gradient-to-br from-purple-500/20 to-pink-500/10',
    };
    return gradients[rarity] || 'bg-gradient-to-br from-gray-500/20 to-gray-400/10';
  };

  if (!userId) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Award className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400 mb-2">Connect Wallet</h3>
          <p className="text-sm text-slate-500">Connect your wallet to view achievements</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin" />
          <p className="text-sm text-slate-400 mt-4">Loading badges...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="w-6 h-6 text-yellow-400" />
          <div>
            <h3 className="text-xl font-bold text-white">Achievements</h3>
            {stats && (
              <p className="text-sm text-slate-400">
                {stats.totalBadges} badge{stats.totalBadges !== 1 ? 's' : ''} earned
              </p>
            )}
          </div>
        </div>
        <button
          onClick={checkAchievements}
          disabled={isChecking}
          className="text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          Check New
        </button>
      </div>

      {badges.length === 0 ? (
        <Card className="text-center py-12 bg-gradient-to-r from-slate-900/30 to-slate-800/30 border-slate-700/50">
          <CardContent>
            <Crown className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-slate-400 mb-2">No Badges Yet</h4>
            <p className="text-sm text-slate-500 mb-4">Send your first tip to unlock achievements!</p>
            <button
              onClick={checkAchievements}
              disabled={isChecking}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isChecking ? 'Checking...' : 'Check Achievements'}
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map((badge, index) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group relative overflow-hidden h-32 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600/50 hover:shadow-2xl transition-all duration-300 cursor-pointer">
                <CardContent className={`p-4 h-full flex flex-col justify-between ${getRarityGradient(badge.rarity)}`}>
                  {/* Badge Icon + Gradient */}
                  <div
                    className={`w-full h-14 rounded-xl bg-gradient-to-r ${getRarityColor(badge.rarity)} flex items-center justify-center shadow-lg mb-2 group-hover:scale-110 transition-transform`}
                  >
                    <span className="text-3xl drop-shadow-lg">{badge.emoji}</span>
                  </div>

                  {/* Badge Name */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm leading-tight truncate">
                      {badge.name}
                    </h4>
                    <p className="text-xs text-slate-400 capitalize">{badge.rarity}</p>
                  </div>

                  {/* Rarity indicator */}
                  <div
                    className={`w-3 h-3 rounded-full absolute top-2 right-2 border-2 border-slate-600/50 ${getRarityColor(badge.rarity).split(' ')[0].replace('from-', 'bg-')} group-hover:scale-125 transition-transform`}
                  />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {stats && stats.totalBadges > 0 && (
        <div className="mt-6 p-4 bg-slate-900/30 rounded-lg border border-slate-700/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Rarity Breakdown:</span>
            <div className="flex gap-4">
              {Object.entries(stats.rarityCounts).map(([rarity, count]) => (
                <span key={rarity} className="text-slate-300 capitalize">
                  {rarity}: <span className="font-semibold">{count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

