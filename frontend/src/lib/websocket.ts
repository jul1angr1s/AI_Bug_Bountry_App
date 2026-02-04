/**
 * WebSocket Connection Manager using Socket.IO Client
 * Handles WebSocket lifecycle with auto-reconnect capability
 */

import { io, Socket } from 'socket.io-client';

type WebSocketEventHandler = (data: unknown) => void;

interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export class WebSocketManager {
  private socket: Socket | null = null;
  private config: Required<WebSocketConfig>;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private isIntentionallyClosed = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval ?? 3000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      console.warn('[WebSocket] Already connected');
      return;
    }

    this.isIntentionallyClosed = false;

    try {
      const token = localStorage.getItem('token');

      this.socket = io(this.config.url, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: this.config.maxReconnectAttempts,
        reconnectionDelay: this.config.reconnectInterval,
        transports: ['websocket'],
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.emit('connection:error', error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Subscribe to WebSocket events
   * @param event Event name to listen for
   * @param handler Handler function to call when event is received
   * @returns Unsubscribe function
   */
  on(event: string, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Register Socket.IO listener if not a connection event
    if (this.socket && !event.startsWith('connection:')) {
      this.socket.on(event, (data: any) => {
        this.emit(event, data);
      });
    }

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
      if (this.socket && this.eventHandlers.get(event)?.size === 0) {
        this.socket.off(event);
      }
    };
  }

  /**
   * Send message to WebSocket server
   */
  send(event: string, data?: unknown): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Cannot send message - not connected');
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Setup Socket.IO event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.emit('connection:open', {});
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.emit('connection:close', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.emit('connection:error', error);
    });

    this.socket.io.on('reconnect_failed', () => {
      console.error('[WebSocket] Max reconnect attempts reached');
      this.emit('connection:failed', {});
    });
  }

  /**
   * Emit event to registered handlers
   */
  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WebSocket] Error in ${event} handler:`, error);
        }
      });
    }
  }
}

/**
 * Create singleton WebSocket instance for dashboard
 */
let dashboardWS: WebSocketManager | null = null;

export function getDashboardWebSocket(): WebSocketManager {
  if (!dashboardWS) {
    // Socket.IO connects to the root URL, not /ws path
    const wsUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';

    dashboardWS = new WebSocketManager({
      url: wsUrl,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
    });
  }
  return dashboardWS;
}
