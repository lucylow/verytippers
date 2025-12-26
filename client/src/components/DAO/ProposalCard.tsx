// src/components/DAO/ProposalCard.tsx - Proposal Card Component
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProposalInfo } from '@/services/dao';
import { ethers } from 'ethers';
import { Clock, User, Vote, CheckCircle2, XCircle, Minus, TrendingUp, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProposalCardProps {
  proposal: ProposalInfo;
  onViewDetails?: (proposalId: bigint) => void;
  currentBlock?: number;
  blockTime?: number; // seconds per block
}

const PROPOSAL_STATES = [
  'Pending',
  'Active',
  'Canceled',
  'Defeated',
  'Succeeded',
  'Queued',
  'Expired',
  'Executed'
];

const STATE_COLORS: Record<number, string> = {
  0: 'bg-slate-500',
  1: 'bg-blue-500',
  2: 'bg-gray-500',
  3: 'bg-red-500',
  4: 'bg-green-500',
  5: 'bg-yellow-500',
  6: 'bg-gray-400',
  7: 'bg-emerald-600'
};

export function ProposalCard({ proposal, onViewDetails, currentBlock, blockTime = 12 }: ProposalCardProps) {
  const stateName = PROPOSAL_STATES[proposal.state] || 'Unknown';
  const stateColor = STATE_COLORS[proposal.state] || 'bg-gray-500';

  // Calculate time remaining or elapsed
  const getTimeInfo = () => {
    if (!currentBlock) return null;
    
    const current = BigInt(currentBlock);
    if (current < proposal.startBlock) {
      const blocksRemaining = Number(proposal.startBlock - current);
      const secondsRemaining = blocksRemaining * blockTime;
      return {
        type: 'pending' as const,
        text: `Starts in ${formatDistanceToNow(new Date(Date.now() + secondsRemaining * 1000), { addSuffix: true })}`,
        icon: Clock
      };
    } else if (current <= proposal.endBlock) {
      const blocksRemaining = Number(proposal.endBlock - current);
      const secondsRemaining = blocksRemaining * blockTime;
      return {
        type: 'active' as const,
        text: `${formatDistanceToNow(new Date(Date.now() + secondsRemaining * 1000), { addSuffix: true })}`,
        icon: Clock
      };
    } else {
      return {
        type: 'ended' as const,
        text: `Ended ${formatDistanceToNow(new Date(Date.now() - Number(proposal.endBlock - proposal.startBlock) * blockTime * 1000), { addSuffix: true })}`,
        icon: CheckCircle2
      };
    }
  };

  const timeInfo = getTimeInfo();
  const TimeIcon = timeInfo?.icon || Clock;

  // Format description (first 150 chars)
  const description = proposal.description.length > 150 
    ? proposal.description.substring(0, 150) + '...'
    : proposal.description;

  // Calculate vote percentages
  const totalVotes = (proposal.votesFor || BigInt(0)) + 
                     (proposal.votesAgainst || BigInt(0)) + 
                     (proposal.votesAbstain || BigInt(0));
  const forPercent = totalVotes > 0 
    ? Number((proposal.votesFor || BigInt(0)) * BigInt(100) / totalVotes)
    : 0;

  return (
    <Card className="hover:shadow-lg transition-all cursor-pointer border-slate-700 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={stateColor}>
                {stateName}
              </Badge>
              {proposal.hasVoted && (
                <Badge variant="outline" className="border-green-500 text-green-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Voted
                </Badge>
              )}
              {proposal.tipsBoost && proposal.tipsBoost > BigInt(0) && (
                <Badge variant="outline" className="border-purple-500 text-purple-400">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Tipped
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg mb-1">Proposal #{proposal.proposalId.toString()}</CardTitle>
            <CardDescription className="line-clamp-2 text-slate-400">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Proposer Info */}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <User className="w-4 h-4" />
            <span className="font-mono text-xs">
              {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
            </span>
          </div>

          {/* Time Info */}
          {timeInfo && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <TimeIcon className={`w-4 h-4 ${timeInfo.type === 'active' ? 'text-blue-400' : ''}`} />
              <span>{timeInfo.text}</span>
            </div>
          )}

          {/* Vote Progress */}
          {totalVotes > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Votes</span>
                <span>{ethers.formatEther(totalVotes)}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${forPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-green-400 flex items-center gap-1">
                    <Vote className="w-3 h-3" />
                    {ethers.formatEther(proposal.votesFor || BigInt(0))}
                  </span>
                  <span className="text-red-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {ethers.formatEther(proposal.votesAgainst || BigInt(0))}
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Minus className="w-3 h-3" />
                    {ethers.formatEther(proposal.votesAbstain || BigInt(0))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quorum Info */}
          {proposal.quorum && (
            <div className="text-xs text-slate-500">
              Quorum: {ethers.formatEther(proposal.quorum)}
            </div>
          )}
        </div>
      </CardContent>

      {onViewDetails && (
        <CardFooter>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onViewDetails(proposal.proposalId)}
          >
            View Details
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

