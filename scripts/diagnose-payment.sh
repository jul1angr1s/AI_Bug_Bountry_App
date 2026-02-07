#!/bin/bash
#
# diagnose-payment.sh - Comprehensive payment system diagnostic
#
# Checks: Redis, on-chain balances, pool funding, DB state, agent status
# Run this when payment flows are failing to quickly identify the issue
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "  Payment System Diagnostic"
echo "========================================"
echo ""

# Track overall status
ALL_PASS=true

# 1. Redis Connection Check
echo "1. Redis Connection"
echo "-------------------"
if redis-cli -a redis_dev_2024 ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}[OK]${NC} Redis connection successful"
else
    echo -e "${RED}[FAIL]${NC} Redis connection failed"
    echo "    Fix: Ensure Redis is running with password 'redis_dev_2024'"
    echo "    Try: brew services start redis OR docker-compose up -d redis"
    ALL_PASS=false
fi
echo ""

# 2. Backend Health Check
echo "2. Backend Health"
echo "-----------------"
if curl -sf http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} Backend is healthy"
else
    echo -e "${RED}[FAIL]${NC} Backend not responding"
    echo "    Fix: Start backend with 'npm run dev' in backend/"
    ALL_PASS=false
fi
echo ""

# 3. Payer Wallet USDC Balance
echo "3. Payer Wallet USDC Balance"
echo "----------------------------"
cd "$(dirname "$0")/../backend"
USDC_OUTPUT=$(npx tsx scripts/check-usdc-balance.ts 2>&1) || true
USDC_BALANCE=$(echo "$USDC_OUTPUT" | grep "USDC balance:" | awk '{print $3}')
if [ -n "$USDC_BALANCE" ] && [ "$USDC_BALANCE" != "0" ]; then
    echo -e "${GREEN}[OK]${NC} Payer wallet has $USDC_BALANCE USDC"
else
    echo -e "${YELLOW}[WARN]${NC} Payer wallet has 0 USDC"
    echo "    Info: Get test USDC from https://faucet.circle.com/"
fi
echo ""

# 4. Protocol Pool Balance
echo "4. Protocol Pool Balance"
echo "------------------------"
POOL_OUTPUT=$(npx tsx scripts/check-pool-balance.ts 2>&1) || true
if echo "$POOL_OUTPUT" | grep -q "PRODUCTION mode"; then
    POOL_BALANCE=$(echo "$POOL_OUTPUT" | grep "On-chain pool balance:" | awk '{print $4}')
    echo -e "${GREEN}[OK]${NC} Pool has $POOL_BALANCE USDC - PRODUCTION mode"
elif echo "$POOL_OUTPUT" | grep -q "demo mode"; then
    echo -e "${YELLOW}[INFO]${NC} Pool has 0 balance - DEMO mode active"
    echo "    Info: Fund pool with 'npx tsx scripts/fund-bounty-pool.ts' for production mode"
elif echo "$POOL_OUTPUT" | grep -q "No onChainProtocolId"; then
    echo -e "${YELLOW}[INFO]${NC} No onChainProtocolId set - DEMO mode active"
    echo "    Info: Run 'npx tsx scripts/setup-real-onchain.ts' to enable on-chain payments"
else
    echo -e "${RED}[FAIL]${NC} Could not determine pool status"
    echo "$POOL_OUTPUT"
    ALL_PASS=false
fi
echo ""

# 5. Agent Status
echo "5. Agent Status"
echo "---------------"
AGENT_OUTPUT=$(npx tsx scripts/check-agents.ts 2>&1) || true
if echo "$AGENT_OUTPUT" | grep -q "ONLINE"; then
    ONLINE_COUNT=$(echo "$AGENT_OUTPUT" | grep -c "ONLINE" || echo "0")
    echo -e "${GREEN}[OK]${NC} $ONLINE_COUNT agent(s) online"
else
    echo -e "${RED}[FAIL]${NC} No agents online"
    echo "    Fix: Restart backend to initialize agents"
    ALL_PASS=false
fi
echo ""

# 6. Queue Status
echo "6. Queue Status"
echo "---------------"
QUEUE_OUTPUT=$(npx tsx scripts/check-queue-status.ts 2>&1) || true
if echo "$QUEUE_OUTPUT" | grep -qE "(active|waiting|completed)"; then
    echo -e "${GREEN}[OK]${NC} Queues accessible"
    # Show queue counts if available
    echo "$QUEUE_OUTPUT" | grep -E "^\s*(protocol|scan|payment|validation)" | head -5 || true
else
    echo -e "${RED}[FAIL]${NC} Queue connection issue"
    echo "    Fix: Check Redis connection and BullMQ configuration"
    ALL_PASS=false
fi
echo ""

# 7. Database State Summary
echo "7. Database State"
echo "-----------------"
DB_OUTPUT=$(npx tsx scripts/check-db-state.ts 2>&1) || true
PROTOCOL_COUNT=$(echo "$DB_OUTPUT" | grep -c "Protocol:" || echo "0")
if [ "$PROTOCOL_COUNT" -gt 0 ]; then
    echo -e "${GREEN}[OK]${NC} Found $PROTOCOL_COUNT protocol(s) in database"
else
    echo -e "${YELLOW}[INFO]${NC} No protocols registered yet"
fi
echo ""

cd - > /dev/null

# Summary
echo "========================================"
echo "  Summary"
echo "========================================"
if [ "$ALL_PASS" = true ]; then
    echo -e "${GREEN}All critical checks passed!${NC}"
    echo ""
    echo "Payment mode: Check pool status above for PRODUCTION vs DEMO"
else
    echo -e "${RED}Some checks failed - see details above${NC}"
    echo ""
    echo "Fix the issues before testing payment flows."
fi
echo ""
