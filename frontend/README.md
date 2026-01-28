# OpenSpect Frontend

React 18 + TypeScript + Vite frontend for the Autonomous Bug Bounty Orchestrator.

## Setup

### 1. Fix npm permissions (run with sudo)

```bash
sudo chown -R 502:20 "/Users/0xjul1/.npm"
```

### 2. Install dependencies

```bash
cd frontend
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Run development server

```bash
npm run dev
```

The app will be available at http://localhost:5173

## Project Structure

```
src/
├── components/
│   ├── Dashboard/          # Dashboard-specific components
│   │   ├── AgentStatusCard.tsx
│   │   ├── AgentStatusGrid.tsx
│   │   ├── CriticalAlertBanner.tsx
│   │   ├── ProtocolOverview.tsx
│   │   ├── StatisticsPanel.tsx
│   │   └── VulnerabilitiesTable.tsx
│   ├── Sidebar/            # Sidebar navigation
│   │   ├── NavLink.tsx
│   │   ├── Sidebar.tsx
│   │   └── UserProfile.tsx
│   └── shared/             # Reusable components
│       ├── SeverityBadge.tsx
│       ├── StatCard.tsx
│       └── StatusBadge.tsx
├── layouts/
│   └── DashboardLayout.tsx
├── pages/
│   └── Dashboard.tsx
├── types/
│   └── dashboard.ts        # TypeScript type definitions
├── lib/
│   └── utils.ts           # Utility functions
├── App.tsx
├── main.tsx
└── index.css
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router** - Routing
- **TanStack Query** - Server state (ready to integrate)
- **Zustand** - Client state (ready to integrate)
- **Lucide React** - Icons
- **Sonner** - Toast notifications

## Features Implemented

### Phase 1: Layout & Navigation ✓
- [x] Base layout with fixed sidebar
- [x] Sidebar navigation with Thunder Security branding
- [x] React Router structure with 5 routes
- [x] User profile display (mock data)

### Phase 2: Dashboard Components ✓
- [x] StatCard component with progress bar variant
- [x] ProtocolOverview card
- [x] StatisticsPanel with 3 metrics
- [x] AgentStatusGrid with real-time status indicators
- [x] VulnerabilitiesTable with severity badges
- [x] CriticalAlertBanner with dismiss functionality

### Phase 3-5: TODO
- [ ] WebSocket integration
- [ ] TanStack Query hooks
- [ ] Zustand store
- [ ] Supabase Auth (SIWE)
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Full keyboard navigation
- [ ] ARIA labels

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Next Steps

1. **Backend API**: Implement the endpoints defined in `openspec/changes/dashboard-ui/delta-spec-api.md`
2. **WebSocket**: Set up Socket.io connection for real-time updates
3. **Auth**: Integrate Supabase Auth with SIWE flow
4. **Data Fetching**: Replace mock data with TanStack Query hooks
5. **State Management**: Implement Zustand store for global state
