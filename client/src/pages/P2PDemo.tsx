import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import PeerPanel from '@/components/PeerPanel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function P2PDemo() {
  const [roomId, setRoomId] = useState(() => {
    // Generate a default room ID or use URL params
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || `room-${Date.now()}`;
  });
  const [signalingUrl, setSignalingUrl] = useState(
    import.meta.env.VITE_SIGNALING_URL || 'ws://localhost:8080'
  );
  const [toAddress, setToAddress] = useState('');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ErrorBoundary
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Failed to load navigation</h1>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
              >
                Reload Page
              </button>
            </div>
          </div>
        }
      >
        <Navbar />
      </ErrorBoundary>
      <main className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Peer-to-Peer Tipping Demo</CardTitle>
          <CardDescription>
            Connect with another user via WebRTC and exchange signed tip payloads directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Signaling Server URL</label>
            <Input
              value={signalingUrl}
              onChange={(e) => setSignalingUrl(e.target.value)}
              placeholder="ws://localhost:8080"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Room ID</label>
            <div className="flex gap-2">
              <Input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="room-id"
              />
              <Button
                onClick={() => {
                  const newRoom = `room-${Date.now()}`;
                  setRoomId(newRoom);
                  window.history.replaceState({}, '', `?room=${newRoom}`);
                }}
                variant="outline"
              >
                New Room
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this room ID with the peer you want to connect to
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Recipient Address (optional)</label>
            <Input
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
        </CardContent>
      </Card>

      <PeerPanel
        signalingUrl={signalingUrl}
        roomId={roomId}
        toAddress={toAddress}
      />

      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>1. Start the Signaling Server:</strong>
            <pre className="mt-1 p-2 bg-muted rounded text-xs">
              cd signaling-server{'\n'}npm install{'\n'}npm start
            </pre>
          </div>
          <div>
            <strong>2. Open this page in two browser tabs/windows</strong>
          </div>
          <div>
            <strong>3. Use the same Room ID in both tabs</strong>
          </div>
          <div>
            <strong>4. In one tab, click "Start / Create Offer"</strong>
          </div>
          <div>
            <strong>5. Wait for connection to establish (you'll see "pc state: connected")</strong>
          </div>
          <div>
            <strong>6. Send messages or sign and send tip meta-transactions</strong>
          </div>
        </CardContent>
      </Card>
        </div>
      </main>
      <ErrorBoundary
        fallback={
          <div className="py-4 px-4 text-center text-sm text-muted-foreground">
            Footer unavailable
          </div>
        }
      >
        <Footer />
      </ErrorBoundary>
    </div>
  );
}

