import React, { useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import Chat from '@/components/Chat'
import TipModal from '@/components/TipModal'
import Leaderboard from '@/components/Leaderboard'
import { SocialActivityPanel } from '@/components/SocialActivityPanel'
import { TipPayload } from '@/types/tip'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Zap } from 'lucide-react'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function TipDemo() {
  const me = { id: 'u1', username: 'you' } // demo signed-in user
  const [pendingTip, setPendingTip] = useState<TipPayload | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [recentTxs, setRecentTxs] = useState<Array<{txHash: string; to: string; amount: number}>>([])

  async function handleRequestTip(payload: TipPayload) {
    // Show wallet confirm modal
    setPendingTip(payload)
    setModalOpen(true)
  }

  async function handleComplete(txHash: string) {
    if (pendingTip) {
      setRecentTxs(prev => [{
        txHash,
        to: pendingTip.to,
        amount: pendingTip.amount
      }, ...prev].slice(0, 5))
    }
    
    toast.success(`Tip confirmed ✓ • Tx: ${txHash.slice(0, 10)}...`, {
      description: `Sent ${pendingTip?.amount} VERY to @${pendingTip?.to}`,
      duration: 6000,
    })
    
    setPendingTip(null)
    // optionally fetch ledger or let leaderboard poller update
  }

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
        <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">VeryTippers — Interactive Demo</h1>
          <p className="text-muted-foreground">
            Experience the complete tip flow: compose → AI suggestion → wallet confirm → IPFS + metaTx → relayer tx → leaderboard updates
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Chat & Leaderboard */}
          <div className="space-y-6">
            <Chat me={me} onRequestTip={handleRequestTip} />
            <Leaderboard />
          </div>

          {/* Right Column: Social Activity & System Status */}
          <div className="space-y-6">
            {/* Social Activity Panel */}
            <SocialActivityPanel limit={8} autoRefresh={true} refreshInterval={30000} />

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Status
                </CardTitle>
                <CardDescription>
                  Live transaction feed and system status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Indexer: Active (polling every 3s)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 bg-green-500 rounded-full" />
                    <span>Relayer: Ready</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 bg-green-500 rounded-full" />
                    <span>IPFS: Connected</span>
                  </div>
                </div>

                {recentTxs.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-3">Your Recent Transactions</h4>
                    <div className="space-y-2">
                      {recentTxs.map((tx, idx) => (
                        <div 
                          key={idx}
                          className="p-3 bg-muted rounded-lg text-sm space-y-1"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-xs text-muted-foreground">
                              {tx.txHash.slice(0, 16)}...
                            </span>
                            <span className="font-semibold text-primary">
                              {tx.amount} VERY
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            To: @{tx.to}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">1.</span>
                    <span>Type <code className="px-1.5 py-0.5 bg-muted rounded">/tip @username 5</code> or mention someone for AI suggestions</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">2.</span>
                    <span>Confirm tip in the wallet modal (simulates Wepin signing)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">3.</span>
                    <span>Payload is signed, encrypted, and uploaded to IPFS</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">4.</span>
                    <span>Meta-transaction is created and submitted via relayer</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">5.</span>
                    <span>Transaction is confirmed and leaderboard updates automatically</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
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

      <TipModal
        open={modalOpen}
        payload={pendingTip ?? undefined}
        onClose={() => {
          setModalOpen(false)
          setPendingTip(null)
        }}
        onComplete={handleComplete}
        meId={me.id}
      />
    </div>
  )
}

