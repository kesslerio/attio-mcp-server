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
} from '@/objects/records/index.js';
import * as attioOperations from '@/api/operations/index.js';
import { getAttioClient } from '@/api/attio-client.js';
import { AttioRecord, RecordAttributes } from '@/types/attio.js';

// Mock the attio-operations module
vi.mock('@/api/operations/index.js');

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
    (
      globalThis as { setTestApiClient?: (client: unknown) => void }
    ).setTestApiClient?.(mockApiClient);
  });

  describe('createObjectRecord', () => {
    it('should call createRecord to create a new record', async () => {
      // Setup mock response
      const mockAttributes = {
        name: 'Test Record',
        description: 'This is a test record',
      };

      // Mock the createRecord function
      vi.mocked(attioOperations.createRecord).mockResolvedValue(mockRecord);

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

    it('should preserve uncertain create failures without a fallback write', async () => {
      // Mock data
      const mockAttributes = {
        name: 'Test Record',
        description: 'This is a test record',
      };

      // A non-Error rejection without an HTTP response cannot prove no write occurred.
      const failure = { message: 'API error' };
      vi.mocked(attioOperations.createRecord).mockRejectedValue(failure);

      // A successful second write must never mask the uncertain first outcome.
      mockPost.mockResolvedValue({
        data: {
          data: mockRecord,
        },
      });

      await expect(
        createObjectRecord<AttioRecord>('companies', mockAttributes)
      ).rejects.toBe(failure);

      // Assertions
      expect(attioOperations.createRecord).toHaveBeenCalledOnce();
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('getObjectRecord', () => {
    it('should call getRecord to get record details', async () => {
      // Mock the getRecord function
      vi.mocked(attioOperations.getRecord).mockResolvedValue(mockRecord);

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
      vi.mocked(attioOperations.getRecord).mockResolvedValue(mockRecord);

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
      vi.mocked(attioOperations.updateRecord).mockResolvedValue(mockRecord);

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
      vi.mocked(attioOperations.deleteRecord).mockResolvedValue(true);

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
      vi.mocked(attioOperations.listRecords).mockResolvedValue(mockRecords);

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
      vi.mocked(attioOperations.listRecords).mockResolvedValue(mockRecords);

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
      const attributes: Record<string, unknown> = {
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
