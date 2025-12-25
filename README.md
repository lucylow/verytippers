# VeryTippers 


## Table of contents

1. [Project summary & goals](#project-summary--goals)
2. [High-level architecture](#high-level-architecture)
3. [Tech stack (recommended)](#tech-stack-recommended)
4. [Data model & storage](#data-model--storage)
5. [Smart contract (TipRouter) — minimal example](#smart-contract-tiprouter---minimal-example)
6. [API specification (server) — endpoints & examples](#api-specification-server---endpoints--examples)
7. [Relayer & Orchestrator behavior (detailed)](#relayer--orchestrator-behavior-detailed)
8. [IPFS usage & encryption flow](#ipfs-usage--encryption-flow)
9. [Frontend mock data + example UI components (React + TypeScript)](#frontend-mock-data--example-ui-components-react--typescript)
10. [Local development & Docker Compose](#local-development--docker-compose)
11. [Deployment & production considerations (KMS, scaling, cost)](#deployment--production-considerations-kms-scaling-cost)
12. [Monitoring, metrics & alerting](#monitoring-metrics--alerting)
13. [Security, compliance & policies](#security-compliance--policies)
14. [Testing checklist & example tests](#testing-checklist--example-tests)
15. [Roadmap & recommended next steps](#roadmap--recommended-next-steps)
16. [License & credits](#license--credits)

---

## Project summary & goals

**One-line:** Gasless, chat-first micro-tipping that lets users reward creators directly from chat while a relayer sponsors gas, message payloads are encrypted and stored on IPFS, and an indexer updates UI/leaderboards.

Primary goals:

* Near-zero friction tipping UX inside chat (slash commands, fast suggestions).
* Gasless for end users — relayer pays transaction fees.
* Privacy-first: tip messages encrypted & stored off-chain (IPFS CIDs only on chain).
* Easy embedding: bot + widget for Discord/Slack/web chat + open API for integrators.
* Safety: rate limits, spend caps, audit trail.

---

## High-level architecture

(Left → Right flow)

1. **Client (VeryChat)** — user types `/tip @alice 5 VERY`. UI shows AI suggestion and a Preview/Confirm.
2. **Wallet sign** — user signs a *meta-payload* (not a raw tx). Wepin embedded wallet or external wallet signs the meta-payload.
3. **Orchestrator** — validates payload, encrypts message, `ipfs add(encrypted) -> CID`, constructs `metaTx = {to, amount, cid, nonce}` and queues it.
4. **Relayer** — dequeues metaTx, checks policies, signs/submits a gas-paying transaction to the VERY Chain via nodes. Uses KMS/HSM for signing.
5. **Smart contract (TipRouter.sol)** — verifies relayer signature, optionally records CID, emits `TipSubmitted` event.
6. **Indexer** — listens to chain events, fetches IPFS CIDs, updates DB (Postgres), caches leaderboards (Redis), and notifies clients.
7. **UX** — user sees `Tip confirmed ✓`, recipient receives notification, leaderboard updates.

Security and observability cross-cut: KMS/HSM, WAF, rate-limiter, logging (ELK/Loki), Prometheus/Grafana.

---

## Tech stack (recommended)

* Frontend: React + Vite + TypeScript + Tailwind CSS + shadcn/ui (optional)
* Backend: Node.js + TypeScript (NestJS/Express/Fastify)
* Queue: Redis (BullMQ) or AWS SQS / Kafka (for scale)
* DB: Postgres (primary ledger), Redis (caches, rate limiting)
* Time-series: Prometheus (metrics)
* Logs: Loki / ELK (stack)
* IPFS: `ipfs-http-client` or pinning service (Pinata, Web3.Storage)
* Blockchain: VERY Chain full nodes / RPC providers
* Smart contracts: Solidity (TipRouter)
* Signing/KMS: AWS KMS, HashiCorp Vault HSM, or cloud HSM
* Containerization: Docker + Docker Compose; Kubernetes for production

---

## Data model & storage

### Minimal Postgres schema (DDL-ish)

```sql
-- users table (minimal)
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE,
  wallet_address TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- tips ledger
CREATE TABLE tips (
  id BIGSERIAL PRIMARY KEY,
  from_user_id BIGINT REFERENCES users(id),
  to_user_id BIGINT REFERENCES users(id),
  amount NUMERIC(40, 18) NOT NULL,
  cid TEXT, -- IPFS CID of encrypted message
  meta_tx JSONB, -- raw metaTx
  tx_hash TEXT, -- chain tx hash once relayer submits
  status TEXT DEFAULT 'queued', -- queued | submitted | confirmed | failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- audit logs for each step and policy decision
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tip_id BIGINT REFERENCES tips(id),
  event_type TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Redis usage

* Rate-limiter keys: `rate:tips:{userId}`
* Queue (BullMQ): `queue:metaTx`
* Cache: `leaderboard` (sorted set), `user:balance` (optional).

---

## Smart contract — `TipRouter.sol` (minimal example)

> This is intentionally minimal. Production contracts should include security audits.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TipRouter {
    address public relayerSigner; // authorized relayer signer or KMS-derived address
    mapping(bytes32 => bool) public nonceUsed;

    event TipSubmitted(bytes32 indexed cidHash, address indexed from, address indexed to, uint256 amount, bytes32 metaHash, bytes32 txId);

    constructor(address _relayerSigner) {
        relayerSigner = _relayerSigner;
    }

    // metaTx should include: to, amount, cid (IPFS), nonce, from (signer)
    function submitTip(address from, address to, uint256 amount, bytes32 cidHash, bytes32 nonce, bytes memory relayerSig) external {
        // Validate that the relayer signed the metaTx off-chain
        bytes32 metaHash = keccak256(abi.encodePacked(from, to, amount, cidHash, nonce));
        require(!nonceUsed[metaHash], "nonce used");
        // ecrecover to verify relayerSig matches relayerSigner
        // The exact method depends on how relayer signs: add Ethereum signed message prefix if needed
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", metaHash));
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(relayerSig);
        address signer = ecrecover(ethSignedHash, v, r, s);
        require(signer == relayerSigner, "Invalid relayer signature");
        nonceUsed[metaHash] = true;

        // Apply on-chain accounting or emit event for indexer
        emit TipSubmitted(cidHash, from, to, amount, metaHash, metaHash);
    }

    function splitSignature(bytes memory sig) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
        require(sig.length == 65, "Invalid sig length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}
```

Notes:

* For metaTx signing, use a relayer KMS private key. The contract validates the relayer signature on the meta-hash.
* Store only a hash/CID on-chain (CID might be stored as `bytes32` hash).
* Consider replay protection via `nonce` or using `metaHash` mapping.

---

## API specification (server) — endpoints & examples

> All endpoints should be protected with appropriate auth (JWT / mTLS / API keys) where required.

### `POST /api/tip` — Create a tip request (client → orchestrator)

**Request**

```json
{
  "from": "0xUserAddr",
  "to": "0xRecipientAddr",
  "amount": "5.0",
  "message": "Thanks for the great post!",
  "signed_meta": "<base64-signature-of-payload>",
  "meta_payload": {
    "timestamp": 1680000000,
    "nonce": "abcd-1234",
    "clientVersion": "web-0.3.0"
  }
}
```

**Response**

```json
{
  "status": "queued",
  "tip_id": 123,
  "cid_pending": true,
  "message": "Tip queued for processing"
}
```

### `GET /api/tip/:id` — Tip status

**Response**

```json
{
  "id": 123,
  "status": "confirmed",
  "tx_hash": "0x1234...",
  "cid": "Qm...",
  "amount": "5"
}
```

### `POST /api/webhook/onchain` — (Indexer → internal webhooks) notify clients

Used by indexer to notify UI / community bots that a tip was processed.

**Webhook payload**

```json
{
  "tip_id": 123,
  "status": "confirmed",
  "tx_hash": "0x123...",
  "cid": "Qm..."
}
```

### `POST /api/admin/payout` — Admin/payout (optional)

* Only for off-chain payouts or bulk operations. Requires stricter auth and KYC.

---

## Relayer & Orchestrator behavior (detailed)

### Orchestrator responsibilities

* Accept signed meta-payloads from client.
* Validate signatures and parsed fields.
* Enforce policy engine: per-user daily cap, anti-fraud filters, spam detection.
* AES-encrypt the message payload client-side or server-side (prefer client-side when possible). If server encrypts, store keys in Secrets Manager.
* `ipfs add(encryptedPayload)` → receive CID (pin).
* Insert a `tips` row (status: queued) and push `metaTx` to queue.
* Publish events to audit log (audit_logs).

### Relayer responsibilities

* Dequeue metaTx FIFO with per-user quotas.
* Validate the metaTx (CID format, amount within cap).
* Request KMS/HSM to sign the `metaHash`.
* Submit the signed metaTx to chain nodes via RPC: `TipRouter.submitTip(...)`.
* Record `tx_hash` and change tip status to `submitted`.
* Monitor confirmations (e.g., wait for 1–3 confirmations), then update status to `confirmed`.
* If submission fails (e.g., nonce too low), perform retries with backoff, and log failure.

### Pseudocode (relayer)

```ts
while(true) {
  metaTx = queue.pop()
  if (!policyOK(metaTx)) { log.reject(metaTx); continue; }
  metaHash = keccak(metaTx)
  relayerSig = KMS.sign(metaHash)
  tx = rpc.sendMethod('submitTip', [metaTx.from, metaTx.to, metaTx.amount, cidHash, nonce, relayerSig])
  saveTxHash(metaTx.id, tx.hash)
  waitConfirm(tx.hash, conf=2)
  updateStatus(metaTx.id, 'confirmed')
}
```

---

## IPFS usage & encryption flow

**Encryption approach**

* Recommended: Client encrypts message with symmetric key derived from ephemeral per-user key or using the user's public key (e.g., ECDH → AES-GCM). The Orchestrator can also encrypt if the client cannot.
* Store only the CID (and optionally a small encrypted header) on-chain. The encrypted payload sits in IPFS cluster/pinning service.

**Example high-level steps**

1. Client constructs payload: `{from, to, message, timestamp}`.
2. Client AES-GCM encrypts payload with `AES-256-GCM`, stores `iv`, `ciphertext`, and `tag`.
3. Client `ipfs add` → returns `CID`.
4. Client sends signed meta-payload (with CID) to Orchestrator.

**IPFS pinning**

* Use Web3.Storage or Pinata for pinning (free tiers exist but have quotas).
* For hack/demo: `npx ipfs-http-client` + a local go-ipfs node is fine.

---

## Frontend mock data & example UI components (React + TypeScript)

Below are **ready-to-paste** mock data and small React components that simulate the UI flow. These are intentionally minimal but well-typed.

### `src/mocks/tips.ts` — mock data

```ts
export type TipMock = {
  id: number;
  from: string;
  to: string;
  amount: string;
  message?: string;
  status: 'queued'|'submitted'|'confirmed'|'failed';
  txHash?: string;
  cid?: string;
  createdAt: string;
}

export const MOCK_TIPS: TipMock[] = [
  {
    id: 1,
    from: '0xUser1',
    to: '0xAlice',
    amount: '5',
    message: 'Nice thread!',
    status: 'confirmed',
    txHash: '0x1234abcd',
    cid: 'QmYf1...abc',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    from: '0xDev',
    to: '0xAlice',
    amount: '1',
    message: 'Thanks for the tip!',
    status: 'queued',
    createdAt: new Date().toISOString()
  }
];
```

### React Tip composer (simplified) — `TipComposer.tsx`

```tsx
import React, { useState } from 'react';
import { TipMock } from './mocks/tips';

type Props = {
  onSubmit: (payload: {to: string; amount: string; message?: string}) => Promise<void>;
};

export function TipComposer({ onSubmit }: Props) {
  const [to, setTo] = useState('@alice');
  const [amount, setAmount] = useState('5');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm max-w-md">
      <label className="block text-sm font-medium">To</label>
      <input value={to} onChange={e => setTo(e.target.value)} className="w-full border rounded p-2 mt-1 mb-2" />
      <label className="block text-sm font-medium">Amount</label>
      <input value={amount} onChange={e => setAmount(e.target.value)} className="w-full border rounded p-2 mt-1 mb-2" />
      <label className="block text-sm font-medium">Message (optional)</label>
      <input value={message} onChange={e => setMessage(e.target.value)} className="w-full border rounded p-2 mt-1 mb-3" />
      <div className="flex gap-2">
        <button
          className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              await onSubmit({to, amount, message});
            } finally {
              setLoading(false);
            }
          }}
        >
          Confirm & Sign
        </button>
        <button className="px-3 py-2 rounded border" onClick={() => { setTo('@alice'); setAmount('5'); setMessage(''); }}>
          Reset
        </button>
      </div>
      <div className="mt-2 text-xs text-gray-500">Gas: 0 (sponsored)</div>
    </div>
  );
}
```

### Mock `onSubmit` example (simulate signing + API)

```ts
async function mockOnSubmit(payload: {to: string; amount: string; message?: string}) {
  // 1) Create meta-payload locally
  const meta = {
    from: '0xUserMock',
    to: payload.to,
    amount: payload.amount,
    timestamp: Date.now(),
    nonce: Math.random().toString(36).slice(2, 10)
  };

  // 2) "Sign" meta-payload - for demo use local pseudo signature
  const signed = btoa(JSON.stringify(meta)); // DO NOT use in prod

  // 3) Simulate ipfs add (mock CID)
  const fakeCid = 'QmFakeCid' + Math.random().toString(36).slice(2,6);

  // 4) POST to /api/tip (mock)
  console.log('POST /api/tip', { meta, signed, cid: fakeCid, message: payload.message });
  // Simulate network latency
  await new Promise(res => setTimeout(res, 800));
  alert('Tip queued (demo)\nCID: ' + fakeCid);
}
```

> In production, replace `btoa` with actual client-side signature via Wepin / external wallet. Do not transmit raw private keys.

---

## Local development & Docker Compose

### `.env` (example)

```
# Server
PORT=4000
DATABASE_URL=postgres://postgres:postgres@db:5432/verytippers
REDIS_URL=redis://redis:6379
IPFS_API_URL=http://ipfs:5001
VERY_RPC_URL=https://rpc.verychain.example
KMS_ENDPOINT=https://kms.internal
JWT_SECRET=replace-me
```

### `docker-compose.yml` (minimal)

```yaml
version: '3.8'
services:
  db:
    image: postgres:14
    environment:
      POSTGRES_PASSWORD: postgres
    volumes:
      - db-data:/var/lib/postgresql/data
  redis:
    image: redis:6
  ipfs:
    image: ipfs/go-ipfs:latest
    ports:
      - "5001:5001"
  server:
    build: ./server
    depends_on:
      - db
      - redis
      - ipfs
    env_file: .env
    ports:
      - "4000:4000"
  frontend:
    build: ./web
    ports:
      - "3000:3000"
volumes:
  db-data:
```

### Local steps

1. `git clone <repo>`
2. `cp .env.example .env` (edit values)
3. `docker-compose up --build`
4. Visit `http://localhost:3000` for frontend and `http://localhost:4000` for API.

---

## Deployment & production considerations (KMS, scaling, cost)

### KMS / signing

* Use cloud KMS (AWS KMS, GCP KMS) or HSM service for relayer signing keys. Do **not** store private keys on disk.
* Create per-relayer service account and rotate keys on schedule.

### Cost control for relayer gas

* Implement **policy engine**:

  * per-user daily cap (e.g., $X per day),
  * per-tip cap,
  * global relayer budget (stop submissions when budget exhausted).
* Implement batching on-chain (batch multiple tips into a single transaction) to reduce gas.
* Off-chain receipts: for micro-tips, you can use batched distribution to reduce frequency.

### Scaling

* Orchestrator and Relayer can be horizontally scaled; use sticky queues and sharding to ensure single-worker handling of user quotas.
* Use Redis for leaderboards (ZSET) and Fast read patterns for UI.
* Use auto-scaling on node pools; watch RPC provider rate limits.

---

## Monitoring, metrics & alerting

Instrument:

* Request rate, error rate, latency (server & relayer).
* Queue length (metaTx queue).
* Relayer gas spend (daily, hourly).
* Leaderboard updates / tips per minute (business metric).
* Alert thresholds:

  * queue length > X → scale up,
  * relayer spend approaching budget → alert ops,
  * failed txs > Y in X mins → investigate.

Suggested stack: Prometheus + Grafana + Alertmanager; logs via Loki or ELK.

---

## Security, compliance & policies

* **Auth**: API gateway validates JWT / API keys; relayer uses mTLS to communicate with nodes.
* **Rate-limits**: 10 tips/min per user default (configurable). Enforce at API gateway and also in Orchestrator.
* **KYC**: only required for payouts above threshold or for creators withdrawing to fiat. Keep KYC optional to start.
* **Secrets**: store in Secrets Manager; rotate keys and credentials regularly.
* **Audit logs**: store immutable logs for each tip action (signature proof, policy checks, tx hash).
* **Data retention**: policies for PID/CID retention and GDPR compliance (if applicable). Remove or anonymize as required.
* **Incident response**: plan for key compromise — freeze relayer via on-chain signer rotation, revoke keys in KMS, halt relayer jobs.

---

## Testing checklist & example tests

### Unit

* Validate metaTx creation and signing verification functions.
* IPFS add/encrypt/decrypt logic (round-trip tests).

### Integration

* Orchestrator -> IPFS -> Relayer -> chain (testnet).
* Indexer picks up events and updates DB.

### E2E (demo)

* Simulate user tip: compose → sign → orchestration → relayer submits → indexer confirms → UI shows success.

### Example jest test (metaTx creation)

```ts
import { createMetaTx } from './orchestrator';
test('createMetaTx contains proper fields', () => {
  const m = createMetaTx('0xFrom', '0xTo', '5.0', 'QmCid', 1);
  expect(m.to).toBe('0xTo');
  expect(m.cid).toContain('Qm');
});
```

---

## Roadmap & recommended next steps (MVP → production)

**MVP**

* VeryChat bot with `/tip` flow + Wepin mock signing.
* Orchestrator (local) that ipfs-adds encrypted payloads and queues metaTx.
* Minimal relayer using a local private key (replace with KMS later).
* TipRouter smart contract on testnet.
* Basic indexer (listens to events and updates DB).

**Next**

* Replace local keys with KMS/HSM.
* Add rate-limits, policy engine, and KYC integration for high-value payouts.
* Add batching & gas-optimization on smart contracts.
* Secure production-grade relayer with monitoring & alerting.
* Onboard 3-5 creator communities for pilot, instrument economic metrics.

---

## License & credits

* License: pick an appropriate open-source license (e.g., MIT) if you want open-source.
* Credits: built using Vite, React, Tailwind, ipfs-http-client, BullMQ (or SQS), Postgres, Redis.

---

## Appendix — quick reference commands & snippets

**Sign & add to IPFS (node example)**

```js
import { create } from 'ipfs-http-client';
const ipfs = create({ url: process.env.IPFS_API_URL });
const payload = Buffer.from(JSON.stringify({from, to, message}));
const { cid } = await ipfs.add(payload);
console.log('CID', cid.toString());
```

**Submit metaTx (pseudo-cURL)**

```bash
curl -X POST https://api.example.com/api/tip \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"from":"0x..","to":"0x..","amount":"5","signed_meta":"...","meta_payload":{}}'
```

**Deploy contract (hardhat example)**

```js
const TipRouter = await ethers.getContractFactory("TipRouter");
const router = await TipRouter.deploy(relayerAddress);
await router.deployed();
console.log("TipRouter deployed to", router.address);
```
