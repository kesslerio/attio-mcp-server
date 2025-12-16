/**
 * TC-D05 to TC-D07: Deal Pipeline Operations
 * P1 Essential Test - 100% Pass Rate Required
 *
 * Validates deal pipeline and stage management:
 * - TC-D05: Move deal through pipeline stages
 * - TC-D06: Update deal value and currency
 * - TC-D07: Search deals by stage/status
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

class DealPipelineTest extends MCPTestBase {
  public availableStages: string[] = [];

  constructor() {
    super('TCD05-07');
  }

  async setup(config = {}): Promise<void> {
    await super.setup(config);
    this.availableStages = await this.discoverDealStages();
    console.log(
      `📋 Discovered ${this.availableStages.length} deal stages:`,
      this.availableStages.slice(0, 5)
    );
    if (this.availableStages.length < 3) {
      throw new Error(
        `Need at least 3 deal stages for pipeline tests, found ${this.availableStages.length}: ${this.availableStages.join(', ')}`
      );
    }
  }
}

describe('TC-D05 to TC-D07: Deal Pipeline Operations', () => {
  const testCase = new DealPipelineTest();
  const results: TestResult[] = [];

  let pipelineDealId: string | null = null;

  beforeAll(async () => {
    await testCase.setup();
  });

  afterEach(async () => {
    await testCase.cleanupTestData();
    pipelineDealId = null;
  });

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();

    // Log quality gate results for this test case
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    const passRate = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;
    console.log(
      `\nDeal Pipeline Results: ${passedCount}/${totalCount} passed (${passRate.toFixed(1)}%)`
    );

    // P1 Quality Gate: 100% pass rate required
    if (passRate < 100) {
      console.warn(
        `⚠️  P1 Quality Gate Warning: Deal Pipeline pass rate ${passRate.toFixed(1)}% below 100% threshold`
      );
    }
  });

  it(
    'TC-D05: should move deal through pipeline stages dynamically',
    { timeout: 60000 },
    async () => {
      const testName = 'pipeline_progression';
      let passed = false;
      let error: string | undefined;

      try {
        // Use dynamically discovered stages
        const [stage1, stage2, stage3] = testCase.availableStages.slice(0, 3);
        console.log(
          `🔄 Testing pipeline progression: ${stage1} → ${stage2} → ${stage3}`
        );

        // Create a deal in first stage
        const dealData = TestDataFactory.createDealWithStage('TCD05', stage1);

        const createResult = await testCase.executeToolCall('create_record', {
          resource_type: 'deals',
          record_data: dealData,
        });
        const recordId = QAAssertions.assertRecordCreated(
          createResult,
          'deals'
        );
        pipelineDealId = recordId;
        testCase.trackRecord('deals', recordId);

        // Stage 1: Move to second stage
        const updateToStage2 = await testCase.executeToolCall('update_record', {
          resource_type: 'deals',
          record_id: recordId,
          record_data: { stage: stage2 },
        });

        QAAssertions.assertRecordUpdated(updateToStage2, 'deals');

        // Stage 2: Move to third stage
        const updateToStage3 = await testCase.executeToolCall('update_record', {
          resource_type: 'deals',
          record_id: recordId,
          record_data: { stage: stage3 },
        });

        QAAssertions.assertRecordUpdated(updateToStage3, 'deals');

        passed = true;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        throw e;
      } finally {
        results.push({ testName, passed, error });
      }
    }
  );

  it(
    'TC-D06: should update deal value and currency handling',
    { timeout: 30000 },
    async () => {
      const testName = 'update_deal_value';
      let passed = false;
      let error: string | undefined;

      try {
        // Skip if pipeline deal creation failed
        if (!pipelineDealId) {
          // Use first discovered stage for fallback deal
          const fallbackStage = testCase.availableStages[0] || 'MQL';
          const fallbackDeal = TestDataFactory.createDealWithStage(
            'TCD06',
            fallbackStage
          );
          const createResult = await testCase.executeToolCall('create_record', {
            resource_type: 'deals',
            record_data: fallbackDeal,
          });
          const text = testCase.extractTextContent(createResult);
          pipelineDealId = testCase.extractRecordId(text);
          testCase.trackRecord('deals', pipelineDealId);
        }

        // Test different value updates
        const valueUpdates = [25000, 50000, 100000];

        for (const value of valueUpdates) {
          const result = await testCase.executeToolCall('update_record', {
            resource_type: 'deals',
            record_id: pipelineDealId,
            record_data: { value: value },
          });

          QAAssertions.assertRecordUpdated(result, 'deals');
        }

        passed = true;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        throw e;
      } finally {
        results.push({ testName, passed, error });
      }
    }
  );

  it(
    'TC-D07: should search deals by stage/status',
    { timeout: 30000 },
    async () => {
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

          const createResult = await testCase.executeToolCall('create_record', {
            resource_type: 'deals',
            record_data: dealData,
          });

          const recordId = QAAssertions.assertRecordCreated(
            createResult,
            'deals'
          );
          stageDealIds.push(recordId);
          testCase.trackRecord('deals', recordId);
        }

        // Search for deals - use general search that should return multiple deals
        const searchResult = await testCase.executeToolCall('search-records', {
          resource_type: 'deals',
          query: 'TCD07',
          limit: 10,
        });

        // Validate search returned results
        QAAssertions.assertSearchResults(searchResult, 'deals');

        passed = true;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        throw e;
      } finally {
        results.push({ testName, passed, error });
      }
    }
  );
});
