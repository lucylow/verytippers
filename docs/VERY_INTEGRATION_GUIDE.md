# VERY Network Integration Guide

This guide provides comprehensive instructions for integrating VeryTippers with the VERY Network ecosystem, including VERY Chain, VeryChat API, and Wepin Wallet.

## Table of Contents

1. [VERY Chain Integration](#very-chain-integration)
2. [VeryChat API Integration](#verychat-api-integration)
3. [Wepin Wallet Integration](#wepin-wallet-integration)
4. [Design Assets](#design-assets)
5. [Environment Setup](#environment-setup)
6. [Testing & Deployment](#testing--deployment)

---

## VERY Chain Integration

### Overview
VERY Chain is an EVM-compatible blockchain (forked from Ethereum) that powers the VERY Network.

**Resources:**
- Documentation: https://wp.verylabs.io/verychain
- RPC Endpoint: `https://rpc.verylabs.io`
- Chain ID: `4613`
- Currency: `VERY`
- Explorer: `https://explorer.very.network`

### Configuration

#### Frontend (Client)
Update `client/src/config/chains.ts`:
```typescript
export const VERY_CHAIN_CONFIG = {
  chainId: '0x1205', // 4613 in hex
  chainIdDecimal: 4613,
  chainName: 'VERY Chain',
  nativeCurrency: {
    name: 'VERY',
    symbol: 'VERY',
    decimals: 18
  },
  rpcUrls: ['https://rpc.verylabs.io'],
  blockExplorerUrls: ['https://explorer.very.network']
};
```

#### Backend
Update `backend/src/config/config.ts`:
```typescript
VERY_CHAIN: {
  RPC_URL: 'https://rpc.verylabs.io',
  CHAIN_ID: 4613,
  EXPLORER_URL: 'https://explorer.very.network'
}
```

### Development Tools

Use standard Ethereum tooling:
- **Hardhat**: `npx hardhat compile`
- **Ethers.js**: `npm install ethers`
- **Web3.js**: `npm install web3`

### Smart Contract Deployment

1. Configure Hardhat for VERY Chain:
```typescript
// hardhat.config.ts
networks: {
  verychain: {
    url: "https://rpc.verylabs.io",
    chainId: 4613,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

2. Deploy contracts:
```bash
npx hardhat run scripts/deploy.ts --network verychain
```

---

## VeryChat API Integration

### Overview
VeryChat API provides authentication and user management for hackathon projects.

**Resources:**
- Documentation: https://developers.verylabs.io/
- Base URL: `https://gapi.veryapi.io`
- Authentication: Project ID + API Key

### Setup Steps

1. **Register Your Project**
   - Visit https://developers.verylabs.io/
   - Register your hackathon project
   - Obtain your **Project ID** and **API Key**

2. **Configure Environment Variables**
   ```bash
   # .env
   VERYCHAT_API_URL=https://gapi.veryapi.io
   VERYCHAT_PROJECT_ID=your_project_id
   VERYCHAT_API_KEY=your_api_key
   ```

3. **Use VeryChat API Service**
   The service is already implemented in `backend/src/services/verychat/VerychatApi.service.ts`:
   
   ```typescript
   import { VerychatApiService } from './services/verychat/VerychatApi.service';
   
   const verychat = new VerychatApiService();
   
   // Get user information
   const user = await verychat.getUser(userId);
   
   // Get wallet address
   const walletAddress = await verychat.getWalletAddress(userId);
   
   // Verify user identity
   const auth = await verychat.verifyUser(userId, verificationCode);
   ```

### API Endpoints

- `GET /hackathon/users/{userId}` - Get user information
- `GET /hackathon/users/search?username={username}` - Search users
- `POST /hackathon/auth/verify` - Verify user with code
- `POST /hackathon/bot/messages` - Send bot message
- `POST /hackathon/bot/commands` - Set bot commands

### Webhook Integration

Configure webhooks in your VeryChat project settings to receive:
- Message events
- Callback queries
- Inline queries

Handle webhooks in `backend/src/controllers/Webhook.controller.ts`

---

## Wepin Wallet Integration

### Overview
Wepin is a Web3 wallet solution integrated into VeryChat, allowing users to manage assets with social login.

**Resources:**
- Documentation: https://docs.wepin.io/en
- SDK: `@wepin/sdk-js`
- Provider: `@wepin/provider-js`

### For Web Applications

1. **Register Your App**
   - Register in Wepin Workspace
   - Obtain **App ID** and **App Key**

2. **Install SDK**
   ```bash
   npm install @wepin/sdk-js @wepin/provider-js
   ```

3. **Initialize SDK**
   ```typescript
   import { WepinWallet } from './lib/wepin/wepin';
   
   const wallet = new WepinWallet();
   await wallet.initialize(
     process.env.VITE_WEPIN_APP_ID,
     process.env.VITE_WEPIN_APP_KEY
   );
   
   // Connect wallet
   const account = await wallet.connect();
   ```

4. **Use in React Components**
   ```typescript
   import { useWepin } from './lib/wepin/wepin';
   
   function MyComponent() {
     const { connect, account, isConnected } = useWepin();
     
     return (
       <button onClick={connect}>
         {isConnected ? account.address : 'Connect Wepin'}
       </button>
     );
   }
   ```

### For VeryChat Bots

**Important:** Wepin is natively integrated into VeryChat. You don't need direct SDK integration for bots.

Instead, use the **VeryChat API** to interact with users' wallet addresses:
```typescript
const walletAddress = await verychat.getWalletAddress(userId);
```

---

## Design Assets

### Figma Design System
Access design assets at: https://www.figma.com/design/TsZFFkkMbMqTTNfHYD2x0Y/dessign-asset

### Key Elements
- **Color Palette**: Extract from Figma
- **Typography**: Font styles and sizes
- **Logos**: VERY Network and VeryChat logos
- **UI Components**: Button styles, cards, etc.

### Implementation
1. Export assets from Figma
2. Add to `client/public/` directory
3. Update CSS/Tailwind config with brand colors
4. Use components in your UI

---

## Environment Setup

### Required Environment Variables

#### Backend (.env)
```bash
# VERY Chain
VERY_RPC_URL=https://rpc.verylabs.io
VERY_CHAIN_ID=4613
EXPLORER_URL=https://explorer.very.network

# VeryChat API
VERYCHAT_API_URL=https://gapi.veryapi.io
VERYCHAT_PROJECT_ID=your_project_id
VERYCHAT_API_KEY=your_api_key
VERYCHAT_BOT_TOKEN=your_bot_token

# Smart Contracts
TIP_CONTRACT_ADDRESS=0x...
BADGE_CONTRACT_ADDRESS=0x...
VERY_TOKEN_ADDRESS=0x...

# Wepin (if using web app)
WEPIN_APP_ID=your_app_id
WEPIN_APP_KEY=your_app_key
```

#### Frontend (.env)
```bash
# VERY Chain
VITE_VERY_CHAIN_ID=4613
VITE_VERY_RPC_URL=https://rpc.verylabs.io

# Wepin (for web app)
VITE_WEPIN_APP_ID=your_app_id
VITE_WEPIN_APP_KEY=your_app_key

# Contracts
VITE_TIP_CONTRACT_ADDRESS=0x...
VITE_BADGE_CONTRACT_ADDRESS=0x...
```

### Installation

1. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd client
   npm install
   
   # Optional: Wepin SDK (for web app)
   npm install @wepin/sdk-js @wepin/provider-js
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Fill in all required values

3. **Start Development**
   ```bash
   # Backend
   cd backend
   npm run dev
   
   # Frontend
   cd client
   npm run dev
   ```

---

## Testing & Deployment

### Testing Checklist

- [ ] VERY Chain connection works
- [ ] Smart contracts deployed to VERY Chain
- [ ] VeryChat API authentication successful
- [ ] User verification works
- [ ] Wallet address retrieval works
- [ ] Wepin wallet connects (for web app)
- [ ] Transactions sign and execute
- [ ] Webhooks receive events
- [ ] Bot commands respond correctly

### Deployment Steps

1. **Deploy Smart Contracts**
   ```bash
   npx hardhat run scripts/deploy.ts --network verychain
   ```

2. **Update Contract Addresses**
   - Update `.env` files with deployed addresses

3. **Deploy Backend**
   - Set up production environment variables
   - Deploy to your hosting service
   - Configure webhook URL in VeryChat project

4. **Deploy Frontend**
   - Build: `npm run build`
   - Deploy to hosting (Vercel, Netlify, etc.)

### Submission Requirements

- [ ] GitHub repository link
- [ ] Deployed smart contract addresses
- [ ] Demo video showing bot in VeryChat
- [ ] Documentation (this guide)
- [ ] Environment setup instructions

---

## Troubleshooting

### VERY Chain Connection Issues
- Verify RPC URL: `https://rpc.verylabs.io`
- Check Chain ID: `4613`
- Ensure network is accessible

### VeryChat API Authentication Errors
- Verify Project ID and API Key
- Check API base URL: `https://gapi.veryapi.io`
- Ensure headers are set correctly

### Wepin SDK Issues
- Verify App ID and App Key
- Check network configuration
- Ensure SDK is properly initialized

---

## Additional Resources

- **VERY Chain Docs**: https://wp.verylabs.io/verychain
- **VeryChat API Docs**: https://developers.verylabs.io/
- **Wepin Docs**: https://docs.wepin.io/en
- **Figma Design**: https://www.figma.com/design/TsZFFkkMbMqTTNfHYD2x0Y/dessign-asset

---

## Support

For hackathon support:
- Check official documentation links
- Contact hackathon support team
- Join VERY Network community channels

Good luck with your VeryTippers bot! 🚀

