# Setup Instructions - OpenSpect Dashboard UI

## Implementation Status

This PR contains **planning artifacts only** (documentation). Implementation will follow in separate PRs.

### Planned Phases
- Phase 1: Layout & Navigation (4 tasks)
- Phase 2: Dashboard Components (6 tasks)
- Phase 3: Real-time Integration (4 tasks)
- Phase 4: Data Fetching & State (4 tasks)
- Phase 5: Polish & Accessibility (4 tasks)

---

## Full Stack Dev (Single Command)

From the repo root:

```bash
bash scripts/dev.sh
```

Notes:
- Starts Postgres + Redis via `backend/docker-compose.yml`
- Runs backend dev server and frontend dev server
- Starts the Researcher worker by default (set `START_RESEARCHER_WORKER=0` to skip)
- If ports are already in use, the script will skip starting that service
- Optional: `START_BACKEND=0` or `START_FRONTEND=0` to skip
- Optional: `KILL_EXISTING=1` to stop processes already using ports 3000/5173 before starting
- Press Ctrl+C to stop frontend/backend processes (Docker services keep running)
- The script loads `backend/.env.local` or `backend/.env` if present

## Required Commands

### Step 1: Fix npm permissions (if needed)

```bash
sudo chown -R $(whoami) ~/.npm
```

### Step 2: Install dependencies

```bash
cd frontend
npm install
```

### Step 3: Set up environment

```bash
cd frontend
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 4: Start development server

```bash
npm run dev
```

Visit: http://localhost:5173

---

## Project Structure Created

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   │   ├── AgentStatusCard.tsx
│   │   │   ├── AgentStatusGrid.tsx
│   │   │   ├── CriticalAlertBanner.tsx
│   │   │   ├── ProtocolOverview.tsx
│   │   │   ├── StatisticsPanel.tsx
│   │   │   └── VulnerabilitiesTable.tsx
│   │   ├── Sidebar/
│   │   │   ├── NavLink.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── UserProfile.tsx
│   │   ├── shared/
│   │   │   ├── SeverityBadge.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── StatusBadge.tsx
│   ├── layouts/
│   │   └── DashboardLayout.tsx
│   ├── pages/
│   │   └── Dashboard.tsx
│   ├── types/
│   │   └── dashboard.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## What's Implemented

### UI Components (with mock data)

1. **Dashboard Layout**
   - Fixed 200px sidebar
   - Responsive content area
   - Header with space for user profile

2. **Sidebar Navigation**
   - Thunder Security branding with logo
   - 5 navigation links (Dashboard, Protocols, Scans, Validations, Payments)
   - Active state highlighting
   - User profile section with wallet address

3. **Protocol Overview Card**
   - Protocol name and contract address
   - Monitoring status badge (green "MONITORING ACTIVE")

4. **Statistics Panel**
   - Bounty Pool card with progress bar
   - Vulnerabilities Found card
   - Total Paid card

5. **Agent Status Grid**
   - 3 agent cards (Protocol, Researcher, Validator)
   - Real-time status badges
   - Current task display

6. **Vulnerabilities Table**
   - Sortable columns
   - Severity badges (color-coded)
   - Status badges
   - Action buttons (View Tx, Details)

7. **Critical Alert Banner**
   - Red warning banner
   - Dismissible
   - "View Report" button

---

## Next Steps

### Phase 3: Real-time Integration (Backend Required)

1. **Set up WebSocket connection**
   - Socket.io client
   - Auto-reconnect logic
   - Event handlers

2. **Implement API endpoints** (see `openspec/changes/dashboard-ui/delta-spec-api.md`)
   - `GET /api/v1/protocols/:id/overview`
   - `GET /api/v1/dashboard/stats/:protocolId`
   - `GET /api/v1/agents/status`
   - `GET /api/v1/protocols/:id/alerts`

### Phase 4: Data & State Management

3. **TanStack Query hooks**
   - `useProtocol()`
   - `useStats()`
   - `useAgents()`
   - `useVulnerabilities()`

4. **Zustand store**
   - Dashboard state
   - WebSocket event handling
   - Connection status

### Phase 5: Auth & Polish

5. **Supabase Auth**
   - SIWE integration
   - Session management
   - Protected routes

6. **Accessibility**
   - Keyboard navigation
   - ARIA labels
   - Screen reader support

---

## Tech Stack

- React 18.2.0
- TypeScript 5.3.3
- Vite 5.0.8
- TailwindCSS 3.3.6
- React Router 6.20.0
- Lucide React (icons)
- Sonner (toasts)

---

## Troubleshooting

### npm install fails
Run: `sudo chown -R $(whoami) ~/.npm`

### Port 5173 in use
Change port in `vite.config.ts`:
```ts
server: { port: 3000 }
```

### Module not found errors
Ensure all dependencies installed:
```bash
npm install
```

---

## Screenshots

The UI matches the design from `/project/UI/Dashboard.png`:
- Dark navy theme (#0A0E1A)
- Blue accent (#3B82F6)
- Fixed sidebar navigation
- Real-time agent status
- Critical alert banner
- Vulnerabilities table

---

## For More Details

- **Full tasks breakdown**: `openspec/changes/dashboard-ui/tasks-reference.md`
- **API requirements**: `openspec/changes/dashboard-ui/delta-spec-api.md`
- **Component specs**: `openspec/changes/dashboard-ui/component-specs.md`
- **Frontend README**: `frontend/README.md`
