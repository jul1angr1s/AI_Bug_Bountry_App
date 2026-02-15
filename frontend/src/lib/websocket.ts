type WebSocketEventHandler = (data: unknown) => void;

interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export class WebSocketManager {
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private connected = false;

  constructor(config: WebSocketConfig) {
    const _ = config;
    void _;
  }

  connect(): void {
    // Temporary no-op transport: avoids repeated browser errors from incompatible ws/socket.io protocols.
    this.connected = false;
    this.emit('connection:failed', {
      reason: 'Realtime websocket transport is disabled in this build.',
    });
  }

  disconnect(): void {
    this.connected = false;
    this.emit('connection:close', { reason: 'client_disconnect' });
  }

  on(event: string, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  send(_event: string, _data?: unknown): void {
    // No-op until socket.io-client is available in this environment.
  }

  isConnected(): boolean {
    return this.connected;
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) return;

    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[WebSocket] Handler failed for ${event}:`, error);
      }
    });
  }
}

let dashboardWS: WebSocketManager | null = null;

export function getDashboardWebSocket(): WebSocketManager {
  if (!dashboardWS) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const wsUrl = import.meta.env.VITE_WS_URL || apiBaseUrl;
    dashboardWS = new WebSocketManager({ url: wsUrl });
  }
  return dashboardWS;
}
