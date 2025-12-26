# NFT Marketplace Integration Guide

## Overview

The VeryTippers NFT marketplace allows creators to mint NFTs (for badges, governance, or boosts), list them for sale, and purchase NFTs from other users. The integration includes smart contracts, backend API routes, database models, frontend components, IPFS metadata support, and event indexing.

## Architecture

### Smart Contracts

1. **NFT.sol** - ERC-721 NFT contract with URI storage
   - Minting with IPFS metadata
   - Admin-controlled minting
   - Token URI management

2. **NFTMarketplace.sol** - Marketplace for NFT trading
   - Listing NFTs for sale
   - Purchasing listed NFTs
   - Canceling listings
   - Platform fee support (2.5% default)

### Backend Services

- **NFTService** - Handles minting, listing, and purchasing operations
- **NFTMetadataService** - Creates and manages ERC-721 compliant metadata
- **IpfsService** - Uploads metadata and images to IPFS (Pinata/Infura)

### Database Models

- **NFT** - Stores NFT information (tokenId, contract, owner, tokenURI, metadata)
- **Listing** - Stores marketplace listings (listingId, nftId, seller, price, active status)

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```bash
# NFT Contracts
NFT_CONTRACT_ADDRESS=0xYourNFTContractAddress
MARKETPLACE_CONTRACT_ADDRESS=0xYourMarketplaceAddress

# IPFS (Pinata recommended for free tier)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
# OR Infura
IPFS_PROJECT_ID=your_infura_project_id
IPFS_PROJECT_SECRET=your_infura_secret

# Blockchain
VERY_CHAIN_RPC_URL=https://rpc.verylabs.io
SPONSOR_PRIVATE_KEY=0xYourRelayerPrivateKey
```

### 2. Database Migration

Run Prisma migration to add NFT and Listing models:

```bash
npx prisma migrate dev --name add_nft_marketplace
npx prisma generate
```

### 3. Deploy Smart Contracts

#### Local Development (Hardhat)

```bash
# Start local node
npx hardhat node

# In another terminal, deploy contracts
npx hardhat run scripts/deploy-nft.ts --network localhost
```

#### Testnet Deployment

```bash
# Deploy to VERY Chain testnet
npx hardhat run scripts/deploy-nft.ts --network veryTestnet
```

After deployment, update your `.env` with the contract addresses.

### 4. Start Services

```bash
# Terminal 1: Start server
cd server
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

## API Endpoints

### Mint NFT

```bash
POST /api/nft/mint
Content-Type: application/json

{
  "toAddress": "0x...",
  "name": "VeryBadge #123",
  "description": "Creator badge",
  "imageUrl": "https://...",
  "imageBase64": "data:image/png;base64,...",
  "boostMultiplier": 2.0
}
```

Response:
```json
{
  "success": true,
  "data": {
    "tokenId": 1,
    "tokenURI": "ipfs://Qm...",
    "txHash": "0x..."
  }
}
```

### List NFT

```bash
POST /api/nft/list
Content-Type: application/json

{
  "nftContract": "0x...",
  "tokenId": 1,
  "price": "0.1"
}
```

**Note:** User must approve marketplace contract first (client-side transaction).

### Buy NFT

```bash
POST /api/nft/buy
Content-Type: application/json

{
  "listingId": 1,
  "buyerAddress": "0x..."
}
```

### Get NFT Details

```bash
GET /api/nft/:contract/:tokenId
```

### Get Active Listings

```bash
GET /api/nft/marketplace/listings?limit=50&offset=0
```

### Get User NFTs

```bash
GET /api/nft/user/:address
```

## Frontend Usage

### Access Marketplace

Navigate to `/nft` in your application. The marketplace page includes:

1. **Marketplace Tab** - Browse and purchase listed NFTs
2. **Mint Tab** - Create new NFTs with metadata
3. **List Tab** - List your NFTs for sale

### Minting Flow

1. Fill in NFT details (name, description, image)
2. Set boost multiplier (optional, for tip weighting)
3. Submit mint request
4. NFT is minted and metadata uploaded to IPFS
5. Transaction hash and token ID returned

### Listing Flow

1. Approve marketplace contract (client-side transaction)
2. Enter NFT contract address and token ID
3. Set price in VERY tokens
4. Submit listing request
5. NFT transferred to marketplace escrow
6. Listing appears in marketplace

### Purchase Flow

1. Browse marketplace listings
2. Click "Buy Now" on desired NFT
3. Confirm transaction in wallet
4. NFT transferred to buyer, payment to seller

## Event Indexing

The event listener automatically processes:

- **Minted** events - Updates NFT database records
- **Listed** events - Creates listing records
- **Cancelled** events - Marks listings as inactive
- **Purchased** events - Updates NFT ownership and listing status

Events are processed in real-time via the `EventListener` service.

## NFT Metadata Format

NFTs use ERC-721 compliant metadata:

```json
{
  "name": "VeryBadge #123",
  "description": "Creator badge — awarded to top tippers",
  "image": "ipfs://Qm...",
  "attributes": [
    { "trait_type": "Rarity", "value": "Legendary" },
    { "trait_type": "BoostMultiplier", "value": 2.5 }
  ],
  "boostMultiplier": 2.5
}
```

## Testing

### Smart Contract Tests

```bash
npx hardhat test test/NFT.test.ts
```

### Backend Tests

```bash
# Unit tests for NFT service
npm test -- NFTService.test.ts
```

## Integration with Tip Boosts

NFTs can include a `boostMultiplier` attribute that affects tip weighting in leaderboards. When computing leaderboard scores:

1. Check user's owned NFTs
2. Sum boost multipliers (e.g., 1.0 + 0.5 = 1.5x total boost)
3. Apply multiplier to tip amounts

Example:
- User has 2 NFTs with 1.5x and 2.0x multipliers
- Effective boost: 1.0 + 0.5 + 1.0 = 2.5x
- Tip of 10 VERY counts as 25 VERY for leaderboard

## Security Considerations

1. **Approval Flow** - Users must explicitly approve marketplace before listing
2. **Price Validation** - Prices must be > 0
3. **Reentrancy Protection** - Marketplace uses ReentrancyGuard
4. **Access Control** - Only admin can mint (relayer or owner)
5. **Metadata Validation** - Validate metadata size and content

## Production Checklist

- [ ] Deploy contracts to mainnet
- [ ] Set up IPFS pinning service (Pinata/Infura)
- [ ] Configure relayer with secure key management (KMS)
- [ ] Set platform fee recipient
- [ ] Enable rate limiting on API endpoints
- [ ] Set up monitoring for events
- [ ] Test end-to-end flows
- [ ] Document contract addresses

## Troubleshooting

### "Marketplace contract not approved"

User must approve the marketplace contract before listing. This requires a client-side transaction.

### "NFT contract not configured"

Ensure `NFT_CONTRACT_ADDRESS` is set in `.env` and matches deployed contract.

### "Failed to upload to IPFS"

Check Pinata/Infura credentials in `.env`. For development, mock hashes are returned if credentials are missing.

### Events not processing

Check that event listener is running and contract addresses are correct. Verify RPC URL is accessible.

## Future Enhancements

- [ ] ERC-2981 royalty support
- [ ] Auction functionality
- [ ] Bundle purchases
- [ ] Collection support
- [ ] Advanced filtering and search
- [ ] Gasless listing via meta-transactions
- [ ] Cross-chain support

## Support

For issues or questions, please open an issue on GitHub or contact the development team.

