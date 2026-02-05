# Demo Testing Checklist

Complete guide for testing the end-to-end payment flow with the 50 USDC budget.

## Pre-Flight Checks

### Contract Configuration
- [ ] BountyPool address: `0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0`
- [ ] Base bounty amount: **1 USDC** (1,000,000 with 6 decimals)
- [ ] HIGH multiplier: **50000** (5x = 5 USDC)
- [ ] MEDIUM multiplier: **30000** (3x = 3 USDC)
- [ ] LOW multiplier: **10000** (1x = 1 USDC)

**Verify with:**
```bash
cd backend
npm run script scripts/verify-demo-setup.ts
```

### Wallet Setup
- [ ] Payer wallet configured in `.env` (PRIVATE_KEY)
- [ ] Researcher wallet configured in `.env` (PRIVATE_KEY2)
- [ ] Payer wallet has >0.01 ETH for gas fees
- [ ] BountyPool balance ≥50 USDC

**Check balances:**
```bash
# Payer wallet ETH
cast balance <PAYER_ADDRESS> --rpc-url https://sepolia.base.org

# Pool USDC balance
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  "balanceOf(address)(uint256)" \
  0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0 \
  --rpc-url https://sepolia.base.org
```

### Environment Configuration
- [ ] Remove `SKIP_ONCHAIN_PAYMENT` from `.env`
- [ ] Remove `PAYMENT_OFFCHAIN_VALIDATION` from `.env`
- [ ] Confirm demo mode is **disabled**

### Backend Services
- [ ] PostgreSQL running
- [ ] Redis running
- [ ] Backend server started: `npm run dev`
- [ ] Payment worker active (check logs)

---

## Test 1: HIGH Vulnerability Payment (5 USDC)

### Setup
- [ ] Register protocol via API or frontend
- [ ] Verify protocol registered on-chain
- [ ] Fund protocol pool if needed

### Execution
1. **Create HIGH severity finding:**
   ```bash
   # Option 1: Via force-validate script
   npm run script scripts/force-validate-finding.ts -- <finding-id>
   
   # Option 2: Via database
   # Create finding with severity="HIGH" in database
   ```

2. **Trigger validation:**
   - [ ] Validator agent picks up finding
   - [ ] Validation completes with CONFIRMED status
   - [ ] Check logs for validation success

3. **Payment processing:**
   - [ ] Payment record created in database (status=PENDING)
   - [ ] Payment job added to queue
   - [ ] Payment worker processes job
   - [ ] Check worker logs for transaction hash

4. **Verification:**
   - [ ] Payment status updated to COMPLETED
   - [ ] Transaction hash recorded in database
   - [ ] USDC transfer confirmed on Basescan
   - [ ] Researcher received exactly **5 USDC**
   - [ ] Pool balance decreased by 5 USDC

**Basescan verification:**
```
Transaction: https://sepolia.basescan.org/tx/<TX_HASH>
Pool balance: https://sepolia.basescan.org/address/0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0#tokentxns
Researcher wallet: https://sepolia.basescan.org/address/<RESEARCHER_ADDRESS>#tokentxns
```

**Expected Result:**
- ✅ 5 USDC transferred
- ✅ Transaction visible on Basescan
- ✅ Payment record status=COMPLETED
- ✅ Pool balance: 50 USDC → 45 USDC

---

## Test 2: MEDIUM Vulnerability Payment (3 USDC)

### Setup
- [ ] Use same protocol from Test 1
- [ ] Verify pool has ≥3 USDC remaining

### Execution
1. **Create MEDIUM severity finding:**
   - [ ] Finding with severity="MEDIUM" created
   - [ ] Proof generated and submitted

2. **Trigger validation:**
   - [ ] Validation completes with CONFIRMED status
   - [ ] Payment triggered automatically

3. **Payment processing:**
   - [ ] Payment job processed by worker
   - [ ] Transaction submitted to BountyPool
   - [ ] Transaction confirmed on Base Sepolia

4. **Verification:**
   - [ ] Researcher received exactly **3 USDC**
   - [ ] Pool balance decreased by 3 USDC
   - [ ] Transaction visible on Basescan

**Expected Result:**
- ✅ 3 USDC transferred
- ✅ Pool balance: 45 USDC → 42 USDC
- ✅ Total spent: 8 USDC (5 + 3)

---

## Test 3: LOW Vulnerability Payment (1 USDC)

### Setup
- [ ] Use same protocol from previous tests
- [ ] Verify pool has ≥1 USDC remaining

### Execution
1. **Create LOW severity finding:**
   - [ ] Finding with severity="LOW" created
   - [ ] Proof generated and submitted

2. **Trigger validation:**
   - [ ] Validation completes with CONFIRMED status
   - [ ] Payment triggered automatically

3. **Payment processing:**
   - [ ] Payment job processed by worker
   - [ ] Transaction submitted to BountyPool
   - [ ] Transaction confirmed on Base Sepolia

4. **Verification:**
   - [ ] Researcher received exactly **1 USDC**
   - [ ] Pool balance decreased by 1 USDC
   - [ ] Transaction visible on Basescan

**Expected Result:**
- ✅ 1 USDC transferred
- ✅ Pool balance: 42 USDC → 41 USDC
- ✅ Total spent: 9 USDC (5 + 3 + 1)

---

## Post-Test Verification

### Budget Tracking
- [ ] Total USDC spent: **9 USDC**
- [ ] Remaining pool balance: **41 USDC**
- [ ] Budget utilization: 18% (9/50)

### Database Consistency
```sql
-- Check payment records
SELECT id, amount, status, txHash, researcherAddress
FROM "Payment"
WHERE status = 'COMPLETED'
ORDER BY "paidAt" DESC
LIMIT 3;

-- Verify vulnerability records
SELECT v.severity, p.amount, p.status
FROM "Vulnerability" v
JOIN "Payment" p ON p."vulnerabilityId" = v.id
WHERE p.status = 'COMPLETED';
```

Expected:
- [ ] 3 payment records with status=COMPLETED
- [ ] All have valid txHash
- [ ] Amounts match severity (HIGH=5, MEDIUM=3, LOW=1)

### On-Chain Verification
```bash
# Check total bounties paid via contract
cast call 0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0 \
  "getTotalBountyCount()(uint256)" \
  --rpc-url https://sepolia.base.org

# Check researcher earnings
cast call 0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0 \
  "getResearcherEarnings(address)(uint256)" \
  <RESEARCHER_ADDRESS> \
  --rpc-url https://sepolia.base.org
```

Expected:
- [ ] Total bounty count: ≥3
- [ ] Researcher earnings: ≥9 USDC (9,000,000 with 6 decimals)

### Frontend Verification (if applicable)
- [ ] Payment dashboard shows 3 completed payments
- [ ] Transaction links work correctly
- [ ] Payment history displays correct amounts
- [ ] Real-time updates worked during testing

---

## Troubleshooting

### Payment Not Processing
**Symptoms:** Payment stuck in PENDING status

**Check:**
1. Worker logs: `npm run dev` (backend)
2. Queue status:
   ```typescript
   // Check in Redis or via BullMQ dashboard
   ```
3. Validation exists on-chain:
   ```bash
   cast call <VALIDATION_REGISTRY> \
     "getValidation(bytes32)" <VALIDATION_ID> \
     --rpc-url https://sepolia.base.org
   ```

**Solutions:**
- Ensure validation is CONFIRMED on-chain
- Check payer wallet has ETH for gas
- Verify demo mode flags are disabled

### Insufficient Balance Error
**Symptoms:** Transaction reverts with "InsufficientBalance"

**Solutions:**
- Check pool balance
- Fund pool with more USDC
- Reduce test payment count

### Gas Issues
**Symptoms:** Transaction fails with gas errors

**Solutions:**
- Fund payer wallet with more testnet ETH
- Increase gas limit in transaction
- Check Base Sepolia network status

---

## Demo Presentation Flow

### Recommended Order
1. **Show contract parameters** (1 min)
   - Display updated bounty amounts
   - Show pool balance (50 USDC)

2. **Register protocol** (2 min)
   - Submit protocol registration form
   - Show confirmation on Basescan

3. **Trigger scan** (3 min)
   - Show researcher agent finding vulnerability
   - Display finding in database/frontend

4. **Validate finding** (2 min)
   - Show validator agent confirming exploit
   - Display validation result

5. **Payment execution** (3 min)
   - Show payment worker logs
   - Display transaction on Basescan
   - Show USDC transfer to researcher
   - Highlight real on-chain payment

6. **Summary** (1 min)
   - Show all 3 payments completed
   - Display budget usage (9/50 USDC)
   - Emphasize on-chain verification

**Total Time:** ~12 minutes

---

## Success Criteria

✅ All 3 payments completed successfully  
✅ Exact amounts: HIGH=5, MEDIUM=3, LOW=1 USDC  
✅ All transactions visible on Basescan  
✅ Database records match on-chain state  
✅ Demo mode was disabled (real payments)  
✅ Budget tracked correctly (9/50 USDC used)  
✅ Researcher wallet received 9 USDC total  
✅ No payment simulation used

---

## Basescan Links (Template)

Replace placeholders with actual values during testing:

**Contract:**
- BountyPool: https://sepolia.basescan.org/address/0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0

**Wallets:**
- Payer: https://sepolia.basescan.org/address/`<PAYER_ADDRESS>`
- Researcher: https://sepolia.basescan.org/address/`<RESEARCHER_ADDRESS>`

**Transactions:**
- HIGH payment: https://sepolia.basescan.org/tx/`<TX_HASH_1>`
- MEDIUM payment: https://sepolia.basescan.org/tx/`<TX_HASH_2>`
- LOW payment: https://sepolia.basescan.org/tx/`<TX_HASH_3>`

**USDC Token:**
- USDC transfers: https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e#tokentxns
