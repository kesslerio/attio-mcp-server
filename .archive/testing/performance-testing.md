# Performance Testing Guide

This guide covers performance testing strategies, benchmarks, and monitoring implemented in Issue #403 to ensure optimal E2E test performance and prevent regression.

## 🎯 Performance Philosophy

Performance testing in the Attio MCP Server focuses on **real-world usability** rather than synthetic benchmarks. The goal is to ensure that Claude Desktop users experience responsive interactions when performing common CRM operations.

### Key Principles

- **User Experience First**: Performance budgets based on user expectations, not technical limits
- **Real API Integration**: Testing against live Attio API to capture actual network and processing overhead
- **Regression Prevention**: Automated performance monitoring to catch slowdowns before they impact users
- **Environment Awareness**: Different performance expectations for local development vs. CI/CD environments

## 📊 Performance Budgets & Standards

### Universal Tools Performance Budgets

Based on real-world usage patterns and user experience research, the following budgets are enforced:

| Operation Category | Local Development | CI/CD Environment | Rationale |
|---|---|---|---|
| **Search Operations** | < 1000ms | < 3000ms | Users expect fast search results |
| **CRUD Operations** | < 1500ms | < 4000ms | Data modification can be slightly slower |
| **Batch Operations** | < 3000ms (10 records) | < 8000ms (10 records) | Bulk operations scale with record count |
| **Field Filtering** | +500ms overhead | +1000ms overhead | Selective retrieval optimization |
| **Pagination** | +200ms per offset | +500ms per offset | Offset processing overhead |
| **Attribute Discovery** | < 800ms | < 2500ms | Schema operations should be fast |

### Performance Classification

**🟢 Excellent Performance**: < 50% of budget  
**🟡 Good Performance**: 50-80% of budget  
**🟠 Acceptable Performance**: 80-100% of budget  
**🔴 Poor Performance**: > 100% of budget (fails tests)

## 🛠️ Performance Testing Implementation

### 1. Enhanced Assertion Method

The `expectOptimalPerformance` assertion enforces performance budgets:

```typescript
import { E2EAssertions } from '../utils/assertions.js';

// Measure operation timing
const start = Date.now();
const response = await callUniversalTool('search-records', {
  resource_type: 'companies',
  query: 'tech startups',
  limit: 25
});

// Add timing metadata
response._meta = { executionTime: Date.now() - start };

// Validate against search operation budget (1000ms)
E2EAssertions.expectOptimalPerformance(response, 1000);
```

### 2. Performance Monitoring Class

The E2E framework includes a comprehensive performance monitoring system:

```typescript
export class E2EPerformanceMonitor {
  private static measurements: Array<{
    test: string;
    operation: string;
    duration: number;
    timestamp: Date;
    resourceType?: string;
    recordCount?: number;
  }> = [];

  /**
   * Measure operation with automatic categorization
   */
  static async measureOperation<T>(
    testName: string,
    operationName: string,
    operation: () => Promise<T>,
    metadata?: { resourceType?: string; recordCount?: number }
  ): Promise<T & { _meta?: { executionTime: number } }> {
    const start = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - start;
      
      // Record measurement
      this.measurements.push({
        test: testName,
        operation: operationName,
        duration,
        timestamp: new Date(),
        ...metadata
      });
      
      // Add timing metadata to response
      if (typeof result === 'object' && result) {
        (result as any)._meta = { 
          ...(result as any)._meta,
          executionTime: duration 
        };
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      // Record failed operations for analysis
      this.measurements.push({
        test: testName,
        operation: `${operationName}-FAILED`,
        duration,
        timestamp: new Date(),
        ...metadata
      });
      
      throw error;
    }
  }

  /**
   * Get performance budget for operation type
   */
  static getPerformanceBudget(operationType: string): number {
    const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'ci';
    const budgets = {
      search: isCI ? 3000 : 1000,
      crud: isCI ? 4000 : 1500,
      batch: isCI ? 8000 : 3000,
      attributes: isCI ? 2500 : 800,
      pagination: isCI ? 500 : 200,
      filtering: isCI ? 1000 : 500
    };
    
    return budgets[operationType as keyof typeof budgets] || (isCI ? 3000 : 1000);
  }

  /**
   * Generate comprehensive performance report
   */
  static generateReport(): {
    summary: {
      totalOperations: number;
      averageTime: number;
      slowestOperation: { operation: string; duration: number };
      fastestOperation: { operation: string; duration: number };
      budgetViolations: number;
    };
    byOperation: Map<string, {
      count: number;
      averageTime: number;
      maxTime: number;
      minTime: number;
      budgetViolations: number;
    }>;
    recommendations: string[];
  } {
    if (this.measurements.length === 0) {
      return {
        summary: {
          totalOperations: 0,
          averageTime: 0,
          slowestOperation: { operation: 'none', duration: 0 },
          fastestOperation: { operation: 'none', duration: 0 },
          budgetViolations: 0
        },
        byOperation: new Map(),
        recommendations: ['No performance measurements recorded']
      };
    }

    // Calculate summary statistics
    const totalTime = this.measurements.reduce((sum, m) => sum + m.duration, 0);
    const averageTime = totalTime / this.measurements.length;
    const sortedByDuration = [...this.measurements].sort((a, b) => b.duration - a.duration);
    
    // Group by operation
    const byOperation = new Map<string, any>();
    for (const measurement of this.measurements) {
      if (!byOperation.has(measurement.operation)) {
        byOperation.set(measurement.operation, {
          times: [],
          resourceTypes: new Set(),
          budgetViolations: 0
        });
      }
      
      const group = byOperation.get(measurement.operation);
      group.times.push(measurement.duration);
      if (measurement.resourceType) group.resourceTypes.add(measurement.resourceType);
      
      // Check budget violation
      const operationType = this.categorizeOperation(measurement.operation);
      const budget = this.getPerformanceBudget(operationType);
      if (measurement.duration > budget) {
        group.budgetViolations++;
      }
    }

    // Calculate statistics for each operation
    const operationStats = new Map();
    let totalBudgetViolations = 0;
    
    for (const [operation, data] of byOperation) {
      const times = data.times;
      const stats = {
        count: times.length,
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
        maxTime: Math.max(...times),
        minTime: Math.min(...times),
        budgetViolations: data.budgetViolations
      };
      
      operationStats.set(operation, stats);
      totalBudgetViolations += data.budgetViolations;
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(operationStats);

    return {
      summary: {
        totalOperations: this.measurements.length,
        averageTime: Math.round(averageTime),
        slowestOperation: {
          operation: sortedByDuration[0]?.operation || 'none',
          duration: sortedByDuration[0]?.duration || 0
        },
        fastestOperation: {
          operation: sortedByDuration[sortedByDuration.length - 1]?.operation || 'none',
          duration: sortedByDuration[sortedByDuration.length - 1]?.duration || 0
        },
        budgetViolations: totalBudgetViolations
      },
      byOperation: operationStats,
      recommendations
    };
  }

  /**
   * Categorize operation for budget assignment
   */
  private static categorizeOperation(operation: string): string {
    if (operation.includes('search')) return 'search';
    if (operation.includes('create') || operation.includes('update') || operation.includes('delete')) return 'crud';
    if (operation.includes('batch')) return 'batch';
    if (operation.includes('attribute')) return 'attributes';
    if (operation.includes('pagination') || operation.includes('offset')) return 'pagination';
    if (operation.includes('filter') || operation.includes('field')) return 'filtering';
    return 'search'; // Default to search budget
  }

  /**
   * Generate performance recommendations
   */
  private static generateRecommendations(stats: Map<string, any>): string[] {
    const recommendations: string[] = [];
    
    for (const [operation, data] of stats) {
      if (data.budgetViolations > 0) {
        const violationRate = (data.budgetViolations / data.count) * 100;
        recommendations.push(
          `🔴 ${operation}: ${data.budgetViolations}/${data.count} operations (${violationRate.toFixed(1)}%) exceeded budget. ` +
          `Average: ${data.averageTime}ms, Max: ${data.maxTime}ms`
        );
      } else if (data.averageTime > this.getPerformanceBudget(this.categorizeOperation(operation)) * 0.8) {
        recommendations.push(
          `🟠 ${operation}: Approaching budget limit. Average: ${data.averageTime}ms`
        );
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ All operations performing within budget limits');
    }
    
    return recommendations;
  }

  /**
   * Reset measurements (useful for test isolation)
   */
  static reset(): void {
    this.measurements = [];
  }

  /**
   * Export measurements for analysis
   */
  static exportMeasurements(): string {
    return JSON.stringify(this.measurements, null, 2);
  }
}
```

### 3. Integration with E2E Tests

Performance monitoring is integrated into all E2E tests:

```typescript
describe('Universal Tools Performance', () => {
  beforeAll(() => {
    E2EPerformanceMonitor.reset();
  });

  afterAll(() => {
    const report = E2EPerformanceMonitor.generateReport();
    console.log('\n📊 Performance Test Report:');
    console.log(`Total Operations: ${report.summary.totalOperations}`);
    console.log(`Average Time: ${report.summary.averageTime}ms`);
    console.log(`Budget Violations: ${report.summary.budgetViolations}`);
    
    if (report.summary.budgetViolations > 0) {
      console.log('\n🔍 Performance Recommendations:');
      report.recommendations.forEach(rec => console.log(`  ${rec}`));
    }
  });

  it('should search companies within budget', async () => {
    const response = await E2EPerformanceMonitor.measureOperation(
      'universal-tools',
      'search-companies',
      () => callUniversalTool('search-records', {
        resource_type: 'companies',
        query: 'tech',
        limit: 25
      }),
      { resourceType: 'companies', recordCount: 25 }
    );

    E2EAssertions.expectOptimalPerformance(response, 1000);
  });

  it('should handle batch operations efficiently', async () => {
    const batchRecords = Array.from({ length: 10 }, (_, i) => ({
      values: { name: [{ value: `Batch Company ${i}` }] }
    }));

    const response = await E2EPerformanceMonitor.measureOperation(
      'universal-tools',
      'batch-create-companies',
      () => callUniversalTool('batch-operations', {
        resource_type: 'companies',
        operation_type: 'create',
        records: batchRecords
      }),
      { resourceType: 'companies', recordCount: batchRecords.length }
    );

    E2EAssertions.expectOptimalPerformance(response, 3000);
  });
});
```

## 🔍 Performance Analysis

### Identifying Performance Bottlenecks

#### 1. **API Response Time Analysis**

```typescript
// Analyze API vs. processing time
const apiTimer = Date.now();
const rawApiResponse = await attioClient.get('/objects/companies');
const apiTime = Date.now() - apiTimer;

const processingTimer = Date.now();
const formattedResponse = formatCompanyResponse(rawApiResponse);
const processingTime = Date.now() - processingTimer;

console.log(`API Time: ${apiTime}ms, Processing Time: ${processingTime}ms`);
```

#### 2. **Resource Type Performance Comparison**

```typescript
const resourceTypes = ['companies', 'people', 'tasks', 'deals'];
const performanceComparison = {};

for (const resourceType of resourceTypes) {
  const times = [];
  
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    await callUniversalTool('search-records', {
      resource_type: resourceType,
      query: 'test',
      limit: 10
    });
    times.push(Date.now() - start);
  }
  
  performanceComparison[resourceType] = {
    average: times.reduce((a, b) => a + b, 0) / times.length,
    min: Math.min(...times),
    max: Math.max(...times)
  };
}

console.table(performanceComparison);
```

#### 3. **Pagination Performance Impact**

```typescript
const paginationPerformance = [];
const offsets = [0, 10, 50, 100, 500];

for (const offset of offsets) {
  const start = Date.now();
  await callUniversalTool('search-records', {
    resource_type: 'companies',
    query: 'test',
    limit: 10,
    offset
  });
  const duration = Date.now() - start;
  
  paginationPerformance.push({ offset, duration });
}

// Analyze if pagination overhead increases with offset
const baseTime = paginationPerformance[0].duration;
paginationPerformance.forEach(({ offset, duration }) => {
  const overhead = duration - baseTime;
  console.log(`Offset ${offset}: ${duration}ms (+${overhead}ms overhead)`);
});
```

### Performance Optimization Strategies

#### 1. **Query Optimization**

```typescript
// ❌ Inefficient: Broad queries without limits
const inefficientSearch = await callUniversalTool('search-records', {
  resource_type: 'companies',
  query: 'a'  // Too broad, returns many results
});

// ✅ Efficient: Specific queries with reasonable limits
const efficientSearch = await callUniversalTool('search-records', {
  resource_type: 'companies',
  query: 'tech startup',
  limit: 25,
  fields: ['name', 'domains']  // Only needed fields
});
```

#### 2. **Batch Operation Sizing**

```typescript
// Find optimal batch size for your workspace
const batchSizes = [1, 5, 10, 25, 50];
const batchPerformance = {};

for (const batchSize of batchSizes) {
  const records = Array.from({ length: batchSize }, (_, i) => ({
    values: { name: [{ value: `Test Company ${i}` }] }
  }));
  
  const start = Date.now();
  await callUniversalTool('batch-operations', {
    resource_type: 'companies',
    operation_type: 'create',
    records
  });
  const duration = Date.now() - start;
  
  batchPerformance[batchSize] = {
    totalTime: duration,
    timePerRecord: duration / batchSize
  };
}

// Find sweet spot where timePerRecord is minimized
console.table(batchPerformance);
```

#### 3. **Field Selection Impact**

```typescript
// Measure impact of field selection on response time
const allFieldsStart = Date.now();
const allFieldsResponse = await callUniversalTool('get-record-details', {
  resource_type: 'companies',
  record_id: testCompanyId
});
const allFieldsTime = Date.now() - allFieldsStart;

const selectedFieldsStart = Date.now();
const selectedFieldsResponse = await callUniversalTool('get-record-details', {
  resource_type: 'companies',
  record_id: testCompanyId,
  fields: ['name', 'domains']
});
const selectedFieldsTime = Date.now() - selectedFieldsStart;

const fieldSelectionSavings = allFieldsTime - selectedFieldsTime;
console.log(`Field selection saved ${fieldSelectionSavings}ms (${((fieldSelectionSavings / allFieldsTime) * 100).toFixed(1)}%)`);
```

## 📈 Performance Regression Detection

### Automated Performance Monitoring

#### 1. **CI/CD Integration**

```yaml
# GitHub Actions performance monitoring
name: Performance Tests
on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - name: Run E2E Performance Tests
        run: |
          npm run e2e > performance-results.log 2>&1
          
          # Extract performance violations
          VIOLATIONS=$(grep "Performance Critical" performance-results.log | wc -l)
          echo "Performance violations: $VIOLATIONS"
          
          if [ "$VIOLATIONS" -gt 0 ]; then
            echo "❌ Performance regression detected!"
            grep "Performance Critical" performance-results.log
            exit 1
          fi
          
          echo "✅ All performance tests passed"

      - name: Archive Performance Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: performance-results
          path: performance-results.log
```

#### 2. **Performance Baseline Tracking**

```typescript
// Store performance baselines for comparison
interface PerformanceBaseline {
  operation: string;
  resourceType: string;
  averageTime: number;
  maxTime: number;
  recordCount: number;
  timestamp: string;
  environment: string;
}

class PerformanceBaselines {
  private static baselines: Map<string, PerformanceBaseline> = new Map();

  static recordBaseline(
    operation: string, 
    resourceType: string, 
    times: number[], 
    recordCount: number
  ): void {
    const key = `${operation}-${resourceType}`;
    const baseline: PerformanceBaseline = {
      operation,
      resourceType,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      maxTime: Math.max(...times),
      recordCount,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    this.baselines.set(key, baseline);
  }

  static checkRegression(
    operation: string, 
    resourceType: string, 
    currentTime: number
  ): {
    isRegression: boolean;
    regressionPercentage?: number;
    baseline?: PerformanceBaseline;
  } {
    const key = `${operation}-${resourceType}`;
    const baseline = this.baselines.get(key);
    
    if (!baseline) {
      return { isRegression: false };
    }
    
    const regressionThreshold = 1.25; // 25% increase considered regression
    const regressionPercentage = (currentTime / baseline.averageTime);
    
    return {
      isRegression: regressionPercentage > regressionThreshold,
      regressionPercentage: (regressionPercentage - 1) * 100,
      baseline
    };
  }
}
```

#### 3. **Performance Alerting**

```typescript
// Automated performance alerting
class PerformanceAlerting {
  static checkCriticalPerformance(measurements: any[]): {
    criticalIssues: string[];
    warnings: string[];
  } {
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    
    for (const measurement of measurements) {
      const { operation, duration } = measurement;
      const budget = E2EPerformanceMonitor.getPerformanceBudget(
        E2EPerformanceMonitor.categorizeOperation(operation)
      );
      
      if (duration > budget * 2) {
        criticalIssues.push(
          `🔴 CRITICAL: ${operation} took ${duration}ms (${((duration / budget - 1) * 100).toFixed(1)}% over budget)`
        );
      } else if (duration > budget * 1.5) {
        warnings.push(
          `🟠 WARNING: ${operation} took ${duration}ms (${((duration / budget - 1) * 100).toFixed(1)}% over budget)`
        );
      }
    }
    
    return { criticalIssues, warnings };
  }

  static async sendSlackAlert(issues: string[]): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL || issues.length === 0) return;
    
    const message = {
      text: `Performance Issues Detected in Attio MCP Server`,
      attachments: [{
        color: 'danger',
        fields: [{
          title: 'Performance Issues',
          value: issues.join('\n'),
          short: false
        }]
      }]
    };
    
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }
}
```

## 🎛️ Performance Configuration

### Environment-Specific Settings

```typescript
// Performance configuration by environment
const performanceConfig = {
  development: {
    budgets: {
      search: 1000,
      crud: 1500,
      batch: 3000,
      attributes: 800,
      pagination: 200,
      filtering: 500
    },
    alertThresholds: {
      warning: 1.2,  // 20% over budget
      critical: 1.5  // 50% over budget
    }
  },
  ci: {
    budgets: {
      search: 3000,
      crud: 4000,
      batch: 8000,
      attributes: 2500,
      pagination: 500,
      filtering: 1000
    },
    alertThresholds: {
      warning: 1.5,  // 50% over budget (more lenient in CI)
      critical: 2.0  // 100% over budget
    }
  },
  production: {
    budgets: {
      search: 800,   // Stricter in production
      crud: 1200,
      batch: 2500,
      attributes: 600,
      pagination: 150,
      filtering: 400
    },
    alertThresholds: {
      warning: 1.1,  // 10% over budget
      critical: 1.25 // 25% over budget
    }
  }
};

export function getPerformanceConfig() {
  const env = process.env.NODE_ENV || 'development';
  return performanceConfig[env as keyof typeof performanceConfig] || performanceConfig.development;
}
```

### Custom Performance Budgets

```typescript
// Workspace-specific performance tuning
interface WorkspacePerformanceProfile {
  workspaceId: string;
  name: string;
  budgetMultipliers: {
    search: number;
    crud: number;
    batch: number;
  };
  specialConsiderations: string[];
}

const workspaceProfiles: WorkspacePerformanceProfile[] = [
  {
    workspaceId: 'large-enterprise',
    name: 'Large Enterprise Workspace',
    budgetMultipliers: {
      search: 1.5,  // 50% more time for large datasets
      crud: 1.3,    // 30% more time for complex validation
      batch: 1.8    // 80% more time for large batches
    },
    specialConsiderations: [
      'Large data volumes require increased timeouts',
      'Complex custom fields slow down operations',
      'Heavy API usage may trigger rate limiting'
    ]
  },
  {
    workspaceId: 'startup',
    name: 'Startup Workspace',
    budgetMultipliers: {
      search: 0.8,  // 20% faster for smaller datasets
      crud: 0.9,    // 10% faster with simpler schema
      batch: 0.7    // 30% faster with smaller batches
    },
    specialConsiderations: [
      'Smaller data volumes allow tighter budgets',
      'Simple schemas process faster',
      'Lower concurrent usage'
    ]
  }
];

export function getWorkspacePerformanceBudget(
  operationType: string, 
  workspaceId?: string
): number {
  const baseConfig = getPerformanceConfig();
  const baseBudget = baseConfig.budgets[operationType as keyof typeof baseConfig.budgets];
  
  if (!workspaceId) return baseBudget;
  
  const profile = workspaceProfiles.find(p => p.workspaceId === workspaceId);
  if (!profile) return baseBudget;
  
  const multiplier = profile.budgetMultipliers[operationType as keyof typeof profile.budgetMultipliers] || 1;
  return Math.round(baseBudget * multiplier);
}
```

## 🔧 Performance Troubleshooting

### Common Performance Issues

#### 1. **Network Latency**

```typescript
// Diagnose network vs. processing time
async function diagnoseNetworkLatency() {
  const networkTests = [];
  
  // Test different API endpoints
  const endpoints = [
    '/objects/companies/attributes',
    '/objects/people/attributes', 
    '/workspace-members'
  ];
  
  for (const endpoint of endpoints) {
    const start = Date.now();
    try {
      await attioClient.get(endpoint);
      networkTests.push({
        endpoint,
        latency: Date.now() - start,
        status: 'success'
      });
    } catch (error) {
      networkTests.push({
        endpoint,
        latency: Date.now() - start,
        status: 'error',
        error: error.message
      });
    }
  }
  
  const averageLatency = networkTests
    .filter(t => t.status === 'success')
    .reduce((sum, t) => sum + t.latency, 0) / 
    networkTests.filter(t => t.status === 'success').length;
    
  console.log('Network Latency Analysis:');
  console.table(networkTests);
  console.log(`Average API latency: ${averageLatency.toFixed(0)}ms`);
  
  if (averageLatency > 500) {
    console.log('🔴 High network latency detected. Consider:');
    console.log('  - Testing from different geographic location');
    console.log('  - Checking internet connection stability');
    console.log('  - Using performance budgets appropriate for your network');
  }
}
```

#### 2. **Large Dataset Performance**

```typescript
// Analyze performance vs. dataset size
async function analyzeLargeDatasetPerformance() {
  const limits = [10, 25, 50, 100, 250];
  const results = [];
  
  for (const limit of limits) {
    const start = Date.now();
    const response = await callUniversalTool('search-records', {
      resource_type: 'companies',
      query: 'test',
      limit
    });
    
    const duration = Date.now() - start;
    const recordsReturned = response.content?.[0]?.text?.match(/\d+ records/)?.[0] || 'unknown';
    
    results.push({
      requestedLimit: limit,
      actualRecords: recordsReturned,
      duration,
      timePerRecord: recordsReturned === 'unknown' ? 0 : duration / parseInt(recordsReturned)
    });
  }
  
  console.log('Dataset Size Performance Analysis:');
  console.table(results);
  
  // Find optimal limit where time per record is minimized
  const optimalLimit = results
    .filter(r => r.timePerRecord > 0)
    .sort((a, b) => a.timePerRecord - b.timePerRecord)[0];
    
  if (optimalLimit) {
    console.log(`📊 Optimal limit for your workspace: ${optimalLimit.requestedLimit} (${optimalLimit.timePerRecord.toFixed(1)}ms per record)`);
  }
}
```

#### 3. **Memory and Response Size Impact**

```typescript
// Monitor memory usage and response sizes
function monitorResponseSizes() {
  const originalCallTool = callUniversalTool;
  
  // Wrap tool calls to monitor response sizes
  global.callUniversalTool = async function(...args) {
    const response = await originalCallTool.apply(this, args);
    
    if (response.content?.[0]?.text) {
      const responseSize = Buffer.byteLength(response.content[0].text, 'utf8');
      const responseSizeKB = (responseSize / 1024).toFixed(2);
      
      if (responseSize > 100 * 1024) { // > 100KB
        console.log(`📏 Large response detected: ${responseSizeKB}KB for ${args[0]}`);
      }
      
      // Add size metadata
      response._meta = {
        ...response._meta,
        responseSizeBytes: responseSize,
        responseSizeKB: parseFloat(responseSizeKB)
      };
    }
    
    return response;
  };
}
```

### Performance Optimization Recommendations

#### 1. **Workspace-Specific Optimization**

```typescript
// Generate workspace-specific recommendations
async function generateOptimizationRecommendations() {
  const diagnostics = {
    recordCounts: {},
    attributeCounts: {},
    averageResponseSizes: {},
    networkLatency: 0
  };
  
  // Gather workspace diagnostics
  const resourceTypes = ['companies', 'people', 'tasks'];
  
  for (const resourceType of resourceTypes) {
    // Count records
    const searchResponse = await callUniversalTool('search-records', {
      resource_type: resourceType,
      query: '',
      limit: 1
    });
    
    diagnostics.recordCounts[resourceType] = extractRecordCount(searchResponse);
    
    // Count attributes
    const attributesResponse = await callUniversalTool('discover-attributes', {
      resource_type: resourceType
    });
    
    diagnostics.attributeCounts[resourceType] = extractAttributeCount(attributesResponse);
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  for (const [resourceType, recordCount] of Object.entries(diagnostics.recordCounts)) {
    if (recordCount > 10000) {
      recommendations.push(
        `📊 ${resourceType}: Large dataset (${recordCount} records). ` +
        `Consider using smaller limits (≤25) and specific queries for better performance.`
      );
    }
    
    if (diagnostics.attributeCounts[resourceType] > 50) {
      recommendations.push(
        `🏷️  ${resourceType}: Many custom attributes (${diagnostics.attributeCounts[resourceType]}). ` +
        `Use field filtering to improve response times.`
      );
    }
  }
  
  return recommendations;
}
```

## 📚 Best Practices Summary

### 1. **Performance Testing Strategy**
- **Test Early**: Include performance assertions in all E2E tests
- **Use Realistic Data**: Test with workspace-appropriate data volumes
- **Monitor Trends**: Track performance over time, not just point-in-time tests
- **Environment-Specific**: Use different budgets for local vs. CI/CD environments

### 2. **Optimization Techniques**
- **Query Specificity**: Use specific queries rather than broad searches
- **Field Selection**: Request only needed fields to reduce response size
- **Appropriate Limits**: Use reasonable limits based on UI requirements
- **Batch Sizing**: Find optimal batch sizes for your workspace

### 3. **Monitoring and Alerting**
- **Automated Monitoring**: Include performance checks in CI/CD pipelines
- **Regression Detection**: Compare against historical performance baselines
- **Alert Thresholds**: Set appropriate warning and critical thresholds
- **Actionable Alerts**: Include specific recommendations in performance alerts

### 4. **Troubleshooting Approach**
- **Isolate Variables**: Test network vs. processing vs. data volume impacts
- **Measure Everything**: Track not just response times but also sizes and resource usage
- **Document Patterns**: Record workspace-specific performance characteristics
- **Iterative Optimization**: Make incremental improvements and measure impact

This performance testing framework ensures that the Attio MCP Server maintains optimal performance for real-world usage while providing comprehensive monitoring and optimization guidance for different workspace configurations.