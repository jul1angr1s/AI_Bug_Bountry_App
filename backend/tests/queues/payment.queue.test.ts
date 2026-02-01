import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockRedisClient = {
  status: 'ready',
};

const mockQueue = {
  add: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  isPaused: vi.fn(),
  getJobCounts: vi.fn(),
  close: vi.fn(),
};

// Mock modules
vi.mock('../../src/lib/redis.js', () => ({
  getRedisClient: () => mockRedisClient,
}));

vi.mock('bullmq', () => ({
  Queue: jest.fn(() => mockQueue),
}));

// Import after mocks
const {
  addPaymentJob,
  pauseQueue,
  resumeQueue,
  getQueueStatus,
  closePaymentQueue,
} = await import('../../src/queues/payment.queue.js');

describe('PaymentQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addPaymentJob', () => {
    it('should add payment job with correct data', async () => {
      const jobData = {
        paymentId: 'payment-1',
        validationId: '0x' + 'a'.repeat(64),
        protocolId: 'protocol-1',
      };

      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await addPaymentJob(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-payment',
        jobData,
        expect.objectContaining({
          jobId: 'payment-payment-1',
          removeOnComplete: true,
        })
      );
    });

    it('should create unique job IDs', async () => {
      const jobData1 = {
        paymentId: 'payment-1',
        validationId: '0x' + 'a'.repeat(64),
        protocolId: 'protocol-1',
      };

      const jobData2 = {
        paymentId: 'payment-2',
        validationId: '0x' + 'b'.repeat(64),
        protocolId: 'protocol-2',
      };

      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await addPaymentJob(jobData1);
      await addPaymentJob(jobData2);

      expect(mockQueue.add).toHaveBeenNthCalledWith(
        1,
        'process-payment',
        jobData1,
        expect.objectContaining({
          jobId: 'payment-payment-1',
        })
      );

      expect(mockQueue.add).toHaveBeenNthCalledWith(
        2,
        'process-payment',
        jobData2,
        expect.objectContaining({
          jobId: 'payment-payment-2',
        })
      );
    });

    it('should handle queue errors', async () => {
      const jobData = {
        paymentId: 'payment-1',
        validationId: '0x' + 'a'.repeat(64),
        protocolId: 'protocol-1',
      };

      mockQueue.add.mockRejectedValue(new Error('Queue error'));

      await expect(addPaymentJob(jobData)).rejects.toThrow('Queue error');
    });
  });

  describe('pauseQueue', () => {
    it('should pause the queue', async () => {
      mockQueue.pause.mockResolvedValue(undefined);

      await pauseQueue();

      expect(mockQueue.pause).toHaveBeenCalled();
    });

    it('should handle pause errors', async () => {
      mockQueue.pause.mockRejectedValue(new Error('Pause failed'));

      await expect(pauseQueue()).rejects.toThrow('Pause failed');
    });
  });

  describe('resumeQueue', () => {
    it('should resume the queue', async () => {
      mockQueue.resume.mockResolvedValue(undefined);

      await resumeQueue();

      expect(mockQueue.resume).toHaveBeenCalled();
    });

    it('should handle resume errors', async () => {
      mockQueue.resume.mockRejectedValue(new Error('Resume failed'));

      await expect(resumeQueue()).rejects.toThrow('Resume failed');
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status with job counts', async () => {
      mockQueue.isPaused.mockResolvedValue(false);
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 0,
        paused: 0,
      });

      const status = await getQueueStatus();

      expect(status).toEqual({
        isPaused: false,
        jobCounts: {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
        },
        processingRate: {
          processed: 100,
          failed: 3,
        },
      });

      expect(mockQueue.isPaused).toHaveBeenCalled();
      expect(mockQueue.getJobCounts).toHaveBeenCalled();
    });

    it('should return paused status', async () => {
      mockQueue.isPaused.mockResolvedValue(true);
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 10,
        active: 0,
        completed: 50,
        failed: 2,
        delayed: 0,
        paused: 0,
      });

      const status = await getQueueStatus();

      expect(status.isPaused).toBe(true);
      expect(status.jobCounts.waiting).toBe(10);
      expect(status.jobCounts.active).toBe(0);
    });

    it('should handle empty queue', async () => {
      mockQueue.isPaused.mockResolvedValue(false);
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
      });

      const status = await getQueueStatus();

      expect(status.jobCounts.waiting).toBe(0);
      expect(status.jobCounts.active).toBe(0);
      expect(status.processingRate.processed).toBe(0);
      expect(status.processingRate.failed).toBe(0);
    });
  });

  describe('closePaymentQueue', () => {
    it('should close the queue', async () => {
      mockQueue.close.mockResolvedValue(undefined);

      await closePaymentQueue();

      expect(mockQueue.close).toHaveBeenCalled();
    });

    it('should handle close errors', async () => {
      mockQueue.close.mockRejectedValue(new Error('Close failed'));

      await expect(closePaymentQueue()).rejects.toThrow('Close failed');
    });
  });

  describe('retry configuration', () => {
    it('should have correct retry configuration', async () => {
      // The Queue constructor should be called with retry config
      const { Queue } = await import('bullmq');
      const QueueMock = Queue as vi.MockedFunction<typeof Queue>;

      // Check if Queue was instantiated with correct options
      expect(QueueMock).toHaveBeenCalledWith(
        'payment-processing',
        expect.objectContaining({
          connection: mockRedisClient,
          defaultJobOptions: expect.objectContaining({
            attempts: 3,
            backoff: expect.objectContaining({
              type: 'exponential',
              delay: 1000,
            }),
            removeOnComplete: 10,
            removeOnFail: 5,
          }),
        })
      );
    });
  });
});
