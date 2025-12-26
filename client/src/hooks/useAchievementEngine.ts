// React hook for real-time achievement tracking

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useVeryTippers } from '@/hooks/useVeryTippers';
import type { Badge } from '@/components/BadgeDisplay';

export interface UseAchievementEngineReturn {
  badges: Badge[];
  newBadgeAlerts: Badge[];
  isChecking: boolean;
  checkAchievements: (userId: string) => Promise<Badge[]>;
  dismissAlert: (badgeId: string) => void;
  stats: {
    totalBadges: number;
    rarityCounts: Record<string, number>;
    latestBadge: Badge | null;
  } | null;
}

export const useAchievementEngine = (): UseAchievementEngineReturn => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [newBadgeAlerts, setNewBadgeAlerts] = useState<Badge[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [stats, setStats] = useState<{
    totalBadges: number;
    rarityCounts: Record<string, number>;
    latestBadge: Badge | null;
  } | null>(null);
  const { address } = useVeryTippers();

  /**
   * Fetch user badges from the API
   */
  const fetchBadges = useCallback(async (userId: string) => {
    try {
      const { getUserBadges } = await import('@/lib/api');
      const result = await getUserBadges(userId);
      
      if (result.success && result.data) {
        setBadges(result.data.badges || []);
        setStats(result.data.stats || null);
        return result.data.badges || [];
      }
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
    return [];
  }, []);

  /**
   * Check for new achievements
   */
  const checkAchievements = useCallback(
    async (userId: string): Promise<Badge[]> => {
      if (!userId) return [];

      setIsChecking(true);
      try {
        const { checkBadges } = await import('@/lib/api');
        const result = await checkBadges(userId);

        if (result.success && result.data && result.data.newBadges.length > 0) {
          const newBadges = result.data.newBadges;
          setNewBadgeAlerts(newBadges);
          showAchievementNotification(newBadges);

          // Refresh badges list
          await fetchBadges(userId);
          return newBadges;
        }

        // Always refresh badges even if no new ones
        await fetchBadges(userId);
        return [];
      } catch (error) {
        console.error('Achievement check failed:', error);
        return [];
      } finally {
        setIsChecking(false);
      }
    },
    [fetchBadges]
  );

  /**
   * Show notification for new badges
   */
  const showAchievementNotification = (newBadges: Badge[]) => {
    newBadges.forEach((badge, index) => {
      setTimeout(() => {
        toast.success(`🎉 New Achievement Unlocked!`, {
          description: `${badge.emoji} ${badge.name} - ${badge.description}`,
          duration: 5000,
        });
      }, index * 500); // Stagger notifications
    });
  };

  /**
   * Dismiss a badge alert
   */
  const dismissAlert = useCallback((badgeId: string) => {
    setNewBadgeAlerts((prev) => prev.filter((b) => b.badgeId !== badgeId));
  }, []);

  // Auto-fetch badges when address changes
  useEffect(() => {
    if (address) {
      fetchBadges(address);
    } else {
      setBadges([]);
      setStats(null);
    }
  }, [address, fetchBadges]);

  // Poll for new badges periodically (every 5 minutes)
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      checkAchievements(address);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [address, checkAchievements]);

  return {
    badges,
    newBadgeAlerts,
    isChecking,
    checkAchievements,
    dismissAlert,
    stats,
  };
};


