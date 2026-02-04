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

    if (token) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data.user) {
        socket.disconnect(true);
        return;
      }
      socket.data.user = data.user;
    } else {
      socket.disconnect(true);
      return;
    }

    registerRoomHandlers(io, socket);
  });
}
