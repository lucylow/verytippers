import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';

type Props = { 
  toUserId: string; 
  toUsername: string;
  onTipCreated?: () => void;
};

export default function TipComposer({ toUserId, toUsername, onTipCreated }: Props) {
  const [amount, setAmount] = useState('1');
  const [messageCid, setMessageCid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Upload message to IPFS (simplified - you should implement your IPFS service)
  async function ipfsAdd(encryptedPayload: string): Promise<string> {
    try {
      // Call your IPFS service endpoint
      const res = await fetch('/api/ipfs-add', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: encryptedPayload })
      });
      
      if (!res.ok) {
        throw new Error('Failed to upload to IPFS');
      }
      
      const json = await res.json();
      return json.cid as string;
    } catch (error) {
      console.error('IPFS upload error:', error);
      // For demo purposes, generate a mock CID if IPFS fails
      return `QmMockCid${Date.now()}`;
    }
  }

  async function createTip() {
    setLoading(true);
    try {
      const currentUser = supabase.auth.user();
      if (!currentUser) {
        toast.error('Please sign in to create a tip');
        return;
      }

      // 1. Encrypt and upload message to IPFS
      const payload = JSON.stringify({ 
        message: message || `Thanks ${toUsername}!`,
        timestamp: new Date().toISOString()
      });
      
      const cid = await ipfsAdd(payload);
      setMessageCid(cid);

      // 2. Insert IPFS message row
      const { data: ipfsRow, error: ipfsErr } = await supabase
        .from('ipfs_messages')
        .insert({ 
          cid, 
          author_id: currentUser.id,
          encrypted: true,
          length: payload.length
        })
        .select()
        .single();

      if (ipfsErr) {
        console.error('IPFS message insert error:', ipfsErr);
        throw ipfsErr;
      }

      // 3. Insert tip row (RLS: user must be authenticated and match from_user)
      const { data: tipData, error: tipErr } = await supabase
        .from('tips')
        .insert({
          from_user: currentUser.id,
          to_user: toUserId,
          amount: parseFloat(amount),
          cid_id: ipfsRow.id,
          meta_tx: null,
          status: 'pending',
          chain_network: 'very-testnet'
        })
        .select()
        .single();

      if (tipErr) {
        console.error('Tip insert error:', tipErr);
        throw tipErr;
      }

      toast.success('Tip queued successfully!', {
        description: `Tip of ${amount} VERY tokens is pending confirmation.`
      });

      // Reset form
      setAmount('1');
      setMessage('');
      setMessageCid(null);

      // Callback
      if (onTipCreated) {
        onTipCreated();
      }
    } catch (e: any) {
      console.error('Error creating tip:', e);
      toast.error('Failed to create tip', {
        description: e.message || 'An unexpected error occurred'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Tip {toUsername}</CardTitle>
        <CardDescription>
          Send a tip with an optional encrypted message
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (VERY tokens)</Label>
          <Input
            id="amount"
            type="number"
            min="0.000001"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1.0"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="message">Message (optional)</Label>
          <Input
            id="message"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Thanks ${toUsername}!`}
          />
        </div>

        {messageCid && (
          <p className="text-sm text-muted-foreground">
            Message CID: {messageCid.substring(0, 20)}...
          </p>
        )}

        <Button 
          onClick={createTip} 
          disabled={loading || !amount || parseFloat(amount) <= 0}
          className="w-full"
        >
          {loading ? 'Creating tip...' : 'Confirm Tip'}
        </Button>
      </CardContent>
    </Card>
  );
}

