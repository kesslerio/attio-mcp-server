import { defineConfig } from 'vitest/config';
import integration from './vitest.config.integration.ts';

/** Real Attio API smoke. test:smoke remains the separate mocked unit tier. */
export default defineConfig({
  ...integration,
  test: {
    ...integration.test,
    // Replace, rather than concatenate, the full tier's discovery list.
    include: [
      'test/integration/api/IT-101-advanced-search-api.integration.test.ts',
      'test/integration/core/IT-001-batch-company-operations.integration.test.ts',
      'test/integration/api/IT-106-attribute-validation.integration.test.ts',
      'test/integration/list-access-control.integration.test.ts',
    ],
    testNamePattern:
      /IT-101\.[12]:|IT-001\.1:|IT-106\.1:|creates a list with default full-access workspace configuration$/,
    retry: 0,
    testTimeout: 20000,
    hookTimeout: 30000,
    coverage: { enabled: false },
  },
});
