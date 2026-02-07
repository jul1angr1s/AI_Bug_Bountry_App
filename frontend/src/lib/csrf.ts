const CSRF_COOKIE_NAME = 'X-CSRF-Token';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Read CSRF token from cookie
 * The backend sets this cookie with httpOnly: false so we can read it
 */
function getCsrfTokenFromCookie(): string | null {
  const match = document.cookie.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Get CSRF token for mutation requests
 *
 * Implements double-submit cookie pattern:
 * 1. Backend sets X-CSRF-Token cookie
 * 2. Frontend reads cookie and sends same value as x-csrf-token header
 * 3. Backend validates cookie === header
 */
export async function getCsrfToken(): Promise<string> {
  // Try to read from cookie first
  let cookieToken = getCsrfTokenFromCookie();
  if (cookieToken) {
    return cookieToken;
  }

  // If no cookie exists, fetch from endpoint to trigger cookie creation
  const res = await fetch(`${API_BASE_URL}/api/v1/csrf-token`, {
    credentials: 'include', // Include cookies in request
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch CSRF token: ${res.status} ${res.statusText}`);
  }

  // After fetching, the backend should have set the cookie
  // Read it from the cookie (not from response body)
  cookieToken = getCsrfTokenFromCookie();
  if (!cookieToken) {
    throw new Error('CSRF cookie not set after fetching token');
  }

  return cookieToken;
}

/**
 * Clear cached CSRF token (no-op now since we read from cookie)
 * Kept for API compatibility
 */
export function clearCsrfToken(): void {
  // No-op: we always read fresh from cookie
}
