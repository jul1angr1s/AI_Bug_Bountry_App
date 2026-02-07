# AI Bug Bounty Platform - Claude Code Guidelines

## Debugging Payments

When debugging payment flows, always check in this order:

1. **Redis connection/auth status**
   ```bash
   redis-cli -a redis_dev_2024 ping
   ```

2. **On-chain balances vs UI balances**
   ```bash
   npx tsx backend/scripts/check-pool-balance.ts
   npx tsx backend/scripts/check-usdc-balance.ts
   ```

3. **Pool funding levels before contract calls**
   - If pool balance is 0, payments will use demo mode
   - Run `npx tsx backend/scripts/fund-bounty-pool.ts` to fund

## On-Chain Development

For on-chain testing, **always verify actual blockchain state** (not just UI) before assuming balances are correct. Use contract read calls to confirm pool funding:

```bash
# Check pool balance for a protocol
cast call $BOUNTY_POOL_ADDRESS "getProtocolBalance(bytes32)" $PROTOCOL_ID --rpc-url $BASE_SEPOLIA_RPC_URL
```

## Common Issues

### Contract Reverts
When payment contracts revert, **check pool funding first** - insufficient funds is the most common cause and easy to miss.

Diagnostic steps:
1. Check protocol has `onChainProtocolId` set (if null → demo mode)
2. Verify pool has sufficient USDC balance
3. Check payer wallet has ETH for gas

### Demo Mode Fallback
The system automatically falls back to demo mode when:
- Protocol lacks `onChainProtocolId`
- Pool balance is 0
- On-chain transaction fails

Look for "Demo mode" in payment worker logs to confirm which mode is active.

## Quick Diagnostic Commands

```bash
# Full system health check
./scripts/diagnose-payment.sh

# Reset test environment to known good state
./scripts/reset-test-environment.sh

# Check all protocol states
npx tsx backend/scripts/check-protocol-status.ts

# Verify demo setup
npx tsx backend/scripts/verify-demo-setup.ts
```

## Environment Variables

Key payment-related env vars in `backend/.env`:
- `SKIP_ONCHAIN_REGISTRATION` - Skip on-chain protocol registration (default: true for dev)
- `BOUNTY_POOL_ADDRESS` - Deployed BountyPool contract
- `BASE_SEPOLIA_RPC_URL` - Alchemy RPC endpoint

## Testing Workflow

Before starting payment flow tests:
1. Run `/preflight-payment` skill to verify infrastructure
2. Ensure Redis is running with auth
3. Verify pool has funds (or accept demo mode)
4. Check agent status is ONLINE
