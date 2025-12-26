// src/components/DAO/ProposalDetail.tsx - Proposal Detail Component
import { useState, useEffect } from 'react';
import { ProposalInfo, DAOService, VoterPower } from '@/services/dao';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Vote, CheckCircle2, XCircle, Minus, ArrowLeft, Clock, User, TrendingUp } from 'lucide-react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ProposalDetailProps {
  proposalId: bigint;
  daoService: DAOService;
  onBack?: () => void;
  currentBlock?: number;
  votingPower?: VoterPower;
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

export function ProposalDetail({ 
  proposalId, 
  daoService, 
  onBack,
  currentBlock,
  votingPower
}: ProposalDetailProps) {
  const [proposal, setProposal] = useState<ProposalInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [voteReason, setVoteReason] = useState('');
  const [selectedVote, setSelectedVote] = useState<0 | 1 | 2 | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProposal();
  }, [proposalId, daoService]);

  const loadProposal = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const proposalData = await daoService.getProposalInfo(proposalId);
      const votes = await daoService.getProposalVotes(proposalId);
      
      setProposal({
        ...proposalData,
        votesFor: votes.for,
        votesAgainst: votes.against,
        votesAbstain: votes.abstain,
        quorum: votes.quorum
      });
    } catch (err) {
      console.error('Failed to load proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to load proposal');
      toast.error('Failed to load proposal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async () => {
    if (selectedVote === null || !proposal) return;
    
    setIsVoting(true);
    setError(null);
    
    try {
      await daoService.castVote(proposalId, selectedVote, voteReason.trim() || undefined);
      toast.success('Vote cast successfully!');
      setVoteReason('');
      setSelectedVote(null);
      await loadProposal(); // Refresh proposal data
    } catch (err) {
      console.error('Failed to cast vote:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to cast vote';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsVoting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p className="text-slate-400">Loading proposal...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!proposal) {
    return (
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-slate-400 mb-4">Proposal not found</p>
            {onBack && (
              <Button onClick={onBack} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Proposals
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stateName = PROPOSAL_STATES[proposal.state] || 'Unknown';
  const isActive = proposal.state === 1;
  const canVote = isActive && !proposal.hasVoted && votingPower && votingPower.totalPower > 0n;
  const totalVotes = (proposal.votesFor || BigInt(0)) + 
                     (proposal.votesAgainst || BigInt(0)) + 
                     (proposal.votesAbstain || BigInt(0));
  const forPercent = totalVotes > 0 
    ? Number((proposal.votesFor || BigInt(0)) * BigInt(100) / totalVotes)
    : 0;
  const againstPercent = totalVotes > 0 
    ? Number((proposal.votesAgainst || BigInt(0)) * BigInt(100) / totalVotes)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge>{stateName}</Badge>
            {proposal.hasVoted && (
              <Badge variant="outline" className="border-green-500 text-green-400">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                You Voted {proposal.userVote === 1 ? 'For' : proposal.userVote === 0 ? 'Against' : 'Abstain'}
              </Badge>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white">Proposal #{proposal.proposalId.toString()}</h2>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-300 whitespace-pre-wrap">{proposal.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Voting Section */}
          {canVote && (
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle>Cast Your Vote</CardTitle>
                <CardDescription>
                  Your voting power: {ethers.formatEther(votingPower!.totalPower)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={selectedVote === 1 ? "default" : "outline"}
                    className={selectedVote === 1 ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => setSelectedVote(1)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    For
                  </Button>
                  <Button
                    variant={selectedVote === 0 ? "default" : "outline"}
                    className={selectedVote === 0 ? "bg-red-600 hover:bg-red-700" : ""}
                    onClick={() => setSelectedVote(0)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Against
                  </Button>
                  <Button
                    variant={selectedVote === 2 ? "default" : "outline"}
                    onClick={() => setSelectedVote(2)}
                  >
                    <Minus className="w-4 h-4 mr-2" />
                    Abstain
                  </Button>
                </div>
                
                <Textarea
                  placeholder="Optional: Explain your vote (visible to community)"
                  value={voteReason}
                  onChange={(e) => setVoteReason(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                  rows={3}
                />
                
                <Button
                  onClick={handleVote}
                  disabled={selectedVote === null || isVoting}
                  className="w-full"
                >
                  {isVoting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Casting Vote...
                    </>
                  ) : (
                    <>
                      <Vote className="w-4 h-4 mr-2" />
                      Cast Vote
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Proposal Details */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">Proposer:</span>
                <span className="font-mono text-slate-300">{proposal.proposer}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">Start Block:</span>
                <span className="font-mono text-slate-300">{proposal.startBlock.toString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">End Block:</span>
                <span className="font-mono text-slate-300">{proposal.endBlock.toString()}</span>
              </div>
              {proposal.tipsBoost && proposal.tipsBoost > BigInt(0) && (
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-400">Tips Boost:</span>
                  <span className="text-purple-400">{ethers.formatEther(proposal.tipsBoost)} VERY</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Voting Results */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle>Voting Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    For
                  </span>
                  <span className="text-white font-semibold">
                    {ethers.formatEther(proposal.votesFor || BigInt(0))} ({forPercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${forPercent}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-400 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    Against
                  </span>
                  <span className="text-white font-semibold">
                    {ethers.formatEther(proposal.votesAgainst || BigInt(0))} ({againstPercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${againstPercent}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Minus className="w-4 h-4" />
                    Abstain
                  </span>
                  <span className="text-white font-semibold">
                    {ethers.formatEther(proposal.votesAbstain || BigInt(0))}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Total Votes</span>
                  <span className="text-white font-semibold">
                    {ethers.formatEther(totalVotes)}
                  </span>
                </div>
                {proposal.quorum && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-slate-400">Quorum</span>
                    <span className="text-white font-semibold">
                      {ethers.formatEther(proposal.quorum)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {proposal.state === 4 && (
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full mb-2"
                  onClick={async () => {
                    try {
                      await daoService.queueProposal(proposalId);
                      toast.success('Proposal queued!');
                    } catch (err) {
                      toast.error('Failed to queue proposal');
                    }
                  }}
                >
                  Queue Proposal
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

