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
 * Performance alert levels
 */
export var AlertLevel;
(function (AlertLevel) {
    AlertLevel["INFO"] = "info";
    AlertLevel["WARNING"] = "warning";
    AlertLevel["CRITICAL"] = "critical";
})(AlertLevel || (AlertLevel = {}));
/**
 * Enhanced Performance Tracking Service
 */
export class EnhancedPerformanceTracker extends EventEmitter {
    static instance;
    metrics = [];
    cache404 = new Map();
    budgets;
    alerts = [];
    maxMetrics;
    metricsIndex = 0;
    isBufferFull = false;
    enabled = true;
    degradationThreshold = 0.2; // 20% degradation threshold
    // Timing context for current operation
    timingContext = new Map();
    constructor() {
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
    static getInstance() {
        if (!this.instance) {
            this.instance = new EnhancedPerformanceTracker();
        }
        return this.instance;
    }
    /**
     * Start tracking an operation with context
     */
    startOperation(toolName, operationType, metadata) {
        if (!this.enabled)
            return '';
        const operationId = `${toolName}-${Date.now()}-${Math.random()}`;
        const startTime = performance.now();
        this.timingContext.set(operationId, {
            toolName,
            operationType,
            startTime,
            metadata,
            timings: {
                validation: 0,
                attioApi: 0,
                serialization: 0,
                other: 0,
            },
        });
        return operationId;
    }
    /**
     * Mark a timing checkpoint
     */
    markTiming(operationId, phase, duration) {
        const context = this.timingContext.get(operationId);
        if (context && context.timings[phase] !== undefined) {
            context.timings[phase] += duration;
        }
    }
    /**
     * Mark API call start
     */
    markApiStart(_operationId) {
        return performance.now();
    }
    /**
     * Mark API call end
     */
    markApiEnd(operationId, apiStartTime) {
        const duration = performance.now() - apiStartTime;
        this.markTiming(operationId, 'attioApi', duration);
    }
    /**
     * End tracking an operation
     */
    endOperation(operationId, success = true, error, statusCode, additionalMetadata) {
        if (!this.enabled || !operationId)
            return null;
        const context = this.timingContext.get(operationId);
        if (!context)
            return null;
        const endTime = performance.now();
        const duration = endTime - context.startTime;
        // Calculate MCP overhead
        const mcpOverhead = duration -
            (context.timings.validation +
                context.timings.attioApi +
                context.timings.serialization +
                context.timings.other);
        const metrics = {
            toolName: context.toolName,
            operationType: context.operationType,
            resourceType: context.metadata?.resourceType,
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
            recordCount: additionalMetadata?.recordCount,
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
    storeMetrics(metrics) {
        if (this.isBufferFull) {
            this.metrics[this.metricsIndex] = metrics;
        }
        else {
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
    checkBudget(metrics) {
        const budget = this.getBudgetForOperation(metrics.operationType, metrics.statusCode, metrics.recordCount);
        if (metrics.duration > budget) {
            const percentOver = ((metrics.duration - budget) / budget) * 100;
            let level;
            if (percentOver > 100) {
                level = AlertLevel.CRITICAL;
            }
            else if (percentOver > this.degradationThreshold * 100) {
                level = AlertLevel.WARNING;
            }
            else {
                level = AlertLevel.INFO;
            }
            const alert = {
                level,
                toolName: metrics.toolName,
                operationType: metrics.operationType,
                duration: metrics.duration,
                budget,
                percentOver,
                timestamp: new Date(),
                message: `${metrics.toolName} (${metrics.operationType}) exceeded budget by ${percentOver.toFixed(1)}% (${metrics.duration.toFixed(0)}ms vs ${budget}ms budget)`,
            };
            this.alerts.push(alert);
            this.emit('performanceAlert', alert);
            // Log critical alerts immediately
            if (level === AlertLevel.CRITICAL) {
                console.error(`🔴 PERFORMANCE CRITICAL: ${alert.message}`);
            }
            else if (level === AlertLevel.WARNING) {
                console.warn(`🟡 PERFORMANCE WARNING: ${alert.message}`);
            }
        }
    }
    /**
     * Get budget for specific operation
     */
    getBudgetForOperation(operationType, statusCode, recordCount) {
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
    cache404Response(key, result, ttl = 60000) {
        this.cache404.set(key, {
            timestamp: Date.now(),
            result,
            ttl,
        });
    }
    /**
     * Get cached 404 response
     */
    getCached404(key) {
        const entry = this.cache404.get(key);
        if (!entry)
            return null;
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
    cleanupCache() {
        const now = Date.now();
        for (const [key, entry] of this.cache404.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache404.delete(key);
            }
        }
    }
    /**
     * Get performance statistics
     */
    getStatistics(toolName, timeWindow) {
        const now = Date.now();
        const windowStart = timeWindow ? now - timeWindow : 0;
        let relevantMetrics = this.metrics;
        if (toolName) {
            relevantMetrics = relevantMetrics.filter((m) => m.toolName === toolName);
        }
        if (timeWindow) {
            relevantMetrics = relevantMetrics.filter((m) => m.startTime >= windowStart);
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
            successRate: (relevantMetrics.filter((m) => m.success).length /
                relevantMetrics.length) *
                100,
            cacheHitRate: (relevantMetrics.filter((m) => m.cached).length /
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
            budgetViolations: this.alerts.filter((a) => !toolName || a.toolName === toolName).length,
        };
    }
    /**
     * Calculate average
     */
    average(values) {
        if (values.length === 0)
            return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    /**
     * Calculate percentile
     */
    percentile(sortedValues, percentile) {
        if (sortedValues.length === 0)
            return 0;
        const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
        return sortedValues[Math.max(0, index)];
    }
    /**
     * Log metrics in development
     */
    logMetrics(metrics) {
        const icon = metrics.success ? '✅' : '❌';
        const timeIcon = metrics.duration >
            this.getBudgetForOperation(metrics.operationType, metrics.statusCode)
            ? '🔴'
            : metrics.duration > 1000
                ? '🟡'
                : '🟢';
        console.error(`${icon} ${metrics.toolName} (${metrics.operationType}): ${timeIcon} ${metrics.duration.toFixed(0)}ms ` +
            `[API: ${metrics.timingSplit.attioApi.toFixed(0)}ms, MCP: ${metrics.timingSplit.mcpOverhead.toFixed(0)}ms]` +
            (metrics.cached ? ' 📦 CACHED' : '') +
            (metrics.error ? ` ❌ ${metrics.error}` : ''));
    }
    /**
     * Generate performance report
     */
    generateReport() {
        const stats = this.getStatistics();
        const recentAlerts = this.alerts.slice(-10);
        if (!stats) {
            return 'No performance data available';
        }
        return `
Performance Report
==================
Total Operations: ${stats.count}
Success Rate: ${stats.successRate.toFixed(1)}%
Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%

Timing Statistics (ms)
----------------------
Average: ${stats.timing.average.toFixed(0)}
Min: ${stats.timing.min.toFixed(0)}
Max: ${stats.timing.max.toFixed(0)}
P50: ${stats.timing.p50.toFixed(0)}
P95: ${stats.timing.p95.toFixed(0)}
P99: ${stats.timing.p99.toFixed(0)}

API vs MCP Overhead (ms)
------------------------
API Average: ${stats.apiTiming.average.toFixed(0)}
API P95: ${stats.apiTiming.p95.toFixed(0)}
API P99: ${stats.apiTiming.p99.toFixed(0)}
MCP Average: ${stats.overhead.average.toFixed(0)}
MCP P95: ${stats.overhead.p95.toFixed(0)}
MCP P99: ${stats.overhead.p99.toFixed(0)}

Budget Violations: ${stats.budgetViolations}

Recent Alerts
-------------
${recentAlerts
            .map((a) => `[${a.level.toUpperCase()}] ${a.toolName}: ${a.duration.toFixed(0)}ms (${a.percentOver.toFixed(0)}% over budget)`)
            .join('\n')}
    `.trim();
    }
    /**
     * Clear all data
     */
    clear() {
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
    exportMetrics() {
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
export const enhancedPerformanceTracker = EnhancedPerformanceTracker.getInstance();
