/**
 * Enhanced Performance Tracking Middleware for Phase 2
 *
 * Provides advanced performance monitoring, timing splits, and automated alerts
 * for the Attio MCP Server. Tracks API vs MCP overhead, performance budgets,
 * and regression detection.
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

/**
 * Performance timing breakdown
 */
export interface TimingSplit {
  total: number;
  attioApi: number;
  mcpOverhead: number;
  validation: number;
  serialization: number;
  other: number;
}

/**
 * Enhanced performance metrics with detailed timing
 */
export interface EnhancedPerformanceMetrics {
  toolName: string;
  operationType: string;
  resourceType?: string;
  startTime: number;
  endTime: number;
  duration: number;
  timingSplit: TimingSplit;
  success: boolean;
  cached: boolean;
  error?: string;
  statusCode?: number;
  recordCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Performance budget configuration
 */
export interface PerformanceBudget {
  notFound: number; // Target for 404 responses (2000ms)
  search: number; // Target for search operations (3000ms)
  create: number; // Target for create operations (3000ms)
  update: number; // Target for update operations (3000ms)
  delete: number; // Target for delete operations (2000ms)
  batchSmall: number; // Target for batch operations < 10 items (5000ms)
  batchLarge: number; // Target for batch operations >= 10 items (10000ms)
  default: number; // Default budget for other operations (3000ms)
}

/**
 * Performance alert levels
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  level: AlertLevel;
  toolName: string;
  operationType: string;
  duration: number;
  budget: number;
  percentOver: number;
  timestamp: Date;
  message: string;
}

/**
 * Cache entry for 404 responses
 */
interface CacheEntry {
  timestamp: number;
  result: unknown;
  ttl: number;
}

/**
 * Enhanced Performance Tracking Service
 */
export class EnhancedPerformanceTracker extends EventEmitter {
  private static instance: EnhancedPerformanceTracker;
  private metrics: EnhancedPerformanceMetrics[] = [];
  private cache404: Map<string, CacheEntry> = new Map();
  private budgets: PerformanceBudget;
  private alerts: PerformanceAlert[] = [];
  private maxMetrics: number;
  private metricsIndex: number = 0;
  private isBufferFull: boolean = false;
  private enabled: boolean = true;
  private degradationThreshold: number = 0.2; // 20% degradation threshold

  // Timing context for current operation
  private timingContext: Map<
    string,
    {
      toolName: string;
      operationType: string;
      startTime: number;
      metadata?: Record<string, unknown>;
      timings: {
        total: number;
        attioApi: number;
        mcpOverhead: number;
        validation: number;
        serialization: number;
        other: number;
      };
    }
  > = new Map();

  private constructor() {
    super();

    this.maxMetrics = parseInt(process.env.PERF_MAX_METRICS || '5000', 10);

    // Initialize performance budgets
    this.budgets = {
      notFound: parseInt(process.env.PERF_BUDGET_NOT_FOUND || '2000', 10),
      search: parseInt(process.env.PERF_BUDGET_SEARCH || '3000', 10),
      create: parseInt(process.env.PERF_BUDGET_CREATE || '3000', 10),
      update: parseInt(process.env.PERF_BUDGET_UPDATE || '3000', 10),
      delete: parseInt(process.env.PERF_BUDGET_DELETE || '2000', 10),
      batchSmall: parseInt(process.env.PERF_BUDGET_BATCH_SMALL || '5000', 10),
      batchLarge: parseInt(process.env.PERF_BUDGET_BATCH_LARGE || '10000', 10),
      default: parseInt(process.env.PERF_BUDGET_DEFAULT || '3000', 10),
    };

    // Set up cache cleanup interval (every 5 minutes)
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EnhancedPerformanceTracker {
    if (!this.instance) {
      this.instance = new EnhancedPerformanceTracker();
    }
    return this.instance;
  }

  /**
   * Start tracking an operation with context
   */
  startOperation(
    toolName: string,
    operationType: string,
    metadata?: Record<string, unknown>
  ): string {
    if (!this.enabled) return '';

    const operationId = `${toolName}-${Date.now()}-${Math.random()}`;
    const startTime = performance.now();

    this.timingContext.set(operationId, {
      toolName,
      operationType,
      startTime,
      metadata,
      timings: {
        total: 0,
        attioApi: 0,
        mcpOverhead: 0,
        validation: 0,
        serialization: 0,
        other: 0,
      },
    });

    return operationId;
  }

  /**
   * Mark a timing checkpoint
   */
  markTiming(
    operationId: string,
    phase: keyof TimingSplit,
    duration: number
  ): void {
    const context = this.timingContext.get(operationId);
    if (context && context.timings[phase] !== undefined) {
      context.timings[phase] += duration;
    }
  }

  /**
   * Mark API call start
   */
  markApiStart(operationId: string): number {
    if (this.enabled && operationId) {
      const context = this.timingContext.get(operationId);
      if (context) {
        // Touch the context to keep TypeScript happy without altering behaviour
        context.timings.attioApi += 0;
      }
    }

    return performance.now();
  }

  /**
   * Mark API call end
   */
  markApiEnd(operationId: string, apiStartTime: number): void {
    const duration = performance.now() - apiStartTime;
    this.markTiming(operationId, 'attioApi', duration);
  }

  /**
   * End tracking an operation
   */
  endOperation(
    operationId: string,
    success: boolean = true,
    error?: string,
    statusCode?: number,
    additionalMetadata?: Record<string, unknown>
  ): EnhancedPerformanceMetrics | null {
    if (!this.enabled || !operationId) return null;

    const context = this.timingContext.get(operationId);
    if (!context) return null;

    const endTime = performance.now();
    const duration = endTime - context.startTime;

    // Calculate MCP overhead
    const mcpOverhead =
      duration -
      (context.timings.validation +
        context.timings.attioApi +
        context.timings.serialization +
        context.timings.other);

    const metrics: EnhancedPerformanceMetrics = {
      toolName: context.toolName,
      operationType: context.operationType,
      resourceType: context.metadata?.resourceType as string | undefined,
      startTime: context.startTime,
      endTime,
      duration,
      timingSplit: {
        total: duration,
        attioApi: context.timings.attioApi,
        mcpOverhead: Math.max(0, mcpOverhead),
        validation: context.timings.validation,
        serialization: context.timings.serialization,
        other: context.timings.other,
      },
      success,
      cached: false,
      error,
      statusCode,
      recordCount: additionalMetadata?.recordCount as number | undefined,
      metadata: { ...context.metadata, ...additionalMetadata },
    };

    // Store metrics
    this.storeMetrics(metrics);

    // Check performance budget
    this.checkBudget(metrics);

    // Clean up context
    this.timingContext.delete(operationId);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      this.logMetrics(metrics);
    }

    return metrics;
  }

  /**
   * Store metrics in circular buffer
   */
  private storeMetrics(metrics: EnhancedPerformanceMetrics): void {
    if (this.isBufferFull) {
      this.metrics[this.metricsIndex] = metrics;
    } else {
      this.metrics.push(metrics);
      if (this.metrics.length >= this.maxMetrics) {
        this.isBufferFull = true;
      }
    }

    this.metricsIndex = (this.metricsIndex + 1) % this.maxMetrics;
  }

  /**
   * Check if operation exceeds budget
   */
  private checkBudget(metrics: EnhancedPerformanceMetrics): void {
    const budget = this.getBudgetForOperation(
      metrics.operationType,
      metrics.statusCode,
      metrics.recordCount
    );

    if (metrics.duration > budget) {
      const percentOver = ((metrics.duration - budget) / budget) * 100;

      let level: AlertLevel;
      if (percentOver > 100) {
        level = AlertLevel.CRITICAL;
      } else if (percentOver > this.degradationThreshold * 100) {
        level = AlertLevel.WARNING;
      } else {
        level = AlertLevel.INFO;
      }

      const alert: PerformanceAlert = {
        level,
        toolName: metrics.toolName,
        operationType: metrics.operationType,
        duration: metrics.duration,
        budget,
        percentOver,
        timestamp: new Date(),
        message: `${metrics.toolName} (${
          metrics.operationType
        }) exceeded budget by ${percentOver.toFixed(
          1
        )}% (${metrics.duration.toFixed(0)}ms vs ${budget}ms budget)`,
      };

      this.alerts.push(alert);
      this.emit('performanceAlert', alert);

      // Log critical alerts immediately using structured logging
      if (level === AlertLevel.CRITICAL) {
        process.stderr.write(
          JSON.stringify({
            level: 'error',
            message: `PERFORMANCE CRITICAL: ${alert.message}`,
            type: 'performance_alert',
            data: alert,
          }) + '\n'
        );
      } else if (level === AlertLevel.WARNING) {
        process.stderr.write(
          JSON.stringify({
            level: 'warn',
            message: `PERFORMANCE WARNING: ${alert.message}`,
            type: 'performance_alert',
            data: alert,
          }) + '\n'
        );
      }
    }
  }

  /**
   * Get budget for specific operation
   */
  private getBudgetForOperation(
    operationType: string,
    statusCode?: number,
    recordCount?: number
  ): number {
    // 404 responses have their own budget
    if (statusCode === 404) {
      return this.budgets.notFound;
    }

    // Map operation types to budgets
    switch (operationType.toLowerCase()) {
      case 'search':
      case 'list':
      case 'query':
        return this.budgets.search;
      case 'create':
        return this.budgets.create;
      case 'update':
        return this.budgets.update;
      case 'delete':
        return this.budgets.delete;
      case 'batch':
        return recordCount && recordCount >= 10
          ? this.budgets.batchLarge
          : this.budgets.batchSmall;
      default:
        return this.budgets.default;
    }
  }

  /**
   * Cache a 404 response
   */
  cache404Response(key: string, result: unknown, ttl: number = 60000): void {
    this.cache404.set(key, {
      timestamp: Date.now(),
      result,
      ttl,
    });
  }

  /**
   * Get cached 404 response
   */
  getCached404(key: string): unknown | null {
    const entry = this.cache404.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache404.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.cache404.entries())) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache404.delete(key);
      }
    }
  }

  /**
   * Get performance statistics
   */
  getStatistics(
    toolName?: string,
    timeWindow?: number
  ): Record<string, unknown> {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;

    let relevantMetrics = this.metrics;

    if (toolName) {
      relevantMetrics = relevantMetrics.filter((m) => m.toolName === toolName);
    }

    if (timeWindow) {
      relevantMetrics = relevantMetrics.filter(
        (m) => m.startTime >= windowStart
      );
    }

    if (relevantMetrics.length === 0) {
      return {};
    }

    const durations = relevantMetrics
      .map((m) => m.duration)
      .sort((a, b) => a - b);
    const apiTimes = relevantMetrics
      .map((m) => m.timingSplit.attioApi)
      .sort((a, b) => a - b);
    const overheads = relevantMetrics
      .map((m) => m.timingSplit.mcpOverhead)
      .sort((a, b) => a - b);

    return {
      count: relevantMetrics.length,
      successRate:
        (relevantMetrics.filter((m) => m.success).length /
          relevantMetrics.length) *
        100,
      cacheHitRate:
        (relevantMetrics.filter((m) => m.cached).length /
          relevantMetrics.length) *
        100,
      timing: {
        average: this.average(durations),
        min: durations[0],
        max: durations[durations.length - 1],
        p50: this.percentile(durations, 50),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99),
      },
      apiTiming: {
        average: this.average(apiTimes),
        p50: this.percentile(apiTimes, 50),
        p95: this.percentile(apiTimes, 95),
        p99: this.percentile(apiTimes, 99),
      },
      overhead: {
        average: this.average(overheads),
        p50: this.percentile(overheads, 50),
        p95: this.percentile(overheads, 95),
        p99: this.percentile(overheads, 99),
      },
      budgetViolations: this.alerts.filter(
        (a) => !toolName || a.toolName === toolName
      ).length,
    };
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Sanitize error for logging to prevent sensitive information exposure
   */
  private sanitizeErrorForLogging(error: unknown): string {
    if (!error) return 'Unknown error';

    // If it's a string, avoid logging possibly sensitive details, always redact
    if (typeof error === 'string') {
      // Optionally: Try to check for obvious secrets, API key format, etc. For now, always redact
      return '[Redacted error message]';
    }

    // If it's an Error object, use the message but check for likely sensitive value
    if (error instanceof Error) {
      // Very basic redaction: if the message looks like a config or API key, redact it
      const msg = error.message || '';
      if (
        /api[_-]?key/i.test(msg) ||
        /(Bearer|sk_[a-zA-Z0-9]{20,})/.test(msg) ||
        /secret|token/i.test(msg)
      ) {
        return '[Redacted error message]';
      }
      return msg || 'Error occurred';
    }

    // For objects, extract safe information, but never log "apiKey" or secrets
    if (typeof error === 'object' && error !== null) {
      const obj = error as Record<string, unknown>;
      // If the object appears to be a config with apiKey or secrets, redact
      if (Object.keys(obj).some((k) => /api[_-]?key|secret|token/i.test(k))) {
        return '[Redacted error object]';
      }
      // Safely extract common error properties without exposing sensitive data
      const status = obj.status || obj.statusCode;
      const message = obj.message;

      // Redact known bad messages
      if (
        typeof message === 'string' &&
        (/api[_-]?key/i.test(message) || /secret|token/i.test(message))
      ) {
        if (status) {
          return `${status}: [Redacted error message]`;
        }
        return '[Redacted error message]';
      }

      if (status && message) {
        return `${status}: ${message}`;
      }
      if (status) {
        return `HTTP ${status}`;
      }
      if (message) {
        return String(message);
      }

      // Fallback for other objects - don't serialize the full object
      return 'Request failed';
    }

    return 'Unknown error type';
  }

  /**
   * Log metrics in development
   */
  private logMetrics(metrics: EnhancedPerformanceMetrics): void {
    const icon = metrics.success ? '✅' : '❌';
    const timeIcon =
      metrics.duration >
      this.getBudgetForOperation(metrics.operationType, metrics.statusCode)
        ? '🔴'
        : metrics.duration > 1000
          ? '🟡'
          : '🟢';

    console.error(
      `${icon} ${metrics.toolName} (${
        metrics.operationType
      }): ${timeIcon} ${metrics.duration.toFixed(0)}ms ` +
        `[API: ${metrics.timingSplit.attioApi.toFixed(
          0
        )}ms, MCP: ${metrics.timingSplit.mcpOverhead.toFixed(0)}ms]` +
        (metrics.cached ? ' 📦 CACHED' : '') +
        // codeql[js/clear-text-logging] - Error sanitized via sanitizeErrorForLogging()
        (metrics.error
          ? ` ❌ ${this.sanitizeErrorForLogging(metrics.error)}`
          : '')
    );
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const stats = this.getStatistics();
    const recentAlerts = this.alerts.slice(-10);

    if (!stats) {
      return 'No performance data available';
    }

    return `
Performance Report
==================
Total Operations: ${stats.count}
Success Rate: ${(stats.successRate as number).toFixed(1)}%
Cache Hit Rate: ${(stats.cacheHitRate as number).toFixed(1)}%

Timing Statistics (ms)
----------------------
Average: ${(stats.timing as Record<string, number>).average.toFixed(0)}
Min: ${(stats.timing as Record<string, number>).min.toFixed(0)}
Max: ${(stats.timing as Record<string, number>).max.toFixed(0)}
P50: ${(stats.timing as Record<string, number>).p50.toFixed(0)}
P95: ${(stats.timing as Record<string, number>).p95.toFixed(0)}
P99: ${(stats.timing as Record<string, number>).p99.toFixed(0)}

API vs MCP Overhead (ms)
------------------------
API Average: ${(stats.apiTiming as Record<string, number>).average.toFixed(0)}
API P95: ${(stats.apiTiming as Record<string, number>).p95.toFixed(0)}
API P99: ${(stats.apiTiming as Record<string, number>).p99.toFixed(0)}
MCP Average: ${(stats.overhead as Record<string, number>).average.toFixed(0)}
MCP P95: ${(stats.overhead as Record<string, number>).p95.toFixed(0)}
MCP P99: ${(stats.overhead as Record<string, number>).p99.toFixed(0)}

Budget Violations: ${stats.budgetViolations}

Recent Alerts
-------------
${recentAlerts
  .map(
    (a) =>
      `[${a.level.toUpperCase()}] ${a.toolName}: ${a.duration.toFixed(
        0
      )}ms (${a.percentOver.toFixed(0)}% over budget)`
  )
  .join('\n')}
    `.trim();
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.metrics = [];
    this.alerts = [];
    this.cache404.clear();
    this.timingContext.clear();
    this.metricsIndex = 0;
    this.isBufferFull = false;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): Record<string, unknown> {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      statistics: this.getStatistics(),
      alerts: this.alerts,
      budgets: this.budgets,
    };
  }
}

// Export singleton instance
export const enhancedPerformanceTracker =
  EnhancedPerformanceTracker.getInstance();
