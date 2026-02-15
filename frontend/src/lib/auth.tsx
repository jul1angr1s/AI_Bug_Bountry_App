import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { syncAuthCookie, clearAuthCookie } from './auth-cookies';
import {
  connectWallet,
  createSiweMessage,
  signSiweMessage,
  onAccountsChanged,
} from './siwe';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  wallet: string;
  role?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: () => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    // Check for existing Supabase session
    const initAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (isMounted && currentSession) {
          setSession(currentSession);
          setUser(mapSupabaseUserToUser(currentSession.user));
          // Sync auth cookie for SSE authentication
          await syncAuthCookie();
        }
      } catch (error) {
        // Ignore AbortError from React Strict Mode double-rendering
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[Auth] Initialization aborted (React Strict Mode)');
          return;
        }
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event);

      if (newSession) {
        setSession(newSession);
        setUser(mapSupabaseUserToUser(newSession.user));
        // Sync auth cookie for SSE authentication (fire-and-forget)
        syncAuthCookie();
      } else {
        setSession(null);
        setUser(null);
        // Clear auth cookie on sign out
        clearAuthCookie();
      }

      setLoading(false);
    });

    // Listen for wallet account changes
    const cleanup = onAccountsChanged(async (accounts) => {
      const currentUser = userRef.current;
      if (accounts.length === 0) {
        // Wallet disconnected
        await signOut();
      } else if (currentUser && accounts[0].toLowerCase() !== currentUser.wallet.toLowerCase()) {
        // Account changed - sign out and prompt re-authentication
        await signOut();
        console.log('Wallet account changed. Please sign in again.');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      cleanup();
    };
  }, []); // Empty dependencies - only run once on mount

  /**
   * Sign in with Ethereum (SIWE)
   */
  const signIn = async () => {
    try {
      setLoading(true);

      // Step 1: Connect wallet
      const walletAddress = await connectWallet();
      console.log('Connected wallet:', walletAddress);

      // Step 2: Create SIWE message
      const message = await createSiweMessage(
        walletAddress,
        'Sign in to Thunder Security Bug Bounty Platform'
      );

      // Step 3: Sign the message with wallet
      const signature = await signSiweMessage(message);
      console.log('Message signed successfully');

      // Step 4: Verify SIWE signature on backend
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
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'SIWE verification failed');
      }

      const { access_token, refresh_token } = await verifyResponse.json();
      console.log('SIWE verification successful');

      // Step 5: Set session using the verified tokens
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        throw new Error(`Failed to establish authenticated session: ${error.message}`);
      }

      if (!data.session?.user) {
        throw new Error('Failed to establish authenticated session');
      }

      const mappedUser = mapSupabaseUserToUser(data.session.user);
      setSession(data.session);
      setUser(mappedUser);

      // Sync auth cookie for SSE authentication
      await syncAuthCookie();

      console.log('Successfully signed in with SIWE');
      console.log('User set:', mappedUser);

      setLoading(false);
      return mappedUser;
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
      throw error;
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setSession(null);
      setUser(null);
      // Clear auth cookie on sign out
      clearAuthCookie();
      console.log('Successfully signed out');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Map Supabase user to our User interface
   */
  const mapSupabaseUserToUser = (supabaseUser: SupabaseUser): User => {
    const walletAddress =
      supabaseUser.user_metadata?.wallet_address ||
      supabaseUser.email?.split('@')[0] ||
      'Unknown';

    return {
      id: supabaseUser.id,
      wallet: walletAddress,
      role: 'Security Ops', // Default role - can be fetched from database
      email: supabaseUser.email,
    };
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
