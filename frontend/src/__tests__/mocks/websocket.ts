import { vi } from 'vitest';

/**
 * Mock WebSocket implementation for testing
 * Simulates scan progress updates via SSE-like events
 */
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  private eventHandlers: Map<string, Set<EventListener>> = new Map();

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // In tests, sending doesn't need to do anything
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.eventHandlers.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }
    return true;
  }

  /**
   * Simulate receiving a message from the server
   */
  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data),
      });
      this.onmessage(event);
    }
  }

  /**
   * Simulate an error
   */
  simulateError(error?: Error): void {
    if (this.onerror) {
      const event = new Event('error');
      this.onerror(event);
    }
  }
}

/**
 * Mock EventSource for Server-Sent Events (SSE)
 * Used for scan progress updates
 */
export class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  readyState: number = MockEventSource.CONNECTING;
  url: string;
  withCredentials: boolean = false;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private eventHandlers: Map<string, Set<EventListener>> = new Map();
  private progressInterval: NodeJS.Timeout | null = null;

  constructor(url: string) {
    this.url = url;

    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }

      // Start simulating scan progress updates
      this.startProgressSimulation();
    }, 0);
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED;
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.eventHandlers.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }
    return true;
  }

  /**
   * Simulate scan progress messages
   */
  private startProgressSimulation(): void {
    const progressSteps = [
      {
        scanId: 'scan-001',
        step: 'Cloning repository',
        state: 'RUNNING',
        timestamp: new Date().toISOString(),
      },
      {
        scanId: 'scan-001',
        step: 'Analyzing smart contracts',
        state: 'RUNNING',
        timestamp: new Date().toISOString(),
      },
      {
        scanId: 'scan-001',
        step: 'Running vulnerability detection',
        state: 'RUNNING',
        timestamp: new Date().toISOString(),
      },
      {
        scanId: 'scan-001',
        step: 'Scan completed',
        state: 'SUCCEEDED',
        timestamp: new Date().toISOString(),
      },
    ];

    let currentStep = 0;

    // Send progress updates every 100ms
    this.progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length && this.onmessage) {
        const data = progressSteps[currentStep];
        const event = new MessageEvent('message', {
          data: JSON.stringify(data),
        });
        this.onmessage(event);
        currentStep++;
      } else {
        // Stop after all steps are sent
        if (this.progressInterval) {
          clearInterval(this.progressInterval);
          this.progressInterval = null;
        }
      }
    }, 100);
  }

  /**
   * Manually trigger a progress message (for controlled testing)
   */
  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data),
      });
      this.onmessage(event);
    }
  }

  /**
   * Simulate an error
   */
  simulateError(): void {
    if (this.onerror) {
      const event = new Event('error');
      this.onerror(event);
    }
  }
}

/**
 * Setup WebSocket and EventSource mocks globally
 */
export function setupWebSocketMocks() {
  global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  global.EventSource = MockEventSource as unknown as typeof EventSource;
}

/**
 * Cleanup WebSocket mocks
 */
export function cleanupWebSocketMocks() {
  // Reset to undefined to avoid affecting other tests
  // @ts-ignore - intentionally cleaning up
  global.WebSocket = undefined;
  // @ts-ignore - intentionally cleaning up
  global.EventSource = undefined;
}
