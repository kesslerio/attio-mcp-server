import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.js'],
    globals: true,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,js}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.{ts,js}'],
    },
    watchExclude: [
      'node_modules/**',
      'dist/**',
      '.git/**',
      'coverage/**',
      '**/*.d.ts',
    ],
  },
  resolve: {
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});