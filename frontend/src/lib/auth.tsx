import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { syncAuthCookie, clearAuthCookie } from './auth-cookies';
import {
  saveBackendAuthSession,
  loadBackendAuthSession,
  clearBackendAuthSession,
} from './backend-auth';
import {
  connectWallet,
  createSiweMessage,
  signSiweMessage,
  onAccountsChanged,
} from './siwe';

interface User {
  id: string;
  wallet: string;
  role?: string;
  email?: string;
}

interface SessionUser {
  id: string;
  email?: string;
  user_metadata?: {
    wallet_address?: string;
  };
}

interface SessionLike {
  access_token: string;
  refresh_token?: string;
  user: SessionUser;
  expires_at?: number;
}

interface AuthContextType {
  user: User | null;
  session: SessionLike | null;
  loading: boolean;
  signIn: () => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapBackendUserToUser(backendUser: { id: string; wallet_address: string }): User {
  return {
    id: backendUser.id,
    wallet: backendUser.wallet_address,
    role: 'Security Ops',
    email: `${backendUser.wallet_address}@wallet.local`,
  };
}

function toSessionLike(data: {
  access_token: string;
  refresh_token?: string;
  user: { id: string; wallet_address: string };
}): SessionLike {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: {
      id: data.user.id,
      email: `${data.user.wallet_address}@wallet.local`,
      user_metadata: {
        wallet_address: data.user.wallet_address,
      },
    },
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<SessionLike | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const backendSession = loadBackendAuthSession();
        if (!isMounted) return;

        if (backendSession) {
          const mappedUser = mapBackendUserToUser(backendSession.user);
          setSession(toSessionLike(backendSession));
          setUser(mappedUser);
          await syncAuthCookie(backendSession.access_token);
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const cleanupAccounts = onAccountsChanged(async (accounts) => {
      const currentUser = userRef.current;
      if (accounts.length === 0) {
        await signOut();
      } else if (currentUser && accounts[0].toLowerCase() !== currentUser.wallet.toLowerCase()) {
        await signOut();
        console.log('Wallet account changed. Please sign in again.');
      }
    });

    return () => {
      isMounted = false;
      cleanupAccounts();
    };
  }, []);

  const signIn = async () => {
    try {
      setLoading(true);

      const walletAddress = await connectWallet();
      const message = await createSiweMessage(
        walletAddress,
        'Sign in to Thunder Security Bug Bounty Platform'
      );
      const signature = await signSiweMessage(message);

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const verifyResponse = await fetch(`${API_BASE_URL}/api/v1/auth/siwe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          signature,
          walletAddress,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'SIWE verification failed');
      }

      const { access_token, refresh_token, user: backendUser } = await verifyResponse.json();
      if (!access_token || !backendUser?.id || !backendUser?.wallet_address) {
        throw new Error('Invalid authentication response');
      }

      const nextSession = {
        access_token,
        refresh_token,
        user: {
          id: backendUser.id,
          wallet_address: backendUser.wallet_address,
        },
      };

      saveBackendAuthSession(nextSession);
      await syncAuthCookie(access_token);

      const mappedUser = mapBackendUserToUser(nextSession.user);
      setSession(toSessionLike(nextSession));
      setUser(mappedUser);

      return mappedUser;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      clearBackendAuthSession();
      await clearAuthCookie();
      setSession(null);
      setUser(null);
      console.log('Successfully signed out');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

