/**
 * Universal Tools E2E Test Suite
 * 
 * Comprehensive end-to-end testing for all 13 universal MCP tools with real API calls.
 * This suite validates the core functionality that consolidates 40+ resource-specific
 * tools into a unified interface.
 * 
 * Coverage:
 * - Core Operations (8 tools): CRUD, attributes, detailed info
 * - Advanced Operations (5 tools): advanced search, relationships, content, timeframe, batch
 * - Cross-resource compatibility: companies, people, records, tasks, deals
 * - Error handling and edge cases
 * - Performance validation
 */

import { describe, it, beforeAll, afterAll, expect, beforeEach } from 'vitest';
import { E2ETestBase } from '../setup.js';
import { E2EAssertions } from '../utils/assertions.js';
import { CompanyFactory, PersonFactory, TaskFactory } from '../fixtures/index.js';
import { loadE2EConfig } from '../utils/config-loader.js';
import { executeToolRequest } from '../../../src/handlers/tools/dispatcher.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

// Test configuration
const config = await loadE2EConfig();
let createdRecords: Array<{ type: string; id: string; data?: any }> = [];

/**
 * Helper function to call MCP tools with proper error handling
 */
async function callUniversalTool(
  toolName: string, 
  params: Record<string, any>
): Promise<any> {
  try {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    };
    
    const response = await executeToolRequest(request);
    return response;
  } catch (error) {
    console.error(`Tool ${toolName} failed with params:`, params);
    throw error;
  }
}

/**
 * Helper to create test data and track for cleanup
 */
function trackForCleanup(type: string, id: string, data?: any): void {
  createdRecords.push({ type, id, data });
  E2ETestBase.trackForCleanup(type as any, id, data);
}

describe('Universal Tools E2E Test Suite', () => {
  beforeAll(async () => {
    if (E2ETestBase.skipIfNoApiKey()) {
      return;
    }

    await E2ETestBase.setup({
      requiresRealApi: true,
      cleanupAfterTests: true,
      timeout: 120000
    });
  }, 120000);

  afterAll(async () => {
    // Additional cleanup for any records we created
    if (createdRecords.length > 0) {
      console.log(`🧹 Cleaning up ${createdRecords.length} created records...`);
      
      for (const record of createdRecords) {
        try {
          await callUniversalTool('delete-record', {
            resource_type: record.type === 'company' ? 'companies' : 
                          record.type === 'person' ? 'people' : 
                          record.type === 'task' ? 'tasks' : 'records',
            record_id: record.id
          });
        } catch (error) {
          console.warn(`Failed to cleanup ${record.type}:${record.id}:`, error);
        }
      }
    }
  }, 60000);

  beforeEach(() => {
    if (E2ETestBase.skipIfNoApiKey()) {
      return;
    }
  });

  describe('Core Operations - CRUD and Basic Tools (8 tools)', () => {
    describe('search-records tool', () => {
      it('should search companies successfully', async () => {
        const response = await callUniversalTool('search-records', {
          resource_type: 'companies',
          query: config.testData.testDataPrefix.slice(0, -1), // Search for test prefix
          limit: 10
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
        expect(Array.isArray(response.content)).toBe(true);
      });

      it('should search people successfully', async () => {
        const response = await callUniversalTool('search-records', {
          resource_type: 'people',
          query: 'test',
          limit: 5
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });

      it('should handle empty search results gracefully', async () => {
        const response = await callUniversalTool('search-records', {
          resource_type: 'companies',
          query: 'nonexistentcompany12345',
          limit: 10
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });
    });

    describe('get-record-details tool', () => {
      it('should get existing company details', async () => {
        const response = await callUniversalTool('get-record-details', {
          resource_type: 'companies',
          record_id: config.testData.existingCompanyId
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
        expect(response.content[0]).toHaveProperty('text');
      });

      it('should get existing person details', async () => {
        const response = await callUniversalTool('get-record-details', {
          resource_type: 'people',
          record_id: config.testData.existingPersonId
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });

      it('should handle non-existent record gracefully', async () => {
        const response = await callUniversalTool('get-record-details', {
          resource_type: 'companies',
          record_id: 'non-existent-id-12345'
        });

        // Should return error response for non-existent records
        expect(response.isError || response.content[0].text.includes('not found')).toBe(true);
      });
    });

    describe('create-record tool', () => {
      it('should create a new company record', async () => {
        const companyData = CompanyFactory.create();
        
        const response = await callUniversalTool('create-record', {
          resource_type: 'companies',
          record_data: {
            values: {
              name: companyData.name,
              domains: companyData.domain ? [companyData.domain] : [config.testData.testCompanyDomain]
            }
          }
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
        
        // Extract created record ID for cleanup
        const responseText = response.content[0].text;
        const idMatch = responseText.match(/ID[:\s]+([a-f0-9-]{36})/i);
        if (idMatch) {
          trackForCleanup('company', idMatch[1], companyData);
        }
      });

      it('should create a new person record', async () => {
        const personData = PersonFactory.create();
        
        const response = await callUniversalTool('create-record', {
          resource_type: 'people',
          record_data: {
            values: {
              name: personData.name,
              email_addresses: personData.email_addresses.map(email => ({ email_address: email }))
            }
          }
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
        
        // Extract created record ID for cleanup
        const responseText = response.content[0].text;
        const idMatch = responseText.match(/ID[:\s]+([a-f0-9-]{36})/i);
        if (idMatch) {
          trackForCleanup('person', idMatch[1], personData);
        }
      });

      it('should handle invalid record data gracefully', async () => {
        const response = await callUniversalTool('create-record', {
          resource_type: 'companies',
          record_data: {
            values: {
              // Missing required name field
              domains: ['invalid-test.com']
            }
          }
        });

        // Should return error for invalid data
        expect(response.isError || response.content[0].text.includes('error')).toBe(true);
      });
    });

    describe('update-record tool', () => {
      it('should update existing company record', async () => {
        const response = await callUniversalTool('update-record', {
          resource_type: 'companies',
          record_id: config.testData.existingCompanyId,
          record_data: {
            values: {
              description: `Updated by E2E test at ${new Date().toISOString()}`
            }
          }
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
        expect(response.content[0].text).toContain('successfully updated');
      });

      it('should handle non-existent record update gracefully', async () => {
        const response = await callUniversalTool('update-record', {
          resource_type: 'companies',
          record_id: 'non-existent-id-12345',
          record_data: {
            values: {
              description: 'This should fail'
            }
          }
        });

        // Should return error for non-existent record
        expect(response.isError || response.content[0].text.includes('not found')).toBe(true);
      });
    });

    describe('delete-record tool', () => {
      it('should delete a record (create first then delete)', async () => {
        // First create a record to delete
        const companyData = CompanyFactory.create();
        const createResponse = await callUniversalTool('create-record', {
          resource_type: 'companies',
          record_data: {
            values: {
              name: companyData.name,
              domains: [config.testData.testCompanyDomain]
            }
          }
        });

        E2EAssertions.expectMcpSuccess(createResponse);
        
        // Extract created record ID
        const responseText = createResponse.content[0].text;
        const idMatch = responseText.match(/ID[:\s]+([a-f0-9-]{36})/i);
        expect(idMatch).toBeTruthy();
        
        const recordId = idMatch![1];

        // Now delete the record
        const deleteResponse = await callUniversalTool('delete-record', {
          resource_type: 'companies',
          record_id: recordId
        });

        E2EAssertions.expectMcpSuccess(deleteResponse);
        expect(deleteResponse.content[0].text).toContain('successfully deleted');
      });

      it('should handle non-existent record deletion gracefully', async () => {
        const response = await callUniversalTool('delete-record', {
          resource_type: 'companies',
          record_id: 'non-existent-id-12345'
        });

        // Should return error for non-existent record
        expect(response.isError || response.content[0].text.includes('not found')).toBe(true);
      });
    });

    describe('get-attributes tool', () => {
      it('should get company attributes', async () => {
        const response = await callUniversalTool('get-attributes', {
          resource_type: 'companies'
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
        expect(response.content[0].text).toContain('attributes');
      });

      it('should get people attributes', async () => {
        const response = await callUniversalTool('get-attributes', {
          resource_type: 'people'
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });

      it('should get attributes for specific record', async () => {
        const response = await callUniversalTool('get-attributes', {
          resource_type: 'companies',
          record_id: config.testData.existingCompanyId
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });
    });

    describe('discover-attributes tool', () => {
      it('should discover company attributes schema', async () => {
        const response = await callUniversalTool('discover-attributes', {
          resource_type: 'companies'
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
        expect(response.content[0].text).toContain('attribute');
      });

      it('should discover people attributes schema', async () => {
        const response = await callUniversalTool('discover-attributes', {
          resource_type: 'people'
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });
    });

    describe('get-detailed-info tool', () => {
      it('should get basic company info', async () => {
        const response = await callUniversalTool('get-detailed-info', {
          resource_type: 'companies',
          record_id: config.testData.existingCompanyId,
          info_type: 'basic'
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });

      it('should get business company info', async () => {
        const response = await callUniversalTool('get-detailed-info', {
          resource_type: 'companies',
          record_id: config.testData.existingCompanyId,
          info_type: 'business'
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });

      it('should get contact company info', async () => {
        const response = await callUniversalTool('get-detailed-info', {
          resource_type: 'companies',
          record_id: config.testData.existingCompanyId,
          info_type: 'contact'
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });
    });
  });

  describe('Advanced Operations - Search and Batch Tools (5 tools)', () => {
    describe('advanced-search tool', () => {
      it('should perform advanced company search with filters', async () => {
        const response = await callUniversalTool('advanced-search', {
          resource_type: 'companies',
          filters: {
            // Use basic filter structure that works with most workspaces
            'created_at': {
              'gte': new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() // Last year
            }
          },
          limit: 10
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });

      it('should handle complex search filters', async () => {
        const response = await callUniversalTool('advanced-search', {
          resource_type: 'people',
          query: 'test',
          filters: {},
          sort_by: 'created_at',
          sort_order: 'desc',
          limit: 5
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });
    });

    describe('search-by-relationship tool', () => {
      it('should search people by company relationship', async () => {
        const response = await callUniversalTool('search-by-relationship', {
          relationship_type: 'company_to_people',
          source_id: config.testData.existingCompanyId,
          target_resource_type: 'people',
          limit: 10
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });

      it('should search companies by people relationship', async () => {
        const response = await callUniversalTool('search-by-relationship', {
          relationship_type: 'people_to_company',
          source_id: config.testData.existingPersonId,
          target_resource_type: 'companies',
          limit: 5
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });
    });

    describe('search-by-content tool', () => {
      it('should search companies by notes content', async () => {
        const response = await callUniversalTool('search-by-content', {
          resource_type: 'companies',
          content_type: 'notes',
          search_query: 'meeting',
          limit: 10
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });

      it('should search people by activity content', async () => {
        const response = await callUniversalTool('search-by-content', {
          resource_type: 'people',
          content_type: 'activity',
          search_query: 'email',
          limit: 5
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });
    });

    describe('search-by-timeframe tool', () => {
      it('should search records by creation date', async () => {
        const response = await callUniversalTool('search-by-timeframe', {
          resource_type: 'companies',
          timeframe_type: 'created',
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
          end_date: new Date().toISOString().split('T')[0], // Today
          limit: 10
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });

      it('should search records by modification date', async () => {
        const response = await callUniversalTool('search-by-timeframe', {
          resource_type: 'people',
          timeframe_type: 'modified',
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
          limit: 5
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });
    });

    describe('batch-operations tool', () => {
      it('should perform batch search operation', async () => {
        const response = await callUniversalTool('batch-operations', {
          resource_type: 'companies',
          operation_type: 'search',
          records: [
            { query: 'test', limit: 5 },
            { query: config.testData.testDataPrefix.slice(0, -1), limit: 3 }
          ],
          limit: 10
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });

      it('should perform batch get operation', async () => {
        const response = await callUniversalTool('batch-operations', {
          resource_type: 'companies',
          operation_type: 'get',
          record_ids: [config.testData.existingCompanyId],
          limit: 5
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      });
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should handle concurrent tool calls efficiently', async () => {
      const promises = [
        callUniversalTool('search-records', {
          resource_type: 'companies',
          query: 'test',
          limit: 5
        }),
        callUniversalTool('search-records', {
          resource_type: 'people',
          query: 'test',
          limit: 5
        }),
        callUniversalTool('get-attributes', {
          resource_type: 'companies'
        })
      ];

      const results = await Promise.all(promises);
      results.forEach(result => {
        E2EAssertions.expectMcpSuccess(result);
      });
    });

    it('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = Array.from({ length: 5 }, (_, i) => 
        callUniversalTool('search-records', {
          resource_type: 'companies',
          query: `test${i}`,
          limit: 1
        })
      );

      const results = await Promise.allSettled(promises);
      
      // All should eventually succeed or fail gracefully
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value.content).toBeDefined();
        } else {
          // Rate limiting errors are acceptable
          expect(result.reason).toBeDefined();
        }
      });
    });
  });

  describe('Cross-Resource Type Validation', () => {
    it('should work consistently across all resource types', async () => {
      const resourceTypes = ['companies', 'people', 'tasks'];
      
      for (const resourceType of resourceTypes) {
        if (resourceType === 'tasks' && config.features.skipTaskTests) {
          continue;
        }

        const response = await callUniversalTool('search-records', {
          resource_type: resourceType,
          query: 'test',
          limit: 3
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
      }
    });

    it('should handle discover-attributes for all resource types', async () => {
      const resourceTypes = ['companies', 'people'];
      
      for (const resourceType of resourceTypes) {
        const response = await callUniversalTool('discover-attributes', {
          resource_type: resourceType
        });

        E2EAssertions.expectMcpSuccess(response);
        expect(response.content).toBeDefined();
        expect(response.content[0].text).toContain('attribute');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid resource types gracefully', async () => {
      const response = await callUniversalTool('search-records', {
        resource_type: 'invalid_resource_type',
        query: 'test',
        limit: 5
      });

      expect(response.isError || response.content[0].text.includes('error')).toBe(true);
    });

    it('should handle missing required parameters', async () => {
      const response = await callUniversalTool('search-records', {
        // Missing resource_type
        query: 'test',
        limit: 5
      });

      expect(response.isError || response.content[0].text.includes('error')).toBe(true);
    });

    it('should handle malformed parameters gracefully', async () => {
      const response = await callUniversalTool('search-records', {
        resource_type: 'companies',
        query: 'test',
        limit: 'not_a_number' // Invalid limit
      });

      // Should either work with default limit or return error
      expect(response.content).toBeDefined();
    });

    it('should validate tool parameter combinations', async () => {
      const response = await callUniversalTool('get-detailed-info', {
        resource_type: 'companies',
        // Missing record_id
        info_type: 'basic'
      });

      expect(response.isError || response.content[0].text.includes('error')).toBe(true);
    });
  });
});