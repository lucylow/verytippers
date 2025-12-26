/**
 * VERY Token Ecosystem Dashboard
 * Displays complete token ecosystem: balance, reputation, staking, governance
 */

import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useVeryToken } from '@/hooks/useVeryToken';
import { useVeryReputation } from '@/hooks/useVeryReputation';
import { useVeryStake } from '@/hooks/useVeryStake';
import { useVeryGovernor } from '@/hooks/useVeryGovernor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, 
  TrendingUp, 
  Lock, 
  Vote, 
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { toast } from 'sonner';

export function VeryEcosystem() {
  const { isConnected, address } = useWallet();
  const { balance, refreshBalance } = useVeryToken();
  const { reputation, refreshReputation } = useVeryReputation();
  const { stakeData, stake, unstake, refreshStake } = useVeryStake();
  const { votingPower, refreshVotingPower } = useVeryGovernor();

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsStaking(true);
    try {
      const result = await stake(parseFloat(stakeAmount));
      if (result.success) {
        toast.success('Successfully staked tokens!');
        setStakeAmount('');
        await refreshStake();
        await refreshBalance();
      } else {
        toast.error(result.error || 'Failed to stake tokens');
      }
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsUnstaking(true);
    try {
      const result = await unstake(parseFloat(unstakeAmount));
      if (result.success) {
        toast.success('Successfully unstaked tokens!');
        setUnstakeAmount('');
        await refreshStake();
        await refreshBalance();
      } else {
        toast.error(result.error || 'Failed to unstake tokens');
      }
    } finally {
      setIsUnstaking(false);
    }
  };

  const handleRefreshAll = async () => {
    await Promise.all([
      refreshBalance(),
      refreshReputation(),
      refreshStake(),
      refreshVotingPower()
    ]);
    toast.success('All data refreshed');
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>VERY Token Ecosystem</CardTitle>
          <CardDescription>Connect your wallet to view your token ecosystem</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">$VERY Token Ecosystem</h2>
          <p className="text-muted-foreground">
            Your complete token utility dashboard
          </p>
        </div>
        <Button onClick={handleRefreshAll} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Token Balance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Token Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balance ? `${parseFloat(balance.formatted).toFixed(2)}` : '0.00'} VERY
            </div>
          </CardContent>
        </Card>

        {/* Reputation Multiplier */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Reputation Multiplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reputation?.multiplierFormatted || '1.0x'}
            </div>
            {reputation && (
              <p className="text-xs text-muted-foreground mt-1">
                {reputation.receivedFormatted} VERY received
              </p>
            )}
          </CardContent>
        </Card>

        {/* Staking Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Staking Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stakeData ? stakeData.stakedFormatted : '0.00'} VERY
            </div>
            {stakeData && (
              <Badge 
                variant={stakeData.canTip ? "default" : "secondary"} 
                className="mt-1"
              >
                {stakeData.canTip ? 'Can Tip' : 'Stake Required'}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Voting Power */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Vote className="w-4 h-4" />
              Voting Power
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {votingPower ? votingPower.totalPowerFormatted : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Governance weight</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="reputation" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reputation">Reputation</TabsTrigger>
          <TabsTrigger value="staking">Staking</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
        </TabsList>

        {/* Reputation Tab */}
        <TabsContent value="reputation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Reputation & Multipliers
              </CardTitle>
              <CardDescription>
                Your tipping history and reputation-based multipliers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reputation ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <Label className="text-muted-foreground">Lifetime Tipped</Label>
                      <p className="text-2xl font-bold mt-1">
                        {reputation.tippedFormatted} VERY
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <Label className="text-muted-foreground">Lifetime Received</Label>
                      <p className="text-2xl font-bold mt-1">
                        {reputation.receivedFormatted} VERY
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-muted-foreground">Current Multiplier</Label>
                        <p className="text-3xl font-bold mt-1">{reputation.multiplierFormatted}</p>
                      </div>
                      <Badge variant="default" className="text-lg px-4 py-2">
                        {reputation.multiplier >= 150 ? 'Legendary' : 
                         reputation.multiplier >= 120 ? 'Epic' : 'Base'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {reputation.multiplier >= 150 
                        ? '10,000+ VERY received - Maximum multiplier unlocked!'
                        : reputation.multiplier >= 120
                        ? '1,000+ VERY received - Epic tier unlocked!'
                        : 'Keep tipping to unlock higher multipliers'}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Loading reputation data...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staking Tab */}
        <TabsContent value="staking">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Staking & Anti-Spam
              </CardTitle>
              <CardDescription>
                Stake VERY tokens to unlock tipping capacity and prevent spam
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {stakeData ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <Label className="text-muted-foreground">Staked Amount</Label>
                      <p className="text-2xl font-bold mt-1">
                        {stakeData.stakedFormatted} VERY
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <Label className="text-muted-foreground">Minimum Required</Label>
                      <p className="text-2xl font-bold mt-1">
                        {stakeData.minStakeFormatted} VERY
                      </p>
                    </div>
                  </div>
                  {stakeData.needsMoreStake && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ You need to stake more tokens to unlock tipping. Current progress: {stakeData.stakeProgress.toFixed(1)}%
                      </p>
                      <div className="mt-2 w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-2">
                        <div 
                          className="bg-yellow-600 dark:bg-yellow-400 h-2 rounded-full transition-all"
                          style={{ width: `${stakeData.stakeProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Stake VERY Tokens</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Amount to stake"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                        />
                        <Button 
                          onClick={handleStake} 
                          disabled={isStaking}
                        >
                          <ArrowDownRight className="w-4 h-4 mr-2" />
                          Stake
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Unstake VERY Tokens</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Amount to unstake"
                          value={unstakeAmount}
                          onChange={(e) => setUnstakeAmount(e.target.value)}
                        />
                        <Button 
                          onClick={handleUnstake} 
                          disabled={isUnstaking}
                          variant="outline"
                        >
                          <ArrowUpRight className="w-4 h-4 mr-2" />
                          Unstake
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Loading staking data...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Governance Tab */}
        <TabsContent value="governance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Vote className="w-5 h-5" />
                Governance Power
              </CardTitle>
              <CardDescription>
                Your voting power in the VeryTippers DAO
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {votingPower ? (
                <>
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <Label className="text-muted-foreground">Total Voting Power</Label>
                    <p className="text-3xl font-bold mt-1">
                      {votingPower.totalPowerFormatted}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <Label className="text-muted-foreground text-xs">Token Balance</Label>
                      <p className="text-xl font-bold mt-1">
                        {votingPower.tokenPowerFormatted}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {votingPower.breakdown.tokenPercentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <Label className="text-muted-foreground text-xs">Reputation</Label>
                      <p className="text-xl font-bold mt-1">
                        {votingPower.repPowerFormatted}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {votingPower.breakdown.repPercentage.toFixed(1)}% (Received × 100)
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <Label className="text-muted-foreground text-xs">NFT Boost</Label>
                      <p className="text-xl font-bold mt-1">
                        {votingPower.nftPowerFormatted}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {votingPower.breakdown.nftPercentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Formula:</strong> Voting Power = Token Balance + (Lifetime Received × 100) + NFT Multiplier
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      This system rewards contribution (tips received) over pure whale dominance.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Loading governance data...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

