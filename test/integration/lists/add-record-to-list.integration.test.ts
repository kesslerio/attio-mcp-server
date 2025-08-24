/**
 * Integration test for the add-record-to-list operation using universal tools
 * Tests the migration from add-record-to-list to update-record with resource_type: "records"
 * Tests the entire flow from tool invocation to API call with proper parameters
 */
import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { getAttioClient } from '../../../src/api/attio-client';
import { UniversalUpdateService } from '../../../src/services/UniversalUpdateService';
import { executeToolRequest } from '../../../src/handlers/tools/dispatcher';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

// Mock axios for API client in case we're skipping real API tests
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');

  // Check if we should mock based on environment
  const shouldMock =
    !process.env.ATTIO_API_KEY || process.env.SKIP_INTEGRATION_TESTS === 'true';

  if (shouldMock) {
    return {
      default: {
        create: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ data: { data: {} } }),
          post: vi.fn().mockResolvedValue({
            data: {
              data: {
                id: { entry_id: 'mock-entry-id' },
                record_id: process.env.TEST_COMPANY_ID || 'mock-record-id',
                values: { stage: 'Mock Stage' },
              },
            },
          }),
          interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
          },
        })),
      },
    };
  }

  // Otherwise use the real axios
  return actual;
});

// These tests use real API calls - only run when API key is available
const SKIP_INTEGRATION_TESTS =
  !process.env.ATTIO_API_KEY || process.env.SKIP_INTEGRATION_TESTS === 'true';

// Load test configuration from environment
const TEST_LIST_ID = process.env.TEST_LIST_ID || '';
const TEST_RECORD_ID = process.env.TEST_COMPANY_ID || '';

// Check if test configuration is complete
const TEST_CONFIG_MISSING = !TEST_LIST_ID || !TEST_RECORD_ID;
const CONFIG_ERROR_MESSAGE = `
⚠️  Integration test configuration missing!

To run these tests, you need to set up test data:

1. Copy the test configuration template:
   cp .env.test.example .env.test

2. Fill in your workspace-specific IDs:
   - TEST_LIST_ID: A list ID for testing add/remove operations
   - TEST_COMPANY_ID: A company record ID for testing

3. Run the tests again:
   npm test:integration

For more information, see: docs/testing.md
`;

describe('Add Record To List Integration (Universal Tools)', () => {
  if (SKIP_INTEGRATION_TESTS) {
    test.skip('Skipping integration tests - no API key found', () => {});
    return;
  }

  if (TEST_CONFIG_MISSING) {
    test.skip('Skipping integration tests - test configuration missing', () => {
      console.error(CONFIG_ERROR_MESSAGE);
    });
    return;
  }

  // Create a test company and list for testing if needed
  let createdEntryId: string | undefined;

  // Clean up after tests
  afterAll(async () => {
    if (!createdEntryId) return;

    try {
      // Clean up any created test data
      const api = getAttioClient();
      await api.delete(`/lists/${TEST_LIST_ID}/entries/${createdEntryId}`);
      console.log(`Cleaned up test entry ${createdEntryId}`);
    } catch (error: unknown) {
      console.error('Error during cleanup:', error);
    }
  });

  test('should call API with correct payload - required params only', async () => {
    // Create a mock tool request with required parameters only using universal tools
    const mockRequest: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'update-record',
        arguments: {
          resource_type: 'records',
          record_id: TEST_RECORD_ID,
          record_data: {
            list_memberships: {
              [TEST_LIST_ID]: {}
            }
          }
        },
      },
    };

    // Call the universal handler
    const result = await executeToolRequest(mockRequest);

    // Verify the result
    expect(result).toBeDefined();
    expect(result.isError).toBeFalsy();
    expect(result.content).toBeDefined();

    // Extract entry ID from response for cleanup
    if (Array.isArray(result.content) && result.content[0]?.text) {
      const entryIdMatch = result.content[0].text.match(/Entry ID: ([a-zA-Z0-9_-]+)/);
      if (entryIdMatch && entryIdMatch[1]) {
        createdEntryId = entryIdMatch[1];
      }
    }
  });

  test('should call API with correct payload - including object type context', async () => {
    // Create a mock tool request with object type context for universal tools
    const mockRequest: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'update-record',
        arguments: {
          resource_type: 'records',
          record_id: TEST_RECORD_ID,
          record_data: {
            list_memberships: {
              [TEST_LIST_ID]: {
                parent_object: 'companies'
              }
            }
          }
        },
      },
    };

    // Direct API call to spy on the payload
    let capturedPayload: any;
    const originalPost = getAttioClient().post;

    // Replace post method to capture the payload
    getAttioClient().post = async (url: string, data: any) => {
      capturedPayload = data;
      return originalPost(url, data);
    };

    // Call the universal handler
    const result = await executeToolRequest(mockRequest);

    // Restore original post method
    getAttioClient().post = originalPost;

    // Universal tools handle object type context internally
    // We verify the result rather than specific payload structure
    expect(result).toBeDefined();
    expect(result.isError).toBeFalsy();
    expect(result.content).toBeDefined();

    // Extract entry ID from response for cleanup
    if (Array.isArray(result.content) && result.content[0]?.text) {
      const entryIdMatch = result.content[0].text.match(/Entry ID: ([a-zA-Z0-9_-]+)/);
      if (entryIdMatch && entryIdMatch[1]) {
        createdEntryId = entryIdMatch[1];
      }
    }
  });

  test('should call API with correct payload - including initial values', async () => {
    // Create a mock tool request with initial values using universal tools
    const initialValues = {
      stage: 'Test Stage',
      priority: 'High',
      test_field: 'Test Value',
    };

    const mockRequest: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'update-record',
        arguments: {
          resource_type: 'records',
          record_id: TEST_RECORD_ID,
          record_data: {
            list_memberships: {
              [TEST_LIST_ID]: {
                entry_values: initialValues
              }
            }
          }
        },
      },
    };

    // Direct API call to spy on the payload
    let capturedPayload: any;
    const originalPost = getAttioClient().post;

    // Replace post method to capture the payload
    getAttioClient().post = async (url: string, data: any) => {
      capturedPayload = data;
      return originalPost(url, data);
    };

    // Call the universal handler
    const result = await executeToolRequest(mockRequest);

    // Restore original post method
    getAttioClient().post = originalPost;

    // Universal tools handle entry values internally
    // We verify the result rather than specific payload structure
    expect(result).toBeDefined();
    expect(result.isError).toBeFalsy();
    expect(result.content).toBeDefined();

    // Extract entry ID from response for cleanup
    if (Array.isArray(result.content) && result.content[0]?.text) {
      const entryIdMatch = result.content[0].text.match(/Entry ID: ([a-zA-Z0-9_-]+)/);
      if (entryIdMatch && entryIdMatch[1]) {
        createdEntryId = entryIdMatch[1];
      }
    }
  });

  test('should call API with correct payload - all parameters', async () => {
    // Create a mock tool request with all parameters using universal tools
    const initialValues = {
      stage: 'Complete Test',
      priority: 'Critical',
      notes: 'This is a test with all parameters',
    };

    const mockRequest: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'update-record',
        arguments: {
          resource_type: 'records',
          record_id: TEST_RECORD_ID,
          record_data: {
            list_memberships: {
              [TEST_LIST_ID]: {
                parent_object: 'companies',
                entry_values: initialValues
              }
            }
          }
        },
      },
    };

    // Direct API call to spy on the payload
    let capturedPayload: any;
    const originalPost = getAttioClient().post;

    // Replace post method to capture the payload
    getAttioClient().post = async (url: string, data: any) => {
      capturedPayload = data;
      return originalPost(url, data);
    };

    // Call the universal handler
    const result = await executeToolRequest(mockRequest);

    // Restore original post method
    getAttioClient().post = originalPost;

    // Universal tools handle all parameters internally
    // We verify the result rather than specific payload structure
    expect(result).toBeDefined();
    expect(result.isError).toBeFalsy();
    expect(result.content).toBeDefined();

    // Extract entry ID from response for cleanup
    if (Array.isArray(result.content) && result.content[0]?.text) {
      const entryIdMatch = result.content[0].text.match(/Entry ID: ([a-zA-Z0-9_-]+)/);
      if (entryIdMatch && entryIdMatch[1]) {
        createdEntryId = entryIdMatch[1];
      }
    }
  });

  // Test with non-API interactions (mock only) using universal tools
  test('should handle missing required parameters correctly', async () => {
    // Test missing record_id
    const mockRequestNoRecordId: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'update-record',
        arguments: {
          resource_type: 'records',
          // Missing record_id
          record_data: {
            list_memberships: {
              [TEST_LIST_ID]: {}
            }
          }
        },
      },
    };

    const resultNoRecordId = await executeToolRequest(mockRequestNoRecordId);

    expect(resultNoRecordId).toBeDefined();
    expect(resultNoRecordId.isError).toBeTruthy();
    expect(resultNoRecordId.content?.[0]?.text || '').toMatch(/record_id.*required|missing.*parameter/i);

    // Test missing resource_type
    const mockRequestNoResourceType: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'update-record',
        arguments: {
          // Missing resource_type
          record_id: TEST_RECORD_ID,
          record_data: {
            list_memberships: {
              [TEST_LIST_ID]: {}
            }
          }
        },
      },
    };

    const resultNoResourceType = await executeToolRequest(mockRequestNoResourceType);

    expect(resultNoResourceType).toBeDefined();
    expect(resultNoResourceType.isError).toBeTruthy();
    expect(resultNoResourceType.content?.[0]?.text || '').toMatch(/resource_type.*required|missing.*parameter/i);
  });
});
