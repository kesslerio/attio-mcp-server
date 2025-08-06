import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load environment variables from .env file for E2E tests
const envVars = config().parsed || {};

// Also load E2E-specific environment variables (if exists)
const e2eEnvVars = config({ path: '.env.e2e' }).parsed || {};

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/e2e/suites/**/*.e2e.test.ts', 'test/e2e/**/*.e2e.test.ts'],
    exclude: [
      // Exclude non-E2E tests
      'test/unit/**',
      'test/integration/**',
      'test/handlers/**',
      'test/api/**',
      'test/utils/**',
      'test/validators/**',
      'test/objects/**',
      'test/manual/**',
      // Exclude non-E2E test files but keep E2E files
      'test/**/!(*.e2e).test.ts',
      'test/**/!(*.e2e).test.js',
      // Keep only E2E tests (*.e2e.test.ts files)
    ],
    globals: true,
    testTimeout: 120000, // 2 minutes for E2E operations
    hookTimeout: 30000, // 30 seconds for setup/cleanup
    // No setupFiles - E2E tests handle their own setup
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 1, // Single fork for API rate limiting and data consistency
        singleFork: true, // Force sequential execution
      },
    },
    // Retry configuration for flaky E2E tests
    retry: 2, // Retry failed tests up to 2 times
    bail: 10, // Stop after 10 failures to avoid overwhelming the API

    // Environment variables for E2E tests
    env: {
      NODE_ENV: 'test',
      E2E_MODE: 'true',
      ...envVars,
      ...e2eEnvVars,
      // Ensure ATTIO_API_KEY is always passed through from any source
      ATTIO_API_KEY:
        process.env.ATTIO_API_KEY ||
        envVars.ATTIO_API_KEY ||
        e2eEnvVars.ATTIO_API_KEY,
    },

    // Coverage configuration for E2E tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage-e2e',
      include: [
        'src/**/*.{ts,js}',
        // Focus on code that E2E tests actually exercise
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,js}',
        'src/**/*.spec.{ts,js}',
        'src/types/**',
        'src/**/types.ts',
        'src/index.ts',
        // Exclude test utilities and mocks
        'src/test-utils/**',
        'src/**/*.mock.ts',
      ],
      // Lower thresholds for E2E coverage since we're testing real scenarios
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
      all: true,
      clean: true,
    },

    // Test isolation and cleanup
    isolate: true,
    sequence: {
      concurrent: false, // Run tests sequentially to avoid API conflicts
      shuffle: false, // Maintain test order for dependencies
    },

    // Reporting configuration
    silent: false,
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results/e2e-results.json',
    },

    // Watch configuration (disable for E2E by default)
    watch: false,

    // Test name pattern matching
    testNamePattern: undefined, // Run all E2E tests by default

    // File watching exclusions for performance
    watchExclude: [
      'node_modules/**',
      'dist/**',
      '.git/**',
      'coverage/**',
      'coverage-e2e/**',
      'test-results/**',
      '**/*.d.ts',
      // Exclude non-E2E test directories from watch
      'test/unit/**',
      'test/integration/**',
      'test/handlers/**',
      'test/api/**',
      'test/utils/**',
      'test/validators/**',
      'test/objects/**',
      'test/manual/**',
    ],

    // Global test configuration
    globalSetup: undefined, // E2E tests handle their own global setup
    setupFiles: ['./test/e2e/setup/env-loader.ts'], // Load env vars BEFORE test files

    // Performance optimizations
    minWorkers: 1,
    maxWorkers: 1,

    // Error handling
    dangerouslyIgnoreUnhandledErrors: false,
    passWithNoTests: false,

    // Debugging support
    inspect: false,
    inspectBrk: false,

    // Custom matchers and utilities
    typecheck: {
      enabled: false, // Skip typechecking for E2E tests (handled by build)
    },
  },

  // Module resolution
  resolve: {
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },

  // Define custom test environment for E2E
  define: {
    __E2E_MODE__: true,
    __TEST_ENV__: '"e2e"',
  },

  // Esbuild configuration for E2E tests
  esbuild: {
    target: 'node18',
    format: 'esm',
  },
});
