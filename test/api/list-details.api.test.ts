/**
 * End-to-end tests for get-list-details API interaction
 *
 * This test will use the real Attio API if SKIP_INTEGRATION_TESTS is not set
 * and ATTIO_API_KEY is provided
 */
import { beforeAll, describe, expect, test } from 'vitest';
import { initializeAttioClient } from '../../src/api/attio-client';
import { executeToolRequest } from '../../src/handlers/tools/dispatcher';
import { getListDetails } from '../../src/objects/lists';

// Test config
const TIMEOUT = 30_000; // 30 seconds timeout for API tests
const TEST_LIST_ID = process.env.TEST_LIST_ID || 'default-test-list-id';

describe('get-list-details API test', () => {
  // Skip all tests if SKIP_INTEGRATION_TESTS is set or no API key
  const shouldSkip =
    process.env.SKIP_INTEGRATION_TESTS === 'true' || !process.env.ATTIO_API_KEY;

  // Conditional Vitest test that respects the SKIP_INTEGRATION_TESTS flag
  const conditionalTest = shouldSkip ? test.skip : test;

  beforeAll(() => {
    if (shouldSkip) {
      console.log(
        'Skipping Attio API integration tests (SKIP_INTEGRATION_TESTS=true or no ATTIO_API_KEY)'
      );
    } else {
      // Initialize the API client with the actual API key
      initializeAttioClient(process.env.ATTIO_API_KEY as string);

      // Log so we know tests are running
      console.log('Running Attio API integration tests with real API key');
    }
  });

  conditionalTest(
    'should fetch list details directly from API',
    async () => {
      // This test will be skipped if shouldSkip is true
      const result = await getListDetails(TEST_LIST_ID);

      // Verify we got a valid list response
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.id.list_id).toBeDefined();
      expect(typeof result.id.list_id).toBe('string');

      // Expect some common fields
      expect(result.title || result.name).toBeDefined();
      expect(result.object_slug).toBeDefined();

      // Log the result for debugging
      console.log('API Response:', JSON.stringify(result, null, 2));
    },
    TIMEOUT
  );

  conditionalTest(
    'should format list details through MCP tool',
    async () => {
      // Create a mock request for the MCP tool
      const mockRequest = {
        method: 'tools/call' as const,
        params: {
          name: 'get-list-details',
          arguments: {
            listId: TEST_LIST_ID,
          },
        },
      };

      // Execute the request through the MCP tool
      const response = await executeToolRequest(mockRequest);

      // Check the basic response structure
      expect(response).toBeDefined();
      expect(response.isError).toBeFalsy();
      expect(response.content).toBeDefined();
      expect(response.content[0].type).toBe('text');

      // Verify the content contains the expected sections
      const textContent = response.content[0].text;
      expect(textContent).toContain('List Details:');
      expect(textContent).toContain('ID:');
      expect(textContent).toContain('Name:');
      expect(textContent).toContain('Object Type:');

      // Log the formatted response for debugging
      console.log('Formatted Response:', textContent);
    },
    TIMEOUT
  );

  conditionalTest(
    'should handle non-existent list ID',
    async () => {
      // Try to fetch a non-existent list
      const nonExistentId = 'non-existent-list-' + Date.now();

      // Create a mock request
      const mockRequest = {
        method: 'tools/call' as const,
        params: {
          name: 'get-list-details',
          arguments: {
            listId: nonExistentId,
          },
        },
      };

      // Execute the request and expect an error
      const response = await executeToolRequest(mockRequest);

      // Check error response
      expect(response).toBeDefined();
      expect(response.isError).toBeTruthy();
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(404);
      expect(response.error.type).toBe('not_found_error');

      // Log the error response for debugging
      console.log('Error Response:', JSON.stringify(response.error, null, 2));
    },
    TIMEOUT
  );
});
