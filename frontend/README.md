# Frontend - Thunder Security Dashboard

Dashboard UI for the Autonomous Bug Bounty Orchestrator.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Testing**: Vitest + React Testing Library
- **Auth**: Supabase Auth
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js 20.x LTS
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
# Start dev server
npm run dev

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Type check
npm run type-check

# Lint
npm run lint
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## Project Structure

```
src/
├── components/
│   ├── Dashboard/      # Dashboard-specific components
│   ├── Sidebar/        # Sidebar navigation components
│   └── shared/         # Reusable components
├── layouts/            # Layout components
├── pages/              # Page components
├── lib/                # Utility functions
├── types/              # TypeScript type definitions
└── __tests__/          # Test setup and utilities
```

## Testing Strategy

This project follows **Test-Driven Development (TDD)**:

1. Write tests first
2. Implement component to pass tests
3. Refactor if needed
4. All tests must pass before committing

### Running Tests

```bash
# Watch mode (default)
npm test

# Run once
npm test -- --run

# With coverage
npm run test:coverage
```

## OpenSpec Implementation

This implementation follows the OpenSpec change: `openspec/changes/dashboard-ui/`

### Phase 1: Layout & Navigation ✓
- Base layout structure
- Sidebar navigation
- React Router setup
- Supabase Auth integration

### Phase 2: Dashboard Components ✓
- StatCard component
- ProtocolOverview
- StatisticsPanel
- AgentStatusGrid
- VulnerabilitiesTable
- CriticalAlertBanner

## Build

```bash
npm run build
```

Build output will be in the `dist/` directory.

## License

See the root LICENSE file.
