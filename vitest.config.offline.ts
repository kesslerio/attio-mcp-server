import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.js'],
    exclude: [
      'node_modules/**',
      'test/integration/real-api/**',
      'test/manual/**',
      'test/**/*.manual.*',
      'test/**/*real-api-integration*',
      'test/**/*claude-desktop-scenario*',
    ],
    globals: true,
    testTimeout: 10000,
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: '50%',
      },
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