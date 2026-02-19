import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Loader2, Wallet, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { ParticleBackground } from '@/components/login/ParticleBackground';
import { OrbitalDiagram } from '@/components/login/OrbitalDiagram';
import { OnboardingModal } from '@/components/login/OnboardingModal';
import { TerminalText } from '@/components/login/TerminalText';

export default function Login() {
  const { user, loading: authLoading, signIn } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E1A] via-[#0F1421] to-[#1a1f2e] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated particle background */}
      <ParticleBackground />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 sm:gap-10 max-w-2xl w-full">
        {/* Headline */}
        <div className="text-center animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-heading text-white leading-tight">
            AI Agents Bug Bounty{' '}
            <span className="text-accent-cyan">Platform</span>
          </h1>
          <div className="mt-5">
            <TerminalText />
          </div>
        </div>

        {/* Orbital diagram */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <OrbitalDiagram />
        </div>

        {/* CTA buttons */}
        <div
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto animate-fade-in-up"
          style={{ animationDelay: '0.4s' }}
        >
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex-1 sm:flex-none py-4 px-8 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/30 cursor-pointer"
          >
            {connecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                <div className="text-left">
                  <div>Connect Wallet</div>
                  <div className="text-[10px] text-blue-200/60 font-normal">MetaMask / Base Sepolia</div>
                </div>
              </>
            )}
          </button>

          <button
            onClick={() => setShowOnboarding(true)}
            className="flex-1 sm:flex-none py-4 px-8 rounded-xl font-semibold text-accent-cyan border border-accent-cyan/30 hover:bg-accent-cyan/5 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Explore Platform</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full max-w-md p-4 bg-red-500/10 border border-red-500/50 rounded-lg animate-fade-in-up">
            <p className="text-red-400 text-sm text-center mb-3">{error}</p>
            <button
              onClick={handleConnect}
              className="w-full py-2 px-4 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Footer */}
        <div
          className="text-center space-y-2 animate-fade-in-up"
          style={{ animationDelay: '0.6s' }}
        >
          <p className="text-xs text-gray-600">
            Secured by Ethereum &bull; Sign-In with Ethereum (SIWE)
          </p>
          <p className="text-xs text-gray-600">
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
          <p className="text-xs text-gray-600">
            Built by{' '}
            <a
              href="https://github.com/jul1angr1s/AI_Bug_Bountry_App"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              jul1angr1s
            </a>
          </p>
        </div>
      </div>

      {/* Onboarding modal */}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </div>
  );
}
