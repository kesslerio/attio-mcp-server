import { defineConfig } from 'vitest/config';
import { aliasEntries } from './configs/vitest/aliases.ts';

/**
 * Vitest config for debug/diagnostic tests
 * These tests are NOT run automatically in hooks/CI
 *
 * Run manually: npx vitest run --config vitest.config.debug.ts
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['debug-tests/**/*.test.ts'],
    exclude: [],
    globals: true,
    testTimeout: 300000, // 5 minutes for E2E debug tests
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: aliasEntries,
  },
});
