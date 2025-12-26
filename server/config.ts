import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the root of the project
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    // Server
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3001'),
    API_VERSION: process.env.API_VERSION || 'v1',

    // Database
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/verytippers',

    // Verychat Bot
    VERYCHAT_API_URL: process.env.VERYCHAT_API_URL || 'https://api.verychat.io/v1',
    VERYCHAT_API_KEY: process.env.VERYCHAT_API_KEY || '',
    VERYCHAT_BOT_TOKEN: process.env.VERYCHAT_BOT_TOKEN || 'dummy_token',
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'dummy_secret',

    // Redis
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

    // IPFS - Infura
    IPFS_PROJECT_ID: process.env.IPFS_PROJECT_ID || '',
    IPFS_PROJECT_SECRET: process.env.IPFS_PROJECT_SECRET || '',

    // IPFS - Pinata (Free tier: 1GB storage, recommended for demo/hack)
    PINATA_API_KEY: process.env.PINATA_API_KEY || '',
    PINATA_SECRET_API_KEY: process.env.PINATA_SECRET_API_KEY || '',
    PINATA_GATEWAY_URL: process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud',

    // Blockchain
    VERY_CHAIN_RPC_URL: process.env.VERY_CHAIN_RPC_URL || 'http://localhost:8545',
    SPONSOR_PRIVATE_KEY: process.env.SPONSOR_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001',
    
    // Contract Addresses
    TIP_CONTRACT_ADDRESS: process.env.TIP_CONTRACT_ADDRESS || '0xTipContractAddress',
    BADGE_CONTRACT_ADDRESS: process.env.BADGE_CONTRACT_ADDRESS || '0xBadgeContractAddress',
    VERY_TOKEN_ADDRESS: process.env.VERY_TOKEN_ADDRESS || '0xVeryTokenAddress',
    VERY_REWARDS_CONTRACT_ADDRESS: process.env.VERY_REWARDS_CONTRACT_ADDRESS || '0xVeryRewardsAddress',
    NFT_CONTRACT_ADDRESS: process.env.NFT_CONTRACT_ADDRESS || '0xNFTContractAddress',
    MARKETPLACE_CONTRACT_ADDRESS: process.env.MARKETPLACE_CONTRACT_ADDRESS || '0xMarketplaceAddress',
    
    // Reward Signer (KMS/HSM private key - use KMS in production)
    REWARD_SIGNER_PRIVATE_KEY: process.env.REWARD_SIGNER_PRIVATE_KEY || process.env.SPONSOR_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001',

    // AI/HuggingFace
    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || 'dummy_hf_key',
    
    // OpenAI
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',

    // Encryption
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '', // 64 hex characters (32 bytes) for AES-256

    // Supabase
    SUPABASE: {
        URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
        SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
    }
};