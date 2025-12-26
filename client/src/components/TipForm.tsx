import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TipSuggestions } from "./TipSuggestions";
import { TipRecommendation } from "./TipRecommendation";
import { AISuggestionTooltip } from "./AISuggestionTooltip";
import { ModerationGuard } from "./ModerationGuard";
import { useAITipSuggestions } from "@/hooks/useAITipSuggestions";
import { useMessageModeration } from "@/hooks/useMessageModeration";
import { Sparkles, Send, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TipFormProps {
  senderId: string;
  recipientId: string;
  recipientName?: string;
  content?: string;
  contentAuthorId?: string;
  chatMessage?: string; // Optional chat message for AI analysis
  chatSender?: string; // Optional chat sender for AI analysis
  onTipSent?: (tipId: string) => void;
}

export function TipForm({
  senderId,
  recipientId,
  recipientName,
  content,
  contentAuthorId,
  chatMessage,
  chatSender,
  onTipSent,
}: TipFormProps) {
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("VERY");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAIFeatures, setShowAIFeatures] = useState(!!content);
  const { result: moderationResult, isChecking: isModerating, moderateAndSend } = useMessageModeration();
  const { suggestions, isAnalyzing, suggestTipForMessage } = useAITipSuggestions();

  const handleSendTip = async () => {
    // Validate amount
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount greater than 0");
      toast.error("Please enter a valid amount");
      return;
    }

    // Validate required fields
    if (!senderId || !recipientId || !token) {
      setError("Missing required information. Please check your connection.");
      toast.error("Missing required information");
      return;
    }

    // Validate amount doesn't exceed reasonable limits
    if (amountNum > 1000000) {
      setError("Amount exceeds maximum limit");
      toast.error("Amount is too large. Maximum is 1,000,000");
      return;
    }

    // Moderate message if provided
    if (message) {
      const moderationCheck = await moderateAndSend(message);
      if (!moderationCheck.success) {
        setError(`Message blocked: ${moderationCheck.result?.flaggedReason || 'Content moderation failed'}`);
        toast.error("Your message was blocked. Please edit it and try again.");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      let response: Response;
      try {
        response = await fetch("/api/v1/tip", {
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
          signal: controller.signal,
        });
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          throw new Error("Request timed out. Please try again.");
        }
        
        if (fetchError instanceof TypeError && fetchError.message.includes("fetch")) {
          throw new Error("Network error. Please check your internet connection and try again.");
        }
        
        throw fetchError;
      }
      
      clearTimeout(timeoutId);

      // Check if response is ok
      if (!response.ok) {
        let errorMessage = `Server error (${response.status})`;
        let errorData: { message?: string; error?: string } = {};

        try {
          errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If response is not JSON, try to get status text
          errorMessage = response.statusText || errorMessage;
        }

        // Handle specific HTTP status codes
        if (response.status === 400) {
          errorMessage = errorData.message || "Invalid request. Please check your inputs.";
        } else if (response.status === 401) {
          errorMessage = "Authentication required. Please connect your wallet.";
        } else if (response.status === 403) {
          errorMessage = "Permission denied. You don't have access to perform this action.";
        } else if (response.status === 404) {
          errorMessage = "Endpoint not found. Please refresh the page.";
        } else if (response.status === 429) {
          errorMessage = "Too many requests. Please wait a moment and try again.";
        } else if (response.status >= 500) {
          errorMessage = "Server error. Our team has been notified. Please try again later.";
        }

        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      // Parse response
      let data: { success?: boolean; message?: string; data?: { tipId?: string }; error?: string };
      try {
        data = await response.json();
      } catch (parseError) {
        setError("Invalid response from server. Please try again.");
        toast.error("Invalid response from server");
        console.error("Failed to parse response:", parseError);
        return;
      }

      // Handle response
      if (data.success) {
        toast.success(`Tip of ${amount} ${token} sent successfully!`);
        setAmount("");
        setMessage("");
        if (onTipSent && data.data?.tipId) {
          onTipSent(data.data.tipId);
        }
      } else {
        const errorMsg = data.message || data.error || "Failed to send tip";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error: unknown) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Tip submission error:", error);
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

  const handleAITipSuggestion = async (suggestedAmount: number, suggestedMessage: string) => {
    setAmount(suggestedAmount.toString());
    setMessage(suggestedMessage);
    toast.success(`AI suggestion applied: ${suggestedAmount.toFixed(2)} VERY`);
  };

  // Auto-analyze chat message if provided
  useEffect(() => {
    if (chatMessage && chatSender && chatSender !== senderId) {
      suggestTipForMessage(chatMessage, chatSender, recipientId);
    }
  }, [chatMessage, chatSender, senderId, recipientId, suggestTipForMessage]);

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
              className={moderationResult?.action === 'block' ? 'border-red-500 focus:border-red-500' : ''}
            />
            <div className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </div>
            
            {/* Moderation Guard */}
            {message && (
              <ModerationGuard
                message={message}
                onModerate={() => {}}
                onEdit={(newMessage) => setMessage(newMessage)}
              />
            )}
          </div>

          {recipientName && (
            <TipSuggestions
              recipientName={recipientName}
              contentPreview={content}
              tipAmount={parseFloat(amount) || undefined}
              onSelectMessage={handleSelectMessage}
            />
          )}

          {/* AI-powered tip suggestion for chat messages */}
          {chatMessage && chatSender && chatSender !== senderId && (
            <div className="space-y-2">
              <AISuggestionTooltip
                message={chatMessage}
                sender={chatSender}
                recipient={recipientId}
                onTip={handleAITipSuggestion}
              />
              {suggestions.length > 0 && suggestions[0].confidence > 0.7 && (
                <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                        AI Suggestion: {suggestions[0].amount.toFixed(2)} VERY
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAITipSuggestion(suggestions[0].amount, suggestions[0].message)}
                      className="h-7"
                    >
                      Use
                    </Button>
                  </div>
                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                    {suggestions[0].message}
                  </p>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleSendTip}
            disabled={loading || !amount || parseFloat(amount) <= 0 || isModerating || moderationResult?.action === 'block'}
            className="w-full"
            size="lg"
          >
            {loading || isModerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isModerating ? 'Scanning message...' : 'Sending...'}
              </>
            ) : moderationResult?.action === 'block' ? (
              <>
                <AlertCircle className="mr-2 h-4 w-4" />
                Message Blocked
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

