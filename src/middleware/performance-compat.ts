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

  static getInstance(): PerformanceMonitorInstance {
    if (!this._instance) {
      this._instance = new PerformanceMonitorInstance();
    }
    return this._instance;
  }

  // Instance methods that delegate to static PerformanceTracker methods
  startOperation(toolName: string, metadata?: Record<string, any>): number {
    return PerformanceTracker.startOperation(toolName, metadata);
  }

  endOperation(
    toolName: string,
    startTime: number,
    success: boolean = true,
    error?: string,
    metadata?: Record<string, any>
  ): PerformanceMetrics {
    return PerformanceTracker.endOperation(
      toolName,
      startTime,
      success,
      error,
      metadata
    );
  }

  getSummary(toolName?: string): PerformanceSummary {
    return PerformanceTracker.getSummary(toolName);
  }

  clear(): void {
    return PerformanceTracker.clear();
  }

  reset(): void {
    // Alias for clear() to match legacy test expectations
    return PerformanceTracker.clear();
  }

  getMetrics(): PerformanceMetrics[] {
    return PerformanceTracker.getMetrics();
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
    metadata?: Record<string, any>
  ): Promise<T> {
    return PerformanceTracker.measureAsync(toolName, fn, metadata);
  }

  measure<T>(toolName: string, fn: () => T, metadata?: Record<string, any>): T {
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
