import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { config } from '../config/env.js';

export function createSocketServer(server: HttpServer): Server {
  return new Server(server, {
    cors: {
      origin: config.FRONTEND_URL,
      credentials: true,
    },
  });
}
