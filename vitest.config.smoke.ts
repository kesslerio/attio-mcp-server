import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for smoke tests
 * Ultra-fast critical path validation in <30 seconds
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      // Critical path tests only - these must pass for basic functionality
      'test/services/UniversalCreateService.test.ts',
      'test/services/UniversalSearchService.test.ts',
      'test/api/advanced-search.test.ts',
      'test/utils/domain-utils.test.ts',
    ],
    exclude: [
      // Exclude slow integration tests
      'test/integration/**/*.test.ts',
      'test/e2e/**/*.test.ts',
      // Exclude performance tests
      'test/performance/**/*.test.ts',
    ],
    globals: true,
    testTimeout: 10000, // 10s max per test (shorter than default)
    hookTimeout: 5000, // 5s max for setup/teardown
    setupFiles: ['./test/setup.ts'],

    // Optimized for speed
    threads: false, // Single thread for predictable timing
    isolate: false, // Faster but less isolated

    // Minimal coverage for smoke tests
    coverage: {
      enabled: false, // Skip coverage in smoke tests for speed
    },

    // Fast reporter
    reporter: ['dot'],

    // Fail fast on first error
    bail: 1,
  },
  resolve: {
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});

