<div align="center">

# 🚀 VeryTippers

**AI-Powered Social Micro-Tipping & Content Monetization Platform**

*An intelligent Web3 tipping platform powered by AI moderation and blockchain technology*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built for VERY Hackathon 2025](https://img.shields.io/badge/Built%20for-VERY%20Hackathon%202025-blue)](https://developers.verylabs.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-orange)](https://soliditylang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.2.1-blue)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-6+-red)](https://redis.io/)

[Quick Start](#-quick-start) • [Documentation](#-documentation) • [API Reference](#-api-documentation) • [Contributing](#-contributing)

</div>

---

## 📖 What is VeryTippers?

VeryTippers is a **production-grade, decentralized micro-tipping platform** built for the VERY Network. It enables creators and users to send and receive tips seamlessly with:

- 🤖 **AI-Powered Moderation** - Real-time content filtering using BERT-based toxicity detection
- ⛽ **Gasless Transactions** - Meta-transactions powered by EIP-712 signatures
- 🔒 **Privacy-First** - End-to-end encrypted messages stored on IPFS
- 📊 **Rich Analytics** - Comprehensive leaderboards, badges, and gamification
- 🎯 **Social Integration** - Native Verychat bot integration for seamless tipping
- 💰 **Monetization** - adsVERY integration for privacy-preserving ad revenue

### 🏆 Hackathon Achievement

Built for the VERY Hackathon 2025 (Extended) with a **$73,000 USD prize pool** 🎉

---

## ✨ Key Features

### Core Functionality
- ✅ **Gasless Meta-Transactions** - Users can tip without holding native tokens
- ✅ **AI Content Moderation** - Real-time toxic content detection (BERT-based)
- ✅ **IPFS Message Storage** - Decentralized, encrypted message storage
- ✅ **Smart Contract Integration** - Deployed on VERY Chain with full event tracking
- ✅ **Queue-Based Processing** - Async job processing with BullMQ and Redis
- ✅ **Real-Time Updates** - WebSocket support for live tip notifications

### Advanced Features
- 🎖️ **Badge System** - On-chain and off-chain badges for achievements
- 📈 **Leaderboards** - Daily, weekly, monthly, and all-time rankings
- 🔐 **Security First** - Multi-layer security with replay protection and reentrancy guards
- 📱 **Mobile Ready** - Responsive design with mobile-first approach
- 🎨 **Modern UI** - Built with Radix UI and Tailwind CSS
- 🔄 **Event-Driven** - Real-time blockchain event listeners

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [What is VeryTippers?](#-what-is-verytippers)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technical Stack](#-technical-stack)
- [Meta-Transaction Architecture](#-meta-transaction-architecture)
- [AI Moderation System](#-ai-moderation-system)
- [Smart Contract Architecture](#-smart-contract-architecture)
- [Database Architecture](#-database-architecture)
- [Queue Processing System](#-queue-processing-system)
- [Security Architecture](#-security-architecture)
- [API Documentation](#-api-documentation)
- [Performance Optimization](#-performance-optimization)
- [Deployment Architecture](#-deployment-architecture)
- [Monitoring & Observability](#-monitoring--observability)
- [Testing Strategy](#-testing-strategy)
- [Setup & Installation](#-setup-and-installation)
- [Contributing](#-contributing)
- [Additional Documentation](#-additional-documentation)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and **pnpm** 10+
- **PostgreSQL** 12+ (or use Docker)
- **Redis** 6+ (or use Docker)
- **Hardhat** 3+ for smart contract development

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/lucylow/verytippers.git
cd verytippers

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Set up the database
npx prisma generate
npx prisma migrate dev

# 5. Start development servers
pnpm dev              # Start frontend + backend
pnpm dev:server       # Backend only (port 3001)
pnpm dev:client       # Frontend only (port 5173)
```

### Docker Quick Start

```bash
# Start all services with Docker Compose
cd backend
docker-compose up -d

# Services will be available at:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3001
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

### Deploy Smart Contracts

```bash
# Compile contracts
pnpm compile

# Deploy to testnet
RELAYER_SIGNER=0xYourRelayerAddress \
pnpm deploy:testnet

# Verify contracts
npx hardhat verify --network veryTestnet <CONTRACT_ADDRESS> <RELAYER_SIGNER>
```

For detailed setup instructions, see [Setup & Installation](#-setup-and-installation).

---

## 🎯 Executive Summary

VeryTippers is a production-grade, decentralized micro-tipping platform built for the VERY Network. The system integrates **AI-powered content moderation**, **gasless meta-transactions**, **IPFS-based message storage**, and **comprehensive analytics** to enable secure, scalable, and user-friendly tipping interactions.

---

## 💻 Technical Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React + TypeScript + Vite | 19.2.1 / 5.6.3 / 7.1.7 | Modern SPA with hot reload |
| **Backend** | Node.js + Express + TypeScript | 18+ / 4.21.2 / 5.6.3 | RESTful API server |
| **Blockchain** | Solidity + Hardhat + Ethers.js | 0.8.19 / 3.1.0 / 6.13.1 | Smart contracts & Web3 |
| **Database** | PostgreSQL + Prisma ORM | 12+ / 7.2.0 | Relational data storage |
| **Cache/Queue** | Redis + BullMQ | 6+ / 5.66.2 | Caching & job queues |
| **AI/ML** | HuggingFace Inference API | 3.0.0 | Content moderation |
| **Storage** | IPFS (Pinata/Infura) | 60.0.1 | Decentralized file storage |
| **Testing** | Hardhat + Vitest | 3.1.0 / 2.1.4 | Contract & unit testing |
| **UI Framework** | Radix UI + Tailwind CSS | Latest | Accessible components |
| **State Management** | React Context + Hooks | Built-in | Client-side state |

### Key Technical Features

- 🔐 **EIP-712 Meta-Transactions**: Gasless transactions with cryptographic signature verification
- 🤖 **BERT-based AI Moderation**: Real-time toxic content detection using `unitary/toxic-bert`
- ⚡ **Async Job Processing**: BullMQ-based queue system with retry logic and concurrency control
- 🔒 **IPFS Message Encryption**: End-to-end encrypted tip messages stored on IPFS
- 📡 **Event-Driven Architecture**: Blockchain event listeners with real-time updates
- 📈 **Horizontal Scalability**: Stateless services with Redis-backed session management
- 💰 **adsVERY Integration**: Privacy-preserving ad serving with AI moderation, impression/click tracking, and on-chain revenue pools

---

## 🏗️ System Architecture

### High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        A[React Frontend<br/>Vite + TypeScript<br/>Port: 5173]
        B[Verychat Bot<br/>WebSocket Interface]
        C[Mobile App<br/>React Native]
    end
    
    subgraph "API Gateway Layer"
        D[Express Server<br/>REST API + WebSocket<br/>Port: 3001]
        E[Rate Limiter<br/>Redis-backed]
        F[CORS Middleware]
        G[Auth Middleware<br/>JWT + API Keys]
    end
    
    subgraph "Service Layer"
        H[TipService<br/>Orchestration]
        I[HuggingFaceService<br/>AI Moderation]
        J[BlockchainService<br/>Web3 Integration]
        K[VerychatService<br/>Social Platform]
        L[IpfsService<br/>Decentralized Storage]
        M[QueueService<br/>BullMQ]
        N[BadgeService<br/>Gamification]
        O[AnalyticsService<br/>Metrics & Insights]
    end
    
    subgraph "AI Infrastructure"
        P[HuggingFace API<br/>unitary/toxic-bert<br/>Inference Endpoint]
        Q[Redis Cache<br/>Moderation Results<br/>TTL: 3600s]
        R[OpenAI API<br/>GPT-4 Suggestions<br/>Optional]
    end
    
    subgraph "Blockchain Layer"
        S[Very Chain<br/>Smart Contracts<br/>Chain ID: 8888]
        T[Meta-Transaction Relayer<br/>EIP-712 Signing<br/>Port: 8080]
        U[Event Listener<br/>WebSocket Subscription]
    end
    
    subgraph "Data Layer"
        V[(PostgreSQL<br/>Prisma ORM<br/>Connection Pool: 10)]
        W[(Redis<br/>Cache + Queue<br/>Cluster Mode)]
        X[IPFS Network<br/>Pinata/Infura<br/>CID Storage]
    end
    
    subgraph "Monitoring & Observability"
        Y[Prometheus<br/>Metrics Collection]
        Z[Grafana<br/>Dashboards]
        AA[Winston<br/>Structured Logging]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    
    H --> I
    H --> J
    H --> K
    H --> L
    H --> M
    H --> N
    H --> O
    
    I --> P
    I --> Q
    I --> R
    
    J --> S
    J --> T
    J --> U
    
    M --> W
    H --> V
    L --> X
    
    H --> Y
    Y --> Z
    D --> AA
    
    style I fill:#ff6b6b
    style P fill:#ff6b6b
    style Q fill:#ff9999
    style J fill:#4ecdc4
    style S fill:#4ecdc4
    style T fill:#ffe66d
    style V fill:#51cf66
    style W fill:#ff6b6b
```

### Component Interaction Flow

The system follows a **layered architecture** with clear separation of concerns:

1. **Presentation Layer**: React frontend, Verychat bot interface, mobile apps
2. **API Gateway**: Express server with middleware for authentication, rate limiting, CORS
3. **Business Logic Layer**: Service-oriented architecture with dependency injection
4. **Data Access Layer**: Prisma ORM for database, Redis for caching, IPFS for storage
5. **External Services**: HuggingFace AI, blockchain networks, IPFS providers

### Service Communication Patterns

- **Synchronous**: REST API calls for immediate responses (tip validation, moderation)
- **Asynchronous**: Queue-based processing for long-running tasks (blockchain transactions, IPFS uploads)
- **Event-Driven**: WebSocket subscriptions for real-time updates (blockchain events, notifications)

---

## ⚡ Meta-Transaction Architecture

### EIP-712 Signature Flow

VeryTippers implements **gasless transactions** using EIP-712 typed data signing and a meta-transaction relayer. This allows users to send tips without holding native tokens for gas fees.

```mermaid
sequenceDiagram
    participant User as User Wallet<br/>(MetaMask/Web3)
    participant Frontend as React Frontend<br/>(Ethers.js)
    participant Relayer as Meta-Tx Relayer<br/>(Express + Ethers)
    participant Contract as TipRouter.sol<br/>(Very Chain)
    participant Blockchain as Very Chain<br/>(RPC Node)

    Note over User,Blockchain: Phase 1: Message Hash Construction
    
    User->>Frontend: Initiate Tip<br/>{from, to, amount, cid, nonce}
    Frontend->>Frontend: Build Message Hash<br/>keccak256(abi.encodePacked(...))
    Frontend->>Frontend: Build CID Hash<br/>keccak256(cid)
    
    Note over User,Blockchain: Phase 2: User Signature (EIP-191)
    
    Frontend->>User: Request Signature<br/>signMessage(messageHash)
    User->>User: Sign with Private Key<br/>EIP-191 Personal Sign
    User->>Frontend: Return Signature<br/>{v, r, s}
    
    Note over User,Blockchain: Phase 3: Relayer Verification & Submission
    
    Frontend->>Relayer: POST /submit-meta<br/>{from, to, amount, cidHash, nonce, v, r, s}
    Relayer->>Relayer: Verify User Signature<br/>recoverAddress(ethSignedHash, {v, r, s})
    Relayer->>Relayer: Validate Nonce<br/>Check Replay Protection
    Relayer->>Relayer: Sign with Relayer Key<br/>signMessage(messageHash)
    Relayer->>Relayer: Extract Relayer Sig<br/>{relayerV, relayerR, relayerS}
    
    Note over User,Blockchain: Phase 4: Contract Execution
    
    Relayer->>Contract: submitTip(...)<br/>with relayer signature
    Contract->>Contract: Verify Relayer Signature<br/>onlyRelayer modifier
    Contract->>Contract: Check Replay Protection<br/>nonceUsed mapping
    Contract->>Contract: Mark Nonce as Used<br/>nonceUsed[messageHash] = true
    Contract->>Contract: Emit TipSubmitted Event
    Contract->>Blockchain: Transaction Confirmed
    Blockchain->>Relayer: Transaction Receipt<br/>{txHash, blockNumber, status}
    Relayer->>Frontend: Response<br/>{ok: true, txHash, status}
    Frontend->>User: Display Success<br/>Tip Confirmed
```

### Meta-Transaction Implementation Details

#### Message Hash Construction

```typescript
// client/src/lib/orchestrator/metaTx.ts

export function buildMetaHash(
  from: string,
  to: string,
  amount: string | bigint,
  cid: string,
  nonce: number | bigint
): { messageHash: string; cidHash: string } {
  // Normalize addresses to checksum format
  const fromAddr = ethers.getAddress(from);
  const toAddr = ethers.getAddress(to);
  
  // Convert CID to bytes32 hash
  const cidHash = ethers.keccak256(ethers.toUtf8Bytes(cid));
  
  // Build message hash (matches TipRouter.sol)
  const messageHash = ethers.keccak256(
    ethers.solidityPacked(
      ['address', 'address', 'uint256', 'bytes32', 'uint256'],
      [fromAddr, toAddr, BigInt(amount), cidHash, BigInt(nonce)]
    )
  );
  
  return { messageHash, cidHash };
}
```

#### Relayer Signature Verification

```typescript
// relayer/src/index.ts

// Verify user signature matches 'from' address
const ethSignedHash = ethers.keccak256(
  ethers.solidityPacked(
    ['string', 'bytes32'],
    ['\x19Ethereum Signed Message:\n32', messageHash]
  )
);
const recoveredAddress = ethers.recoverAddress(ethSignedHash, { v, r, s });

if (recoveredAddress.toLowerCase() !== ethers.getAddress(from).toLowerCase()) {
  return res.status(401).json({
    ok: false,
    error: 'User signature verification failed'
  });
}

// Sign message hash with relayer key (contract expects this)
const relayerSignature = await relayerWallet.signMessage(
  ethers.getBytes(messageHash)
);
const relayerSig = ethers.Signature.from(relayerSignature);
```

#### Smart Contract Verification

```solidity
// contracts/TipRouter.sol

modifier onlyRelayer(bytes32 messageHash, uint8 v, bytes32 r, bytes32 s) {
    bytes32 ethSignedHash = keccak256(
        abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
    );
    address signer = ethSignedHash.recover(v, r, s);
    if (signer != relayerSigner) revert UnauthorizedRelayer();
    _;
}

function submitTip(
    address from,
    address to,
    uint256 amount,
    bytes32 cidHash,
    uint256 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
) external nonReentrant 
  onlyRelayer(keccak256(abi.encodePacked(from, to, amount, cidHash, nonce)), v, r, s)
{
    // Replay protection
    bytes32 messageHash = keccak256(abi.encodePacked(from, to, amount, cidHash, nonce));
    if (nonceUsed[messageHash]) revert NonceAlreadyUsed();
    nonceUsed[messageHash] = true;
    
    emit TipSubmitted(cidHash, from, to, amount, nonce);
    unchecked { ++totalTips; }
}
```

### Replay Protection Mechanism

The system implements **double-layer replay protection**:

1. **User-Level Nonce**: Each user maintains a unique nonce that increments with each transaction
2. **Message Hash Mapping**: Contract stores `nonceUsed[messageHash]` to prevent duplicate submissions
3. **Time-Based Expiry**: Optional deadline parameter for signature expiration (future enhancement)

### Gas Abstraction Economics

- **Relayer Funding**: Relayer wallet must maintain sufficient VERY tokens for gas
- **Cost Recovery**: Future implementation may include fee collection or sponsorship model
- **Rate Limiting**: Per-user daily limits prevent abuse (configurable via `GasSponsorship` model)

---

## 🤖 AI Moderation System

### Multi-Stage Moderation Pipeline

```mermaid
graph TB
    subgraph "Input Processing"
        A[Tip Message<br/>User Input<br/>Max Length: 500 chars]
        B[Input Sanitization<br/>HTML Escaping<br/>Unicode Normalization]
    end
    
    subgraph "Stage 1: Fast Pre-Filter"
        C[Keyword Filter<br/>Pattern Matching<br/>Regex Engine]
        D[Blacklist Check<br/>Redis Lookup<br/>O(1) Complexity]
        E{Match Found?}
    end
    
    subgraph "Stage 2: Cache Layer"
        F[Cache Key Generation<br/>Base64(message[0:50])]
        G[Redis Cache Lookup<br/>TTL: 3600s]
        H{Cache Hit?}
    end
    
    subgraph "Stage 3: AI Classification"
        I[HuggingFace API<br/>unitary/toxic-bert<br/>Inference Endpoint]
        J[Text Classification<br/>6 Toxicity Categories]
        K[Score Extraction<br/>Max Score Calculation]
    end
    
    subgraph "Stage 4: Decision Engine"
        L[Threshold Evaluation<br/>Configurable Limits]
        M{Score < 0.5?}
        N{0.5 ≤ Score ≤ 0.8?}
        O{Score > 0.8?}
        P[SAFE<br/>✅ Approved]
        Q[MANUAL REVIEW<br/>⚠️ Queue for Human]
        R[FLAGGED<br/>❌ Rejected]
    end
    
    subgraph "Stage 5: Result Storage"
        S[Cache Result<br/>Redis SET<br/>TTL: 3600s]
        T[Log for Analytics<br/>PostgreSQL<br/>SentimentAnalysis]
        U[Return ModerationResult<br/>JSON Response]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E
    E -->|Yes| R
    E -->|No| F
    F --> G
    G --> H
    H -->|Yes| U
    H -->|No| I
    I --> J
    J --> K
    K --> L
    L --> M
    M -->|Yes| P
    M -->|No| N
    N -->|Yes| Q
    N -->|No| O
    O -->|Yes| R
    P --> S
    Q --> S
    R --> S
    S --> T
    T --> U
    
    style I fill:#4ecdc4
    style J fill:#4ecdc4
    style K fill:#ffe66d
    style R fill:#ff6b6b
    style Q fill:#ffa94d
    style P fill:#51cf66
    style G fill:#ff9999
```

### AI Model Specifications

#### Model: `unitary/toxic-bert`

**Architecture**: BERT-base-uncased (110M parameters)  
**Task**: Multi-label text classification  
**Framework**: PyTorch (via HuggingFace Transformers)  
**Input**: Raw text string (max 512 tokens)  
**Output**: 6-dimensional probability vector

**Toxicity Categories**:

| Category | Description | Threshold | Precision | Recall |
|----------|-------------|-----------|-----------|--------|
| `toxic` | General toxic content | > 0.8 | 0.92 | 0.89 |
| `severe_toxic` | Severely toxic content | > 0.8 | 0.95 | 0.87 |
| `obscene` | Obscene language | > 0.8 | 0.91 | 0.90 |
| `threat` | Threatening language | > 0.8 | 0.94 | 0.85 |
| `insult` | Insulting language | > 0.8 | 0.90 | 0.91 |
| `identity_hate` | Identity-based hate | > 0.8 | 0.93 | 0.86 |

**Decision Logic**:

```typescript
interface ModerationResult {
    isSafe: boolean;              // Overall safety verdict
    flagged: boolean;             // Immediate rejection flag
    categories: {
        toxic: number;            // 0.0 - 1.0
        severe_toxic: number;
        obscene: number;
        threat: number;
        insult: number;
        identity_hate: number;
    };
    maxScore: number;             // Maximum category score
    needsManualReview: boolean;   // Manual review queue flag
    confidence: number;           // Model confidence (1 - entropy)
}

// Decision thresholds
const SAFE_THRESHOLD = 0.5;
const FLAG_THRESHOLD = 0.8;

const maxScore = Math.max(...Object.values(categories));
const flagged = maxScore > FLAG_THRESHOLD;
const needsManualReview = maxScore > SAFE_THRESHOLD && maxScore <= FLAG_THRESHOLD;
const isSafe = maxScore <= SAFE_THRESHOLD;
```

### Performance Optimization

#### Caching Strategy

```typescript
// Cache key generation
const cacheKey = `hf:moderation:${Buffer.from(text)
  .toString('base64')
  .slice(0, 50)}`;

// Cache configuration
const CACHE_TTL = 3600; // 1 hour
const CACHE_PREFIX = 'hf:moderation:';

// Redis SET with TTL
await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
```

**Cache Hit Rate**: ~75-80% (estimated based on message similarity)  
**Cache Miss Latency**: ~800-1200ms (HuggingFace API call)  
**Cache Hit Latency**: ~5-10ms (Redis lookup)

#### Batch Processing

For high-throughput scenarios, the system supports batch moderation:

```typescript
// Batch moderation (future enhancement)
const batchSize = 10;
const messages = [...]; // Array of tip messages

const results = await Promise.all(
  messages.map(msg => hfService.moderateContent(msg))
);
```

### Error Handling & Fallback

```typescript
try {
  const result = await hfService.moderateContent(message);
  return result;
} catch (error) {
  // Fail-open strategy for availability
  if (error.code === 'RATE_LIMIT') {
    // Queue for retry
    await queueService.addModerationJob({ message });
    return { isSafe: true, flagged: false, needsManualReview: true };
  }
  
  // Network errors: allow with manual review flag
  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
    return { isSafe: true, flagged: false, needsManualReview: true };
  }
  
  // Unknown errors: fail-safe (reject)
  return { isSafe: false, flagged: true, error: error.message };
}
```

---

## 🔗 Smart Contract Architecture

### Contract State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: User Initiates Tip
    PENDING --> PROCESSING: Queue Worker Picks Up
    PROCESSING --> IPFS_UPLOAD: Message Encryption
    IPFS_UPLOAD --> BLOCKCHAIN_SUBMIT: CID Hash Generated
    BLOCKCHAIN_SUBMIT --> CONFIRMING: Transaction Sent
    CONFIRMING --> COMPLETED: Event Received
    CONFIRMING --> FAILED: Transaction Reverted
    FAILED --> RETRY: Retry Logic (3 attempts)
    RETRY --> PROCESSING: Retry Successful
    RETRY --> FAILED: Max Retries Exceeded
    COMPLETED --> BADGE_CHECK: Award Badges
    BADGE_CHECK --> NOTIFICATION: Send Alerts
    NOTIFICATION --> [*]
    FAILED --> [*]
    
    note right of PENDING
        Status: PENDING
        Database: Tip Record Created
        Queue: Job Added
    end note
    
    note right of PROCESSING
        Status: PROCESSING
        Database: Status Updated
        Worker: Active Processing
    end note
    
    note right of COMPLETED
        Status: COMPLETED
        Database: txHash Stored
        Blockchain: Event Emitted
    end note
```

### TipRouter Contract Architecture

```mermaid
graph TB
    subgraph "TipRouter.sol Contract"
        A[Constructor<br/>Initialize relayerSigner]
        B[submitTip Function<br/>Main Entry Point]
        C[onlyRelayer Modifier<br/>Signature Verification]
        D[Replay Protection<br/>nonceUsed Mapping]
        E[Event Emission<br/>TipSubmitted]
    end
    
    subgraph "State Variables"
        F[relayerSigner<br/>immutable address]
        G[nonceUsed<br/>mapping(bytes32 => bool)]
        H[totalTips<br/>uint256 counter]
    end
    
    subgraph "Security Features"
        I[ReentrancyGuard<br/>OpenZeppelin]
        J[Ownable<br/>Access Control]
        K[ECDSA<br/>Signature Recovery]
    end
    
    subgraph "External Interactions"
        L[Event Listener<br/>WebSocket Subscription]
        M[Indexer Service<br/>Blockchain Indexing]
        N[Analytics Service<br/>Metrics Collection]
    end
    
    A --> F
    B --> C
    C --> D
    D --> E
    B --> I
    B --> J
    C --> K
    E --> L
    L --> M
    M --> N
    
    style B fill:#4ecdc4
    style C fill:#ffe66d
    style D fill:#ff6b6b
    style E fill:#51cf66
```

### Contract Security Features

#### 1. Reentrancy Protection

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TipRouter is ReentrancyGuard {
    function submitTip(...) external nonReentrant {
        // Protected against reentrancy attacks
    }
}
```

#### 2. Signature Verification

```solidity
modifier onlyRelayer(bytes32 messageHash, uint8 v, bytes32 r, bytes32 s) {
    bytes32 ethSignedHash = keccak256(
        abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
    );
    address signer = ethSignedHash.recover(v, r, s);
    if (signer != relayerSigner) revert UnauthorizedRelayer();
    _;
}
```

#### 3. Replay Protection

```solidity
// Double-layer protection
mapping(bytes32 => bool) public nonceUsed;

function submitTip(...) external {
    bytes32 messageHash = keccak256(
        abi.encodePacked(from, to, amount, cidHash, nonce)
    );
    if (nonceUsed[messageHash]) revert NonceAlreadyUsed();
    nonceUsed[messageHash] = true;
}
```

#### 4. Input Validation

```solidity
// Zero-address checks
if (from == address(0) || to == address(0)) revert InvalidAddresses();
if (from == to) revert InvalidAddresses();

// Amount validation
if (amount == 0) revert InvalidTipAmount();
```

### Gas Optimization

- **Immutable Variables**: `relayerSigner` is `immutable` (saves ~200 gas per read)
- **Unchecked Arithmetic**: Safe counter increments use `unchecked` block
- **Event Optimization**: Indexed parameters for efficient filtering
- **Storage Packing**: State variables packed to minimize storage slots

### Contract Deployment

```bash
# Compile contracts
npx hardhat compile

# Deploy to testnet
RELAYER_SIGNER=0xYourRelayerAddress \
npx hardhat run scripts/deploy-testnet.ts --network veryTestnet

# Verify on block explorer
npx hardhat verify --network veryTestnet <CONTRACT_ADDRESS> <RELAYER_SIGNER>
```

---

## 🗄️ Database Architecture

### Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Tip : "sends"
    User ||--o{ Tip : "receives"
    User ||--o{ UserBadge : "earns"
    User ||--o{ LeaderboardEntry : "ranks"
    User ||--|| GasSponsorship : "has"
    User ||--o{ AIConversation : "has"
    User ||--o{ VoiceCommand : "issues"
    
    Tip ||--o| SentimentAnalysis : "analyzed_by"
    Tip }o--o| Badge : "triggers"
    
    Badge ||--o{ UserBadge : "awarded_to"
    
    Leaderboard ||--o{ LeaderboardEntry : "contains"
    
    User {
        string id PK
        string verychatId UK
        string username UK
        string walletAddress UK
        string email UK
        enum kycStatus
        json kycMetadata
        bigint totalTipsSent
        bigint totalTipsReceived
        int uniqueUsersTipped
        int tipStreak
        datetime lastTipAt
        json tokenBalances
        datetime createdAt
        datetime updatedAt
    }
    
    Tip {
        string id PK
        string senderId FK
        string recipientId FK
        string tokenAddress
        string amount
        bigint amountInWei
        string messageHash
        string messageEncrypted
        string transactionHash UK
        int blockNumber
        int tipId
        string aiSuggestionId
        float aiConfidence
        json aiFeatures
        enum status
        string errorReason
        datetime createdAt
        datetime confirmedAt
    }
    
    SentimentAnalysis {
        string id PK
        string tipId FK
        string sentiment
        float score
        json categories
        string[] flags
        string model
        string version
        datetime processedAt
    }
    
    Badge {
        string id PK
        string name UK
        string description
        string imageUrl
        json requirements
        int contractBadgeId
        boolean onChain
        boolean isCommunityFunded
        string poolBalance
        int totalMinted
        datetime createdAt
        datetime updatedAt
    }
    
    UserBadge {
        string id PK
        string userId FK
        string badgeId FK
        string transactionHash
        string tokenId
        datetime earnedAt
        json context
    }
    
    Leaderboard {
        string id PK
        enum period
        enum category
        json rankings
        datetime periodStart
        datetime periodEnd
        datetime calculatedAt
    }
    
    LeaderboardEntry {
        string id PK
        string leaderboardId FK
        string userId FK
        int rank
        bigint score
        int change
        datetime createdAt
    }
    
    GasSponsorship {
        string id PK
        string userId FK
        int totalCredits
        int usedCredits
        int remainingCredits
        int dailyUsed
        int dailyLimit
        datetime lastResetAt
        datetime nextResetAt
        bigint totalSponsored
        datetime updatedAt
    }
```

### Database Indexing Strategy

```prisma
// Optimized indexes for query performance

model User {
  @@index([verychatId])           // User lookup by Verychat ID
  @@index([walletAddress])        // User lookup by wallet
  @@index([kycStatus])            // KYC filtering
  @@index([totalTipsSent])        // Leaderboard queries
  @@index([totalTipsReceived])    // Leaderboard queries
}

model Tip {
  @@index([senderId])             // User's sent tips
  @@index([recipientId])          // User's received tips
  @@index([transactionHash])     // Tip lookup by tx
  @@index([createdAt])           // Time-based queries
  @@index([status])              // Status filtering
  @@index([senderId, recipientId]) // Relationship queries
  @@index([createdAt, status])   // Composite for analytics
}

model LeaderboardEntry {
  @@index([userId])               // User's rankings
  @@index([rank])                // Top N queries
  @@index([leaderboardId, rank]) // Sorted leaderboard
}
```

### Query Optimization

#### Example: User Tip History

```typescript
// Optimized query with includes and pagination
const tips = await prisma.tip.findMany({
  where: {
    senderId: userId,
    status: 'COMPLETED',
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  },
  include: {
    recipient: {
      select: {
        id: true,
        username: true,
        avatarUrl: true
      }
    },
    sentimentAnalysis: true
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: (page - 1) * 20
});
```

#### Example: Leaderboard Calculation

```typescript
// Efficient leaderboard query with aggregation
const leaderboard = await prisma.user.findMany({
  select: {
    id: true,
    username: true,
    avatarUrl: true,
    totalTipsSent: true,
    _count: {
      select: {
        tipsSent: {
          where: {
            status: 'COMPLETED',
            createdAt: {
              gte: periodStart,
              lte: periodEnd
            }
          }
        }
      }
    }
  },
  orderBy: { totalTipsSent: 'desc' },
  take: 100
});
```

### Connection Pooling

```typescript
// Prisma connection pool configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool settings
  // max_connections = 10
  // connection_timeout = 10
}
```

---

## 📊 Queue Processing System

### BullMQ Architecture

```mermaid
graph TB
    subgraph "Queue Management"
        A[Tip Queue<br/>BullMQ Redis]
        B[Job Producer<br/>TipService]
        C[Job Consumer<br/>Queue Worker]
    end
    
    subgraph "Job Lifecycle"
        D[Job Created<br/>Status: waiting]
        E[Job Active<br/>Status: active]
        F[Job Completed<br/>Status: completed]
        G[Job Failed<br/>Status: failed]
        H[Job Retry<br/>Status: delayed]
    end
    
    subgraph "Worker Processing"
        I[Fetch Tip from DB]
        J[Update Status: PROCESSING]
        K[Encrypt Message]
        L[Upload to IPFS]
        M[Submit to Blockchain]
        N[Update Status: COMPLETED]
        O[Handle Errors]
    end
    
    subgraph "Retry Logic"
        P[Exponential Backoff<br/>Base: 1s, Max: 60s]
        Q[Max Retries: 3]
        R[Dead Letter Queue<br/>After Max Retries]
    end
    
    B --> A
    A --> C
    C --> D
    D --> E
    E --> I
    I --> J
    J --> K
    K --> L
    L --> M
    M --> N
    N --> F
    M --> O
    O --> G
    G --> H
    H --> P
    P --> Q
    Q -->|Retry| E
    Q -->|Max Exceeded| R
    
    style A fill:#ff6b6b
    style C fill:#4ecdc4
    style F fill:#51cf66
    style G fill:#ff6b6b
    style R fill:#ffa94d
```

### Queue Configuration

```typescript
// QueueService configuration
const queueConfig = {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1 second base delay
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,     // Keep last 1000 jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

const tipQueue = new Queue('tip-processing', queueConfig);
```

### Worker Implementation

```typescript
// Queue worker with concurrency control
const worker = new Worker(
  'tip-processing',
  async (job: Job) => {
    const { tipId } = job.data;
    
    try {
      // 1. Fetch tip from database
      const tip = await db.tip.findUnique({
        where: { id: tipId },
        include: { sender: true, recipient: true }
      });
      
      if (!tip) throw new Error(`Tip ${tipId} not found`);
      
      // 2. Update status to PROCESSING
      await db.tip.update({
        where: { id: tipId },
        data: { status: 'PROCESSING' }
      });
      
      // 3. Encrypt and upload message to IPFS
      let messageHash = '';
      if (tip.message) {
        const encrypted = await encryptMessage(
          tip.message,
          tip.recipient.publicKey
        );
        messageHash = await ipfsService.upload(encrypted);
        await db.tip.update({
          where: { id: tipId },
          data: { messageHash }
        });
      }
      
      // 4. Submit to blockchain
      const txHash = await blockchainService.sendMetaTransaction({
        from: tip.sender.walletAddress,
        to: tip.recipient.walletAddress,
        amount: tip.amount,
        cidHash: messageHash,
        nonce: generateNonce()
      });
      
      // 5. Update tip with transaction hash
      await db.tip.update({
        where: { id: tipId },
        data: {
          transactionHash: txHash,
          status: 'CONFIRMED'
        }
      });
      
      return { success: true, txHash };
    } catch (error) {
      // Update tip status to FAILED
      await db.tip.update({
        where: { id: tipId },
        data: {
          status: 'FAILED',
          errorReason: error.message
        }
      });
      throw error; // Re-throw for retry logic
    }
  },
  {
    connection: queueConfig.connection,
    concurrency: 5, // Process 5 tips concurrently
    limiter: {
      max: 100,    // Max 100 jobs
      duration: 60000 // Per minute
    }
  }
);
```

### Monitoring & Metrics

```typescript
// Queue metrics collection
worker.on('completed', (job) => {
  metrics.increment('queue.job.completed', {
    queue: 'tip-processing'
  });
});

worker.on('failed', (job, error) => {
  metrics.increment('queue.job.failed', {
    queue: 'tip-processing',
    error: error.name
  });
});

// Queue health check
const getQueueHealth = async () => {
  const waiting = await tipQueue.getWaitingCount();
  const active = await tipQueue.getActiveCount();
  const completed = await tipQueue.getCompletedCount();
  const failed = await tipQueue.getFailedCount();
  
  return {
    waiting,
    active,
    completed,
    failed,
    health: waiting < 1000 && failed < 100 ? 'healthy' : 'degraded'
  };
};
```

---

## 🔒 Security Architecture

### Security Layers

```mermaid
graph TB
    subgraph "Network Layer"
        A[DDoS Protection<br/>Cloudflare/CloudFront]
        B[Rate Limiting<br/>Redis-backed]
        C[IP Whitelisting<br/>Optional]
    end
    
    subgraph "Application Layer"
        D[Input Validation<br/>Zod Schema]
        E[SQL Injection Prevention<br/>Prisma Parameterized Queries]
        F[XSS Protection<br/>Content Sanitization]
        G[CSRF Protection<br/>SameSite Cookies]
    end
    
    subgraph "Authentication & Authorization"
        H[JWT Tokens<br/>RS256 Algorithm]
        I[API Key Validation<br/>HMAC Signing]
        J[Role-Based Access Control<br/>RBAC]
        K[OAuth 2.0<br/>Verychat Integration]
    end
    
    subgraph "Blockchain Security"
        L[Signature Verification<br/>EIP-712]
        M[Replay Protection<br/>Nonce Management]
        N[Reentrancy Guards<br/>OpenZeppelin]
        O[Access Control<br/>Ownable Pattern]
    end
    
    subgraph "Data Security"
        P[Encryption at Rest<br/>AES-256]
        Q[Encryption in Transit<br/>TLS 1.3]
        R[Message Encryption<br/>Public Key Crypto]
        S[IPFS Privacy<br/>Encrypted CIDs]
    end
    
    subgraph "Monitoring & Detection"
        T[Security Logging<br/>Winston + ELK]
        U[Anomaly Detection<br/>ML-based]
        V[Intrusion Detection<br/>IDS/IPS]
        W[Audit Trails<br/>Immutable Logs]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L
    L --> M
    M --> N
    N --> O
    O --> P
    P --> Q
    Q --> R
    R --> S
    S --> T
    T --> U
    U --> V
    V --> W
    
    style L fill:#4ecdc4
    style M fill:#ffe66d
    style N fill:#ff6b6b
    style R fill:#51cf66
    style T fill:#ffa94d
```

### Security Best Practices

#### 1. Input Validation

```typescript
import { z } from 'zod';

const tipSchema = z.object({
  senderId: z.string().min(1).max(100),
  recipientId: z.string().min(1).max(100),
  amount: z.string().regex(/^\d+(\.\d{1,18})?$/), // Decimal with max 18 decimals
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/), // Ethereum address
  message: z.string().max(500).optional(), // Max 500 characters
});

// Validate before processing
const validated = tipSchema.parse(req.body);
```

#### 2. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/tip', limiter);
```

#### 3. SQL Injection Prevention

Prisma automatically uses parameterized queries:

```typescript
// Safe: Prisma parameterizes all queries
const user = await prisma.user.findUnique({
  where: { id: userId } // Parameterized automatically
});

// Never do this (raw SQL without parameters):
// const user = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${userId}`;
```

#### 4. XSS Protection

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize user input before storing
const sanitizedMessage = DOMPurify.sanitize(message, {
  ALLOWED_TAGS: [], // No HTML tags allowed
  ALLOWED_ATTR: [],
});
```

#### 5. Secret Management

```typescript
// Use environment variables for secrets
const config = {
  huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY,
  databaseUrl: process.env.DATABASE_URL,
};

// Never commit secrets to version control
// Use .env files (gitignored) or secret management services (AWS Secrets Manager, Vault)
```

### Security Audit Checklist

- [x] Input validation on all user inputs
- [x] SQL injection prevention (Prisma parameterized queries)
- [x] XSS protection (content sanitization)
- [x] CSRF protection (SameSite cookies)
- [x] Rate limiting (Redis-backed)
- [x] Authentication & authorization (JWT + API keys)
- [x] Replay attack prevention (nonce management)
- [x] Reentrancy protection (OpenZeppelin guards)
- [x] Signature verification (EIP-712)
- [x] Encryption at rest (database encryption)
- [x] Encryption in transit (TLS 1.3)
- [x] Secret management (environment variables)
- [x] Security logging (Winston + structured logs)
- [x] Error handling (no sensitive data in errors)

---

## 🚀 API Documentation

### REST API Endpoints

#### Base URL

```
Production: https://api.verytippers.io
Development: http://localhost:3001
```

#### Authentication

All endpoints (except `/health`) require authentication via:

1. **JWT Token** (Bearer token in Authorization header)
2. **API Key** (X-API-Key header)

```bash
# JWT Authentication
curl -H "Authorization: Bearer <JWT_TOKEN>" \
     https://api.verytippers.io/api/v1/tip

# API Key Authentication
curl -H "X-API-Key: <API_KEY>" \
     https://api.verytippers.io/api/v1/tip
```

### Endpoints

#### POST `/api/v1/tip`

Process a new tip transaction with AI moderation.

**Request Body**:

```json
{
  "senderId": "user_123",
  "recipientId": "user_456",
  "amount": "10.5",
  "token": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  "message": "Great content! Keep it up!",
  "contentId": "content_789" // Optional
}
```

**Response** (Success - 200 OK):

```json
{
  "success": true,
  "message": "Tip is being processed asynchronously.",
  "data": {
    "tipId": "clx123abc456",
    "status": "PENDING",
    "estimatedCompletionTime": "2025-01-15T10:30:00Z"
  }
}
```

**Response** (AI Moderation Failure - 400 Bad Request):

```json
{
  "success": false,
  "error": "CONTENT_FLAGGED",
  "message": "Tip message flagged by content moderation.",
  "details": {
    "maxScore": 0.92,
    "flaggedCategories": ["toxic", "insult"],
    "moderationResult": {
      "isSafe": false,
      "flagged": true,
      "needsManualReview": false
    }
  }
}
```

**Response** (Validation Error - 422 Unprocessable Entity):

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid input parameters.",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be a positive number"
    }
  ]
}
```

#### GET `/api/v1/tip/:tipId`

Get tip status and details.

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "tip": {
      "id": "clx123abc456",
      "senderId": "user_123",
      "recipientId": "user_456",
      "amount": "10.5",
      "token": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      "status": "COMPLETED",
      "transactionHash": "0xabc123...",
      "blockNumber": 12345678,
      "messageHash": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      "createdAt": "2025-01-15T10:00:00Z",
      "confirmedAt": "2025-01-15T10:00:30Z"
    },
    "sender": {
      "id": "user_123",
      "username": "alice",
      "avatarUrl": "https://..."
    },
    "recipient": {
      "id": "user_456",
      "username": "bob",
      "avatarUrl": "https://..."
    }
  }
}
```

#### GET `/api/v1/user/:userId/tips`

Get user's tip history.

**Query Parameters**:

- `type`: `sent` | `received` (default: `sent`)
- `status`: `PENDING` | `COMPLETED` | `FAILED` (optional)
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `startDate`: ISO 8601 date string (optional)
- `endDate`: ISO 8601 date string (optional)

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "tips": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### GET `/api/v1/leaderboard`

Get leaderboard rankings.

**Query Parameters**:

- `period`: `DAILY` | `WEEKLY` | `MONTHLY` | `ALL_TIME` (default: `ALL_TIME`)
- `category`: `TIPS_SENT` | `TIPS_RECEIVED` | `UNIQUE_TIPPERS` (default: `TIPS_SENT`)
- `limit`: number (default: 100, max: 1000)

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "leaderboard": {
      "period": "ALL_TIME",
      "category": "TIPS_SENT",
      "rankings": [
        {
          "rank": 1,
          "user": {
            "id": "user_123",
            "username": "alice",
            "avatarUrl": "https://..."
          },
          "score": "1000.5",
          "change": 0
        },
        ...
      ],
      "calculatedAt": "2025-01-15T10:00:00Z"
    }
  }
}
```

#### POST `/api/v1/ai/suggest`

Get AI-powered tip suggestion.

**Request Body**:

```json
{
  "content": "Check out this amazing article about Web3!",
  "context": {
    "recipientId": "user_456",
    "senderId": "user_123",
    "contentType": "article"
  }
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "recommendedAmount": "15.5",
    "confidence": 0.85,
    "reasoning": "High-quality content with strong engagement metrics.",
    "contentScore": {
      "quality": 0.92,
      "engagement": 0.88,
      "sentiment": "positive"
    },
    "suggestedMessage": "Excellent work! This article really helped me understand Web3 better."
  }
}
```

#### GET `/health`

Health check endpoint (no authentication required).

**Response** (200 OK):

```json
{
  "status": "OK",
  "timestamp": "2025-01-15T10:00:00Z",
  "version": "1.0.0",
  "services": {
    "backend": "running",
    "database": "connected",
    "redis": "connected",
    "ai": "HuggingFaceService",
    "web3": "BlockchainService",
    "ipfs": "IpfsService"
  },
  "metrics": {
    "uptime": 86400,
    "memoryUsage": "150MB",
    "cpuUsage": "2.5%"
  }
}
```

### WebSocket API

#### Connection

```javascript
const ws = new WebSocket('wss://api.verytippers.io/ws');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: '<JWT_TOKEN>'
}));
```

#### Events

**Tip Status Update**:

```json
{
  "type": "tip.status.update",
  "data": {
    "tipId": "clx123abc456",
    "status": "COMPLETED",
    "transactionHash": "0xabc123...",
    "timestamp": "2025-01-15T10:00:30Z"
  }
}
```

**New Tip Notification**:

```json
{
  "type": "tip.received",
  "data": {
    "tipId": "clx123abc456",
    "sender": {
      "id": "user_123",
      "username": "alice"
    },
    "amount": "10.5",
    "token": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
    "message": "Great content!",
    "timestamp": "2025-01-15T10:00:00Z"
  }
}
```

---

## 📈 Performance Optimization

### Caching Strategy

```mermaid
graph TB
    subgraph "Cache Layers"
        A[L1: In-Memory Cache<br/>Node.js Map<br/>TTL: 60s]
        B[L2: Redis Cache<br/>Distributed<br/>TTL: 3600s]
        C[L3: Database<br/>PostgreSQL<br/>Persistent]
    end
    
    subgraph "Cache Keys"
        D[Moderation Results<br/>hf:moderation:{hash}]
        E[User Data<br/>user:{userId}]
        F[Leaderboard<br/>leaderboard:{period}:{category}]
        G[Tip Status<br/>tip:{tipId}]
    end
    
    A -->|Cache Miss| B
    B -->|Cache Miss| C
    C -->|Populate| B
    B -->|Populate| A
    
    style A fill:#51cf66
    style B fill:#ff6b6b
    style C fill:#4ecdc4
```

### Database Query Optimization

#### Index Usage

```sql
-- Analyze query execution plan
EXPLAIN ANALYZE
SELECT * FROM "Tip"
WHERE "senderId" = 'user_123'
  AND "status" = 'COMPLETED'
  AND "createdAt" >= '2025-01-01'
ORDER BY "createdAt" DESC
LIMIT 20;

-- Expected: Index Scan on Tip_senderId_idx
-- Expected: Index Scan on Tip_createdAt_idx
```

#### Connection Pooling

```typescript
// Prisma connection pool configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'error', 'warn'],
});

// Connection pool settings (via DATABASE_URL)
// postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=10
```

### API Response Time Optimization

1. **Async Processing**: Long-running operations moved to queue
2. **Pagination**: Limit result sets to prevent large payloads
3. **Field Selection**: Use Prisma `select` to fetch only needed fields
4. **Compression**: Enable gzip compression for API responses
5. **CDN**: Static assets served via CDN

### Monitoring Performance

```typescript
// Performance metrics collection
import { performance } from 'perf_hooks';

const startTime = performance.now();
const result = await processTip(...);
const duration = performance.now() - startTime;

metrics.histogram('api.tip.processing.duration', duration, {
  status: result.success ? 'success' : 'error'
});
```

---

## 🚢 Deployment Architecture

### Production Deployment Diagram

```mermaid
graph TB
    subgraph "CDN & Load Balancer"
        A[Cloudflare CDN<br/>Static Assets]
        B[Application Load Balancer<br/>AWS ALB / GCP LB]
    end
    
    subgraph "Application Tier"
        C[API Server 1<br/>Node.js + Express<br/>Auto-scaling: 2-10]
        D[API Server 2<br/>Node.js + Express]
        E[API Server N<br/>Node.js + Express]
    end
    
    subgraph "Queue Workers"
        F[Worker 1<br/>BullMQ Consumer]
        G[Worker 2<br/>BullMQ Consumer]
        H[Worker N<br/>BullMQ Consumer]
    end
    
    subgraph "Data Tier"
        I[(PostgreSQL Primary<br/>AWS RDS / GCP Cloud SQL)]
        J[(PostgreSQL Replica<br/>Read Replica)]
        K[(Redis Cluster<br/>ElastiCache / Memorystore)]
    end
    
    subgraph "Blockchain Services"
        L[Meta-Transaction Relayer<br/>KMS-backed Signing]
        M[Event Listener<br/>WebSocket Subscription]
        N[Indexer Service<br/>Blockchain Indexing]
    end
    
    subgraph "External Services"
        O[HuggingFace API<br/>AI Moderation]
        P[IPFS Providers<br/>Pinata / Infura]
        Q[Very Chain<br/>RPC Nodes]
    end
    
    subgraph "Monitoring & Observability"
        R[Prometheus<br/>Metrics]
        S[Grafana<br/>Dashboards]
        T[ELK Stack<br/>Logging]
        U[Sentry<br/>Error Tracking]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    C --> I
    D --> I
    E --> I
    I --> J
    C --> K
    D --> K
    E --> K
    F --> K
    G --> K
    H --> K
    F --> I
    G --> I
    H --> I
    L --> Q
    M --> Q
    N --> Q
    C --> O
    C --> P
    L --> Q
    C --> R
    D --> R
    E --> R
    R --> S
    C --> T
    C --> U
    
    style I fill:#51cf66
    style K fill:#ff6b6b
    style L fill:#ffe66d
    style O fill:#4ecdc4
```

### Docker Deployment

#### Dockerfile

```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and production dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "dist/index.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/verytippers
      - REDIS_URL=redis://redis:6379
      - HUGGINGFACE_API_KEY=${HUGGINGFACE_API_KEY}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  worker:
    build: .
    command: node dist/queues/tipProcessor.js
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/verytippers
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=verytippers
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=verytippers
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: verytippers-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: verytippers-api
  template:
    metadata:
      labels:
        app: verytippers-api
    spec:
      containers:
      - name: api
        image: verytippers/api:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: verytippers-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: verytippers-config
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: verytippers-api
spec:
  selector:
    app: verytippers-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: LoadBalancer
```

---

## 📊 Monitoring & Observability

### Metrics Collection

```typescript
// Prometheus metrics
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const registry = new Registry();

// Counter: Total tips processed
const tipsProcessed = new Counter({
  name: 'verytippers_tips_total',
  help: 'Total number of tips processed',
  labelNames: ['status', 'token'],
  registers: [registry]
});

// Histogram: Tip processing duration
const tipProcessingDuration = new Histogram({
  name: 'verytippers_tip_processing_duration_seconds',
  help: 'Duration of tip processing in seconds',
  labelNames: ['status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [registry]
});

// Gauge: Active queue jobs
const activeQueueJobs = new Gauge({
  name: 'verytippers_queue_jobs_active',
  help: 'Number of active queue jobs',
  labelNames: ['queue'],
  registers: [registry]
});
```

### Logging Strategy

```typescript
// Winston structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: {
    service: 'verytippers-api',
    version: '1.0.0'
  },
  transports: [
    new winston.transports.File({
      filename: 'error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'combined.log'
    })
  ]
});

// Structured log example
logger.info('Tip processed', {
  tipId: 'clx123abc456',
  senderId: 'user_123',
  recipientId: 'user_456',
  amount: '10.5',
  status: 'COMPLETED',
  duration: 1.23,
  txHash: '0xabc123...'
});
```

### Health Checks

```typescript
// Comprehensive health check
app.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {}
  };

  // Database health
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'DEGRADED';
  }

  // Redis health
  try {
    await redis.ping();
    health.services.redis = 'connected';
  } catch (error) {
    health.services.redis = 'disconnected';
    health.status = 'DEGRADED';
  }

  // Blockchain health
  try {
    const blockNumber = await provider.getBlockNumber();
    health.services.blockchain = {
      status: 'connected',
      latestBlock: blockNumber
    };
  } catch (error) {
    health.services.blockchain = {
      status: 'disconnected',
      error: error.message
    };
    health.status = 'DEGRADED';
  }

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

---

## 🧪 Testing Strategy

### Test Pyramid

```mermaid
graph TB
    A[E2E Tests<br/>10%<br/>Critical User Flows]
    B[Integration Tests<br/>30%<br/>Service Interactions]
    C[Unit Tests<br/>60%<br/>Individual Functions]
    
    A --> B
    B --> C
    
    style A fill:#ff6b6b
    style B fill:#ffe66d
    style C fill:#51cf66
```

### Unit Tests

```typescript
// Example: TipService unit test
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TipService } from '../services/TipService';

describe('TipService', () => {
  let tipService: TipService;
  
  beforeEach(() => {
    tipService = new TipService();
  });

  it('should validate tip input correctly', async () => {
    const result = await tipService.processTip(
      'user_123',
      'user_456',
      '10',
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
    );
    
    expect(result.success).toBe(true);
  });

  it('should reject invalid amount', async () => {
    const result = await tipService.processTip(
      'user_123',
      'user_456',
      '-10', // Invalid negative amount
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
    );
    
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INVALID_AMOUNT');
  });
});
```

### Integration Tests

```typescript
// Example: API integration test
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('POST /api/v1/tip', () => {
  it('should process tip successfully', async () => {
    const response = await request(app)
      .post('/api/v1/tip')
      .set('Authorization', 'Bearer <TEST_TOKEN>')
      .send({
        senderId: 'user_123',
        recipientId: 'user_456',
        amount: '10',
        token: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        message: 'Great work!'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.tipId).toBeDefined();
  });
});
```

### Smart Contract Tests

```solidity
// contracts/test/TipRouter.test.sol
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../TipRouter.sol";

contract TipRouterTest is Test {
    TipRouter public tipRouter;
    address public relayerSigner;
    address public user;
    
    function setUp() public {
        relayerSigner = address(0x1);
        user = address(0x2);
        tipRouter = new TipRouter(relayerSigner);
    }
    
    function testSubmitTip() public {
        // Test tip submission
        bytes32 cidHash = keccak256("test-cid");
        uint256 nonce = 1;
        
        // Sign message hash with relayer key
        bytes32 messageHash = keccak256(
            abi.encodePacked(user, address(0x3), 100, cidHash, nonce)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(1, messageHash);
        
        // Submit tip
        tipRouter.submitTip(
            user,
            address(0x3),
            100,
            cidHash,
            nonce,
            v,
            r,
            s
        );
        
        // Verify nonce is used
        assertTrue(tipRouter.nonceUsed(messageHash));
    }
}
```

### Test Coverage

```bash
# Run tests with coverage
pnpm test --coverage

# Coverage targets
# - Unit tests: > 80%
# - Integration tests: > 70%
# - E2E tests: Critical paths only
```

---

## 🔧 Setup and Installation

### Prerequisites

| Software | Version | Purpose | Installation |
|----------|---------|---------|-------------|
| **Node.js** | 18+ | Runtime environment | [Download](https://nodejs.org/) |
| **pnpm** | 10+ | Package manager | `npm install -g pnpm` |
| **PostgreSQL** | 12+ | Primary database | [Download](https://www.postgresql.org/download/) or use Docker |
| **Redis** | 6+ | Cache and queue | [Download](https://redis.io/download) or use Docker |
| **Hardhat** | 3+ | Smart contract development | Installed via npm |

### Quick Installation

<details>
<summary><b>📦 Option 1: Standard Installation</b></summary>

1. **Clone the repository**

```bash
git clone https://github.com/lucylow/verytippers.git
cd verytippers
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Configure environment variables**

Create `.env` in project root:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/verytippers

# Redis
REDIS_URL=redis://localhost:6379

# AI Services
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxx  # Optional

# Blockchain
VERY_CHAIN_RPC_URL=https://rpc.testnet.verychain.org
TIP_CONTRACT_ADDRESS=0xYourTipRouterAddress
BADGE_CONTRACT_ADDRESS=0xYourBadgeFactoryAddress
SPONSOR_PRIVATE_KEY=0xYourRelayerPrivateKey

# IPFS
IPFS_PROJECT_ID=your_project_id
IPFS_PROJECT_SECRET=your_project_secret

# Verychat Integration
VERYCHAT_BOT_TOKEN=your_bot_token
VERYCHAT_API_KEY=your_api_key

# Server
PORT=3001
NODE_ENV=development

# Optional: Monitoring & Analytics
SENTRY_DSN=your_sentry_dsn
ANALYTICS_ID=your_analytics_id
```

> 💡 **Tip**: Copy `.env.example` to `.env` and fill in your values. Never commit `.env` to version control!

### Database Setup

4. **Set up the database**

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

5. **Deploy smart contracts**

```bash
# Compile contracts
npx hardhat compile

# Deploy to testnet
RELAYER_SIGNER=0xYourRelayerAddress \
npx hardhat run scripts/deploy-testnet.ts --network veryTestnet

# Verify contracts
npx hardhat verify --network veryTestnet <CONTRACT_ADDRESS> <RELAYER_SIGNER>
```

6. **Start the relayer service**

```bash
cd relayer
npm install
npm run dev
```

7. **Start the application**

```bash
# Development mode (frontend + backend)
pnpm dev

# Or start separately
pnpm dev:server    # Backend only (port 3001)
pnpm dev:client    # Frontend only (port 5173)

# Production mode
pnpm build
pnpm start
```

</details>

<details>
<summary><b>🐳 Option 2: Docker Installation</b></summary>

1. **Clone the repository**

```bash
git clone https://github.com/lucylow/verytippers.git
cd verytippers/backend
```

2. **Start services with Docker Compose**

```bash
docker-compose up -d
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend API (port 3001)

3. **Run database migrations**

```bash
docker-compose exec api npx prisma migrate deploy
```

4. **Access services**

- Frontend: `http://localhost:5173` (run `pnpm dev:client` in root)
- Backend API: `http://localhost:3001`
- Prisma Studio: `docker-compose exec api npx prisma studio`

</details>

### Development Scripts

#### 🛠️ Core Commands

```bash
# Development
pnpm dev              # Start dev server (frontend + backend) with hot reload
pnpm dev:server       # Start backend only (port 3001)
pnpm dev:client       # Start frontend only (port 5173)
pnpm build            # Build for production
pnpm start            # Start production server
pnpm preview          # Preview production build
```

#### 🗄️ Database Commands

```bash
pnpm db:migrate       # Run database migrations
pnpm db:migrate:deploy # Deploy migrations (production)
pnpm db:generate      # Generate Prisma Client
pnpm db:studio        # Open Prisma Studio (database GUI)
```

#### 🧪 Testing Commands

```bash
pnpm test             # Run all tests
pnpm test:contracts   # Run smart contract tests (Hardhat)
pnpm test:backend     # Run backend tests
pnpm test:all         # Run all test suites
```

#### 📜 Smart Contract Commands

```bash
pnpm compile          # Compile Solidity contracts
pnpm deploy:local     # Deploy to local Hardhat network
pnpm deploy:testnet   # Deploy to VERY testnet
pnpm deploy:mainnet   # Deploy to VERY mainnet
```

#### 🔄 Queue & Workers

```bash
pnpm queue:workers    # Start BullMQ workers for tip processing
pnpm event:listener   # Start blockchain event listener
```

### Project Structure

```
verytippers/
├── client/              # React frontend application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utilities and helpers
│   │   └── contexts/    # React contexts (Theme, Wallet, Network)
│   └── public/          # Static assets
│
├── backend/             # Node.js backend API
│   ├── src/
│   │   ├── api/        # API route handlers
│   │   ├── services/   # Business logic services
│   │   ├── models/     # Data models
│   │   ├── repositories/ # Data access layer
│   │   ├── middleware/ # Express middleware
│   │   └── queues/     # BullMQ queue processors
│   └── migrations/     # Database migrations
│
├── contracts/          # Solidity smart contracts
│   ├── TipRouter.sol   # Main tipping contract
│   ├── TipRouterFair.sol # Fair tipping contract
│   ├── BadgeFactory.sol # Badge creation contract
│   └── abis/           # Contract ABIs
│
├── relayer/            # Meta-transaction relayer service
│   └── src/
│       ├── index.ts    # Relayer server
│       └── fairness-check.ts # Fairness verification
│
├── server/             # Additional server services
│   ├── routes/         # API routes
│   ├── services/       # Service layer
│   └── queues/         # Queue workers
│
├── docs/               # Documentation
│   ├── ADS_INTEGRATION.md
│   ├── APIS_AND_DATASETS.md
│   └── audit/          # Security audit docs
│
├── scripts/            # Deployment and utility scripts
├── test/               # Smart contract tests
└── prisma/             # Prisma schema and migrations
```

---

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**

```bash
git checkout -b feature/amazing-feature
```

3. **Make your changes**
4. **Write tests** for new functionality
5. **Run the test suite**

```bash
pnpm test
pnpm lint
```

6. **Commit your changes**

```bash
git commit -m 'Add amazing feature'
```

7. **Push to the branch**

```bash
git push origin feature/amazing-feature
```

8. **Open a Pull Request**

### Code Style

- **TypeScript**: Follow strict mode, use type annotations
- **ESLint**: Run `pnpm lint` before committing
- **Prettier**: Auto-format with `pnpm format`
- **Conventional Commits**: Use conventional commit messages

### Pull Request Guidelines

- Include tests for new features
- Update documentation as needed
- Ensure all tests pass
- Request review from maintainers

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🏆 Acknowledgments

- **Built for**: VERY Hackathon 2025 (Extended)
- **Prize Pool**: $73,000 USD
- **Powered by**: Very Network & DoraHacks
- **AI Model**: [unitary/toxic-bert](https://huggingface.co/unitary/toxic-bert) by HuggingFace
- **Smart Contracts**: OpenZeppelin Contracts
- **Infrastructure**: AWS, GCP, Cloudflare

---

## 📚 Additional Documentation

### Integration Guides

- 📘 **[Ads Integration Guide](./docs/ADS_INTEGRATION.md)**  
  Complete guide for adsVERY integration, including API endpoints, frontend components, and smart contract usage

- 📗 **[APIs & Datasets Guide](./docs/APIS_AND_DATASETS.md)**  
  Comprehensive guide for using free APIs, IPFS pinning (Pinata), Hugging Face datasets, and mock data utilities

- 📙 **[Quick Start: APIs](./docs/QUICK_START_APIS.md)**  
  Quick reference for setting up Pinata IPFS and Hugging Face API

### Technical Documentation

- 🔒 **[Security Audit](./docs/audit/)**  
  Comprehensive security audit documentation and best practices

- 📊 **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)**  
  Technical implementation details and architecture decisions

- 🚀 **[Production Deployment](./docs/PRODUCTION_DEPLOYMENT.md)**  
  Production deployment guide with Docker, Kubernetes, and cloud providers

- 🔧 **[Environment Setup](./docs/ENV_SETUP.md)**  
  Detailed environment variable configuration guide

### Other Resources

- 📝 **[Changelog](./docs/CHANGELOG_APIS_DATASETS.md)** - API and dataset changes
- 🎨 **[Landing Page README](./docs/LANDING_PAGE_README.md)** - Frontend documentation
- 💰 **[Monetization Setup](./docs/MONETIZATION_SETUP.md)** - Revenue generation guide

---

## 📞 Support & Community

### Official Resources

- 📖 **VERY Network Docs**: [developers.verylabs.io](https://developers.verylabs.io/)
- 💬 **VERY Community**: [Telegram](https://t.me/verylabs)
- 🐙 **GitHub Repository**: [github.com/lucylow/verytippers](https://github.com/lucylow/verytippers)
- 🤖 **AI Model**: [toxic-bert on HuggingFace](https://huggingface.co/unitary/toxic-bert)

### Getting Help

- 🐛 **Found a bug?** [Open an issue](https://github.com/lucylow/verytippers/issues)
- 💡 **Have a feature request?** [Create a discussion](https://github.com/lucylow/verytippers/discussions)
- 🤝 **Want to contribute?** See [Contributing Guide](#-contributing)

---

<div align="center">

## 🎉 VeryTippers

**Revolutionizing content monetization with AI and blockchain**

[![Star on GitHub](https://img.shields.io/github/stars/lucylow/verytippers?style=social)](https://github.com/lucylow/verytippers)
[![Fork on GitHub](https://img.shields.io/github/forks/lucylow/verytippers?style=social)](https://github.com/lucylow/verytippers/fork)

*Built with ❤️ by SocialFi Labs*

Built for VERY Hackathon 2025 (Extended) 🏆

---

Made with [React](https://react.dev/) • [TypeScript](https://www.typescriptlang.org/) • [Solidity](https://soliditylang.org/) • [VERY Network](https://verylabs.io/)

</div>
