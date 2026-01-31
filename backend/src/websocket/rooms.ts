import type { Server, Socket } from 'socket.io';

type RoomState = {
  lastSeen: number;
};

const socketState = new Map<string, RoomState>();
const userConnections = new Map<string, Set<string>>();
const MAX_CONNECTIONS_PER_USER = 3;
const HEARTBEAT_TIMEOUT_MS = 60_000;

function leaveProtocolRooms(socket: Socket): void {
  for (const room of socket.rooms) {
    if (room.startsWith('protocol:')) {
      socket.leave(room);
    }
  }
}

export function registerRoomHandlers(_io: Server, socket: Socket): void {
  socket.on('joinProtocol', (protocolId: string) => {
    if (!socket.data.user) {
      return;
    }

    leaveProtocolRooms(socket);
    socket.join(`protocol:${protocolId}`);
  });

  socket.on('heartbeat', () => {
    const state = socketState.get(socket.id);
    if (state) {
      state.lastSeen = Date.now();
    }
    socket.emit('heartbeat:ack');
  });

  socket.on('disconnect', () => {
    leaveProtocolRooms(socket);
    socketState.delete(socket.id);
    if (socket.data.user?.id) {
      const connections = userConnections.get(socket.data.user.id);
      if (connections) {
        connections.delete(socket.id);
        if (connections.size === 0) {
          userConnections.delete(socket.data.user.id);
        }
      }
    }
  });

  if (socket.data.user?.id) {
    const existing = userConnections.get(socket.data.user.id) ?? new Set();
    existing.add(socket.id);
    userConnections.set(socket.data.user.id, existing);

    if (existing.size > MAX_CONNECTIONS_PER_USER) {
      socket.emit('error', 'Max connections exceeded');
      socket.disconnect(true);
      return;
    }
  }

  socketState.set(socket.id, { lastSeen: Date.now() });

  const interval = setInterval(() => {
    const state = socketState.get(socket.id);
    if (!state) {
      clearInterval(interval);
      return;
    }

    if (Date.now() - state.lastSeen > HEARTBEAT_TIMEOUT_MS) {
      socket.emit('error', 'Heartbeat timeout');
      socket.disconnect(true);
      clearInterval(interval);
    }
  }, HEARTBEAT_TIMEOUT_MS);

  socket.on('disconnect', () => {
    clearInterval(interval);
  });
}
