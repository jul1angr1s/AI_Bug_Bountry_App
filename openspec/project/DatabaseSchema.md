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
