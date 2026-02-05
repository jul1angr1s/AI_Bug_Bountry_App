import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MaterialIcon } from '../components/shared/MaterialIcon';
import { GradientButton } from '../components/shared/GradientButton';
import { GlowCard } from '../components/shared/GlowCard';
import ProtocolForm from '../components/protocols/ProtocolForm';
import { createProtocol, type CreateProtocolRequest } from '../lib/api';
import { logDiagnostics } from '../lib/diagnostics';
import { useAuth } from '../lib/auth';

export default function ProtocolRegistration() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<Partial<CreateProtocolRequest> | undefined>(undefined);

  // Run diagnostics on mount to help debug issues
  useEffect(() => {
    if (import.meta.env.DEV) {
      logDiagnostics().catch(console.error);
    }
  }, []);

  const handleAutofill = () => {
    if (!user?.address) {
      toast.error('Wallet Required', {
        description: 'Please connect your wallet first to use the autofill feature.',
        duration: 3000,
      });
      return;
    }

    setInitialValues({
      githubUrl: 'https://github.com/Cyfrin/2023-11-Thunder-Loan',
      branch: 'main',
      contractPath: 'src/protocol/ThunderLoan.sol',
      contractName: 'ThunderLoan',
      ownerAddress: user.address,
    });

    toast.success('Form autofilled', {
      description: 'ThunderLoan example data has been loaded into the form.',
      duration: 2000,
    });
  };

  const handleSubmit = async (data: CreateProtocolRequest) => {
    // Check authentication before submitting
    if (!user) {
      const authError = 'Please connect your wallet to register a protocol.';
      setError(authError);
      toast.error('Authentication Required', {
        description: authError,
        duration: 5000,
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await createProtocol(data);

      // Show success toast
      toast.success('Protocol registered successfully!', {
        description: `Your protocol is now being analyzed by our Protocol Agent. You'll be notified when analysis is complete.`,
        duration: 5000,
      });

      // Navigate to protocols list after short delay
      setTimeout(() => {
        navigate('/protocols');
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register protocol';
      setError(errorMessage);
      toast.error('Registration failed', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1723] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <MaterialIcon name="arrow_back" className="text-lg" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
              <MaterialIcon name="shield" className="text-4xl text-purple-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white font-['Space_Grotesk']">Register Protocol</h1>
              <p className="text-gray-400 mt-2 text-base">
                Add your smart contract protocol to our automated bug bounty system
              </p>
            </div>
          </div>
        </div>

        {/* Authentication Warning */}
        {!authLoading && !user && (
          <div className="mb-6 p-5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <div className="flex gap-4">
              <MaterialIcon name="account_balance_wallet" className="text-2xl text-yellow-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-400 mb-2 text-base">Wallet Connection Required</p>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Please connect your wallet using the "Connect Wallet" button at the bottom left
                  to register a protocol. You must be authenticated to submit protocol registrations.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="mb-6 p-5 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="flex gap-4">
            <MaterialIcon name="info" className="text-2xl text-blue-400 flex-shrink-0" />
            <div className="text-gray-300">
              <p className="font-semibold text-white mb-3 text-base">What happens next?</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-400 text-sm">
                <li>Our Protocol Agent will clone and verify your repository</li>
                <li>Smart contracts will be compiled and analyzed for complexity</li>
                <li>A risk score will be calculated based on code patterns</li>
                <li>Automated scanning will begin once analysis is complete</li>
              </ol>
              <div className="mt-3 flex items-center gap-2">
                <MaterialIcon name="schedule" className="text-lg text-blue-400" />
                <span className="text-sm text-gray-400">
                  Expected time: <span className="text-white font-semibold">~60 seconds</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-5 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex gap-4">
              <MaterialIcon name="error" className="text-2xl text-red-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-400 mb-2 text-base">Registration Error</p>
                <p className="text-gray-300 text-sm leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Card */}
        <GlowCard glowColor="purple" className="bg-[#162030] border-[#2f466a] p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <MaterialIcon name="description" className="text-2xl text-purple-400" />
              <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">Protocol Details</h2>
            </div>
            <GradientButton
              variant="secondary"
              onClick={handleAutofill}
              disabled={isSubmitting || !user}
              className="px-4 py-2"
            >
              <span className="flex items-center gap-2">
                <MaterialIcon name="bolt" className="text-base" />
                Try with ThunderLoan Example
              </span>
            </GradientButton>
          </div>
          <ProtocolForm onSubmit={handleSubmit} isSubmitting={isSubmitting} initialValues={initialValues} />
        </GlowCard>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-[#162030] border border-[#2f466a] rounded-xl">
          <div className="flex items-center gap-3 mb-5">
            <MaterialIcon name="help" className="text-2xl text-blue-400" />
            <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">Need Help?</h3>
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex items-start gap-2 mb-2">
                <MaterialIcon name="folder_open" className="text-lg text-purple-400 mt-0.5" />
                <p className="font-semibold text-gray-200 text-sm">Where do I find my contract path?</p>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed ml-7">
                Navigate to your GitHub repository and locate your main Solidity contract file.
                Copy the path from the repository root (e.g., <code className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">src/MyContract.sol</code>).
              </p>
            </div>
            <div>
              <div className="flex items-start gap-2 mb-2">
                <MaterialIcon name="person" className="text-lg text-cyan-400 mt-0.5" />
                <p className="font-semibold text-gray-200 text-sm">What is an Owner Address?</p>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed ml-7">
                This is your wallet address that owns the protocol. It will be used to manage
                the protocol and verify on-chain registration.
              </p>
            </div>
            <div>
              <div className="flex items-start gap-2 mb-2">
                <MaterialIcon name="lock" className="text-lg text-yellow-400 mt-0.5" />
                <p className="font-semibold text-gray-200 text-sm">Can I register private repositories?</p>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed ml-7">
                Currently, only public GitHub repositories are supported. Make sure your repository
                is publicly accessible before registering.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
