/**
 * End-to-end tests for get-list-details API interaction
 *
 * This test will use the real Attio API if SKIP_INTEGRATION_TESTS is not set
 * and ATTIO_API_KEY is provided
 */
import { describe, test, expect, beforeAll } from 'vitest';
import { initializeAttioClient } from '../../../src/api/attio-client.js';
import { getListDetails } from '../../../src/objects/lists.js';
import { executeToolRequest } from '../../../src/handlers/tools/dispatcher/core.js';

// Test config
const TIMEOUT = 30000; // 30 seconds timeout for API tests
const TEST_LIST_ID =
  process.env.TEST_LIST_ID || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('get-list-details API test', () => {
  const shouldSkip =
    process.env.SKIP_INTEGRATION_TESTS === 'true' || !process.env.ATTIO_API_KEY;
  const conditionalTest = shouldSkip ? test.skip : test;

  beforeAll(() => {
    if (!shouldSkip) {
      initializeAttioClient(process.env.ATTIO_API_KEY as string);
      console.log('Running Attio API integration tests with real API key');
    } else {
      console.log(
        'Skipping Attio API integration tests (SKIP_INTEGRATION_TESTS=true or no ATTIO_API_KEY)'
      );
    }
  });

  conditionalTest.skip(
    'should fetch list details directly from API',
    async () => {
      const result = await getListDetails(TEST_LIST_ID);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.id.list_id).toBeDefined();
      expect(typeof result.id.list_id).toBe('string');
      expect(result.title || result.name).toBeDefined();
      expect(result.object_slug).toBeDefined();
      console.log('API Response:', JSON.stringify(result, null, 2));
    },
    TIMEOUT
  );

  conditionalTest(
    'should format list details through MCP tool',
    async () => {
      const mockRequest = {
        method: 'tools/call' as const,
        params: {
          name: 'get-record-details',
          arguments: {
            resource_type: 'lists',
            record_id: TEST_LIST_ID,
          },
        },
      };

      const response = (await executeToolRequest(mockRequest)) as any;
      expect(response).toBeDefined();
      expect(response.isError).toBeFalsy();
      expect(response.content).toBeDefined();
      expect(response.content[0].type).toBe('text');
      const textContent = response.content[0].text as string;
      expect(textContent).toContain('List:');
      expect(textContent).toContain('ID:');
      expect(textContent).toContain(TEST_LIST_ID);
      console.log('Formatted Response:', textContent);
    },
    TIMEOUT
  );

  conditionalTest(
    'should handle non-existent list ID',
    async () => {
      const nonExistentId = crypto.randomUUID();
      const mockRequest = {
        method: 'tools/call' as const,
        params: {
          name: 'get-record-details',
          arguments: {
            resource_type: 'lists',
            record_id: nonExistentId,
          },
        },
      };

      const response = (await executeToolRequest(mockRequest)) as any;
      expect(response).toBeDefined();
      expect(response.isError).toBeTruthy();
      console.log('Full Error Response:', JSON.stringify(response, null, 2));
    },
    TIMEOUT
  );
});
