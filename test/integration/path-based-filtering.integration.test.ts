/**
 * Integration tests for path-based filtering of list entries
 */
import { describe, expect, it } from 'vitest';
import {
  filterListEntriesByParent,
  filterListEntriesByParentId,
} from '../../src/objects/lists';

// Skip tests if no API key is available
const skipTests = !process.env.ATTIO_API_KEY;
const itif = skipTests ? it.skip : it;

describe('Path-based list entry filtering', () => {
  // Use a known list ID - adjust this to a valid list ID in your test environment
  const TEST_LIST_ID = process.env.TEST_LIST_ID || 'list_12345';

  describe('filterListEntriesByParent', () => {
    itif(
      'should filter list entries by parent company industry',
      async () => {
        // Arrange - Use a condition that should match at least one company
        const parentObjectType = 'companies';
        const parentAttributeSlug = 'industry';
        const condition = 'contains';
        const value = 'Tech'; // Adjust this value based on your test data

        // Act
        const results = await filterListEntriesByParent(
          TEST_LIST_ID,
          parentObjectType,
          parentAttributeSlug,
          condition,
          value,
          5 // Limit to 5 entries
        );

        // Assert
        expect(Array.isArray(results)).toBe(true);
        // Should find at least one matching entry
        expect(results.length).toBeGreaterThan(0);
        // Each result should have basic list entry properties
        results.forEach((entry) => {
          expect(entry.id).toBeDefined();
          expect(entry.list_id).toBe(TEST_LIST_ID);
        });
      },
      30_000
    ); // 30s timeout for API call

    itif(
      'should filter list entries by parent person email domain',
      async () => {
        // Arrange
        const parentObjectType = 'people';
        const parentAttributeSlug = 'email_addresses';
        const condition = 'contains';
        const value = '@example.com'; // Adjust based on your test data

        // Act
        const results = await filterListEntriesByParent(
          TEST_LIST_ID,
          parentObjectType,
          parentAttributeSlug,
          condition,
          value,
          5 // Limit to 5 entries
        );

        // Assert
        expect(Array.isArray(results)).toBe(true);
        // Each result should have basic list entry properties
        if (results.length > 0) {
          results.forEach((entry) => {
            expect(entry.id).toBeDefined();
            expect(entry.list_id).toBe(TEST_LIST_ID);
          });
        }
      },
      30_000
    ); // 30s timeout for API call
  });

  describe('filterListEntriesByParentId', () => {
    itif(
      'should filter list entries by parent record ID',
      async () => {
        // Arrange - Use a record ID that should exist in the list
        // This ID should be adjusted to match a real record in your test environment
        const recordId = process.env.TEST_RECORD_ID || 'record_12345';

        // Act
        const results = await filterListEntriesByParentId(
          TEST_LIST_ID,
          recordId,
          5 // Limit to 5 entries
        );

        // Assert
        expect(Array.isArray(results)).toBe(true);
        // Each result should have basic list entry properties
        if (results.length > 0) {
          results.forEach((entry) => {
            expect(entry.id).toBeDefined();
            expect(entry.list_id).toBe(TEST_LIST_ID);
            // For direct record ID filters, the parent_record_id should match
            if (entry.parent_record_id) {
              expect(entry.parent_record_id).toBe(recordId);
            }
          });
        }
      },
      30_000
    ); // 30s timeout for API call
  });

  describe('error handling', () => {
    itif(
      'should handle invalid list ID gracefully',
      async () => {
        // Arrange
        const invalidListId = 'non_existent_list';

        // Act & Assert
        await expect(
          filterListEntriesByParent(
            invalidListId,
            'companies',
            'industry',
            'contains',
            'Tech'
          )
        ).rejects.toThrow();
      },
      30_000
    ); // 30s timeout for API call

    itif(
      'should handle invalid attribute gracefully',
      async () => {
        // Arrange
        const invalidAttribute = 'non_existent_attribute';

        // Act & Assert
        await expect(
          filterListEntriesByParent(
            TEST_LIST_ID,
            'companies',
            invalidAttribute,
            'contains',
            'Tech'
          )
        ).rejects.toThrow();
      },
      30_000
    ); // 30s timeout for API call
  });
});
