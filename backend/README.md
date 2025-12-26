# VeryTippers Backend

Complete AI + Web3 Backend Integration for VeryTippers - Social Tipping Platform on Very Network.

## Features

### 🤖 AI Integration
- **OpenAI GPT-4** for intelligent tip suggestions and chat
- **Hugging Face** for content moderation and emotion analysis
- **AssemblyAI** for voice command processing
- **AI Orchestrator** for coordinating multiple AI services

### ⛓️ Web3 Integration
- **Very Chain** smart contract interactions
- **Gas Sponsorship** system with meta-transactions
- **Token Management** and balance checking
- **Real-time** blockchain event monitoring

### 🗄️ Database Layer
- **Prisma ORM** with PostgreSQL
- **Redis** for caching and real-time data
- Complete data models for users, tips, badges, etc.

### 🔔 Real-time Features
- **WebSocket** server for live updates
- Push notifications for tips and badges
- Live leaderboard updates

### 🔒 Security
- JWT authentication
- Rate limiting
- Input validation
- Secure Web3 transaction signing

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── ai.routes.ts
│   │   │   └── web3.routes.ts
│   │   ├── controllers/
│   │   │   ├── ai.controller.ts
│   │   │   └── web3.controller.ts
│   │   └── middleware/
│   │       ├── auth.middleware.ts
│   │       ├── rateLimit.middleware.ts
│   │       └── error.middleware.ts
│   ├── services/
│   │   ├── ai/
│   │   │   ├── openai.service.ts
│   │   │   ├── huggingface.service.ts
│   │   │   ├── assemblyai.service.ts
│   │   │   └── aiOrchestrator.service.ts
│   │   ├── web3/
│   │   │   ├── verychain.service.ts
│   │   │   └── gasSponsorship.service.ts
│   │   ├── database/
│   │   │   ├── prisma.service.ts
│   │   │   └── redis.service.ts
│   │   └── notification/
│   │       └── websocket.service.ts
│   ├── config/
│   │   ├── app.ts
│   │   └── web3.ts
│   ├── utils/
│   │   └── logger.ts
│   └── index.ts
├── prisma/
│   └── schema.prisma
├── package.json
├── tsconfig.json
└── README.md
```

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis
- Environment variables configured

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Server
NODE_ENV=development
PORT=3001
API_VERSION=v1

# Security
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
WEBHOOK_SECRET=your-webhook-secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/verytippers

# Redis
REDIS_URL=redis://localhost:6379

# Web3
VERY_CHAIN_RPC=https://rpc.verylabs.io
VERY_CHAIN_ID=4613
TIP_CONTRACT_ADDRESS=0x...
BADGE_CONTRACT_ADDRESS=0x...
VERY_TOKEN_ADDRESS=0x...
USDC_TOKEN_ADDRESS=0x...
RELAYER_PRIVATE_KEY=0x...

# AI Services
OPENAI_API_KEY=sk-...
HUGGINGFACE_API_KEY=...
ASSEMBLYAI_API_KEY=...

# VeryChat API
VERYCHAT_API_KEY=...
VERYCHAT_BOT_TOKEN=...
VERYCHAT_API_URL=https://gapi.veryapi.io

# Feature Flags
ENABLE_AI_SUGGESTIONS=true
ENABLE_GAS_SPONSORSHIP=true
ENABLE_VOICE_COMMANDS=true
```

## API Endpoints

### AI Endpoints

- `POST /api/v1/ai/suggest` - Get AI tip suggestion
- `POST /api/v1/ai/analyze/sentiment` - Analyze message sentiment
- `POST /api/v1/ai/voice` - Process voice command
- `POST /api/v1/ai/chat` - Chat with AI assistant

### Web3 Endpoints

- `POST /api/v1/web3/tip` - Send a tip
- `GET /api/v1/web3/token/:tokenAddress` - Get token info
- `GET /api/v1/web3/gas-sponsorship` - Get gas sponsorship info

### Health Check

- `GET /health` - Health check endpoint

## Development

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Prisma Studio (database GUI)
npm run prisma:studio
```

## Database Migrations

```bash
# Create a new migration
npm run prisma:migrate

# Apply migrations
npm run prisma:migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

## WebSocket Events

The backend provides WebSocket support for real-time updates:

- `tip:sent` - Emitted when a tip is sent
- `tip:received` - Emitted when a tip is received
- `badge:earned` - Emitted when a badge is earned
- `leaderboard:update` - Emitted when leaderboard updates

Connect to `ws://localhost:3001` with JWT token in auth header.

## Architecture

### AI Services
- **OpenAI Service**: Handles GPT-4 interactions for suggestions and chat
- **HuggingFace Service**: Content moderation and emotion analysis
- **AssemblyAI Service**: Voice transcription
- **AI Orchestrator**: Coordinates all AI services

### Web3 Services
- **VeryChain Service**: Blockchain interactions
- **Gas Sponsorship Service**: Manages gas sponsorship credits
- **Web3 Provider Factory**: Manages Web3 connections

### Database Services
- **Prisma Service**: PostgreSQL ORM
- **Redis Service**: Caching layer

## Security

- All API endpoints require JWT authentication
- Rate limiting on all endpoints
- Input validation
- Secure Web3 transaction signing
- CORS protection

## License

MIT
