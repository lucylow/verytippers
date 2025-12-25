import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
// Date formatting utility
const formatTimeAgo = (date: Date | string): string => {
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

interface TipFeedItem {
  id: string;
  senderId: string;
  recipientId: string;
  amount: string;
  token: string;
  message?: string;
  createdAt: string;
  txHash?: string;
}

interface TipFeedProps {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function TipFeed({
  limit = 20,
  autoRefresh = true,
  refreshInterval = 30000,
}: TipFeedProps) {
  const [tips, setTips] = useState<TipFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = async () => {
    try {
      const response = await fetch(`/api/v1/feed?limit=${limit}`);
      const data = await response.json();

      if (data.success) {
        setTips(data.data);
      } else {
        toast.error("Failed to load tip feed");
      }
    } catch (error) {
      console.error("Error fetching feed:", error);
      toast.error("Error loading tip feed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();

    if (autoRefresh) {
      const interval = setInterval(() => {
        setRefreshing(true);
        fetchFeed();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [limit, autoRefresh, refreshInterval]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };

  const getInitials = (userId: string) => {
    return userId.slice(0, 2).toUpperCase();
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Tips
            </CardTitle>
            <CardDescription>
              Live feed of tips across the platform
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tips.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tips yet. Be the first to tip!
          </div>
        ) : (
          <div className="space-y-4">
            {tips.map((tip) => (
              <div
                key={tip.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{getInitials(tip.senderId)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">
                      {tip.senderId.slice(0, 8)}...
                    </span>
                    <span className="text-muted-foreground text-sm">→</span>
                    <span className="text-sm font-medium truncate">
                      {tip.recipientId.slice(0, 8)}...
                    </span>
                  </div>

                  {tip.message && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {tip.message}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-semibold">
                      {formatAmount(tip.amount)} {tip.token}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(tip.createdAt)}
                    </span>
                    {tip.txHash && (
                      <a
                        href={`https://explorer.example.com/tx/${tip.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View TX
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {autoRefresh && (
          <div className="mt-4 text-xs text-center text-muted-foreground">
            Auto-refreshing every {refreshInterval / 1000}s
          </div>
        )}
      </CardContent>
    </Card>
  );
}

