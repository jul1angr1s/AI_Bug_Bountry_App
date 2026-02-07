const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

let cachedToken: string | null = null;

/**
 * Fetch a CSRF token from the backend and cache it.
 * Token is sent as a header on all state-changing requests.
 */
export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const res = await fetch(`${API_BASE_URL}/api/v1/csrf-token`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch CSRF token');
  }

  const data = await res.json();
  cachedToken = data.csrfToken;
  return cachedToken!;
}

/**
 * Clear the cached CSRF token (e.g. on logout).
 */
export function clearCsrfToken(): void {
  cachedToken = null;
}
