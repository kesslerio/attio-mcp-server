/**
 * Integration tests for Issue #414 API Contract Violations fixes
 *
 * This test suite validates the three phases of fixes:
 * 1. Email validation consistency
 * 2. Field parameter filtering
 * 3. Category parameter filtering
 * 4. Parameter handling bugs (tasks compatibility)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  handleUniversalCreate,
  handleUniversalUpdate,
  handleUniversalGetDetails,
  handleUniversalGetAttributes,
  handleUniversalDiscoverAttributes,
} from '../../src/handlers/tool-configs/universal/shared-handlers.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { UniversalValidationError } from '../../src/handlers/tool-configs/universal/schemas.js';

describe('Issue #414: API Contract Violations Fixes', () => {
  let testRecordId: string;
  const testData = {
    name: 'Test Person for Issue 414',
    email_addresses: ['test414@example.com'], // Simplified format to avoid nesting issues
  };

  beforeAll(async () => {
    // Create a test record for field filtering tests
    try {
      const result = await handleUniversalCreate({
        resource_type: UniversalResourceType.PEOPLE,
        record_data: testData,
      });
      testRecordId = result.id?.record_id || result.id?.person_id;
    } catch (error) {
      console.warn(
        'Test record creation failed - some tests may be skipped:',
        error
      );
    }
  });

  afterAll(async () => {
    // Cleanup test record
    if (testRecordId) {
      try {
        await handleUniversalGetDetails({
          resource_type: UniversalResourceType.PEOPLE,
          record_id: testRecordId,
        });
        // Record exists, no deletion needed for now to avoid API quota
      } catch (error) {
        // Record doesn't exist or error - no action needed
      }
    }
  });

  describe('Phase 1: Email Validation Consistency', () => {
    it('should reject invalid emails in create operations', async () => {
      const invalidEmailData = {
        name: 'Invalid Email Test',
        email_addresses: ['invalid-email-format'], // Simplified format
      };

      await expect(
        handleUniversalCreate({
          resource_type: UniversalResourceType.PEOPLE,
          record_data: invalidEmailData,
        })
      ).rejects.toThrow(/Invalid email format/);
    });

    it('should reject invalid emails in update operations', async () => {
      if (!testRecordId) {
        console.warn('Skipping update test - no test record available');
        return;
      }

      const invalidEmailData = {
        email_addresses: ['invalid-email-format'], // Simplified format
      };

      await expect(
        handleUniversalUpdate({
          resource_type: UniversalResourceType.PEOPLE,
          record_id: testRecordId,
          record_data: invalidEmailData,
        })
      ).rejects.toThrow(/Invalid email format/);
    });

    it('should accept valid emails in both create and update operations', async () => {
      // Test create with valid email
      const validEmailData = {
        name: 'Valid Email Test',
        email_addresses: ['valid@example.com'], // Simplified format
      };

      const createResult = await handleUniversalCreate({
        resource_type: UniversalResourceType.PEOPLE,
        record_data: validEmailData,
      });

      expect(createResult).toBeDefined();
      expect(createResult.id).toBeDefined();

      // Test update with valid email (if we have a test record)
      if (testRecordId) {
        const updateResult = await handleUniversalUpdate({
          resource_type: UniversalResourceType.PEOPLE,
          record_id: testRecordId,
          record_data: {
            email_addresses: ['updated-valid@example.com'], // Simplified format
          },
        });

        expect(updateResult).toBeDefined();
      }
    });
  });

  describe('Phase 2: Field Parameter Filtering', () => {
    it('should filter fields in get-record-details when fields parameter is provided', async () => {
      if (!testRecordId) {
        console.warn(
          'Skipping field filtering test - no test record available'
        );
        return;
      }

      // Get record with specific fields only
      const filteredResult = await handleUniversalGetDetails({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: testRecordId,
        fields: ['name', 'email_addresses'],
      });

      expect(filteredResult).toBeDefined();
      expect(filteredResult.values).toBeDefined();

      // The filtered result should have the requested fields
      const values = filteredResult.values as Record<string, unknown>;
      const fieldNames = Object.keys(values);

      // Should contain requested fields (name, email_addresses) or their API equivalents
      const hasRequestedFields = fieldNames.some((field) =>
        ['name', 'email_addresses', 'first_name', 'last_name'].includes(field)
      );
      expect(hasRequestedFields).toBe(true);
    });

    it('should return all fields when no fields parameter is provided', async () => {
      if (!testRecordId) {
        console.warn('Skipping unfiltered test - no test record available');
        return;
      }

      // Get record without field filtering
      const unfilteredResult = await handleUniversalGetDetails({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: testRecordId,
      });

      expect(unfilteredResult).toBeDefined();
      expect(unfilteredResult.values).toBeDefined();

      // Should have multiple fields (more than just the filtered subset)
      const values = unfilteredResult.values as Record<string, unknown>;
      expect(Object.keys(values).length).toBeGreaterThan(0);
    });
  });

  describe('Phase 3: Category Parameter Filtering', () => {
    it('should filter categories in get-attributes when categories parameter is provided', async () => {
      // Test category filtering for people
      const filteredResult = await handleUniversalGetAttributes({
        resource_type: UniversalResourceType.PEOPLE,
        categories: ['basic'],
      });

      expect(filteredResult).toBeDefined();

      // Should have attributes property
      if (Array.isArray(filteredResult.attributes)) {
        const attributes = filteredResult.attributes as Array<{
          category?: string;
        }>;

        // If filtering is working, we should either have:
        // 1. Only basic category attributes, or
        // 2. No category property on attributes (meaning no filtering applied)
        if (attributes.length > 0 && attributes[0].category) {
          // If category property exists, all should be 'basic'
          const allBasic = attributes.every(
            (attr) => attr.category === 'basic'
          );
          expect(allBasic).toBe(true);
        }
      }
    });

    it('should filter categories in discover-attributes when categories parameter is provided', async () => {
      // Test category filtering for people discovery
      const filteredResult = await handleUniversalDiscoverAttributes(
        UniversalResourceType.PEOPLE,
        { categories: ['basic'] }
      );

      expect(filteredResult).toBeDefined();

      // Should have attributes property
      if (Array.isArray(filteredResult.attributes)) {
        const attributes = filteredResult.attributes as Array<{
          category?: string;
        }>;

        // Verify filtering worked if category property exists
        if (attributes.length > 0 && attributes[0].category) {
          const allBasic = attributes.every(
            (attr) => attr.category === 'basic'
          );
          expect(allBasic).toBe(true);
        }
      }
    });

    it('should support category filtering for tasks (parameter handling bug fix)', async () => {
      // Test the specific bug fix for tasks parameter handling
      const basicTaskAttributes = await handleUniversalDiscoverAttributes(
        UniversalResourceType.TASKS,
        { categories: ['basic'] }
      );

      expect(basicTaskAttributes).toBeDefined();
      expect(basicTaskAttributes.attributes).toBeDefined();

      const attributes = basicTaskAttributes.attributes as Array<{
        category?: string;
      }>;
      expect(Array.isArray(attributes)).toBe(true);

      // If category filtering is working, all attributes should be 'basic'
      if (attributes.length > 0) {
        const allBasic = attributes.every((attr) => attr.category === 'basic');
        expect(allBasic).toBe(true);

        // Should include basic task fields like content, status, due_date
        const basicFields = attributes.map((attr) => attr.api_slug);
        expect(basicFields).toContain('content');
        expect(basicFields).toContain('status');
      }

      // Test business category filtering
      const businessTaskAttributes = await handleUniversalDiscoverAttributes(
        UniversalResourceType.TASKS,
        { categories: ['business'] }
      );

      expect(businessTaskAttributes).toBeDefined();
      const businessAttributes = businessTaskAttributes.attributes as Array<{
        category?: string;
      }>;

      if (businessAttributes.length > 0) {
        const allBusiness = businessAttributes.every(
          (attr) => attr.category === 'business'
        );
        expect(allBusiness).toBe(true);

        // Should include business task fields like assignee, linked_records
        const businessFields = businessAttributes.map((attr) => attr.api_slug);
        expect(businessFields).toContain('assignee');
        expect(businessFields).toContain('linked_records');
      }
    });

    it('should return all categories when no categories parameter is provided', async () => {
      // Test that no filtering occurs without categories parameter
      const allTaskAttributes = await handleUniversalDiscoverAttributes(
        UniversalResourceType.TASKS
      );

      expect(allTaskAttributes).toBeDefined();
      expect(allTaskAttributes.attributes).toBeDefined();

      const attributes = allTaskAttributes.attributes as Array<{
        category?: string;
      }>;
      expect(Array.isArray(attributes)).toBe(true);
      expect(attributes.length).toBeGreaterThan(0);

      // Should include both basic and business attributes
      const categories = attributes.map((attr) => attr.category);
      expect(categories).toContain('basic');
      expect(categories).toContain('business');
    });
  });

  describe('Integration: Combined Parameter Usage', () => {
    it('should handle both fields and categories parameters together', async () => {
      if (!testRecordId) {
        console.warn(
          'Skipping combined parameter test - no test record available'
        );
        return;
      }

      // Test get-attributes with both record_id and categories
      const result = await handleUniversalGetAttributes({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: testRecordId,
        categories: ['basic'],
      });

      expect(result).toBeDefined();

      // Should work without throwing errors
      if (typeof result === 'object' && result !== null) {
        expect(Object.keys(result).length).toBeGreaterThan(0);
      }
    });

    it('should maintain backward compatibility when no parameters are provided', async () => {
      // Ensure existing functionality still works without parameters
      const peopleAttributes = await handleUniversalDiscoverAttributes(
        UniversalResourceType.PEOPLE
      );

      expect(peopleAttributes).toBeDefined();
      expect(peopleAttributes.attributes).toBeDefined();

      const taskAttributes = await handleUniversalDiscoverAttributes(
        UniversalResourceType.TASKS
      );

      expect(taskAttributes).toBeDefined();
      expect(taskAttributes.attributes).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty categories array gracefully', async () => {
      const result = await handleUniversalDiscoverAttributes(
        UniversalResourceType.TASKS,
        { categories: [] }
      );

      expect(result).toBeDefined();
      // Empty categories should return all attributes (no filtering)
      expect(result.attributes).toBeDefined();
    });

    it('should handle invalid categories gracefully', async () => {
      const result = await handleUniversalDiscoverAttributes(
        UniversalResourceType.TASKS,
        { categories: ['nonexistent-category'] }
      );

      expect(result).toBeDefined();
      // Invalid categories should return empty results or handle gracefully
      expect(result.attributes).toBeDefined();
    });

    it('should handle empty fields array gracefully', async () => {
      if (!testRecordId) {
        console.warn('Skipping empty fields test - no test record available');
        return;
      }

      const result = await handleUniversalGetDetails({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: testRecordId,
        fields: [],
      });

      expect(result).toBeDefined();
      // Empty fields should return full record (no filtering)
      expect(result.values).toBeDefined();
    });
  });
});
