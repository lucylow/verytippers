# Monetization & Checkout Setup Guide

This guide covers the complete setup for the monetization payment checkout process with blockchain integration for VeryTippers.

## Overview

The monetization system includes:
- **Stripe Integration**: Fiat payment processing for buying credits
- **Credit System**: In-app credits that can be used for tipping
- **Gasless Crypto Flow**: Meta-transactions for blockchain tips without gas fees
- **Relayer Worker**: Processes meta-transactions with AWS KMS signing support

## Architecture

```
User → Stripe Checkout → Webhook → Credits Balance → Tip with Credits → Meta-Tx Queue → Relayer Worker → Blockchain
```

## Environment Variables

### Backend / Server

Add these to your `.env` file in the project root:

```bash
# Server
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Get webhook secret from: Stripe Dashboard → Developers → Webhooks

# Redis (optional, for queue)
REDIS_URL=redis://localhost:6379

# AWS KMS (for production relayer signing)
KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/abc123...
AWS_REGION=us-east-1

# Relayer Configuration
RELAYER_ETH_RPC=https://rpc.testnet.verychain.org
RELAYER_WALLET_ADDRESS=0x...    # Public address of the KMS key (or local wallet)
LOCAL_RELAYER_PRIVATE_KEY=0x...  # For local/testnet development (NEVER use mainnet keys)
TIPROUTER_ADDRESS=0x...          # Deployed TipRouter contract address
TIPROUTER_ABI_PATH=./contracts/abis/TipRouter.json

# Alternative: Use existing config
VERY_CHAIN_RPC_URL=https://rpc.testnet.verychain.org
SPONSOR_PRIVATE_KEY=0x...        # Same as LOCAL_RELAYER_PRIVATE_KEY
TIP_CONTRACT_ADDRESS=0x...       # Same as TIPROUTER_ADDRESS
```

### Frontend

Add these to your `.env` file (or `.env.local`):

```bash
# Supabase (already configured)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Contract Addresses (optional, for direct contract interaction)
VITE_TIP_ROUTER_ADDRESS=0x...
VITE_TIP_CONTRACT_ADDRESS=0x...
```

## Setup Steps

### 1. Install Dependencies

```bash
# Install Stripe SDK
pnpm add stripe @stripe/stripe-js

# Install AWS SDK for KMS (for relayer)
pnpm add @aws-sdk/client-kms @aws-sdk/util-hex-encoding

# Install ioredis (if not already installed)
pnpm add ioredis
```

### 2. Set Up Supabase Database

1. Open Supabase SQL Editor
2. Run migrations in order:
   - `supabase/migrations/001_supabase_schema.sql` (if not already run)
   - `supabase/migrations/003_monetization_schema.sql` (new)

The migration creates:
- `balances` table: Stores user credit balances
- `orders` table: Tracks Stripe checkout sessions
- Updates `meta_tx_queue` table: Adds columns for credit-based tips

### 3. Configure Stripe

1. **Create Stripe Account**: Go to [stripe.com](https://stripe.com) and create an account
2. **Get API Keys**: 
   - Dashboard → Developers → API keys
   - Copy `Publishable key` → `VITE_STRIPE_PUBLISHABLE_KEY`
   - Copy `Secret key` → `STRIPE_SECRET_KEY`
3. **Set Up Webhook**:
   - Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/checkout/stripe-webhook`
   - Select event: `checkout.session.completed`
   - Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`
4. **For Local Testing**:
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe
   
   # Login
   stripe login
   
   # Forward webhooks to local server
   stripe listen --forward-to localhost:3001/api/checkout/stripe-webhook
   ```
   The CLI will output a webhook secret starting with `whsec_` - use this for `STRIPE_WEBHOOK_SECRET` in local development.

### 4. Configure AWS KMS (Optional, for Production)

For production, use AWS KMS for signing meta-transactions:

1. **Create KMS Key**:
   ```bash
   aws kms create-key --description "VeryTippers Relayer Signing Key"
   ```
2. **Get Key ID**: Copy the ARN from the response
3. **Get Public Address**: Extract the public key and derive Ethereum address
   ```bash
   # Use a script or tool to derive address from KMS public key
   # The relayer worker will handle signing
   ```
4. **Set Environment Variables**:
   ```bash
   KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/abc123...
   AWS_REGION=us-east-1
   ```

**For Testnet/Development**: Use `LOCAL_RELAYER_PRIVATE_KEY` instead (never use mainnet keys).

### 5. Deploy TipRouter Contract

If not already deployed:

```bash
# Compile contracts
pnpm run compile

# Deploy to testnet
pnpm run deploy:testnet

# Update TIPROUTER_ADDRESS in .env
```

### 6. Start Services

**Terminal 1: Main Server**
```bash
pnpm run dev:server
# or
cd server && npm run dev
```

**Terminal 2: Relayer Worker** (optional, if using separate worker)
```bash
cd relayer
ts-node src/relayer-worker.ts
# or
node dist/relayer-worker.js
```

**Terminal 3: Frontend**
```bash
pnpm dev
```

**Terminal 4: Stripe Webhook Forwarding** (for local testing)
```bash
stripe listen --forward-to localhost:3001/api/checkout/stripe-webhook
```

## API Endpoints

### Checkout Endpoints

- `POST /api/checkout/stripe-create-session` - Create Stripe checkout session
  ```json
  {
    "userId": "uuid",
    "credits": 100,
    "success_url": "https://...",
    "cancel_url": "https://..."
  }
  ```

- `POST /api/checkout/stripe-webhook` - Stripe webhook handler (called by Stripe)

- `POST /api/checkout/create-meta-tx` - Create meta-transaction for tipping
  ```json
  {
    "userId": "uuid",
    "toAddress": "0x...",
    "amount": 5,
    "cid": "Qm...",
    "nonceHint": 1234567890,
    "fromAddress": "0x...",
    "signature": "0x..."
  }
  ```

- `GET /api/checkout/balance/:userId` - Get user balance

- `GET /api/checkout/orders/:userId` - Get user order history

## Frontend Usage

### Using CheckoutModal Component

```tsx
import CheckoutModal from '@/components/CheckoutModal';

function MyComponent() {
  const userId = "user-uuid-here";
  
  return (
    <CheckoutModal
      userId={userId}
      onSuccess={() => {
        console.log("Purchase successful!");
      }}
      onClose={() => {
        console.log("Modal closed");
      }}
    />
  );
}
```

The component provides:
- **Fiat Tab**: Buy credits via Stripe
- **Crypto Tab**: Gasless tipping using credits

## Relayer Worker

The relayer worker processes meta-transactions from the queue:

1. **Polls Queue**: Checks Redis or database for queued meta-transactions
2. **Signs Payload**: Uses AWS KMS or local private key
3. **Submits to Chain**: Calls `TipRouter.submitTip()` on-chain
4. **Updates Status**: Marks transaction as submitted/failed

### Running the Worker

```bash
# Development
ts-node relayer/src/relayer-worker.ts

# Production
node dist/relayer-worker.js
```

## Testing

### Test Stripe Flow

1. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future expiry date, any CVC

2. Check Supabase:
   - `orders` table should show new order
   - `balances` table should show credited amount

### Test Gasless Tip Flow

1. Ensure user has credits in balance
2. Use CheckoutModal "Gasless Tip" tab
3. Enter recipient address and amount
4. Sign with MetaMask
5. Check `meta_tx_queue` table for queued transaction
6. Relayer worker should process and submit to chain

## Troubleshooting

### Stripe Webhook Not Working

- Verify webhook secret matches
- Check Stripe dashboard for webhook delivery logs
- For local testing, use `stripe listen` CLI

### Relayer Not Processing

- Check Redis connection (if using Redis queue)
- Verify `LOCAL_RELAYER_PRIVATE_KEY` or KMS is configured
- Check `TIPROUTER_ADDRESS` is set correctly
- Review relayer worker logs

### Insufficient Credits Error

- Verify user has balance in `balances` table
- Check credit deduction logic in `/api/checkout/create-meta-tx`

### KMS Signing Fails

- Verify AWS credentials are configured
- Check KMS key permissions
- Fallback to local key for testing

## Production Checklist

- [ ] Use production Stripe keys (not test keys)
- [ ] Configure AWS KMS for relayer signing
- [ ] Set up proper webhook endpoint (HTTPS)
- [ ] Enable database transactions for balance updates
- [ ] Add rate limiting to checkout endpoints
- [ ] Implement fraud detection
- [ ] Set up monitoring and alerts
- [ ] Test webhook retry logic
- [ ] Configure proper CORS for frontend
- [ ] Use environment-specific contract addresses

## Security Notes

1. **Never commit private keys** to version control
2. **Use KMS in production** - never store private keys in code
3. **Validate webhook signatures** - always verify Stripe webhooks
4. **Use transactions** for balance updates to prevent race conditions
5. **Rate limit** checkout endpoints to prevent abuse
6. **Monitor** for unusual patterns (fraud detection)

## Next Steps

- Add batching for meta-transactions (reduce gas costs)
- Implement KYC gating for large tips
- Add automatic explorer link generation
- Set up real-time notifications via WebSocket
- Add analytics and reporting

