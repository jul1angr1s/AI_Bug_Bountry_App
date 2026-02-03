import React, { createContext, useContext, useState, useEffect } from 'react';
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
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing Supabase session
    const initAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (currentSession) {
          setSession(currentSession);
          setUser(mapSupabaseUserToUser(currentSession.user));
          // Sync auth cookie for SSE authentication
          await syncAuthCookie();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
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
        // Sync auth cookie for SSE authentication
        await syncAuthCookie();
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
      const currentUser = user;
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
      subscription.unsubscribe();
      cleanup();
    };
  }, [user]);

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

      // Step 4: Authenticate with Supabase using the signed message
      // Note: This requires a Supabase Edge Function to verify the SIWE signature
      // For now, we'll use a simplified approach with user metadata
      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            wallet_address: walletAddress,
            siwe_message: message,
            siwe_signature: signature,
            signed_at: new Date().toISOString(),
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session && data.user) {
        setSession(data.session);
        setUser(mapSupabaseUserToUser(data.user));
        // Sync auth cookie for SSE authentication
        await syncAuthCookie();
        console.log('Successfully signed in with SIWE');
      }
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
