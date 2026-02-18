import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearBackendAuthSession,
  loadBackendAuthSession,
  saveBackendAuthSession,
} from '../backend-auth';

const sampleSession = {
  access_token: 'token-123',
  refresh_token: 'refresh-123',
  user: {
    id: 'user-1',
    wallet_address: '0x1111111111111111111111111111111111111111',
  },
};

describe('backend-auth storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('saves backend session in sessionStorage, not localStorage', () => {
    saveBackendAuthSession(sampleSession);

    expect(sessionStorage.getItem('thunder-security-backend-auth')).toBeTruthy();
    expect(localStorage.getItem('thunder-security-backend-auth')).toBeNull();
  });

  it('loads backend session from sessionStorage', () => {
    sessionStorage.setItem('thunder-security-backend-auth', JSON.stringify(sampleSession));

    expect(loadBackendAuthSession()).toEqual(sampleSession);
  });

  it('clears backend session from sessionStorage', () => {
    sessionStorage.setItem('thunder-security-backend-auth', JSON.stringify(sampleSession));

    clearBackendAuthSession();

    expect(sessionStorage.getItem('thunder-security-backend-auth')).toBeNull();
  });
});
