/**
 * Split: Critical Error Handling E2E – Error Message Consistency
 */
import { describe, it, expect } from 'vitest';
import { loadE2EConfig } from '../utils/config-loader.js';
import {
  callUniversalTool,
  callTasksTool,
  callNotesTool,
  validateTestEnvironment,
} from '../utils/enhanced-tool-caller.js';
import { E2EAssertions, type McpToolResponse } from '../utils/assertions.js';
import { errorScenarios } from '../fixtures/index.js';

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Critical Error Handling E2E – Error Message Consistency', () => {
  it('should provide consistent error formats across tools', async () => {
    loadE2EConfig();
    await validateTestEnvironment();
    const errorResponses = await Promise.all([
      callUniversalTool('get-record-details', {
        resource_type: 'companies',
        record_id: errorScenarios.invalidIds.generic,
      }),
      callTasksTool('update-record', {
        resource_type: 'tasks',
        record_id: errorScenarios.invalidIds.task,
        record_data: { status: 'completed' },
      }),
      callNotesTool('list-notes', {
        resource_type: 'companies',
        record_id: errorScenarios.invalidIds.generic,
      }),
    ]);
    errorResponses.forEach((response, index) => {
      expect(response).toBeDefined();
      if ((response as McpToolResponse).isError) {
        expect((response as McpToolResponse).error).toBeDefined();
        expect(typeof (response as McpToolResponse).error).toBe('string');
      }
    });
  }, 60000);

  it('should provide helpful error messages', async () => {
    const response = (await callUniversalTool('create-record', {
      resource_type: 'people',
      record_data: { email_address: 'invalid-email-format' },
    })) as McpToolResponse;
    if (response.isError) {
      expect(response.error).toBeTruthy();
      expect(response.error.length).toBeGreaterThan(10);
    }
  }, 60000);
});
