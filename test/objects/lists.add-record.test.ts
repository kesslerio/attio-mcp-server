/**
 * Tests for addRecordToList with the proper API payload format
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as attioClient from '../../src/api/attio-client.js';
import * as apiOperations from '../../src/api/operations/lists.js';
import { addRecordToList } from '../../src/objects/lists.js';
import { ResourceType } from '../../src/types/attio.js';

describe('addRecordToList Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call the API with the correct payload format', async () => {
    // Mock the API client
    const mockPost = vi.fn().mockResolvedValue({
      data: {
        data: {
          id: { entry_id: 'new-entry-id' },
          parent_record_id: 'test-record-id',
        },
      },
    });

    vi.spyOn(attioClient, 'getAttioClient').mockReturnValue({
      post: mockPost,
      get: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    });

    // Mock the generic function to throw so we test the fallback
    vi.spyOn(apiOperations, 'addRecordToList').mockRejectedValue(
      new Error('Test error')
    );

    // Call the function
    const listId = 'test-list-id';
    const recordId = 'test-record-id';
    const objectType = 'companies';
    const initialValues = { stage: 'Prospect' };

    await addRecordToList(listId, recordId, objectType, initialValues);

    // Verify API was called with correct payload
    expect(mockPost).toHaveBeenCalledWith(`/lists/${listId}/entries`, {
      data: {
        parent_record_id: recordId,
        parent_object: objectType,
        entry_values: initialValues,
      },
    });
  });

  it('should throw error when objectType is not provided', async () => {
    // Call the function without objectType - should throw validation error
    const listId = 'test-list-id';
    const recordId = 'test-record-id';

    await expect(addRecordToList(listId, recordId)).rejects.toThrow(
      'Object type is required: Must be a non-empty string (e.g., "companies", "people")'
    );
  });

  it('should omit entry_values if initialValues not provided', async () => {
    // Mock the API client
    const mockPost = vi.fn().mockResolvedValue({
      data: {
        data: {
          id: { entry_id: 'new-entry-id' },
          parent_record_id: 'test-record-id',
        },
      },
    });

    vi.spyOn(attioClient, 'getAttioClient').mockReturnValue({
      post: mockPost,
      get: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    });

    // Mock the generic function to throw so we test the fallback
    vi.spyOn(apiOperations, 'addRecordToList').mockRejectedValue(
      new Error('Test error')
    );

    // Call the function with objectType but no initialValues
    const listId = 'test-list-id';
    const recordId = 'test-record-id';
    const objectType = 'people';

    await addRecordToList(listId, recordId, objectType);

    // Verify API was called with correct payload without entry_values
    expect(mockPost).toHaveBeenCalledWith(`/lists/${listId}/entries`, {
      data: {
        parent_record_id: recordId,
        parent_object: objectType,
      },
    });
  });

  it('should throw an error for invalid listId', async () => {
    await expect(
      addRecordToList('', 'valid-record-id', 'companies')
    ).rejects.toThrow('Invalid list ID');
    await expect(
      addRecordToList(null as unknown as string, 'valid-record-id', 'companies')
    ).rejects.toThrow('Invalid list ID');
  });

  it('should throw an error for invalid recordId', async () => {
    await expect(
      addRecordToList('valid-list-id', '', 'companies')
    ).rejects.toThrow('Invalid record ID');
    await expect(
      addRecordToList('valid-list-id', null as unknown as string, 'companies')
    ).rejects.toThrow('Invalid record ID');
  });

  it('should throw an error for invalid objectType', async () => {
    await expect(
      addRecordToList('valid-list-id', 'valid-record-id', 'invalid-type')
    ).rejects.toThrow(/Invalid object type.+Must be one of/);
  });

  it('should accept valid ResourceType values', async () => {
    // Mock the generic function to return a successful response
    vi.spyOn(apiOperations, 'addRecordToList').mockResolvedValue({
      id: { entry_id: 'test-entry-id' },
      parent_record_id: 'test-record-id',
    });

    // Loop through all valid ResourceType values
    for (const validType of Object.values(ResourceType)) {
      // Should not throw
      await addRecordToList('valid-list-id', 'valid-record-id', validType);
    }

    // Verify generic function was called with correct parameters for each value
    expect(apiOperations.addRecordToList).toHaveBeenCalledTimes(
      Object.values(ResourceType).length
    );
  });

  it('should call the generic function first before fallback', async () => {
    // Mock the generic function
    const mockGenericAddRecordToList = vi
      .spyOn(apiOperations, 'addRecordToList')
      .mockResolvedValue({
        id: { entry_id: 'test-entry-id' },
        parent_record_id: 'test-record-id',
      });

    // Call the function
    const listId = 'test-list-id';
    const recordId = 'test-record-id';
    const objectType = 'companies';
    const initialValues = { stage: 'Prospect' };

    await addRecordToList(listId, recordId, objectType, initialValues);

    // Verify generic function was called with correct parameters
    expect(mockGenericAddRecordToList).toHaveBeenCalledWith(
      listId,
      recordId,
      objectType,
      initialValues
    );

    // Verify API client was not called directly (fallback not used)
    const mockGetAttioClient = vi.spyOn(attioClient, 'getAttioClient');
    expect(mockGetAttioClient).not.toHaveBeenCalled();
  });

  it('should provide detailed error messages for validation errors', async () => {
    // Mock the API client with a validation error response
    const mockPost = vi.fn().mockRejectedValue({
      response: {
        status: 400,
        data: {
          validation_errors: [
            {
              path: ['data', 'parent_record_id'],
              message: 'Invalid record ID format',
            },
            { path: ['data', 'parent_object'], message: 'Invalid object type' },
          ],
        },
      },
    });

    vi.spyOn(attioClient, 'getAttioClient').mockReturnValue({
      post: mockPost,
      get: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    });

    // Mock the generic function to throw so we test the fallback
    vi.spyOn(apiOperations, 'addRecordToList').mockRejectedValue(
      new Error('Test error')
    );

    // Call the function with required objectType parameter
    const listId = 'test-list-id';
    const recordId = 'invalid-id';
    const objectType = 'companies';

    // Should throw with formatted validation errors
    await expect(addRecordToList(listId, recordId, objectType)).rejects.toThrow(
      'Validation error adding record to list: data.parent_record_id: Invalid record ID format; data.parent_object: Invalid object type'
    );
  });
});
