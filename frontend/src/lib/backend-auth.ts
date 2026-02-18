const BACKEND_AUTH_STORAGE_KEY = 'thunder-security-backend-auth';
const LEGACY_STORAGE_KEY = BACKEND_AUTH_STORAGE_KEY;

export interface BackendAuthSession {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    wallet_address: string;
  };
}

export function saveBackendAuthSession(session: BackendAuthSession): void {
  sessionStorage.setItem(BACKEND_AUTH_STORAGE_KEY, JSON.stringify(session));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function loadBackendAuthSession(): BackendAuthSession | null {
  const raw = sessionStorage.getItem(BACKEND_AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as BackendAuthSession;
    if (!parsed.access_token || !parsed.user?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearBackendAuthSession(): void {
  sessionStorage.removeItem(BACKEND_AUTH_STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
