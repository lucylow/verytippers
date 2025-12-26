# APIs & Datasets Guide for VeryTippers

This guide provides practical resources for using free APIs and datasets in the VeryTippers project, including IPFS pinning, AI suggestions, and data sources.

## Quick Resources

### Public APIs & Data Sources

1. **Public-APIs (GitHub)** - [https://github.com/public-apis/public-apis](https://github.com/public-apis/public-apis)
   - Community-curated list of free REST APIs
   - Categories: notifications, email, webhooks, social integrations
   - Perfect for finding OAuth helpers, KYC lookups, notification providers

2. **Google Dataset Search** - [https://datasetsearch.research.google.com/](https://datasetsearch.research.google.com/)
   - Search public datasets (CSV, JSON, academic, government)
   - Find chat logs, message corpora, analytics data
   - Useful for building suggestion models and analytics

3. **Hugging Face Datasets** - [https://huggingface.co/datasets](https://huggingface.co/datasets)
   - One-line loaders for ML datasets (text, audio, images)
   - Useful for prototyping AI suggestion models
   - Example: `daily_dialog` for conversational datasets

4. **Pinata (IPFS Pinning)** - [https://www.pinata.cloud/](https://www.pinata.cloud/)
   - **Free tier: 1 GB storage + gateway access**
   - Perfect for storing encrypted tip messages (CIDs)
   - Recommended for demo/pilot usage

## Implementation in VeryTippers

### 1. IPFS Pinning with Pinata

VeryTippers now supports both Infura and Pinata IPFS providers. Pinata is recommended for the free tier (1GB storage).

#### Configuration

Add to your `.env` file:

```bash
# Pinata (Free tier - recommended for demo)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
PINATA_GATEWAY_URL=https://gateway.pinata.cloud

# Or use Infura (if you prefer)
IPFS_PROJECT_ID=your_infura_project_id
IPFS_PROJECT_SECRET=your_infura_secret
```

#### Usage in Code

```typescript
import { IpfsService } from './services/IpfsService';

const ipfsService = new IpfsService();

// Upload JSON content (encrypted tip messages)
const cid = await ipfsService.upload(JSON.stringify({
  message: "Encrypted tip message",
  from: "0xSender",
  timestamp: new Date().toISOString()
}));
// Returns: ipfs://QmYfAbc123...xyz

// Fetch content
const content = await ipfsService.fetch(cid);

// Upload file/buffer
const fileCid = await ipfsService.uploadFile(buffer, 'tip-receipt.pdf');
```

#### Pinata API Direct Usage (curl example)

```bash
curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
  -H "Content-Type: application/json" \
  -H "pinata_api_key: $PINATA_KEY" \
  -H "pinata_secret_api_key: $PINATA_SECRET" \
  -d '{"pinataContent": {"message":"Encrypted payload bytes base64..", "from":"bob"}}'
```

Pinata returns `{ IpfsHash: "Qm..." }` - this is your CID.

### 2. AI Suggestions with Hugging Face

VeryTippers uses Hugging Face for:
- Content moderation
- Sentiment analysis
- Tip amount recommendations
- Message suggestions
- Dataset-based tip suggestions (NEW)

#### Configuration

```bash
HUGGINGFACE_API_KEY=your_hf_api_key
```

#### API Endpoints

**Tip Recommendation (Content Analysis)**
```bash
POST /api/v1/tip/recommendation
{
  "content": "Great article about web3!",
  "authorId": "user123",
  "contentType": "article"
}

# Response
{
  "success": true,
  "data": {
    "recommendedAmount": "10",
    "confidence": 0.85,
    "reasoning": "Based on content analysis: Quality score 85/100...",
    "contentScore": {
      "quality": 85,
      "engagement": 78,
      "sentiment": "positive"
    }
  }
}
```

**Dataset-Based Tip Suggestion (NEW)**
```bash
POST /api/v1/tip/dataset-suggestion
{
  "content": "Amazing tutorial, learned a lot!",
  "historicalTips": [
    { "content": "Great tutorial", "amount": 5 },
    { "content": "Helpful guide", "amount": 3 }
  ]
}

# Response
{
  "success": true,
  "data": {
    "suggestedAmount": 4.5,
    "confidence": 0.82,
    "reasoning": "Based on 3 similar historical tips with 82% average similarity",
    "similarContentTips": [
      { "amount": 5, "similarity": 0.85 },
      { "amount": 3, "similarity": 0.79 }
    ]
  }
}
```

**Message Suggestions**
```bash
POST /api/v1/tip/message-suggestions
{
  "recipientName": "alice",
  "contentPreview": "Great article!",
  "tipAmount": 10,
  "relationship": "creator"
}
```

### 3. Using Public APIs for Notifications

Use the Public-APIs list to find free notification services:

**Popular Options:**
- **Pusher** - Real-time notifications (free tier)
- **SendGrid** - Email notifications (free tier: 100 emails/day)
- **Webhook.site** - Testing webhooks

Example integration pattern:
```typescript
// Example: Send notification via webhook
async function notifyUser(userId: string, message: string) {
  const webhookUrl = process.env.WEBHOOK_URL;
  await axios.post(webhookUrl, {
    userId,
    message,
    timestamp: new Date().toISOString()
  });
}
```

### 4. Dataset-Based Training (Python Example)

For offline training of suggestion models using Hugging Face datasets:

```python
# pip install datasets sentence-transformers scikit-learn
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from sklearn.neighbors import NearestNeighbors
import numpy as np

# 1. Load a conversational dataset
ds = load_dataset("daily_dialog")
texts = [t["text"] for t in ds["train"]["dialog"][:2000]]

# 2. Create fake tip amounts (replace with real data in production)
import random
amounts = [random.choice([1,2,5,10]) for _ in texts]

# 3. Generate embeddings
model = SentenceTransformer('all-MiniLM-L6-v2')
embs = model.encode(texts, show_progress_bar=True)

# 4. Build nearest-neighbor index
nn = NearestNeighbors(n_neighbors=5, metric='cosine').fit(embs)

def suggest_amount(user_text):
    qemb = model.encode([user_text])
    dists, inds = nn.kneighbors(qemb)
    # Majority vote of neighbors' amounts
    neighbor_amounts = [amounts[i] for i in inds[0]]
    return max(set(neighbor_amounts), key=neighbor_amounts.count)

# Example usage
print(suggest_amount("That was super helpful — thanks!"))  # => e.g. 5
```

## Mock Data Examples

### Tip Payload (Client → Orchestrator)

```json
{
  "type": "tip_request",
  "from": "0xUserAddrABC",
  "fromUsername": "bob",
  "to": "0xAliceAddrXYZ",
  "toUsername": "alice",
  "amount": 5.0,
  "token": "VERY",
  "message": "Nice thread! Here's a tip :)",
  "timestamp": "2025-12-24T17:10:05Z",
  "clientSig": "0xdeadbeef...signedMetaPayload"
}
```

### MetaTx (Orchestrator → Relayer)

```json
{
  "metaTx": {
    "to": "0xAliceAddrXYZ",
    "amount": "5.0",
    "token": "VERY",
    "cid": "QmYfAbc123...xyz",
    "nonce": 1245,
    "createdAt": "2025-12-24T17:10:08Z"
  },
  "policy": {
    "maxTipUsd": 200,
    "kycRequired": false
  },
  "orchestratorSig": "0xfeedface..."
}
```

### IPFS Message Content (Encrypted)

```json
{
  "payload": "base64_encrypted_message",
  "clientSig": "0xsignature...",
  "from": "bob",
  "timestamp": "2025-12-24T17:10:05Z"
}
```

## Best Practices

### IPFS
- ✅ Pin only encrypted messages (CID) to IPFS
- ✅ Store minimal metadata in Postgres/DB
- ✅ Use Pinata free tier for prototyping
- ✅ Use Pinata gateway for faster retrieval

### APIs
- ✅ Mock expensive services (KYC, fiat) during development
- ✅ Use free-tier notification services for demos
- ✅ Cache API responses when possible
- ✅ Handle rate limits gracefully

### Datasets
- ✅ Use reputable datasets from Google Dataset Search / Hugging Face
- ✅ Respect dataset licenses
- ✅ Check licensing before using scraped/copyrighted material
- ✅ Start with small samples for prototyping

### AI Models
- ✅ Cache embeddings and predictions
- ✅ Use lightweight models for production (e.g., all-MiniLM-L6-v2)
- ✅ Fallback to simple heuristics if API fails
- ✅ Monitor API costs and usage

## Checklist for Working Demo

- [ ] Pinata account created (free tier)
- [ ] `PINATA_API_KEY` and `PINATA_SECRET_API_KEY` in `.env`
- [ ] Hugging Face API key configured (`HUGGINGFACE_API_KEY`)
- [ ] Frontend TipForm component wired to `/api/v1/tip`
- [ ] IPFS service configured (Pinata or Infura)
- [ ] AI suggestion endpoints tested
- [ ] Mock data utilities for testing (see `/server/utils/mockData.ts`)

## Additional Resources

- **Pinata Docs**: [https://docs.pinata.cloud/](https://docs.pinata.cloud/)
- **Hugging Face Inference API**: [https://huggingface.co/docs/api-inference](https://huggingface.co/docs/api-inference)
- **Hugging Face Datasets**: [https://huggingface.co/docs/datasets](https://huggingface.co/docs/datasets)
- **Public APIs List**: [https://github.com/public-apis/public-apis](https://github.com/public-apis/public-apis)

## Legal & Ethical Notes

⚠️ **Important**: When using public datasets:
- Always check dataset licensing before use
- Avoid using scraped/copyrighted material without permission
- Use reputable datasets from official sources
- Respect privacy and data protection regulations
- Credit dataset sources appropriately

