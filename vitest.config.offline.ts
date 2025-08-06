import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.js'],
    exclude: [
      'node_modules/**',
      'test/integration/**/*.test.ts',
      'test/handlers/tool-configs/universal/integration.test.ts',
      'test/handlers/tool-configs/universal/performance.test.ts',
      'test/manual/**',
      'test/**/*.manual.*',
      'test/**/*real-api-integration*',
      'test/**/*claude-desktop-scenario*',
    ],
    globals: true,
    testTimeout: 10_000,
    setupFiles: ['./test/setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: '50%',
      },
    },
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
    silent: false,
    reporters: ['verbose'],
    watchExclude: [
      'node_modules/**',
      'dist/**',
      '.git/**',
      'coverage/**',
      '**/*.d.ts',
      'test/integration/real-api/**',
      'test/manual/**',
    ],
  },
  resolve: {
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
