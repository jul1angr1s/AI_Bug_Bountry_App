import { supabase } from './supabase';
import { checkBackendHealth } from './api';

/**
 * Diagnostic utility to check system health
 */
export async function runDiagnostics(): Promise<{
  supabase: {
    initialized: boolean;
    url: string | null;
    hasSession: boolean;
    error?: string;
  };
  backend: {
    healthy: boolean;
    cors: boolean;
    error?: string;
  };
  environment: {
    apiUrl: string;
    supabaseUrl: string | undefined;
    hasSupabaseKey: boolean;
  };
}> {
  const diagnostics = {
    supabase: {
      initialized: false,
      url: null as string | null,
      hasSession: false,
      error: undefined as string | undefined,
    },
    backend: {
      healthy: false,
      cors: false,
      error: undefined as string | undefined,
    },
    environment: {
      apiUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      hasSupabaseKey: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
    },
  };

  // Check Supabase
  try {
    if (!supabase) {
      diagnostics.supabase.error = 'Supabase client is not initialized';
    } else {
      diagnostics.supabase.initialized = true;
      diagnostics.supabase.url = import.meta.env.VITE_SUPABASE_URL || null;

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        diagnostics.supabase.error = error.message;
      } else if (data?.session) {
        diagnostics.supabase.hasSession = true;
      }
    }
  } catch (error) {
    diagnostics.supabase.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Check Backend
  try {
    const health = await checkBackendHealth();
    diagnostics.backend = {
      healthy: health.healthy,
      cors: health.cors,
      error: health.error,
    };
  } catch (error) {
    diagnostics.backend.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return diagnostics;
}

/**
 * Log diagnostics to console in a formatted way
 */
export async function logDiagnostics(): Promise<void> {
  console.group('🔍 System Diagnostics');

  const diagnostics = await runDiagnostics();

  console.group('📦 Environment');
  console.log('API URL:', diagnostics.environment.apiUrl);
  console.log('Supabase URL:', diagnostics.environment.supabaseUrl || 'NOT SET');
  console.log('Supabase Key:', diagnostics.environment.hasSupabaseKey ? 'SET' : 'NOT SET');
  console.groupEnd();

  console.group('🔐 Supabase');
  console.log('Initialized:', diagnostics.supabase.initialized);
  console.log('URL:', diagnostics.supabase.url || 'NOT SET');
  console.log('Has Session:', diagnostics.supabase.hasSession);
  if (diagnostics.supabase.error) {
    console.error('Error:', diagnostics.supabase.error);
  }
  console.groupEnd();

  console.group('🖥️  Backend');
  console.log('Healthy:', diagnostics.backend.healthy);
  console.log('CORS:', diagnostics.backend.cors);
  if (diagnostics.backend.error) {
    console.error('Error:', diagnostics.backend.error);
  }
  console.groupEnd();

  console.groupEnd();
}
