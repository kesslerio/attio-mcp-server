/**
 * Unit tests for multi-select-transformer.ts
 *
 * Tests the automatic wrapping of single values in arrays for multi-select fields
 */

import { describe, it, expect } from 'vitest';
import {
  transformMultiSelectValue,
  isMultiSelectType,
  isMultiSelectTypeName,
  isMultiSelectAttribute,
  needsArrayWrapping,
  needsArrayWrappingForAttribute,
} from '@/services/value-transformer/multi-select-transformer';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types';
import type {
  TransformContext,
  AttributeMetadata,
} from '@/services/value-transformer/types';

describe('multi-select-transformer', () => {
  const mockContext: TransformContext = {
    resourceType: UniversalResourceType.COMPANIES,
    operation: 'create',
  };

  const multiSelectMeta: AttributeMetadata = {
    slug: 'categories',
    type: 'multi_select',
    title: 'Categories',
  };

  const textMeta: AttributeMetadata = {
    slug: 'name',
    type: 'text',
    title: 'Name',
  };

  // Issue #992: Custom multi-select with is_multiselect flag (Attio's actual format)
  const customMultiSelectMeta: AttributeMetadata = {
    slug: 'inbound_outbound',
    type: 'select', // Note: type is "select", not "multi_select"
    title: 'Inbound/Outbound',
    is_multiselect: true, // This is how Attio actually marks multi-select attributes
  };

  const singleSelectMeta: AttributeMetadata = {
    slug: 'priority',
    type: 'select',
    title: 'Priority',
    is_multiselect: false,
  };

  describe('isMultiSelectType', () => {
    it('should return true for multi_select type', () => {
      expect(isMultiSelectType('multi_select')).toBe(true);
    });

    it('should return true for multi-select type (hyphenated)', () => {
      expect(isMultiSelectType('multi-select')).toBe(true);
    });

    it('should return true for multiselect type (no separator)', () => {
      expect(isMultiSelectType('multiselect')).toBe(true);
    });

    it('should return false for select type', () => {
      expect(isMultiSelectType('select')).toBe(false);
    });

    it('should return false for text type', () => {
      expect(isMultiSelectType('text')).toBe(false);
    });

    it('should return false for status type', () => {
      expect(isMultiSelectType('status')).toBe(false);
    });
  });

  describe('needsArrayWrapping', () => {
    it('should return true for string value on multi_select', () => {
      expect(needsArrayWrapping('Technology', 'multi_select')).toBe(true);
    });

    it('should return false for array value on multi_select', () => {
      expect(needsArrayWrapping(['Technology'], 'multi_select')).toBe(false);
    });

    it('should return false for null value', () => {
      expect(needsArrayWrapping(null, 'multi_select')).toBe(false);
    });

    it('should return false for undefined value', () => {
      expect(needsArrayWrapping(undefined, 'multi_select')).toBe(false);
    });

    it('should return false for non-multi-select type', () => {
      expect(needsArrayWrapping('Technology', 'text')).toBe(false);
    });
  });

  describe('transformMultiSelectValue', () => {
    it('should skip transformation for non-multi-select attributes', async () => {
      const result = await transformMultiSelectValue(
        'Technology',
        'name',
        mockContext,
        textMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toBe('Technology');
    });

    it('should skip transformation for values already in array format', async () => {
      const arrayValue = ['Technology', 'Healthcare'];
      const result = await transformMultiSelectValue(
        arrayValue,
        'categories',
        mockContext,
        multiSelectMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toEqual(arrayValue);
    });

    it('should skip transformation for null values', async () => {
      const result = await transformMultiSelectValue(
        null,
        'categories',
        mockContext,
        multiSelectMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toBe(null);
    });

    it('should skip transformation for undefined values', async () => {
      const result = await transformMultiSelectValue(
        undefined,
        'categories',
        mockContext,
        multiSelectMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toBe(undefined);
    });

    it('should wrap single string value in array', async () => {
      const result = await transformMultiSelectValue(
        'Technology',
        'categories',
        mockContext,
        multiSelectMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual(['Technology']);
      expect(result.description).toContain('Technology');
      expect(result.description).toContain('categories');
    });

    it('should wrap single number value in array', async () => {
      const result = await transformMultiSelectValue(
        42,
        'categories',
        mockContext,
        multiSelectMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual([42]);
    });

    it('should wrap single object value in array', async () => {
      const objValue = { id: 'abc', label: 'Test' };
      const result = await transformMultiSelectValue(
        objValue,
        'categories',
        mockContext,
        multiSelectMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual([objValue]);
    });

    it('should handle different multi_select type variations', async () => {
      const variations = [
        { slug: 'categories', type: 'multi_select', title: 'Categories' },
        { slug: 'tags', type: 'multi-select', title: 'Tags' },
        { slug: 'types', type: 'multiselect', title: 'Types' },
      ];

      for (const meta of variations) {
        const result = await transformMultiSelectValue(
          'TestValue',
          meta.slug,
          mockContext,
          meta
        );

        expect(result.transformed).toBe(true);
        expect(result.transformedValue).toEqual(['TestValue']);
      }
    });

    // Issue #992: Test transformation with is_multiselect flag
    it('should transform custom multi-select with is_multiselect=true (Issue #992)', async () => {
      // This is the actual Attio format: type="select" + is_multiselect=true
      const result = await transformMultiSelectValue(
        'Inbound',
        'inbound_outbound',
        mockContext,
        customMultiSelectMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual(['Inbound']);
      expect(result.description).toContain('inbound_outbound');
    });

    it('should NOT transform single-select attributes (is_multiselect=false)', async () => {
      const result = await transformMultiSelectValue(
        'High',
        'priority',
        mockContext,
        singleSelectMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toBe('High');
    });

    it('should NOT transform select attributes without is_multiselect flag', async () => {
      const selectWithoutFlag: AttributeMetadata = {
        slug: 'status',
        type: 'select',
        title: 'Status',
        // No is_multiselect field
      };

      const result = await transformMultiSelectValue(
        'Active',
        'status',
        mockContext,
        selectWithoutFlag
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toBe('Active');
    });
  });

  // Issue #992: New tests for isMultiSelectAttribute function
  describe('isMultiSelectAttribute', () => {
    it('should return true when is_multiselect flag is true', () => {
      expect(isMultiSelectAttribute(customMultiSelectMeta)).toBe(true);
    });

    it('should return false when is_multiselect is false', () => {
      expect(isMultiSelectAttribute(singleSelectMeta)).toBe(false);
    });

    it('should fallback to type check when is_multiselect is undefined', () => {
      expect(isMultiSelectAttribute(multiSelectMeta)).toBe(true);
    });

    it('should return false for text type without is_multiselect', () => {
      expect(isMultiSelectAttribute(textMeta)).toBe(false);
    });

    it('should return false for select type without is_multiselect flag', () => {
      const selectMeta: AttributeMetadata = {
        slug: 'status',
        type: 'select',
        title: 'Status',
      };
      expect(isMultiSelectAttribute(selectMeta)).toBe(false);
    });

    it('should return false for select type with is_multiselect explicitly undefined', () => {
      // Edge case: Explicitly verify that undefined is_multiselect with select type
      // returns false (doesn't get accidentally wrapped)
      const selectUndefined: AttributeMetadata = {
        slug: 'channel',
        type: 'select',
        title: 'Channel',
        is_multiselect: undefined,
      };
      expect(isMultiSelectAttribute(selectUndefined)).toBe(false);
    });
  });

  // Issue #992: Tests for isMultiSelectTypeName (renamed function)
  describe('isMultiSelectTypeName', () => {
    it('should return true for multi_select type', () => {
      expect(isMultiSelectTypeName('multi_select')).toBe(true);
    });

    it('should return true for multi-select type', () => {
      expect(isMultiSelectTypeName('multi-select')).toBe(true);
    });

    it('should return false for select type', () => {
      expect(isMultiSelectTypeName('select')).toBe(false);
    });
  });

  // Issue #992: Tests for needsArrayWrappingForAttribute
  describe('needsArrayWrappingForAttribute', () => {
    it('should return true for string value on custom multi-select', () => {
      expect(
        needsArrayWrappingForAttribute('Inbound', customMultiSelectMeta)
      ).toBe(true);
    });

    it('should return false for array value on custom multi-select', () => {
      expect(
        needsArrayWrappingForAttribute(['Inbound'], customMultiSelectMeta)
      ).toBe(false);
    });

    it('should return false for single-select attributes', () => {
      expect(needsArrayWrappingForAttribute('High', singleSelectMeta)).toBe(
        false
      );
    });

    it('should return false for null value', () => {
      expect(needsArrayWrappingForAttribute(null, customMultiSelectMeta)).toBe(
        false
      );
    });

    it('should return false for undefined value', () => {
      expect(
        needsArrayWrappingForAttribute(undefined, customMultiSelectMeta)
      ).toBe(false);
    });
  });
});
