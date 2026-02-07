/**
 * Metrics Collection System
 *
 * Collects application metrics for monitoring and observability.
 * Metrics include: queue depths, processing times, success rates.
 */

interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface ProcessingMetrics {
  totalProcessed: number;
  successRate: number;
  averageProcessingTime: number;
  failureRate: number;
}

interface SystemMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: number;
}

class MetricsCollector {
  private requestCounts: Map<string, number> = new Map();
  private processingTimes: Map<string, number[]> = new Map();
  private startTime: number = Date.now();

  /**
   * Record a request
   */
  recordRequest(path: string): void {
    const count = this.requestCounts.get(path) || 0;
    this.requestCounts.set(path, count + 1);
  }

  /**
   * Record processing time
   */
  recordProcessingTime(operation: string, timeMs: number): void {
    const times = this.processingTimes.get(operation) || [];
    times.push(timeMs);

    // Keep only last 1000 measurements
    if (times.length > 1000) {
      times.shift();
    }

    this.processingTimes.set(operation, times);
  }

  /**
   * Get queue metrics from BullMQ
   */
  async getQueueMetrics(queue: { name: string; getJobCounts: () => Promise<Record<string, number>> }): Promise<QueueMetrics> {
    const counts = await queue.getJobCounts();

    return {
      name: queue.name,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  }

  /**
   * Get processing metrics for an operation
   */
  getProcessingMetrics(operation: string): ProcessingMetrics {
    const times = this.processingTimes.get(operation) || [];

    if (times.length === 0) {
      return {
        totalProcessed: 0,
        successRate: 0,
        averageProcessingTime: 0,
        failureRate: 0,
      };
    }

    const total = times.length;
    const avgTime = times.reduce((a, b) => a + b, 0) / total;

    return {
      totalProcessed: total,
      successRate: 100, // See GitHub Issue #101
      averageProcessingTime: avgTime,
      failureRate: 0,
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    return {
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      timestamp: Date.now(),
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): {
    system: SystemMetrics;
    requests: Record<string, number>;
    processing: Record<string, ProcessingMetrics>;
  } {
    const processing: Record<string, ProcessingMetrics> = {};

    for (const [operation, _times] of this.processingTimes) {
      processing[operation] = this.getProcessingMetrics(operation);
    }

    return {
      system: this.getSystemMetrics(),
      requests: Object.fromEntries(this.requestCounts),
      processing,
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.requestCounts.clear();
    this.processingTimes.clear();
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();

/**
 * Middleware to record request metrics
 */
export function metricsMiddleware(req: { method: string; path: string }, res: { on: (event: string, cb: () => void) => void }, next: () => void): void {
  const start = Date.now();

  metricsCollector.recordRequest(req.path);

  res.on('finish', () => {
    const duration = Date.now() - start;
    metricsCollector.recordProcessingTime(`request:${req.method}:${req.path}`, duration);
  });

  next();
}
