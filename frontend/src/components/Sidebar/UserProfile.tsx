import { User, Wallet, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useState } from 'react';

export default function UserProfile() {
  const { user, signIn, signOut, loading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signIn();
    } catch (error) {
      console.error('Sign in failed:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to sign in. Please try again.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 border-t border-navy-900">
        <div className="w-10 h-10 rounded-full bg-navy-900 animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-navy-900 rounded animate-pulse mb-1" />
          <div className="h-3 bg-navy-900 rounded animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 border-t border-navy-900">
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="sign-in-button"
        >
          <Wallet className="w-4 h-4" />
          {isSigningIn ? 'Connecting...' : 'Connect Wallet'}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          Sign in with Ethereum
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-navy-900">
      <div className="flex items-center gap-3 p-4">
        <div
          className="w-10 h-10 rounded-full bg-navy-900 flex items-center justify-center"
          data-testid="user-icon"
        >
          <User className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {user.role || 'User'}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {truncateAddress(user.wallet)}
          </p>
        </div>
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-navy-900 hover:bg-navy-800 text-gray-300 hover:text-white rounded transition-colors text-sm"
          data-testid="sign-out-button"
        >
          <LogOut className="w-3 h-3" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
