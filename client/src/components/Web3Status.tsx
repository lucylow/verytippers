/**
 * Web3 Status Component
 * Displays wallet connection status, balance, and gas budget
 */

import { useWeb3 } from '@/hooks/useWeb3';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, RefreshCw, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

export function Web3Status() {
  const {
    isConnected,
    address,
    isCorrectNetwork,
    networkName,
    veryBalance,
    nativeBalance,
    gasBudget,
    isLoading,
    error,
    connect,
    switchNetwork,
    refreshBalances
  } = useWeb3();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading Web3...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Connect Wallet
          </CardTitle>
          <CardDescription>
            Connect your wallet to start tipping on Very Chain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={connect} className="w-full">
            <Wallet className="w-4 h-4 mr-2" />
            Connect Wallet
          </Button>
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Wallet Status
        </CardTitle>
        <CardDescription>
          {address && (
            <span className="font-mono text-xs">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Network</span>
          <div className="flex items-center gap-2">
            {isCorrectNetwork ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {networkName}
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                Wrong Network
              </Badge>
            )}
          </div>
        </div>

        {!isCorrectNetwork && (
          <Button onClick={switchNetwork} variant="outline" size="sm" className="w-full">
            Switch to Very Chain
          </Button>
        )}

        {/* Balances */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">VERY Balance</span>
            <span className="font-semibold">
              {veryBalance ? veryBalance.formatted : '0.00'} VERY
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Native Balance</span>
            <span className="font-semibold">
              {nativeBalance ? nativeBalance.toFixed(4) : '0.0000'} VERY
            </span>
          </div>
        </div>

        {/* Gas Budget */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Gas Sponsored
            </span>
            <span className="text-sm font-semibold">
              ${gasBudget.remainingUSD.toFixed(2)} / ${gasBudget.totalBudgetUSD.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{
                width: `${(gasBudget.remainingUSD / gasBudget.totalBudgetUSD) * 100}%`
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {gasBudget.transactionsCount} transactions sponsored
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={refreshBalances} variant="outline" size="sm" className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

