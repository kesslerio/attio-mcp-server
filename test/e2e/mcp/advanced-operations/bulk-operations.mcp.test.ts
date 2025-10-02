/**
 * TC-AO01: Bulk Operations Suite
 * P1 Advanced Test - Validates high-volume record automation against live Attio data.
 *
 * Coverage:
 * - Batch creation of 10+ companies via universal batch operations
 * - Batch updates across multiple records with verification
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

class BulkOperationsTest extends MCPTestBase {
  constructor() {
    super('TCAO01');
  }
}

describe('TC-AO01: Bulk Operations Suite', () => {
  const testCase = new BulkOperationsTest();
  const results: TestResult[] = [];

  beforeAll(async () => {
    await testCase.setup();
  });

  afterEach(async () => {
    await testCase.cleanupTestData();
  });

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();

    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    const passRate = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;
    console.log(
      `\nTC-AO01 Results: ${passedCount}/${totalCount} passed (${passRate.toFixed(1)}%)`
    );

    if (passRate < 80) {
      console.warn(
        `⚠️  P1 Quality Gate Warning: Bulk operations pass rate ${passRate.toFixed(1)}% below 80% threshold`
      );
    }
  });

  it('should create 10 companies in a single batch request', async () => {
    const testName = 'batch_create_companies';
    let passed = false;
    let error: string | undefined;

    try {
      const companyPayloads = Array.from({ length: 10 }, (_, index) => {
        const data = TestDataFactory.createCompanyData(`TCAO01_${index}`);
        return {
          index,
          data,
        };
      });

      const result = await testCase.executeToolCall('batch-operations', {
        resource_type: 'companies',
        operations: companyPayloads.map((payload) => ({
          operation: 'create',
          record_data: payload.data,
        })),
      });

      QAAssertions.assertBatchOperationSuccess(
        result,
        'create',
        companyPayloads.length
      );

      for (const payload of companyPayloads) {
        const searchResult = await testCase.executeToolCall('search-records', {
          resource_type: 'companies',
          query: payload.data.name,
          limit: 1,
        });

        const searchText = testCase.extractTextContent(searchResult);
        const createdId = testCase.extractRecordId(searchText);
        expect(createdId).toBeTruthy();
        if (createdId) {
          testCase.trackRecord('companies', createdId);
        }
      }

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should update multiple companies via batch operations array', async () => {
    const testName = 'batch_update_companies';
    let passed = false;
    let error: string | undefined;

    try {
      const seedRecords: Array<{ id: string; name: string }> = [];
      for (let index = 0; index < 3; index += 1) {
        const companyData = TestDataFactory.createCompanyData(
          `TCAO01_update_${index}`
        );
        const createResult = await testCase.executeToolCall('create-record', {
          resource_type: 'companies',
          record_data: companyData,
        });

        const companyId = QAAssertions.assertRecordCreated(
          createResult,
          'companies'
        );
        testCase.trackRecord('companies', companyId);
        seedRecords.push({ id: companyId, name: companyData.name });
      }

      const updateResult = await testCase.executeToolCall('batch-operations', {
        resource_type: 'companies',
        operations: seedRecords.map((record, index) => ({
          operation: 'update',
          record_data: {
            id: record.id,
            description: `Updated via batch operation ${index + 1}`,
          },
        })),
      });

      QAAssertions.assertBatchOperationSuccess(
        updateResult,
        'update',
        seedRecords.length
      );

      for (let index = 0; index < seedRecords.length; index += 1) {
        const record = seedRecords[index];
        const details = await testCase.executeToolCall('get-record-details', {
          resource_type: 'companies',
          record_id: record.id,
        });

        const detailsText = testCase.extractTextContent(details);
        expect(detailsText).toContain(
          `Updated via batch operation ${index + 1}`
        );
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
