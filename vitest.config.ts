import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.js'],
    exclude: [
      // Exclude integration tests from default config - use vitest.config.integration.ts instead
      'test/integration/**/*.test.ts',
      'test/handlers/tool-configs/universal/integration.test.ts',
      'test/handlers/tool-configs/universal/performance.test.ts',
    ],
    globals: true,
    testTimeout: 30_000,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,js}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,js}',
        'src/**/*.spec.{ts,js}',
        'src/types/**',
        'src/**/types.ts',
        'src/index.ts',
      ],
      thresholds: {
        statements: 5,
        branches: 5,
        functions: 10,
        lines: 5,
      },
      all: true,
      clean: true,
    },
  },
  resolve: {
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
