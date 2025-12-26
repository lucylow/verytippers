// src/components/AdSlot.tsx - Ad display component
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { getAdSlot, recordImpression, recordClick, getCurrentUserId, type Ad } from '@/services/ads';
import { cn } from '@/lib/utils';

interface AdSlotProps {
  tags?: string[];
  guild?: string;
  className?: string;
}

export default function AdSlot({ tags = [], guild, className }: AdSlotProps) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [impressionRecorded, setImpressionRecorded] = useState(false);

  useEffect(() => {
    async function fetchAd() {
      setLoading(true);
      try {
        const fetchedAd = await getAdSlot(tags, guild);
        setAd(fetchedAd);
        
        // Record impression when ad is loaded
        if (fetchedAd && !impressionRecorded) {
          const userId = getCurrentUserId();
          await recordImpression({
            adId: fetchedAd.id,
            userId: userId || undefined,
          });
          setImpressionRecorded(true);
        }
      } catch (error) {
        console.error('Error loading ad:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAd();
  }, [tags, guild]);

  const handleClick = async () => {
    if (!ad) return;

    try {
      const userId = getCurrentUserId();
      const redirectUrl = await recordClick({
        adId: ad.id,
        userId: userId || undefined,
      });

      if (redirectUrl) {
        window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error handling ad click:', error);
    }
  };

  if (loading) {
    return null; // Don't show loading state, just don't render
  }

  if (!ad) {
    return null; // No ad available
  }

  return (
    <Card className={cn('bg-slate-900/30 backdrop-blur-xl border-slate-700/50 overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {ad.imageUrl && (
            <div className="flex-shrink-0">
              <img
                src={ad.imageUrl}
                alt={ad.title}
                className="w-16 h-16 object-cover rounded-lg"
                onError={(e) => {
                  // Hide image on error
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-400 font-medium">Sponsored</span>
            </div>
            <h4 className="text-sm font-semibold text-white mb-1 line-clamp-1">
              {ad.title}
            </h4>
            {ad.description && (
              <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                {ad.description}
              </p>
            )}
            <Button
              onClick={handleClick}
              size="sm"
              variant="outline"
              className="text-xs h-7 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Learn more
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

