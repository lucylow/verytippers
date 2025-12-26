import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the root of the project
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  // VERY Chain Configuration
  VERY_CHAIN: {
    RPC_URL: process.env.VERY_RPC_URL || process.env.VERY_CHAIN_RPC_URL || 'https://rpc.verylabs.io',
    CHAIN_ID: parseInt(process.env.VERY_CHAIN_ID || '4613'),
    EXPLORER_URL: process.env.EXPLORER_URL || 'https://explorer.very.network',
    VERY_TOKEN_ADDRESS: process.env.VERY_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000001',
    USDC_TOKEN_ADDRESS: process.env.USDC_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000002'
  },

  // VeryChat API Configuration
  VERYCHAT_API: {
    BASE_URL: process.env.VERYCHAT_API_URL || 'https://gapi.veryapi.io',
    PROJECT_ID: process.env.VERYCHAT_PROJECT_ID || process.env.VERYCHAT_API_KEY || '',
    API_KEY: process.env.VERYCHAT_API_KEY || '',
    BOT_TOKEN: process.env.VERYCHAT_BOT_TOKEN || ''
  },

  // Database
  DATABASE: {
    URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/verytippers',
    POOL_SIZE: parseInt(process.env.DB_POOL_SIZE || '10')
  },

  // Redis for caching and sessions
  REDIS: {
    HOST: process.env.REDIS_HOST || 'localhost',
    PORT: parseInt(process.env.REDIS_PORT || '6379'),
    PASSWORD: process.env.REDIS_PASSWORD || '',
    URL: process.env.REDIS_URL || 'redis://localhost:6379'
  },

  // IPFS Configuration
  IPFS: {
    GATEWAY: process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
    API_URL: process.env.IPFS_API_URL || 'https://api.ipfs.io/api/v0',
    PROJECT_ID: process.env.IPFS_PROJECT_ID || '',
    PROJECT_SECRET: process.env.IPFS_PROJECT_SECRET || '',
    PINATA_API_KEY: process.env.PINATA_API_KEY || '',
    PINATA_SECRET_API_KEY: process.env.PINATA_SECRET_API_KEY || ''
  },

  // Security
  SECURITY: {
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'encryption-key-change-in-production',
    RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'webhook-secret-change-in-production'
  },

  // Relayer (Gas Sponsorship)
  RELAYER: {
    PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY || process.env.SPONSOR_PRIVATE_KEY || '',
    SPONSOR_THRESHOLD: parseFloat(process.env.SPONSOR_THRESHOLD || '10'), // 10 VERY
    GAS_LIMIT: parseInt(process.env.GAS_LIMIT || '200000')
  },

  // Contract Addresses
  CONTRACTS: {
    TIP_CONTRACT_ADDRESS: process.env.TIP_CONTRACT_ADDRESS || '',
    BADGE_CONTRACT_ADDRESS: process.env.BADGE_CONTRACT_ADDRESS || ''
  },

  // Server
  SERVER: {
    PORT: parseInt(process.env.PORT || '3001'),
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
};

