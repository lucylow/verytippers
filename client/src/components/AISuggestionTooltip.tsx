// src/components/AISuggestionTooltip.tsx
// Real-time AI-powered tip suggestion UI

import { useState, useEffect } from 'react';
import { generateTipSuggestion, RealTimeTipAnalyzer, ChatContext, TipSuggestion } from '@/services/ai-tip-suggestions';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';

interface AISuggestionProps {
  message: string;
  sender: string;
  recipient?: string;
  onTip: (amount: number, message: string) => void;
  className?: string;
}

export const AISuggestionTooltip: React.FC<AISuggestionProps> = ({
  message,
  sender,
  recipient,
  onTip,
  className = ''
}) => {
  const [suggestion, setSuggestion] = useState<TipSuggestion | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const analyzer = new RealTimeTipAnalyzer();

  useEffect(() => {
    if (message && sender) {
      analyzeMessage();
    }
  }, [message, sender]);

  const analyzeMessage = async () => {
    setIsAnalyzing(true);
    try {
      const context: ChatContext = {
        message,
        sender,
        recipient: recipient || 'you', // Current user
        channel: 'general',
        timestamp: Date.now(),
        reactions: [] // Fetch from chat API
      };

      const suggestion = await analyzer.analyzeMessage(context);
      if (suggestion && suggestion.confidence > 0.6) {
        setSuggestion(suggestion);
        setShowTooltip(true);
      } else {
        setSuggestion(null);
        setShowTooltip(false);
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      setSuggestion(null);
      setShowTooltip(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!suggestion || !showTooltip) {
    if (isAnalyzing) {
      return (
        <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Analyzing...</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`group relative ${className}`}>
      {/* Inline suggestion bubble */}
      <div className="absolute bottom-full left-0 mb-2 z-50 bg-gradient-to-r from-purple-600/95 to-blue-600/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-purple-500/50 w-80 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-start gap-3 mb-3">
          <Sparkles className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-white text-sm mb-1">
              AI Suggestion: {suggestion.confidence > 0.8 ? '🔥 Perfect' : '👍 Good'}
            </div>
            <div className="text-xs text-purple-200 mb-2">
              {suggestion.reason}
            </div>
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300">Amount</span>
            <span className="font-mono font-bold text-xl text-white">
              {suggestion.amount.toFixed(2)} VERY
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300">Message</span>
            <span className="font-medium text-white text-sm bg-white/10 px-2 py-1 rounded-lg">
              {suggestion.message}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm"
            onClick={() => setShowTooltip(false)}
          >
            Dismiss
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
            onClick={() => {
              onTip(suggestion.amount, suggestion.message);
              setShowTooltip(false);
            }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Send Tip
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};


