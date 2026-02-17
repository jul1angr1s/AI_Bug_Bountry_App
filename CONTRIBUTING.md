# Contributing to AI Bug Bounty Platform

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (via Supabase or local)
- Redis (with auth enabled)
- Foundry (for smart contract development)

### Clone with Submodules

The smart contracts use Foundry submodules for dependencies (OpenZeppelin, forge-std):

```bash
git clone --recursive https://github.com/jul1angr1s/AI_Bug_Bountry_App.git
cd AI_Bug_Bountry_App
```

If you already cloned without `--recursive`:

```bash
cd backend/contracts
git submodule update --init --recursive
```

### Environment Setup

1. Copy environment templates:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env frontend/.env
   ```

2. Fill in required values (see `backend/.env.example` for descriptions)

3. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. Initialize the database and agents:
   ```bash
   cd backend
   npx prisma migrate deploy
   npx tsx scripts/init-agents.ts
   ```

## Development Workflow

### Branch Conventions

- `main` — production-ready code
- `feature/<name>` — new features
- `fix/<name>` — bug fixes
- `refactor/<name>` — code improvements

### Running Locally

```bash
# Full stack (from project root)
./scripts/dev-improved.sh

# Or individually:
cd backend && npm run dev
cd frontend && npm run dev
```

### Testing

Run tests before submitting changes:

```bash
# Backend unit tests
cd backend && npm test

# Smart contract tests
cd backend/contracts && forge test

# Frontend tests
cd frontend && npm test

# E2E tests (requires running backend + frontend)
npx playwright test
```

### Code Style

- TypeScript strict mode enabled in both backend and frontend
- ESLint with `@typescript-eslint/no-explicit-any` enforcement
- No hardcoded secrets — use environment variables

## Smart Contracts

Contracts live in `backend/contracts/` and use Foundry:

```bash
cd backend/contracts
forge build    # compile
forge test     # run tests
```

Submodule dependencies:
- `lib/forge-std` — Foundry test framework
- `lib/openzeppelin-contracts` — OpenZeppelin contracts

## Pull Requests

- Keep PRs focused on a single concern
- Include a description of what changed and why
- Ensure all tests pass
- Update documentation if behavior changes

## Documentation

All documentation lives in `docs/`:

| File | Contents |
|------|----------|
| `ARCHITECTURE.md` | System architecture overview |
| `API.md` | REST API endpoints |
| `SECURITY.md` | Security practices |
| `DEPLOYMENT.md` | Deployment guide |
| `SETUP_INSTRUCTIONS.md` | Detailed setup |
| `TROUBLESHOOTING.md` | Common issues |
| `UI/` | UI screenshots |

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
