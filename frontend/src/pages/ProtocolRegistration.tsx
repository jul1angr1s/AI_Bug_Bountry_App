import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import ProtocolForm from '../components/protocols/ProtocolForm';
import { createProtocol, type CreateProtocolRequest } from '../lib/api';
import { logDiagnostics } from '../lib/diagnostics';

export default function ProtocolRegistration() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Run diagnostics on mount to help debug issues
  useEffect(() => {
    if (import.meta.env.DEV) {
      logDiagnostics().catch(console.error);
    }
  }, []);

  const handleSubmit = async (data: CreateProtocolRequest) => {
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
    <div className="min-h-screen bg-[#0f1419] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Register Protocol</h1>
              <p className="text-gray-400 mt-1">
                Add your smart contract protocol to our automated bug bounty system
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300">
              <p className="font-medium text-white mb-1">What happens next?</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-400">
                <li>Our Protocol Agent will clone and verify your repository</li>
                <li>Smart contracts will be compiled and analyzed for complexity</li>
                <li>A risk score will be calculated based on code patterns</li>
                <li>Automated scanning will begin once analysis is complete</li>
              </ol>
              <p className="mt-2">
                Expected time: <span className="text-white font-medium">~60 seconds</span>
              </p>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-400 mb-1">Registration Error</p>
                <p className="text-gray-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Protocol Details</h2>
          <ProtocolForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-[#1a1f2e] border border-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Need Help?</h3>
          <div className="space-y-3 text-sm text-gray-400">
            <div>
              <p className="font-medium text-gray-300">Where do I find my contract path?</p>
              <p>
                Navigate to your GitHub repository and locate your main Solidity contract file.
                Copy the path from the repository root (e.g., <code className="text-purple-400">src/MyContract.sol</code>).
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-300">What is an Owner Address?</p>
              <p>
                This is your wallet address that owns the protocol. It will be used to manage
                the protocol and verify on-chain registration.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-300">Can I register private repositories?</p>
              <p>
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
