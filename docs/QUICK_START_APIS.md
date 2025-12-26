# Quick Start: APIs & Datasets

Quick reference for setting up and using APIs & Datasets in VeryTippers.

## 1. Pinata IPFS Setup (Free Tier)

**Get your free account**: [https://www.pinata.cloud/](https://www.pinata.cloud/)

1. Sign up for free account (1GB storage)
2. Go to API Keys section
3. Generate new key pair
4. Add to `.env`:

```bash
PINATA_API_KEY=your_key_here
PINATA_SECRET_API_KEY=your_secret_here
```

**Usage:**
```typescript
import { IpfsService } from './services/IpfsService';

const ipfs = new IpfsService();
const cid = await ipfs.upload(JSON.stringify({ message: "Hello" }));
// Returns: ipfs://Qm...
```

## 2. Hugging Face API Setup

**Get your API key**: [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

1. Create account (free)
2. Go to Settings > Access Tokens
3. Create new token (read access is enough)
4. Add to `.env`:

```bash
HUGGINGFACE_API_KEY=your_hf_token_here
```

**Available Endpoints:**
- `POST /api/v1/tip/recommendation` - Get tip amount recommendation
- `POST /api/v1/tip/message-suggestions` - Get message suggestions
- `POST /api/v1/tip/dataset-suggestion` - Dataset-based tip suggestion (NEW)

## 3. Mock Data for Testing

Use mock data utilities instead of real API calls during development:

```typescript
import {
  generateMockTipPayload,
  generateMockHistoricalTips,
  generateMockMessageSuggestions
} from './server/utils/mockData';

// Generate mock tip payload
const tipPayload = generateMockTipPayload('bob', 'alice', 5.0, 'Great work!');

// Generate historical tips for dataset suggestions
const historicalTips = generateMockHistoricalTips(20);

// Generate message suggestions
const suggestions = generateMockMessageSuggestions('alice', 10);
```

## 4. Testing IPFS Upload

**Without Pinata (Mock mode):**
```typescript
// Just use the service - it will return mock hashes if not configured
const cid = await ipfsService.upload("test content");
// Returns: ipfs://mockhash_1234567890
```

**With Pinata (Real upload):**
```bash
# Ensure .env has Pinata keys
PINATA_API_KEY=your_key
PINATA_SECRET_API_KEY=your_secret

# Then upload will work for real
```

## 5. Testing Tip Suggestions

**Using the API:**
```bash
curl -X POST http://localhost:3001/api/v1/tip/recommendation \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Amazing tutorial about web3!",
    "authorId": "user123"
  }'
```

**Using Mock Data:**
```typescript
import { generateMockTipRecommendation } from './server/utils/mockData';
const recommendation = generateMockTipRecommendation();
```

## 6. Free API Resources

- **Public APIs List**: [https://github.com/public-apis/public-apis](https://github.com/public-apis/public-apis)
- **Google Dataset Search**: [https://datasetsearch.research.google.com/](https://datasetsearch.research.google.com/)
- **Hugging Face Datasets**: [https://huggingface.co/datasets](https://huggingface.co/datasets)

## Common Issues

**"Pinata credentials not configured"**
- Add `PINATA_API_KEY` and `PINATA_SECRET_API_KEY` to `.env`
- Or use Infura by setting `IPFS_PROJECT_ID` and `IPFS_PROJECT_SECRET`

**"HuggingFace API Error"**
- Check your `HUGGINGFACE_API_KEY` in `.env`
- Verify the token has read access
- Service will use fallback suggestions if API fails

**File upload fails**
- Ensure `form-data` package is installed (it's already in dependencies)
- File upload only works with Pinata provider currently

For more details, see [APIS_AND_DATASETS.md](./APIS_AND_DATASETS.md)

