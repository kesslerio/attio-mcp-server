/**
 * TCAO01: Batch Operations Validation
 * P1 Advanced Test - Validates universal batch tooling across create, get, search, and failure paths.
 *
 * Coverage:
 * - Happy path batch create → get → search workflows
 * - Batch size limit enforcement (max 100 operations)
 * - Partial failure handling keeps succeeding operations intact
 * - Performance budget check for 50 get operations (<5s)
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

const SMALL_BATCH_SIZE = 3;
const MAX_BATCH_SIZE = 100;
const MAX_BATCH_OVERFLOW = MAX_BATCH_SIZE + 1;
const BOUNDARY_SEED_COUNT = 10;
const PERFORMANCE_SEED_COUNT = 5;
const PERFORMANCE_SAMPLE_SIZE = 50;
const PERFORMANCE_BUDGET_MS = 5000;

class BatchOperationsTest extends MCPTestBase {
  constructor() {
    super('TCAO01');
  }
}

describe('TCAO01: Batch Operations Validation', () => {
  const testCase = new BatchOperationsTest();
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
      `\nTCAO01 Results: ${passedCount}/${totalCount} passed (${passRate.toFixed(1)}%)`
    );

    if (passRate < 80) {
      console.warn(
        `⚠️  P1 Quality Gate Warning: Batch operations pass rate ${passRate.toFixed(1)}% below 80% threshold`
      );
    }
  });

  it('should execute batch create, get, and search operations end-to-end', async () => {
    const testName = 'batch_create_get_search';
    let passed = false;
    let error: string | undefined;

    try {
      const companySpecs = Array.from(
        { length: SMALL_BATCH_SIZE },
        (_, index) =>
          TestDataFactory.createCompanyData(`TCAO01_create_${index}`)
      );

      const createResult = await testCase.executeToolCall('batch-operations', {
        resource_type: 'companies',
        operations: companySpecs.map((payload) => ({
          operation: 'create',
          record_data: payload,
        })),
      });

      QAAssertions.assertBatchOperationSuccess(
        createResult,
        'create',
        companySpecs.length
      );

      const createdCompanyIds: string[] = [];
      for (const spec of companySpecs) {
        const searchResult = await testCase.executeToolCall('records_search', {
          resource_type: 'companies',
          query: spec.name,
          limit: 1,
        });

        const searchText = testCase.extractTextContent(searchResult);
        const companyId = testCase.extractRecordId(searchText);
        expect(companyId).toBeTruthy();
        if (companyId) {
          createdCompanyIds.push(companyId);
          testCase.trackRecord('companies', companyId);
        }
      }

      expect(createdCompanyIds.length).toBe(companySpecs.length);

      const getResult = await testCase.executeToolCall('batch-operations', {
        resource_type: 'companies',
        operation_type: 'get',
        record_ids: createdCompanyIds,
        limit: createdCompanyIds.length,
      });

      const getText = testCase.extractTextContent(getResult);
      expect(getText).toContain('Batch get completed');
      for (const spec of companySpecs) {
        expect(getText).toContain(spec.name.split(' ')[0]);
      }

      const searchQueries = companySpecs.map((spec) => spec.name.split(' ')[0]);
      const searchResult = await testCase.executeToolCall('batch-operations', {
        resource_type: 'companies',
        operation_type: 'search',
        queries: searchQueries,
        limit: SMALL_BATCH_SIZE,
      });

      const searchText = testCase.extractTextContent(searchResult);
      expect(searchText).toContain('Batch search completed');
      expect(searchText).toContain('Successful searches');

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
      for (let index = 0; index < SMALL_BATCH_SIZE; index += 1) {
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

  it('should handle the maximum batch size without errors', async () => {
    const testName = 'batch_size_limit_boundary';
    let passed = false;
    let error: string | undefined;

    try {
      const seedCompanies: string[] = [];
      for (let index = 0; index < BOUNDARY_SEED_COUNT; index += 1) {
        const companyData = TestDataFactory.createCompanyData(
          `TCAO01_boundary_seed_${index}`
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
        seedCompanies.push(companyId);
      }

      const recordIds = Array.from(
        { length: MAX_BATCH_SIZE },
        (_, index) => seedCompanies[index % seedCompanies.length]
      );

      const result = await testCase.executeToolCall('batch-operations', {
        resource_type: 'companies',
        operation_type: 'get',
        record_ids: recordIds,
        limit: recordIds.length,
      });

      QAAssertions.assertBatchOperationSuccess(result, 'get', MAX_BATCH_SIZE);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should reject batches above the 100 operation limit', async () => {
    const testName = 'batch_size_limit_enforced';
    let passed = false;
    let error: string | undefined;

    try {
      const oversizedPayload = Array.from(
        { length: MAX_BATCH_OVERFLOW },
        (_, index) => TestDataFactory.createCompanyData(`TCAO01_limit_${index}`)
      );

      await expect(
        testCase.executeToolCall('batch-operations', {
          resource_type: 'companies',
          operation_type: 'create',
          records: oversizedPayload,
        })
      ).rejects.toThrow(/exceeds maximum allowed \(100\)/i);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should surface partial failures without aborting remaining operations', async () => {
    const testName = 'batch_partial_failures';
    let passed = false;
    let error: string | undefined;

    try {
      const validCompany = TestDataFactory.createCompanyData(
        'TCAO01_partial_valid'
      );
      const invalidCompany = { description: 'Missing required name field' };

      const result = await testCase.executeToolCall('batch-operations', {
        resource_type: 'companies',
        operations: [
          {
            operation: 'create',
            record_data: validCompany,
          },
          {
            operation: 'create',
            record_data: invalidCompany,
          },
        ],
      });

      const text = testCase.extractTextContent(result);
      expect(text).toContain('Batch create completed: 1 successful, 1 failed');
      expect(text).toContain('Failed operations');

      const searchResult = await testCase.executeToolCall('records_search', {
        resource_type: 'companies',
        query: validCompany.name,
        limit: 1,
      });

      const searchText = testCase.extractTextContent(searchResult);
      const createdId = testCase.extractRecordId(searchText);
      expect(createdId).toBeTruthy();
      if (createdId) {
        testCase.trackRecord('companies', createdId);
      }

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should complete 50 get operations within five seconds', async () => {
    const testName = 'batch_get_performance';
    let passed = false;
    let error: string | undefined;

    try {
      const seedCompanies: string[] = [];
      for (let index = 0; index < PERFORMANCE_SEED_COUNT; index += 1) {
        const companyData = TestDataFactory.createCompanyData(
          `TCAO01_perf_seed_${index}`
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
        seedCompanies.push(companyId);
      }

      const recordIds = Array.from(
        { length: PERFORMANCE_SAMPLE_SIZE },
        (_, index) => seedCompanies[index % seedCompanies.length]
      );

      const start = Date.now();
      const result = await testCase.executeToolCall('batch-operations', {
        resource_type: 'companies',
        operation_type: 'get',
        record_ids: recordIds,
        limit: recordIds.length,
      });
      const durationMs = Date.now() - start;

      const text = testCase.extractTextContent(result);
      expect(text).toContain('Batch get completed');
      expect(durationMs).toBeLessThan(PERFORMANCE_BUDGET_MS);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });
});
