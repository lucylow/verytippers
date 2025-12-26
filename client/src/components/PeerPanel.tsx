// src/components/PeerPanel.tsx
import React, { useState } from 'react';
import { usePeerConnection } from '../hooks/usePeerConnection';
import { encryptText, decryptText, generateSymKey } from '../lib/crypto';
import { signMetaPayload } from '../lib/tips';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useWallet } from '../contexts/WalletContext';

interface PeerPanelProps {
  signalingUrl: string;
  roomId: string;
  toAddress?: string;
}

export default function PeerPanel({ 
  signalingUrl, 
  roomId,
  toAddress 
}: PeerPanelProps) {
  const { address, provider } = useWallet();
  const [log, setLog] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [symKey, setSymKey] = useState<CryptoKey | null>(null);
  const [tipAmount, setTipAmount] = useState('5');
  const [recipientAddress, setRecipientAddress] = useState(toAddress || '');

  const append = (s: string) => setLog(l => [...l, s].slice(-200));

  const { connected, createOffer, sendJson, sendFile } = usePeerConnection({
    signalingUrl,
    roomId,
    isInitiator: false,
    onMessage: async (msg: any) => {
      if (msg.type === 'text') {
        // decrypt if ciphertext
        if (msg.encrypted && symKey) {
          try {
            const plain = await decryptText(symKey, msg.data);
            append(`Peer: ${plain}`);
          } catch (err) {
            append(`Peer (encrypted, key needed): ${msg.data.substring(0, 50)}...`);
          }
        } else {
          append(`Peer: ${msg.data}`);
        }
      } else if (msg.type === 'signed-meta') {
        append(`Peer sent meta: ${JSON.stringify(msg.meta).slice(0, 200)}`);
        // Optionally forward to orchestrator or call relayer/submit...
      } else {
        append(`Recv: ${JSON.stringify(msg).slice(0, 200)}`);
      }
    },
    onConnectionState: (s) => append(`pc state: ${s}`),
  });

  async function handleCreateOffer() {
    try {
      await createOffer();
      append('Created offer & sent via signaling');
    } catch (err) {
      append(`Error creating offer: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function sendMessage() {
    if (!sendJson) return;
    try {
      // Example: encrypt message with symmetric key for privacy
      if (!symKey) {
        append('Generating symmetric key for encryption');
        const k = await generateSymKey();
        setSymKey(k);
        // In production, exchange this key securely (ECDH)
      }
      const ciphertext = await encryptText(symKey!, message);
      sendJson({ type: 'text', encrypted: true, data: ciphertext });
      append(`You: ${message}`);
      setMessage('');
    } catch (err) {
      append(`Error sending message: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function handleSignAndSendMeta() {
    if (!provider || !address) {
      append('Error: Wallet not connected');
      return;
    }
    if (!recipientAddress) {
      append('Error: Recipient address required');
      return;
    }
    
    try {
      // Build meta payload and sign locally with ethers.js
      const meta = {
        from: address,
        to: recipientAddress,
        amount: tipAmount,
        timestamp: Date.now(),
        // cid: optional IPFS CID
      };
      
      // sign message (user wallet) - provider is already BrowserProvider
      const { signature } = await signMetaPayload(provider, meta);
      
      sendJson({ type: 'signed-meta', meta, signature });
      append('Signed meta-tx payload sent to peer');
    } catch (err) {
      append(`Error signing meta: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>P2P Connection</CardTitle>
        <div className="text-sm text-muted-foreground">
          Room: {roomId} | Connected: {connected ? 'Yes' : 'No'}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={handleCreateOffer} variant="default">
            Start / Create Offer
          </Button>
        </div>

        <div className="space-y-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi — tip ideas..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button onClick={sendMessage} disabled={!sendJson || !message.trim()}>
            Send Message
          </Button>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="text-sm font-medium">Send Tip Meta-Tx</div>
          <Input
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0xReceiverAddress"
          />
          <Input
            type="number"
            value={tipAmount}
            onChange={(e) => setTipAmount(e.target.value)}
            placeholder="5"
          />
          <Button 
            onClick={handleSignAndSendMeta}
            disabled={!address || !provider || !recipientAddress}
            className="w-full"
          >
            Sign & Send Tip Meta
          </Button>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Log</h4>
          <div className="max-h-60 overflow-auto bg-muted/50 p-4 rounded-md text-xs font-mono space-y-1">
            {log.length === 0 ? (
              <div className="text-muted-foreground">No messages yet...</div>
            ) : (
              log.map((l, i) => (
                <div key={i} className="break-words">
                  {l}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

