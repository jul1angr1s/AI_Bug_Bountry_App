import { supabase } from './supabase';

/**
 * Sync Supabase JWT token to cookies for SSE authentication
 *
 * EventSource API cannot send custom headers (like Authorization),
 * so we sync the JWT token to a cookie that will be automatically
 * sent with SSE requests.
 *
 * Security considerations:
 * - Cookie is NOT HttpOnly (needs to be set from JavaScript)
 * - SameSite=Lax prevents CSRF attacks
 * - Secure flag enabled in production (HTTPS)
 * - Cookie cleared on logout
 */
export async function syncAuthCookie(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      // Set cookie for SSE authentication
      const secure = window.location.protocol === 'https:';
      const maxAge = 60 * 60 * 24; // 24 hours (matches typical JWT expiration)

      document.cookie = `auth_token=${session.access_token}; path=/; SameSite=Lax; max-age=${maxAge}${secure ? '; Secure' : ''}`;

      console.log('[Auth] JWT token synced to cookie for SSE');
    } else {
      // Clear cookie on logout
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      console.log('[Auth] Auth cookie cleared');
    }
  } catch (error) {
    // Ignore AbortError from React Strict Mode or navigation
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[Auth] Cookie sync aborted (expected in dev mode)');
      return;
    }
    console.error('[Auth] Failed to sync auth cookie:', error);
  }
}

/**
 * Manually clear the auth cookie
 * Useful for logout flows
 */
export function clearAuthCookie(): void {
  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  console.log('[Auth] Auth cookie cleared manually');
}
