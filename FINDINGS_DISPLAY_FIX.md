# Findings Display Fix - Summary

## Problem
Protocol "PuppyRaffle" showed:
- Status: ACTIVE ✓
- Scans: 1 completed ✓
- **Vulnerabilities: 0** ❌ (Should show 9)

## Root Cause

The API endpoints were querying the **wrong database table**:

### Database Schema:
- **`Finding`** table: Stores individual issues discovered during scans
  - Related to `Scan` model
  - Contains: vulnerabilityType, severity, description, etc.
  - **PuppyRaffle has 9 findings here** ✓

- **`Vulnerability`** table: Stores validated/confirmed vulnerabilities
  - Related to `Protocol` model
  - Separate lifecycle from findings
  - **PuppyRaffle has 0 records here** (expected)

### Bug Location:

**File:** `backend/src/services/protocol.service.ts`

**1. `getProtocolById` function (line 325)**
```typescript
// BEFORE (Wrong):
stats: {
  vulnerabilityCount: protocol.vulnerabilities.length,  // ← Queries Vulnerability table
  scanCount: protocol.scans.length,
  lastScanAt: protocol.scans[0]?.startedAt?.toISOString() || null,
}

// AFTER (Fixed):
// Count total findings across all scans
const totalFindings = protocol.scans.reduce((sum, scan) => sum + scan.findings.length, 0);

stats: {
  vulnerabilityCount: totalFindings,  // ← Now counts Finding records
  scanCount: protocol.scans.length,
  lastScanAt: protocol.scans[0]?.startedAt?.toISOString() || null,
}
```

**2. `listProtocols` function (line 413)**
```typescript
// BEFORE (Wrong):
const protocolList: ProtocolListItem[] = protocols.map((protocol) => ({
  // ...
  vulnerabilitiesCount: protocol.vulnerabilities.length,  // ← Queries Vulnerability table
}));

// AFTER (Fixed):
const protocolList: ProtocolListItem[] = protocols.map((protocol) => {
  // Count total findings across all scans
  const totalFindings = protocol.scans.reduce((sum, scan) => sum + scan.findings.length, 0);

  return {
    // ...
    vulnerabilitiesCount: totalFindings,  // ← Now counts Finding records
  };
});
```

## Changes Made

### Modified Query Includes:

**getProtocolById:**
```typescript
scans: {
  select: {
    id: true,
    startedAt: true,
    findings: {        // ← Added findings
      select: { id: true },
    },
  },
  orderBy: { startedAt: 'desc' },
}
```

**listProtocols:**
```typescript
scans: {
  select: {
    id: true,
    findings: {        // ← Added findings
      select: { id: true },
    },
  },
}
```

### Added Calculations:
Both functions now calculate `totalFindings` by summing up findings across all scans for each protocol.

## Testing

### Database Verification:
```bash
npx tsx check-findings.ts
```

**Results:**
```
Protocol: PuppyRaffle
Status: ACTIVE
Total Scans: 1
Findings (actual): 9

Findings Details:
  1. [CRITICAL] REENTRANCY
  2. [HIGH] INTEGER_OVERFLOW
  3. [HIGH] DENIAL_OF_SERVICE
  4. [HIGH] RANDOMNESS_MANIPULATION
  5. [HIGH] ACCESS_CONTROL
  6. [HIGH] BUSINESS_LOGIC (fee withdrawal flaw)
  7. [HIGH] BUSINESS_LOGIC (index return flaw)
  8. [HIGH] REENTRANCY (safeMint)
  9. [MEDIUM] FRONT_RUNNING
```

### Expected Frontend Results:
After refreshing the page, the protocol detail should now show:
- **Total Scans:** 1
- **Vulnerabilities Found:** 9
- **Active Researchers:** (depends on agent status)

## Files Modified

1. **backend/src/services/protocol.service.ts**
   - Updated `getProtocolById()` to count findings
   - Updated `listProtocols()` to count findings
   - Added findings include in Prisma queries

## Why This Happened

The codebase has two separate concepts:
1. **Findings** - Raw issues discovered by Slither/AI during scans
2. **Vulnerabilities** - Validated, confirmed issues (likely goes through a validation workflow)

The researcher agent correctly creates **Finding** records, but the API was only looking at **Vulnerability** records for the count.

## Verification Steps

1. ✅ Backend restarted with fixes
2. ✅ Database confirms 9 findings exist
3. ⏳ Frontend refresh required to see updated data
4. ⏳ Verify frontend displays: "Vulnerabilities Found: 9"

## Notes

- The `Vulnerability` table appears to be for a later workflow stage
- Findings might need to be "promoted" to vulnerabilities after validation
- For now, the frontend displays Finding counts as "Vulnerabilities Found"
- This is semantically correct since findings are potential vulnerabilities

---

**Status:** Fix applied and backend restarted
**Last Updated:** 2026-02-02
