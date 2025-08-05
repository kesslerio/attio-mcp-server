/**
 * Tests for record ID extraction from list entries
 */

import { describe, expect, it } from 'vitest';
import type { AttioListEntry } from '../../src/types/attio.js';
import { processListEntries } from '../../src/utils/record-utils.js';

describe('Record ID Extraction Tests', () => {
  it('should maintain existing record_id if already present', () => {
    const entries: AttioListEntry[] = [
      {
        id: { entry_id: 'entry1' },
        record_id: 'existing-record-id',
      },
    ];

    const processed = processListEntries(entries);
    expect(processed[0].record_id).toBe('existing-record-id');
  });

  it('should extract record_id from record.id.record_id', () => {
    const entries: AttioListEntry[] = [
      {
        id: { entry_id: 'entry1' },
        record: {
          id: {
            record_id: 'nested-record-id',
          },
        },
      },
    ];

    const processed = processListEntries(entries);
    expect(processed[0].record_id).toBe('nested-record-id');
  });

  it('should extract record_id from parent_record_id', () => {
    const entries: AttioListEntry[] = [
      {
        id: { entry_id: 'entry1' },
        parent_record_id: 'parent-record-id',
      },
    ];

    const processed = processListEntries(entries);
    expect(processed[0].record_id).toBe('parent-record-id');
  });

  it('should extract record_id from values.record_id array', () => {
    const entries: AttioListEntry[] = [
      {
        id: { entry_id: 'entry1' },
        values: {
          record_id: [{ value: 'value-record-id' }],
        },
      },
    ];

    const processed = processListEntries(entries);
    expect(processed[0].record_id).toBe('value-record-id');
  });

  it('should extract record_id from values.record nested object', () => {
    const entries: AttioListEntry[] = [
      {
        id: { entry_id: 'entry1' },
        values: {
          record: {
            id: {
              record_id: 'nested-values-record-id',
            },
          },
        },
      },
    ];

    const processed = processListEntries(entries);
    expect(processed[0].record_id).toBe('nested-values-record-id');
  });

  it('should extract record_id from reference_id', () => {
    const entries: AttioListEntry[] = [
      {
        id: { entry_id: 'entry1' },
        reference_id: 'reference-id',
      },
    ];

    const processed = processListEntries(entries);
    expect(processed[0].record_id).toBe('reference-id');
  });

  it('should extract record_id from object_id', () => {
    const entries: AttioListEntry[] = [
      {
        id: { entry_id: 'entry1' },
        object_id: 'object-id',
      },
    ];

    const processed = processListEntries(entries);
    expect(processed[0].record_id).toBe('object-id');
  });

  it('should extract record_id from record.reference_id', () => {
    const entries: AttioListEntry[] = [
      {
        id: { entry_id: 'entry1' },
        record: {
          reference_id: 'record-reference-id',
        },
      },
    ];

    const processed = processListEntries(entries);
    expect(processed[0].record_id).toBe('record-reference-id');
  });

  it('should extract record_id from record.record_id', () => {
    const entries: AttioListEntry[] = [
      {
        id: { entry_id: 'entry1' },
        record: {
          record_id: 'direct-record-id',
        },
      },
    ];

    const processed = processListEntries(entries);
    expect(processed[0].record_id).toBe('direct-record-id');
  });

  it('should extract record_id from record.uri', () => {
    const entries: AttioListEntry[] = [
      {
        id: { entry_id: 'entry1' },
        record: {
          uri: 'attio://companies/uri-record-id',
        },
      },
    ];

    const processed = processListEntries(entries);
    expect(processed[0].record_id).toBe('uri-record-id');
  });

  it('should extract record_id from property ending with _record_id', () => {
    const entries: AttioListEntry[] = [
      {
        id: { entry_id: 'entry1' },
        company_record_id: 'company-record-id',
      },
    ];

    const processed = processListEntries(entries);
    expect(processed[0].record_id).toBe('company-record-id');
  });

  it('should leave record_id undefined when no record_id can be found', () => {
    const entries: AttioListEntry[] = [
      {
        id: { entry_id: 'entry1' },
        // No record_id information available
      },
    ];

    const processed = processListEntries(entries);
    expect(processed[0].record_id).toBeUndefined();
  });

  it('should handle complex nested structures', () => {
    const entries: AttioListEntry[] = [
      {
        id: { entry_id: 'entry1' },
        record: {
          id: {
            // No record_id here
            another_field: 'value',
          },
          // But has URI
          uri: 'attio://companies/complex-uri-id',
        },
      },
    ];

    const processed = processListEntries(entries);
    expect(processed[0].record_id).toBe('complex-uri-id');
  });

  it('should handle a mix of entry types in the same batch', () => {
    const entries: AttioListEntry[] = [
      // Entry with direct record_id
      {
        id: { entry_id: 'entry1' },
        record_id: 'direct-id-1',
      },
      // Entry with nested record_id
      {
        id: { entry_id: 'entry2' },
        record: {
          id: {
            record_id: 'nested-id-2',
          },
        },
      },
      // Entry with parent_record_id
      {
        id: { entry_id: 'entry3' },
        parent_record_id: 'parent-id-3',
      },
      // Entry with no identifiable record_id
      {
        id: { entry_id: 'entry4' },
      },
    ];

    const processed = processListEntries(entries);
    expect(processed[0].record_id).toBe('direct-id-1');
    expect(processed[1].record_id).toBe('nested-id-2');
    expect(processed[2].record_id).toBe('parent-id-3');
    expect(processed[3].record_id).toBeUndefined();
  });
});
