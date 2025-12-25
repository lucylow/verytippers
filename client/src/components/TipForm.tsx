import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TipSuggestions } from "./TipSuggestions";
import { TipRecommendation } from "./TipRecommendation";
import { Sparkles, Send, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TipFormProps {
  senderId: string;
  recipientId: string;
  recipientName?: string;
  content?: string;
  contentAuthorId?: string;
  onTipSent?: (tipId: string) => void;
}

export function TipForm({
  senderId,
  recipientId,
  recipientName,
  content,
  contentAuthorId,
  onTipSent,
}: TipFormProps) {
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("VERY");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAIFeatures, setShowAIFeatures] = useState(!!content);

  const handleSendTip = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!senderId || !recipientId || !token) {
      setError("Missing required information");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/tip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId,
          recipientId,
          amount,
          token,
          message: message || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Tip of ${amount} ${token} sent successfully!`);
        setAmount("");
        setMessage("");
        if (onTipSent && data.data?.tipId) {
          onTipSent(data.data.tipId);
        }
      } else {
        setError(data.message || "Failed to send tip");
        toast.error(data.message || "Failed to send tip");
      }
    } catch (error) {
      const errorMessage = "Network error. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecommendation = (recommendedAmount: string) => {
    setAmount(recommendedAmount);
    toast.success(`Amount set to ${recommendedAmount} VERY`);
  };

  const handleSelectMessage = (selectedMessage: string) => {
    setMessage(selectedMessage);
  };

  return (
    <div className="space-y-6">
      {showAIFeatures && content && (
        <div className="space-y-4">
          <TipRecommendation
            content={content}
            authorId={contentAuthorId}
            onRecommendationSelect={handleSelectRecommendation}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Send a Tip</CardTitle>
          <CardDescription>
            Show appreciation for great content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Select value={token} onValueChange={setToken}>
                <SelectTrigger id="token">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VERY">VERY</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Say something nice..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </div>
          </div>

          {recipientName && (
            <TipSuggestions
              recipientName={recipientName}
              contentPreview={content}
              tipAmount={parseFloat(amount) || undefined}
              onSelectMessage={handleSelectMessage}
            />
          )}

          <Button
            onClick={handleSendTip}
            disabled={loading || !amount || parseFloat(amount) <= 0}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Tip
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

