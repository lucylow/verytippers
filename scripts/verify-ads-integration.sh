#!/bin/bash
# scripts/verify-ads-integration.sh - Verification script for adsVERY integration

set -e

echo "🔍 Verifying adsVERY Integration..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file${NC}"
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
fi

# Check required environment variables
echo "📋 Checking environment variables..."
REQUIRED_VARS=("ADS_ADMIN_API_KEY" "ADS_REDIRECT_SECRET")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env 2>/dev/null; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo -e "${YELLOW}   Add them to .env file${NC}"
else
    echo -e "${GREEN}✅ All required environment variables found${NC}"
fi

# Check Prisma migration
echo ""
echo "📦 Checking database migration..."
if npx prisma migrate status 2>/dev/null | grep -q "Database schema is up to date"; then
    echo -e "${GREEN}✅ Database schema is up to date${NC}"
else
    echo -e "${YELLOW}⚠️  Database migration needed. Run: npx prisma migrate dev${NC}"
fi

# Check if AdPool contract exists
echo ""
echo "📄 Checking AdPool contract..."
if [ -f "contracts/AdPool.sol" ]; then
    echo -e "${GREEN}✅ AdPool.sol found${NC}"
else
    echo -e "${RED}❌ AdPool.sol not found${NC}"
fi

# Check if tests exist
echo ""
echo "🧪 Checking tests..."
if [ -f "test/AdPool.test.ts" ]; then
    echo -e "${GREEN}✅ AdPool tests found${NC}"
else
    echo -e "${RED}❌ AdPool tests not found${NC}"
fi

# Check backend files
echo ""
echo "🔧 Checking backend files..."
BACKEND_FILES=(
    "server/services/AdsService.ts"
    "server/routes/ads.ts"
    "server/middleware/admin-auth.ts"
)

for file in "${BACKEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file not found${NC}"
    fi
done

# Check frontend files
echo ""
echo "🎨 Checking frontend files..."
FRONTEND_FILES=(
    "client/src/components/AdSlot.tsx"
    "client/src/services/ads.ts"
    "client/src/pages/Admin/AdsEditor.tsx"
)

for file in "${FRONTEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file not found${NC}"
    fi
done

# Check documentation
echo ""
echo "📚 Checking documentation..."
if [ -f "docs/ADS_INTEGRATION.md" ]; then
    echo -e "${GREEN}✅ ADS_INTEGRATION.md found${NC}"
else
    echo -e "${RED}❌ ADS_INTEGRATION.md not found${NC}"
fi

echo ""
echo "✅ Verification complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Run database migration: npx prisma migrate dev --name add_ads_models"
echo "   2. Seed demo ads: tsx scripts/seedAds.ts"
echo "   3. Start server: cd server && npm run dev"
echo "   4. Start client: cd client && npm run dev"
echo "   5. Test endpoints: curl http://localhost:3001/api/ads/slot"

