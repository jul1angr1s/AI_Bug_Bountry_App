import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

import { verifyCsrfToken } from '../csrf.js';

describe('verifyCsrfToken', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    delete process.env.SKIP_CSRF;

    req = {
      method: 'POST',
      cookies: {},
      headers: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('rejects missing cookie token even with bearer auth', () => {
    req.headers = {
      authorization: 'Bearer token-123',
      'x-csrf-token': 'header-csrf',
    };

    verifyCsrfToken(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects mismatched token even with bearer auth', () => {
    req.cookies = { 'X-CSRF-Token': 'cookie-csrf' };
    req.headers = {
      authorization: 'Bearer token-123',
      'x-csrf-token': 'different-csrf',
    };

    verifyCsrfToken(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts matching cookie/header token', () => {
    req.cookies = { 'X-CSRF-Token': 'same-token' };
    req.headers = { 'x-csrf-token': 'same-token' };

    verifyCsrfToken(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
