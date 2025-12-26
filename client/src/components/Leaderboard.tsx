// src/components/Leaderboard.tsx - Real-time animated leaderboard
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api_getLeaderboard } from '@/lib/mockApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardUser {
  username: string;
  total: number;
  rank?: number;
  change24h?: number;
}

export default function Leaderboard() {
  const [items, setItems] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const rows = await api_getLeaderboard();
      const users = (rows as any[]).map((it, idx) => ({
        ...it,
        rank: idx + 1,
        change24h: Math.random() > 0.5 ? Math.random() * 20 : undefined
      }));
      setItems(users);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  const top3 = useMemo(() => items.slice(0, 3), [items]);
  const rest = useMemo(() => items.slice(3, 50), [items]);

  if (loading && items.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h1 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-4">
          🏆 Leaderboard
        </h1>
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-slate-800/50 to-slate-700/50 px-6 py-3 rounded-full border border-slate-600/50 backdrop-blur-xl">
          <span className="text-sm text-slate-400">Live • </span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
          <span className="text-sm text-slate-400">{items.length} tippers</span>
        </div>
      </motion.div>

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="flex justify-center gap-8 mb-16">
          {[2, 0, 1].map((idx, podiumIdx) => {
            const user = top3[idx];
            if (!user) return null;
            const rank = idx + 1;
            return (
              <motion.div
                key={user.username}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: podiumIdx * 0.2 }}
                className="text-center"
              >
                <div
                  className={cn(
                    'w-28 h-28 rounded-3xl flex items-center justify-center font-bold text-3xl shadow-2xl mb-4',
                    rank === 1
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-slate-900 shadow-yellow-500/50'
                      : rank === 2
                      ? 'bg-gradient-to-br from-slate-400 to-slate-300 text-slate-900 shadow-slate-400/50'
                      : 'bg-gradient-to-br from-slate-600 to-slate-500 text-white shadow-slate-500/50'
                  )}
                >
                  #{rank}
                </div>
                <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-700/50 w-32 mx-auto">
                  <CardContent className="p-4">
                    <div className="font-bold text-white text-lg truncate">{user.username}</div>
                    <div className="text-sm text-slate-400">{user.total} tips</div>
                    <div className="text-xs text-emerald-400 font-mono">₿ {user.total.toFixed(2)}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-700/50 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5" />
            All Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rest.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              No tips yet. Be the first!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="p-6 text-left font-bold text-white">#</th>
                    <th className="p-6 text-left font-bold text-white">Tipper</th>
                    <th className="p-6 text-center font-bold text-white">Tips</th>
                    <th className="p-6 text-right font-bold text-white">Amount</th>
                    <th className="p-6 text-right font-bold text-emerald-400">24h Change</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {rest.map((user, idx) => (
                      <motion.tr
                        key={user.username}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="p-6 font-mono text-slate-400 group-hover:text-white">
                          #{user.rank}
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="font-bold text-sm text-white">
                                {user.username.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-semibold text-white truncate">{user.username}</span>
                          </div>
                        </td>
                        <td className="p-6 text-center font-mono text-slate-300">
                          {user.total.toLocaleString()}
                        </td>
                        <td className="p-6 text-right font-mono text-emerald-400">
                          ₿ {user.total.toFixed(2)}
                        </td>
                        <td className="p-6 text-right font-mono text-emerald-400">
                          {user.change24h && (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/20 px-2 py-1 rounded-full text-xs">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                              +{user.change24h.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

