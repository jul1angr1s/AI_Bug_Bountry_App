const BACKEND_AUTH_STORAGE_KEY = 'thunder-security-backend-auth';

export interface BackendAuthSession {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    wallet_address: string;
  };
}

export function saveBackendAuthSession(session: BackendAuthSession): void {
  localStorage.setItem(BACKEND_AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function loadBackendAuthSession(): BackendAuthSession | null {
  const raw = localStorage.getItem(BACKEND_AUTH_STORAGE_KEY);
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
  localStorage.removeItem(BACKEND_AUTH_STORAGE_KEY);
}

