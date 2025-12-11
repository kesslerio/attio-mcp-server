/**
 * Unit tests for record-reference-transformer.ts
 *
 * Issue #997: Tests the automatic formatting of record-reference values
 * to Attio's expected format: [{ target_object, target_record_id }]
 */

import { describe, it, expect } from 'vitest';
import {
  transformRecordReferenceValue,
  isRecordReferenceType,
  needsRecordReferenceFormatting,
} from '@/services/value-transformer/record-reference-transformer';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types';
import type {
  TransformContext,
  AttributeMetadata,
} from '@/services/value-transformer/types';

describe('record-reference-transformer (Issue #997)', () => {
  const mockContext: TransformContext = {
    resourceType: UniversalResourceType.PEOPLE,
    operation: 'update',
  };

  // Record-reference metadata for people.company
  const companyRefMeta: AttributeMetadata = {
    slug: 'company',
    type: 'record-reference',
    title: 'Company',
    relationship: {
      object: 'companies',
    },
  };

  // Record-reference metadata for deals.associated_people
  const associatedPeopleMeta: AttributeMetadata = {
    slug: 'associated_people',
    type: 'record-reference',
    title: 'Associated People',
    relationship: {
      object: 'people',
    },
  };

  // Record-reference metadata without relationship info (fallback test)
  const companyRefNoRelMeta: AttributeMetadata = {
    slug: 'company',
    type: 'record-reference',
    title: 'Company',
    // No relationship field - should fallback to field name inference
  };

  // Non-record-reference metadata
  const textMeta: AttributeMetadata = {
    slug: 'name',
    type: 'text',
    title: 'Name',
  };

  describe('isRecordReferenceType', () => {
    it('should return true for record-reference type', () => {
      expect(isRecordReferenceType('record-reference')).toBe(true);
    });

    it('should return false for text type', () => {
      expect(isRecordReferenceType('text')).toBe(false);
    });

    it('should return false for select type', () => {
      expect(isRecordReferenceType('select')).toBe(false);
    });
  });

  describe('needsRecordReferenceFormatting', () => {
    it('should return true for string value on record-reference', () => {
      expect(
        needsRecordReferenceFormatting('company-uuid', companyRefMeta)
      ).toBe(true);
    });

    it('should return true for legacy object format', () => {
      expect(
        needsRecordReferenceFormatting(
          { record_id: 'company-uuid' },
          companyRefMeta
        )
      ).toBe(true);
    });

    it('should return false for already correct format', () => {
      const correctFormat = [
        { target_object: 'companies', target_record_id: 'company-uuid' },
      ];
      expect(
        needsRecordReferenceFormatting(correctFormat, companyRefMeta)
      ).toBe(false);
    });

    it('should return false for non-record-reference type', () => {
      expect(needsRecordReferenceFormatting('test-value', textMeta)).toBe(
        false
      );
    });

    it('should return false for null value', () => {
      expect(needsRecordReferenceFormatting(null, companyRefMeta)).toBe(false);
    });

    it('should return false for undefined value', () => {
      expect(needsRecordReferenceFormatting(undefined, companyRefMeta)).toBe(
        false
      );
    });

    it('should return false for empty array (valid format to clear field)', () => {
      expect(needsRecordReferenceFormatting([], companyRefMeta)).toBe(false);
    });
  });

  describe('transformRecordReferenceValue', () => {
    describe('Non-record-reference attributes', () => {
      it('should skip transformation for non-record-reference attributes', async () => {
        const result = await transformRecordReferenceValue(
          'some-value',
          'name',
          mockContext,
          textMeta
        );

        expect(result.transformed).toBe(false);
        expect(result.transformedValue).toBe('some-value');
      });
    });

    describe('Null/undefined handling', () => {
      it('should skip transformation for null values', async () => {
        const result = await transformRecordReferenceValue(
          null,
          'company',
          mockContext,
          companyRefMeta
        );

        expect(result.transformed).toBe(false);
        expect(result.transformedValue).toBe(null);
      });

      it('should skip transformation for undefined values', async () => {
        const result = await transformRecordReferenceValue(
          undefined,
          'company',
          mockContext,
          companyRefMeta
        );

        expect(result.transformed).toBe(false);
        expect(result.transformedValue).toBe(undefined);
      });
    });

    describe('Already correct format', () => {
      it('should skip transformation for already correct format', async () => {
        const correctFormat = [
          { target_object: 'companies', target_record_id: 'company-uuid' },
        ];

        const result = await transformRecordReferenceValue(
          correctFormat,
          'company',
          mockContext,
          companyRefMeta
        );

        expect(result.transformed).toBe(false);
        expect(result.transformedValue).toEqual(correctFormat);
      });

      it('should skip transformation for empty array', async () => {
        const result = await transformRecordReferenceValue(
          [],
          'company',
          mockContext,
          companyRefMeta
        );

        expect(result.transformed).toBe(false);
        expect(result.transformedValue).toEqual([]);
      });
    });

    describe('String input transformation', () => {
      it('should transform string ID to correct format', async () => {
        const result = await transformRecordReferenceValue(
          'company-uuid-123',
          'company',
          mockContext,
          companyRefMeta
        );

        expect(result.transformed).toBe(true);
        expect(result.transformedValue).toEqual([
          { target_object: 'companies', target_record_id: 'company-uuid-123' },
        ]);
        expect(result.description).toContain('company');
        expect(result.description).toContain('companies');
      });

      it('should trim whitespace from string ID', async () => {
        const result = await transformRecordReferenceValue(
          '  company-uuid  ',
          'company',
          mockContext,
          companyRefMeta
        );

        expect(result.transformed).toBe(true);
        expect(result.transformedValue).toEqual([
          { target_object: 'companies', target_record_id: 'company-uuid' },
        ]);
      });
    });

    describe('Legacy object format transformation', () => {
      it('should transform {record_id} to correct format', async () => {
        const legacyFormat = { record_id: 'company-uuid' };

        const result = await transformRecordReferenceValue(
          legacyFormat,
          'company',
          mockContext,
          companyRefMeta
        );

        expect(result.transformed).toBe(true);
        expect(result.transformedValue).toEqual([
          { target_object: 'companies', target_record_id: 'company-uuid' },
        ]);
      });

      it('should transform {id} to correct format', async () => {
        const idFormat = { id: 'company-uuid' };

        const result = await transformRecordReferenceValue(
          idFormat,
          'company',
          mockContext,
          companyRefMeta
        );

        expect(result.transformed).toBe(true);
        expect(result.transformedValue).toEqual([
          { target_object: 'companies', target_record_id: 'company-uuid' },
        ]);
      });
    });

    describe('Incomplete object format transformation', () => {
      it('should add missing target_object to incomplete format', async () => {
        const incompleteFormat = { target_record_id: 'company-uuid' };

        const result = await transformRecordReferenceValue(
          incompleteFormat,
          'company',
          mockContext,
          companyRefMeta
        );

        expect(result.transformed).toBe(true);
        expect(result.transformedValue).toEqual([
          { target_object: 'companies', target_record_id: 'company-uuid' },
        ]);
      });
    });

    describe('Array input transformation', () => {
      it('should transform array of strings', async () => {
        const stringArray = ['person-uuid-1', 'person-uuid-2'];

        const result = await transformRecordReferenceValue(
          stringArray,
          'associated_people',
          { ...mockContext, resourceType: UniversalResourceType.DEALS },
          associatedPeopleMeta
        );

        expect(result.transformed).toBe(true);
        expect(result.transformedValue).toEqual([
          { target_object: 'people', target_record_id: 'person-uuid-1' },
          { target_object: 'people', target_record_id: 'person-uuid-2' },
        ]);
      });

      it('should transform mixed array (strings and objects)', async () => {
        const mixedArray = [
          'person-uuid-1',
          { record_id: 'person-uuid-2' },
          { target_record_id: 'person-uuid-3' },
        ];

        const result = await transformRecordReferenceValue(
          mixedArray,
          'associated_people',
          { ...mockContext, resourceType: UniversalResourceType.DEALS },
          associatedPeopleMeta
        );

        expect(result.transformed).toBe(true);
        expect(result.transformedValue).toEqual([
          { target_object: 'people', target_record_id: 'person-uuid-1' },
          { target_object: 'people', target_record_id: 'person-uuid-2' },
          { target_object: 'people', target_record_id: 'person-uuid-3' },
        ]);
      });

      it('should filter out invalid array items including undefined', async () => {
        const arrayWithInvalid = [
          'valid-uuid',
          null,
          undefined, // Added per PR #998 review feedback
          '',
          { invalid: 'object' },
        ];

        const result = await transformRecordReferenceValue(
          arrayWithInvalid,
          'associated_people',
          { ...mockContext, resourceType: UniversalResourceType.DEALS },
          associatedPeopleMeta
        );

        expect(result.transformed).toBe(true);
        expect(result.transformedValue).toEqual([
          { target_object: 'people', target_record_id: 'valid-uuid' },
        ]);
      });

      it('should NOT transform when all array items are invalid (Codex P1 fix)', async () => {
        // Critical: This tests that we don't silently clear the field
        // when user passes an array with ALL invalid items
        const allInvalidArray = [null, '', {}, { foo: 'bar' }, undefined];

        const result = await transformRecordReferenceValue(
          allInvalidArray,
          'associated_people',
          { ...mockContext, resourceType: UniversalResourceType.DEALS },
          associatedPeopleMeta
        );

        // Should NOT transform - prevents silent field clearing
        expect(result.transformed).toBe(false);
        expect(result.transformedValue).toEqual(allInvalidArray);
        expect(result.description).toContain(
          'Could not extract any valid record IDs'
        );
        expect(result.description).toContain('5 item(s), all invalid');
      });
    });

    describe('Target object inference', () => {
      it('should use relationship.object from metadata when available', async () => {
        const result = await transformRecordReferenceValue(
          'company-uuid',
          'company',
          mockContext,
          companyRefMeta
        );

        expect(result.transformed).toBe(true);
        expect(
          (result.transformedValue as Array<{ target_object: string }>)[0]
            .target_object
        ).toBe('companies');
      });

      it('should fallback to field name inference when no relationship metadata', async () => {
        const result = await transformRecordReferenceValue(
          'company-uuid',
          'company',
          mockContext,
          companyRefNoRelMeta
        );

        expect(result.transformed).toBe(true);
        expect(
          (result.transformedValue as Array<{ target_object: string }>)[0]
            .target_object
        ).toBe('companies');
      });

      it('should infer target_object for associated_company field', async () => {
        const meta: AttributeMetadata = {
          slug: 'associated_company',
          type: 'record-reference',
          title: 'Associated Company',
        };

        const result = await transformRecordReferenceValue(
          'company-uuid',
          'associated_company',
          { ...mockContext, resourceType: UniversalResourceType.DEALS },
          meta
        );

        expect(result.transformed).toBe(true);
        expect(
          (result.transformedValue as Array<{ target_object: string }>)[0]
            .target_object
        ).toBe('companies');
      });

      it('should infer target_object for associated_people field', async () => {
        const meta: AttributeMetadata = {
          slug: 'associated_people',
          type: 'record-reference',
          title: 'Associated People',
        };

        const result = await transformRecordReferenceValue(
          'person-uuid',
          'associated_people',
          { ...mockContext, resourceType: UniversalResourceType.DEALS },
          meta
        );

        expect(result.transformed).toBe(true);
        expect(
          (result.transformedValue as Array<{ target_object: string }>)[0]
            .target_object
        ).toBe('people');
      });

      it('should infer target_object for main_contact field', async () => {
        const meta: AttributeMetadata = {
          slug: 'main_contact',
          type: 'record-reference',
          title: 'Main Contact',
        };

        const result = await transformRecordReferenceValue(
          'person-uuid',
          'main_contact',
          { ...mockContext, resourceType: UniversalResourceType.COMPANIES },
          meta
        );

        expect(result.transformed).toBe(true);
        expect(
          (result.transformedValue as Array<{ target_object: string }>)[0]
            .target_object
        ).toBe('people');
      });

      it('should skip transformation when target object cannot be inferred', async () => {
        const unknownMeta: AttributeMetadata = {
          slug: 'unknown_field',
          type: 'record-reference',
          title: 'Unknown Field',
          // No relationship and field name doesn't match patterns
        };

        const result = await transformRecordReferenceValue(
          'some-uuid',
          'unknown_field',
          mockContext,
          unknownMeta
        );

        expect(result.transformed).toBe(false);
        expect(result.description).toContain(
          'Could not determine target object'
        );
      });
    });

    describe('Edge cases', () => {
      it('should handle empty string gracefully', async () => {
        const result = await transformRecordReferenceValue(
          '',
          'company',
          mockContext,
          companyRefMeta
        );

        // Empty string should not transform successfully
        expect(result.transformed).toBe(false);
      });

      it('should handle whitespace-only string gracefully', async () => {
        const result = await transformRecordReferenceValue(
          '   ',
          'company',
          mockContext,
          companyRefMeta
        );

        // Whitespace-only should not transform successfully
        expect(result.transformed).toBe(false);
      });

      it('should handle object without any recognized ID field', async () => {
        const weirdObject = { foo: 'bar', baz: 123 };

        const result = await transformRecordReferenceValue(
          weirdObject,
          'company',
          mockContext,
          companyRefMeta
        );

        expect(result.transformed).toBe(false);
        expect(result.description).toContain('Could not extract record ID');
      });
    });
  });
});
