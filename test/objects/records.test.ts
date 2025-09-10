import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createObjectRecord,
  getObjectRecord,
  updateObjectRecord,
  deleteObjectRecord,
  listObjectRecords,
  batchCreateObjectRecords,
  batchUpdateObjectRecords,
  formatRecordAttribute,
  formatRecordAttributes,
} from '../../src/objects/records';
import * as attioOperations from '../../src/api/operations/index';
import { getAttioClient } from '../../src/api/attio-client';
import { AttioRecord, RecordAttributes } from '../../src/types/attio';

// Mock the attio-operations module
vi.mock('../../src/api/operations/index');

describe('Records API', () => {
  // Sample mock data
  const mockRecord: AttioRecord = {
    id: {
      record_id: 'record123',
    },
    values: {
      name: 'Test Record',
      description: 'This is a test record',
    },
  };

  // Mock API client for global override mechanism
  const mockPost = vi.fn();
  const mockGet = vi.fn();
  const mockPatch = vi.fn();
  const mockDelete = vi.fn();
  const mockApiClient = {
    post: mockPost,
    get: mockGet,
    patch: mockPatch,
    delete: mockDelete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up test-specific client override
    (globalThis as any).setTestApiClient?.(mockApiClient);
  });

  describe('createObjectRecord', () => {
    it('should call createRecord to create a new record', async () => {
      // Setup mock response
      const mockAttributes = {
        name: 'Test Record',
        description: 'This is a test record',
      };

      // Mock the createRecord function
      (attioOperations.createRecord as any).mockResolvedValue(mockRecord);

      // Call the function
      const result = await createObjectRecord<AttioRecord>(
        'companies',
        mockAttributes
      );

      // Assertions
      expect(attioOperations.createRecord).toHaveBeenCalledWith({
        objectSlug: 'companies',
        objectId: undefined,
        attributes: mockAttributes,
      });
      expect(result).toEqual(mockRecord);
    });

    it('should handle errors and use fallback implementation if needed', async () => {
      // Mock data
      const mockAttributes = {
        name: 'Test Record',
        description: 'This is a test record',
      };

      // Mock the createRecord function to throw an error that's a non-Error object
      // This will bypass the error instanceof Error check
      (attioOperations.createRecord as any).mockImplementation(() => {
        // Return a Promise that rejects with a non-Error object
        return Promise.reject({ message: 'API error' });
      });

      // Mock the direct API call for fallback
      mockPost.mockResolvedValue({
        data: {
          data: mockRecord,
        },
      });

      // Call the function
      const result = await createObjectRecord<AttioRecord>(
        'companies',
        mockAttributes
      );

      // Assertions
      expect(attioOperations.createRecord).toHaveBeenCalled();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/objects/companies/records',
        {
          data: {
            values: mockAttributes,
          },
        }
      );
      expect(result).toEqual(mockRecord);
    });
  });

  describe('getObjectRecord', () => {
    it('should call getRecord to get record details', async () => {
      // Mock the getRecord function
      (attioOperations.getRecord as any).mockResolvedValue(mockRecord);

      // Call the function
      const result = await getObjectRecord<AttioRecord>(
        'companies',
        'record123'
      );

      // Assertions
      expect(attioOperations.getRecord).toHaveBeenCalledWith(
        'companies',
        'record123',
        undefined,
        undefined
      );
      expect(result).toEqual(mockRecord);
    });

    it('should support attributes parameter', async () => {
      // Mock the getRecord function
      (attioOperations.getRecord as any).mockResolvedValue(mockRecord);

      // Call the function with attributes
      const attributes = ['name', 'description'];
      const result = await getObjectRecord<AttioRecord>(
        'companies',
        'record123',
        attributes
      );

      // Assertions
      expect(attioOperations.getRecord).toHaveBeenCalledWith(
        'companies',
        'record123',
        attributes,
        undefined
      );
      expect(result).toEqual(mockRecord);
    });
  });

  describe('updateObjectRecord', () => {
    it('should call updateRecord to update a record', async () => {
      // Setup mock data
      const mockAttributes = {
        description: 'Updated description',
      };

      // Mock the updateRecord function
      (attioOperations.updateRecord as any).mockResolvedValue(mockRecord);

      // Call the function
      const result = await updateObjectRecord<AttioRecord>(
        'companies',
        'record123',
        mockAttributes
      );

      // Assertions
      expect(attioOperations.updateRecord).toHaveBeenCalledWith({
        objectSlug: 'companies',
        objectId: undefined,
        recordId: 'record123',
        attributes: mockAttributes,
      });
      expect(result).toEqual(mockRecord);
    });
  });

  describe('deleteObjectRecord', () => {
    it('should call deleteRecord to delete a record', async () => {
      // Mock the deleteRecord function
      (attioOperations.deleteRecord as any).mockResolvedValue(true);

      // Call the function
      const result = await deleteObjectRecord('companies', 'record123');

      // Assertions
      expect(attioOperations.deleteRecord).toHaveBeenCalledWith(
        'companies',
        'record123',
        undefined
      );
      expect(result).toBe(true);
    });
  });

  describe('listObjectRecords', () => {
    it('should call listRecords to list records', async () => {
      // Mock response data
      const mockRecords = [
        mockRecord,
        { ...mockRecord, id: { record_id: 'record456' } },
      ];

      // Mock the listRecords function
      (attioOperations.listRecords as any).mockResolvedValue(mockRecords);

      // Call the function
      const result = await listObjectRecords<AttioRecord>('companies');

      // Assertions
      expect(attioOperations.listRecords).toHaveBeenCalledWith({
        objectSlug: 'companies',
        objectId: undefined,
      });
      expect(result).toEqual(mockRecords);
      expect(result.length).toBe(2);
    });

    it('should support filtering options', async () => {
      // Mock response data
      const mockRecords = [mockRecord];

      // Mock the listRecords function
      (attioOperations.listRecords as any).mockResolvedValue(mockRecords);

      // Call the function with options
      const options = {
        query: 'Test',
        pageSize: 10,
        sort: 'name',
        direction: 'asc' as const,
      };

      const result = await listObjectRecords<AttioRecord>('companies', options);

      // Assertions
      expect(attioOperations.listRecords).toHaveBeenCalledWith({
        objectSlug: 'companies',
        objectId: undefined,
        ...options,
      });
      expect(result).toEqual(mockRecords);
    });
  });

  describe('formatRecordAttribute', () => {
    it('should correctly format Date values', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      const result = formatRecordAttribute('date_field', date);

      expect(result).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should handle currency fields', () => {
      const result = formatRecordAttribute('annual_revenue', 5000000);

      expect(result).toBe(5000000);
    });

    it('should handle record ID links', () => {
      const result = formatRecordAttribute('primary_contact', 'record_abc123');

      expect(result).toEqual({ record_id: 'record_abc123' });
    });

    it('should return null and undefined as is', () => {
      expect(formatRecordAttribute('field1', null)).toBeNull();
      expect(formatRecordAttribute('field2', undefined)).toBeUndefined();
    });
  });

  describe('formatRecordAttributes', () => {
    it('should format multiple attributes', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      const attributes: Record<string, any> = {
        name: 'Test Record',
        founded_date: date,
        annual_revenue: 5000000,
        primary_contact: 'record_abc123',
        description: null,
      };

      const result = formatRecordAttributes(attributes);

      expect(result).toEqual({
        name: 'Test Record',
        founded_date: '2023-01-01T00:00:00.000Z',
        annual_revenue: 5000000,
        primary_contact: { record_id: 'record_abc123' },
        description: null,
      });
    });
  });
});
