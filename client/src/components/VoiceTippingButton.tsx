// src/components/VoiceTippingButton.tsx
// Floating voice tipping microphone UI

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceTippingService, type VoiceCommand } from '@/services/voice-tipping';
import { useVeryTippers } from '@/hooks/useVeryTippers';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { sendTipToBackend } from '@/lib/web3';

export const VoiceTippingButton: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [recentCommand, setRecentCommand] = useState<VoiceCommand | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isConnected, address } = useVeryTippers();
  const voiceServiceRef = useRef<VoiceTippingService | null>(null);

  // Initialize voice service
  useEffect(() => {
    voiceServiceRef.current = new VoiceTippingService();
    return () => {
      voiceServiceRef.current?.stopListening();
    };
  }, []);

  // Handle voice command
  const handleVoiceCommand = async (command: VoiceCommand) => {
    setRecentCommand(command);
    
    if (!isConnected || !address) {
      toast.error('Wallet Required', {
        description: 'Please connect your VERY wallet first'
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Extract username from recipient (remove @ if present)
      const recipientUsername = command.recipient.replace('@', '');
      
      // For now, we'll use the username as recipientId
      // In production, you'd want to map username -> user ID
      const result = await sendTipToBackend(
        address, // senderId (wallet address)
        recipientUsername, // recipientId (username, ideally should be mapped to user ID)
        command.amount,
        command.message || `Voice tip: ${command.amount} VERY`
      );

      if (result.success) {
        toast.success(`🎤 Voice Tip Sent!`, {
          description: `${command.recipient} received ${command.amount} VERY`,
          duration: 3000
        });
      } else {
        throw new Error(result.message || 'Tip failed');
      }

    } catch (error) {
      toast.error('Tip Failed', {
        description: (error as Error).message,
        duration: 5000
      });
    } finally {
      setIsProcessing(false);
      // Clear recent command after a delay
      setTimeout(() => setRecentCommand(null), 3000);
    }
  };

  // Toggle listening
  const toggleListening = async () => {
    if (!voiceServiceRef.current) return;

    if (isListening) {
      voiceServiceRef.current.stopListening();
      setIsListening(false);
    } else {
      if (!isConnected) {
        toast.error('Connect Wallet', {
          description: 'Please connect your wallet to use voice tipping'
        });
        return;
      }

      try {
        await voiceServiceRef.current.startListening(handleVoiceCommand);
        setIsListening(true);
        toast.info('Voice Tipping Active', {
          description: 'Say "Tip @username amount VERY" to send a tip'
        });
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
        toast.error('Voice Recognition Failed', {
          description: 'Your browser may not support voice recognition'
        });
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-3">
      {/* Recent command preview */}
      <AnimatePresence>
        {recentCommand && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="bg-gradient-to-r from-emerald-500/95 to-green-500/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-emerald-300/50 max-w-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold text-white text-sm">Voice Command Detected</span>
            </div>
            <div className="font-mono text-lg font-bold text-emerald-900 mb-1">
              Tip {recentCommand.recipient} {recentCommand.amount} VERY
            </div>
            {recentCommand.message && (
              <div className="text-xs text-emerald-800 bg-emerald-100/50 px-2 py-1 rounded-lg">
                "{recentCommand.message}"
              </div>
            )}
            {isProcessing && (
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-800">
                <div className="w-3 h-3 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Button */}
      <motion.div
        animate={{ 
          scale: isListening ? [1, 1.05, 1] : 1,
          rotate: isListening ? [0, 5, -5, 0] : 0
        }}
        transition={{ 
          scale: { duration: 1, repeat: Infinity },
          rotate: { duration: 2, repeat: Infinity }
        }}
      >
        <Button
          size="lg"
          className={`
            w-16 h-16 rounded-full p-0 shadow-2xl border-4
            ${isListening 
              ? 'bg-gradient-to-r from-red-500 to-pink-500 border-red-400 shadow-red-500/25 animate-pulse' 
              : 'bg-gradient-to-r from-purple-600 to-blue-600 border-purple-400 hover:shadow-purple-500/50'
            }
            transition-all duration-300 hover:scale-110 active:scale-95
            ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={toggleListening}
          disabled={!isConnected || isProcessing}
        >
          {isListening ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </Button>
      </motion.div>

      {/* Status indicator */}
      <motion.div
        animate={{
          scale: isListening ? [1, 1.2, 1] : 1,
        }}
        transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
        className={`w-3 h-3 rounded-full ${
          isListening 
            ? 'bg-red-500 animate-ping' 
            : 'bg-slate-500/50'
        }`} 
      />
      
      {/* Status Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`text-xs font-mono tracking-wide text-right ${
          isListening 
            ? 'text-red-400 animate-pulse' 
            : 'text-slate-500'
        }`}
      >
        {isListening ? '🎤 Listening...' : isConnected ? 'Tap to speak' : 'Connect wallet'}
      </motion.div>
    </div>
  );
};


