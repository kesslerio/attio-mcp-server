/**
 * Unit tests for formatters module
 */
import { describe, it, expect } from 'vitest';
import {
  formatSearchResults,
  formatRecordDetails,
  formatListEntries,
  formatBatchResults,
  formatResponse,
} from '@/handlers/tools/formatters.js';
import { AttioRecord, AttioListEntry } from '@/types/attio.js';

describe('formatters', () => {
  describe('formatSearchResults', () => {
    describe('personal-name attributes', () => {
      it('should extract full_name from personal-name attribute', () => {
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
        expect(result).not.toContain('Unnamed');
        expect(result).not.toContain('Unknown');
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

    describe('standard value attributes', () => {
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

    describe('formatted attributes', () => {
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

    describe('edge cases', () => {
      it('should handle empty results array', () => {
        const result = formatSearchResults([], 'people');

        expect(result).toBe('No people found.');
      });

      it('should handle null/undefined results', () => {
        const result1 = formatSearchResults(
          null as unknown as AttioRecord[],
          'people'
        );
        const result2 = formatSearchResults(
          undefined as unknown as AttioRecord[],
          'people'
        );

        expect(result1).toBe('No people found.');
        expect(result2).toBe('No people found.');
      });

      it('should handle records with missing values object', () => {
        const records: AttioRecord[] = [
          {
            id: { record_id: 'test-id' },
          } as AttioRecord,
        ];

        const result = formatSearchResults(records, 'records');

        expect(result).toContain('Unknown');
        expect(result).toContain('test-id');
      });

      it('should handle records with missing ID', () => {
        const records: AttioRecord[] = [
          {
            values: {
              name: [{ value: 'Test Name' }],
            },
          } as AttioRecord,
        ];

        const result = formatSearchResults(records, 'records');

        expect(result).toContain('Test Name');
        expect(result).toContain('Unknown ID');
      });
    });
  });

  describe('formatListEntries', () => {
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

    it('should handle empty entries array', () => {
      const result = formatListEntries([]);

      expect(result).toBe('No entries found.');
    });
  });

  describe('formatBatchResults', () => {
    it('should format successful batch operations', () => {
      const batchResult = {
        summary: {
          total: 2,
          succeeded: 2,
          failed: 0,
        },
        results: [
          { id: 'id-1', success: true },
          { id: 'id-2', success: true },
        ],
      };

      const result = formatBatchResults(batchResult, 'update');

      expect(result).toContain('Total: 2');
      expect(result).toContain('Succeeded: 2');
      expect(result).toContain('Failed: 0');
      expect(result).toContain('✅ Record id-1');
      expect(result).toContain('✅ Record id-2');
    });

    it('should format failed batch operations', () => {
      const batchResult = {
        summary: {
          total: 2,
          succeeded: 1,
          failed: 1,
        },
        results: [
          { id: 'id-1', success: true },
          {
            id: 'id-2',
            success: false,
            error: { message: 'Validation failed' },
          },
        ],
      };

      const result = formatBatchResults(batchResult, 'create');

      expect(result).toContain('Total: 2');
      expect(result).toContain('Succeeded: 1');
      expect(result).toContain('Failed: 1');
      expect(result).toContain('✅ Record id-1');
      expect(result).toContain('❌ Record id-2');
      expect(result).toContain('Validation failed');
    });
  });

  describe('formatResponse', () => {
    it('should format string content', () => {
      const result = formatResponse('Test content');

      expect(result.content[0].text).toBe('Test content');
      expect(result.isError).toBe(false);
    });

    it('should format error responses', () => {
      const result = formatResponse('Error occurred', true);

      expect(result.content[0].text).toBe('Error occurred');
      expect(result.isError).toBe(true);
    });

    it('should handle null/undefined content', () => {
      const result1 = formatResponse(null);
      const result2 = formatResponse(undefined);

      expect(result1.content[0].text).toContain(
        'Operation completed successfully'
      );
      expect(result2.content[0].text).toContain(
        'Operation completed successfully'
      );
    });

    it('should handle object content', () => {
      const result = formatResponse({ key: 'value', nested: { data: 'test' } });

      expect(result.content[0].text).toContain('key');
      expect(result.content[0].text).toContain('value');
    });

    it('should sanitize MCP response', () => {
      const result = formatResponse('Test content');

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError');
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });
  });
});
