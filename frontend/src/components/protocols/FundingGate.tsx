import React, { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseUnits, keccak256, toHex } from 'viem';
import { cn, getExplorerTxUrl } from '@/lib/utils';
import { MaterialIcon } from '../shared/MaterialIcon';
import { USDCApprovalFlow } from '../Payment/USDCApprovalFlow';
import {
  verifyProtocolFunding,
  recordFundingTransaction,
  type FundingState,
} from '@/lib/api';

// Base Sepolia chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

/**
 * USDC and BountyPool configuration (Base Sepolia)
 */
const USDC_CONFIG = {
  address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
  decimals: 6,
};

const BOUNTY_POOL_CONFIG = {
  address: '0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0' as `0x${string}`,
};

/**
 * BountyPool ABI - depositBounty function
 */
const BOUNTY_POOL_ABI = [
  {
    name: 'depositBounty',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'protocolId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

/**
 * FundingGate Component Props
 */
export interface FundingGateProps {
  protocolId: string;
  onChainProtocolId: string | null;
  bountyPoolAmount: number;
  minimumBountyRequired: number;
  currentFundingState: FundingState | null;
  onFundingComplete: () => void;
}

/**
 * Step type for the funding wizard
 */
type FundingStep = 'approve' | 'fund' | 'verify';

/**
 * FundingGate Component
 *
 * Three-step wizard for funding a protocol's bounty pool:
 * 1. Approve USDC - Get allowance for BountyPool contract
 * 2. Fund Protocol - Call depositBounty() on BountyPool
 * 3. Verify Funding - Check on-chain balance matches requested amount
 */
export const FundingGate: React.FC<FundingGateProps> = ({
  protocolId,
  onChainProtocolId,
  bountyPoolAmount,
  minimumBountyRequired,
  currentFundingState,
  onFundingComplete,
}) => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const isCorrectNetwork = chainId === BASE_SEPOLIA_CHAIN_ID;
  const { writeContract, data: txHash, error: writeError, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [currentStep, setCurrentStep] = useState<FundingStep>('approve');
  const [isApproved, setIsApproved] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [fundingState, setFundingState] = useState<FundingState | null>(currentFundingState);
  const [onChainBalance, setOnChainBalance] = useState<number>(0);

  // Editable deposit amount - user can change this
  const [depositAmount, setDepositAmount] = useState<number>(bountyPoolAmount || minimumBountyRequired);
  const [amountError, setAmountError] = useState<string | null>(null);
  const depositAmountStr = depositAmount.toString();

  // Handle deposit amount change
  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setDepositAmount(numValue);

    if (numValue < minimumBountyRequired) {
      setAmountError(`Minimum deposit is ${minimumBountyRequired} USDC`);
    } else {
      setAmountError(null);
    }

    // Reset approval if amount changes (need to re-approve for new amount)
    if (isApproved && currentStep !== 'approve') {
      setIsApproved(false);
      setCurrentStep('approve');
    }
  };

  // Derive on-chain protocol ID if not provided
  const effectiveProtocolId = onChainProtocolId || (protocolId ? keccak256(toHex(protocolId)) : null);

  /**
   * Handle USDC approval completion
   */
  const handleApprovalComplete = useCallback(() => {
    setIsApproved(true);
    setCurrentStep('fund');
  }, []);

  // Track deposit error state
  const [depositError, setDepositError] = useState<string | null>(null);

  /**
   * Handle deposit transaction
   */
  const handleDeposit = useCallback(async () => {
    if (!effectiveProtocolId || !isConnected) return;

    setDepositError(null);

    try {
      const amountInWei = parseUnits(depositAmountStr, USDC_CONFIG.decimals);

      console.log('[FundingGate] Depositing:', {
        protocolId: effectiveProtocolId,
        amount: depositAmountStr,
        amountInWei: amountInWei.toString(),
        bountyPoolAddress: BOUNTY_POOL_CONFIG.address,
      });

      writeContract({
        address: BOUNTY_POOL_CONFIG.address,
        abi: BOUNTY_POOL_ABI,
        functionName: 'depositBounty',
        args: [effectiveProtocolId as `0x${string}`, amountInWei],
        gas: BigInt(300_000),
      });
    } catch (error) {
      console.error('[FundingGate] Deposit error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setDepositError(errorMsg);
    }
  }, [effectiveProtocolId, depositAmountStr, isConnected, writeContract]);

  /**
   * Handle deposit confirmation and move to verify step
   */
  useEffect(() => {
    if (isConfirmed && txHash) {
      // Record transaction in backend
      recordFundingTransaction(protocolId, txHash).catch(console.error);
      setCurrentStep('verify');
    }
  }, [isConfirmed, txHash, protocolId]);

  /**
   * Handle verification
   */
  const handleVerify = useCallback(async () => {
    setIsVerifying(true);
    setVerifyError(null);

    try {
      const result = await verifyProtocolFunding(protocolId);
      setFundingState(result.fundingState);
      setOnChainBalance(result.onChainBalance);

      if (result.canRequestScan) {
        onFundingComplete();
      } else {
        setVerifyError(result.message);
      }
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  }, [protocolId, onFundingComplete]);

  /**
   * Get step status for the progress indicator
   */
  const getStepStatus = (step: FundingStep) => {
    const steps: FundingStep[] = ['approve', 'fund', 'verify'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);

    if (step === 'approve' && isApproved) return 'completed';
    if (step === 'fund' && currentStep === 'verify') return 'completed';
    if (step === 'verify' && fundingState === 'FUNDED') return 'completed';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  // If already funded, show success state
  if (currentFundingState === 'FUNDED') {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-full">
            <MaterialIcon name="check_circle" className="text-2xl text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-400">Protocol Funded</h3>
            <p className="text-sm text-green-300/70">
              Your bounty pool is funded and ready for scanning.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-6 space-y-6">
      {/* Network Warning */}
      {!isCorrectNetwork && isConnected && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <MaterialIcon name="warning" className="text-xl text-orange-400" />
            <div>
              <p className="text-sm font-medium text-orange-400">Wrong Network</p>
              <p className="text-xs text-orange-300/70">
                Please switch to Base Sepolia in MetaMask (Chain ID: 84532)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-yellow-500/20 rounded-full">
          <MaterialIcon name="account_balance_wallet" className="text-2xl text-yellow-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Fund Your Bounty Pool</h3>
          <p className="text-sm text-gray-400">
            Deposit USDC to enable vulnerability scanning
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {(['approve', 'fund', 'verify'] as FundingStep[]).map((step, index) => {
          const status = getStepStatus(step);
          const labels = {
            approve: 'Approve USDC',
            fund: 'Fund Protocol',
            verify: 'Verify Funding',
          };

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    status === 'completed' && 'bg-green-500 text-white',
                    status === 'active' && 'bg-purple-500 text-white',
                    status === 'pending' && 'bg-gray-700 text-gray-400'
                  )}
                >
                  {status === 'completed' ? (
                    <MaterialIcon name="check" className="text-lg" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-2',
                    status === 'active' ? 'text-purple-400' : 'text-gray-500'
                  )}
                >
                  {labels[step]}
                </span>
              </div>
              {index < 2 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    getStepStatus(['approve', 'fund', 'verify'][index + 1] as FundingStep) !== 'pending'
                      ? 'bg-green-500'
                      : 'bg-gray-700'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Amount Info - Editable */}
      <div className="bg-[#0f1723] rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Deposit Amount</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              min={minimumBountyRequired}
              step="1"
              disabled={currentStep === 'verify'}
              className={cn(
                'w-24 px-3 py-1.5 text-right text-lg font-bold rounded-lg',
                'bg-[#1a1f2e] border transition-colors',
                amountError
                  ? 'border-red-500 text-red-400'
                  : 'border-gray-700 text-white focus:border-purple-500',
                currentStep === 'verify' && 'opacity-50 cursor-not-allowed'
              )}
            />
            <span className="text-lg font-bold text-gray-400">USDC</span>
          </div>
        </div>
        {amountError ? (
          <p className="text-xs text-red-400">{amountError}</p>
        ) : (
          <p className="text-xs text-gray-500">
            Minimum required: {minimumBountyRequired} USDC
          </p>
        )}
        {currentStep !== 'approve' && !amountError && (
          <p className="text-xs text-yellow-400">
            Changing the amount will require re-approval
          </p>
        )}
      </div>

      {/* Step Content */}
      <div className="space-y-4">
        {/* Step 1: Approve USDC */}
        {currentStep === 'approve' && (
          <>
            {!isCorrectNetwork ? (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <p className="text-sm text-orange-400">
                  Switch to Base Sepolia network in MetaMask to continue
                </p>
              </div>
            ) : amountError ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-sm text-red-400">
                  Please enter a valid deposit amount (minimum {minimumBountyRequired} USDC)
                </p>
              </div>
            ) : (
              <USDCApprovalFlow
                key={`approval-${depositAmountStr}`}
                depositAmount={depositAmountStr}
                bountyPoolAddress={BOUNTY_POOL_CONFIG.address}
                onApprovalComplete={handleApprovalComplete}
              />
            )}
          </>
        )}

        {/* Step 2: Fund Protocol */}
        {currentStep === 'fund' && (
          <div className="space-y-4">
            {(writeError || depositError) && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
                <p className="text-sm text-red-400">
                  {writeError?.message.includes('User rejected') || writeError?.message.includes('User denied')
                    ? 'Transaction cancelled by user'
                    : writeError?.message.includes('insufficient funds')
                    ? 'Insufficient ETH for gas fees. Make sure you have ETH on Base Sepolia.'
                    : writeError?.message.includes('exceeds allowance')
                    ? 'USDC approval insufficient. Please go back and re-approve.'
                    : writeError?.message.includes('gas limit')
                    ? 'Transaction gas limit exceeded. Please try again or contact support.'
                    : writeError?.message || depositError || 'Transaction failed'}
                </p>
                {writeError && !writeError.message.includes('User rejected') && (
                  <details className="text-xs text-red-300/70">
                    <summary className="cursor-pointer">Technical details</summary>
                    <pre className="mt-2 p-2 bg-black/30 rounded overflow-x-auto">
                      {writeError.message}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {isWritePending && (
              <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                <p className="text-sm text-blue-400">Waiting for signature...</p>
              </div>
            )}

            {isConfirming && txHash && (
              <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                <div>
                  <p className="text-sm text-blue-400">Confirming transaction...</p>
                  <a
                    href={getExplorerTxUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-300 underline"
                  >
                    View on Basescan
                  </a>
                </div>
              </div>
            )}

            {!isWritePending && !isConfirming && (
              <button
                onClick={handleDeposit}
                disabled={!isConnected || !effectiveProtocolId || !!amountError || !isCorrectNetwork}
                className={cn(
                  'w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                  isConnected && effectiveProtocolId && !amountError && isCorrectNetwork
                    ? 'bg-purple-500 hover:bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                )}
              >
                <MaterialIcon name="account_balance_wallet" className="text-lg" />
                {!isCorrectNetwork ? 'Switch to Base Sepolia' : `Deposit ${depositAmount} USDC`}
              </button>
            )}

            {!effectiveProtocolId && (
              <p className="text-xs text-yellow-400 text-center">
                Protocol is not registered on-chain yet. Please wait for registration to complete.
              </p>
            )}
          </div>
        )}

        {/* Step 3: Verify Funding */}
        {currentStep === 'verify' && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <MaterialIcon name="check_circle" className="text-xl text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-400">Deposit Successful</p>
                  <p className="text-xs text-green-300/70">
                    Transaction confirmed. Now verify your on-chain balance.
                  </p>
                </div>
              </div>
            </div>

            {verifyError && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-sm text-yellow-400">{verifyError}</p>
                <p className="text-xs text-yellow-300/70 mt-1">
                  On-chain balance: {onChainBalance} USDC
                </p>
              </div>
            )}

            {fundingState === 'FUNDED' ? (
              <>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-400">
                    Funding verified! You can now request vulnerability scanning.
                  </p>
                </div>
                <button
                  onClick={onFundingComplete}
                  className="w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white"
                >
                  <MaterialIcon name="radar" className="text-lg" />
                  Request Vulnerability Scanning
                </button>
              </>
            ) : (
              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className={cn(
                  'w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                  !isVerifying
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-400'
                )}
              >
                {isVerifying ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <MaterialIcon name="verified" className="text-lg" />
                    Verify On-Chain Balance
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500 text-center">
        {currentStep === 'approve' && 'Approve USDC spending to allow the BountyPool contract to receive your deposit.'}
        {currentStep === 'fund' && 'Sign the transaction to deposit USDC into your protocol\'s bounty pool.'}
        {currentStep === 'verify' && 'Verify your deposit was received on-chain before requesting scans.'}
      </p>
    </div>
  );
};

export default FundingGate;
