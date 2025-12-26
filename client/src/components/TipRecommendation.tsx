import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, ThumbsUp, Zap, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TipRecommendationProps {
  content: string;
  authorId?: string;
  onRecommendationSelect?: (amount: string) => void;
}

interface Recommendation {
  recommendedAmount: string;
  confidence: number;
  reasoning: string;
  contentScore?: {
    quality: number;
    engagement: number;
    sentiment: string;
  };
}

export function TipRecommendation({
  content,
  authorId,
  onRecommendationSelect,
}: TipRecommendationProps) {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (content && content.length > 10) {
      fetchRecommendation();
    }
  }, [content, authorId]);

  const fetchRecommendation = async () => {
    setLoading(true);
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      let response: Response;
      try {
        response = await fetch("/api/v1/tip/recommendation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            authorId,
          }),
          signal: controller.signal,
        });
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          console.warn("Recommendation request timed out");
          return;
        }
        
        if (fetchError instanceof TypeError && fetchError.message.includes("fetch")) {
          console.error("Network error fetching recommendation:", fetchError);
          return;
        }
        
        throw fetchError;
      }
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Failed to fetch recommendation: ${response.status} ${response.statusText}`);
        return;
      }

      let data: { success?: boolean; data?: Recommendation };
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Failed to parse recommendation response:", parseError);
        return;
      }

      if (data.success && data.data) {
        setRecommendation(data.data);
      }
    } catch (error) {
      console.error("Error fetching recommendation:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Tip Recommendation
          </CardTitle>
          <CardDescription>Analyzing content quality...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) {
    return null;
  }

  const handleUseRecommendation = () => {
    if (onRecommendationSelect) {
      onRecommendationSelect(recommendation.recommendedAmount);
    }
  };

  const sentimentColors: { [key: string]: string } = {
    positive: "bg-green-100 text-green-800",
    negative: "bg-red-100 text-red-800",
    neutral: "bg-gray-100 text-gray-800",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Tip Recommendation
        </CardTitle>
        <CardDescription>Based on content analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-primary">
              {recommendation.recommendedAmount} VERY
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Recommended amount
            </p>
          </div>
          <Badge
            variant="secondary"
            className="text-sm px-3 py-1"
          >
            {Math.round(recommendation.confidence * 100)}% confident
          </Badge>
        </div>

        {recommendation.contentScore && (
          <div className="space-y-3 pt-4 border-t">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Quality Score</span>
                </div>
                <span className="text-sm font-semibold">
                  {recommendation.contentScore.quality}/100
                </span>
              </div>
              <Progress value={recommendation.contentScore.quality} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Engagement Score</span>
                </div>
                <span className="text-sm font-semibold">
                  {recommendation.contentScore.engagement}/100
                </span>
              </div>
              <Progress value={recommendation.contentScore.engagement} className="h-2" />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Sentiment</span>
              </div>
              <Badge
                className={sentimentColors[recommendation.contentScore.sentiment]}
              >
                {recommendation.contentScore.sentiment}
              </Badge>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-3">
            {recommendation.reasoning}
          </p>
          {onRecommendationSelect && (
            <button
              onClick={handleUseRecommendation}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2 px-4 rounded-md text-sm transition-colors"
            >
              Use Recommended Amount
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

