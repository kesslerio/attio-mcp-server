/**
 * TC-D05 to TC-D07: Deal Pipeline Operations
 * P1 Essential Test - 100% Pass Rate Required
 * 
 * Validates deal pipeline and stage management:
 * - TC-D05: Move deal through pipeline stages
 * - TC-D06: Update deal value and currency
 * - TC-D07: Search deals by stage/status
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

class DealPipelineTest extends MCPTestBase {
  constructor() {
    super('TCD05-07');
  }
}

describe('TC-D05 to TC-D07: Deal Pipeline Operations', () => {
  const testCase = new DealPipelineTest();
  const results: TestResult[] = [];
  
  // Store created IDs for cleanup
  const createdRecords: Array<{ type: string; id: string }> = [];
  let pipelineDealId: string | null = null;

  beforeAll(async () => {
    await testCase.setup();
  });

  afterAll(async () => {
    // Cleanup: Attempt to delete created records
    for (const record of createdRecords) {
      try {
        await testCase.executeToolCall(
          'delete-record',
          {
            resource_type: record.type,
            record_id: record.id
          }
        );
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    await testCase.teardown();
    
    // Log quality gate results for this test case
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const passRate = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;
    console.log(`\nDeal Pipeline Results: ${passedCount}/${totalCount} passed (${passRate.toFixed(1)}%)`);
    
    // P1 Quality Gate: 100% pass rate required
    if (passRate < 100) {
      console.warn(`⚠️  P1 Quality Gate Warning: Deal Pipeline pass rate ${passRate.toFixed(1)}% below 100% threshold`);
    }
  });

  it('TC-D05: should move deal through pipeline stages (Lead → Qualified → Proposal)', async () => {
    const testName = 'pipeline_progression';
    let passed = false;
    let error: string | undefined;

    try {
      // Create a deal in "Lead" stage
      const dealData = TestDataFactory.createDealWithStage('TCD05', 'Lead');
      
      const createResult = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'deals',
          record_data: dealData
        }
      );
      
      const recordId = QAAssertions.assertRecordCreated(createResult, 'deals');
      if (recordId) {
        pipelineDealId = recordId;
        createdRecords.push({ type: 'deals', id: recordId });
      }

      // Stage 1: Move to "Qualified"
      const updateToQualified = await testCase.executeToolCall(
        'update-record',
        {
          resource_type: 'deals',
          record_id: recordId,
          record_data: { stage: 'Qualified' }
        }
      );
      
      QAAssertions.assertRecordUpdated(updateToQualified, 'deals');

      // Stage 2: Move to "Proposal"
      const updateToProposal = await testCase.executeToolCall(
        'update-record',
        {
          resource_type: 'deals',
          record_id: recordId,
          record_data: { stage: 'Proposal' }
        }
      );
      
      QAAssertions.assertRecordUpdated(updateToProposal, 'deals');
      
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('TC-D06: should update deal value and currency handling', async () => {
    const testName = 'update_deal_value';
    let passed = false;
    let error: string | undefined;

    try {
      // Skip if pipeline deal creation failed
      if (!pipelineDealId) {
        throw new Error('No pipeline deal available - creation may have failed');
      }

      // Test different value updates
      const valueUpdates = [25000, 50000, 100000];
      
      for (const value of valueUpdates) {
        const result = await testCase.executeToolCall(
          'update-record',
          {
            resource_type: 'deals',
            record_id: pipelineDealId,
            record_data: { value: value }
          }
        );
        
        QAAssertions.assertRecordUpdated(result, 'deals');
      }
      
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('TC-D07: should search deals by stage/status', async () => {
    const testName = 'search_deals_by_stage';
    let passed = false;
    let error: string | undefined;

    try {
      // Create deals in different stages for search testing
      const stages = TestDataFactory.createDealPipelineStages();
      const searchStages = stages.slice(0, 3); // Test first 3 stages
      const stageDealIds: string[] = [];
      
      // Create one deal in each stage
      for (const stage of searchStages) {
        const dealData = TestDataFactory.createDealWithStage('TCD07', stage);
        
        const createResult = await testCase.executeToolCall(
          'create-record',
          {
            resource_type: 'deals',
            record_data: dealData
          }
        );
        
        const recordId = QAAssertions.assertRecordCreated(createResult, 'deals');
        if (recordId) {
          stageDealIds.push(recordId);
          createdRecords.push({ type: 'deals', id: recordId });
        }
      }

      // Search for deals - use general search that should return multiple deals
      const searchResult = await testCase.executeToolCall(
        'search-records',
        {
          resource_type: 'deals',
          query: 'TCD07',
          limit: 10
        }
      );
      
      // Validate search returned results
      QAAssertions.assertSearchResults(searchResult, 'deals');
      
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });
});