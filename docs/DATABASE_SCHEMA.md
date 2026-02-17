# Database Schema: Autonomous Bug Bounty Orchestrator

## Overview

**Provider**: [Supabase](https://supabase.com) (Managed PostgreSQL)
**ORM**: Prisma (for Backend Service)
**Realtime**: Supabase Realtime (WebSockets replacement) or Custom Socket.io
**Auth**: Supabase Auth (Wallet/GitHub)

## Entity Relationship Diagram

*(Diagram remains largely similar to original specification)*

---

## Supabase Integration

### Authentication Mapping
Supabase handles authentication in the `auth.users` table. Our public tables (Researcher, Protocol Owner) should reference these IDs if we use Supabase Auth.

However, since this is a Web3-native app, users authenticate via Wallet Connect. Supabase supports SIWE (Sign-In with Ethereum).

**Mapping Strategy**:
1. User connects wallet.
2. Supabase Auth creates user in `auth.users`.
3. Trigger creates/updates entry in `public.Researcher` or `public.Protocol` based on wallet address.

---

## Prisma Schema (Updated for Supabase)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Required for Supabase in serverless envs
}

// ... Enums (unchanged) ...

// ============================================
// MODELS
// ============================================

model Protocol {
  id              String         @id @default(uuid())
  
  // Supabase Auth ID (Optional link to auth.users)
  authUserId      String?        @db.Uuid
  
  // Web3 Identity
  ownerAddress    String
  
  githubUrl       String         @unique
  // ... rest of fields unchanged ...
  
  @@index([authUserId])
  @@index([ownerAddress])
}

model Researcher {
  id            String           @id @default(uuid())
  
  // Supabase Auth ID (Optional link to auth.users)
  authUserId    String?          @db.Uuid

  walletAddress String           @unique
  // ... rest of fields unchanged ...

  @@index([authUserId])
}

// ... (Previous models)

model Vulnerability {
  id              String      @id @default(uuid())
  protocolId      String
  
  // Deterministic Fingerprint
  // keccak256(contractAddress + vulnType + functionSignature)
  vulnerabilityHash String    @unique
  
  severity        String
  title           String
  description     String
  status          String      // OPEN, PENDING_VALIDATION, VALIDATED, PAID, DUPLICATE
  
  // Relations
  validations     Validation[]
  
  createdAt       DateTime    @default(now())
}

model Notification {
  id              String      @id @default(uuid())
  userId          String      // Links to Researcher or Protocol Owner
  type            String      // VULN_FOUND, PAYMENT_RECEIVED, DUPLICATE_REJECTED
  title           String
  message         String
  read            Boolean     @default(false)
  metadata        Json?       // Stores relatedIDs e.g. { "validationId": "..." }
  
  createdAt       DateTime    @default(now())
  
  @@index([userId])
}

model Validation {
  id              String      @id
  proofHash       String      @unique
  vulnerabilityHash String    // Link to canonical bug class
  
  // ... rest existing fields
}
```

---

## Supabase Features Utilization

### 1. Realtime Subscriptions (Replacing Custom WebSockets)
Instead of a custom Socket.io server, we can use Supabase Realtime to push updates to the Dashboard.

**Frontend Code Example**:
```typescript
const channel = supabase
  .channel('public:Vulnerability')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Vulnerability' }, payload => {
    console.log('New vuln found:', payload.new)
  })
  .subscribe()
```

### 2. Row Level Security (RLS)
If the Frontend accesses tables directly (`supabase.from('Protocol').select()`), we must enable RLS.

```sql
-- Enable RLS
ALTER TABLE "Protocol" ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access
CREATE POLICY "Public Read" ON "Protocol"
  FOR SELECT USING (true);

-- Policy: Owner write access
CREATE POLICY "Owner Write" ON "Protocol"
  FOR UPDATE USING (auth.uid() = authUserId);
```

### 3. Edge Functions (Optional)
We can run simple agent triggers via Supabase Edge Functions (Deno) if we want to offload some logic from the main Node.js backend.

---

## Redis / Queue Handling
While Supabase offers pg_net and cron, we will stick to **Redis + BullMQ** for the heavy lifting of Agent Job Queues (Scanning, Validation) as it provides better robustness for long-running tasks compared to database queues.

**Redis Connection**:
Use a hosted Redis (e.g., Railway Redis or Upstash) alongside Supabase.

---

## Migration Steps

1. **Init Supabase**: `supabase init`
2. **Push Schema**: `npx prisma db push`
3. **Generate Client**: `npx prisma generate`
4. **Seed Data**: `npx ts-node prisma/seed.ts`

---

## Performance Tuning
- **Connection Pooling**: Use Supabase Transaction Pool (port 6543) for Prisma.
- **Realtime Limits**: restricting Realtime to specific tables (`Vulnerability`, `Scan`) to save quotas.

---

## Researcher Reputation System

### Overview

The reputation system incentivizes quality submissions and penalizes false positives. Reputation affects leaderboard rankings and may influence future features like priority scanning access.

### Reputation Formula

```typescript
reputation = 
  (confirmed_criticals * 100) + 
  (confirmed_highs * 50) + 
  (confirmed_mediums * 20) + 
  (confirmed_lows * 10) - 
  (false_positives * 30)
```

### Scoring Breakdown

| Event | Points | Rationale |
|-------|--------|-----------|
| Confirmed CRITICAL | +100 | High-value finding, significant protocol risk |
| Confirmed HIGH | +50 | Serious vulnerability discovered |
| Confirmed MEDIUM | +20 | Moderate risk finding |
| Confirmed LOW | +10 | Minor issue, still valuable |
| False Positive (rejected) | -30 | Penalize wasted validator resources |
| Duplicate Submission | 0 | No penalty, but no reward |

### Database Schema Addition

```prisma
model Researcher {
  id              String           @id @default(uuid())
  authUserId      String?          @db.Uuid
  walletAddress   String           @unique
  name            String?
  
  // Reputation Fields
  reputation         Int           @default(0)
  confirmedCritical  Int           @default(0)
  confirmedHigh      Int           @default(0)
  confirmedMedium    Int           @default(0)
  confirmedLow       Int           @default(0)
  falsePositives     Int           @default(0)
  duplicates         Int           @default(0)
  
  // Aggregate Stats
  totalFindings      Int           @default(0)
  totalEarnings      Decimal       @default(0) @db.Decimal(18, 6)
  
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  
  // Relations
  vulnerabilities Vulnerability[]
  payments        Payment[]
  
  @@index([authUserId])
  @@index([reputation])
}
```

### Reputation Update Trigger

When a validation result is recorded, the researcher's reputation is automatically updated:

```typescript
// Backend: services/ReputationService.ts
async function updateResearcherReputation(
  researcherId: string,
  validationResult: ValidationResult,
  severity: Severity
): Promise<void> {
  const researcher = await prisma.researcher.findUnique({
    where: { id: researcherId }
  });

  let reputationDelta = 0;
  const updates: Partial<Researcher> = {};

  switch (validationResult) {
    case 'TRUE':
      switch (severity) {
        case 'CRITICAL':
          reputationDelta = 100;
          updates.confirmedCritical = researcher.confirmedCritical + 1;
          break;
        case 'HIGH':
          reputationDelta = 50;
          updates.confirmedHigh = researcher.confirmedHigh + 1;
          break;
        case 'MEDIUM':
          reputationDelta = 20;
          updates.confirmedMedium = researcher.confirmedMedium + 1;
          break;
        case 'LOW':
          reputationDelta = 10;
          updates.confirmedLow = researcher.confirmedLow + 1;
          break;
      }
      updates.totalFindings = researcher.totalFindings + 1;
      break;

    case 'FALSE':
      reputationDelta = -30;
      updates.falsePositives = researcher.falsePositives + 1;
      break;

    case 'DUPLICATE':
      // No reputation change for duplicates
      updates.duplicates = researcher.duplicates + 1;
      break;
  }

  await prisma.researcher.update({
    where: { id: researcherId },
    data: {
      ...updates,
      reputation: Math.max(0, researcher.reputation + reputationDelta) // Floor at 0
    }
  });
}
```

### Leaderboard Query

```sql
-- Top researchers by reputation
SELECT 
  wallet_address,
  name,
  reputation,
  confirmed_critical,
  confirmed_high,
  confirmed_medium,
  confirmed_low,
  total_earnings,
  (confirmed_critical + confirmed_high + confirmed_medium + confirmed_low) as total_confirmed,
  CASE 
    WHEN (total_findings > 0) 
    THEN ROUND(
      (confirmed_critical + confirmed_high + confirmed_medium + confirmed_low)::numeric / 
      total_findings * 100, 2
    )
    ELSE 0 
  END as success_rate
FROM "Researcher"
WHERE reputation > 0
ORDER BY reputation DESC
LIMIT 100;
```

### API Response Enhancement

The leaderboard endpoint returns enriched researcher data:

```typescript
// GET /api/v1/leaderboard
{
  "researchers": [
    {
      "rank": 1,
      "walletAddress": "0x1234...5678",
      "name": "SecurityPro",
      "reputation": 9500,
      "stats": {
        "critical": 45,
        "high": 120,
        "medium": 80,
        "low": 30,
        "falsePositives": 5,
        "successRate": 98.2
      },
      "totalEarned": "125000.00"
    }
  ]
}
