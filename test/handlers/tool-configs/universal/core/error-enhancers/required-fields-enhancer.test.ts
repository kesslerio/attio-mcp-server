/**
 * Unit tests for Required Fields Error Enhancer
 * Issue #1001 - Strategy Pattern for CRUD error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requiredFieldsEnhancer } from '@/handlers/tool-configs/universal/core/error-enhancers/required-fields-enhancer.js';
import type { CrudErrorContext } from '@/handlers/tool-configs/universal/core/error-enhancers/types.js';

const { mockGetOptions } = vi.hoisted(() => ({
  mockGetOptions: vi.fn(),
}));

vi.mock('@/services/metadata/index.js', () => ({
  AttributeOptionsService: {
    getOptions: mockGetOptions,
  },
}));

describe('required-fields-enhancer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('matches()', () => {
    it('should match "required field" pattern', () => {
      const error = new Error('required field missing: stage');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
      };

      expect(requiredFieldsEnhancer.matches(error, context)).toBe(true);
    });

    it('should match "Missing required" pattern', () => {
      const error = new Error('Missing required field: name');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(requiredFieldsEnhancer.matches(error, context)).toBe(true);
    });

    it('should match with correct case (case-sensitive)', () => {
      const error = new Error('This required field is missing');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
      };

      expect(requiredFieldsEnhancer.matches(error, context)).toBe(true);
    });

    it('should not match unrelated errors', () => {
      const error = new Error('Invalid attribute name');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
      };

      expect(requiredFieldsEnhancer.matches(error, context)).toBe(false);
    });

    it('should match string errors', () => {
      const error = 'required field is missing';
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
      };

      expect(requiredFieldsEnhancer.matches(error, context)).toBe(true);
    });
  });

  describe('enhance() - deal stage errors', () => {
    it('should enhance deal stage error with valid options', async () => {
      mockGetOptions.mockResolvedValue({
        options: [
          { id: 'st-1', title: 'MQL' },
          { id: 'st-2', title: 'SQL' },
          { id: 'st-3', title: 'Opportunity' },
          { id: 'st-4', title: 'Proposal' },
          { id: 'st-5', title: 'Negotiation' },
        ],
        attributeType: 'select',
      });

      const error = new Error('required field missing: stage');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
        recordData: { name: 'Test Deal' },
      };

      const result = await requiredFieldsEnhancer.enhance(error, context);

      expect(result).toContain('Required field "stage" is missing for deals');
      expect(result).toContain('Common stage values:');
      expect(result).toContain('"MQL"');
      expect(result).toContain('"SQL"');
      expect(result).toContain('"Opportunity"');
      expect(result).toContain('records_get_attribute_options');
      expect(mockGetOptions).toHaveBeenCalledWith('deals', 'stage');
    });

    it('should show +more indicator when > 5 options', async () => {
      mockGetOptions.mockResolvedValue({
        options: [
          { id: 'st-1', title: 'MQL' },
          { id: 'st-2', title: 'SQL' },
          { id: 'st-3', title: 'Opportunity' },
          { id: 'st-4', title: 'Proposal' },
          { id: 'st-5', title: 'Negotiation' },
          { id: 'st-6', title: 'Closed Won' },
          { id: 'st-7', title: 'Closed Lost' },
        ],
        attributeType: 'select',
      });

      const error = new Error('required field missing');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
        recordData: { name: 'Test Deal' },
      };

      const result = await requiredFieldsEnhancer.enhance(error, context);

      expect(result).toContain('(+2 more)');
    });

    it('should fallback when AttributeOptionsService fails', async () => {
      mockGetOptions.mockRejectedValue(new Error('API error'));

      const error = new Error('required field missing');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
        recordData: { name: 'Test Deal' },
      };

      const result = await requiredFieldsEnhancer.enhance(error, context);

      expect(result).toContain('Required field "stage" is missing for deals');
      expect(result).toContain('records_get_attribute_options');
      expect(result).not.toContain('Common stage values');
    });

    it('should return null if stage field already exists (direct)', async () => {
      const error = new Error('required field missing');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
        recordData: { stage: 'MQL', name: 'Test Deal' },
      };

      const result = await requiredFieldsEnhancer.enhance(error, context);

      expect(result).toBe(
        'Missing required fields. Please check that all mandatory fields are provided.'
      );
      expect(mockGetOptions).not.toHaveBeenCalled();
    });

    it('should return null if stage field exists in values object', async () => {
      const error = new Error('required field missing');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
        recordData: {
          values: { stage: 'MQL' },
          name: 'Test Deal',
        },
      };

      const result = await requiredFieldsEnhancer.enhance(error, context);

      expect(result).toBe(
        'Missing required fields. Please check that all mandatory fields are provided.'
      );
      expect(mockGetOptions).not.toHaveBeenCalled();
    });

    it('should detect "deal stage" field variant', async () => {
      const error = new Error('required field missing');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
        recordData: { 'deal stage': 'MQL', name: 'Test Deal' },
      };

      const result = await requiredFieldsEnhancer.enhance(error, context);

      expect(result).toBe(
        'Missing required fields. Please check that all mandatory fields are provided.'
      );
      expect(mockGetOptions).not.toHaveBeenCalled();
    });

    it('should normalize field names (case-insensitive)', async () => {
      const error = new Error('required field missing');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
        recordData: { STAGE: 'MQL', name: 'Test Deal' },
      };

      const result = await requiredFieldsEnhancer.enhance(error, context);

      expect(result).toBe(
        'Missing required fields. Please check that all mandatory fields are provided.'
      );
      expect(mockGetOptions).not.toHaveBeenCalled();
    });

    it('should normalize field names (trim whitespace)', async () => {
      const error = new Error('required field missing');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
        recordData: { '  stage  ': 'MQL', name: 'Test Deal' },
      };

      const result = await requiredFieldsEnhancer.enhance(error, context);

      expect(result).toBe(
        'Missing required fields. Please check that all mandatory fields are provided.'
      );
      expect(mockGetOptions).not.toHaveBeenCalled();
    });
  });

  describe('enhance() - generic errors', () => {
    it('should return generic message for non-deal resources', async () => {
      const error = new Error('required field missing: name');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { domain: 'example.com' },
      };

      const result = await requiredFieldsEnhancer.enhance(error, context);

      expect(result).toBe(
        'Missing required fields. Please check that all mandatory fields are provided.'
      );
      expect(mockGetOptions).not.toHaveBeenCalled();
    });

    it('should return generic message when no recordData', async () => {
      const error = new Error('required field missing');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
      };

      const result = await requiredFieldsEnhancer.enhance(error, context);

      expect(result).toBe(
        'Missing required fields. Please check that all mandatory fields are provided.'
      );
      expect(mockGetOptions).not.toHaveBeenCalled();
    });
  });

  describe('errorName', () => {
    it('should have correct error name', () => {
      expect(requiredFieldsEnhancer.errorName).toBe('validation_error');
    });
  });

  describe('name', () => {
    it('should have correct enhancer name', () => {
      expect(requiredFieldsEnhancer.name).toBe('required-fields');
    });
  });
});
