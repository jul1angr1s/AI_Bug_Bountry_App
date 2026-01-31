import type { User } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: User | null;
    }
  }
}

export {};
