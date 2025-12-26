// src/hooks/useVoiceTipping.ts
// React hook for voice tipping integration

import { useState, useCallback, useEffect, useRef } from 'react';
import { VoiceTippingService, type VoiceCommand } from '@/services/voice-tipping';
import { useVeryTippers } from '@/hooks/useVeryTippers';

export const useVoiceTipping = () => {
  const [isListening, setIsListening] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const voiceServiceRef = useRef<VoiceTippingService | null>(null);
  const { isConnected } = useVeryTippers();

  // Initialize voice service
  useEffect(() => {
    voiceServiceRef.current = new VoiceTippingService();
    return () => {
      voiceServiceRef.current?.stopListening();
    };
  }, []);

  const startVoiceTipping = useCallback(async (onCommand: (cmd: VoiceCommand) => Promise<void>) => {
    if (!isConnected) return false;
    
    if (!voiceServiceRef.current) {
      voiceServiceRef.current = new VoiceTippingService();
    }

    try {
      await voiceServiceRef.current.startListening(async (command) => {
        setIsActive(true);
        await onCommand(command);
        setTimeout(() => setIsActive(false), 2000);
      });
      setIsListening(true);
      return true;
    } catch (error) {
      console.error('Voice tipping failed:', error);
      return false;
    }
  }, [isConnected]);

  const stopVoiceTipping = useCallback(() => {
    voiceServiceRef.current?.stopListening();
    setIsListening(false);
    setIsActive(false);
  }, []);

  const toggleVoiceTipping = useCallback(async (onCommand: (cmd: VoiceCommand) => Promise<void>) => {
    if (isListening) {
      stopVoiceTipping();
    } else {
      await startVoiceTipping(onCommand);
    }
  }, [isListening, startVoiceTipping, stopVoiceTipping]);

  return {
    isListening,
    isActive,
    toggleVoiceTipping,
    startVoiceTipping,
    stopVoiceTipping
  };
};


