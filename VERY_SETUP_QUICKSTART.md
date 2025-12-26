# VERY Network Integration - Quick Start

## 🚀 Quick Setup

### 1. VERY Chain Configuration

**Chain Details:**
- RPC: `https://rpc.verylabs.io`
- Chain ID: `4613`
- Currency: `VERY`
- Explorer: `https://explorer.very.network`

**Files Updated:**
- ✅ `client/src/config/chains.ts` - Frontend chain config
- ✅ `client/src/web3/config.ts` - Web3 config
- ✅ `backend/src/config/config.ts` - Backend config
- ✅ `hardhat.config.ts` - Deployment config

### 2. VeryChat API Setup

1. **Register Project:**
   - Visit: https://developers.verylabs.io/
   - Register your hackathon project
   - Get your **Project ID** and **API Key**

2. **Set Environment Variables:**
   ```bash
   VERYCHAT_API_URL=https://gapi.veryapi.io
   VERYCHAT_PROJECT_ID=your_project_id
   VERYCHAT_API_KEY=your_api_key
   ```

3. **Service Ready:**
   - ✅ `backend/src/services/verychat/VerychatApi.service.ts` - Enhanced with authentication

### 3. Wepin Wallet (Web App Only)

1. **Register App:**
   - Register in Wepin Workspace
   - Get **App ID** and **App Key**

2. **Install SDK:**
   ```bash
   npm install @wepin/sdk-js @wepin/provider-js
   ```

3. **Set Environment Variables:**
   ```bash
   VITE_WEPIN_APP_ID=your_app_id
   VITE_WEPIN_APP_KEY=your_app_key
   ```

4. **Use in Code:**
   ```tsx
   import { useWepin } from './hooks/useWepin';
   
   const { connect, account, isConnected } = useWepin();
   ```

**Files Created:**
- ✅ `client/src/lib/wepin/wepin.ts` - Wepin SDK wrapper
- ✅ `client/src/hooks/useWepin.tsx` - React hook

### 4. Design Assets

- **Figma Link:** https://www.figma.com/design/TsZFFkkMbMqTTNfHYD2x0Y/dessign-asset
- Extract colors, fonts, and logos
- Update your UI components

## 📋 Environment Variables Checklist

### Backend (.env)
```bash
# VERY Chain
VERY_RPC_URL=https://rpc.verylabs.io
VERY_CHAIN_ID=4613

# VeryChat API
VERYCHAT_API_URL=https://gapi.veryapi.io
VERYCHAT_PROJECT_ID=your_project_id
VERYCHAT_API_KEY=your_api_key

# Contracts (update after deployment)
TIP_CONTRACT_ADDRESS=0x...
BADGE_CONTRACT_ADDRESS=0x...
```

### Frontend (.env)
```bash
# VERY Chain
VITE_VERY_CHAIN_ID=4613
VITE_VERY_RPC_URL=https://rpc.verylabs.io

# Wepin (optional, for web app)
VITE_WEPIN_APP_ID=your_app_id
VITE_WEPIN_APP_KEY=your_app_key
```

## 🔧 Deployment

### Deploy Smart Contracts
```bash
npx hardhat run scripts/deploy.ts --network verychain
```

### Update Contract Addresses
After deployment, update `.env` files with deployed addresses.

## 📚 Documentation

- **Full Integration Guide:** `VERY_INTEGRATION_GUIDE.md`
- **VERY Chain:** https://wp.verylabs.io/verychain
- **VeryChat API:** https://developers.verylabs.io/
- **Wepin Docs:** https://docs.wepin.io/en

## ✅ Integration Status

- [x] VERY Chain configuration (Chain ID: 4613, RPC: https://rpc.verylabs.io)
- [x] VeryChat API service with authentication
- [x] Wepin SDK integration utilities
- [x] React hooks for Wepin
- [x] Hardhat configuration for VERY Chain
- [x] Comprehensive documentation

## 🎯 Next Steps

1. Register your project on VeryChat developers portal
2. Register your app in Wepin Workspace (if using web app)
3. Deploy smart contracts to VERY Chain
4. Configure webhooks in VeryChat project
5. Test the integration end-to-end

Good luck with your hackathon submission! 🚀

