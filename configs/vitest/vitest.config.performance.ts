import { defineConfig } from 'vitest/config';
import { aliasEntries } from './aliases.ts';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'test/performance/**/*.test.ts',
      'test/handlers/tool-configs/universal/performance-*.test.ts',
    ],
    globals: true,
    testTimeout: 60000, // Longer timeout for performance tests
    setupFiles: ['./test/setup.ts'],
    // Performance tests should run sequentially to avoid interference
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  resolve: {
    alias: aliasEntries,
  },
});
