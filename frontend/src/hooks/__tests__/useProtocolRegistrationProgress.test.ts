import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useProtocolRegistrationProgress } from '../useProtocolRegistrationProgress';

/**
 * Comprehensive Test Suite for useProtocolRegistrationProgress Hook
 *
 * Test Coverage:
 * - Correct environment variable usage (VITE_API_BASE_URL)
 * - SSE connection establishment
 * - Progress event handling
 * - Cookie authentication (withCredentials)
 * - Query parameter fallback in dev mode
 * - Error handling
 * - Connection state management
 * - Cleanup on unmount
 */

// Mock EventSource
class MockEventSource {
  url: string;
  withCredentials: boolean;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState: number = 0;
  private listeners: Map<string, ((event: Event) => void)[]> = new Map();

  constructor(url: string, config?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = config?.withCredentials ?? false;
    this.readyState = 1; // OPEN
  }

  addEventListener(event: string, handler: (event: Event) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  removeEventListener(event: string, handler: (event: Event) => void) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  close() {
    this.readyState = 2; // CLOSED
  }

  // Test helper to simulate events
  _simulateOpen() {
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  _simulateMessage(data: string) {
    if (this.onmessage) {
      const event = new MessageEvent('message', { data });
      this.onmessage(event);
    }
  }

  _simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  _simulateClose() {
    const handlers = this.listeners.get('close');
    if (handlers) {
      handlers.forEach(handler => handler(new Event('close')));
    }
  }
}

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useProtocolRegistrationProgress', () => {
  let eventSourceInstance: MockEventSource | null = null;
  const originalEventSource = global.EventSource;
  const originalImportMeta = import.meta.env;

  beforeEach(() => {
    // Mock EventSource
    global.EventSource = vi.fn((url: string, config?: { withCredentials?: boolean }) => {
      eventSourceInstance = new MockEventSource(url, config);
      return eventSourceInstance as any;
    }) as any;

    // Reset mocks
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);

    // Mock import.meta.env
    import.meta.env = {
      ...originalImportMeta,
      VITE_API_BASE_URL: 'http://localhost:3000/api/v1',
      MODE: 'production',
    };
  });

  afterEach(() => {
    global.EventSource = originalEventSource;
    import.meta.env = originalImportMeta;
    eventSourceInstance = null;
  });

  describe('Environment Variable Usage', () => {
    it('should use VITE_API_BASE_URL and strip /api/v1 suffix', () => {
      const protocolId = 'protocol-123';
      import.meta.env.VITE_API_BASE_URL = 'http://localhost:3000/api/v1';

      renderHook(() => useProtocolRegistrationProgress(protocolId));

      expect(global.EventSource).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/protocols/protocol-123/registration-progress',
        { withCredentials: true }
      );
    });

    it('should fallback to localhost if VITE_API_BASE_URL is not set', () => {
      const protocolId = 'protocol-456';
      import.meta.env.VITE_API_BASE_URL = undefined;

      renderHook(() => useProtocolRegistrationProgress(protocolId));

      expect(global.EventSource).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/protocols/protocol-456/registration-progress',
        { withCredentials: true }
      );
    });
  });

  describe('SSE Connection', () => {
    it('should establish SSE connection with withCredentials', () => {
      const protocolId = 'protocol-789';

      renderHook(() => useProtocolRegistrationProgress(protocolId));

      expect(global.EventSource).toHaveBeenCalled();
      expect(eventSourceInstance?.withCredentials).toBe(true);
    });

    it('should not connect if protocolId is null', () => {
      renderHook(() => useProtocolRegistrationProgress(null));

      expect(global.EventSource).not.toHaveBeenCalled();
    });

    it('should set isConnected to true on connection open', async () => {
      const protocolId = 'protocol-connected';

      const { result } = renderHook(() => useProtocolRegistrationProgress(protocolId));

      expect(result.current.isConnected).toBe(false);

      // Simulate connection open
      eventSourceInstance?._simulateOpen();

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });
  });

  describe('Development Query Parameter Fallback', () => {
    beforeEach(() => {
      import.meta.env.MODE = 'development';
      mockLocalStorage.getItem.mockReturnValue('dev-token-123');
    });

    it('should append token as query param in development mode', () => {
      const protocolId = 'protocol-dev';

      renderHook(() => useProtocolRegistrationProgress(protocolId));

      expect(global.EventSource).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/protocols/protocol-dev/registration-progress?token=dev-token-123',
        { withCredentials: true }
      );
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token');
    });

    it('should not append token in production mode', () => {
      import.meta.env.MODE = 'production';
      const protocolId = 'protocol-prod';

      renderHook(() => useProtocolRegistrationProgress(protocolId));

      expect(global.EventSource).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/protocols/protocol-prod/registration-progress',
        { withCredentials: true }
      );
    });

    it('should not append token if localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const protocolId = 'protocol-no-token';

      renderHook(() => useProtocolRegistrationProgress(protocolId));

      expect(global.EventSource).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/protocols/protocol-no-token/registration-progress',
        { withCredentials: true }
      );
    });
  });

  describe('Progress Event Handling', () => {
    it('should update state on progress event', async () => {
      const protocolId = 'protocol-progress';

      const { result } = renderHook(() => useProtocolRegistrationProgress(protocolId));

      const progressEvent = {
        eventType: 'protocol:registration_progress',
        timestamp: new Date().toISOString(),
        protocolId,
        data: {
          currentStep: 'VALIDATING_CONTRACT',
          state: 'IN_PROGRESS' as const,
          progress: 50,
          message: 'Validating smart contract...',
        },
      };

      // Simulate progress event
      eventSourceInstance?._simulateMessage(JSON.stringify(progressEvent));

      await waitFor(() => {
        expect(result.current.currentStep).toBe('VALIDATING_CONTRACT');
        expect(result.current.state).toBe('IN_PROGRESS');
        expect(result.current.progress).toBe(50);
        expect(result.current.message).toBe('Validating smart contract...');
        expect(result.current.isConnected).toBe(true);
        expect(result.current.error).toBeNull();
      });
    });

    it('should close connection on COMPLETED state', async () => {
      const protocolId = 'protocol-complete';

      renderHook(() => useProtocolRegistrationProgress(protocolId));

      const closeSpy = vi.spyOn(eventSourceInstance!, 'close');

      const completedEvent = {
        eventType: 'protocol:registration_progress',
        timestamp: new Date().toISOString(),
        protocolId,
        data: {
          currentStep: 'REGISTRATION_COMPLETE',
          state: 'COMPLETED' as const,
          progress: 100,
          message: 'Registration completed successfully',
        },
      };

      eventSourceInstance?._simulateMessage(JSON.stringify(completedEvent));

      await waitFor(() => {
        expect(closeSpy).toHaveBeenCalled();
      });
    });

    it('should close connection on FAILED state', async () => {
      const protocolId = 'protocol-failed';

      renderHook(() => useProtocolRegistrationProgress(protocolId));

      const closeSpy = vi.spyOn(eventSourceInstance!, 'close');

      const failedEvent = {
        eventType: 'protocol:registration_progress',
        timestamp: new Date().toISOString(),
        protocolId,
        data: {
          currentStep: 'VALIDATION_FAILED',
          state: 'FAILED' as const,
          progress: 30,
          message: 'Validation failed',
        },
      };

      eventSourceInstance?._simulateMessage(JSON.stringify(failedEvent));

      await waitFor(() => {
        expect(closeSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should set error state on connection error', async () => {
      const protocolId = 'protocol-error';

      const { result } = renderHook(() => useProtocolRegistrationProgress(protocolId));

      eventSourceInstance?._simulateError();

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
        expect(result.current.error).toBe('Connection error - retrying...');
      });
    });

    it('should close connection on error', async () => {
      const protocolId = 'protocol-error-close';

      renderHook(() => useProtocolRegistrationProgress(protocolId));

      const closeSpy = vi.spyOn(eventSourceInstance!, 'close');

      eventSourceInstance?._simulateError();

      await waitFor(() => {
        expect(closeSpy).toHaveBeenCalled();
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      const protocolId = 'protocol-malformed';

      const { result } = renderHook(() => useProtocolRegistrationProgress(protocolId));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventSourceInstance?._simulateMessage('invalid json');

      await waitFor(() => {
        // State should not change on parse error
        expect(result.current.currentStep).toBe('INITIALIZING');
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should close connection on unmount', () => {
      const protocolId = 'protocol-unmount';

      const { unmount } = renderHook(() => useProtocolRegistrationProgress(protocolId));

      const closeSpy = vi.spyOn(eventSourceInstance!, 'close');

      unmount();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle close event from server', () => {
      const protocolId = 'protocol-server-close';

      renderHook(() => useProtocolRegistrationProgress(protocolId));

      const closeSpy = vi.spyOn(eventSourceInstance!, 'close');

      eventSourceInstance?._simulateClose();

      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
