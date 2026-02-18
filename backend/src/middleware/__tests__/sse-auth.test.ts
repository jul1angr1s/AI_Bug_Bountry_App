import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

vi.mock('../../lib/auth-token.js', () => ({
  resolveUserFromToken: vi.fn(),
}));

import { resolveUserFromToken } from '../../lib/auth-token.js';
import { sseAuthenticate } from '../sse-auth.js';

const mockResolveUserFromToken = resolveUserFromToken as unknown as ReturnType<typeof vi.fn>;

describe('sseAuthenticate', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_SSE_QUERY_TOKEN_FOR_TESTS;
    vi.clearAllMocks();

    req = { cookies: {}, query: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('authenticates via cookie token', async () => {
    req.cookies = { auth_token: 'cookie-token' };
    mockResolveUserFromToken.mockResolvedValue({ id: 'user-1' });

    await sseAuthenticate(req as Request, res as Response, next);

    expect(mockResolveUserFromToken).toHaveBeenCalledWith('cookie-token');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects query token in development by default', async () => {
    process.env.NODE_ENV = 'development';
    req.query = { token: 'query-token' };

    await sseAuthenticate(req as Request, res as Response, next);

    expect(mockResolveUserFromToken).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows query token only in explicit non-production fallback mode', async () => {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_SSE_QUERY_TOKEN_FOR_TESTS = 'true';
    req.query = { token: 'query-token' };
    mockResolveUserFromToken.mockResolvedValue({ id: 'user-2' });

    await sseAuthenticate(req as Request, res as Response, next);

    expect(mockResolveUserFromToken).toHaveBeenCalledWith('query-token');
    expect(next).toHaveBeenCalled();
  });
});
