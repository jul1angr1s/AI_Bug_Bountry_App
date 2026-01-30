# External APIs Specification

## Overview

Third-party services and API integrations required for the platform.

## Source Documentation
- **Primary**: [project/ExternalAPI.md](../../project/ExternalAPI.md)

## Cost Summary

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Kimi AI (API) | Usage | ~$10-50 |
| Supabase | Free/Pro | $0-25 |
| Alchemy RPC | Growth | $0-49 |
| Pinata IPFS | Free/Pro | $0-20 |
| Railway | Pro | $5-50 |
| CDP (x402) | Usage | $0 (testnet) |
| **Total (Dev)** | | **~$5-50** |
| **Total (Prod)** | | **~$50-150** |

## Service Configurations

### 1. Kimi AI (Inference)
```env
KIMI_API_KEY=sk-bw...
KIMI_BASE_URL=https://api.moonshot.cn/v1
KIMI_MODEL=kimi-k.25
```
- Provider: Moonshot AI
- Context Window: 128k+

### 2. Supabase (Database/Auth)
```env
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgres://...
```
- PostgreSQL 15.x
- Realtime subscriptions
- SIWE authentication

### 3. Alchemy (Blockchain RPC)
```env
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/...
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/...
```

### 4. Local Anvil
```env
ANVIL_RPC_URL=http://127.0.0.1:8545
ANVIL_CHAIN_ID=31337
ANVIL_SANDBOX_URL=http://127.0.0.1:8546
ANVIL_SANDBOX_CHAIN_ID=31338
```

### 5. Pinata (IPFS)
```env
PINATA_API_KEY=...
PINATA_SECRET_KEY=...
```

### 6. Coinbase CDP (x402 Payments)
```env
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
CDP_NETWORK=base-sepolia
```

### 7. GitHub API
```env
GITHUB_TOKEN=ghp_...
```

## USDC Contract Addresses
```env
USDC_SEPOLIA_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
USDC_MAINNET_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```
