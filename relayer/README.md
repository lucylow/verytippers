# VeryTippers Relayer Service

A simple Node.js relayer service for submitting meta-transactions to the TipRouter smart contract.

## ⚠️ Security Warning

**This relayer uses a local private key for demo/testnet purposes only.**

- ❌ **NEVER** use mainnet private keys
- ❌ **NEVER** commit private keys to version control
- ✅ For production, use AWS KMS, Azure KeyVault, or HashiCorp Vault

## Setup

1. **Install dependencies**
   ```bash
   cd relayer
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

   Required variables:
   - `RPC_URL` - Testnet RPC endpoint
   - `RELAYER_PRIVATE_KEY` - Testnet account private key
   - `CONTRACT_ADDRESS` - Deployed TipRouter address
   - `PORT` - Server port (default: 8080)

3. **Start the relayer**
   ```bash
   npm run dev  # Development mode with auto-reload
   # or
   npm run build && npm start  # Production mode
   ```

## API Endpoints

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "relayer": "0x...",
  "network": "https://rpc.testnet.verychain.org",
  "contract": "0x..."
}
```

### `POST /submit-meta`

Submit a meta-transaction to the TipRouter contract.

**Request Body:**
```json
{
  "from": "0x...",
  "to": "0x...",
  "amount": "1000000000000000000",
  "cidHash": "0x...",
  "nonce": 1,
  "v": 27,
  "r": "0x...",
  "s": "0x..."
}
```

**Response (Success):**
```json
{
  "ok": true,
  "txHash": "0x...",
  "blockNumber": 12345,
  "status": "confirmed"
}
```

**Response (Error):**
```json
{
  "ok": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## How It Works

1. User signs a meta-transaction message hash with their wallet
2. Frontend sends signature components (v, r, s) to relayer
3. Relayer verifies the signature matches the relayer signer
4. Relayer submits transaction to TipRouter contract (pays gas)
5. Contract verifies relayer signature and processes tip

## Testing

Test the relayer with curl:

```bash
curl -X POST http://localhost:8080/submit-meta \
  -H "Content-Type: application/json" \
  -d '{
    "from": "0xFromAddress",
    "to": "0xToAddress",
    "amount": "1000000000000000000",
    "cidHash": "0xabc...",
    "nonce": 1,
    "v": 27,
    "r": "0x...",
    "s": "0x..."
  }'
```

## Production Considerations

For production deployment:

1. **Use KMS for signing** - Replace local private key with AWS KMS, Azure KeyVault, or Vault
2. **Add rate limiting** - Prevent abuse with middleware (e.g., express-rate-limit)
3. **Add authentication** - Require API keys or JWT tokens
4. **Add monitoring** - Log all transactions and errors
5. **Add retry logic** - Handle network failures gracefully
6. **Add batching** - Batch multiple meta-transactions to reduce gas costs

## Example KMS Integration (Future)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

async function signWithKMS(messageHash: string): Promise<{v, r, s}> {
  const client = new KMSClient({ region: "us-east-1" });
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: Buffer.from(messageHash.slice(2), "hex"),
    MessageType: "DIGEST",
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await client.send(command);
  // Convert KMS signature to v, r, s format
  // ...
}
```

