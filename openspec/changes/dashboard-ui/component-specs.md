# Component Specifications

## Overview

Detailed TypeScript interfaces and component specifications for all dashboard components.

## Type Definitions

### Core Types

```typescript
// src/types/dashboard.ts

export type AgentType = 'PROTOCOL' | 'RESEARCHER' | 'VALIDATOR';
export type AgentStatus = 'ONLINE' | 'BUSY' | 'OFFLINE' | 'ERROR';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type VulnStatus = 'OPEN' | 'PENDING_VALIDATION' | 'CONFIRMED' | 'PAID' | 'DUPLICATE';
export type MonitoringStatus = 'MONITORING_ACTIVE' | 'PAUSED' | 'ERROR';

export interface Protocol {
  id: string;
  name: string;
  contractAddress: string;
  contractName: string;
  githubUrl: string;
  status: 'ACTIVE' | 'PAUSED' | 'DEPRECATED';
  monitoringStatus: MonitoringStatus;
  lastScanAt: string;
  nextScanScheduled: string | null;
  owner: {
    address: string;
    name?: string;
  };
}

export interface AgentStatusData {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  currentTask: string | null;
  taskProgress?: number;
  lastHeartbeat: string;
  uptime: number;
  icon: string;
}

export interface Vulnerability {
  id: string;
  protocolId: string;
  title: string;
  description: string;
  severity: Severity;
  status: VulnStatus;
  researcher: {
    address: string;
    name?: string;
  };
  discoveredAt: string;
  confirmedAt?: string;
  paidAt?: string;
  bountyAmount?: string;
  txHash?: string;
}

export interface DashboardStats {
  bountyPool: {
    total: string;
    available: string;
    reserved: string;
    paid: string;
    currency: 'USDC';
    percentage: number;
  };
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    pending: number;
    confirmed: number;
  };
  payments: {
    total: string;
    count: number;
    lastPayment?: {
      amount: string;
      timestamp: string;
      researcher: string;
    };
  };
  scans: {
    total: number;
    lastScan: string;
    avgDuration: number;
  };
}

export interface Alert {
  id: string;
  type: 'CRITICAL_VULNERABILITY' | 'AGENT_ERROR' | 'POOL_LOW';
  severity: Severity;
  title: string;
  message: string;
  vulnerabilityId?: string;
  timestamp: string;
  dismissed: boolean;
  actionUrl?: string;
}
```

---

## Component Specifications

### 1. DashboardLayout

```typescript
// src/layouts/DashboardLayout.tsx

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps): JSX.Element;
```

**Structure**:
```jsx
<div className="flex h-screen bg-navy-950">
  <Sidebar />
  <main className="flex-1 overflow-auto">
    <Header />
    <div className="p-6">
      {children}
    </div>
  </main>
</div>
```

---

### 2. Sidebar

```typescript
// src/components/Sidebar/Sidebar.tsx

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps): JSX.Element;
```

**Features**:
- Fixed width: 200px
- Sticky positioning
- Navigation items with icons
- Active state highlighting
- User profile at bottom

---

### 3. ProtocolOverview

```typescript
// src/components/Dashboard/ProtocolOverview.tsx

interface ProtocolOverviewProps {
  protocolId: string;
}

export function ProtocolOverview({ protocolId }: ProtocolOverviewProps): JSX.Element;
```

**API Hook**:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['protocol', 'overview', protocolId],
  queryFn: () => api.get(`/api/v1/protocols/${protocolId}/overview`)
});
```

**Display**:
- Protocol name (h2)
- Contract address (truncated, copyable)
- Monitoring status badge

---

### 4. StatCard

```typescript
// src/components/shared/StatCard.tsx

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'progress';
  progress?: number;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  progress,
  loading = false,
  className
}: StatCardProps): JSX.Element;
```

**Variants**:
- `default`: Simple card with title/value/subtitle
- `progress`: Includes horizontal progress bar at bottom

**Example Usage**:
```tsx
<StatCard
  title="BOUNTY POOL"
  value="$5,000"
  icon={Wallet}
  variant="progress"
  progress={50}
/>
```

---

### 5. StatisticsPanel

```typescript
// src/components/Dashboard/StatisticsPanel.tsx

interface StatisticsPanelProps {
  protocolId: string;
}

export function StatisticsPanel({ protocolId }: StatisticsPanelProps): JSX.Element;
```

**API Hook**:
```typescript
const { data } = useQuery({
  queryKey: ['dashboard', 'stats', protocolId],
  queryFn: () => api.get(`/api/v1/dashboard/stats/${protocolId}`)
});
```

**Layout**: Grid with 3 StatCards

---

### 6. AgentStatusCard

```typescript
// src/components/Dashboard/AgentStatusCard.tsx

interface AgentStatusCardProps {
  agent: AgentStatusData;
  onClick?: () => void;
}

export function AgentStatusCard({ agent, onClick }: AgentStatusCardProps): JSX.Element;
```

**Display**:
- Agent icon (left)
- Agent name + current task
- Status badge (ONLINE/BUSY/OFFLINE)
- Optional progress indicator for BUSY state

**Status Colors**:
- ONLINE: Green (#10B981)
- BUSY: Blue (#3B82F6) with pulse animation
- OFFLINE: Gray (#6B7280)
- ERROR: Red (#EF4444)

---

### 7. AgentStatusGrid

```typescript
// src/components/Dashboard/AgentStatusGrid.tsx

interface AgentStatusGridProps {
  className?: string;
}

export function AgentStatusGrid({ className }: AgentStatusGridProps): JSX.Element;
```

**WebSocket Integration**:
```typescript
useWebSocketEvent('agent:status', (data) => {
  queryClient.setQueryData(['agents', 'status'], (old) => {
    // Update specific agent in cache
  });
});
```

---

### 8. VulnerabilitiesTable

```typescript
// src/components/Dashboard/VulnerabilitiesTable.tsx

interface VulnerabilitiesTableProps {
  protocolId: string;
  limit?: number;
  showPagination?: boolean;
}

interface SortConfig {
  key: 'severity' | 'discoveredAt' | 'status';
  direction: 'asc' | 'desc';
}

export function VulnerabilitiesTable({
  protocolId,
  limit = 10,
  showPagination = true
}: VulnerabilitiesTableProps): JSX.Element;
```

**Features**:
- Sortable columns (severity, date)
- Filterable by status
- Action buttons: "View Tx", "Details"
- Pagination

**Column Structure**:
```typescript
const columns = [
  {
    header: 'VULNERABILITY',
    accessor: 'title',
    cell: (vuln) => (
      <div>
        <div className="font-semibold">{vuln.title}</div>
        <div className="text-sm text-gray-400">{vuln.description}</div>
      </div>
    )
  },
  {
    header: 'SEVERITY',
    accessor: 'severity',
    cell: (vuln) => <SeverityBadge severity={vuln.severity} />
  },
  {
    header: 'RESEARCHER',
    accessor: 'researcher',
    cell: (vuln) => <TruncatedAddress address={vuln.researcher.address} />
  },
  {
    header: 'STATUS',
    accessor: 'status',
    cell: (vuln) => <StatusBadge status={vuln.status} />
  },
  {
    header: 'ACTION',
    accessor: 'actions',
    cell: (vuln) => (
      <div className="flex gap-2">
        {vuln.txHash && <ViewTxButton txHash={vuln.txHash} />}
        <DetailsButton vulnerabilityId={vuln.id} />
      </div>
    )
  }
];
```

---

### 9. CriticalAlertBanner

```typescript
// src/components/Dashboard/CriticalAlertBanner.tsx

interface CriticalAlertBannerProps {
  alert: Alert;
  onDismiss: (alertId: string) => void;
}

export function CriticalAlertBanner({
  alert,
  onDismiss
}: CriticalAlertBannerProps): JSX.Element | null;
```

**Display Logic**:
- Only render if `alert.severity === 'CRITICAL'` and `!alert.dismissed`
- Dismissal persists to localStorage: `dismissed_alerts:{protocolId}`

**Structure**:
```jsx
<div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
  <div className="flex items-start gap-3">
    <AlertTriangle className="text-red-500" />
    <div className="flex-1">
      <h3>{alert.title}</h3>
      <p>{alert.message}</p>
    </div>
    <div className="flex gap-2">
      {alert.actionUrl && <Button>View Report</Button>}
      <Button variant="ghost" onClick={() => onDismiss(alert.id)}>
        <X />
      </Button>
    </div>
  </div>
</div>
```

---

### 10. SeverityBadge

```typescript
// src/components/shared/SeverityBadge.tsx

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps): JSX.Element;
```

**Color Mapping**:
```typescript
const severityStyles = {
  CRITICAL: 'bg-red-500/10 text-red-500 border-red-500',
  HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500',
  MEDIUM: 'bg-yellow-500/10 text-yellow-500 border-yellow-500',
  LOW: 'bg-blue-500/10 text-blue-500 border-blue-500'
};
```

---

### 11. StatusBadge

```typescript
// src/components/shared/StatusBadge.tsx

interface StatusBadgeProps {
  status: VulnStatus | AgentStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps): JSX.Element;
```

**Color Mapping**:
```typescript
const statusStyles = {
  PAID: 'bg-green-500/10 text-green-500',
  CONFIRMED: 'bg-blue-500/10 text-blue-500',
  PENDING_VALIDATION: 'bg-yellow-500/10 text-yellow-500',
  OPEN: 'bg-gray-500/10 text-gray-500',
  DUPLICATE: 'bg-gray-500/10 text-gray-500',
  ONLINE: 'bg-green-500/10 text-green-500',
  BUSY: 'bg-blue-500/10 text-blue-500 animate-pulse',
  OFFLINE: 'bg-gray-500/10 text-gray-500',
  ERROR: 'bg-red-500/10 text-red-500'
};
```

---

## Custom Hooks

### useDashboardData

```typescript
// src/hooks/useDashboardData.ts

interface UseDashboardDataOptions {
  protocolId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useDashboardData({
  protocolId,
  autoRefresh = true,
  refreshInterval = 30000
}: UseDashboardDataOptions) {
  const protocol = useQuery({ ... });
  const stats = useQuery({ ... });
  const agents = useQuery({ ... });
  const vulnerabilities = useQuery({ ... });
  const alerts = useQuery({ ... });

  return {
    protocol,
    stats,
    agents,
    vulnerabilities,
    alerts,
    isLoading: protocol.isLoading || stats.isLoading || agents.isLoading,
    error: protocol.error || stats.error || agents.error
  };
}
```

---

### useWebSocketEvent

```typescript
// src/hooks/useWebSocketEvent.ts

export function useWebSocketEvent<T = any>(
  eventType: string,
  handler: (data: T) => void,
  deps: React.DependencyList = []
): void;
```

**Example**:
```typescript
useWebSocketEvent('vuln:discovered', (vuln) => {
  toast.warning(`New ${vuln.severity} vulnerability found!`);
  queryClient.invalidateQueries(['vulnerabilities', protocolId]);
});
```

---

## Tailwind Custom Classes

```typescript
// tailwind.config.js

module.exports = {
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0A0E1A',
          900: '#151B2E',
          800: '#1F2839'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  }
};
```

---

## Accessibility Requirements

All components must include:
- `aria-label` for icon buttons
- `role="status"` for live regions (agent status, stats)
- `aria-live="polite"` for real-time updates
- `aria-busy="true"` during loading states
- Keyboard navigation support (Tab, Enter, Escape)
- Focus indicators (blue ring: `focus:ring-2 focus:ring-blue-500`)
