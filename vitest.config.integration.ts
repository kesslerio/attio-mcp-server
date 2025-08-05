import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Load environment variables from .env file for integration tests
config();

// Also load test-specific environment variables
config({ path: '.env.test' });

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'test/integration/**/*.test.ts',
      'test/handlers/tool-configs/universal/integration.test.ts',
      'test/handlers/tool-configs/universal/performance.test.ts',
    ],
    globals: true,
    testTimeout: 60000, // Extended timeout for API calls
    hookTimeout: 10000, // Extended timeout for setup/cleanup
    // No setupFiles - avoid global mocks for integration tests
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 1, // Single fork for API rate limiting
        singleFork: true, // Force sequential execution
      },
    },
    // Retry failed tests once for API flakiness
    retry: 1,
    // Environment variables
    env: {
      NODE_ENV: 'test',
      // ATTIO_API_KEY loaded from .env via dotenv
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      reportsDirectory: './coverage-integration',
      include: ['src/**/*.{ts,js}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,js}',
        'src/**/*.spec.{ts,js}',
        'src/types/**',
        'src/**/types.ts',
        'src/index.ts',
      ],
    },
    silent: false,
    reporters: 'verbose',
  },
  resolve: {
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
