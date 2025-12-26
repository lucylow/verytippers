#!/usr/bin/env bash
set -e

echo "🚀 VeryTippers Demo Setup Script"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node version
echo "1️⃣ Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}❌ Node.js 18+ required. Current: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"
echo ""

# Install dependencies
echo "2️⃣ Installing dependencies..."
if [ -f "pnpm-lock.yaml" ]; then
  pnpm install || npm install
else
  npm install
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Seed mock data
echo "3️⃣ Seeding mock data..."
node scripts/seed-mock.js
echo -e "${GREEN}✅ Mock data seeded${NC}"
echo ""

# Build frontend
echo "4️⃣ Building frontend..."
npm run build || echo -e "${YELLOW}⚠️  Build failed, continuing...${NC}"
echo ""

# Check if relayer directory exists
if [ -d "relayer" ]; then
  echo "5️⃣ Setting up relayer..."
  cd relayer
  
  if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  relayer/.env not found. Creating from example...${NC}"
    if [ -f ".env.example" ]; then
      cp .env.example .env
      echo -e "${YELLOW}⚠️  Please update relayer/.env with your configuration${NC}"
    fi
  fi
  
  if [ ! -d "node_modules" ]; then
    npm install
  fi
  
  echo -e "${GREEN}✅ Relayer ready${NC}"
  echo -e "${YELLOW}💡 Start relayer with: cd relayer && npm run dev${NC}"
  cd ..
else
  echo -e "${YELLOW}⚠️  Relayer directory not found, skipping...${NC}"
fi
echo ""

# Check environment files
echo "6️⃣ Checking environment configuration..."
if [ ! -f ".env.local" ]; then
  echo -e "${YELLOW}⚠️  .env.local not found${NC}"
  echo "Creating template..."
  cat > .env.local << EOF
# .env.local (DO NOT commit)
VITE_APP_NETWORK_RPC=https://rpc.testnet.verychain.org
VITE_APP_CHAIN_ID=8889
VITE_APP_RELAYER_URL=http://localhost:8080
VITE_APP_WALLET_PROVIDER=local
VITE_APP_CONTRACT_ADDRESS=
LOVABLE_PROJECT_ID=REPLACE_WITH_LOVABLE_PROJECT_ID
EOF
  echo -e "${GREEN}✅ Created .env.local template${NC}"
  echo -e "${YELLOW}⚠️  Please update .env.local with your configuration${NC}"
else
  echo -e "${GREEN}✅ .env.local exists${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Update .env.local with your configuration"
echo "  2. (Optional) Deploy TipRouter: npx hardhat run scripts/deploy-testnet.ts --network veryTestnet"
echo "  3. (Optional) Start relayer: cd relayer && npm run dev"
echo "  4. Start frontend: npm run dev"
echo ""
echo "For Lovable deployment:"
echo "  1. Open https://lovable.dev"
echo "  2. Connect this repo"
echo "  3. Set environment variables in project settings"
echo "  4. Click 'Share -> Publish'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

