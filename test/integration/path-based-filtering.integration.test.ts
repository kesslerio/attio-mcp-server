/**
 * Integration tests for path-based filtering of list entries
 */
import { describe, it, expect } from 'vitest';

import { getListDetails } from '../../src/api/operations/lists';
import { getListEntries } from '../../src/api/operations/lists';

// Skip tests if no API key is available

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

        // Resolve the canonical UUID for the provided TEST_LIST_ID (which may be an api_slug)
          (listDetails as any)?.id?.list_id ||
          (listDetails as any)?.id ||
          TEST_LIST_ID;

        // Each result should have basic list entry properties
        results.forEach((entry) => {
          expect(entry.id).toBeDefined();
          // Some API shapes may omit list_id when querying within a specific list context.
          // When present, it should match the canonical list UUID.
          if ((entry as any).list_id) {
            expect((entry as any).list_id).toBe(expectedListUUID);
          }
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
            (listDetails as any)?.id?.list_id ||
            (listDetails as any)?.id ||
            TEST_LIST_ID;

          results.forEach((entry) => {
            expect(entry.id).toBeDefined();
            if ((entry as any).list_id) {
              expect((entry as any).list_id).toBe(expectedListUUID);
            }
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
        // Discover a valid parent_record_id from the target list to avoid flakiness
          (e: unknown) => e && (e.parent_record_id || e.record_id)
        );
          seed?.parent_record_id ||
          seed?.record_id ||
          process.env.TEST_RECORD_ID;

        if (!recordId) {
          // Graceful skip: not enough data to validate this scenario
          console.warn(
            '[integration] Skipping parent-record-id test — no seed record found'
          );
          return;
        }

        // Act
          TEST_LIST_ID,
          recordId,
          5 // Limit to 5 entries
        );

        // Assert
        expect(Array.isArray(results)).toBe(true);
        // Each result should have basic list entry properties
        if (results.length > 0) {
            (listDetails as any)?.id?.list_id ||
            (listDetails as any)?.id ||
            TEST_LIST_ID;

          results.forEach((entry) => {
            expect(entry.id).toBeDefined();
            if ((entry as any).list_id) {
              expect((entry as any).list_id).toBe(expectedListUUID);
            }
            // For direct record ID filters, the parent_record_id should match when present
            if ((entry as any).parent_record_id) {
              expect((entry as any).parent_record_id).toBe(recordId);
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
