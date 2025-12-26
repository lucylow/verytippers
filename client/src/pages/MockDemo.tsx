/**
 * Mock Demo Page
 * 
 * Complete demo of VeryTippers functionality using the mock backend.
 * Shows real-time tip feed, leaderboard updates, and AI suggestions.
 */

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { mockBackend } from "@/lib/mockBackend";
import { User, Tip } from "@/types/mock";
import ChatInput from "@/components/mock/ChatInput";
import WalletModal from "@/components/mock/WalletModal";
import Leaderboard from "@/components/mock/Leaderboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ErrorBoundary from "@/components/ErrorBoundary";

type LeaderboardRow = {
  user: User;
  totalReceived: number;
};

type PendingConfirm = {
  to: string;
  amount: number;
  fromId: string;
};

export default function MockDemo() {
  const [users, setUsers] = useState<User[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Subscribe to backend updates
    const unsubscribe = mockBackend.onUpdate(() => {
      refreshAll();
    });

    // Initial load
    refreshAll();

    return () => {
      unsubscribe();
    };
  }, []);

  async function refreshAll() {
    const [u, t, lb] = await Promise.all([
      mockBackend.getUsers(),
      mockBackend.getTips(),
      mockBackend.getLeaderboard(10),
    ]);
    setUsers(u);
    setTips(t);
    setLeaderboard(lb);
  }

  /**
   * Handle tip request from ChatInput
   */
  async function handleRequestTip(toHandle: string, amount: number, message?: string) {
    const me = users.find((u) => u.handle === "you") || users[0];
    if (!me) {
      alert("User not found");
      return;
    }
    setPendingConfirm({ to: toHandle, amount, fromId: me.id });
  }

  /**
   * Sign and send tip
   */
  async function onSignAndSend() {
    if (!pendingConfirm) return;

    setBusy(true);
    try {
      const me = users.find((u) => u.handle === "you") || users[0];
      if (!me) {
        throw new Error("User not found");
      }

      const { cid, metaTx, txHash } = await mockBackend.processTip(
        me.id,
        pendingConfirm.to,
        pendingConfirm.amount,
        "Nice job!"
      );

      console.log("Tip submitted:", { cid, metaTx, txHash });
      // UI will update automatically via backend.onUpdate() subscription
    } catch (err) {
      console.error("Error sending tip:", err);
      alert("Error sending tip. Please try again.");
    } finally {
      setBusy(false);
      setPendingConfirm(null);
    }
  }

  function getUserById(userId: string): User | undefined {
    return users.find((u) => u.id === userId);
  }

  function getUserByHandle(handle: string): User | undefined {
    return users.find((u) => u.handle === handle);
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
        <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">VeryTippers — Demo UI</h1>
          <p className="text-muted-foreground">
            Complete mock implementation with real-time updates
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Chat Feed */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tip Feed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {tips.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No tips yet. Send your first tip!
                    </div>
                  ) : (
                    tips.map((tip) => {
                      const fromUser = getUserById(tip.fromUserId);
                      const toUser = getUserById(tip.toUserId);

                      return (
                        <div
                          key={tip.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {fromUser?.displayName?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {fromUser?.displayName || tip.fromUserId}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium">
                                @{toUser?.handle || tip.toUserId}
                              </span>
                              <Badge
                                variant={tip.confirmed ? "default" : "secondary"}
                                className="ml-auto"
                              >
                                {tip.confirmed ? "✓ Confirmed" : "⏳ Pending"}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(tip.createdAt).toLocaleString()}
                            </div>
                            <div className="font-semibold text-primary">
                              {tip.amount} VERY
                            </div>
                            {tip.cid && (
                              <div className="text-xs text-muted-foreground font-mono">
                                CID: {tip.cid.slice(0, 12)}...
                              </div>
                            )}
                            {tip.txHash && (
                              <div className="text-xs text-muted-foreground font-mono">
                                TX: {tip.txHash.slice(0, 16)}...
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chat Input */}
            <ChatInput onRequestTip={handleRequestTip} currentHandle="you" />
          </div>

          {/* Right Column: Users & Leaderboard */}
          <div className="space-y-4">
            {/* Users List */}
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-sm text-muted-foreground">
                          @{user.handle}
                        </div>
                      </div>
                      <Badge variant="outline">{user.balance} VERY</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Leaderboard rows={leaderboard} />

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {tips.slice(0, 5).map((tip) => {
                    const toUser = getUserById(tip.toUserId);
                    return (
                      <div
                        key={tip.id}
                        className="flex items-center justify-between p-2 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <span>{tip.confirmed ? "✓" : "…"}</span>
                          <span>@{toUser?.handle || tip.toUserId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-primary font-medium">
                            +{tip.amount}
                          </span>
                          {tip.txHash && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {tip.txHash.slice(0, 10)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {tips.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No activity yet
                    </div>
                  )}
                </div>
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

      {/* Wallet Modal */}
      <WalletModal
        open={!!pendingConfirm}
        toHandle={pendingConfirm?.to || ""}
        amount={pendingConfirm?.amount || 0}
        onSign={onSignAndSend}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}

