import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001'),
  API_VERSION: process.env.API_VERSION || 'v1',
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'verytippers-secret-key',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '',
  
  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'https://verytippers.xyz'
  ],
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/verytippers',
  
  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  
  // Web3
  VERY_CHAIN_RPC: process.env.VERY_CHAIN_RPC || process.env.VERY_RPC_URL || 'https://rpc.verylabs.io',
  VERY_CHAIN_ID: parseInt(process.env.VERY_CHAIN_ID || '4613'),
  
  // Contract Addresses
  TIP_CONTRACT_ADDRESS: process.env.TIP_CONTRACT_ADDRESS || '',
  BADGE_CONTRACT_ADDRESS: process.env.BADGE_CONTRACT_ADDRESS || '',
  VERY_TOKEN_ADDRESS: process.env.VERY_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000001',
  USDC_TOKEN_ADDRESS: process.env.USDC_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000002',
  
  // Relayer
  RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY || '',
  RELAYER_ADDRESS: process.env.RELAYER_ADDRESS || '',
  GAS_SPONSORSHIP_DAILY_LIMIT: parseInt(process.env.GAS_SPONSORSHIP_DAILY_LIMIT || '10'),
  
  // AI Services
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || '',
  ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY || '',
  
  // VeryChat API
  VERYCHAT_API_KEY: process.env.VERYCHAT_API_KEY || process.env.VERYCHAT_PROJECT_ID || '',
  VERYCHAT_BOT_TOKEN: process.env.VERYCHAT_BOT_TOKEN || '',
  VERYCHAT_API_URL: process.env.VERYCHAT_API_URL || 'https://gapi.veryapi.io',
  
  // IPFS
  IPFS_GATEWAY: process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
  IPFS_API_URL: process.env.IPFS_API_URL || 'https://api.ipfs.io/api/v0',
  
  // Monitoring
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Feature Flags
  ENABLE_AI_SUGGESTIONS: process.env.ENABLE_AI_SUGGESTIONS === 'true',
  ENABLE_GAS_SPONSORSHIP: process.env.ENABLE_GAS_SPONSORSHIP === 'true',
  ENABLE_VOICE_COMMANDS: process.env.ENABLE_VOICE_COMMANDS === 'true',
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'VERYCHAT_API_KEY',
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Warning: ${envVar} is not set in environment variables`);
  }
});

