# ScanDashboardHeader Component

A comprehensive header component for the scan dashboard displaying scan metadata, status, and action controls.

## Features

### 1. Status Badge with Animation
- **Active Scan**: Green badge with pulsing dot animation for running scans
- **Queued**: Yellow badge for queued scans
- **Completed**: Gray badge for successful scans
- **Failed**: Red badge for failed scans
- **Canceled**: Gray badge for canceled scans

### 2. Scan Metadata Display
- **Scan ID**: Displayed in monospace font with format `#SCAN-{id}` (truncated to 8 chars)
- **Protocol Name**: Large heading (3xl font, bold) showing the contract/protocol name
- **Contract Address**: Optional truncated address display (e.g., `0x1f98...f984`)
- **Start Time**: Relative time display using date-fns (e.g., "Started 14 minutes ago")

### 3. Action Buttons
- **Pause Button**: Currently disabled with "Coming soon" tooltip (not yet implemented in backend)
- **Abort Button**: Fully functional with confirmation dialog
  - Opens modal dialog to confirm abort action
  - Calls `cancelScan` API endpoint
  - Shows loading state during operation
  - Displays success/error toast notifications
  - Triggers optional `onScanUpdate` callback after successful abort

### 4. Abort Confirmation Dialog
- Modal overlay with backdrop blur
- Warning icon and clear messaging
- Accessible with proper ARIA labels
- Prevents accidental aborts
- Clicking backdrop or Cancel button closes dialog
- Clicking dialog content does not close dialog

## Usage

```tsx
import { ScanDashboardHeader } from '@/components/scans/modern';

export function ScanDetailPage() {
  const { scanId } = useParams();
  const { data: scan, refetch } = useScan(scanId);

  return (
    <div className="min-h-screen bg-background-dark p-6">
      <ScanDashboardHeader
        scan={scan}
        contractAddress={scan.protocol?.contractAddress}
        onScanUpdate={() => {
          // Refresh scan data after abort
          refetch();
        }}
      />
      {/* Rest of dashboard content */}
    </div>
  );
}
```

## Props

### ScanDashboardHeaderProps

```typescript
interface ScanDashboardHeaderProps {
  scan: {
    id: string;
    protocolId: string;
    state: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
    currentStep?: string;
    startedAt: string;
    protocol?: {
      id: string;
      githubUrl: string;
      contractName: string;
    };
  };
  contractAddress?: string;
  onScanUpdate?: () => void;
}
```

### Props Details

- `scan` (required): Scan object containing metadata and current state
- `contractAddress` (optional): Contract address to display (will be truncated)
- `onScanUpdate` (optional): Callback function triggered after successful scan abort

## Responsive Design

- **Desktop**: Full button text visible, horizontal layout
- **Mobile**: Icon-only buttons (text hidden with `sm:inline` class), stacks metadata vertically
- Uses flex-wrap for graceful wrapping on smaller screens

## Accessibility

- Semantic HTML structure with `<header>` element
- Proper heading hierarchy (h1 for protocol name, h2 for dialog title)
- ARIA labels on dialog (`aria-labelledby`, `aria-describedby`)
- Keyboard accessible (all buttons and dialog controls)
- Focus management within modal
- Screen reader friendly status announcements

## Styling

- Uses TailwindCSS utility classes
- Dark mode optimized (surface-dark, surface-border colors)
- Material Symbols Outlined icons
- Smooth transitions and hover states
- Pulsing animation for active scans

## API Integration

### cancelScan

The component integrates with the backend API through the `cancelScan` function:

```typescript
import { cancelScan } from '@/lib/api';

// In component
await cancelScan(scanId);
```

**API Endpoint**: `DELETE /api/v1/scans/:scanId`

**Response**:
```json
{
  "id": "scan-123",
  "state": "CANCELED"
}
```

## Testing

Comprehensive unit tests cover:
- Status badge rendering for all states
- Scan ID truncation and formatting
- Protocol name display
- Contract address truncation
- Start time formatting and error handling
- Action button visibility based on scan state
- Dialog open/close behavior
- Abort confirmation flow
- API integration and error handling
- Loading states
- Toast notifications
- Accessibility features

Run tests:
```bash
npm test -- ScanDashboardHeader.test.tsx
```

## Error Handling

- **Invalid date**: Displays "Start time unknown" for invalid `startedAt` values
- **Missing protocol**: Shows "Unknown Protocol" when protocol data is unavailable
- **API errors**: Displays error toast with error message
- **Network errors**: Shows user-friendly error notification

## Future Enhancements

- **Pause functionality**: Will be enabled when backend support is added
- **Progress indicator**: Could add scan completion percentage
- **Export button**: Add scan report export functionality
- **Share link**: Generate shareable scan results URL
