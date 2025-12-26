// src/components/DAO/CommunityLeaderboard.tsx - Community Leaderboard Component
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trophy, TrendingUp, Users, Award, Vote } from 'lucide-react';
import { ethers } from 'ethers';
import { DAOService } from '@/services/dao';
import { useVeryTippers } from '@/hooks/useVeryTippers';

interface LeaderboardEntry {
  address: string;
  tokenPower: bigint;
  nftPower: bigint;
  tipsPower: bigint;
  totalPower: bigint;
  rank: number;
  tipsReceived?: bigint;
}

interface CommunityLeaderboardProps {
  daoService: DAOService;
  limit?: number;
}

export function CommunityLeaderboard({ daoService, limit = 50 }: CommunityLeaderboardProps) {
  const { address } = useVeryTippers();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'total' | 'tokens' | 'tips'>('total');
  const [knownAddresses, setKnownAddresses] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadLeaderboard();
  }, [daoService, sortBy]);

  // Note: In production, this should use an indexer or backend API
  // This is a simplified version that attempts to fetch from events
  const loadLeaderboard = async () => {
    setIsLoading(true);
    
    try {
      // Get proposal creators (they have voting power)
      const proposals = await daoService.getAllProposals(100);
      const addresses = new Set<string>();
      
      // Collect addresses from proposals
      proposals.forEach(p => {
        addresses.add(p.proposer.toLowerCase());
      });

      // Fetch voting power for each address
      const leaderboardData: LeaderboardEntry[] = [];
      
      for (const addr of Array.from(addresses).slice(0, limit)) {
        try {
          const power = await daoService.getVoterPower(addr);
          const tips = await daoService.getMemberTipsReceived(addr);
          
          if (power.totalPower > 0n) {
            leaderboardData.push({
              address: addr,
              tokenPower: power.tokenPower,
              nftPower: power.nftPower,
              tipsPower: power.tipsPower,
              totalPower: power.totalPower,
              rank: 0,
              tipsReceived: tips
            });
          }
        } catch (err) {
          console.warn(`Failed to fetch power for ${addr}:`, err);
        }
      }

      // Sort by selected criteria
      leaderboardData.sort((a, b) => {
        switch (sortBy) {
          case 'total':
            return Number(b.totalPower - a.totalPower);
          case 'tokens':
            return Number(b.tokenPower - a.tokenPower);
          case 'tips':
            return Number((b.tipsReceived || BigInt(0)) - (a.tipsReceived || BigInt(0)));
          default:
            return 0;
        }
      });

      // Assign ranks
      leaderboardData.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      setEntries(leaderboardData);
      setKnownAddresses(addresses);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Trophy className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Trophy className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-slate-500 font-semibold">#{rank}</span>;
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Community Leaderboard
            </CardTitle>
            <CardDescription>
              Top contributors by voting power
            </CardDescription>
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total">Total Power</SelectItem>
              <SelectItem value="tokens">Token Power</SelectItem>
              <SelectItem value="tips">Tips Received</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p className="text-slate-400">Loading leaderboard...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No leaderboard data available</p>
            <p className="text-sm text-slate-500 mt-2">
              Start participating in governance to appear on the leaderboard!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 20).map((entry) => {
              const isCurrentUser = address?.toLowerCase() === entry.address.toLowerCase();
              
              return (
                <div
                  key={entry.address}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    isCurrentUser
                      ? 'bg-blue-500/20 border border-blue-500/50'
                      : 'bg-slate-800/50 hover:bg-slate-800'
                  }`}
                >
                  <div className="w-8 flex items-center justify-center">
                    {getRankIcon(entry.rank)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-sm ${isCurrentUser ? 'text-blue-400 font-semibold' : 'text-slate-300'}`}>
                        {formatAddress(entry.address)}
                      </span>
                      {isCurrentUser && (
                        <Badge variant="outline" className="border-blue-500 text-blue-400 text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Vote className="w-3 h-3" />
                        {ethers.formatEther(entry.totalPower)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {ethers.formatEther(entry.tokenPower)} tokens
                      </span>
                      {entry.tipsReceived !== undefined && entry.tipsReceived > 0n && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {ethers.formatEther(entry.tipsReceived)} VERY
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Power Breakdown Bar */}
                  <div className="hidden md:flex items-center gap-1 w-32">
                    <div 
                      className="h-2 bg-cyan-500 rounded-l"
                      style={{ width: `${entry.tokenPower > 0n ? Number(entry.tokenPower * BigInt(100) / entry.totalPower) : 0}%` }}
                      title="Token Power"
                    />
                    <div 
                      className="h-2 bg-emerald-500"
                      style={{ width: `${entry.nftPower > 0n ? Number(entry.nftPower * BigInt(100) / entry.totalPower) : 0}%` }}
                      title="NFT Power"
                    />
                    <div 
                      className="h-2 bg-purple-500 rounded-r"
                      style={{ width: `${entry.tipsPower > 0n ? Number(entry.tipsPower * BigInt(100) / entry.totalPower) : 0}%` }}
                      title="Tips Power"
                    />
                  </div>
                </div>
              );
            })}

            {entries.length > 20 && (
              <div className="text-center pt-4 text-sm text-slate-400">
                Showing top 20 of {entries.length} members
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

