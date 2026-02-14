#!/bin/bash
#
# reset-test-environment.sh - Reset to known good state for payment testing
#
# This script:
# 1. Clears relevant Redis keys (queues, caches)
# 2. Resets agent statuses to ONLINE
# 3. Verifies pool funding status
# 4. Outputs a checklist of the environment state
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "  Reset Test Environment"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"

# 1. Flush Redis Queues
echo -e "${BLUE}1. Clearing Redis queues...${NC}"
redis-cli -a <your-redis-password> KEYS "bull:*" 2>/dev/null | while read key; do
    redis-cli -a <your-redis-password> DEL "$key" > /dev/null 2>&1
done
echo -e "${GREEN}[DONE]${NC} Redis queues cleared"
echo ""

# 2. Clear WebSocket/Cache Keys
echo -e "${BLUE}2. Clearing cache keys...${NC}"
redis-cli -a <your-redis-password> KEYS "cache:*" 2>/dev/null | while read key; do
    redis-cli -a <your-redis-password> DEL "$key" > /dev/null 2>&1
done
redis-cli -a <your-redis-password> KEYS "ws:*" 2>/dev/null | while read key; do
    redis-cli -a <your-redis-password> DEL "$key" > /dev/null 2>&1
done
echo -e "${GREEN}[DONE]${NC} Cache keys cleared"
echo ""

# 3. Reset Agent Status via Database
echo -e "${BLUE}3. Resetting agent statuses...${NC}"
cd "$BACKEND_DIR"
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.agent.updateMany({
    where: { status: { not: 'ONLINE' } },
    data: { status: 'ONLINE', currentScanId: null }
  });
  console.log('Reset', result.count, 'agents to ONLINE');
  await prisma.\$disconnect();
}
main();
" 2>&1 || echo "No agents to reset"
echo -e "${GREEN}[DONE]${NC} Agent statuses reset"
echo ""

# 4. Verify Pool Funding
echo -e "${BLUE}4. Checking pool funding status...${NC}"
POOL_OUTPUT=$(npx tsx scripts/check-pool-balance.ts 2>&1) || true
if echo "$POOL_OUTPUT" | grep -q "PRODUCTION mode"; then
    POOL_BALANCE=$(echo "$POOL_OUTPUT" | grep "On-chain pool balance:" | awk '{print $4}')
    echo -e "${GREEN}[OK]${NC} Pool funded: $POOL_BALANCE USDC (PRODUCTION mode)"
    PAYMENT_MODE="PRODUCTION"
elif echo "$POOL_OUTPUT" | grep -q "demo mode"; then
    echo -e "${YELLOW}[INFO]${NC} Pool unfunded (DEMO mode)"
    PAYMENT_MODE="DEMO"
else
    echo -e "${YELLOW}[INFO]${NC} Could not determine pool status"
    PAYMENT_MODE="UNKNOWN"
fi
echo ""

# 5. Verify Backend is Running
echo -e "${BLUE}5. Checking backend health...${NC}"
if curl -sf http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} Backend is healthy"
    BACKEND_STATUS="HEALTHY"
else
    echo -e "${YELLOW}[WARN]${NC} Backend not responding"
    echo "    Tip: Start with 'cd backend && npm run dev'"
    BACKEND_STATUS="NOT RUNNING"
fi
echo ""

cd - > /dev/null

# Final Checklist
echo "========================================"
echo "  Environment State Checklist"
echo "========================================"
echo ""
echo "  [x] Redis queues: CLEARED"
echo "  [x] Cache keys: CLEARED"
echo "  [x] Agent status: RESET TO ONLINE"
echo "  [ ] Backend: $BACKEND_STATUS"
echo "  [ ] Payment mode: $PAYMENT_MODE"
echo ""

if [ "$BACKEND_STATUS" = "HEALTHY" ]; then
    echo -e "${GREEN}Environment ready for testing!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Register a new protocol via frontend"
    echo "  2. Wait for scan to complete"
    echo "  3. Trigger validation and payment"
    if [ "$PAYMENT_MODE" = "DEMO" ]; then
        echo ""
        echo -e "${YELLOW}Note: Running in DEMO mode - no real on-chain transactions${NC}"
        echo "  To enable real payments: npx tsx backend/scripts/setup-real-onchain.ts"
    fi
else
    echo -e "${YELLOW}Start the backend before testing:${NC}"
    echo "  cd backend && npm run dev"
fi
echo ""
