/**
 * Split: Critical Error Handling E2E – Authentication & Authorization
 */
import { describe, it, expect } from 'vitest';
import { callUniversalTool } from '../utils/enhanced-tool-caller.js';
import type { McpToolResponse } from '../utils/assertions.js';

describe.skipIf(!process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true')('Critical Error Handling E2E – Auth & Authorization', () => {
  it('handles authentication-like failures gracefully', async () => {
    const response = (await callUniversalTool('search-records', {
      resource_type: 'companies',
      query: '',
      limit: 1,
    })) as McpToolResponse;

    expect(response).toBeDefined();
    if (response.isError) {
      expect(response.error).toMatch(/(auth|permission|unauthorized|forbidden|invalid|validation)/i);
    }
  }, 60000);
});

