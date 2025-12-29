/**
 * Unit tests for formatters module - focused on issue #1051 fix
 */
import { describe, it, expect } from 'vitest';
import {
  formatSearchResults,
  formatListEntries,
} from '@/handlers/tools/formatters.js';
import { AttioRecord, AttioListEntry } from '@/types/attio.js';

describe('formatters - Issue #1051: People search showing "Unnamed"', () => {
  describe('formatSearchResults with personal-name attributes', () => {
    it('should extract full_name from personal-name attribute (bug fix)', () => {
      const records: AttioRecord[] = [
        {
          id: { record_id: 'c2e343f9-7758-55ce-9ae3-f1b8ee8c030e' },
          values: {
            name: [
              {
                first_name: 'Paolo',
                last_name: "D'Elia",
                full_name: "Paolo D'Elia",
                attribute_type: 'personal-name',
              },
            ],
          },
        } as AttioRecord,
      ];

      const result = formatSearchResults(records, 'people');

      expect(result).toContain("Paolo D'Elia");
      expect(result).toContain('c2e343f9-7758-55ce-9ae3-f1b8ee8c030e');
    });

    it('should handle missing full_name gracefully', () => {
      const records: AttioRecord[] = [
        {
          id: { record_id: 'test-id' },
          values: {
            name: [
              {
                first_name: 'Paolo',
                last_name: "D'Elia",
                attribute_type: 'personal-name',
                // full_name is missing
              },
            ],
          },
        } as AttioRecord,
      ];

      const result = formatSearchResults(records, 'people');

      // Should not crash, should return fallback
      expect(result).toBeDefined();
      expect(result).toContain('test-id');
    });

    it('should handle empty name array', () => {
      const records: AttioRecord[] = [
        {
          id: { record_id: 'test-id' },
          values: {
            name: [],
          },
        } as AttioRecord,
      ];

      const result = formatSearchResults(records, 'people');

      expect(result).toContain('Unknown');
      expect(result).toContain('test-id');
    });

    it('should handle missing name field', () => {
      const records: AttioRecord[] = [
        {
          id: { record_id: 'test-id' },
          values: {},
        } as AttioRecord,
      ];

      const result = formatSearchResults(records, 'people');

      expect(result).toContain('Unknown');
      expect(result).toContain('test-id');
    });

    it('should handle multiple people with names', () => {
      const records: AttioRecord[] = [
        {
          id: { record_id: 'id-1' },
          values: {
            name: [
              {
                full_name: 'John Doe',
                attribute_type: 'personal-name',
              },
            ],
          },
        } as AttioRecord,
        {
          id: { record_id: 'id-2' },
          values: {
            name: [
              {
                full_name: 'Jane Smith',
                attribute_type: 'personal-name',
              },
            ],
          },
        } as AttioRecord,
      ];

      const result = formatSearchResults(records, 'people');

      expect(result).toContain('John Doe');
      expect(result).toContain('Jane Smith');
      expect(result).toContain('id-1');
      expect(result).toContain('id-2');
    });
  });

  describe('formatSearchResults with standard value attributes (regression)', () => {
    it('should extract value from text attributes', () => {
      const records: AttioRecord[] = [
        {
          id: { record_id: 'test-id' },
          values: {
            name: [{ value: 'Test Company' }],
          },
        } as AttioRecord,
      ];

      const result = formatSearchResults(records, 'companies');

      expect(result).toContain('Test Company');
      expect(result).toContain('test-id');
    });

    it('should handle value attribute in object format (non-array)', () => {
      const records: AttioRecord[] = [
        {
          id: { record_id: 'test-id' },
          values: {
            name: { value: 'Test Company' },
          },
        } as AttioRecord,
      ];

      const result = formatSearchResults(records, 'companies');

      expect(result).toContain('Test Company');
    });
  });

  describe('formatSearchResults with formatted attributes (new fallback)', () => {
    it('should extract formatted value when value is missing', () => {
      const records: AttioRecord[] = [
        {
          id: { record_id: 'test-id' },
          values: {
            name: [{ formatted: 'Formatted Name' }],
          },
        } as AttioRecord,
      ];

      const result = formatSearchResults(records, 'records');

      expect(result).toContain('Formatted Name');
      expect(result).toContain('test-id');
    });

    it('should prefer full_name over formatted', () => {
      const records: AttioRecord[] = [
        {
          id: { record_id: 'test-id' },
          values: {
            name: [
              {
                full_name: 'Full Name',
                formatted: 'Formatted Name',
              },
            ],
          },
        } as AttioRecord,
      ];

      const result = formatSearchResults(records, 'people');

      expect(result).toContain('Full Name');
      expect(result).not.toContain('Formatted Name');
    });

    it('should prefer value over formatted for non-name fields', () => {
      const records: AttioRecord[] = [
        {
          id: { record_id: 'test-id' },
          values: {
            name: [
              {
                value: 'Value Name',
                formatted: 'Formatted Name',
              },
            ],
          },
        } as AttioRecord,
      ];

      const result = formatSearchResults(records, 'companies');

      expect(result).toContain('Value Name');
      expect(result).not.toContain('Formatted Name');
    });
  });

  describe('formatSearchResults edge cases', () => {
    it('should handle empty results array', () => {
      const result = formatSearchResults([], 'people');

      expect(result).toBe('No people found.');
    });
  });

  describe('formatListEntries with personal-name attributes', () => {
    it('should handle personal-name attributes in list entries', () => {
      const entries: AttioListEntry[] = [
        {
          id: { entry_id: 'entry-1' },
          record: {
            id: { record_id: 'record-1' },
            values: {
              name: [
                {
                  full_name: 'John Doe',
                  attribute_type: 'personal-name',
                },
              ],
            },
          } as AttioRecord,
        } as AttioListEntry,
      ];

      const result = formatListEntries(entries);

      expect(result).toContain('John Doe');
      expect(result).toContain('entry-1');
      expect(result).toContain('record-1');
    });
  });
});
