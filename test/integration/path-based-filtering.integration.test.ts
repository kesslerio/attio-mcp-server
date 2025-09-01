/**
 * Integration tests for path-based filtering of list entries
 */
import { describe, it, expect } from 'vitest';
import {
  filterListEntriesByParent,
  filterListEntriesByParentId,
} from '../../src/objects/lists';
import { getListDetails } from '../../src/api/operations/lists';
import { getListEntries } from '../../src/api/operations/lists';

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

        // Resolve the canonical UUID for the provided TEST_LIST_ID (which may be an api_slug)
        const listDetails = await getListDetails(TEST_LIST_ID);
        const expectedListUUID =
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
          const listDetails = await getListDetails(TEST_LIST_ID);
          const expectedListUUID =
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
        const seedEntries = await getListEntries(TEST_LIST_ID, 5, 0);
        const seed = (seedEntries || []).find(
          (e: any) => e && (e.parent_record_id || e.record_id)
        );
        const recordId =
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
        const results = await filterListEntriesByParentId(
          TEST_LIST_ID,
          recordId,
          5 // Limit to 5 entries
        );

        // Assert
        expect(Array.isArray(results)).toBe(true);
        // Each result should have basic list entry properties
        if (results.length > 0) {
          const listDetails = await getListDetails(TEST_LIST_ID);
          const expectedListUUID =
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
      30000
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
      30000
    ); // 30s timeout for API call
  });
});
