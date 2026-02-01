# Payment Components

This directory contains components for handling payment-related functionality, specifically USDC approval flows for BountyPool deposits.

## Components

### USDCApprovalFlow

A comprehensive component that handles the USDC approval flow for BountyPool deposits on Base Sepolia.

#### Features

- **Automatic Allowance Checking**: Checks current USDC allowance on mount
- **Dynamic UI States**: Shows appropriate UI based on approval status
- **Wallet Integration**: Uses wagmi hooks for secure wallet signing
- **Transaction Monitoring**: Polls blockchain for confirmation (every 2s, max 5 minutes)
- **Error Handling**: Handles user rejection, transaction failures, and network errors
- **Responsive Design**: Built with TailwindCSS for mobile-first responsive design

#### Usage

```tsx
import { USDCApprovalFlow } from '@/components/Payment';

function DepositPage() {
  const [depositAmount, setDepositAmount] = useState('1000');
  const bountyPoolAddress = '0x...'; // BountyPool contract address

  const handleApprovalComplete = () => {
    console.log('USDC approved, ready to deposit!');
    // Enable deposit button or proceed with deposit
  };

  return (
    <USDCApprovalFlow
      depositAmount={depositAmount}
      bountyPoolAddress={bountyPoolAddress}
      onApprovalComplete={handleApprovalComplete}
    />
  );
}
```

#### Props

```typescript
interface USDCApprovalFlowProps {
  depositAmount: string; // USDC amount to approve (human-readable, e.g., "1000.50")
  bountyPoolAddress: string; // Spender address (BountyPool contract)
  onApprovalComplete: () => void; // Callback when approval is confirmed
}
```

#### UI States

1. **Loading**: Checking current allowance
   - Shows spinner with "Checking USDC allowance..."

2. **Insufficient**: Allowance is less than deposit amount
   - Shows "Approve USDC" button
   - Displays current allowance
   - Shows error message if approval fails

3. **Approving**: Waiting for user to sign transaction
   - Shows spinner with "Waiting for signature..."

4. **Pending**: Transaction submitted, waiting for confirmation
   - Shows spinner with "Confirming on blockchain..."
   - Displays Basescan link to view transaction
   - Shows warning if confirmation takes > 60 seconds

5. **Approved**: Approval confirmed on blockchain
   - Shows green checkmark with "Approved: {amount} USDC"
   - Calls `onApprovalComplete()` callback

6. **Error**: Error occurred during process
   - Shows error message (red alert)
   - Displays "Retry" button

#### Error Messages

- **User Rejection**: "Approval cancelled by user"
- **Transaction Failure**: Displays revert reason from blockchain
- **Network Error**: "Failed to check USDC allowance" / "Failed to initiate approval"
- **Wallet Not Connected**: "Wallet not connected"

#### Configuration

The component uses the following USDC configuration for Base Sepolia:

```typescript
const USDC_CONFIG = {
  address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  decimals: 6,
  symbol: 'USDC',
  chainId: 84532, // Base Sepolia
};
```

Polling configuration:

```typescript
const POLLING_CONFIG = {
  interval: 2000, // Poll every 2 seconds
  maxDuration: 5 * 60 * 1000, // Maximum 5 minutes
  warningThreshold: 60 * 1000, // Show warning after 60 seconds
};
```

#### Dependencies

- **wagmi**: `useAccount`, `useWriteContract`, `useWaitForTransactionReceipt`
- **viem**: `parseUnits` for USDC amount conversion
- **TanStack Query**: Indirectly via API functions
- **API Functions**: `fetchUSDCAllowance`, `generateUSDCApprovalTx`

#### Backend API Requirements

The component requires the following backend API endpoints:

1. **GET /api/v1/payments/usdc/allowance**
   - Query params: `owner`, `spender`
   - Returns: `{ owner, spender, allowance, allowanceFormatted }`

2. **POST /api/v1/payments/approve**
   - Body: `{ amount, spender }`
   - Returns: `{ to, data, value, chainId, gasLimit }`

See OpenSpec: `openspec/changes/phase-4-payment-automation/specs/usdc-approval-flow/spec.md`

#### Security Considerations

- **No Unlimited Approvals**: Always approves exact deposit amount (never max uint256)
- **Spender Validation**: Backend validates spender is valid BountyPool address
- **Client-Side Signing**: Private keys never exposed to backend
- **Address Validation**: All addresses validated before API calls

#### Styling

Uses TailwindCSS utility classes with the following design system:

- **Colors**:
  - Primary: `blue-600` (buttons, spinners)
  - Success: `green-500` (approved state)
  - Error: `red-500` (error state)
  - Warning: `yellow-50` (long confirmation warning)

- **Components**:
  - Card: `bg-white rounded-lg shadow-sm border p-6`
  - Button: `px-4 py-2 text-sm font-medium rounded-md`
  - Alert: `p-3 border rounded-md`

#### Testing

Run tests with:

```bash
npm run test -- USDCApprovalFlow.test.tsx
```

See `USDCApprovalFlow.test.tsx` for test cases covering:
- Loading state
- Insufficient allowance (show approve button)
- Sufficient allowance (skip approval)
- Error handling
- Wallet connection states

#### Future Enhancements

- [ ] Support for increasing existing approvals
- [ ] Batch approval for multiple deposits
- [ ] Gas price estimation display
- [ ] Support for other ERC-20 tokens
- [ ] Approval history tracking

#### Related Files

- **Spec**: `openspec/changes/phase-4-payment-automation/specs/usdc-approval-flow/spec.md`
- **API Client**: `frontend/src/lib/api.ts` (USDC functions)
- **Backend Client**: `backend/src/blockchain/contracts/USDCClient.ts`
- **Tests**: `frontend/src/components/Payment/USDCApprovalFlow.test.tsx`
