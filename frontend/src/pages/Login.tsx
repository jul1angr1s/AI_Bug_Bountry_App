import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Loader2, Wallet, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { user, loading: authLoading, signIn } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const returnUrl = searchParams.get('returnUrl') || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      navigate(returnUrl, { replace: true });
    }
  }, [user, authLoading, navigate, returnUrl]);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      // Sign in and get the returned user
      const authenticatedUser = await signIn();

      if (authenticatedUser) {
        console.log('Navigation: User authenticated, navigating to:', returnUrl);
        toast.success('Successfully authenticated');
        // Navigate directly - don't wait for state propagation
        navigate(returnUrl);
      } else {
        throw new Error('Authentication succeeded but user data not returned');
      }
    } catch (err: any) {
      console.error('Login error:', err);

      // Error handling by type
      if (err.message?.includes('User rejected') || err.message?.includes('rejected')) {
        setError('Connection request was rejected. Please try again.');
      } else if (err.message?.includes('No Web3') || err.message?.includes('No provider')) {
        setError('No Web3 wallet detected. Please install MetaMask.');
      } else if (err.message?.includes('network') || err.message?.includes('Network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to connect. Please try again.');
      }
    } finally {
      setConnecting(false);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0E1A] via-[#0F1421] to-[#1a1f2e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E1A] via-[#0F1421] to-[#1a1f2e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-12 shadow-2xl">
          {/* Logo/Branding */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Shield className="w-10 h-10 text-blue-500" />
              <h1 className="text-3xl font-bold text-white">Thunder Security</h1>
            </div>
            <p className="text-gray-400 text-sm">
              Connect your wallet to continue
            </p>
          </div>

          {/* Features */}
          <div className="mb-8 space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Zap className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>AI-powered vulnerability detection</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>Secure wallet authentication</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Wallet className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>Automated bounty payments</span>
            </div>
          </div>

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={connecting}
            className={`
              w-full py-4 px-6 rounded-lg font-semibold text-white
              bg-gradient-to-r from-blue-500 to-blue-600
              hover:from-blue-600 hover:to-blue-700
              transition-all duration-200
              flex items-center justify-center gap-3
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg hover:shadow-blue-500/50
            `}
          >
            {connecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                <span>Connect Wallet</span>
              </>
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm text-center mb-3">{error}</p>
              <button
                onClick={handleConnect}
                className="w-full py-2 px-4 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              Don't have a wallet?{' '}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Install MetaMask
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-600">
            Secured by Ethereum • Sign-In with Ethereum (SIWE)
          </p>
        </div>
      </div>
    </div>
  );
}
