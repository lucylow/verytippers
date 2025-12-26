# VeryTippers Production Deployment Guide

This guide covers deploying VeryTippers from hackathon mode to production.

## Phase 1: Database Migration

### 1.1 Update Prisma Schema

The production schema includes:
- `UserStats` model for leaderboard tracking
- `TipStatus` enum (PENDING, PROCESSED, FAILED)
- Enhanced `Tip` model with `ipfsCid` and `moderation` fields

```bash
# Generate Prisma client
npm run db:generate

# Create migration
npm run db:migrate

# For production deployments
npm run db:migrate:deploy
```

### 1.2 Environment Variables

Create a `.env` file with:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/verytippers

# Redis
REDIS_URL=redis://localhost:6379

# IPFS (Infura or Pinata)
IPFS_PROJECT_ID=your_infura_project_id
IPFS_PROJECT_SECRET=your_infura_project_secret
# OR
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_API_KEY=your_pinata_secret

# Encryption (64 hex characters = 32 bytes for AES-256)
ENCRYPTION_KEY=your_64_character_hex_key_here_00000000000000000000000000000000

# Blockchain
VERY_CHAIN_RPC_URL=https://rpc.verychain.org
TIP_CONTRACT_ADDRESS=0xYourDeployedContractAddress
SPONSOR_PRIVATE_KEY=0xYourRelayerPrivateKey

# Hugging Face (for moderation)
HUGGINGFACE_API_KEY=your_hf_token
```

## Phase 2: Production Services

### 2.1 IPFS with Encryption

The IPFS service now supports AES-256-GCM encryption:

```typescript
import { IpfsService } from './server/services/IpfsService';

const ipfsService = new IpfsService();

// Encrypt and upload
const cid = await IpfsService.encryptAndPin("Secret message", ipfsService);

// Decrypt and retrieve
const message = await IpfsService.retrieveAndDecrypt(cid, ipfsService);
```

### 2.2 BullMQ Queue Workers

Start the tip processor worker:

```bash
# Development
npm run queue:workers

# Production (with PM2)
pm2 start server/scripts/startTipProcessor.ts --name tip-processor
```

The queue worker:
- Processes tips with 5 concurrent workers
- Implements retry logic (3 attempts with exponential backoff)
- Moves failed jobs to dead letter queue after max retries
- Updates Redis leaderboards
- Updates UserStats in database

### 2.3 Blockchain Event Listener

Start the event listener for real-time blockchain events:

```bash
# Development
npm run event:listener

# Production (with PM2)
pm2 start server/scripts/startEventListener.ts --name event-listener
```

The event listener:
- Listens for `TipSent` events on-chain
- Updates database automatically
- Triggers real-time updates

### 2.4 Enhanced Moderation Pipeline

The moderation service now uses a multi-stage pipeline:

1. **Heuristic pre-filter** (0ms cost)
2. **Parallel ML inference** (<200ms)
   - Sentiment analysis
   - Toxicity detection
   - Spam detection
3. **Contextual scoring**
4. **Manual review queue** (if needed)

```typescript
import { ModerationPipeline } from './server/services/moderationPipeline';

const pipeline = new ModerationPipeline();
const result = await pipeline.processTipMessage(message, {
    senderId: 'user123',
    recipientId: 'user456'
});
```

## Phase 3: EIP-712 Meta-Transactions

The EIP-712 signing service is available for gasless transactions:

```typescript
import { createMetaTransaction } from './server/services/eip712Relayer';

const result = await createMetaTransaction(signer, {
    recipient: '0x...',
    amount: '1.0',
    ipfsCid: 'Qm...'
});
```

## Phase 4: Testing

### 4.1 Contract Tests

Run Hardhat tests:

```bash
npm run test:contracts
```

The test suite covers:
- Deployment and initialization
- Meta-transaction processing
- Replay attack prevention
- Invalid signature rejection
- Input validation

### 4.2 Health Checks

Add health check endpoint:

```typescript
// GET /health
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        database: 'connected',
        redis: 'connected',
        timestamp: new Date().toISOString()
    });
});
```

## Phase 5: Production Deployment Checklist

### Infrastructure

- [ ] PostgreSQL database provisioned (RDS or managed service)
- [ ] Redis instance provisioned (ElastiCache or managed service)
- [ ] IPFS node/pinning service configured (Infura or Pinata)
- [ ] Environment variables set
- [ ] Database migrations applied (`npm run db:migrate:deploy`)

### Services

- [ ] API server running (`npm run start:api`)
- [ ] Queue workers running (`npm run queue:workers`)
- [ ] Event listener running (`npm run event:listener`)
- [ ] Health checks passing (`curl http://localhost:3001/health`)

### Blockchain

- [ ] Contracts deployed and verified
- [ ] Contract addresses updated in config
- [ ] Relayer wallet funded (0.1 VERY recommended)
- [ ] Event listener connected to contract

### Security

- [ ] ENCRYPTION_KEY set (64 hex characters)
- [ ] Rate limiting enabled (express-rate-limit)
- [ ] Error tracking configured (Sentry)
- [ ] HTTPS enabled

### Monitoring

- [ ] Logging configured
- [ ] Metrics collection set up
- [ ] Alerts configured
- [ ] Dead letter queue monitoring

## Deployment Commands

```bash
# 1. Build application
npm run build

# 2. Generate Prisma client
npm run db:generate

# 3. Run migrations
npm run db:migrate:deploy

# 4. Start services (using PM2)
pm2 start dist/index.js --name api-server
pm2 start dist/scripts/startTipProcessor.js --name tip-processor
pm2 start dist/scripts/startEventListener.js --name event-listener

# 5. Save PM2 configuration
pm2 save
pm2 startup
```

## Estimated Costs

- RDS (PostgreSQL): ~$50/month
- Redis (ElastiCache): ~$30/month
- IPFS (Infura/Pinata): Free tier available
- **Total: ~$80-150/month**

## Troubleshooting

### Queue workers not processing

Check Redis connection:
```bash
redis-cli ping
```

### Event listener not receiving events

1. Verify contract address is correct
2. Check RPC URL is accessible
3. Ensure contract is deployed and emitting events

### Database connection errors

1. Verify DATABASE_URL is correct
2. Check database is accessible from server
3. Ensure migrations are applied

## Support

For issues or questions, refer to:
- Documentation: `/docs`
- API Guide: `/docs/APIS_AND_DATASETS.md`
- Quick Start: `/docs/QUICK_START_APIS.md`
