/**
 * Unit tests for Select/Status Error Enhancer
 * Issue #1001 - Strategy Pattern for CRUD error handling
 *
 * Tests select and status field error handling with valid options display
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { selectStatusEnhancer } from '@/handlers/tool-configs/universal/core/error-enhancers/select-status-enhancer.js';
import type { CrudErrorContext } from '@/handlers/tool-configs/universal/core/error-enhancers/types.js';

const { mockGetOptions } = vi.hoisted(() => ({
  mockGetOptions: vi.fn(),
}));

vi.mock('@/services/metadata/index.js', () => ({
  AttributeOptionsService: {
    getOptions: mockGetOptions,
  },
}));

describe('select-status-enhancer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('matches()', () => {
    it('should match "Cannot find select option" pattern', () => {
      const error = new Error('Cannot find select option with title "Invalid"');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(selectStatusEnhancer.matches(error, context)).toBe(true);
    });

    it('should match "Cannot find Status" pattern', () => {
      const error = new Error('Cannot find Status with title "Pending"');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
      };

      expect(selectStatusEnhancer.matches(error, context)).toBe(true);
    });

    it('should match "select option" pattern', () => {
      const error = new Error('Invalid select option value');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(selectStatusEnhancer.matches(error, context)).toBe(true);
    });

    it('should not match unrelated errors', () => {
      const error = new Error('Invalid field name');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(selectStatusEnhancer.matches(error, context)).toBe(false);
    });

    it('should match string errors', () => {
      const error = 'Cannot find select option with title "test"';
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(selectStatusEnhancer.matches(error, context)).toBe(true);
    });
  });

  describe('enhance() - with validation_errors', () => {
    it('should extract field from validation_errors and show options', async () => {
      mockGetOptions.mockResolvedValue({
        options: [
          { id: 'st-1', title: 'Active' },
          { id: 'st-2', title: 'Inactive' },
          { id: 'st-3', title: 'Pending' },
        ],
        attributeType: 'select',
      });

      const error = {
        message: 'Cannot find select option with title "Invalid"',
        response: {
          data: {
            validation_errors: [
              { field: 'status', message: 'Invalid select value' },
            ],
          },
        },
      };

      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { status: 'Invalid' },
      };

      const result = await selectStatusEnhancer.enhance(error, context);

      expect(result).toContain(
        'Value "Invalid" is not valid for select attribute "status" on companies'
      );
      expect(result).toContain('Valid options: Active, Inactive, Pending');
      expect(result).toContain('records_get_attribute_options');
      expect(result).toContain('resource_type: "companies"');
      expect(result).toContain('attribute: "status"');
      expect(mockGetOptions).toHaveBeenCalledWith('companies', 'status');
    });

    it('should show +more indicator when >8 options', async () => {
      mockGetOptions.mockResolvedValue({
        options: [
          { id: '1', title: 'Opt1' },
          { id: '2', title: 'Opt2' },
          { id: '3', title: 'Opt3' },
          { id: '4', title: 'Opt4' },
          { id: '5', title: 'Opt5' },
          { id: '6', title: 'Opt6' },
          { id: '7', title: 'Opt7' },
          { id: '8', title: 'Opt8' },
          { id: '9', title: 'Opt9' },
          { id: '10', title: 'Opt10' },
        ],
        attributeType: 'select',
      });

      const error = {
        message: 'Cannot find select option with title "Test"',
        response: {
          data: {
            validation_errors: [
              { field: 'category', message: 'Cannot find select option' },
            ],
          },
        },
      };

      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { category: 'Test' },
      };

      const result = await selectStatusEnhancer.enhance(error, context);

      expect(result).not.toBeNull();
      expect(result).toContain('(+2 more)');
    });

    it('should fallback when AttributeOptionsService fails', async () => {
      mockGetOptions.mockRejectedValue(new Error('API error'));

      const error = {
        message: 'Cannot find select option with title "Invalid"',
        response: {
          data: {
            validation_errors: [
              { field: 'status', message: 'Cannot find select option' },
            ],
          },
        },
      };

      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { status: 'Invalid' },
      };

      const result = await selectStatusEnhancer.enhance(error, context);

      expect(result).not.toBeNull();
      expect(result).toContain('Value is not valid for attribute "status"');
      expect(result).not.toContain('Valid options:');
      expect(result).toContain('records_get_attribute_options');
    });
  });

  describe('enhance() - matching from recordData', () => {
    it('should match field from recordData when no validation_errors', async () => {
      mockGetOptions.mockResolvedValue({
        options: [
          { id: 'st-1', title: 'Open' },
          { id: 'st-2', title: 'Closed' },
        ],
        attributeType: 'status',
      });

      const error = new Error('Cannot find Status with title "Pending"');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
        recordData: { deal_status: 'Pending', name: 'Test Deal' },
      };

      const result = await selectStatusEnhancer.enhance(error, context);

      expect(result).toContain('"Pending"');
      expect(result).toContain('status attribute "deal_status"');
      expect(result).toContain('Valid options: Open, Closed');
      expect(mockGetOptions).toHaveBeenCalledWith('deals', 'deal_status');
    });

    it('should match field from recordData with array value', async () => {
      mockGetOptions.mockResolvedValue({
        options: [
          { id: 'tag-1', title: 'Customer' },
          { id: 'tag-2', title: 'Partner' },
        ],
        attributeType: 'select',
      });

      const error = new Error('Cannot find select option with title "Lead"');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { tags: ['Lead', 'Customer'] },
      };

      const result = await selectStatusEnhancer.enhance(error, context);

      expect(result).toContain('"Lead"');
      expect(result).toContain('select attribute "tags"');
      expect(mockGetOptions).toHaveBeenCalledWith('companies', 'tags');
    });
  });

  describe('enhance() - fallback cases', () => {
    it('should return generic hint when field not found', async () => {
      const error = new Error('Cannot find select option with title "Test"');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { name: 'Company' }, // no matching field
      };

      const result = await selectStatusEnhancer.enhance(error, context);

      expect(result).toContain('Value "Test" is not valid');
      expect(result).toContain('an attribute on companies');
      expect(result).not.toContain('attribute "');
      expect(result).toContain('records_get_attribute_options');
    });

    it('should return null when no recordData', async () => {
      const error = new Error('Cannot find select option');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      const result = await selectStatusEnhancer.enhance(error, context);

      expect(result).toBeNull();
      expect(mockGetOptions).not.toHaveBeenCalled();
    });

    it('should return null when pattern does not match value', async () => {
      const error = new Error('Some other error');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { status: 'Test' },
      };

      const result = await selectStatusEnhancer.enhance(error, context);

      expect(result).toBeNull();
      expect(mockGetOptions).not.toHaveBeenCalled();
    });
  });

  describe('errorName', () => {
    it('should have correct error name', () => {
      expect(selectStatusEnhancer.errorName).toBe('value_not_found');
    });
  });

  describe('name', () => {
    it('should have correct enhancer name', () => {
      expect(selectStatusEnhancer.name).toBe('select-status');
    });
  });
});
