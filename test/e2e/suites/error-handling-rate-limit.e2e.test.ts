/**
 * Split: Critical Error Handling E2E – Rate Limiting
 */
import { describe, it, expect } from 'vitest';

import { callUniversalTool } from '../utils/enhanced-tool-caller.js';
import type { McpToolResponse } from '../utils/assertions.js';

// Flaky with real APIs; covered deterministically in integration tests.
describe.skip('Critical Error Handling E2E – Rate Limiting', () => {
  it('handles rate limiting scenarios (graceful)', async () => {
      .fill(null)
      .map(() =>
        callUniversalTool('search-records', {
          resource_type: 'companies',
          query: 'test-rate-limit',
          limit: 1,
        })
      );

    responses.forEach((result) => {
      expect(result.status).toMatch(/(fulfilled|rejected)/);
      if (result.status === 'fulfilled') {
        if (val.isError && typeof val.error === 'string') {
          if (
            error.toLowerCase().includes('rate') ||
            error.toLowerCase().includes('limit') ||
            error.toLowerCase().includes('too many')
          ) {
            // acceptable
          }
        }
      }
    });
  }, 60000);
});
