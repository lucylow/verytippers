// src/hooks/useAITipSuggestions.ts
// React hook for real-time AI tip suggestions

import { useState, useCallback } from 'react';
import { generateTipSuggestion, analyzeChatForTips, TipSuggestion, ChatContext } from '@/services/ai-tip-suggestions';
import { useVeryTippers } from '@/hooks/useVeryTippers';

export const useAITipSuggestions = () => {
  const [suggestions, setSuggestions] = useState<TipSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { address } = useVeryTippers();

  const suggestTipForMessage = useCallback(async (message: string, sender: string, recipient?: string) => {
    setIsAnalyzing(true);
    try {
      const context: ChatContext = {
        message,
        sender,
        recipient: recipient || address || 'user',
        channel: 'chat',
        timestamp: Date.now()
      };

      const suggestion = await generateTipSuggestion(context);
      setSuggestions(prev => [suggestion, ...prev.slice(0, 4)]);
      return suggestion;
    } finally {
      setIsAnalyzing(false);
    }
  }, [address]);

  const analyzeRecentChat = useCallback(async (messages: ChatContext[]) => {
    setIsAnalyzing(true);
    try {
      const suggestions = await analyzeChatForTips(messages);
      setSuggestions(suggestions.slice(0, 5));
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isAnalyzing,
    suggestTipForMessage,
    analyzeRecentChat,
    clearSuggestions
  };
};


