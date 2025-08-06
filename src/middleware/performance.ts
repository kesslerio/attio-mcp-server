/**
 * Performance Tracking Middleware
 *
 * Provides performance monitoring and timing for all MCP tool operations.
 * Tracks execution time, API latency, and performance bottlenecks.
 */

import { performance } from 'perf_hooks';

/**
 * Performance metrics for a single operation
 */
export interface PerformanceMetrics {
  toolName: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Performance thresholds for alerting
 */
export interface PerformanceThresholds {
  warning: number; // milliseconds
  critical: number; // milliseconds
}

/**
 * Performance summary statistics
 */
export interface PerformanceSummary {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
}

/**
 * Performance tracking service
 */
export class PerformanceTracker {
  private static metrics: PerformanceMetrics[] = [];
  private static thresholds: Map<string, PerformanceThresholds> = new Map();
  private static enabled: boolean =
    process.env.PERFORMANCE_TRACKING !== 'false';
  private static readonly maxMetrics: number = parseInt(
    process.env.PERF_MAX_METRICS || '1000',
    10
  );
  private static metricsIndex: number = 0;
  private static isBufferFull: boolean = false;

  /**
   * Set performance thresholds for a tool
   */
  static setThresholds(
    toolName: string,
    thresholds: PerformanceThresholds
  ): void {
    this.thresholds.set(toolName, thresholds);
  }

  /**
   * Get default thresholds
   */
  static getDefaultThresholds(): PerformanceThresholds {
    return {
      warning: 1000, // 1 second
      critical: 5000, // 5 seconds
    };
  }

  /**
   * Start tracking an operation
   */
  static startOperation(
    toolName: string,
    metadata?: Record<string, any>
  ): number {
    if (!this.enabled) return 0;

    const startTime = performance.now();

    // Log slow operations in development
    if (process.env.NODE_ENV === 'development') {
      const thresholds =
        this.thresholds.get(toolName) || this.getDefaultThresholds();

      // Set a timeout to warn about slow operations
      setTimeout(() => {
        const duration = performance.now() - startTime;
        if (duration > thresholds.critical) {
          console.warn(
            `⚠️ Critical: ${toolName} is taking too long (${duration.toFixed(2)}ms)`
          );
        } else if (duration > thresholds.warning) {
          console.warn(
            `⚠️ Warning: ${toolName} is slow (${duration.toFixed(2)}ms)`
          );
        }
      }, thresholds.warning);
    }

    return startTime;
  }

  /**
   * End tracking an operation
   */
  static endOperation(
    toolName: string,
    startTime: number,
    success: boolean = true,
    error?: string,
    metadata?: Record<string, any>
  ): PerformanceMetrics {
    if (!this.enabled) {
      return {
        toolName,
        startTime: 0,
        endTime: 0,
        duration: 0,
        success,
      };
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const metrics: PerformanceMetrics = {
      toolName,
      startTime,
      endTime,
      duration,
      success,
      error,
      metadata,
    };

    // Use circular buffer for efficient memory management
    if (this.isBufferFull) {
      // Overwrite oldest entry
      this.metrics[this.metricsIndex] = metrics;
    } else {
      // Still filling the buffer
      this.metrics.push(metrics);
      if (this.metrics.length >= this.maxMetrics) {
        this.isBufferFull = true;
      }
    }

    // Update circular buffer index
    this.metricsIndex = (this.metricsIndex + 1) % this.maxMetrics;

    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      const thresholds =
        this.thresholds.get(toolName) || this.getDefaultThresholds();
      const statusIcon = success ? '✅' : '❌';
      const timeColor =
        duration > thresholds.critical
          ? '🔴'
          : duration > thresholds.warning
            ? '🟡'
            : '🟢';

      console.log(
        `${statusIcon} ${toolName}: ${timeColor} ${duration.toFixed(2)}ms` +
          (error ? ` (Error: ${error})` : '')
      );
    }

    return metrics;
  }

  /**
   * Get performance summary for a tool
   */
  static getSummary(toolName?: string): PerformanceSummary {
    const relevantMetrics = toolName
      ? this.metrics.filter((m) => m.toolName === toolName)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
      };
    }

    const durations = relevantMetrics
      .map((m) => m.duration)
      .sort((a, b) => a - b);
    const successCount = relevantMetrics.filter((m) => m.success).length;
    const failureCount = relevantMetrics.length - successCount;

    return {
      totalOperations: relevantMetrics.length,
      successfulOperations: successCount,
      failedOperations: failureCount,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50Duration: this.getPercentile(durations, 50),
      p95Duration: this.getPercentile(durations, 95),
      p99Duration: this.getPercentile(durations, 99),
    };
  }

  /**
   * Get percentile value from sorted array
   */
  private static getPercentile(
    sortedArray: number[],
    percentile: number
  ): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Clear all metrics
   */
  static clear(): void {
    this.metrics = [];
    this.metricsIndex = 0;
    this.isBufferFull = false;
  }

  /**
   * Get all metrics
   */
  static getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Export metrics as JSON
   */
  static exportMetrics(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        summary: this.getSummary(),
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

/**
 * Performance middleware decorator
 */
export function withPerformanceTracking<
  T extends (...args: any[]) => Promise<any>,
>(handler: T, toolName: string): T {
  return (async (...args: any[]) => {
    const startTime = PerformanceTracker.startOperation(toolName, {
      params: args[0],
    });

    try {
      const result = await handler(...args);
      PerformanceTracker.endOperation(toolName, startTime, true);
      return result;
    } catch (error) {
      PerformanceTracker.endOperation(
        toolName,
        startTime,
        false,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }) as T;
}

/**
 * Async performance wrapper with timeout
 */
export function withTimeout<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  timeoutMs: number,
  toolName: string
): T {
  return (async (...args: any[]) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(`Operation ${toolName} timed out after ${timeoutMs}ms`)
        );
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([handler(...args), timeoutPromise]);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        console.error(`⏱️ Timeout: ${toolName} exceeded ${timeoutMs}ms limit`);
      }
      throw error;
    }
  }) as T;
}

/**
 * Batch performance tracking for multiple operations
 */
export class BatchPerformanceTracker {
  private operations: Map<string, number> = new Map();
  private batchStartTime: number;

  constructor(private batchName: string) {
    this.batchStartTime = performance.now();
  }

  /**
   * Start tracking an operation within the batch
   */
  startOperation(operationId: string): void {
    this.operations.set(operationId, performance.now());
  }

  /**
   * End tracking an operation within the batch
   */
  endOperation(operationId: string): number {
    const startTime = this.operations.get(operationId);
    if (!startTime) {
      throw new Error(`Operation ${operationId} was not started`);
    }

    const duration = performance.now() - startTime;
    this.operations.delete(operationId);
    return duration;
  }

  /**
   * Get batch summary
   */
  getSummary(): {
    batchName: string;
    totalDuration: number;
    pendingOperations: string[];
  } {
    const totalDuration = performance.now() - this.batchStartTime;
    const pendingOperations = Array.from(this.operations.keys());

    return {
      batchName: this.batchName,
      totalDuration,
      pendingOperations,
    };
  }
}

/**
 * Rate limiting tracker for API calls
 */
export class RateLimitTracker {
  private static windowStart: number = Date.now();
  private static callCount: number = 0;
  private static windowSizeMs: number = 60000; // 1 minute window
  private static maxCallsPerWindow: number = 100;

  /**
   * Check if we can make an API call
   */
  static canMakeCall(): boolean {
    const now = Date.now();

    // Reset window if needed
    if (now - this.windowStart > this.windowSizeMs) {
      this.windowStart = now;
      this.callCount = 0;
    }

    return this.callCount < this.maxCallsPerWindow;
  }

  /**
   * Record an API call
   */
  static recordCall(): void {
    this.callCount++;
  }

  /**
   * Get current rate limit status
   */
  static getStatus(): {
    callsRemaining: number;
    windowResetTime: number;
    isLimited: boolean;
  } {
    const now = Date.now();

    // Reset window if needed
    if (now - this.windowStart > this.windowSizeMs) {
      this.windowStart = now;
      this.callCount = 0;
    }

    return {
      callsRemaining: Math.max(0, this.maxCallsPerWindow - this.callCount),
      windowResetTime: this.windowStart + this.windowSizeMs,
      isLimited: this.callCount >= this.maxCallsPerWindow,
    };
  }

  /**
   * Configure rate limits
   */
  static configure(maxCallsPerWindow: number, windowSizeMs: number): void {
    this.maxCallsPerWindow = maxCallsPerWindow;
    this.windowSizeMs = windowSizeMs;
  }
}
