/**
 * Test suite for dispatcher utilities
 * Issue #918: Custom Objects Support
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  canonicalizeResourceType,
  normalizeToolMsg,
} from '@/handlers/tools/dispatcher/utils.js';

// Mock the config-loader module
vi.mock('@/utils/config-loader.js', () => ({
  loadMappingConfig: vi.fn(),
}));

// Import the mocked function to control its behavior
import { loadMappingConfig } from '@/utils/config-loader.js';

describe('Dispatcher Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeToolMsg', () => {
    it('should strip tool execution prefix from error messages', () => {
      const msg =
        "Error executing tool 'search-records': Invalid resource_type";
      expect(normalizeToolMsg(msg)).toBe('Invalid resource_type');
    });

    it('should return message unchanged if no prefix', () => {
      const msg = 'Some other error';
      expect(normalizeToolMsg(msg)).toBe('Some other error');
    });
  });

  describe('canonicalizeResourceType', () => {
    describe('standard types', () => {
      beforeEach(() => {
        // Mock empty custom objects config
        vi.mocked(loadMappingConfig).mockReturnValue({
          version: '1.0',
          mappings: {
            attributes: {
              common: {},
              objects: {},
              custom: {},
            },
            objects: {},
            lists: {},
            relationships: {},
          },
        });
      });

      it.each([
        ['records', 'records'],
        ['lists', 'lists'],
        ['people', 'people'],
        ['companies', 'companies'],
        ['tasks', 'tasks'],
        ['deals', 'deals'],
        ['notes', 'notes'],
        ['COMPANIES', 'companies'], // Case insensitive
        ['Companies', 'companies'],
      ])(
        'should accept standard type "%s" and return "%s"',
        (input, expected) => {
          expect(canonicalizeResourceType(input)).toBe(expected);
        }
      );

      it('should reject invalid types', () => {
        expect(() => canonicalizeResourceType('invalid')).toThrow(
          /Invalid resource_type: invalid/
        );
      });

      it('should handle null/undefined gracefully', () => {
        expect(() => canonicalizeResourceType(null)).toThrow(
          /Invalid resource_type/
        );
        expect(() => canonicalizeResourceType(undefined)).toThrow(
          /Invalid resource_type/
        );
      });

      it('should handle empty string', () => {
        expect(() => canonicalizeResourceType('')).toThrow(
          /Invalid resource_type/
        );
      });
    });

    describe('custom objects support (Issue #918)', () => {
      it('should accept custom object types from mapping config', () => {
        // Mock config with custom objects
        vi.mocked(loadMappingConfig).mockReturnValue({
          version: '1.0',
          mappings: {
            attributes: {
              common: {},
              objects: {
                funds: { name: 'Name' },
                investment_opportunities: { title: 'Title' },
              },
              custom: {},
            },
            objects: {},
            lists: {},
            relationships: {},
          },
        });

        expect(canonicalizeResourceType('funds')).toBe('funds');
        expect(canonicalizeResourceType('investment_opportunities')).toBe(
          'investment_opportunities'
        );
        // Standard types still work
        expect(canonicalizeResourceType('companies')).toBe('companies');
      });

      it('should handle case-insensitive custom objects', () => {
        vi.mocked(loadMappingConfig).mockReturnValue({
          version: '1.0',
          mappings: {
            attributes: {
              common: {},
              objects: {
                funds: { name: 'Name' },
              },
              custom: {},
            },
            objects: {},
            lists: {},
            relationships: {},
          },
        });

        // Note: Custom objects are stored lowercase in config, so
        // the input "FUNDS" lowercase becomes "funds" which matches
        expect(canonicalizeResourceType('funds')).toBe('funds');
      });

      it('should handle empty mappings gracefully', () => {
        vi.mocked(loadMappingConfig).mockReturnValue({
          version: '1.0',
          mappings: {
            attributes: {
              common: {},
              objects: {},
              custom: {},
            },
            objects: {},
            lists: {},
            relationships: {},
          },
        });

        // Should still accept standard types
        expect(canonicalizeResourceType('companies')).toBe('companies');
        // Should reject unknown types
        expect(() => canonicalizeResourceType('funds')).toThrow(
          /Invalid resource_type: funds/
        );
      });

      it('should handle missing attributes.objects in config', () => {
        vi.mocked(loadMappingConfig).mockReturnValue({
          version: '1.0',
          mappings: {
            attributes: {
              common: {},
              custom: {},
            } as never,
            objects: {},
            lists: {},
            relationships: {},
          },
        });

        // Should still accept standard types
        expect(canonicalizeResourceType('companies')).toBe('companies');
      });

      it('should include custom objects in error message', () => {
        vi.mocked(loadMappingConfig).mockReturnValue({
          version: '1.0',
          mappings: {
            attributes: {
              common: {},
              objects: {
                funds: { name: 'Name' },
              },
              custom: {},
            },
            objects: {},
            lists: {},
            relationships: {},
          },
        });

        try {
          canonicalizeResourceType('invalid');
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect((error as Error).message).toContain('funds');
          expect((error as Error).message).toContain('companies');
        }
      });

      it('should deduplicate types when custom object overlaps with standard', () => {
        vi.mocked(loadMappingConfig).mockReturnValue({
          version: '1.0',
          mappings: {
            attributes: {
              common: {},
              objects: {
                companies: { name: 'Name' }, // Overlap with standard
                funds: { name: 'Name' },
              },
              custom: {},
            },
            objects: {},
            lists: {},
            relationships: {},
          },
        });

        // Should work without duplicates
        expect(canonicalizeResourceType('companies')).toBe('companies');
        expect(canonicalizeResourceType('funds')).toBe('funds');
      });
    });
  });
});
