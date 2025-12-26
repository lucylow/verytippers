/**
 * VERY Token Operations Component
 * Demonstrates how to use VERY token web3 operations
 */

import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useVeryToken } from '@/hooks/useVeryToken';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CONTRACTS } from '@/lib/web3/config';

export function VeryTokenOperations() {
  const { isConnected, address } = useWallet();
  const {
    tokenInfo,
    balance,
    isLoading,
    error,
    transfer,
    approve,
    getAllowance,
    refreshBalance
  } = useVeryToken();

  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const [approveSpender, setApproveSpender] = useState(CONTRACTS.tipRouter.address);
  const [approveAmount, setApproveAmount] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [allowance, setAllowance] = useState<string | null>(null);
  const [isLoadingAllowance, setIsLoadingAllowance] = useState(false);

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount) {
      toast.error('Please fill in all fields');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsTransferring(true);
    try {
      const result = await transfer(transferTo, amount);
      if (result.success) {
        toast.success(`Successfully transferred ${amount} VERY tokens!`);
        setTransferTo('');
        setTransferAmount('');
        await refreshBalance();
      } else {
        toast.error(result.error || 'Transfer failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleApprove = async () => {
    if (!approveSpender) {
      toast.error('Please enter a spender address');
      return;
    }

    const amount = approveAmount === 'max' ? 'max' : parseFloat(approveAmount);
    if (amount !== 'max' && (isNaN(amount as number) || (amount as number) <= 0)) {
      toast.error('Please enter a valid amount or "max"');
      return;
    }

    setIsApproving(true);
    try {
      const result = await approve(approveSpender, amount);
      if (result.success) {
        toast.success(`Successfully approved ${amount === 'max' ? 'maximum' : amount} VERY tokens!`);
        setApproveAmount('');
        // Refresh allowance
        await loadAllowance();
      } else {
        toast.error(result.error || 'Approve failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Approve failed');
    } finally {
      setIsApproving(false);
    }
  };

  const loadAllowance = async () => {
    if (!approveSpender) return;
    setIsLoadingAllowance(true);
    try {
      const result = await getAllowance(approveSpender);
      setAllowance(result.allowance);
    } catch (error) {
      console.error('Failed to load allowance:', error);
    } finally {
      setIsLoadingAllowance(false);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>VERY Token Operations</CardTitle>
          <CardDescription>Connect your wallet to use VERY token operations</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Token Info */}
      <Card>
        <CardHeader>
          <CardTitle>VERY Token Information</CardTitle>
          <CardDescription>Token details and your balance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tokenInfo && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{tokenInfo.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Symbol</Label>
                <p className="font-medium">{tokenInfo.symbol}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Decimals</Label>
                <p className="font-medium">{tokenInfo.decimals}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Total Supply</Label>
                <p className="font-medium">{parseFloat(tokenInfo.totalSupply).toLocaleString()} {tokenInfo.symbol}</p>
              </div>
            </div>
          )}
          {balance && (
            <div className="pt-4 border-t">
              <Label className="text-muted-foreground">Your Balance</Label>
              <p className="text-2xl font-bold">{balance.formatted} {balance.symbol}</p>
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
          <Button onClick={refreshBalance} variant="outline" size="sm">
            Refresh Balance
          </Button>
        </CardContent>
      </Card>

      {/* Transfer */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer VERY Tokens</CardTitle>
          <CardDescription>Send VERY tokens directly to another address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transfer-to">Recipient Address</Label>
            <Input
              id="transfer-to"
              placeholder="0x..."
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transfer-amount">Amount (VERY)</Label>
            <Input
              id="transfer-amount"
              type="number"
              placeholder="0.0"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
            />
          </div>
          <Button
            onClick={handleTransfer}
            disabled={isTransferring || !transferTo || !transferAmount}
            className="w-full"
          >
            {isTransferring ? 'Transferring...' : 'Transfer'}
          </Button>
        </CardContent>
      </Card>

      {/* Approve */}
      <Card>
        <CardHeader>
          <CardTitle>Approve VERY Tokens</CardTitle>
          <CardDescription>Approve a contract to spend your VERY tokens (e.g., for tipping)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="approve-spender">Spender Address</Label>
            <Input
              id="approve-spender"
              placeholder="0x..."
              value={approveSpender}
              onChange={(e) => setApproveSpender(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Default: Tip Router Contract
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="approve-amount">Amount (VERY) or "max"</Label>
            <Input
              id="approve-amount"
              placeholder="100 or max"
              value={approveAmount}
              onChange={(e) => setApproveAmount(e.target.value)}
            />
          </div>
          {allowance !== null && (
            <div className="p-3 bg-muted rounded-md">
              <Label className="text-muted-foreground">Current Allowance</Label>
              <p className="font-medium">{allowance} VERY</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={isApproving || !approveSpender || !approveAmount}
              className="flex-1"
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
            <Button
              onClick={loadAllowance}
              disabled={isLoadingAllowance || !approveSpender}
              variant="outline"
            >
              {isLoadingAllowance ? 'Loading...' : 'Check Allowance'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Example */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Example</CardTitle>
          <CardDescription>How to use VERY token operations in your code</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
{`import { useVeryToken } from '@/hooks/useVeryToken';
import { useWallet } from '@/contexts/WalletContext';

function MyComponent() {
  const { isConnected } = useWallet();
  const { transfer, approve, balance } = useVeryToken();

  const handleTransfer = async () => {
    const result = await transfer('0x...', 100);
    if (result.success) {
      console.log('Transfer successful!', result.transactionHash);
    }
  };

  const handleApprove = async () => {
    const result = await approve('0xTipContract...', 'max');
    if (result.success) {
      console.log('Approval successful!');
    }
  };

  return (
    <div>
      <p>Balance: {balance?.formatted} VERY</p>
      <button onClick={handleTransfer}>Transfer</button>
      <button onClick={handleApprove}>Approve</button>
    </div>
  );
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

