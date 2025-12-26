// src/hooks/useMessageModeration.ts
// React hook for real-time message scanning

import { useState, useCallback, useEffect, useRef } from 'react';
import { ModerationEngine, ModerationResult } from '@/services/moderation-engine';

export const useMessageModeration = () => {
  const [result, setResult] = useState<ModerationResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const moderation = new ModerationEngine();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced moderation check
  const checkMessage = useCallback((message: string) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!message.trim()) {
      setResult(null);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);

    // Debounce: wait 500ms after user stops typing
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const moderationResult = await moderation.moderateTipMessage(message);
        setResult(moderationResult);
      } catch (error) {
        console.error('Moderation check failed:', error);
        setResult(null);
      } finally {
        setIsChecking(false);
      }
    }, 500);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const moderateAndSend = useCallback(async (message: string) => {
    const result = await moderation.moderateTipMessage(message);
    
    if (result.action === 'allow' || result.action === 'warn') {
      // Allow warnings to proceed (they'll be logged for review)
      return { success: true, result };
    } else {
      return { success: false, result };
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setIsChecking(false);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  return {
    result,
    isChecking,
    checkMessage,
    moderateAndSend,
    reset
  };
};


