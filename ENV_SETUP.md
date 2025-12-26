# Environment Variables Setup Guide

This guide helps you set up all required environment variables for VeryTippers.

## Quick Setup

1. Copy the template below to create your `.env` file:
```bash
cp ENV_SETUP.md .env
# Then edit .env with your actual values
```

2. Generate encryption key:
```bash
openssl rand -hex 32
# Copy the output to ENCRYPTION_KEY in .env
```

## Required Environment Variables

### Database Configuration
```env
DATABASE_URL="postgresql://verytippers:password@localhost:5432/verytippers?schema=public"
```

### Redis Configuration
```env
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
```

### OpenAI API
```env
OPENAI_API_KEY="sk-proj-your-key-here"
```
Get your key from: https://platform.openai.com/api-keys

### Hugging Face API
```env
HUGGINGFACE_TOKEN="hf_your_token"
HUGGINGFACE_API_KEY="hf_your_token"
```
Get your token from: https://huggingface.co/settings/tokens

### Encryption Key (32 bytes = 64 hex characters)
```env
ENCRYPTION_KEY="a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
```
Generate with: `openssl rand -hex 32`

### VERY Chain Configuration
```env
VERY_RPC_URL="https://rpc.verychain.org"
VERY_CHAIN_RPC="https://rpc.verychain.org"
VERY_CHAIN_ID="4613"
NEXT_PUBLIC_VERY_RPC="https://rpc.verychain.org"
```

### IPFS Configuration
```env
IPFS_API_URL="https://ipfs.infura.io:5001/api/v0"
IPFS_API_TOKEN="your_infura_token"
IPFS_PROJECT_ID="your_infura_project_id"
IPFS_PROJECT_SECRET="your_infura_project_secret"
IPFS_GATEWAY="https://ipfs.io/ipfs/"
```
Get Infura credentials from: https://infura.io/dashboard

### Relayer Configuration
```env
RELAYER_PRIVATE_KEY="your_relayer_private_key_here"
RELAYER_ADDRESS=""
```
Generate a private key for the relayer (keep this secure!)

### VeryChat API
```env
VERYCHAT_API_KEY="your_verychat_api_key"
VERYCHAT_PROJECT_ID="your_verychat_project_id"
VERYCHAT_API_URL="https://gapi.veryapi.io"
VERYCHAT_BOT_TOKEN=""
```

### JWT Secret
```env
JWT_SECRET="change-this-in-production-to-a-random-secret"
```
Generate with: `openssl rand -hex 32`

### Contract Addresses (set after deployment)
```env
TIP_CONTRACT_ADDRESS=""
BADGE_CONTRACT_ADDRESS=""
VERY_TOKEN_ADDRESS=""
USDC_TOKEN_ADDRESS=""
TIP_ROUTER_ADDRESS=""
NFT_CONTRACT_ADDRESS=""
DAO_CONTRACT_ADDRESS=""
```

### Frontend Environment Variables
```env
VITE_APP_NETWORK_RPC="https://rpc.verychain.org"
VITE_APP_CHAIN_ID="4613"
VITE_APP_RELAYER_URL="http://localhost:8080"
VITE_IPFS_URL="https://ipfs.infura.io:5001/api/v0"
VITE_TIP_CONTRACT_ADDRESS=""
VITE_VERY_TOKEN_ADDRESS=""
VITE_TIP_ROUTER_ADDRESS=""
VITE_NFT_CONTRACT_ADDRESS=""
VITE_DAO_CONTRACT_ADDRESS=""
```

### Node Environment
```env
NODE_ENV="development"
PORT="3001"
```

## Setup Steps

1. **Create .env file** in the root directory
2. **Copy the variables above** and fill in your values
3. **Generate encryption key**: `openssl rand -hex 32`
4. **Start Docker services**: `npm run db:setup`
5. **Run migrations**: `npm run db:migrate`
6. **Start development**: `npm run dev:full`

## Verification

After setup, verify your configuration:

```bash
# Check database connection
npm run db:studio

# Check Redis connection
redis-cli ping

# Test contracts compilation
npm run compile

# Test backend
npm run dev:backend
```

## Security Notes

- **Never commit .env to git** (it's in .gitignore)
- **Use strong, random values** for ENCRYPTION_KEY and JWT_SECRET
- **Keep RELAYER_PRIVATE_KEY secure** - this controls meta-transaction signing
- **Rotate API keys regularly** in production
