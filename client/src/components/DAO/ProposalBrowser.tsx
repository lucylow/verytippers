// src/components/DAO/ProposalBrowser.tsx - Proposal Browser Component
import { useState, useEffect } from 'react';
import { ProposalCard } from './ProposalCard';
import { ProposalInfo, DAOService } from '@/services/dao';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Plus, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface ProposalBrowserProps {
  daoService: DAOService;
  onCreateProposal?: () => void;
  onViewProposal?: (proposalId: bigint) => void;
  currentBlock?: number;
}

export function ProposalBrowser({ 
  daoService, 
  onCreateProposal,
  onViewProposal,
  currentBlock 
}: ProposalBrowserProps) {
  const [proposals, setProposals] = useState<ProposalInfo[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<ProposalInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'ending'>('newest');

  useEffect(() => {
    loadProposals();
  }, [daoService]);

  useEffect(() => {
    filterAndSortProposals();
  }, [proposals, searchQuery, filterState, sortBy]);

  const loadProposals = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const allProposals = await daoService.getAllProposals(50);
      setProposals(allProposals);
    } catch (err) {
      console.error('Failed to load proposals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load proposals');
      toast.error('Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortProposals = () => {
    let filtered = [...proposals];

    // Filter by state
    if (filterState !== 'all') {
      const stateNum = parseInt(filterState);
      filtered = filtered.filter(p => p.state === stateNum);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.description.toLowerCase().includes(query) ||
        p.proposalId.toString().includes(query) ||
        p.proposer.toLowerCase().includes(query)
      );
    }

    // Sort proposals
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return Number(b.proposalId - a.proposalId);
        case 'oldest':
          return Number(a.proposalId - b.proposalId);
        case 'ending':
          return Number(a.endBlock - b.endBlock);
        default:
          return 0;
      }
    });

    setFilteredProposals(filtered);
  };

  const handleViewProposal = (proposalId: bigint) => {
    if (onViewProposal) {
      onViewProposal(proposalId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Proposals</h2>
          <p className="text-sm text-slate-400 mt-1">
            Browse and vote on governance proposals
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProposals}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {onCreateProposal && (
            <Button
              size="sm"
              onClick={onCreateProposal}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Proposal
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search proposals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700"
              />
            </div>
            
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="0">Pending</SelectItem>
                <SelectItem value="1">Active</SelectItem>
                <SelectItem value="2">Canceled</SelectItem>
                <SelectItem value="3">Defeated</SelectItem>
                <SelectItem value="4">Succeeded</SelectItem>
                <SelectItem value="5">Queued</SelectItem>
                <SelectItem value="6">Expired</SelectItem>
                <SelectItem value="7">Executed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="ending">Ending Soon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {isLoading && proposals.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
              <p className="text-slate-400">Loading proposals...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proposals Grid */}
      {!isLoading && filteredProposals.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-slate-400 mb-4">No proposals found</p>
              {onCreateProposal && (
                <Button onClick={onCreateProposal} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Proposal
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && filteredProposals.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.proposalId.toString()}
              proposal={proposal}
              onViewDetails={handleViewProposal}
              currentBlock={currentBlock}
            />
          ))}
        </div>
      )}

      {/* Stats */}
      {proposals.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Showing {filteredProposals.length} of {proposals.length} proposals</span>
              <span>
                {proposals.filter(p => p.state === 1).length} active
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

