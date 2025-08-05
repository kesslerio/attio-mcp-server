import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'test/handlers/tool-configs/universal/integration.test.ts',
      'test/handlers/tool-configs/universal/performance.test.ts',
    ],
    globals: true,
    testTimeout: 60_000, // Extended timeout for API calls
    // No setupFiles - avoid global mocks for integration tests
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 1, // Single fork for API rate limiting
      },
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
    reporter: 'verbose',
  },
  resolve: {
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
