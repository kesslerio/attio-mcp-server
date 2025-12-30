/**
 * Integration tests for universal tools with lists resource type.
 * Verifies that universal tools can correctly replace list-specific tools.
 *
 * Issue #1059 - List tools consolidation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { UniversalSearchService } from '@services/UniversalSearchService.js';
import { UniversalMetadataService } from '@services/UniversalMetadataService.js';
import { getLists, getListDetails } from '@src/objects/lists/base.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';

describe('Universal Tools - Lists Integration', () => {
  describe('search_records (resource_type="lists") vs get-lists', () => {
    it('should return same data format as get-lists', async () => {
      // Get lists using old tool
      const listsOldTool = await getLists();

      // Get lists using universal tool
      const listsUniversalTool = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.LISTS,
        query: '', // Empty query returns all
        limit: 100,
      });

      // Both should return arrays
      expect(Array.isArray(listsOldTool)).toBe(true);
      expect(Array.isArray(listsUniversalTool)).toBe(true);

      // Should have same number of results (or close, accounting for pagination)
      expect(listsUniversalTool.length).toBeGreaterThan(0);
      expect(listsUniversalTool.length).toBeLessThanOrEqual(100);

      // Verify data structure matches
      if (listsUniversalTool.length > 0) {
        const universalList = listsUniversalTool[0];
        const oldToolList = listsOldTool.find(
          (l: any) => l.id?.list_id === (universalList as any).id?.list_id
        );

        if (oldToolList) {
          // Verify key fields exist in both
          expect(universalList).toHaveProperty('id');
          expect(universalList).toHaveProperty('name');
          expect(oldToolList).toHaveProperty('id');
          expect(oldToolList).toHaveProperty('name');
        }
      }
    });

    it('should include all list metadata', async () => {
      const lists = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.LISTS,
        query: '',
        limit: 10,
      });

      if (lists.length > 0) {
        const list = lists[0] as any;

        // Verify essential metadata fields
        expect(list).toHaveProperty('id');
        expect(list.id).toHaveProperty('list_id');
        expect(list).toHaveProperty('name');
        expect(list).toHaveProperty('api_slug');
        expect(list).toHaveProperty('workspace_id');

        // Should have ID structure
        expect(typeof list.id.list_id).toBe('string');
        expect(list.id.list_id.length).toBeGreaterThan(0);

        // Should have valid name
        expect(typeof list.name).toBe('string');
        expect(list.name.length).toBeGreaterThan(0);
      }
    });

    it('should support query filtering', async () => {
      // First get all lists
      const allLists = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.LISTS,
        query: '',
        limit: 100,
      });

      if (allLists.length > 0) {
        // Get a list name to search for
        const targetList = allLists[0] as any;
        const searchName = targetList.name;

        // Search by name
        const filteredLists = await UniversalSearchService.searchRecords({
          resource_type: UniversalResourceType.LISTS,
          query: searchName.substring(0, 5), // Search by first 5 chars
          limit: 100,
        });

        // Should return results
        expect(filteredLists.length).toBeGreaterThan(0);

        // Should include the target list
        const found = filteredLists.some(
          (l: any) => l.id?.list_id === targetList.id.list_id
        );
        expect(found).toBe(true);
      }
    });

    it('should support pagination', async () => {
      // Get first page
      const page1 = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.LISTS,
        query: '',
        limit: 5,
        offset: 0,
      });

      // Get second page
      const page2 = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.LISTS,
        query: '',
        limit: 5,
        offset: 5,
      });

      // Both pages should have results (assuming >5 lists exist)
      expect(Array.isArray(page1)).toBe(true);
      expect(Array.isArray(page2)).toBe(true);

      // Pages should not overlap (different IDs)
      if (page1.length > 0 && page2.length > 0) {
        const page1Ids = page1.map((l: any) => l.id?.list_id);
        const page2Ids = page2.map((l: any) => l.id?.list_id);

        const overlap = page1Ids.some((id) => page2Ids.includes(id));
        expect(overlap).toBe(false);
      }
    });
  });

  describe('get_record_details (resource_type="lists") vs get-list-details', () => {
    let testListId: string;
    let testListSlug: string;

    beforeAll(async () => {
      // Get a list ID for testing
      const lists = await getLists();
      if (lists.length > 0) {
        testListId = lists[0].id?.list_id || '';
        testListSlug = lists[0].api_slug || '';
      }
    });

    it('should return same data with UUID identifier', async () => {
      if (!testListId) {
        console.warn('No test list ID available, skipping test');
        return;
      }

      // Get list details using old tool (UUID)
      const detailsOld = await getListDetails(testListId);

      // Get list details using universal tool (UUID)
      const detailsUniversal = await UniversalMetadataService.getRecordDetails({
        resource_type: UniversalResourceType.LISTS,
        record_id: testListId,
      });

      // Both should return object
      expect(typeof detailsOld).toBe('object');
      expect(typeof detailsUniversal).toBe('object');
      expect(detailsOld).not.toBeNull();
      expect(detailsUniversal).not.toBeNull();

      // Verify key fields match
      expect((detailsOld as any).id?.list_id).toBe(
        (detailsUniversal as any).id?.list_id
      );
      expect((detailsOld as any).name).toBe((detailsUniversal as any).name);
      expect((detailsOld as any).api_slug).toBe(
        (detailsUniversal as any).api_slug
      );
    });

    it('should return same data with slug identifier', async () => {
      if (!testListSlug) {
        console.warn('No test list slug available, skipping test');
        return;
      }

      // Get list details using old tool (slug)
      const detailsOld = await getListDetails(testListSlug);

      // Get list details using universal tool (slug)
      const detailsUniversal = await UniversalMetadataService.getRecordDetails({
        resource_type: UniversalResourceType.LISTS,
        record_id: testListSlug,
      });

      // Both should return object
      expect(typeof detailsOld).toBe('object');
      expect(typeof detailsUniversal).toBe('object');

      // Verify slug matches
      expect((detailsOld as any).api_slug).toBe(
        (detailsUniversal as any).api_slug
      );
    });

    it('should include full list schema and configuration', async () => {
      if (!testListId) {
        console.warn('No test list ID available, skipping test');
        return;
      }

      const details = (await UniversalMetadataService.getRecordDetails({
        resource_type: UniversalResourceType.LISTS,
        record_id: testListId,
      })) as any;

      // Verify essential metadata
      expect(details).toHaveProperty('id');
      expect(details).toHaveProperty('name');
      expect(details).toHaveProperty('api_slug');
      expect(details).toHaveProperty('workspace_id');

      // Note: attributes field may not be returned by the basic list details API
      // If attributes are needed, use a separate get-attributes call
    });

    it('should handle invalid list ID gracefully', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';

      // Should throw error for non-existent list
      await expect(
        UniversalMetadataService.getRecordDetails({
          resource_type: UniversalResourceType.LISTS,
          record_id: invalidId,
        })
      ).rejects.toThrow();
    });
  });

  describe('Data format consistency', () => {
    it('should return consistent data structures across old and new tools', async () => {
      // Get data from both sources
      const listsOld = await getLists();
      const listsNew = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.LISTS,
        query: '',
        limit: 100,
      });

      if (listsOld.length > 0 && listsNew.length > 0) {
        const oldList = listsOld[0] as any;
        const newList = listsNew.find(
          (l: any) => l.id?.list_id === oldList.id?.list_id
        ) as any;

        if (newList) {
          // Check that both have the same keys
          const oldKeys = Object.keys(oldList).sort();
          const newKeys = Object.keys(newList).sort();

          // Core keys should be present in both
          const coreKeys = ['id', 'name', 'api_slug', 'workspace_id'];
          for (const key of coreKeys) {
            expect(oldKeys).toContain(key);
            expect(newKeys).toContain(key);
          }

          // Values should match for core fields
          expect(oldList.id?.list_id).toBe(newList.id?.list_id);
          expect(oldList.name).toBe(newList.name);
          expect(oldList.api_slug).toBe(newList.api_slug);
        }
      }
    });
  });

  describe('List-native format (Issue #1068)', () => {
    it('should return list-native format from search_records (list_id only, no record_id)', async () => {
      const lists = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.LISTS,
        query: '',
        limit: 10,
      });

      if (lists.length > 0) {
        const list = lists[0] as any;

        // Verify list_id exists
        expect(list.id).toHaveProperty('list_id');
        expect(typeof list.id.list_id).toBe('string');
        expect(list.id.list_id.length).toBeGreaterThan(0);

        // Verify NO record_id normalization (preserve list-native structure)
        expect(list.id.record_id).toBeUndefined();

        // Verify top-level fields (not in values wrapper)
        expect(typeof list.name).toBe('string');
        expect(list.name.length).toBeGreaterThan(0);

        // Verify NO values wrapper
        expect(list.values).toBeUndefined();
      }
    });

    it('should return list-native format from get_record_details (list_id only, no record_id)', async () => {
      const lists = await getLists();
      if (lists.length === 0) {
        console.warn('No lists available for testing');
        return;
      }

      const testListId = lists[0].id?.list_id;
      if (!testListId) {
        console.warn('No test list ID available');
        return;
      }

      const details = (await UniversalMetadataService.getRecordDetails({
        resource_type: UniversalResourceType.LISTS,
        record_id: testListId,
      })) as any;

      // Verify list_id exists
      expect(details.id).toHaveProperty('list_id');
      expect(typeof details.id.list_id).toBe('string');

      // Verify NO record_id normalization (preserve list-native structure)
      expect(details.id.record_id).toBeUndefined();

      // Verify top-level fields (not in values wrapper)
      expect(typeof details.name).toBe('string');
      expect(details.name.length).toBeGreaterThan(0);

      // Verify NO values wrapper
      expect(details.values).toBeUndefined();
    });

    it('should return consistent format between search and details', async () => {
      const lists = await getLists();
      if (lists.length === 0) {
        console.warn('No lists available for testing');
        return;
      }

      const testListId = lists[0].id?.list_id;
      if (!testListId) {
        console.warn('No test list ID available');
        return;
      }

      // Get from search
      const searchResults = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.LISTS,
        query: '',
        limit: 100,
      });

      const searchResult = searchResults.find(
        (l: any) => l.id?.list_id === testListId
      ) as any;

      if (!searchResult) {
        console.warn('Test list not found in search results');
        return;
      }

      // Get from details
      const detailsResult = (await UniversalMetadataService.getRecordDetails({
        resource_type: UniversalResourceType.LISTS,
        record_id: testListId,
      })) as any;

      // Both should have identical structure
      expect(searchResult.id).toEqual(detailsResult.id);
      expect(searchResult.name).toBe(detailsResult.name);
      expect(searchResult.values).toBeUndefined();
      expect(detailsResult.values).toBeUndefined();

      // Both should use list_id (not record_id)
      expect(searchResult.id.list_id).toBe(testListId);
      expect(detailsResult.id.list_id).toBe(testListId);
      expect(searchResult.id.record_id).toBeUndefined();
      expect(detailsResult.id.record_id).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle empty query gracefully', async () => {
      const lists = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.LISTS,
        query: '',
        limit: 10,
      });

      // Should return array (even if empty)
      expect(Array.isArray(lists)).toBe(true);
    });

    it('should handle pagination edge cases', async () => {
      // Offset beyond available records
      const lists = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.LISTS,
        query: '',
        limit: 10,
        offset: 10000,
      });

      // Should return empty array
      expect(Array.isArray(lists)).toBe(true);
      expect(lists.length).toBe(0);
    });

    it('should handle invalid resource type gracefully', async () => {
      // Invalid/non-existent resource types are treated as custom object slugs
      // and should return empty array rather than throwing an error
      const lists = await UniversalSearchService.searchRecords({
        resource_type: 'invalid_type' as any,
        query: '',
        limit: 10,
      });

      // Should return empty array for non-existent custom objects
      expect(Array.isArray(lists)).toBe(true);
      expect(lists.length).toBe(0);
    });
  });
});
