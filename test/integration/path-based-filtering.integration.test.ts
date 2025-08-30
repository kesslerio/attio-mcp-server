/**
 * Integration tests for path-based filtering of list entries
 */
import { describe, it, expect } from 'vitest';

describe('Path-based list entry filtering', () => {
  // Use a known list ID - adjust this to a valid list ID in your test environment

  describe('filterListEntriesByParent', () => {
    itif(
      'should filter list entries by parent company industry',
      async () => {
        // Arrange - Use a condition that should match at least one company

        // Act
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
      30000
    ); // 30s timeout for API call

    itif(
      'should filter list entries by parent person email domain',
      async () => {
        // Arrange

        // Act
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
      30000
    ); // 30s timeout for API call
  });

  describe('filterListEntriesByParentId', () => {
    itif(
      'should filter list entries by parent record ID',
      async () => {
        // Arrange - Use a record ID that should exist in the list
        // This ID should be adjusted to match a real record in your test environment

        // Act
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
      30000
    ); // 30s timeout for API call
  });

  describe('error handling', () => {
    itif(
      'should handle invalid list ID gracefully',
      async () => {
        // Arrange

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
      30000
    ); // 30s timeout for API call

    itif(
      'should handle invalid attribute gracefully',
      async () => {
        // Arrange

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
      30000
    ); // 30s timeout for API call
  });
});
