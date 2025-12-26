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
      const response = await fetch(`/api/v1/badges/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setBadges(data.data.badges || []);
          setStats(data.data.stats || null);
          return data.data.badges || [];
        }
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
        // Check for new badges
        const checkResponse = await fetch('/api/v1/badges/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.success && checkData.data.newBadges.length > 0) {
            const newBadges = checkData.data.newBadges;
            setNewBadgeAlerts(newBadges);
            showAchievementNotification(newBadges);

            // Refresh badges list
            await fetchBadges(userId);
            return newBadges;
          }
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


