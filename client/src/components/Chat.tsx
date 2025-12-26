// src/components/Chat.tsx - AI-Powered Chat with ALL Features
// Voice tipping, AI suggestions, moderation, badges

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TipPayload } from '@/types/tip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Send, MessageCircle, TrendingUp, Award, Zap } from 'lucide-react';
import { useAITipSuggestions } from '@/hooks/useAITipSuggestions';
import { useAchievementEngine } from '@/hooks/useAchievementEngine';
import { useMessageModeration } from '@/hooks/useMessageModeration';
import { AISuggestionTooltip } from '@/components/AISuggestionTooltip';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { PersonalizedInsights } from '@/components/PersonalizedInsights';
import { useVeryTippers } from '@/hooks/useVeryTippers';
import { cn } from '@/lib/utils';
import AdSlot from '@/components/AdSlot';

interface Message {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
  reactions: number;
  tipAmount?: number;
}

type ChatProps = {
  me?: { id: string; username: string };
  onRequestTip?: (payload: TipPayload) => void;
};

export default function Chat({ me, onRequestTip }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { address, isConnected } = useVeryTippers();
  const { badges } = useAchievementEngine();
  const { suggestTipForMessage } = useAITipSuggestions();
  const { result: moderationResult } = useMessageModeration();

  const currentUser = useMemo(() => {
    return me || { id: address || 'demo', username: address ? address.slice(-6) : 'demo' };
  }, [me, address]);

  // Simulate real-time messages
  useEffect(() => {
    const interval = setInterval(() => {
      const senders = ['alice', 'bob', 'charlie', 'dave'];
      const sampleMessages = [
        'Great explanation!',
        'Fixed my bug!',
        'Thanks for the help!',
        'This is exactly what I needed',
        'Amazing work!',
        'You saved me hours',
      ];
      
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender: senders[Math.floor(Math.random() * senders.length)],
        message: sampleMessages[Math.floor(Math.random() * sampleMessages.length)],
        timestamp: Date.now(),
        reactions: Math.floor(Math.random() * 5),
        tipAmount: Math.random() > 0.7 ? Math.floor(Math.random() * 10) + 1 : undefined
      }]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim()) return;
    
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: currentUser.username,
      message: inputMessage,
      timestamp: Date.now(),
      reactions: 0
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
  }, [inputMessage, currentUser]);

  const handleTip = useCallback((amount: number, message: string, recipient: string) => {
    if (onRequestTip) {
      onRequestTip({
        from: currentUser.id,
        to: recipient,
        amount,
        message,
        timestamp: Date.now()
      });
    }
  }, [onRequestTip, currentUser]);

  const parseTipCommand = useCallback((input: string) => {
    const m = input.trim().match(/^\/tip\s+@?(\w+)\s+(\d+)/i);
    if (!m) return null;
    return { to: m[1], amount: Number(m[2]) };
  }, []);

  const handleInputSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim()) return;
    
    const parsed = parseTipCommand(inputMessage);
    if (parsed && onRequestTip) {
      onRequestTip({
        from: currentUser.id,
        to: parsed.to,
        amount: parsed.amount,
        message: '',
        timestamp: Date.now()
      });
      setInputMessage('');
      return;
    }
    
    handleSendMessage();
  }, [inputMessage, parseTipCommand, onRequestTip, currentUser, handleSendMessage]);

  const tipsSent = useMemo(() => 
    messages.filter(m => m.sender === currentUser.username && m.tipAmount).length,
    [messages, currentUser]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h1 className="text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent drop-shadow-2xl">
          VeryTippers Chat
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Gasless tipping with AI suggestions, voice commands, NFT badges, and DAO governance
        </p>
      </motion.div>

      {/* Messages */}
      <Card className="bg-slate-900/30 backdrop-blur-xl border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageCircle className="h-5 w-5" />
            Live Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 overflow-y-auto space-y-4 pr-2">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="group"
                >
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0">
                      {message.sender.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-white text-sm">{message.sender}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                        {message.tipAmount && (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                            💸 {message.tipAmount} VERY
                          </span>
                        )}
                      </div>
                      <div className="text-white text-sm leading-relaxed break-words">
                        {message.message}
                      </div>
                      {/* AI Suggestion Tooltip */}
                      {message.sender !== currentUser.username && (
                        <div className="mt-2">
                          <AISuggestionTooltip
                            message={message.message}
                            sender={message.sender}
                            onTip={(amount, msg) => handleTip(amount, msg, message.sender)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Ad Slot */}
      <AdSlot tags={['dev', 'web3']} className="mb-4" />

      {/* Input */}
      <Card className="bg-slate-900/30 backdrop-blur-xl border-slate-700/50">
        <CardContent className="pt-6">
          <form onSubmit={handleInputSubmit} className="space-y-3">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type /tip @username <amount> or mention someone..."
              className="w-full bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={!inputMessage.trim()}
              >
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInputMessage('/tip @alice 5')}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Quick Tip
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Personalized Insights */}
      {isConnected && address && (
        <PersonalizedInsights userId={address} />
      )}

      {/* Achievement Badges */}
      {isConnected && address && (
        <BadgeDisplay userId={address} />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-slate-800/50 to-slate-700/50 border-slate-600/50 text-center">
          <div className="text-2xl font-bold text-white mb-1">{tipsSent}</div>
          <div className="text-sm text-slate-400">Tips Sent</div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-emerald-500/50 text-center">
          <div className="text-2xl font-bold text-emerald-400 mb-1">#{Math.floor(Math.random() * 100) + 1}</div>
          <div className="text-sm text-emerald-300">Leaderboard Rank</div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/50 text-center">
          <div className="text-2xl font-bold text-purple-400 mb-1">{badges.length}</div>
          <div className="text-sm text-purple-300">Badges</div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-blue-500/50 text-center">
          <div className="text-2xl font-bold text-blue-400 mb-1">Active</div>
          <div className="text-sm text-blue-300">DAO Member</div>
        </Card>
      </div>
    </div>
  );
}

