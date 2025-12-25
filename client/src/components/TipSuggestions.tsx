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
    setLoading(true);
    try {
      const response = await fetch("/api/v1/tip/message-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientName,
          contentPreview,
          tipAmount,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuggestions(data.data);
      } else {
        toast.error("Failed to load suggestions");
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      toast.error("Error loading suggestions");
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

