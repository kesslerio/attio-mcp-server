/**
 * Unit tests for UniversalRecord type guards
 * Issue #1073: Enforce UniversalRecord type across universal tools
 */

import { describe, it, expect } from 'vitest';
import {
  isAttioRecord,
  isAttioList,
  getRecordId,
  UniversalRecord,
  AttioRecord,
  AttioList,
} from '../../src/types/attio.js';

describe('UniversalRecord Type Guards', () => {
  // Sample AttioRecord (has values wrapper)
  const sampleAttioRecord: AttioRecord = {
    id: {
      record_id: 'rec_123abc',
    },
    values: {
      name: 'Test Company',
      email: 'test@example.com',
    },
  };

  // Sample AttioList (no values wrapper, has list_id)
  const sampleAttioList: AttioList = {
    id: {
      list_id: 'list_456def',
    },
    title: 'My List',
    name: 'My List',
    description: 'A test list',
    object_slug: 'companies',
    workspace_id: 'ws_789',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  };

  describe('isAttioRecord', () => {
    it('should return true for AttioRecord with values object', () => {
      expect(isAttioRecord(sampleAttioRecord)).toBe(true);
    });

    it('should return false for AttioList (no values wrapper)', () => {
      expect(isAttioRecord(sampleAttioList)).toBe(false);
    });

    it('should return true for record with empty values object', () => {
      const recordWithEmptyValues: AttioRecord = {
        id: { record_id: 'rec_empty' },
        values: {},
      };
      expect(isAttioRecord(recordWithEmptyValues)).toBe(true);
    });

    it('should return false for record with undefined values', () => {
      const recordWithUndefinedValues = {
        id: { record_id: 'rec_undef' },
        values: undefined,
      } as unknown as UniversalRecord;
      expect(isAttioRecord(recordWithUndefinedValues)).toBe(false);
    });

    it('should return false for record without values property', () => {
      const recordWithoutValues = {
        id: { record_id: 'rec_no_values' },
      } as unknown as UniversalRecord;
      expect(isAttioRecord(recordWithoutValues)).toBe(false);
    });
  });

  describe('isAttioList', () => {
    it('should return true for AttioList with list_id', () => {
      expect(isAttioList(sampleAttioList)).toBe(true);
    });

    it('should return false for AttioRecord (has record_id, not list_id)', () => {
      expect(isAttioList(sampleAttioRecord)).toBe(false);
    });

    it('should return true for minimal list structure', () => {
      const minimalList = {
        id: { list_id: 'list_minimal' },
        title: 'Minimal',
        object_slug: 'people',
        workspace_id: 'ws_1',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      } as AttioList;
      expect(isAttioList(minimalList)).toBe(true);
    });

    it('should return false for record with null id', () => {
      const recordWithNullId = {
        id: null,
      } as unknown as UniversalRecord;
      expect(isAttioList(recordWithNullId)).toBe(false);
    });

    it('should return false for record with non-object id', () => {
      const recordWithStringId = {
        id: 'string_id',
      } as unknown as UniversalRecord;
      expect(isAttioList(recordWithStringId)).toBe(false);
    });

    it('should return false for record without id property', () => {
      const recordWithoutId = {
        title: 'No ID',
      } as unknown as UniversalRecord;
      expect(isAttioList(recordWithoutId)).toBe(false);
    });
  });

  describe('getRecordId', () => {
    it('should return record_id for AttioRecord', () => {
      expect(getRecordId(sampleAttioRecord)).toBe('rec_123abc');
    });

    it('should return list_id for AttioList', () => {
      expect(getRecordId(sampleAttioList)).toBe('list_456def');
    });

    it('should handle records with additional id properties', () => {
      const recordWithExtraProps: AttioRecord = {
        id: {
          record_id: 'rec_extra',
          object_id: 'obj_123',
          workspace_id: 'ws_456',
        },
        values: { name: 'Extra Props' },
      };
      expect(getRecordId(recordWithExtraProps)).toBe('rec_extra');
    });

    it('should handle lists with additional id properties', () => {
      const listWithExtraProps: AttioList = {
        id: {
          list_id: 'list_extra',
          workspace_id: 'ws_789',
        },
        title: 'Extra List',
        object_slug: 'companies',
        workspace_id: 'ws_789',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      expect(getRecordId(listWithExtraProps)).toBe('list_extra');
    });
  });

  describe('Type narrowing', () => {
    it('should allow safe values access after isAttioRecord check', () => {
      const record: UniversalRecord = sampleAttioRecord;

      if (isAttioRecord(record)) {
        // TypeScript should allow accessing values here
        expect(record.values).toBeDefined();
        expect(record.values.name).toBe('Test Company');
      } else {
        // This branch shouldn't execute for AttioRecord
        expect.fail('Expected isAttioRecord to return true');
      }
    });

    it('should allow safe title access after isAttioList check', () => {
      const record: UniversalRecord = sampleAttioList;

      if (isAttioList(record)) {
        // TypeScript should allow accessing list fields here
        expect(record.title).toBe('My List');
        expect(record.id.list_id).toBe('list_456def');
      } else {
        // This branch shouldn't execute for AttioList
        expect.fail('Expected isAttioList to return true');
      }
    });

    it('should correctly discriminate mixed array', () => {
      const mixedRecords: UniversalRecord[] = [
        sampleAttioRecord,
        sampleAttioList,
      ];

      const records = mixedRecords.filter(isAttioRecord);
      const lists = mixedRecords.filter(isAttioList);

      expect(records).toHaveLength(1);
      expect(lists).toHaveLength(1);
      expect(records[0].values.name).toBe('Test Company');
      expect(lists[0].title).toBe('My List');
    });
  });

  describe('Edge cases', () => {
    it('should handle record with both values and list_id (unusual but possible)', () => {
      // In practice this shouldn't happen, but testing type guard behavior
      const ambiguousRecord = {
        id: {
          record_id: 'rec_ambig',
          list_id: 'list_ambig',
        },
        values: { name: 'Ambiguous' },
        title: 'Also has title',
      } as unknown as UniversalRecord;

      // isAttioRecord checks for values, which exists
      expect(isAttioRecord(ambiguousRecord)).toBe(true);
      // isAttioList checks for list_id in id, which also exists
      expect(isAttioList(ambiguousRecord)).toBe(true);
      // getRecordId should prefer list_id when isAttioList is true
      expect(getRecordId(ambiguousRecord)).toBe('list_ambig');
    });

    it('should handle deeply nested values in AttioRecord', () => {
      const nestedRecord: AttioRecord = {
        id: { record_id: 'rec_nested' },
        values: {
          name: 'Nested Corp',
          address: {
            street: '123 Main St',
            city: 'Test City',
          },
          tags: ['important', 'customer'],
        },
      };

      expect(isAttioRecord(nestedRecord)).toBe(true);
      expect(getRecordId(nestedRecord)).toBe('rec_nested');
    });

    it('should handle AttioList with entry_count', () => {
      const listWithCount: AttioList = {
        ...sampleAttioList,
        entry_count: 42,
      };

      expect(isAttioList(listWithCount)).toBe(true);
      expect(getRecordId(listWithCount)).toBe('list_456def');
    });
  });
});
