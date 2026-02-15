import { loadBackendAuthSession } from './backend-auth';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

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
export async function syncAuthCookie(accessToken?: string): Promise<void> {
  try {
    const backendSession = loadBackendAuthSession();
    const token = accessToken || backendSession?.access_token;

    if (!token) {
      await clearAuthCookie();
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/session-cookie`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to sync session cookie: ${response.status} ${response.statusText}`);
    }

    console.log('[Auth] Backend auth cookie synced');
  } catch (error) {
    console.error('[Auth] Failed to sync auth cookie:', error);
  }
}

/**
 * Manually clear the auth cookie
 * Useful for logout flows
 */
export async function clearAuthCookie(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/auth/session-cookie`, {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch (error) {
    console.warn('[Auth] Failed to clear backend auth cookie:', error);
  }
}
