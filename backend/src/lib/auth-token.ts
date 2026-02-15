import jwt from 'jsonwebtoken';
import { supabaseAdmin } from './supabase.js';

type JwtUserClaims = {
  sub?: string;
  email?: string;
  role?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  aud?: string | string[];
};

function isAuthenticatedAudience(aud: string | string[] | undefined): boolean {
  if (!aud) return false;
  if (Array.isArray(aud)) {
    return aud.includes('authenticated');
  }
  return aud === 'authenticated';
}

export async function resolveUserFromToken(token: string): Promise<any | null> {
  // Primary path: validate as a native Supabase auth token
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (!error && data.user) {
    return data.user;
  }

  // Fallback path: validate backend-issued JWT directly
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtUserClaims;
    if (!decoded.sub || !isAuthenticatedAudience(decoded.aud)) {
      return null;
    }

    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      app_metadata: decoded.app_metadata || {},
      user_metadata: decoded.user_metadata || {},
      aud: decoded.aud,
    };
  } catch {
    return null;
  }
}

