/**
 * Integration test for the add-record-to-list tool
 * Tests the entire flow from tool invocation to API call with proper parameters
 */
import { describe, test, expect, beforeAll, vi } from 'vitest';
import { getAttioClient } from '../../../src/api/attio-client';
import { addRecordToList } from '../../../src/objects/lists';
import { handleAddRecordToListOperation } from '../../../src/handlers/tools/dispatcher/operations/lists';
import { listsToolConfigs } from '../../../src/handlers/tool-configs/lists';

// Skip tests if no API key is available
const apiKey = process.env.ATTIO_API_KEY;
const skipTests = !apiKey || process.env.SKIP_INTEGRATION_TESTS === 'true';

// Mock data for testing
const TEST_LIST_ID = 'list_your_test_list_id_here'; // Replace with a real list ID for testing
const TEST_RECORD_ID = 'company_your_test_company_id_here'; // Replace with a real company ID for testing

// Mock axios for API client in case we're skipping real API tests
vi.mock('axios', () => {
  // Only mock if we're skipping tests
  if (skipTests) {
    return {
      create: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ data: { data: {} } }),
        post: vi.fn().mockResolvedValue({
          data: {
            data: {
              id: { entry_id: 'mock-entry-id' },
              record_id: TEST_RECORD_ID,
              values: { stage: 'Mock Stage' },
            },
          },
        }),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
    };
  }

  // Otherwise use the real axios
  return vi.importActual('axios');
});

describe('Add Record To List Integration', () => {

  // Skip all tests if no API key
  const conditionalTest = skipTests ? test.skip : test;

  // Create a test company and list for testing if needed
  let createdEntryId: string | undefined;

  // Clean up after tests
  afterAll(async () => {
    if (skipTests || !createdEntryId) return;

    try {
      // Clean up any created test data
      const api = getAttioClient();
      await api.delete(`/lists/${TEST_LIST_ID}/entries/${createdEntryId}`);
      console.log(`Cleaned up test entry ${createdEntryId}`);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });

  conditionalTest(
    'should call API with correct payload - required params only',
    async () => {
      // Create a mock tool request with required parameters only
      const mockRequest = {
        params: {
          arguments: {
            listId: TEST_LIST_ID,
            recordId: TEST_RECORD_ID,
          },
        },
      };

      // Call the handler
      const result = await handleAddRecordToListOperation(
        mockRequest as any,
        listsToolConfigs.addRecordToList
      );

      // Verify the result
      expect(result).toBeDefined();
      expect(result.status).toBe('success');

      // Save the entry ID for cleanup
      const resultData = JSON.parse(result.content);
      const entryIdMatch = resultData.match(/Entry ID: ([a-zA-Z0-9_-]+)/);
      if (entryIdMatch && entryIdMatch[1]) {
        createdEntryId = entryIdMatch[1];
      }
    }
  );

  conditionalTest(
    'should call API with correct payload - including objectType',
    async () => {
      // Create a mock tool request with objectType
      const mockRequest = {
        params: {
          arguments: {
            listId: TEST_LIST_ID,
            recordId: TEST_RECORD_ID,
            objectType: 'companies',
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

      // Call the handler
      const result = await handleAddRecordToListOperation(
        mockRequest as any,
        listsToolConfigs.addRecordToList
      );

      // Restore original post method
      getAttioClient().post = originalPost;

      // Verify the payload
      expect(capturedPayload).toBeDefined();
      expect(capturedPayload.data).toBeDefined();
      expect(capturedPayload.data.parent_object).toBe('companies');

      // Verify the result
      expect(result).toBeDefined();
      expect(result.status).toBe('success');

      // Save the entry ID for cleanup
      const resultData = JSON.parse(result.content);
      const entryIdMatch = resultData.match(/Entry ID: ([a-zA-Z0-9_-]+)/);
      if (entryIdMatch && entryIdMatch[1]) {
        createdEntryId = entryIdMatch[1];
      }
    }
  );

  conditionalTest(
    'should call API with correct payload - including initialValues',
    async () => {
      // Create a mock tool request with initialValues
      const initialValues = {
        stage: 'Test Stage',
        priority: 'High',
        test_field: 'Test Value',
      };

      const mockRequest = {
        params: {
          arguments: {
            listId: TEST_LIST_ID,
            recordId: TEST_RECORD_ID,
            initialValues,
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

      // Call the handler
      const result = await handleAddRecordToListOperation(
        mockRequest as any,
        listsToolConfigs.addRecordToList
      );

      // Restore original post method
      getAttioClient().post = originalPost;

      // Verify the payload
      expect(capturedPayload).toBeDefined();
      expect(capturedPayload.data).toBeDefined();
      expect(capturedPayload.data.entry_values).toBeDefined();
      expect(capturedPayload.data.entry_values.stage).toBe(initialValues.stage);
      expect(capturedPayload.data.entry_values.priority).toBe(
        initialValues.priority
      );
      expect(capturedPayload.data.entry_values.test_field).toBe(
        initialValues.test_field
      );

      // Verify the result
      expect(result).toBeDefined();
      expect(result.status).toBe('success');

      // Save the entry ID for cleanup
      const resultData = JSON.parse(result.content);
      const entryIdMatch = resultData.match(/Entry ID: ([a-zA-Z0-9_-]+)/);
      if (entryIdMatch && entryIdMatch[1]) {
        createdEntryId = entryIdMatch[1];
      }
    }
  );

  conditionalTest(
    'should call API with correct payload - all parameters',
    async () => {
      // Create a mock tool request with all parameters
      const initialValues = {
        stage: 'Complete Test',
        priority: 'Critical',
        notes: 'This is a test with all parameters',
      };

      const mockRequest = {
        params: {
          arguments: {
            listId: TEST_LIST_ID,
            recordId: TEST_RECORD_ID,
            objectType: 'companies',
            initialValues,
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

      // Call the handler
      const result = await handleAddRecordToListOperation(
        mockRequest as any,
        listsToolConfigs.addRecordToList
      );

      // Restore original post method
      getAttioClient().post = originalPost;

      // Verify the payload
      expect(capturedPayload).toBeDefined();
      expect(capturedPayload.data).toBeDefined();
      expect(capturedPayload.data.parent_object).toBe('companies');
      expect(capturedPayload.data.entry_values).toBeDefined();
      expect(capturedPayload.data.entry_values.stage).toBe(initialValues.stage);
      expect(capturedPayload.data.entry_values.priority).toBe(
        initialValues.priority
      );
      expect(capturedPayload.data.entry_values.notes).toBe(initialValues.notes);

      // Verify the result
      expect(result).toBeDefined();
      expect(result.status).toBe('success');

      // Save the entry ID for cleanup
      const resultData = JSON.parse(result.content);
      const entryIdMatch = resultData.match(/Entry ID: ([a-zA-Z0-9_-]+)/);
      if (entryIdMatch && entryIdMatch[1]) {
        createdEntryId = entryIdMatch[1];
      }
    }
  );

  // Test with non-API interactions (mock only)
  test('should handle missing required parameters correctly', async () => {
    // Test missing listId
    const mockRequestNoListId = {
      params: {
        arguments: {
          recordId: TEST_RECORD_ID,
        },
      },
    };

    const resultNoListId = await handleAddRecordToListOperation(
      mockRequestNoListId as any,
      listsToolConfigs.addRecordToList
    );

    expect(resultNoListId).toBeDefined();
    expect(resultNoListId.status).toBe('error');
    expect(resultNoListId.content).toContain('listId parameter is required');

    // Test missing recordId
    const mockRequestNoRecordId = {
      params: {
        arguments: {
          listId: TEST_LIST_ID,
        },
      },
    };

    const resultNoRecordId = await handleAddRecordToListOperation(
      mockRequestNoRecordId as any,
      listsToolConfigs.addRecordToList
    );

    expect(resultNoRecordId).toBeDefined();
    expect(resultNoRecordId.status).toBe('error');
    expect(resultNoRecordId.content).toContain(
      'recordId parameter is required'
    );
  });
});
