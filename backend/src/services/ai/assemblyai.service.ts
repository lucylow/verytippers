import { AssemblyAI } from 'assemblyai';
import { config } from '../../config/app';
import { logger } from '../../utils/logger';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  processingTime: number;
}

export class AssemblyAIService {
  private client: AssemblyAI | null = null;
  
  constructor() {
    if (config.ASSEMBLYAI_API_KEY) {
      this.client = new AssemblyAI({
        apiKey: config.ASSEMBLYAI_API_KEY,
      });
    }
  }
  
  async transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResult> {
    if (!this.client) {
      return {
        text: '',
        confidence: 0,
        processingTime: 0
      };
    }

    const startTime = Date.now();
    
    try {
      // Upload audio file
      const file = await this.client.files.upload(audioBuffer);
      
      // Transcribe
      const transcript = await this.client.transcripts.transcribe({
        audio: file,
        language_detection: true,
      });
      
      const processingTime = Date.now() - startTime;
      
      return {
        text: transcript.text || '',
        confidence: transcript.confidence || 0.5,
        processingTime
      };
      
    } catch (error) {
      logger.error('AssemblyAI transcription error:', error);
      return {
        text: '',
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }
  
  async transcribeFromUrl(audioUrl: string): Promise<TranscriptionResult> {
    if (!this.client) {
      return {
        text: '',
        confidence: 0,
        processingTime: 0
      };
    }

    const startTime = Date.now();
    
    try {
      const transcript = await this.client.transcripts.transcribe({
        audio: audioUrl,
        language_detection: true,
      });
      
      const processingTime = Date.now() - startTime;
      
      return {
        text: transcript.text || '',
        confidence: transcript.confidence || 0.5,
        processingTime
      };
      
    } catch (error) {
      logger.error('AssemblyAI transcription from URL error:', error);
      return {
        text: '',
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }
}

