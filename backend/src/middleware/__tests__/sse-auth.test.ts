import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

/**
 * Comprehensive Test Suite for SSE Authentication Middleware
 *
 * Test Coverage:
 * - Cookie-based authentication (production method)
 * - Query parameter authentication (development fallback)
 * - Development bypass mode
 * - Invalid token handling
 * - Missing token handling
 * - Production blocks query param authentication
 * - Error handling
 */

// Set test environment before imports
process.env.NODE_ENV = 'development';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.JWT_SECRET = 'test-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.PORT = '3000';

// Mock Supabase admin client before any imports
const mockSupabaseAdmin = {
  auth: {
    getUser: vi.fn(),
  },
};

// Mock the Supabase module
vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

// Now import the module under test
const { sseAuthenticate } = await import('../sse-auth.js');

describe('SSE Authentication Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };

    // Disable dev bypass by default
    process.env.DEV_AUTH_BYPASS = 'false';
    process.env.NODE_ENV = 'production';

    // Reset mocks
    vi.clearAllMocks();

    // Setup request mock
    req = {
      cookies: {},
      query: {},
      user: undefined,
    };

    // Setup response mock
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    // Setup next mock
    next = vi.fn();
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('Cookie Authentication (Production)', () => {
    it('should authenticate with valid cookie token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      req.cookies = { auth_token: 'valid-token-123' };

      mockSupabaseAdmin.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      await sseAuthenticate(req as Request, res as Response, next);

      expect(mockSupabaseAdmin.auth.getUser).toHaveBeenCalledWith('valid-token-123');
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid cookie token', async () => {
      req.cookies = { auth_token: 'invalid-token' };

      mockSupabaseAdmin.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      await sseAuthenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Query Parameter Authentication (Development)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should authenticate with query parameter in dev mode', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'dev@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      req.query = { token: 'dev-query-token' };

      mockSupabaseAdmin.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      await sseAuthenticate(req as Request, res as Response, next);

      expect(mockSupabaseAdmin.auth.getUser).toHaveBeenCalledWith('dev-query-token');
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
    });

    it('should prefer cookie over query param when both present', async () => {
      const mockUser = {
        id: 'user-789',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      req.cookies = { auth_token: 'cookie-token' };
      req.query = { token: 'query-token' };

      mockSupabaseAdmin.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      await sseAuthenticate(req as Request, res as Response, next);

      // Should use cookie token, not query param
      expect(mockSupabaseAdmin.auth.getUser).toHaveBeenCalledWith('cookie-token');
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Production Query Param Blocking', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should ignore query param in production', async () => {
      req.query = { token: 'query-token' };
      // No cookie provided

      await sseAuthenticate(req as Request, res as Response, next);

      expect(mockSupabaseAdmin.auth.getUser).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required for SSE connection',
      });
    });

    it('should still accept cookie in production', async () => {
      const mockUser = {
        id: 'user-prod',
        email: 'prod@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      req.cookies = { auth_token: 'prod-cookie-token' };

      mockSupabaseAdmin.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      await sseAuthenticate(req as Request, res as Response, next);

      expect(mockSupabaseAdmin.auth.getUser).toHaveBeenCalledWith('prod-cookie-token');
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Development Bypass', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.DEV_AUTH_BYPASS = 'true';
    });

    it('should bypass authentication in dev mode with bypass enabled', async () => {
      // No token provided
      req.cookies = {};
      req.query = {};

      await sseAuthenticate(req as Request, res as Response, next);

      expect(mockSupabaseAdmin.auth.getUser).not.toHaveBeenCalled();
      expect(req.user).toEqual({
        id: 'dev-user-123',
        email: 'dev@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: expect.any(String),
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('should not bypass in production even with flag set', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DEV_AUTH_BYPASS = 'true';

      req.cookies = {};
      req.query = {};

      await sseAuthenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Missing Token Handling', () => {
    it('should reject request with no token', async () => {
      req.cookies = {};
      req.query = {};

      await sseAuthenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required for SSE connection',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with empty cookie token', async () => {
      req.cookies = { auth_token: '' };

      await sseAuthenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle Supabase errors gracefully', async () => {
      req.cookies = { auth_token: 'valid-token' };

      mockSupabaseAdmin.auth.getUser.mockRejectedValue(
        new Error('Supabase connection error')
      );

      await sseAuthenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Authentication processing failed',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle null user response', async () => {
      req.cookies = { auth_token: 'token-with-null-user' };

      mockSupabaseAdmin.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await sseAuthenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token',
      });
    });
  });
});
