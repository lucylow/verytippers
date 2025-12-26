# VeryTippers Backend

Backend implementation for VeryTippers - A social tipping bot for Very Network.

## Features

- ✅ Full VeryChat integration with webhook handling
- ✅ VERY Chain smart contract interaction with gas sponsorship
- ✅ Real-time tip processing with rate limiting and KYC checks
- ✅ Leaderboard system with automatic periodic updates
- ✅ Badge achievement system with on-chain integration
- ✅ IPFS storage for encrypted messages
- ✅ Redis caching for performance
- ✅ Docker deployment for easy setup
- ✅ Security features including rate limiting and signature verification

## Project Structure

```
backend/
├── src/
│   ├── contracts/          # Smart contract ABIs and interfaces
│   ├── services/          # Business logic services
│   │   ├── blockchain/    # Blockchain interaction services
│   │   └── verychat/      # VeryChat API services
│   ├── controllers/       # API/Webhook controllers
│   ├── models/           # Database models (TypeORM)
│   ├── repositories/     # Database access layer
│   ├── middleware/       # Auth, rate limiting, etc.
│   ├── utils/           # Helper functions
│   ├── workers/         # Background job processors
│   └── config/          # Configuration files
├── docker-compose.yml
├── package.json
├── .env.example
└── README.md
```

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start services with Docker:**
   ```bash
   docker-compose up -d
   ```

   Or start PostgreSQL and Redis manually:
   ```bash
   # PostgreSQL
   createdb verytippers
   
   # Redis
   redis-server
   ```

4. **Run database migrations:**
   ```bash
   npm run migrate:run
   ```

5. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST` / `REDIS_PORT` - Redis configuration
- `VERY_RPC_URL` - VERY Chain RPC endpoint
- `VERYCHAT_API_KEY` - VeryChat API key
- `RELAYER_PRIVATE_KEY` - Private key for gas sponsorship

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Webhooks
- `POST /api/webhook/verychat` - VeryChat webhook endpoint
- `POST /api/webhook/blockchain` - Blockchain event webhook

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Deployment

See `deploy.sh` for deployment script.

```bash
chmod +x deploy.sh
./deploy.sh
```

## License

MIT

