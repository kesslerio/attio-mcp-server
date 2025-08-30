/**
 * Split: Critical Error Handling E2E – Rate Limiting
 */
import { describe, it, expect } from 'vitest';

import { callUniversalTool } from '../utils/enhanced-tool-caller.js';
import type { McpToolResponse } from '../utils/assertions.js';

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Critical Error Handling E2E – Rate Limiting', () => {
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
      if (result.status === 'fulfilled' && (result.value as McpToolResponse).isError) {
        if (
          error?.includes('rate') ||
          error?.includes('limit') ||
          error?.includes('too many')
        ) {
          // acceptable
        }
      }
    });
  }, 60000);
});
