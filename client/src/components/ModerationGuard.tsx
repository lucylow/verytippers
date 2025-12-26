// src/components/ModerationGuard.tsx
// Real-time tip message moderation UI

import { useState, useCallback, useEffect } from 'react';
import { ModerationEngine, ModerationResult } from '@/services/moderation-engine';
import { AlertCircle, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface ModerationGuardProps {
  message: string;
  onModerate: (result: ModerationResult) => void;
  onEdit: (newMessage: string) => void;
}

export const ModerationGuard: React.FC<ModerationGuardProps> = ({
  message,
  onModerate,
  onEdit
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<ModerationResult | null>(null);
  const moderation = new ModerationEngine();

  const checkMessage = useCallback(async () => {
    if (!message.trim()) {
      setResult(null);
      return;
    }

    setIsChecking(true);
    try {
      const moderationResult = await moderation.moderateTipMessage(message);
      setResult(moderationResult);
      onModerate(moderationResult);
    } catch (error) {
      console.error('Moderation check failed:', error);
    } finally {
      setIsChecking(false);
    }
  }, [message, onModerate]);

  // Auto-check on message change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (message) {
        checkMessage();
      } else {
        setResult(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [message, checkMessage]);

  if (!result && !isChecking) return null;

  const renderStatus = () => {
    if (isChecking) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2 bg-slate-500/20 border border-slate-500/50 text-slate-400 p-3 rounded-xl"
        >
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Scanning message...</span>
        </motion.div>
      );
    }

    if (!result) return null;

    switch (result.action) {
      case 'allow':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 p-3 rounded-xl"
          >
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">✅ Safe to send</span>
            <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded-full">
              {result.sentiment}
            </span>
          </motion.div>
        );

      case 'warn':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/50 text-amber-400 p-3 rounded-xl"
          >
            <Shield className="w-5 h-5" />
            <div>
              <span className="text-sm font-medium block">⚠️ Moderate tone detected</span>
              <span className="text-xs">Toxicity: {(result.toxicityScore * 100).toFixed(0)}%</span>
            </div>
          </motion.div>
        );

      case 'block':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex flex-col gap-3 bg-red-500/20 border border-red-500/50 text-red-400 p-4 rounded-xl"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              <span className="text-lg font-bold">🚫 Message blocked</span>
            </div>
            <div className="text-sm space-y-1">
              <p>Reason: <span className="font-mono bg-red-500/20 px-2 py-1 rounded">
                {result.flaggedReason}
              </span></p>
              <p>Toxicity: <strong>{(result.toxicityScore * 100).toFixed(0)}%</strong></p>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  const suggestedEdits = result && result.action !== 'allow' ? [
    message.replace(/fuck/gi, 'heck'),
    message.replace(/\bshit\b/gi, 'stuff'),
    message.replace(/damn/gi, 'darn')
  ].filter(edit => edit !== message && edit.length > 0).slice(0, 3) : [];

  return (
    <div className={`space-y-3 p-4 border rounded-xl transition-all duration-200 ${
      result?.action === 'block' 
        ? 'border-red-500/50 bg-red-500/5' 
        : result?.action === 'warn' 
        ? 'border-amber-500/50 bg-amber-500/5' 
        : result?.action === 'allow'
        ? 'border-emerald-500/30 bg-emerald-500/5'
        : 'border-slate-500/30 bg-slate-500/5'
    }`}>
      
      {/* Status Display */}
      {renderStatus()}
      
      {/* Edit Suggestions */}
      {suggestedEdits.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          <span className="text-xs font-medium text-slate-400 block mb-2">
            Suggested edits:
          </span>
          <div className="flex flex-wrap gap-2">
            {suggestedEdits.map((edit, idx) => (
              <Button
                key={idx}
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-3 bg-white/10 hover:bg-white/20 text-slate-200 truncate max-w-[200px]"
                onClick={() => onEdit(edit)}
              >
                {edit.length > 25 ? `${edit.slice(0, 22)}...` : edit}
              </Button>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* Action Buttons */}
      {result && result.action === 'block' && (
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onEdit('Thanks!')}
          >
            Use Safe Message
          </Button>
        </div>
      )}
    </div>
  );
};


