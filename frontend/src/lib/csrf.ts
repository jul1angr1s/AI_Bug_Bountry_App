const CSRF_COOKIE_NAME = 'X-CSRF-Token';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
let cachedCsrfToken: string | null = null;

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
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/csrf-token`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch CSRF token: ${res.status} ${res.statusText}`);
  }

  const data = await res.json().catch(() => ({}));
  const responseToken = data?.csrfToken;
  const cookieToken = getCsrfTokenFromCookie();
  const token = responseToken || cookieToken;

  if (!token) {
    throw new Error('Failed to obtain CSRF token from response');
  }

  cachedCsrfToken = token;
  return token;
}

/**
 * Clear cached CSRF token (no-op now since we read from cookie)
 * Kept for API compatibility
 */
export function clearCsrfToken(): void {
  cachedCsrfToken = null;
}
