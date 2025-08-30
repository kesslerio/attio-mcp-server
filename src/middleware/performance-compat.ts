/**
 * Performance Monitor Compatibility Layer
 *
 * Provides instance-based singleton API for legacy tests while using
 * the improved static PerformanceTracker implementation.
 */

import {
  PerformanceTracker,
  PerformanceMetrics,
  PerformanceSummary,
} from './performance.js';

/**
 * Instance-based wrapper for PerformanceTracker static methods
 */
class PerformanceMonitorInstance {
  private static _instance: PerformanceMonitorInstance | undefined;
  private activeOperations: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitorInstance {
    if (!this._instance) {
      this._instance = new PerformanceMonitorInstance();
    }
    return this._instance;
  }

  // Instance methods that delegate to static PerformanceTracker methods
  startOperation(toolName: string, metadata?: Record<string, unknown>): number {
    const startTime = PerformanceTracker.startOperation(toolName, metadata);
    this.activeOperations.set(toolName, startTime);
    return startTime;
  }

  endOperation(
    toolName: string,
    startTimeOrSuccess?: number | boolean,
    success: boolean = true,
    error?: string,
    metadata?: Record<string, unknown>
  ): PerformanceMetrics {
    // Support both patterns:
    // 1. endOperation(toolName, startTime, success, error, metadata) - explicit startTime
    // 2. endOperation(toolName, success, error, metadata) - use stored startTime

    let startTime: number;
    let actualSuccess: boolean;
    let actualError: string | undefined;
    let actualMetadata: Record<string, unknown> | undefined;

    if (typeof startTimeOrSuccess === 'number') {
      // Pattern 1: explicit startTime provided
      startTime = startTimeOrSuccess;
      actualSuccess = success;
      actualError = error;
      actualMetadata = metadata;
    } else {
      // Pattern 2: use stored startTime
      const storedStartTime = this.activeOperations.get(toolName);
      if (storedStartTime === undefined) {
        throw new Error(
          `No active operation found for tool: ${toolName}. Call startOperation() first.`
        );
      }
      startTime = storedStartTime;
      actualSuccess =
        typeof startTimeOrSuccess === 'boolean' ? startTimeOrSuccess : true;
      actualError = typeof success === 'string' ? (success as any) : error;
      actualMetadata =
        error && typeof error === 'object' ? (error as any) : metadata;

      // Clean up stored operation
      this.activeOperations.delete(toolName);
    }

    return PerformanceTracker.endOperation(
      toolName,
      startTime,
      actualSuccess,
      actualError,
      actualMetadata
    );
  }

  getSummary(toolName?: string): PerformanceSummary {
    return PerformanceTracker.getSummary(toolName);
  }

  clear(): void {
    this.activeOperations.clear();
    return PerformanceTracker.clear();
  }

  reset(): void {
    // Alias for clear() to match legacy test expectations
    this.activeOperations.clear();
    return PerformanceTracker.clear();
  }

  getMetrics(): {
    totalOperations: number;
    averageTime: number;
    slowOperations: number;
  } {
    const summary = PerformanceTracker.getSummary();
    const slowOps = PerformanceTracker.getSlowOperations(100);

    return {
      totalOperations: summary.totalOperations,
      averageTime: summary.averageDuration,
      slowOperations: slowOps.length,
    };
  }

  isEnabled(): boolean {
    return PerformanceTracker.isEnabled();
  }

  setEnabled(enabled: boolean): void {
    return PerformanceTracker.setEnabled(enabled);
  }

  async measureAsync<T>(
    toolName: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    return PerformanceTracker.measureAsync(toolName, fn, metadata);
  }

  measure<T>(
    toolName: string,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    return PerformanceTracker.measure(toolName, fn, metadata);
  }

  getSlowOperations(threshold?: number): PerformanceMetrics[] {
    return PerformanceTracker.getSlowOperations(threshold);
  }

  getFailedOperations(): PerformanceMetrics[] {
    return PerformanceTracker.getFailedOperations();
  }

  generateReport(): string {
    return PerformanceTracker.generateReport();
  }
}

/**
 * Singleton PerformanceMonitor for backward compatibility
 */
export const PerformanceMonitor = PerformanceMonitorInstance;

// Export the instance for direct usage
export const performanceMonitor = PerformanceMonitorInstance.getInstance();
