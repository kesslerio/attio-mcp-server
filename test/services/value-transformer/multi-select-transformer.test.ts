/**
 * Unit tests for multi-select-transformer.ts
 *
 * Tests the automatic wrapping of single values in arrays for multi-select fields
 */

import { describe, it, expect } from 'vitest';
import {
  transformMultiSelectValue,
  isMultiSelectType,
  needsArrayWrapping,
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
  });
});
