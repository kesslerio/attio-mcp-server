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
    _metadata?: Record<string, any>
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

      console.error(
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
        timestamp: new Date().toISOString(),
        enabled: this.enabled,
        metrics: this.metrics,
        summary: this.getSummary(),
      },
      null,
      2
    );
  }

  /**
   * Enable or disable tracking
   */
  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if tracking is enabled
   */
  static isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Measure async function performance
   */
  static async measureAsync<T>(
    toolName: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = this.startOperation(toolName, metadata);

    try {
      const result = await fn();
      this.endOperation(toolName, startTime, true, undefined, metadata);
      return result;
    } catch (error: unknown) {
      this.endOperation(
        toolName,
        startTime,
        false,
        error instanceof Error ? error.message : String(error),
        metadata
      );
      throw error;
    }
  }

  /**
   * Measure sync function performance
   */
  static measure<T>(
    toolName: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const startTime = this.startOperation(toolName, metadata);

    try {
      const result = fn();
      this.endOperation(toolName, startTime, true, undefined, metadata);
      return result;
    } catch (error: unknown) {
      this.endOperation(
        toolName,
        startTime,
        false,
        error instanceof Error ? error.message : String(error),
        metadata
      );
      throw error;
    }
  }

  /**
   * Get slow operations above threshold
   */
  static getSlowOperations(threshold?: number): PerformanceMetrics[] {
    const limit = threshold || 1000; // Default 1 second
    return this.metrics.filter((m) => m.duration > limit);
  }

  /**
   * Get failed operations
   */
  static getFailedOperations(): PerformanceMetrics[] {
    return this.metrics.filter((m) => !m.success);
  }

  /**
   * Generate performance report
   */
  static generateReport(): string {
    const summary = this.getSummary();
    const slowOps = this.getSlowOperations();
    const failedOps = this.getFailedOperations();

    return `
Performance Report
==================
Total Operations: ${summary.totalOperations}
Successful: ${summary.successfulOperations} (${((summary.successfulOperations / summary.totalOperations) * 100).toFixed(1)}%)
Failed: ${summary.failedOperations} (${((summary.failedOperations / summary.totalOperations) * 100).toFixed(1)}%)

Timing Statistics
-----------------
Average: ${summary.averageDuration.toFixed(2)}ms
Min: ${summary.minDuration.toFixed(2)}ms
Max: ${summary.maxDuration.toFixed(2)}ms
P50: ${summary.p50Duration.toFixed(2)}ms
P95: ${summary.p95Duration.toFixed(2)}ms
P99: ${summary.p99Duration.toFixed(2)}ms

Slow Operations: ${slowOps.length}
Failed Operations: ${failedOps.length}
    `.trim();
  }
}

/**
 * Performance monitoring decorator
 */
export function trackPerformance(toolName?: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name =
      toolName || `${(target as any).constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: unknown[]) {
      const startTime = PerformanceTracker.startOperation(name);

      try {
        const result = await originalMethod.apply(this, args);
        PerformanceTracker.endOperation(name, startTime, true);
        return result;
      } catch (error: unknown) {
        PerformanceTracker.endOperation(
          name,
          startTime,
          false,
          error instanceof Error ? error.message : String(error)
        );
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Export a singleton instance for convenience
 */
export const performanceTracker = PerformanceTracker;

// Alias for backward compatibility
export const PerformanceMonitor = PerformanceTracker;
