// src/components/ProfileCard.tsx - User Profile with Badges + Stats
import React from 'react';
import { motion } from 'framer-motion';
import { BadgeDisplay } from './BadgeDisplay';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Send, ExternalLink } from 'lucide-react';

interface ProfileCardProps {
  username: string;
  tipsSent: number;
  tipsReceived: number;
  rank: number;
  badges: any[];
  address?: string;
  onSendTip?: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  username,
  tipsSent,
  tipsReceived,
  rank,
  badges,
  address,
  onSendTip
}) => {
  const getRankColor = (rank: number) => {
    if (rank <= 3) return 'from-yellow-500 to-orange-500';
    if (rank <= 10) return 'from-emerald-500 to-green-500';
    return 'from-slate-500 to-slate-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-slate-900/70 via-purple-900/30 to-slate-900/70 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 shadow-2xl hover:shadow-purple-500/20 transition-all overflow-hidden relative"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-blue-500/10" />
      
      <div className="relative z-10">
        {/* Profile Header */}
        <div className="flex items-start gap-6 mb-8">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl border-4 border-white/20">
              <span className="text-4xl font-black text-white drop-shadow-lg">
                {username.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-bold shadow-lg bg-gradient-to-r ${getRankColor(rank)}`}>
              #{rank}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-3xl font-black bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent mb-2 truncate">
              {username}
            </h2>
            {address && (
              <p className="text-xs font-mono text-slate-500 mb-4 truncate">
                {address}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
              <div className="flex items-center gap-1">
                <span>💸</span>
                <span>{tipsSent.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>💰</span>
                <span>{tipsReceived.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🏆</span>
                <span>{badges.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400 mb-1">₿ 2,847.32</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">Total Tipped</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">12.5x</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">Vote Power</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400 mb-1">🔥</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">On Fire</div>
          </div>
        </div>

        {/* Badges Preview */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg">🏅</span>
            <h4 className="font-bold text-lg text-white">Achievements</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {badges.slice(0, 6).map((badge, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center border border-purple-500/30"
              >
                <span className="text-2xl">{badge.emoji || '🏆'}</span>
              </motion.div>
            ))}
            {badges.length > 6 && (
              <div className="w-12 h-12 bg-slate-800/50 rounded-xl flex items-center justify-center border border-slate-700/50 text-slate-400 text-xs font-bold">
                +{badges.length - 6}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-700/50">
          {onSendTip && (
            <Button
              onClick={onSendTip}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Tip
            </Button>
          )}
          <Button
            variant="outline"
            className="px-6 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white border-slate-600 shadow-lg hover:shadow-slate-400/25 transition-all"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Profile
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

