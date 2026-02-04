import type { Server, Socket } from 'socket.io';
import { supabaseAdmin } from '../lib/supabase.js';
import { registerRoomHandlers } from './rooms.js';
import { setSocketIO } from './events.js';

export function registerSocketHandlers(io: Server): void {
  // Store io instance for event emitters
  setSocketIO(io);

  io.on('connection', async (socket: Socket) => {
    const token = typeof socket.handshake.auth?.token === 'string'
      ? socket.handshake.auth.token
      : undefined;

    console.log('[WebSocket] New connection attempt', {
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 20) + '...' : 'none'
    });

    // In development, allow connections without token
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (token) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data.user) {
        console.error('[WebSocket] Auth failed:', {
          error: error?.message,
          hasUser: !!data?.user
        });
        if (!isDevelopment) {
          socket.disconnect(true);
          return;
        }
        console.warn('[WebSocket] Allowing connection without auth (development mode)');
      } else {
        console.log('[WebSocket] Auth successful:', data.user.email);
        socket.data.user = data.user;
      }
    } else {
      if (isDevelopment) {
        console.log('[WebSocket] No token provided, allowing in development mode');
      } else {
        console.warn('[WebSocket] No token provided, disconnecting');
        socket.disconnect(true);
        return;
      }
    }

    registerRoomHandlers(io, socket);
  });
}
