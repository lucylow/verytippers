// src/components/DAOGovernance.tsx - React Component for DAO Governance
import { useState, useEffect } from 'react';
import { useVeryTippers } from '@/hooks/useVeryTippers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { DAOService, VoterPower, DAOStats } from '@/services/dao';
import { Loader2, TrendingUp, Users, Coins, Award, Vote, AlertCircle, CheckCircle2, FileText, Activity, Trophy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ethers } from 'ethers';
import { ProposalBrowser } from './DAO/ProposalBrowser';
import { ProposalDetail } from './DAO/ProposalDetail';
import { ProposalCreator } from './DAO/ProposalCreator';
import { DAOActivityFeed } from './DAO/DAOActivityFeed';
import { CommunityLeaderboard } from './DAO/CommunityLeaderboard';

export const DAOGovernance: React.FC = () => {
  const { provider, signer, isConnected, address } = useVeryTippers();
  const [daoService, setDaoService] = useState<DAOService | null>(null);
  const [power, setPower] = useState<VoterPower | null>(null);
  const [stats, setStats] = useState<DAOStats | null>(null);
  const [proposalThreshold, setProposalThreshold] = useState<bigint | null>(null);
  const [currentBlock, setCurrentBlock] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberTips, setMemberTips] = useState<bigint | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedProposalId, setSelectedProposalId] = useState<bigint | null>(null);
  const [showCreateProposal, setShowCreateProposal] = useState(false);

  useEffect(() => {
    if (provider && signer && isConnected) {
      const service = new DAOService(provider, signer);
      if (service.isInitialized()) {
        setDaoService(service);
        loadData();
      } else {
        setError('DAO contract not configured. Please set VITE_DAO_CONTRACT_ADDRESS in environment variables.');
      }
    } else {
      setDaoService(null);
      setPower(null);
      setStats(null);
    }
  }, [provider, signer, isConnected]);

  const loadData = async () => {
    if (!daoService || !address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const [powerData, statsData, tipsData, threshold, blockNumber] = await Promise.all([
        daoService.getMyPower(),
        daoService.getDAOStats(),
        daoService.getMemberTipsReceived(),
        daoService.getProposalThreshold().catch(() => null),
        provider?.getBlockNumber().catch(() => undefined)
      ]);
      
      setPower(powerData);
      setStats(statsData);
      setMemberTips(tipsData);
      setProposalThreshold(threshold);
      setCurrentBlock(blockNumber);
    } catch (err) {
      console.error('Failed to load DAO data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load DAO data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProposalCreated = (proposalId: bigint) => {
    setShowCreateProposal(false);
    setSelectedProposalId(proposalId);
    setActiveTab('proposals');
    loadData();
    toast.success(`Proposal #${proposalId.toString()} created!`);
  };

  const handleViewProposal = (proposalId: bigint) => {
    setSelectedProposalId(proposalId);
    setActiveTab('proposals');
  };

  const formatPower = (value: bigint | null | undefined): string => {
    if (!value) return '0';
    try {
      return ethers.formatEther(value);
    } catch {
      return value.toString();
    }
  };

  const formatVERY = (value: bigint | null | undefined): string => {
    if (!value) return '0';
    return ethers.formatEther(value);
  };

  if (!isConnected) {
    return (
      <Card className="p-6 bg-gradient-to-r from-indigo-900/50 to-purple-900/50">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to view DAO governance.
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  if (error && !daoService) {
    return (
      <Card className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-none">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Vote className="w-6 h-6" />
              VeryTippers DAO
            </h3>
            <p className="text-slate-400 text-sm">
              Governance powered by tokens, NFTs, and tips
            </p>
          </div>
          <Button 
            onClick={loadData} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <TrendingUp className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="proposals" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Proposals
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Voting Power Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 transition-colors">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400 mb-2">
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  ) : (
                    formatPower(power?.tokenPower)
                  )}
                </div>
                <div className="text-sm text-slate-400 flex items-center justify-center gap-1">
                  <Coins className="w-4 h-4" />
                  Token Power
                </div>
                {power && (
                  <div className="mt-3 w-full bg-slate-800/50 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (Number(formatPower(power.tokenPower)) / Number(formatPower(power.totalPower))) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400 mb-2">
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  ) : (
                    formatPower(power?.nftPower)
                  )}
                </div>
                <div className="text-sm text-slate-400 flex items-center justify-center gap-1">
                  <Award className="w-4 h-4" />
                  NFT Boost
                </div>
                {power && (
                  <div className="mt-3 w-full bg-slate-800/50 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (Number(formatPower(power.nftPower)) / Number(formatPower(power.totalPower))) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700 hover:border-purple-500/50 transition-colors">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  ) : (
                    formatPower(power?.tipsPower)
                  )}
                </div>
                <div className="text-sm text-slate-400 flex items-center justify-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Tips Boost
                </div>
                {power && (
                  <div className="mt-3 w-full bg-slate-800/50 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (Number(formatPower(power.tipsPower)) / Number(formatPower(power.totalPower))) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 border-none hover:shadow-2xl hover:shadow-purple-500/25 transition-all">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  ) : (
                    formatPower(power?.totalPower)
                  )}
                </div>
                <div className="text-sm text-slate-200 flex items-center justify-center gap-1">
                  <Vote className="w-4 h-4" />
                  Total Power
                </div>
                <div className="mt-3 text-xs text-slate-300">
                  Top 5% • Rank #247
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DAO Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">
                    {formatPower(stats.totalSupply)}
                  </div>
                  <div className="text-xs text-slate-400">Total Supply</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">
                    {formatVERY(stats.treasury)} VERY
                  </div>
                  <div className="text-xs text-slate-400">Treasury</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">
                    {stats.activeProposals.toString()}
                  </div>
                  <div className="text-xs text-slate-400">Active Proposals</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Member Tips Info */}
        {memberTips !== null && (
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Your Tips Received</div>
                  <div className="text-xl font-bold text-white">
                    {formatVERY(memberTips)} VERY
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    = {formatPower((memberTips * BigInt(1000)) / ethers.parseEther('1'))} voting power
                  </div>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voting Power Formula Info */}
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Voting Power Formula</CardTitle>
            <CardDescription className="text-slate-400">
              Your voting power is calculated from multiple sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-cyan-400" />
                <span><strong>Token Power:</strong> Your governance token balance</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <span><strong>NFT Boost:</strong> Common (1x), Rare (2x), Epic (5x), Legendary (10x)</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span><strong>Tips Boost:</strong> 1 VERY tip = 1000 voting power</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Card>
    </div>
  );
};


