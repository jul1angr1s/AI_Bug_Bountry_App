import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

/**
 * Supabase client instance
 * Configured for authentication and database access
 *
 * Note: flowType set to 'pkce' to avoid navigator.locks issues in React Strict Mode
 * detectSessionInUrl disabled in development to prevent double initialization
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disabled to avoid React Strict Mode issues
    flowType: 'implicit', // Avoid navigator.locks which conflicts with React Strict Mode
    storageKey: 'thunder-security-auth', // Custom key to avoid conflicts
  },
});
