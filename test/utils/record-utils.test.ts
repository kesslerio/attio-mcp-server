import { describe, expect, it, test } from 'vitest';
import type { AttioListEntry } from '../../src/types/attio';
import {
  API_PARAMS,
  getRecordNameFromEntry,
  processListEntries,
} from '../../src/utils/record-utils';

describe('record-utils', () => {
  // Test data for list entries
  const mockListEntries: AttioListEntry[] = [
    // Entry with direct record_id
    {
      id: { entry_id: 'entry1' },
      list_id: 'list1',
      record_id: 'record1',
      created_at: '2025-01-01T00:00:00Z',
    },
    // Entry with nested record ID
    {
      id: { entry_id: 'entry2' },
      list_id: 'list1',
      created_at: '2025-01-01T00:00:00Z',
      record: {
        id: { record_id: 'record2' },
        values: {},
      },
    },
    // Entry with record ID in values
    {
      id: { entry_id: 'entry3' },
      list_id: 'list1',
      created_at: '2025-01-01T00:00:00Z',
      values: {
        record: {
          id: { record_id: 'record3' },
          values: {}, // Required by AttioRecord
        },
      },
    },
    // Entry with record ID as other property
    {
      id: { entry_id: 'entry4' },
      list_id: 'list1',
      created_at: '2025-01-01T00:00:00Z',
      company_record_id: 'record4',
    },
    // Entry without record ID
    {
      id: { entry_id: 'entry5' },
      list_id: 'list1',
      created_at: '2025-01-01T00:00:00Z',
    },
  ];

  describe('processListEntries', () => {
    it('should process entries and extract record IDs', () => {
      // Act
      const processedEntries = processListEntries(mockListEntries);

      // Assert
      expect(processedEntries[0].record_id).toBe('record1'); // Unchanged (direct)
      expect(processedEntries[1].record_id).toBe('record2'); // Extracted from nested record
      expect(processedEntries[2].record_id).toBe('record3'); // Extracted from values
      expect(processedEntries[3].record_id).toBe('record4'); // Extracted from company_record_id
      expect(processedEntries[4].record_id).toBeUndefined(); // Still undefined
    });

    it('should not modify entries when record_id is already defined', () => {
      // Entry with direct record_id
      const entry = {
        id: { entry_id: 'entry1' },
        list_id: 'list1',
        record_id: 'existing-record-id',
        created_at: '2025-01-01T00:00:00Z',
        record: {
          id: { record_id: 'should-not-use-this' },
          values: {},
        },
      };

      // Act
      const result = processListEntries([entry])[0];

      // Assert - should keep the existing record_id
      expect(result.record_id).toBe('existing-record-id');
    });
  });

  describe('getRecordNameFromEntry', () => {
    it('should extract record name when available', () => {
      // Entry with record name
      const entry = {
        id: { entry_id: 'entry1' },
        list_id: 'list1',
        record_id: 'record1',
        created_at: '2025-01-01T00:00:00Z',
        record: {
          id: { record_id: 'record1' },
          values: {
            name: [{ value: 'Test Company' }],
          },
        },
      };

      // Act
      const result = getRecordNameFromEntry(entry);

      // Assert
      expect(result.name).toBe('Test Company');
    });

    it('should return empty string when record data is not available', () => {
      // Entry without record data
      const entry = {
        id: { entry_id: 'entry1' },
        list_id: 'list1',
        record_id: 'record1',
        created_at: '2025-01-01T00:00:00Z',
      };

      // Act
      const result = getRecordNameFromEntry(entry);

      // Assert
      expect(result.name).toBe('');
    });

    it('should return empty string when name array is empty', () => {
      // Entry with empty name array
      const entry = {
        id: { entry_id: 'entry1' },
        list_id: 'list1',
        record_id: 'record1',
        created_at: '2025-01-01T00:00:00Z',
        record: {
          id: { record_id: 'record1' },
          values: {
            name: [],
          },
        },
      };

      // Act
      const result = getRecordNameFromEntry(entry);

      // Assert
      expect(result.name).toBe('');
    });
  });

  describe('API_PARAMS', () => {
    it('should define the expected API parameters', () => {
      // Assert
      expect(API_PARAMS.EXPAND).toBe('expand');
      expect(API_PARAMS.RECORD).toBe('record');
      expect(API_PARAMS.LIMIT).toBe('limit');
      expect(API_PARAMS.OFFSET).toBe('offset');
      expect(API_PARAMS.LIST_ID).toBe('list_id');
    });
  });
});
