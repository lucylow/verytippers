// src/services/voice-tipping.ts
// Voice-Activated Tipping with AssemblyAI + VERY Chain
// "Tip @alice 5 VERY" → Instant gasless tip

import { z } from 'zod';

// Voice command schema (Zod validation)
const VoiceCommandSchema = z.object({
  action: z.enum(['tip', 'send']),
  recipient: z.string().regex(/@?[\w]+/), // @username format or username
  amount: z.number().min(0.1).max(100),
  currency: z.enum(['VERY']).optional(),
  message: z.string().optional()
});

export type VoiceCommand = z.infer<typeof VoiceCommandSchema>;

// Extended Window interface for speech recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

/**
 * Real-time voice tipping service
 */
export class VoiceTippingService {
  private isListening = false;
  private recognitionRef: any = null;
  private assemblyAIStream: any = null;

  async startListening(onCommand: (cmd: VoiceCommand) => Promise<void>) {
    if (this.isListening) return;

    try {
      // 1. Browser Speech Recognition (fallback + real-time)
      if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = async (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');

          // Only process final results
          const finalResult = Array.from(event.results).find((result: any) => result.isFinal);
          if (finalResult) {
            const command = await this.parseVoiceCommand(transcript);
            if (command) {
              await onCommand(command);
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          // Don't stop listening on errors, just log them
        };

        recognition.onend = () => {
          // Restart recognition if it ended unexpectedly
          if (this.isListening) {
            try {
              recognition.start();
            } catch (error) {
              console.error('Failed to restart recognition:', error);
            }
          }
        };

        recognition.start();
        this.recognitionRef = recognition;
        this.isListening = true;
      } else {
        console.warn('Speech recognition not supported in this browser');
      }

      // 2. AssemblyAI integration would go here (if API key is available)
      // For now, we'll rely on browser speech recognition

    } catch (error) {
      console.error('Voice tipping failed to start:', error);
    }
  }

  private async parseVoiceCommand(transcript: string): Promise<VoiceCommand | null> {
    try {
      // Normalize speech → structured command
      const normalized = transcript.toLowerCase()
        .replace(/ dollars?/g, ' VERY')
        .replace(/verys?/g, 'VERY')
        .replace(/send /g, 'tip ')
        .replace(/give /g, 'tip ')
        .trim();

      // Quick heuristic filter
      if (!normalized.includes('tip') && !normalized.includes('send') && !normalized.includes('give')) {
        return null;
      }

      // Try to parse with server-side endpoint (more accurate)
      try {
        const response = await fetch('/api/voice/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: normalized })
        });

        if (response.ok) {
          const parsed = await response.json();
          if (parsed.command) {
            return VoiceCommandSchema.parse(parsed.command);
          }
        }
      } catch (error) {
        console.warn('Server-side parsing failed, using fallback:', error);
      }

      // Fallback: Simple client-side parsing
      return this.parseVoiceCommandFallback(normalized);

    } catch (error) {
      console.error('Voice parsing failed:', error);
      return null;
    }
  }

  private parseVoiceCommandFallback(transcript: string): VoiceCommand | null {
    // Simple regex-based parsing as fallback
    // "tip @alice 5 very" or "send bob ten dollars"
    
    const tipMatch = transcript.match(/tip|send|give/i);
    if (!tipMatch) return null;

    // Extract username (handle @username or just username)
    const usernameMatch = transcript.match(/@?(\w+)/i);
    if (!usernameMatch) return null;
    const recipient = usernameMatch[0].startsWith('@') ? usernameMatch[0] : `@${usernameMatch[0]}`;

    // Extract amount (handle written numbers)
    const numberWords: Record<string, number> = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
      'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
    };

    let amount = 0;
    
    // Try to find numeric value
    const numericMatch = transcript.match(/(\d+\.?\d*)/);
    if (numericMatch) {
      amount = parseFloat(numericMatch[1]);
    } else {
      // Try written numbers
      for (const [word, value] of Object.entries(numberWords)) {
        if (transcript.includes(word)) {
          amount = value;
          break;
        }
      }
    }

    if (amount === 0 || amount < 0.1) {
      return null; // Invalid amount
    }

    // Extract optional message
    const messageMatch = transcript.match(/["'](.+?)["']/);
    const message = messageMatch ? messageMatch[1] : undefined;

    try {
      return VoiceCommandSchema.parse({
        action: 'tip',
        recipient,
        amount: Math.min(amount, 100), // Cap at 100
        currency: 'VERY',
        message
      });
    } catch (error) {
      console.error('Validation failed:', error);
      return null;
    }
  }

  stopListening() {
    if (this.recognitionRef) {
      try {
        this.recognitionRef.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      this.recognitionRef = null;
    }
    if (this.assemblyAIStream) {
      try {
        this.assemblyAIStream.close();
      } catch (error) {
        console.error('Error closing AssemblyAI stream:', error);
      }
      this.assemblyAIStream = null;
    }
    this.isListening = false;
  }

  getIsListening(): boolean {
    return this.isListening;
  }
}

