import { defineConfig } from 'vitest/config';
import { aliasEntries } from './aliases.ts';

/**
 * Vitest configuration for MCP E2E tests
 * These tests interact with the real Attio API and require longer timeouts
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/e2e/mcp/**/*.test.ts'],
    globals: true,
    testTimeout: 60000, // 60s for API operations
    hookTimeout: 120000, // 2 min for setup/teardown
    setupFiles: ['./test/setup.ts'],
    reporters: ['verbose'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run tests sequentially to avoid API rate limits
      },
    },
    // Retry flaky tests once
    retry: 1,
  },
  resolve: {
    alias: aliasEntries,
  },
});
