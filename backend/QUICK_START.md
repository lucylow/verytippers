# Quick Start Guide

## Prerequisites

- Node.js 20+ installed
- Docker & Docker Compose installed (recommended)
- OR PostgreSQL 15+ and Redis 7+ installed locally

## Option 1: Docker (Recommended)

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Install dependencies and run migrations:**
   ```bash
   npm install
   npm run migrate:run
   ```

5. **Start the server:**
   ```bash
   npm run dev
   ```

6. **Verify it's working:**
   ```bash
   curl http://localhost:3000/api/health
   ```

## Option 2: Local Development

1. **Start PostgreSQL and Redis:**
   ```bash
   # PostgreSQL
   createdb verytippers
   
   # Redis
   redis-server
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Update DATABASE_URL and REDIS settings
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Run migrations:**
   ```bash
   npm run migrate:run
   ```

5. **Start the server:**
   ```bash
   npm run dev
   ```

## Required Environment Variables

Minimum required for basic functionality:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/verytippers
REDIS_HOST=localhost
REDIS_PORT=6379
VERY_RPC_URL=https://rpc.verylabs.io
VERYCHAT_API_KEY=your_api_key_here
RELAYER_PRIVATE_KEY=your_relayer_private_key
```

## Testing the Setup

1. **Health Check:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Check Database Connection:**
   - Should see "✅ Database connected successfully" in logs

3. **Check Redis Connection:**
   - Should see no Redis errors in logs

## Common Issues

### Database Connection Failed
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists: `createdb verytippers`

### Redis Connection Failed
- Ensure Redis is running
- Check REDIS_HOST and REDIS_PORT in .env
- If using password, set REDIS_PASSWORD

### Contract Address Errors
- Set TIP_CONTRACT_ADDRESS and BADGE_CONTRACT_ADDRESS in .env
- Or the service will gracefully handle missing contracts

## Next Steps

1. Configure VeryChat API credentials
2. Deploy smart contracts and update addresses
3. Set up IPFS service (Pinata recommended)
4. Configure relayer wallet with funds
5. Test tip processing end-to-end

