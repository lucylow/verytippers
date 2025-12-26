# Environment Setup Guide

This guide explains how to set up environment variables for VeryTippers.

## Frontend Environment (.env.local)

Create `.env.local` in the project root:

```bash
# Testnet Configuration
VITE_APP_NETWORK_RPC=https://rpc.testnet.verychain.org
VITE_APP_CHAIN_ID=8889
VITE_APP_RELAYER_URL=http://localhost:8080
VITE_APP_REACT_APP_BASE_URL=http://localhost:5173
VITE_APP_WALLET_PROVIDER=local
VITE_APP_CONTRACT_ADDRESS=0xYourTipRouterAddress

# Lovable Integration
LOVABLE_PROJECT_ID=REPLACE_WITH_LOVABLE_PROJECT_ID
```

### For EVM Testnets (Alternative)

If using Sepolia or another EVM testnet:

```bash
VITE_APP_NETWORK_RPC=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
VITE_APP_CHAIN_ID=11155111
```

## Relayer Environment (relayer/.env)

Create `relayer/.env`:

```bash
# Testnet RPC URL
RPC_URL=https://rpc.testnet.verychain.org

# Relayer private key (TESTNET ONLY - NEVER use mainnet keys)
RELAYER_PRIVATE_KEY=0xYourTestnetPrivateKey

# TipRouter contract address (deploy first)
CONTRACT_ADDRESS=0xYourTipRouterAddress

# Server port
PORT=8080
```

### Getting a Testnet Private Key

**Option 1: Generate a new test account**
```bash
npx hardhat account
```

**Option 2: Use MetaMask**
1. Create a new account in MetaMask
2. Export private key (Settings > Security & Privacy > Show Private Key)
3. **Only use testnet accounts** - never use mainnet keys

## Backend Environment (.env)

For the full backend server (if using):

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/verytippers

# Redis
REDIS_URL=redis://localhost:6379

# HuggingFace AI
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx

# Verychat API
VERYCHAT_BOT_TOKEN=bot_token_xxxxx
VERYCHAT_API_KEY=api_key_xxxxx

# Blockchain
VERY_CHAIN_RPC_URL=https://rpc.testnet.verychain.org
TIP_CONTRACT_ADDRESS=0xYourTipRouterAddress
SPONSOR_PRIVATE_KEY=0xYourRelayerPrivateKey

# IPFS (Optional)
IPFS_PROJECT_ID=your_project_id
IPFS_PROJECT_SECRET=your_project_secret
```

## Security Notes

1. **Never commit `.env` or `.env.local` files** - They're in `.gitignore`
2. **Use testnet keys only** - Never use mainnet private keys in development
3. **Rotate keys regularly** - Especially if they're exposed
4. **Use environment-specific configs** - Different configs for dev/staging/prod

## Quick Setup

Run the demo script to create template files:

```bash
./scripts/demo.sh
```

This will create `.env.local` and `relayer/.env.example` if they don't exist.

