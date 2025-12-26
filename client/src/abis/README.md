# Contract ABIs

This directory contains the compiled ABI files for smart contracts used in the frontend.

## Required ABIs

1. **TipRouter.json** - TipRouter contract ABI
2. **VeryTippersNFT.json** - VeryTippersNFT contract ABI

## Generating ABIs

After compiling the Solidity contracts, copy the ABI files from the artifacts directory:

```bash
# From the project root
cp artifacts/contracts/TipRouter.sol/TipRouter.json client/src/abis/
cp artifacts/contracts/VeryTippersNFT.sol/VeryTippersNFT.json client/src/abis/
```

Or if using Hardhat:

```bash
# Compile contracts
npx hardhat compile

# Copy ABIs (adjust paths based on your Hardhat config)
cp artifacts/contracts/TipRouter.sol/TipRouter.json client/src/abis/
cp artifacts/contracts/VeryTippersNFT.sol/VeryTippersNFT.json client/src/abis/
```

## Current Implementation

Currently, the NFT service (`client/src/services/nft.ts`) uses inline ABI definitions for the minimal interface needed. Once you have the full compiled ABIs, you can update the service to import from JSON files:

```typescript
import TipRouterABI from '@/abis/TipRouter.json';
import VeryTippersNFTABI from '@/abis/VeryTippersNFT.json';
```

## Environment Variables

Make sure to set the following environment variables in your `.env` file:

```env
VITE_TIP_ROUTER_ADDRESS=0x...
VITE_NFT_CONTRACT_ADDRESS=0x...
```

