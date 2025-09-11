/**
 * TC-D01 to TC-D04: Deal CRUD Operations
 * P1 Essential Test - 100% Pass Rate Required
 * 
 * Validates ability to perform CRUD operations on deals:
 * - TC-D01: Create deal with basic fields
 * - TC-D02: Get deal details by ID
 * - TC-D03: Update deal fields (stage, value, owner)
 * - TC-D04: Delete deal record
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

class DealCrudTest extends MCPTestBase {
  constructor() {
    super('TCD01-04');
  }
}

describe('TC-D01 to TC-D04: Deal CRUD Operations', () => {
  const testCase = new DealCrudTest();
  const results: TestResult[] = [];
  
  // Store created IDs for cleanup and validation
  const createdRecords: Array<{ type: string; id: string }> = [];
  let testDealId: string | null = null;

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
        // Ignore cleanup errors - records may already be deleted by tests
      }
    }
    
    await testCase.teardown();
    
    // Log quality gate results for this test case
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const passRate = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;
    console.log(`\nDeal CRUD Results: ${passedCount}/${totalCount} passed (${passRate.toFixed(1)}%)`);
    
    // P1 Quality Gate: 100% pass rate required
    if (passRate < 100) {
      console.warn(`⚠️  P1 Quality Gate Warning: Deal CRUD pass rate ${passRate.toFixed(1)}% below 100% threshold`);
    }
  });

  it('TC-D01: should create a deal with basic fields (name, stage, value)', async () => {
    const testName = 'create_deal';
    let passed = false;
    let error: string | undefined;

    try {
      const dealData = TestDataFactory.createDealData('TCD01');
      
      const result = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'deals',
          record_data: dealData
        }
      );
      
      // Extract deal ID from MCP response (text-based)
      const recordId = QAAssertions.assertRecordCreated(
        result, 
        'deals'
      );
      
      // Track for cleanup and use in subsequent tests
      if (recordId) {
        testDealId = recordId;
        createdRecords.push({ type: 'deals', id: recordId });
        TestDataFactory.trackRecord('deals', recordId);
      }
      
      // Validate response contains success indicators
      expect(recordId).toBeTruthy();
      
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('TC-D02: should get deal details by ID', async () => {
    const testName = 'get_deal_details';
    let passed = false;
    let error: string | undefined;

    try {
      // Skip if deal creation failed
      if (!testDealId) {
        throw new Error(`TC-D02 DEPENDENCY FAILURE: No test deal available from TC-D01 creation step. Previous test may have failed or returned invalid deal ID. Cannot proceed with deal details retrieval.`);
      }

      const result = await testCase.executeToolCall(
        'get-record-details',
        {
          resource_type: 'deals',
          record_id: testDealId
        }
      );
      
      // Validate deal details were retrieved
      QAAssertions.assertValidRecordDetails(result, 'deals');
      
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('TC-D03: should update deal fields (stage and value)', async () => {
    const testName = 'update_deal';
    let passed = false;
    let error: string | undefined;

    try {
      // Skip if deal creation failed
      if (!testDealId) {
        throw new Error('No test deal available - creation may have failed');
      }

      const updateData = TestDataFactory.createUpdateData('deals', 'TCD03');
      
      const result = await testCase.executeToolCall(
        'update-record',
        {
          resource_type: 'deals',
          record_id: testDealId,
          record_data: updateData
        }
      );
      
      // Validate update was successful (MCP returns text confirmation)
      QAAssertions.assertRecordUpdated(result, 'deals');
      
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('TC-D04: should delete deal record', async () => {
    const testName = 'delete_deal';
    let passed = false;
    let error: string | undefined;

    try {
      // Skip if deal creation failed
      if (!testDealId) {
        throw new Error('No test deal available - creation may have failed');
      }

      const result = await testCase.executeToolCall(
        'delete-record',
        {
          resource_type: 'deals',
          record_id: testDealId
        }
      );
      
      // Validate deletion was successful
      QAAssertions.assertRecordDeleted(result, 'deals');
      
      // Remove from cleanup list since it's already deleted
      const index = createdRecords.findIndex(r => r.id === testDealId);
      if (index > -1) {
        createdRecords.splice(index, 1);
      }
      
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });
});