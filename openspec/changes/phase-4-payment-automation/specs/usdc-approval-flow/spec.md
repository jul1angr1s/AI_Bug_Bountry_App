# USDC Approval Flow Specification

## ADDED Requirements

### Requirement: System SHALL provide USDC allowance checking API
The system SHALL expose API endpoint to check current USDC allowance for protocol owner wallets.

#### Scenario: Check allowance for specific owner and spender
- **WHEN** client requests GET /api/v1/payments/usdc/allowance?owner={address}&spender={bountyPoolAddress}
- **THEN** system SHALL query Base Sepolia USDC contract (0x036CbD53842c5426634e7929541eC2318f3dCF7e) using USDCClient.getAllowance()
- **THEN** system SHALL return JSON response with allowance amount in USDC units (6 decimals)

#### Scenario: Invalid address returns error
- **WHEN** client requests allowance with malformed Ethereum address
- **THEN** system SHALL return 400 Bad Request with error message "Invalid Ethereum address"

### Requirement: System SHALL provide USDC balance checking API
The system SHALL expose API endpoint to check current USDC balance for wallet addresses.

#### Scenario: Check balance for address
- **WHEN** client requests GET /api/v1/payments/usdc/balance?address={walletAddress}
- **THEN** system SHALL query Base Sepolia USDC contract using USDCClient.getBalance()
- **THEN** system SHALL return JSON response with balance amount in USDC units (6 decimals)

#### Scenario: Zero balance returns successfully
- **WHEN** wallet address has never received USDC
- **THEN** system SHALL return 200 OK with balance=0

### Requirement: System SHALL generate approval transaction data
The system SHALL provide API endpoint to generate unsigned USDC approval transaction data for frontend wallet signing.

#### Scenario: Generate approval transaction for specific amount
- **WHEN** client requests POST /api/v1/payments/approve with body {amount: 1000, spender: bountyPoolAddress}
- **THEN** system SHALL generate unsigned transaction calling USDC.approve(spender, amount) on Base Sepolia
- **THEN** system SHALL return transaction object with to, data, value, chainId, gasLimit fields

#### Scenario: Approval amount validated
- **WHEN** client requests approval with amount <= 0
- **THEN** system SHALL return 400 Bad Request with error message "Amount must be greater than zero"

#### Scenario: Approval transaction includes gas estimate
- **WHEN** system generates approval transaction
- **THEN** response SHALL include estimated gas limit for the approval transaction

### Requirement: Frontend SHALL display approval status before deposit
The frontend USDC approval component SHALL check current allowance and display approval status to user before enabling deposit functionality.

#### Scenario: Insufficient allowance shows approval UI
- **WHEN** protocol owner views bounty pool deposit page
- **THEN** frontend SHALL query current USDC allowance for user's wallet
- **THEN** IF allowance < desired deposit amount, frontend SHALL display "Approve USDC" button with requested amount
- **THEN** frontend SHALL disable "Deposit" button until allowance is sufficient

#### Scenario: Sufficient allowance enables deposit
- **WHEN** protocol owner has approved USDC allowance >= desired deposit amount
- **THEN** frontend SHALL display "Approved: {amount} USDC" status indicator
- **THEN** frontend SHALL enable "Deposit" button

#### Scenario: Approval amount pre-filled with deposit amount
- **WHEN** user clicks "Approve USDC" button
- **THEN** approval modal SHALL pre-fill approval amount with intended deposit amount

### Requirement: Frontend SHALL integrate with wagmi for wallet signing
The frontend SHALL use wagmi's wallet signing capabilities to submit approval transactions without exposing private keys to backend.

#### Scenario: User signs approval transaction
- **WHEN** user clicks "Approve" in approval modal
- **THEN** frontend SHALL fetch approval transaction data from backend API
- **THEN** frontend SHALL use wagmi's signTransaction or sendTransaction to prompt user's wallet for signature
- **THEN** frontend SHALL submit signed transaction to Base Sepolia network

#### Scenario: User rejects approval transaction
- **WHEN** user rejects approval signature request in wallet
- **THEN** frontend SHALL display error message "Approval cancelled by user"
- **THEN** frontend SHALL keep "Approve USDC" button enabled for retry

#### Scenario: Approval transaction fails on-chain
- **WHEN** approval transaction reverts on Base Sepolia
- **THEN** frontend SHALL display error message with revert reason
- **THEN** frontend SHALL allow user to retry approval

### Requirement: Frontend SHALL poll for approval confirmation
The frontend SHALL monitor blockchain for approval transaction confirmation and update UI accordingly.

#### Scenario: Approval confirmation detected
- **WHEN** approval transaction is submitted to blockchain
- **THEN** frontend SHALL poll Base Sepolia every 2 seconds for transaction confirmation
- **THEN** WHEN transaction has 1 confirmation, frontend SHALL update allowance display and enable deposit button

#### Scenario: Approval polling timeout
- **WHEN** approval transaction not confirmed within 60 seconds
- **THEN** frontend SHALL display warning "Approval taking longer than expected" with Basescan link
- **THEN** frontend SHALL continue polling for up to 5 minutes total

### Requirement: System SHALL validate spender address
The approval API SHALL verify that the spender address is a valid BountyPool contract address.

#### Scenario: Valid BountyPool address accepted
- **WHEN** client requests approval with spender matching deployed BountyPool address
- **THEN** system SHALL generate approval transaction successfully

#### Scenario: Invalid spender address rejected
- **WHEN** client requests approval with spender address not matching any BountyPool
- **THEN** system SHALL return 400 Bad Request with error "Invalid BountyPool address"

### Requirement: Frontend SHALL never request unlimited approval
The frontend SHALL always request specific approval amounts and SHALL NOT default to maximum uint256 allowance.

#### Scenario: Approval amount equals deposit amount
- **WHEN** user approves USDC for bounty pool deposit
- **THEN** approval amount SHALL equal exactly the intended deposit amount

#### Scenario: No "approve maximum" option provided
- **WHEN** user views approval modal
- **THEN** UI SHALL NOT include option to approve unlimited (max uint256) allowance

### Requirement: Approval flow SHALL handle approval updates
The system SHALL support updating existing USDC approvals to new amounts.

#### Scenario: Increase existing approval
- **WHEN** user has existing approval of 500 USDC and wants to deposit 1000 USDC
- **THEN** frontend SHALL display current approval (500) and required approval (1000)
- **THEN** user SHALL be able to approve additional 500 USDC or approve full 1000 USDC

#### Scenario: Decrease approval not required
- **WHEN** user has existing approval of 1000 USDC and wants to deposit 500 USDC
- **THEN** frontend SHALL skip approval flow and directly enable deposit button
