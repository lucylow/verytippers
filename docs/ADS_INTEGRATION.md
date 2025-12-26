# adsVERY Integration Guide

This document describes the adsVERY integration for VeryTippers, which allows the platform to display ads safely, track impressions/clicks, and route ad revenue into community pools.

## Overview

The adsVERY integration includes:
- **Backend API**: Ad serving, impression/click tracking, admin management
- **Frontend Components**: AdSlot component for displaying ads
- **Database Models**: Ad, AdImpression, AdClick tables
- **Smart Contract**: AdPool.sol for on-chain ad revenue management
- **AI Moderation**: All ads are validated through the moderation pipeline before display

## Architecture

### Database Schema

Three new Prisma models:
- `Ad`: Stores ad metadata (title, description, image, URL, targeting)
- `AdImpression`: Tracks when ads are displayed (privacy-preserving with IP hashing)
- `AdClick`: Tracks when ads are clicked

### API Endpoints

#### Public Endpoints

- `GET /api/ads/slot?tags[]=x&guild=G` - Get an ad for display
- `POST /api/ads/impression` - Record an ad impression
- `POST /api/ads/click` - Record an ad click and get redirect URL

#### Admin Endpoints (Protected)

- `POST /api/admin/ads` - Create a new ad
- `PUT /api/admin/ads/:id` - Update an existing ad
- `GET /api/admin/ads` - List all ads

### Frontend Components

- `AdSlot`: React component that fetches and displays ads
- Integrated into `Chat.tsx` component

### Smart Contract

- `AdPool.sol`: Simple pool contract for receiving sponsorship funds
- Owner-controlled payouts (for MVP/testnet)
- In production, should use DAO or multisig

## Setup

### 1. Database Migration

Run the Prisma migration to create the new tables:

```bash
cd /path/to/verytippers
npx prisma migrate dev --name add_ads_models
npx prisma generate
```

### 2. Environment Variables

Add these to your `.env` file:

```env
# Ads Admin API Key (for admin endpoints)
ADS_ADMIN_API_KEY=changeme-strong-secret-key

# IP Hashing Secret (for privacy-preserving IP tracking)
ADS_REDIRECT_SECRET=changeme-hash-secret

# AdPool Contract (optional, for on-chain revenue)
ADPOOL_DEPLOYER_PRIVATE_KEY=0x...
```

### 3. Seed Demo Ads

Run the seed script to create demo ads:

```bash
# Using tsx (if available)
tsx scripts/seedAds.ts

# Or using node with compiled JS
node dist/scripts/seedAds.js
```

### 4. Deploy AdPool Contract (Optional)

For testnet deployment:

```bash
npx hardhat run scripts/deploy-testnet.ts --network veryTestnet
```

Or manually:

```typescript
const AdPoolFactory = await ethers.getContractFactory("AdPool");
const adPool = await AdPoolFactory.deploy();
await adPool.waitForDeployment();
console.log("AdPool deployed to:", await adPool.getAddress());
```

## Usage

### Creating Ads (Admin)

```bash
curl -X POST http://localhost:3001/api/admin/ads \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "advertiser": "DemoCorp",
    "title": "Sponsor - Boost Your Project",
    "description": "Get 2x more reach",
    "imageUrl": "https://example.com/ad.png",
    "targetTags": ["dev", "web3"],
    "url": "https://example.com",
    "budget": 10.0
  }'
```

### Frontend Integration

The `AdSlot` component is already integrated into the Chat UI. To add it elsewhere:

```tsx
import AdSlot from '@/components/AdSlot';

<AdSlot tags={['dev', 'web3']} guild="guild-id" />
```

### Tracking Impressions & Clicks

The `AdSlot` component automatically:
1. Fetches an ad on mount
2. Records an impression when the ad loads
3. Records a click when user clicks "Learn more"

## Privacy & Safety

### IP Address Hashing

- Raw IP addresses are **never stored**
- IPs are hashed server-side using `ADS_REDIRECT_SECRET`
- Only the hash is stored in the database

### AI Moderation

- All ads are validated through the HuggingFace moderation pipeline
- Ads with toxic content are automatically rejected
- Validation happens on both create and update

### User Opt-Out

Users can opt out of personalized ads (future feature):
- Add `adsOptOut` flag to User model
- Filter ads based on user preference

## Testing

### Server Tests

```bash
cd server
npm test -- ads
```

### Contract Tests

```bash
npx hardhat test test/AdPool.test.ts
```

### Manual Testing

1. Start the server: `cd server && npm run dev`
2. Start the client: `cd client && npm run dev`
3. Open the chat UI and verify the AdSlot appears
4. Click "Learn more" and verify redirect works
5. Check database for impression/click records

## API Response Examples

### GET /api/ads/slot

```json
{
  "ad": {
    "id": "ckxyz",
    "advertiser": "DemoCorp",
    "title": "Sponsor Demo",
    "description": "Try DemoCorp",
    "imageUrl": "https://example.com/ad.png",
    "targetTags": ["dev"],
    "impressions": 42,
    "clicks": 5
  }
}
```

### POST /api/ads/impression

Request:
```json
{
  "adId": "ckxyz",
  "userId": "cuidxy"
}
```

Response:
```json
{
  "ok": true,
  "success": true
}
```

### POST /api/ads/click

Request:
```json
{
  "adId": "ckxyz",
  "userId": "cuidxy"
}
```

Response:
```json
{
  "redirectUrl": "https://advertiser.example",
  "success": true
}
```

## Metrics & Observability

### Redis Counters (Future)

Add Redis counters for real-time metrics:
```typescript
await redis.hincrby('ad:metrics', `${adId}:impressions`, 1);
```

### Prometheus Metrics (Future)

Expose metrics endpoint:
```typescript
app.get('/metrics', (req, res) => {
  // Prometheus metrics
});
```

## Production Considerations

1. **Admin Authentication**: Replace simple API key with proper JWT/auth system
2. **Rate Limiting**: Add rate limits to impression/click endpoints
3. **Ad Rotation**: Implement more sophisticated ad selection algorithm
4. **Budget Tracking**: Track ad budgets and pause ads when budget exhausted
5. **Analytics Dashboard**: Build admin dashboard for ad performance
6. **DAO Integration**: Replace owner-controlled AdPool with DAO governance
7. **Multisig**: Use multisig for AdPool payouts in production

## Troubleshooting

### Ads not showing

1. Check database has active ads: `SELECT * FROM "Ad" WHERE active = true;`
2. Check API endpoint is accessible: `curl http://localhost:3001/api/ads/slot`
3. Check browser console for errors
4. Verify moderation passed: Check ad `active` status

### Impressions not recording

1. Check server logs for errors
2. Verify database connection
3. Check IP hashing is working (should not see raw IPs in DB)

### Admin endpoints returning 401

1. Verify `ADS_ADMIN_API_KEY` is set in `.env`
2. Check Authorization header format: `Bearer YOUR_KEY`
3. Or use query param: `?apiKey=YOUR_KEY`

## Support

For issues or questions:
- Check server logs: `tail -f server/logs/app.log`
- Check database: `npx prisma studio`
- Review moderation results in HuggingFace dashboard

