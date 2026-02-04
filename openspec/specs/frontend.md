# Frontend Specification

## Overview

React 18 dashboard with real-time updates, Web3 wallet integration, and Supabase auth.

## Source Documentation
- **Primary**: [project/Stack.md](../../project/Stack.md)
- **Supporting**: [project/Skills.md](../../project/Skills.md) (Vercel Agent Skills)

## Tech Stack
- **Framework**: React 18 + TypeScript 5.x
- **Build Tool**: Vite 5.x
- **Styling**: TailwindCSS + Shadcn UI
- **State**: Zustand (client) + TanStack Query (server)
- **Forms**: React Hook Form + Zod
- **Web3**: Viem 2.x, Wagmi 2.x, ConnectKit
- **Auth**: Supabase Auth (SIWE)
- **Realtime**: Supabase Realtime / Socket.io

## Key Components

### Dashboard Layout
- Protocol table with status, bounty pool, vuln count
- Scan progress indicators (real-time)
- Agent status cards (online/busy/offline)
- Vulnerability alerts (critical/high/medium/low)
- Payment history table

### Protocol Management
- Registration form (GitHub URL, contract path, bounty terms)
- Funding interface (USDC deposit)
- Protocol detail view

### Vulnerability Display
- Severity badges
- Validation status tracking
- Payment confirmation

### Web3 Integration
- Wallet connection (ConnectKit)
- Chain switching (Anvil ↔ Sepolia)
- Transaction signing

## State Management

### Zustand Store
```typescript
interface AppStore {
  protocols: Protocol[];
  scans: Map<string, Scan>;
  agents: Agent[];
  connectionStatus: 'connected' | 'disconnected';
  lastEventId: string;
}
```

### Real-time Sync
- WebSocket event handlers update Zustand store
- SSE for protocol registration progress (useProtocolRegistrationProgress); connection must be established and closed correctly on mount/unmount
- Optimistic updates with rollback on failure
- Connection recovery with missed event sync

## Required Skills (Vercel Agent Skills)
- `react-best-practices` - Performance optimization
- `web-design-guidelines` - Accessibility, forms, animations
- `composition-patterns` - Component architecture
- `supabase-postgres-best-practices` - Auth flows, RLS
