/**
 * Tests for addRecordToList with the proper API payload format
 */

import { expect, describe, it, jest, beforeEach } from '@jest/globals';
import { addRecordToList } from '../../src/objects/lists.js';
import * as attioClient from '../../src/api/attio-client.js';
import * as apiOperations from '../../src/api/operations/lists.js';

describe('addRecordToList Tests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should call the API with the correct payload format', async () => {
    // Mock the API client
    const mockPost = jest.fn().mockResolvedValue({
      data: {
        data: {
          id: { entry_id: 'new-entry-id' },
          parent_record_id: 'test-record-id',
        },
      },
    });
    
    jest.spyOn(attioClient, 'getAttioClient').mockReturnValue({
      post: mockPost,
      get: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    });
    
    // Mock the generic function to throw so we test the fallback
    jest.spyOn(apiOperations, 'addRecordToList').mockRejectedValue(new Error('Test error'));

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

  it('should use default objectType if not provided', async () => {
    // Mock the API client
    const mockPost = jest.fn().mockResolvedValue({
      data: {
        data: {
          id: { entry_id: 'new-entry-id' },
          parent_record_id: 'test-record-id',
        },
      },
    });
    
    jest.spyOn(attioClient, 'getAttioClient').mockReturnValue({
      post: mockPost,
      get: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    });
    
    // Mock the generic function to throw so we test the fallback
    jest.spyOn(apiOperations, 'addRecordToList').mockRejectedValue(new Error('Test error'));

    // Call the function without objectType
    const listId = 'test-list-id';
    const recordId = 'test-record-id';
    
    await addRecordToList(listId, recordId);
    
    // Verify API was called with default objectType 'companies'
    expect(mockPost).toHaveBeenCalledWith(`/lists/${listId}/entries`, {
      data: {
        parent_record_id: recordId,
        parent_object: 'companies',
      },
    });
  });

  it('should omit entry_values if initialValues not provided', async () => {
    // Mock the API client
    const mockPost = jest.fn().mockResolvedValue({
      data: {
        data: {
          id: { entry_id: 'new-entry-id' },
          parent_record_id: 'test-record-id',
        },
      },
    });
    
    jest.spyOn(attioClient, 'getAttioClient').mockReturnValue({
      post: mockPost,
      get: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    });
    
    // Mock the generic function to throw so we test the fallback
    jest.spyOn(apiOperations, 'addRecordToList').mockRejectedValue(new Error('Test error'));

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
    await expect(addRecordToList('', 'valid-record-id')).rejects.toThrow('Invalid list ID');
    await expect(addRecordToList(null as unknown as string, 'valid-record-id')).rejects.toThrow('Invalid list ID');
  });

  it('should throw an error for invalid recordId', async () => {
    await expect(addRecordToList('valid-list-id', '')).rejects.toThrow('Invalid record ID');
    await expect(addRecordToList('valid-list-id', null as unknown as string)).rejects.toThrow('Invalid record ID');
  });

  it('should call the generic function first before fallback', async () => {
    // Mock the generic function
    const mockGenericAddRecordToList = jest.spyOn(apiOperations, 'addRecordToList')
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
    const mockGetAttioClient = jest.spyOn(attioClient, 'getAttioClient');
    expect(mockGetAttioClient).not.toHaveBeenCalled();
  });
});