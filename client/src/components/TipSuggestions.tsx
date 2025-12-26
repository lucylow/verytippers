import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MessageSuggestion {
  message: string;
  tone: "friendly" | "professional" | "casual" | "enthusiastic";
  score: number;
}

interface TipSuggestionsProps {
  recipientName?: string;
  contentPreview?: string;
  tipAmount?: number;
  onSelectMessage: (message: string) => void;
}

const toneColors = {
  friendly: "bg-blue-100 text-blue-800 border-blue-200",
  professional: "bg-purple-100 text-purple-800 border-purple-200",
  casual: "bg-green-100 text-green-800 border-green-200",
  enthusiastic: "bg-orange-100 text-orange-800 border-orange-200",
};

const toneIcons = {
  friendly: "😊",
  professional: "💼",
  casual: "👍",
  enthusiastic: "🎉",
};

export function TipSuggestions({
  recipientName,
  contentPreview,
  tipAmount,
  onSelectMessage,
}: TipSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<MessageSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const fetchSuggestions = async () => {
    if (!recipientName && !contentPreview) {
      return;
    }
    
    setLoading(true);
    try {
      const { getMessageSuggestions } = await import('@/lib/api');
      const result = await getMessageSuggestions({
        recipientName: recipientName || '',
        contentPreview,
        tipAmount,
      });

      if (result.success && result.data) {
        // Map API response to component's MessageSuggestion type (add score if missing)
        const mappedSuggestions = result.data.map(suggestion => ({
          ...suggestion,
          score: suggestion.score ?? suggestion.confidence ?? 0.8,
        }));
        setSuggestions(mappedSuggestions);
      } else {
        const errorMsg = result.error || "Failed to load suggestions";
        toast.error(errorMsg);
      }
    } catch (error: unknown) {
      console.error("Error fetching suggestions:", error);
      const { ApiError } = await import('@/lib/api');
      const errorMessage = error instanceof ApiError
        ? error.message
        : error instanceof Error
        ? error.message
        : "An unexpected error occurred while loading suggestions";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recipientName || contentPreview) {
      fetchSuggestions();
    }
  }, [recipientName, contentPreview, tipAmount]);

  const handleSelect = (message: string, index: number) => {
    setSelectedIndex(index);
    onSelectMessage(message);
    toast.success("Message selected!");
  };

  if (loading && suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Message Suggestions
          </CardTitle>
          <CardDescription>Generating personalized messages...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Message Suggestions
        </CardTitle>
        <CardDescription>
          Choose a message or write your own
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant={selectedIndex === index ? "default" : "outline"}
              className="w-full justify-start h-auto py-3 px-4 text-left"
              onClick={() => handleSelect(suggestion.message, index)}
            >
              <div className="flex items-start gap-3 w-full">
                <span className="text-xl flex-shrink-0">
                  {toneIcons[suggestion.tone]}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{suggestion.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${toneColors[suggestion.tone]}`}
                    >
                      {suggestion.tone}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(suggestion.score * 100)}% match
                    </span>
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4"
          onClick={fetchSuggestions}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate More Suggestions
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

