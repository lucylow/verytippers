// src/components/DAO/DAOActivityFeed.tsx - DAO Activity Feed Component
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Vote, FileText, TrendingUp, Clock, User } from 'lucide-react';
import { ethers } from 'ethers';
import { formatDistanceToNow } from 'date-fns';
import { ProposalInfo, VoteInfo, DAOService } from '@/services/dao';

interface DAOActivityFeedProps {
  daoService: DAOService;
  address?: string;
  limit?: number;
}

interface ActivityItem {
  type: 'proposal' | 'vote';
  id: string;
  timestamp: number;
  proposalId: bigint;
  user: string;
  description: string;
  metadata?: any;
}

export function DAOActivityFeed({ daoService, address, limit = 20 }: DAOActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [daoService, address]);

  const loadActivities = async () => {
    setIsLoading(true);
    
    try {
      // Load recent proposals
      const proposals = await daoService.getAllProposals(limit);
      
      // Load voting history if address provided
      let votes: VoteInfo[] = [];
      if (address) {
        try {
          votes = await daoService.getVotingHistory(address, limit);
        } catch (err) {
          console.warn('Failed to load voting history:', err);
        }
      }

      // Combine and sort activities
      const activitiesList: ActivityItem[] = [];

      // Add proposals
      for (const proposal of proposals) {
        try {
          const block = await daoService['provider']?.getBlock(Number(proposal.startBlock));
          activitiesList.push({
            type: 'proposal',
            id: `proposal-${proposal.proposalId}`,
            timestamp: block?.timestamp || Date.now() / 1000,
            proposalId: proposal.proposalId,
            user: proposal.proposer,
            description: proposal.description.length > 100 
              ? proposal.description.substring(0, 100) + '...'
              : proposal.description,
            metadata: {
              state: proposal.state,
              tipsBoost: proposal.tipsBoost
            }
          });
        } catch (err) {
          console.warn('Failed to process proposal:', err);
        }
      }

      // Add votes
      for (const vote of votes) {
        activitiesList.push({
          type: 'vote',
          id: `vote-${vote.proposalId}-${vote.voter}`,
          timestamp: vote.timestamp || Date.now() / 1000,
          proposalId: vote.proposalId,
          user: vote.voter,
          description: vote.reason || 'Voted on proposal',
          metadata: {
            support: vote.support,
            weight: vote.weight
          }
        });
      }

      // Sort by timestamp (newest first)
      activitiesList.sort((a, b) => b.timestamp - a.timestamp);
      
      // Limit results
      setActivities(activitiesList.slice(0, limit));
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getVoteLabel = (support: 0 | 1 | 2) => {
    switch (support) {
      case 1:
        return { text: 'For', color: 'bg-green-500' };
      case 0:
        return { text: 'Against', color: 'bg-red-500' };
      case 2:
        return { text: 'Abstain', color: 'bg-gray-500' };
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest proposals and votes in the DAO
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p className="text-slate-400">Loading activity...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div className={`p-2 rounded-lg ${
                  activity.type === 'proposal' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {activity.type === 'proposal' ? (
                    <FileText className="w-4 h-4" />
                  ) : (
                    <Vote className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">
                      {activity.type === 'proposal' ? 'Proposal Created' : 'Vote Cast'}
                    </span>
                    {activity.type === 'vote' && activity.metadata?.support !== undefined && (
                      <Badge className={getVoteLabel(activity.metadata.support as 0 | 1 | 2).color}>
                        {getVoteLabel(activity.metadata.support as 0 | 1 | 2).text}
                      </Badge>
                    )}
                    {activity.type === 'proposal' && activity.metadata?.tipsBoost && 
                     activity.metadata.tipsBoost > BigInt(0) && (
                      <Badge variant="outline" className="border-purple-500 text-purple-400 text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Tipped
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-slate-300 mb-2 line-clamp-2">
                    {activity.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {activity.user.slice(0, 6)}...{activity.user.slice(-4)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(activity.timestamp * 1000), { addSuffix: true })}
                    </span>
                    <span className="text-blue-400">
                      #{activity.proposalId.toString()}
                    </span>
                  </div>

                  {activity.type === 'vote' && activity.metadata?.weight && (
                    <div className="mt-2 text-xs text-slate-500">
                      Voting Power: {ethers.formatEther(activity.metadata.weight)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

