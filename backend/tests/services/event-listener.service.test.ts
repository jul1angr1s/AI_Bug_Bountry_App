import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockPrismaClient = {
  eventListenerState: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};

const mockProvider = {
  getBlockNumber: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn(),
};

const mockContract = {
  on: vi.fn(),
  removeAllListeners: vi.fn(),
  queryFilter: vi.fn(),
  filters: {},
};

const mockChainConfig = {
  name: 'Base Sepolia',
  chainId: 84532,
  rpcUrl: 'https://sepolia.base.org',
};

// Mock modules
jest.unstable_mockModule('../../src/lib/prisma.js', () => ({
  getPrismaClient: () => mockPrismaClient,
}));

jest.unstable_mockModule('ethers', () => ({
  ethers: {
    WebSocketProvider: jest.fn(() => mockProvider),
    Contract: jest.fn(() => mockContract),
    EventLog: class EventLog {
      blockNumber: number;
      constructor(blockNumber: number) {
        this.blockNumber = blockNumber;
      }
    },
  },
}));

jest.unstable_mockModule('../../src/blockchain/config.js', () => ({
  chainConfig: mockChainConfig,
}));

// Import after mocks
const { EventListenerService, getEventListenerService } = await import('../../src/services/event-listener.service.js');

describe('EventListenerService', () => {
  let service: InstanceType<typeof EventListenerService>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset process.env
    process.env.BASE_SEPOLIA_WS_URL = 'wss://sepolia.base.org';

    // Disable graceful shutdown handlers for tests
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');

    service = new EventListenerService();
  });

  describe('getLastProcessedBlock', () => {
    it('should return last processed block if exists', async () => {
      const contractAddress = '0x' + '1'.repeat(40);
      const eventName = 'BountyReleased';
      const lastBlock = 12345;

      mockPrismaClient.eventListenerState.findUnique.mockResolvedValue({
        contractAddress: contractAddress.toLowerCase(),
        eventName,
        lastProcessedBlock: lastBlock,
      });

      const result = await service.getLastProcessedBlock(contractAddress, eventName);

      expect(result).toBe(lastBlock);
      expect(mockPrismaClient.eventListenerState.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            contractAddress_eventName: {
              contractAddress: contractAddress.toLowerCase(),
              eventName,
            },
          },
        })
      );
    });

    it('should return null if no state exists', async () => {
      const contractAddress = '0x' + '1'.repeat(40);
      const eventName = 'BountyReleased';

      mockPrismaClient.eventListenerState.findUnique.mockResolvedValue(null);

      const result = await service.getLastProcessedBlock(contractAddress, eventName);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const contractAddress = '0x' + '1'.repeat(40);
      const eventName = 'BountyReleased';

      mockPrismaClient.eventListenerState.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.getLastProcessedBlock(contractAddress, eventName)).rejects.toThrow('Failed to get last processed block');
    });
  });

  describe('updateLastProcessedBlock', () => {
    it('should create new state if not exists', async () => {
      const contractAddress = '0x' + '1'.repeat(40);
      const eventName = 'BountyReleased';
      const blockNumber = 12345;

      mockPrismaClient.eventListenerState.upsert.mockResolvedValue({
        contractAddress: contractAddress.toLowerCase(),
        eventName,
        lastProcessedBlock: blockNumber,
      });

      await service.updateLastProcessedBlock(contractAddress, eventName, blockNumber);

      expect(mockPrismaClient.eventListenerState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            contractAddress_eventName: {
              contractAddress: contractAddress.toLowerCase(),
              eventName,
            },
          },
          update: expect.objectContaining({
            lastProcessedBlock: blockNumber,
          }),
          create: expect.objectContaining({
            contractAddress: contractAddress.toLowerCase(),
            eventName,
            lastProcessedBlock: blockNumber,
          }),
        })
      );
    });

    it('should update existing state', async () => {
      const contractAddress = '0x' + '1'.repeat(40);
      const eventName = 'BountyReleased';
      const newBlockNumber = 12346;

      mockPrismaClient.eventListenerState.upsert.mockResolvedValue({
        contractAddress: contractAddress.toLowerCase(),
        eventName,
        lastProcessedBlock: newBlockNumber,
      });

      await service.updateLastProcessedBlock(contractAddress, eventName, newBlockNumber);

      expect(mockPrismaClient.eventListenerState.upsert).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const contractAddress = '0x' + '1'.repeat(40);
      const eventName = 'BountyReleased';
      const blockNumber = 12345;

      mockPrismaClient.eventListenerState.upsert.mockRejectedValue(new Error('DB error'));

      await expect(service.updateLastProcessedBlock(contractAddress, eventName, blockNumber)).rejects.toThrow('Failed to update last processed block');
    });
  });

  describe('replayEvents', () => {
    it('should fetch and process historical events', async () => {
      const contractAddress = '0x' + '1'.repeat(40);
      const eventName = 'BountyReleased';
      const fromBlock = 10000;
      const toBlock = 10010;

      const mockEvents = [
        { blockNumber: 10005 },
        { blockNumber: 10007 },
      ];

      const mockHandler = vi.fn().mockResolvedValue(undefined);

      mockContract.filters[eventName] = jest.fn(() => ({}));
      mockContract.queryFilter.mockResolvedValue(mockEvents);
      mockPrismaClient.eventListenerState.upsert.mockResolvedValue({});

      // Initialize provider first
      mockProvider.getBlockNumber.mockResolvedValue(20000);
      await (service as any).initializeProvider();

      const config = {
        contractAddress,
        eventName,
        abi: [],
        handler: mockHandler,
      };

      await service.replayEvents(config, fromBlock, toBlock);

      expect(mockContract.queryFilter).toHaveBeenCalledWith({}, fromBlock, toBlock);
      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(mockPrismaClient.eventListenerState.upsert).toHaveBeenCalledTimes(2);
    });

    it('should continue processing on handler error', async () => {
      const contractAddress = '0x' + '1'.repeat(40);
      const eventName = 'BountyReleased';
      const fromBlock = 10000;
      const toBlock = 10010;

      const mockEvents = [
        { blockNumber: 10005 },
        { blockNumber: 10007 },
      ];

      const mockHandler = vi.fn()
        .mockRejectedValueOnce(new Error('Handler error'))
        .mockResolvedValueOnce(undefined);

      mockContract.filters[eventName] = jest.fn(() => ({}));
      mockContract.queryFilter.mockResolvedValue(mockEvents);
      mockPrismaClient.eventListenerState.upsert.mockResolvedValue({});

      mockProvider.getBlockNumber.mockResolvedValue(20000);
      await (service as any).initializeProvider();

      const config = {
        contractAddress,
        eventName,
        abi: [],
        handler: mockHandler,
      };

      await service.replayEvents(config, fromBlock, toBlock);

      // Should process both events despite first error
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it('should throw error if provider not initialized', async () => {
      const config = {
        contractAddress: '0x' + '1'.repeat(40),
        eventName: 'BountyReleased',
        abi: [],
        handler: vi.fn(),
      };

      await expect(service.replayEvents(config, 10000, 10010)).rejects.toThrow('Provider not initialized');
    });
  });

  describe('startListening', () => {
    it('should start listening from configured block', async () => {
      const contractAddress = '0x' + '1'.repeat(40);
      const eventName = 'BountyReleased';
      const fromBlock = 10000;
      const currentBlock = 20000;

      mockProvider.getBlockNumber.mockResolvedValue(currentBlock);
      mockPrismaClient.eventListenerState.findUnique.mockResolvedValue(null);
      mockContract.filters[eventName] = jest.fn(() => ({}));
      mockContract.queryFilter.mockResolvedValue([]);
      mockContract.on.mockImplementation(() => {});

      const config = {
        contractAddress,
        eventName,
        abi: [],
        handler: vi.fn(),
        fromBlock,
      };

      await service.startListening(config);

      expect(mockContract.queryFilter).toHaveBeenCalledWith({}, fromBlock, currentBlock);
      expect(mockContract.on).toHaveBeenCalled();
    });

    it('should resume from last processed block', async () => {
      const contractAddress = '0x' + '1'.repeat(40);
      const eventName = 'BountyReleased';
      const lastProcessedBlock = 15000;
      const currentBlock = 20000;

      mockProvider.getBlockNumber.mockResolvedValue(currentBlock);
      mockPrismaClient.eventListenerState.findUnique.mockResolvedValue({
        contractAddress: contractAddress.toLowerCase(),
        eventName,
        lastProcessedBlock,
      });
      mockContract.filters[eventName] = jest.fn(() => ({}));
      mockContract.queryFilter.mockResolvedValue([]);
      mockContract.on.mockImplementation(() => {});

      const config = {
        contractAddress,
        eventName,
        abi: [],
        handler: vi.fn(),
      };

      await service.startListening(config);

      // Should resume from lastProcessedBlock + 1
      expect(mockContract.queryFilter).toHaveBeenCalledWith({}, lastProcessedBlock + 1, currentBlock);
    });

    it('should start from current block if no history', async () => {
      const contractAddress = '0x' + '1'.repeat(40);
      const eventName = 'BountyReleased';
      const currentBlock = 20000;

      mockProvider.getBlockNumber.mockResolvedValue(currentBlock);
      mockPrismaClient.eventListenerState.findUnique.mockResolvedValue(null);
      mockContract.filters[eventName] = jest.fn(() => ({}));
      mockContract.on.mockImplementation(() => {});

      const config = {
        contractAddress,
        eventName,
        abi: [],
        handler: vi.fn(),
      };

      await service.startListening(config);

      expect(mockContract.queryFilter).not.toHaveBeenCalled();
      expect(mockContract.on).toHaveBeenCalled();
    });
  });

  describe('error handling with exponential backoff', () => {
    it('should retry with exponential backoff', async () => {
      vi.useFakeTimers();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Trigger provider error
      const error = new Error('Connection lost');
      await (service as any).handleProviderError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Provider error occurred')
      );

      vi.useRealTimers();
      consoleErrorSpy.mockRestore();
    });

    it('should stop retrying after max attempts', async () => {
      vi.useFakeTimers();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Set retry attempts to max
      (service as any).retryConfig.attempt = 10;

      const error = new Error('Connection lost');
      await (service as any).handleProviderError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Max retry attempts reached')
      );

      vi.useRealTimers();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      mockProvider.getBlockNumber.mockResolvedValue(20000);
      await (service as any).initializeProvider();

      mockProvider.destroy.mockResolvedValue(undefined);
      mockContract.removeAllListeners.mockImplementation(() => {});

      await service.shutdown();

      expect(mockProvider.destroy).toHaveBeenCalled();
    });

    it('should not shutdown twice', async () => {
      mockProvider.getBlockNumber.mockResolvedValue(20000);
      await (service as any).initializeProvider();

      mockProvider.destroy.mockResolvedValue(undefined);

      await service.shutdown();
      await service.shutdown(); // Second call should be ignored

      expect(mockProvider.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('healthCheck', () => {
    it('should return true when connected', async () => {
      mockProvider.getBlockNumber.mockResolvedValue(20000);
      await (service as any).initializeProvider();

      const isHealthy = await service.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return false when not connected', async () => {
      const isHealthy = await service.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should return false on provider error', async () => {
      mockProvider.getBlockNumber
        .mockResolvedValueOnce(20000)
        .mockRejectedValueOnce(new Error('Connection lost'));

      await (service as any).initializeProvider();

      const isHealthy = await service.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return listener statistics', async () => {
      mockProvider.getBlockNumber.mockResolvedValue(20000);
      await (service as any).initializeProvider();

      const stats = service.getStats();

      expect(stats).toEqual({
        isConnected: true,
        activeListeners: 0,
        retryAttempt: 0,
      });
    });

    it('should reflect retry attempts', async () => {
      (service as any).retryConfig.attempt = 3;

      const stats = service.getStats();

      expect(stats.retryAttempt).toBe(3);
    });
  });

  describe('getEventListenerService singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getEventListenerService();
      const instance2 = getEventListenerService();

      expect(instance1).toBe(instance2);
    });
  });

  describe('WebSocket URL configuration', () => {
    it('should use BASE_SEPOLIA_WS_URL from environment', () => {
      process.env.BASE_SEPOLIA_WS_URL = 'wss://custom.websocket.url';

      const url = (service as any).getWebSocketUrl();

      expect(url).toBe('wss://custom.websocket.url');
    });

    it('should convert HTTPS to WSS if no WS URL provided', () => {
      delete process.env.BASE_SEPOLIA_WS_URL;

      const url = (service as any).getWebSocketUrl();

      expect(url).toBe('wss://sepolia.base.org');
    });

    it('should convert HTTP to WS', () => {
      delete process.env.BASE_SEPOLIA_WS_URL;
      mockChainConfig.rpcUrl = 'http://localhost:8545';

      const url = (service as any).getWebSocketUrl();

      expect(url).toBe('ws://localhost:8545');

      // Restore
      mockChainConfig.rpcUrl = 'https://sepolia.base.org';
    });
  });
});
