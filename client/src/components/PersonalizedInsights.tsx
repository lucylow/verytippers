// Personalized Insights Component
// Animated weekly insights carousel

import { useState, useEffect } from 'react';
import { generatePersonalizedInsights, fetchLeaderboardData, type Insight } from '@/services/leaderboard-insights';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PersonalizedInsightsProps {
  userId: string;
}

export const PersonalizedInsights: React.FC<PersonalizedInsightsProps> = ({ userId }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentInsight, setCurrentInsight] = useState(0);

  useEffect(() => {
    loadInsights();
  }, [userId]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const data = await fetchLeaderboardData(userId, 'weekly');
      const newInsights = await generatePersonalizedInsights(data, {
        totalUsers: data.communityStats?.totalUsers || 1000,
        avgTips: data.communityStats?.avgTips || 10
      });
      setInsights(newInsights);
      setCurrentInsight(0);
    } catch (error) {
      console.error('Failed to load insights:', error);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  const shareInsight = (insight: Insight) => {
    const text = `${insight.emoji} ${insight.title}\n\n${insight.summary}\n\n${insight.keyStat}\n\nvery-tippers.com #Web3 #Tipping`;
    
    if (navigator.share) {
      navigator.share({
        title: insight.title,
        text: text
      }).catch((error) => {
        console.error('Error sharing:', error);
        // Fallback to clipboard
        navigator.clipboard.writeText(text);
      });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  if (loading) {
    return (
      <Card className="w-full h-48 bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-500/20">
        <CardContent className="flex items-center justify-center h-full p-6">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
        </CardContent>
      </Card>
    );
  }

  if (!insights.length) return null;

  const insight = insights[currentInsight];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <Card className="w-full bg-gradient-to-r from-indigo-900/80 via-purple-900/80 to-pink-900/80 backdrop-blur-xl border border-purple-500/30 overflow-hidden relative">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-pink-500/20 animate-pulse" />
        
        <CardContent className="p-6 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentInsight}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Emoji + Title */}
              <div className="flex items-center gap-3 mb-4">
                <motion.div 
                  className="text-4xl"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {insight.emoji}
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-white leading-tight">
                    {insight.title}
                  </h3>
                  <p className="text-sm text-slate-300 mt-1">{insight.summary}</p>
                </div>
              </div>

              {/* Key Stat */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/20">
                <div className="text-2xl font-mono font-bold text-white text-right">
                  {insight.keyStat}
                </div>
              </div>

              {/* Call to Action */}
              <div className="mb-4">
                <p className="text-sm text-purple-200 font-medium">
                  {insight.callToAction}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-white/30 bg-white/10 text-white hover:bg-white/20"
                  onClick={loadInsights}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
                
                {insight.shareable && (
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                    onClick={() => shareInsight(insight)}
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Share
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Carousel Navigation */}
          {insights.length > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white/70 hover:text-white"
                onClick={() => setCurrentInsight((prev) => 
                  prev === 0 ? insights.length - 1 : prev - 1
                )}
              >
                ←
              </Button>
              <span className="text-xs text-slate-400 mx-2">
                {currentInsight + 1} / {insights.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white/70 hover:text-white"
                onClick={() => setCurrentInsight((prev) => 
                  prev === insights.length - 1 ? 0 : prev + 1
                )}
              >
                →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
