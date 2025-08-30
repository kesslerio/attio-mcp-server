import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AttioRecord, RecordAttributes } from '../../src/types/attio';
import { getAttioClient } from '../../src/api/attio-client';
import * as attioOperations from '../../src/api/operations/index';

// Mock the attio-operations module
vi.mock('../../src/api/operations/index');
vi.mock('../../src/api/attio-client', () => ({
  getAttioClient: vi.fn(),
}));

describe('Records API', () => {
  // Sample mock data
  const mockRecord: AttioRecord = {
    id: {
      record_id: 'record123',
    },
    values: {
      name: [{ value: 'Test Record' }],
      description: [{ value: 'This is a test record' }],
    },
  };

  // Mock API client
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getAttioClient as vi.Mock).mockReturnValue(mockApiClient);
  });

  describe('createObjectRecord', () => {
    it('should call createRecord to create a new record', async () => {
      // Setup mock response
        name: 'Test Record',
        description: 'This is a test record',
      };

      // Mock the createRecord function
      (attioOperations.createRecord as vi.Mock).mockResolvedValue(mockRecord);

      // Call the function
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
        name: 'Test Record',
        description: 'This is a test record',
      };

      // Mock the createRecord function to throw an error that's a non-Error object
      // This will bypass the error instanceof Error check
      (attioOperations.createRecord as vi.Mock).mockImplementation(() => {
        // Return a Promise that rejects with a non-Error object
        return Promise.reject({ message: 'API error' });
      });

      // Mock the direct API call for fallback
      mockApiClient.post.mockResolvedValue({
        data: {
          data: mockRecord,
        },
      });

      // Call the function
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
      (attioOperations.getRecord as vi.Mock).mockResolvedValue(mockRecord);

      // Call the function
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
      (attioOperations.getRecord as vi.Mock).mockResolvedValue(mockRecord);

      // Call the function with attributes
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
        description: 'Updated description',
      };

      // Mock the updateRecord function
      (attioOperations.updateRecord as vi.Mock).mockResolvedValue(mockRecord);

      // Call the function
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
      (attioOperations.deleteRecord as vi.Mock).mockResolvedValue(true);

      // Call the function

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
        mockRecord,
        { ...mockRecord, id: { record_id: 'record456' } },
      ];

      // Mock the listRecords function
      (attioOperations.listRecords as vi.Mock).mockResolvedValue(mockRecords);

      // Call the function

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

      // Mock the listRecords function
      (attioOperations.listRecords as vi.Mock).mockResolvedValue(mockRecords);

      // Call the function with options
        query: 'Test',
        pageSize: 10,
        sort: 'name',
        direction: 'asc' as const,
      };


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

      expect(result).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should handle currency fields', () => {

      expect(result).toBe(5000000);
    });

    it('should handle record ID links', () => {

      expect(result).toEqual({ record_id: 'record_abc123' });
    });

    it('should return null and undefined as is', () => {
      expect(formatRecordAttribute('field1', null)).toBeNull();
      expect(formatRecordAttribute('field2', undefined)).toBeUndefined();
    });
  });

  describe('formatRecordAttributes', () => {
    it('should format multiple attributes', () => {
      const attributes: Record<string, unknown> = {
        name: 'Test Record',
        founded_date: date,
        annual_revenue: 5000000,
        primary_contact: 'record_abc123',
        description: null,
      };


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
