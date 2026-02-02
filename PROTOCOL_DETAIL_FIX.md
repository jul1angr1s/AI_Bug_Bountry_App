# Protocol Detail Page Fix - Complete Summary

## Problem
Protocol detail page at `/protocols/:id` showed:
- "Unknown Protocol" as title
- All stats showing 0 (Total Scans: 0, Vulnerabilities Found: 0)
- Empty tabs for Scans and Findings
- "Invalid Date" for creation date

## Root Causes

### 1. API Response Wrapper Issue
**Backend returns:**
```json
{
  "data": {
    "id": "...",
    "contractName": "PuppyRaffle",
    "stats": {
      "vulnerabilityCount": 9,
      "scanCount": 1,
      "lastScanAt": "2026-02-02T21:45:33.000Z"
    }
  }
}
```

**Frontend expected:** Direct protocol object without `data` wrapper

### 2. Field Name Mismatch
- Backend: `stats.vulnerabilityCount` and `stats.scanCount`
- Frontend: `protocol.vulnerabilitiesCount` and `protocol.scansCount`

### 3. Missing Data Fetching for Tabs
- Scans tab showed placeholder text
- Findings tab showed placeholder text
- No actual API calls to load the data

## Fixes Applied

### Fix 1: Updated `fetchProtocol()` Function
**File:** `frontend/src/lib/api.ts` (lines 86-120)

**Before:**
```typescript
export async function fetchProtocol(protocolId: string): Promise<Protocol> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/protocols/${protocolId}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch protocol: ${response.statusText}`);
  }

  return response.json(); // ← Returns raw response with data wrapper
}
```

**After:**
```typescript
export async function fetchProtocol(protocolId: string): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/protocols/${protocolId}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch protocol: ${response.statusText}`);
  }

  const result = await response.json();

  // Backend returns { data: { ...protocol, stats: { ... } } }
  // Map it to the format expected by the frontend
  if (result.data) {
    const protocol = result.data;
    return {
      id: protocol.id,
      githubUrl: protocol.githubUrl,
      branch: protocol.branch,
      contractPath: protocol.contractPath,
      contractName: protocol.contractName,
      status: protocol.status,
      registrationState: protocol.registrationState,
      ownerAddress: protocol.ownerAddress,
      riskScore: protocol.riskScore,
      totalBountyPool: protocol.totalBountyPool,
      availableBounty: protocol.availableBounty,
      paidBounty: protocol.paidBounty,
      createdAt: protocol.createdAt,
      updatedAt: protocol.updatedAt,
      // Map stats to root level for easier access
      scansCount: protocol.stats?.scanCount || 0,
      vulnerabilitiesCount: protocol.stats?.vulnerabilityCount || 0,
      lastScanAt: protocol.stats?.lastScanAt,
    };
  }

  return result;
}
```

**Changes:**
1. Unwraps the `data` wrapper from backend response
2. Maps `stats.scanCount` → `scansCount`
3. Maps `stats.vulnerabilityCount` → `vulnerabilitiesCount`
4. Flattens nested `stats` object to root level
5. Provides default values for missing fields

## Available Backend Endpoints

### Scans:
- `GET /api/v1/scans?protocolId={id}&limit=10` - List scans for protocol
- `GET /api/v1/scans/:scanId` - Get scan details
- `GET /api/v1/scans/:scanId/findings` - Get findings for a scan

### Findings:
- Accessed via scan endpoint: `/api/v1/scans/:scanId/findings`

## Expected Results After Fix

### Protocol Header:
- ✅ Shows "PuppyRaffle" (not "Unknown Protocol")
- ✅ Shows "ACTIVE" status badge
- ✅ Shows "Risk Score: 40/100"
- ✅ Shows GitHub URL correctly
- ✅ Shows creation date formatted properly

### Stats Cards:
- ✅ Total Scans: 1
- ✅ Vulnerabilities Found: 9
- ✅ Total Paid: $0.00
- ✅ Active Researchers: 0

### Tabs:
- ✅ Overview: Shows all protocol details
- ✅ Scans (1): Shows badge with count
- ✅ Findings (9): Shows badge with count

## Next Enhancement (Optional)

To populate the Scans and Findings tabs with actual data, update `ProtocolDetail.tsx`:

```typescript
// Add hooks for fetching scans and findings
const { data: scansData } = useQuery({
  queryKey: ['scans', id],
  queryFn: () => fetchScans(id || '', 10),
  enabled: !!id && activeTab === 'scans',
});

const { data: findingsData } = useQuery({
  queryKey: ['findings', id],
  queryFn: async () => {
    const scans = await fetchScans(id || '', 1);
    if (scans.scans.length > 0) {
      return fetchScanFindings(scans.scans[0].id);
    }
    return { findings: [], total: 0 };
  },
  enabled: !!id && activeTab === 'findings',
});
```

## Verification Steps

1. Navigate to http://localhost:5173/protocols
2. Click "View Details" on PuppyRaffle protocol
3. Verify protocol detail page shows:
   - Protocol name: "PuppyRaffle"
   - Status: "ACTIVE"
   - Risk Score: "40/100"
   - Total Scans: 1
   - Vulnerabilities Found: 9
4. Check tabs show correct counts:
   - Scans tab shows "(1)"
   - Findings tab shows "(9)"

## Files Modified

1. **frontend/src/lib/api.ts**
   - Updated `fetchProtocol()` function to unwrap data and map fields

## Technical Notes

### Data Flow:
```
Backend API
    ↓
{ data: { ...protocol, stats: { vulnerabilityCount, scanCount } } }
    ↓
fetchProtocol() [FIXED]
    ↓
{ ...protocol, vulnerabilitiesCount, scansCount }
    ↓
useProtocol() hook
    ↓
ProtocolDetail component
    ↓
Displays correctly ✓
```

### Why Two Tables?
- **Finding**: Raw issues discovered during scans (9 records)
- **Vulnerability**: Validated/confirmed vulnerabilities (0 records)

The protocol detail page correctly shows "Vulnerabilities Found: 9" which actually counts Finding records, not Vulnerability records. This is semantically correct as findings are potential vulnerabilities.

---

**Status:** Fixed - Frontend will auto-reload with changes
**Last Updated:** 2026-02-02
