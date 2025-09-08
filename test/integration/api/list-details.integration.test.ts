/**
 * End-to-end tests for get-list-details API interaction
 *
 * This test will use the real Attio API if SKIP_INTEGRATION_TESTS is not set
 * and ATTIO_API_KEY is provided
 */
import { describe, test, expect, beforeAll } from 'vitest';

import { executeToolRequest } from '../../../src/handlers/tools/dispatcher/core.js';
import { getListDetails } from '../../../src/objects/lists.js';
import { initializeAttioClient } from '../../../src/api/attio-client.js';

// Test config
  process.env.TEST_LIST_ID || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('get-list-details API test', () => {
    process.env.SKIP_INTEGRATION_TESTS === 'true' || !process.env.ATTIO_API_KEY;

  beforeAll(() => {
    if (!shouldSkip) {
      initializeAttioClient(process.env.ATTIO_API_KEY as string);
      console.log('Running Attio API integration tests with real API key');
    } else {
      console.log('Skipping Attio API integration tests (SKIP_INTEGRATION_TESTS=true or no ATTIO_API_KEY)');
    }
  });

  conditionalTest.skip(
    'should fetch list details directly from API',
    async () => {
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
        method: 'tools/call' as const,
        params: {
          name: 'get-record-details',
          arguments: {
            resource_type: 'lists',
            record_id: TEST_LIST_ID,
          },
        },
      };

      expect(response).toBeDefined();
      expect(response.isError).toBeFalsy();
      expect(response.content).toBeDefined();
      expect(response.content[0].type).toBe('text');
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
        method: 'tools/call' as const,
        params: {
          name: 'get-record-details',
          arguments: {
            resource_type: 'lists',
            record_id: nonExistentId,
          },
        },
      };

      expect(response).toBeDefined();
      expect(response.isError).toBeTruthy();
      console.log('Full Error Response:', JSON.stringify(response, null, 2));
    },
    TIMEOUT
  );
});

