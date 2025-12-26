# Peer-to-Peer Implementation for VeryTippers

This document describes the peer-to-peer (P2P) WebRTC implementation for VeryTippers, enabling direct user-to-user connections for exchanging signed tip meta-transactions.

## Architecture

```
Client A ↔ (WebRTC DataChannel) ↔ Client B
    ↕                                ↕
Signaling Server (WebSocket)
```

- **Signaling Server**: Exchanges WebRTC offers/answers and ICE candidates
- **WebRTC DataChannel**: Direct peer-to-peer connection for data exchange
- **End-to-End Encryption**: AES-GCM encryption for private messages
- **Signed Meta-Transactions**: Users can sign tip payloads and exchange them directly

## Components

### 1. Signaling Server (`signaling-server/`)

Simple Node.js WebSocket server for WebRTC signaling.

**Files:**
- `index.js` - Main server implementation
- `package.json` - Dependencies
- `README.md` - Setup and usage

**Run:**
```bash
cd signaling-server
npm install
npm start
```

### 2. React Hook (`client/src/hooks/usePeerConnection.tsx`)

Custom React hook managing RTCPeerConnection lifecycle.

**Features:**
- WebRTC peer connection management
- DataChannel setup for text and binary data
- Automatic reconnection handling
- ICE candidate exchange

### 3. Crypto Helpers (`client/src/lib/crypto.ts`)

Browser-native AES-GCM encryption utilities.

**Functions:**
- `generateSymKey()` - Generate symmetric encryption key
- `encryptText()` - Encrypt text messages
- `decryptText()` - Decrypt text messages
- `exportSymKey()` / `importSymKey()` - Key serialization

**Note:** In production, implement ECDH key exchange for secure symmetric key sharing.

### 4. Tips Signing (`client/src/lib/tips.ts`)

Utilities for signing meta-transaction payloads.

**Functions:**
- `signMetaPayload()` - Sign tip meta payload with user wallet
- `verifyMeta()` - Verify signed meta payload (server-side reference)

### 5. PeerPanel Component (`client/src/components/PeerPanel.tsx`)

React UI component for P2P interactions.

**Features:**
- Connect to signaling server
- Send encrypted messages
- Sign and send tip meta-transactions
- Real-time connection status and logs

### 6. P2P Demo Page (`client/src/pages/P2PDemo.tsx`)

Demo page showcasing P2P functionality at `/p2p` route.

## Usage

### Starting the Signaling Server

```bash
cd signaling-server
npm install
npm start
# Server runs on http://localhost:8080 (or PORT env var)
```

### Using the P2P Feature

1. Navigate to `/p2p` route in the app
2. Configure signaling server URL (default: `ws://localhost:8080`)
3. Enter or generate a room ID (share with peer)
4. Click "Start / Create Offer" to initiate connection
5. Wait for peer connection to establish
6. Send messages or sign and send tip meta-transactions

### Sending a Tip Meta-Transaction

1. Enter recipient address
2. Enter tip amount
3. Click "Sign & Send Tip Meta"
4. Approve wallet signature
5. Signed payload is sent directly to peer via DataChannel

## Security Considerations

### Current Implementation

- ✅ AES-GCM encryption for messages
- ✅ Wallet-based signature for meta-transactions
- ⚠️ Symmetric key generation (should use ECDH for key exchange)
- ⚠️ No authentication on signaling server (add JWT in production)

### Production Recommendations

1. **Key Exchange**: Implement ECDH (X25519) for secure symmetric key establishment
2. **Signaling Authentication**: Add JWT-based authentication to signaling server
3. **TURN Servers**: Configure reliable TURN servers for NAT traversal
4. **Rate Limiting**: Add rate limits on signaling server and DataChannel
5. **Message Size Limits**: Cap DataChannel message size (e.g., 256 KB)
6. **Replay Protection**: Include nonces and timestamps in meta payloads
7. **TLS/WSS**: Use secure WebSocket (WSS) in production

## Integration with Orchestrator

Received signed meta-transactions can be:

1. **Forwarded to Orchestrator**: Peer B receives signed meta from Peer A, forwards to Orchestrator API
2. **Validated**: Orchestrator verifies signature and checks replay protection
3. **Enqueued**: Valid meta-transactions are enqueued for relayer processing
4. **Executed**: Relayer submits meta-transaction on-chain

## Testing

1. Start signaling server: `cd signaling-server && npm start`
2. Open two browser tabs to `/p2p`
3. Use the same room ID in both tabs
4. Click "Start / Create Offer" in one tab
5. Wait for connection (check logs)
6. Send test messages or tip meta-transactions

## File Structure

```
verytippers/
├── signaling-server/
│   ├── index.js          # Signaling server
│   ├── package.json
│   └── README.md
├── client/src/
│   ├── hooks/
│   │   └── usePeerConnection.tsx  # P2P hook
│   ├── lib/
│   │   ├── crypto.ts              # Encryption helpers
│   │   └── tips.ts                # Tip signing
│   ├── components/
│   │   └── PeerPanel.tsx          # P2P UI component
│   └── pages/
│       └── P2PDemo.tsx            # Demo page
└── docs/
    └── P2P_IMPLEMENTATION.md      # This file
```

## Environment Variables

Add to `.env`:

```env
VITE_SIGNALING_URL=ws://localhost:8080  # Development
# Production: wss://signaling.verytippers.com
```

## Next Steps

- [ ] Implement ECDH key exchange
- [ ] Add JWT authentication to signaling server
- [ ] Configure TURN servers for NAT traversal
- [ ] Add fallback WebSocket relay for when P2P fails
- [ ] Integrate with Orchestrator API endpoint
- [ ] Add connection retry logic
- [ ] Implement message queuing for offline peers
- [ ] Add analytics (P2P success rate, fallback usage)

## References

- [WebRTC Data Channels](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [EIP-191 Signature Standard](https://eips.ethereum.org/EIPS/eip-191)
- [AES-GCM Encryption](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt)

