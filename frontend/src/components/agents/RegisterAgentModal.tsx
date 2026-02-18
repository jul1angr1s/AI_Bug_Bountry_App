import { useState, useEffect, useCallback, useRef } from 'react';
import { X, UserPlus, Shield, ExternalLink, Wallet, AlertTriangle } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { getContractByName } from '../../lib/contracts';
import { registerAgent, syncAgentRegistration } from '../../lib/api';
import type { AgentIdentityType } from '../../types/dashboard';

const BASE_SEPOLIA_CHAIN_ID = 84532;
const BASESCAN_TX_URL = 'https://sepolia.basescan.org/tx/';

const AGENT_REGISTRY_ADDRESS = (
  getContractByName('AgentIdentityRegistry')?.address || ''
) as `0x${string}`;

const SELF_REGISTER_ABI = [
  {
    name: 'selfRegister',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentType', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const AGENT_TYPE_ENUM: Record<AgentIdentityType, number> = {
  RESEARCHER: 0,
  VALIDATOR: 1,
};

interface RegisterAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistrationComplete: () => void;
}

type RegistrationStep = 'form' | 'confirming' | 'syncing' | 'success';

export function RegisterAgentModal({ isOpen, onClose, onRegistrationComplete }: RegisterAgentModalProps) {
  const [agentType, setAgentType] = useState<AgentIdentityType>('RESEARCHER');
  const [registerOnChain, setRegisterOnChain] = useState(true);
  const [step, setStep] = useState<RegistrationStep>('form');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // DB-only flow: manual wallet input
  const [manualWallet, setManualWallet] = useState('');

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isCorrectNetwork = chainId === BASE_SEPOLIA_CHAIN_ID;

  const {
    writeContract,
    data: txHash,
    isPending: isTxPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Track whether we've already synced this tx to prevent double-sync
  const hasSynced = useRef(false);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && step === 'form') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, step]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAgentType('RESEARCHER');
      setRegisterOnChain(true);
      setStep('form');
      setError(null);
      setIsSubmitting(false);
      setManualWallet('');
      resetWrite();
      hasSynced.current = false;
    }
  }, [isOpen, resetWrite]);

  // Track tx lifecycle: pending -> confirming
  useEffect(() => {
    if (txHash && step === 'form') {
      setStep('confirming');
      setError(null);
    }
  }, [txHash, step]);

  // After tx confirms, sync with backend
  useEffect(() => {
    if (isConfirmed && txHash && address && !hasSynced.current) {
      hasSynced.current = true;
      setStep('syncing');
      syncWithRetry(txHash, address, agentType);
    }
  }, [isConfirmed, txHash, address, agentType]);

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      const msg = writeError.message;
      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        setError('Transaction rejected by wallet.');
      } else if (msg.includes('AgentAlreadyRegistered')) {
        setError('This wallet is already registered on-chain.');
      } else {
        setError(msg.length > 200 ? msg.slice(0, 200) + '...' : msg);
      }
      setStep('form');
    }
  }, [writeError]);

  const syncWithRetry = useCallback(async (hash: string, wallet: string, type: AgentIdentityType) => {
    const maxRetries = 3;
    const backoffMs = 2000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await syncAgentRegistration(hash, wallet, type);
        setStep('success');
        // Delay to show success state briefly, then complete
        setTimeout(() => {
          onRegistrationComplete();
        }, 1500);
        return;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes('NOT_REGISTERED_ONCHAIN') && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
          continue;
        }
        // Final failure
        setError(
          `NFT was minted (tx: ${hash.slice(0, 10)}...) but backend sync failed: ${errMsg}. ` +
          'Your agent will appear after the next system sync.'
        );
        setStep('form');
        return;
      }
    }
  }, [onRegistrationComplete]);

  // DB-only registration handler
  const handleDbOnlySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualWallet.trim()) {
      setError('Wallet address is required');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(manualWallet)) {
      setError('Invalid Ethereum address. Must start with 0x followed by 40 hex characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await registerAgent(manualWallet, agentType, false);
      onRegistrationComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register agent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // On-chain registration handler
  const handleOnChainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      setError('Please connect your wallet first.');
      return;
    }
    if (!isCorrectNetwork) {
      setError('Please switch your wallet to Base Sepolia.');
      return;
    }
    if (!AGENT_REGISTRY_ADDRESS) {
      setError('Agent registry contract address not configured.');
      return;
    }

    writeContract({
      address: AGENT_REGISTRY_ADDRESS,
      abi: SELF_REGISTER_ABI,
      functionName: 'selfRegister',
      args: [AGENT_TYPE_ENUM[agentType]],
    });
  };

  if (!isOpen) return null;

  const isProcessing = isTxPending || isConfirming || step === 'syncing';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && step === 'form') {
          onClose();
        }
      }}
    >
      <div className="bg-gray-900 w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-60"></div>

        {/* Close button */}
        {step === 'form' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer z-10 p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Content */}
        <div className="p-8">
          {/* Success state */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <Shield className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Agent Registered</h3>
              <p className="text-gray-400 text-sm">
                Your soulbound NFT has been minted and synced.
              </p>
              {txHash && (
                <a
                  href={`${BASESCAN_TX_URL}${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm mt-3"
                >
                  View on BaseScan <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Confirming / Syncing states */}
          {(step === 'confirming' || step === 'syncing') && (
            <div className="text-center py-8">
              <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <h3 className="text-lg font-bold text-white mb-1">
                {step === 'confirming' ? 'Confirming Transaction...' : 'Syncing with Backend...'}
              </h3>
              <p className="text-gray-400 text-sm mb-3">
                {step === 'confirming'
                  ? 'Waiting for on-chain confirmation.'
                  : 'Linking your NFT to your agent profile.'}
              </p>
              {txHash && (
                <a
                  href={`${BASESCAN_TX_URL}${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm"
                >
                  View on BaseScan <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Form state */}
          {step === 'form' && (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-500/10 rounded-full text-blue-400 border border-blue-500/20">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Register Agent</h3>
                  <p className="text-gray-400 text-sm">Add a new ERC-8004 agent identity</p>
                </div>
              </div>

              {/* Error display */}
              {error && (
                <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form
                onSubmit={registerOnChain ? handleOnChainSubmit : handleDbOnlySubmit}
                className="flex flex-col gap-5"
              >
                {/* Wallet Address - conditional on toggle */}
                {registerOnChain ? (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase font-semibold text-gray-400 tracking-wider">
                      Wallet Address
                    </label>
                    {isConnected && address ? (
                      <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                        <span className="font-mono text-sm text-white">{address}</span>
                      </div>
                    ) : (
                      <div className="px-4 py-3 bg-gray-800 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                        Connect your wallet to register on-chain.
                      </div>
                    )}
                    {isConnected && !isCorrectNetwork && (
                      <p className="text-yellow-400 text-xs">
                        Switch your wallet to Base Sepolia (chain ID {BASE_SEPOLIA_CHAIN_ID}).
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase font-semibold text-gray-400 tracking-wider">
                      Wallet Address
                    </label>
                    <input
                      type="text"
                      value={manualWallet}
                      onChange={(e) => {
                        setManualWallet(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-600 font-mono text-sm"
                      placeholder="0x..."
                    />
                    <p className="text-gray-500 text-xs">
                      The Ethereum address for this agent (0x + 40 hex characters)
                    </p>
                  </div>
                )}

                {/* Agent Type */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase font-semibold text-gray-400 tracking-wider">
                    Agent Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                        agentType === 'RESEARCHER'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="agentType"
                        value="RESEARCHER"
                        checked={agentType === 'RESEARCHER'}
                        onChange={() => setAgentType('RESEARCHER')}
                        className="sr-only"
                      />
                      <div
                        className={`size-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          agentType === 'RESEARCHER' ? 'border-blue-500' : 'border-gray-600'
                        }`}
                      >
                        {agentType === 'RESEARCHER' && (
                          <div className="size-2 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">Researcher</p>
                        <p className="text-xs text-gray-500">Finds vulnerabilities</p>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                        agentType === 'VALIDATOR'
                          ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="agentType"
                        value="VALIDATOR"
                        checked={agentType === 'VALIDATOR'}
                        onChange={() => setAgentType('VALIDATOR')}
                        className="sr-only"
                      />
                      <div
                        className={`size-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          agentType === 'VALIDATOR' ? 'border-purple-500' : 'border-gray-600'
                        }`}
                      >
                        {agentType === 'VALIDATOR' && (
                          <div className="size-2 rounded-full bg-purple-500"></div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">Validator</p>
                        <p className="text-xs text-gray-500">Reviews findings</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* On-Chain Registration Toggle */}
                <div className="flex flex-col gap-2">
                  <label
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer hover:border-gray-600 transition-all"
                    onClick={() => setRegisterOnChain(!registerOnChain)}
                  >
                    <div className="flex items-center gap-3">
                      <Shield className={`w-5 h-5 ${registerOnChain ? 'text-emerald-400' : 'text-gray-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-white">Register on blockchain (ERC-8004)</p>
                        <p className="text-xs text-gray-500">
                          {registerOnChain
                            ? 'Your wallet signs and pays gas for the NFT mint'
                            : 'Database-only registration (no NFT)'}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        registerOnChain ? 'bg-emerald-500' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                          registerOnChain ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      ></div>
                    </div>
                  </label>
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 px-4 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white text-center cursor-pointer font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing || isSubmitting || (registerOnChain && (!isConnected || !isCorrectNetwork))}
                    className="flex-1 py-3 px-4 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTxPending || isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {registerOnChain ? 'Sign in Wallet...' : 'Registering...'}
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        {registerOnChain ? 'Register On-Chain' : 'Register Agent'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
