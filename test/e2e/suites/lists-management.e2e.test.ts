/**
 * Lists Management E2E Tests
 * 
 * Comprehensive end-to-end testing of lists-related MCP tools
 * including CRUD operations, filtering, membership management, and error scenarios.
 * 
 * Tools tested (now using universal tools with automatic migration):
 * - get-lists → search-records (resource_type: 'lists')
 * - get-list-details → get-record-details (resource_type: 'lists')
 * - get-list-entries → search-by-relationship
 * - filter-list-entries → advanced-search
 * - advanced-filter-list-entries → advanced-search
 * - add-record-to-list → update-record (resource_type: 'lists')
 * - remove-record-from-list → update-record (resource_type: 'lists')
 * - update-list-entry → update-record (resource_type: 'lists')
 * - get-record-list-memberships → search-by-relationship
 * - filter-list-entries-by-parent → advanced-search
 * - filter-list-entries-by-parent-id → search-by-relationship
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { E2ETestBase } from '../setup.js';
import { E2EAssertions } from '../utils/assertions.js';
import { loadE2EConfig } from '../utils/config-loader.js';
import { 
  CompanyFactory, 
  PersonFactory, 
  ListFactory,
  TestScenarios
} from '../fixtures/index.js';
import type { TestDataObject, McpToolResponse } from '../types/index.js';

// Import enhanced tool caller with logging and migration
import { 
  callListTool,
  validateTestEnvironment,
  getToolMigrationStats
} from '../utils/enhanced-tool-caller.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';

/**
 * Lists Management E2E Test Suite
 * 
 * Tests comprehensive list management functionality including:
 * - List discovery and details retrieval
 * - Entry management (add, remove, update)
 * - Filtering and search capabilities
 * - Membership tracking
 * - Parent-based filtering
 * - Error handling and edge cases
 */
// Test configuration
const config = await loadE2EConfig();
const createdRecords: Array<{ type: string; id: string; data?: any }> = [];

// Note: callListTool is now imported from enhanced-tool-caller.js
// It automatically handles legacy-to-universal tool migration and comprehensive logging

/**
 * Helper to create test data and track for cleanup
 */
function trackForCleanup(type: string, id: string, data?: unknown): void {
  createdRecords.push({ type, id, data });
  E2ETestBase.trackForCleanup(type as any, id, data);
}

describe.skipIf(!process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true')('Lists Management E2E Tests', () => {
  // Test data storage
  const testCompanies: TestDataObject[] = [];
  const testPeople: TestDataObject[] = [];
  const testLists: TestDataObject[] = [];
  let listEntries: TestDataObject[] = [];
  
  beforeAll(async () => {

    // Start comprehensive logging for this test suite
    startTestSuite('lists-management');
    
    // Validate test environment and tool migration setup
    const envValidation = await validateTestEnvironment();
    if (!envValidation.valid) {
      console.warn('⚠️ Test environment warnings:', envValidation.warnings);
    }
    
    console.log('📊 Tool migration stats:', getToolMigrationStats());

    await E2ETestBase.setup({
      requiresRealApi: true,
      cleanupAfterTests: true,
      timeout: 120000
    });
    
    console.log('🚀 Starting Lists Management E2E Tests with Universal Tools');
  }, 120000);

  afterAll(async () => {
    // End comprehensive logging for this test suite
    endTestSuite();
    
    console.log('✅ Lists Management E2E Tests completed with enhanced logging');
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('List Discovery', () => {
    it('should retrieve all available lists', async () => {
      const response = await callListTool('get-lists', {});
      
      E2EAssertions.expectMcpSuccess(response);
      const data = E2EAssertions.expectMcpData(response);
      
      expect(data).toBeDefined();
      expect(Array.isArray(data) || (data && Array.isArray((data as any).data))).toBe(true);
      
      console.log('📋 Found lists:', Array.isArray(data) ? data.length : (data as any)?.data?.length || 0);
    }, 30000);

    it('should handle empty lists response gracefully', async () => {
      const response = await callListTool('get-lists', {});
      
      E2EAssertions.expectMcpSuccess(response);
      // Even if no lists exist, the response should be valid
      const data = E2EAssertions.expectMcpData(response);
      expect(data).toBeDefined();
    }, 15000);
  });

  describe('List Details and Information', () => {
    let availableListId: string;

    beforeAll(async () => {
      // Get a list to work with
      const listsResponse = await callListTool('get-lists', {});
      const listsData = E2EAssertions.expectMcpData(listsResponse);
      
      if (Array.isArray(listsData) && listsData.length > 0) {
        availableListId = listsData[0].id?.list_id || listsData[0].id;
      } else if (listsData && Array.isArray((listsData as any).data) && (listsData as any).data.length > 0) {
        availableListId = (listsData as any).data[0].id?.list_id || (listsData as any).data[0].id;
      }
      
      if (!availableListId) {
        console.warn('⚠️ No existing lists found - some tests may be skipped');
      }
    });

    it('should retrieve detailed information for a specific list', async () => {
      if (!availableListId) {
        console.log('⏭️ Skipping list details test - no lists available');
        return;
      }

      const response = await callListTool('get-list-details', {
        listId: availableListId
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const listDetails = E2EAssertions.expectMcpData(response);
      
      expect(listDetails).toBeDefined();
      expect(listDetails.id).toBeDefined();
      expect(listDetails.name || listDetails.title).toBeDefined();
      expect(listDetails.object_slug || listDetails.parent_object).toBeDefined();
      
      console.log('📄 List details retrieved for:', listDetails.name || listDetails.title);
    }, 30000);

    it('should handle invalid list ID gracefully', async () => {
      const response = await callListTool('get-list-details', {
        listId: 'invalid-list-id-12345'
      });
      
      E2EAssertions.expectMcpError(response, /not found|invalid|does not exist/i);
    }, 15000);

    it('should validate list structure', async () => {
      if (!availableListId) {
        console.log('⏭️ Skipping list validation test - no lists available');
        return;
      }

      const response = await callListTool('get-list-details', {
        listId: availableListId
      });
      
      const listDetails = E2EAssertions.expectMcpData(response);
      E2EAssertions.expectListRecord(listDetails);
    }, 15000);
  });

  describe('List Entries Management', () => {
    let workingListId: string;
    let testCompany: TestDataObject;
    let testPerson: TestDataObject;

    beforeAll(async () => {
      // Get a list to work with
      const listsResponse = await callListTool('get-lists', {});
      const listsData = E2EAssertions.expectMcpData(listsResponse);
      
      let lists: any[] = [];
      if (Array.isArray(listsData)) {
        lists = listsData;
      } else if (listsData && Array.isArray((listsData as any).data)) {
        lists = (listsData as any).data;
      }
      
      // Find a company or people list
      const companyList = lists.find(list => 
        (list.object_slug === 'companies' || list.parent_object === 'companies')
      );
      const peopleList = lists.find(list => 
        (list.object_slug === 'people' || list.parent_object === 'people')
      );
      
      workingListId = companyList?.id?.list_id || companyList?.id || 
                     peopleList?.id?.list_id || peopleList?.id;
      
      if (!workingListId) {
        console.warn('⚠️ No suitable lists found - some tests may be skipped');
      }

      // Create test data
      if (workingListId) {
        const companyData = CompanyFactory.create();
        const companyResponse = await callListTool('create-company', companyData);
        testCompany = E2EAssertions.expectMcpData(companyResponse);
        testCompanies.push(testCompany);

        const personData = PersonFactory.create();
        const personResponse = await callListTool('create-person', personData);
        testPerson = E2EAssertions.expectMcpData(personResponse);
        testPeople.push(testPerson);
      }
    }, 45000);

    it('should retrieve list entries', async () => {
      if (!workingListId) {
        console.log('⏭️ Skipping list entries test - no suitable list available');
        return;
      }

      const response = await callListTool('get-list-entries', {
        listId: workingListId,
        limit: 10
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const entries = E2EAssertions.expectMcpData(response);
      
      expect(entries).toBeDefined();
      expect(Array.isArray(entries) || (entries && Array.isArray((entries as any).data))).toBe(true);
      
      const entryList = Array.isArray(entries) ? entries : (entries as any)?.data || [];
      console.log('📝 List entries found:', entryList.length);
    }, 30000);

    it('should handle pagination for list entries', async () => {
      if (!workingListId) {
        console.log('⏭️ Skipping pagination test - no suitable list available');
        return;
      }

      const response = await callListTool('get-list-entries', {
        listId: workingListId,
        limit: 5,
        offset: 0
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const entries = E2EAssertions.expectMcpData(response);
      expect(entries).toBeDefined();
    }, 15000);

    it('should add a record to a list', async () => {
      if (!workingListId || !testCompany) {
        console.log('⏭️ Skipping add record test - prerequisites not available');
        return;
      }

      const response = await callListTool('add-record-to-list', {
        listId: workingListId,
        recordId: testCompany.id.record_id,
        objectType: 'companies',
        initialValues: {
          stage: 'Prospect'
        }
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const listEntry = E2EAssertions.expectMcpData(response);
      
      expect(listEntry).toBeDefined();
      expect(listEntry.id?.entry_id || listEntry.entry_id).toBeDefined();
      expect(listEntry.record_id || listEntry.parent_record_id).toBe(testCompany.id.record_id);
      
      // Store for cleanup
      listEntries.push(listEntry);
      
      console.log('➕ Added record to list:', listEntry.id?.entry_id || listEntry.entry_id);
    }, 30000);

    it('should prevent duplicate records in lists', async () => {
      if (!workingListId || !testCompany || listEntries.length === 0) {
        console.log('⏭️ Skipping duplicate test - prerequisites not available');
        return;
      }

      const response = await callListTool('add-record-to-list', {
        listId: workingListId,
        recordId: testCompany.id.record_id,
        objectType: 'companies'
      });
      
      // This might succeed or fail depending on list configuration
      // We should handle both cases gracefully
      if (response.isError) {
        expect(response.error).toMatch(/already exists|duplicate|already in list/i);
      } else {
        // If it succeeds, it might return the existing entry
        const entry = E2EAssertions.expectMcpData(response);
        expect(entry).toBeDefined();
      }
    }, 15000);

    it('should update a list entry', async () => {
      if (listEntries.length === 0) {
        console.log('⏭️ Skipping update test - no list entries available');
        return;
      }

      const listEntry = listEntries[0];
      const entryId = listEntry.id?.entry_id || listEntry.entry_id;

      const response = await callListTool('update-list-entry', {
        listId: workingListId,
        entryId: entryId,
        attributes: {
          stage: 'Qualified'
        }
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const updatedEntry = E2EAssertions.expectMcpData(response);
      
      expect(updatedEntry).toBeDefined();
      expect(updatedEntry.id?.entry_id || updatedEntry.entry_id).toBe(entryId);
      
      console.log('✏️ Updated list entry:', entryId);
    }, 30000);

    it('should remove a record from a list', async () => {
      if (listEntries.length === 0) {
        console.log('⏭️ Skipping remove test - no list entries available');
        return;
      }

      const listEntry = listEntries[0];
      const entryId = listEntry.id?.entry_id || listEntry.entry_id;

      const response = await callListTool('remove-record-from-list', {
        listId: workingListId,
        entryId: entryId
      });
      
      E2EAssertions.expectMcpSuccess(response);
      
      // Remove from our tracking
      listEntries = listEntries.filter(e => (e.id?.entry_id || e.entry_id) !== entryId);
      
      console.log('➖ Removed record from list:', entryId);
    }, 30000);

    it('should handle removing non-existent entry gracefully', async () => {
      if (!workingListId) {
        console.log('⏭️ Skipping remove non-existent test - no list available');
        return;
      }

      const response = await callListTool('remove-record-from-list', {
        listId: workingListId,
        entryId: 'non-existent-entry-id-12345'
      });
      
      E2EAssertions.expectMcpError(response, /not found|invalid|does not exist/i);
    }, 15000);
  });

  describe('List Filtering and Search', () => {
    let filterListId: string;

    beforeAll(async () => {
      // Get a list for filtering tests
      const listsResponse = await callListTool('get-lists', {});
      const listsData = E2EAssertions.expectMcpData(listsResponse);
      
      let lists: any[] = [];
      if (Array.isArray(listsData)) {
        lists = listsData;
      } else if (listsData && Array.isArray((listsData as any).data)) {
        lists = (listsData as any).data;
      }
      
      filterListId = lists[0]?.id?.list_id || lists[0]?.id;
    });

    it('should filter list entries by attribute', async () => {
      if (!filterListId) {
        console.log('⏭️ Skipping basic filter test - no list available');
        return;
      }

      const response = await callListTool('filter-list-entries', {
        listId: filterListId,
        attributeSlug: 'stage',
        condition: 'is_not_empty',
        value: null,
        limit: 10
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const filteredEntries = E2EAssertions.expectMcpData(response);
      
      expect(filteredEntries).toBeDefined();
      expect(Array.isArray(filteredEntries) || (filteredEntries && Array.isArray((filteredEntries as any).data))).toBe(true);
      
      console.log('🔍 Filtered entries found:', Array.isArray(filteredEntries) ? filteredEntries.length : (filteredEntries as any)?.data?.length || 0);
    }, 30000);

    it('should perform advanced filtering with multiple conditions', async () => {
      if (!filterListId) {
        console.log('⏭️ Skipping advanced filter test - no list available');
        return;
      }

      const response = await callListTool('advanced-filter-list-entries', {
        listId: filterListId,
        filters: {
          filters: [
            {
              attribute: { slug: 'stage' },
              condition: 'is_not_empty',
              value: null
            }
          ],
          matchAny: false
        },
        limit: 5
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const filteredEntries = E2EAssertions.expectMcpData(response);
      
      expect(filteredEntries).toBeDefined();
      console.log('🔬 Advanced filtered entries:', Array.isArray(filteredEntries) ? filteredEntries.length : (filteredEntries as any)?.data?.length || 0);
    }, 30000);

    it('should handle empty filter results', async () => {
      if (!filterListId) {
        console.log('⏭️ Skipping empty filter test - no list available');
        return;
      }

      const response = await callListTool('filter-list-entries', {
        listId: filterListId,
        attributeSlug: 'stage',
        condition: 'equals',
        value: 'NonExistentStageValue12345',
        limit: 10
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const filteredEntries = E2EAssertions.expectMcpData(response);
      
      // Empty results should still be valid
      expect(filteredEntries).toBeDefined();
      const entryCount = Array.isArray(filteredEntries) ? filteredEntries.length : (filteredEntries as any)?.data?.length || 0;
      expect(entryCount).toBe(0);
    }, 15000);

    it('should filter entries by parent record properties', async () => {
      if (!filterListId) {
        console.log('⏭️ Skipping parent filter test - no list available');
        return;
      }

      const response = await callListTool('filter-list-entries-by-parent', {
        listId: filterListId,
        parentObjectType: 'companies',
        parentAttributeSlug: 'name',
        condition: 'is_not_empty',
        value: null,
        limit: 5
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const filteredEntries = E2EAssertions.expectMcpData(response);
      
      expect(filteredEntries).toBeDefined();
      console.log('👨‍👩‍👧‍👦 Parent-filtered entries:', Array.isArray(filteredEntries) ? filteredEntries.length : (filteredEntries as any)?.data?.length || 0);
    }, 30000);

    it('should filter entries by specific parent record ID', async () => {
      if (!filterListId || testCompanies.length === 0) {
        console.log('⏭️ Skipping parent ID filter test - prerequisites not available');
        return;
      }

      const testCompany = testCompanies[0];
      const response = await callListTool('filter-list-entries-by-parent-id', {
        listId: filterListId,
        recordId: testCompany.id.record_id,
        limit: 10
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const filteredEntries = E2EAssertions.expectMcpData(response);
      
      expect(filteredEntries).toBeDefined();
      console.log('🎯 Parent ID filtered entries:', Array.isArray(filteredEntries) ? filteredEntries.length : (filteredEntries as any)?.data?.length || 0);
    }, 30000);
  });

  describe('Record List Memberships', () => {
    it('should find all lists containing a specific record', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping membership test - no test companies available');
        return;
      }

      const testCompany = testCompanies[0];
      const response = await callListTool('get-record-list-memberships', {
        recordId: testCompany.id.record_id,
        objectType: 'companies',
        includeEntryValues: true,
        batchSize: 5
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const memberships = E2EAssertions.expectMcpData(response);
      
      expect(memberships).toBeDefined();
      expect(Array.isArray(memberships)).toBe(true);
      
      console.log('🏷️ List memberships found:', memberships.length);
      
      // Validate membership structure
      if (memberships.length > 0) {
        const membership = memberships[0];
        expect(membership.listId).toBeDefined();
        expect(membership.listName).toBeDefined();
        expect(membership.entryId).toBeDefined();
      }
    }, 30000);

    it('should handle record with no list memberships', async () => {
      if (testPeople.length === 0) {
        console.log('⏭️ Skipping no membership test - no test people available');
        return;
      }

      const testPerson = testPeople[0];
      const response = await callListTool('get-record-list-memberships', {
        recordId: testPerson.id.record_id,
        objectType: 'people',
        includeEntryValues: false
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const memberships = E2EAssertions.expectMcpData(response);
      
      expect(memberships).toBeDefined();
      expect(Array.isArray(memberships)).toBe(true);
      // memberships might be empty, which is valid
    }, 15000);

    it('should validate batch size parameter', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping batch size test - no test companies available');
        return;
      }

      const testCompany = testCompanies[0];
      const response = await callListTool('get-record-list-memberships', {
        recordId: testCompany.id.record_id,
        objectType: 'companies',
        batchSize: 1
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const memberships = E2EAssertions.expectMcpData(response);
      expect(memberships).toBeDefined();
    }, 15000);
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid list ID in various operations', async () => {
      const invalidListId = 'invalid-list-id-12345';
      
      // Test multiple operations with invalid list ID
      const operations = [
        { tool: 'get-list-details', params: { listId: invalidListId } },
        { tool: 'get-list-entries', params: { listId: invalidListId } },
        { 
          tool: 'filter-list-entries', 
          params: { 
            listId: invalidListId, 
            attributeSlug: 'stage', 
            condition: 'equals', 
            value: 'test' 
          } 
        }
      ];

      for (const op of operations) {
        const response = await callListTool(op.tool, op.params);
        E2EAssertions.expectMcpError(response, /not found|invalid|does not exist/i);
      }
    }, 30000);

    it('should handle invalid record ID in membership operations', async () => {
      const response = await callListTool('get-record-list-memberships', {
        recordId: 'invalid-record-id-12345',
        objectType: 'companies'
      });
      
      // This might return empty results or an error depending on implementation
      if (response.isError) {
        E2EAssertions.expectMcpError(response, /not found|invalid/i);
      } else {
        const memberships = E2EAssertions.expectMcpData(response);
        expect(Array.isArray(memberships)).toBe(true);
        expect(memberships.length).toBe(0);
      }
    }, 15000);

    it('should handle invalid filter conditions', async () => {
      if (!testLists.length) {
        // Get any available list
        const listsResponse = await callListTool('get-lists', {});
        const listsData = E2EAssertions.expectMcpData(listsResponse);
        let lists: any[] = [];
        if (Array.isArray(listsData)) {
          lists = listsData;
        } else if (listsData && Array.isArray((listsData as any).data)) {
          lists = (listsData as any).data;
        }
        
        if (lists.length === 0) {
          console.log('⏭️ Skipping invalid filter test - no lists available');
          return;
        }
        
        const listId = lists[0].id?.list_id || lists[0].id;
        
        const response = await callListTool('filter-list-entries', {
          listId: listId,
          attributeSlug: 'nonexistent_attribute',
          condition: 'equals',
          value: 'test'
        });
        
        // Should handle gracefully - might return empty results or error
        if (response.isError) {
          expect(response.error).toBeDefined();
        } else {
          const results = E2EAssertions.expectMcpData(response);
          expect(results).toBeDefined();
        }
      }
    }, 15000);

    it('should handle malformed advanced filter configurations', async () => {
      const listsResponse = await callListTool('get-lists', {});
      const listsData = E2EAssertions.expectMcpData(listsResponse);
      let lists: any[] = [];
      if (Array.isArray(listsData)) {
        lists = listsData;
      } else if (listsData && Array.isArray((listsData as any).data)) {
        lists = (listsData as any).data;
      }
      
      if (lists.length === 0) {
        console.log('⏭️ Skipping malformed filter test - no lists available');
        return;
      }
      
      const listId = lists[0].id?.list_id || lists[0].id;
      
      const response = await callListTool('advanced-filter-list-entries', {
        listId: listId,
        filters: {
          filters: [
            {
              // Missing required fields
              condition: 'equals'
            }
          ]
        }
      });
      
      E2EAssertions.expectMcpError(response);
    }, 15000);

    it('should validate execution time for list operations', async () => {
      const response = await callListTool('get-lists', {});
      E2EAssertions.expectMcpSuccess(response);
      E2EAssertions.expectReasonableExecutionTime(response, 15000);
    }, 20000);
  });

  describe('Performance and Scalability', () => {
    it('should handle large result sets with pagination', async () => {
      const response = await callListTool('get-lists', {});
      const listsData = E2EAssertions.expectMcpData(response);
      let lists: any[] = [];
      if (Array.isArray(listsData)) {
        lists = listsData;
      } else if (listsData && Array.isArray((listsData as any).data)) {
        lists = (listsData as any).data;
      }
      
      if (lists.length === 0) {
        console.log('⏭️ Skipping pagination test - no lists available');
        return;
      }
      
      const listId = lists[0].id?.list_id || lists[0].id;
      
      // Test with small page size
      const paginatedResponse = await callListTool('get-list-entries', {
        listId: listId,
        limit: 2,
        offset: 0
      });
      
      E2EAssertions.expectMcpSuccess(paginatedResponse);
      const entries = E2EAssertions.expectMcpData(paginatedResponse);
      expect(entries).toBeDefined();
    }, 20000);

    it('should handle concurrent list operations', async () => {
      const promises = [
        callListTool('get-lists', {}),
        callListTool('get-lists', {}),
        callListTool('get-lists', {})
      ];
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        E2EAssertions.expectMcpSuccess(response);
      });
      
      console.log('🚀 Concurrent operations completed successfully');
    }, 30000);

    it('should maintain performance with complex filters', async () => {
      const response = await callListTool('get-lists', {});
      const listsData = E2EAssertions.expectMcpData(response);
      let lists: any[] = [];
      if (Array.isArray(listsData)) {
        lists = listsData;
      } else if (listsData && Array.isArray((listsData as any).data)) {
        lists = (listsData as any).data;
      }
      
      if (lists.length === 0) {
        console.log('⏭️ Skipping complex filter performance test - no lists available');
        return;
      }
      
      const listId = lists[0].id?.list_id || lists[0].id;
      
      const startTime = Date.now();
      
      const complexFilterResponse = await callListTool('advanced-filter-list-entries', {
        listId: listId,
        filters: {
          filters: [
            {
              attribute: { slug: 'stage' },
              condition: 'is_not_empty',
              value: null,
              logicalOperator: 'and'
            }
          ],
          matchAny: false
        },
        limit: 20
      });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      E2EAssertions.expectMcpSuccess(complexFilterResponse);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`⚡ Complex filter completed in ${executionTime}ms`);
    }, 15000);
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain consistent list entry structure', async () => {
      const response = await callListTool('get-lists', {});
      const listsData = E2EAssertions.expectMcpData(response);
      let lists: any[] = [];
      
      if (Array.isArray(listsData)) {
        lists = listsData;
      } else if (listsData && Array.isArray((listsData as any).data)) {
        lists = (listsData as any).data;
      }
      
      if (lists.length === 0) {
        console.log('⏭️ Skipping consistency test - no lists available');
        return;
      }
      
      const listId = lists[0].id?.list_id || lists[0].id;
      
      const entriesResponse = await callListTool('get-list-entries', {
        listId: listId,
        limit: 5
      });
      
      E2EAssertions.expectMcpSuccess(entriesResponse);
      const entries = E2EAssertions.expectMcpData(entriesResponse);
      
      if (Array.isArray(entries) && entries.length > 0) {
        entries.forEach((entry, index) => {
          expect(entry.id || entry.entry_id, `Entry ${index} should have ID`).toBeDefined();
          expect(entry.record_id || entry.parent_record_id, `Entry ${index} should have record ID`).toBeDefined();
        });
      }
    }, 20000);

    it('should handle special characters in filter values', async () => {
      const response = await callListTool('get-lists', {});
      const listsData = E2EAssertions.expectMcpData(response);
      let lists: any[] = [];
      if (Array.isArray(listsData)) {
        lists = listsData;
      } else if (listsData && Array.isArray((listsData as any).data)) {
        lists = (listsData as any).data;
      }
      
      if (lists.length === 0) {
        console.log('⏭️ Skipping special characters test - no lists available');
        return;
      }
      
      const listId = lists[0].id?.list_id || lists[0].id;
      
      const specialValueResponse = await callListTool('filter-list-entries', {
        listId: listId,
        attributeSlug: 'stage',
        condition: 'contains',
        value: 'Test™ & Co. "Special" #1',
        limit: 5
      });
      
      // Should handle gracefully even with special characters
      E2EAssertions.expectMcpSuccess(specialValueResponse);
      const results = E2EAssertions.expectMcpData(specialValueResponse);
      expect(results).toBeDefined();
    }, 15000);
  });
});