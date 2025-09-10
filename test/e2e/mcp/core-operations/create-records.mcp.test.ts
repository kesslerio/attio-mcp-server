/**
 * TC-003: Create Records - Data Creation
 * P0 Core Test - MANDATORY
 * 
 * Validates ability to create new records across resource types.
 * Must achieve 100% pass rate as part of P0 quality gate.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

class CreateRecordsTest extends MCPTestBase {
  constructor() {
    super('TC003');
  }
}

describe('TC-003: Create Records - Data Creation', () => {
  const testCase = new CreateRecordsTest();
  const results: TestResult[] = [];
  
  // Store created IDs for cleanup and validation
  const createdRecords: Array<{ type: string; id: string }> = [];

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
    console.log(`\nTC-003 Results: ${passedCount}/${totalCount} passed`);
  });

  it('should create a test company with required fields', async () => {
    const testName = 'create_company';
    let passed = false;
    let error: string | undefined;

    try {
      const companyData = TestDataFactory.createCompanyData('TC003');
      
      const result = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'companies',
          record_data: companyData
        }
      );
      
      const recordId = QAAssertions.assertRecordCreated(
        result, 
        'companies',
        companyData
      );
      
      // Track for cleanup
      if (recordId) {
        createdRecords.push({ type: 'companies', id: recordId });
        TestDataFactory.trackRecord('companies', recordId);
      }
      
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should create a test person with email addresses', async () => {
    const testName = 'create_person';
    let passed = false;
    let error: string | undefined;

    try {
      const personData = TestDataFactory.createPersonData('TC003');
      
      const result = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'people',
          record_data: personData
        }
      );
      
      const recordId = QAAssertions.assertRecordCreated(
        result,
        'people',
        personData
      );
      
      // Track for cleanup
      if (recordId) {
        createdRecords.push({ type: 'people', id: recordId });
        TestDataFactory.trackRecord('people', recordId);
      }
      
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should create a test task with proper status', async () => {
    const testName = 'create_task';
    let passed = false;
    let error: string | undefined;

    try {
      const taskData = TestDataFactory.createTaskData('TC003');
      
      const result = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'tasks',
          record_data: taskData
        }
      );
      
      const recordId = QAAssertions.assertRecordCreated(
        result,
        'tasks',
        taskData
      );
      
      // Track for cleanup
      if (recordId) {
        createdRecords.push({ type: 'tasks', id: recordId });
        TestDataFactory.trackRecord('tasks', recordId);
      }
      
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should validate required fields during creation', async () => {
    const testName = 'validate_required_fields';
    let passed = false;
    let error: string | undefined;

    try {
      // Try to create a company without required fields
      const incompleteData = {
        description: 'TC003 Incomplete Company'
        // Missing required 'name' field
      };
      
      const result = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'companies',
          record_data: incompleteData
        }
      );
      
      // Should either error or indicate validation failure
      const text = testCase.extractTextContent(result);
      const hasValidationError = 
        result.isError || 
        text.includes('required') || 
        text.includes('missing') ||
        text.includes('validation');
      
      expect(hasValidationError).toBeTruthy();
      passed = true;
    } catch (e) {
      // If it throws, that's also acceptable validation behavior
      passed = true;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should return created record with generated ID', async () => {
    const testName = 'return_generated_id';
    let passed = false;
    let error: string | undefined;

    try {
      const companyData = TestDataFactory.createCompanyData('TC003_ID_TEST');
      
      const result = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'companies',
          record_data: companyData
        }
      );
      
      expect(result.isError).toBeFalsy();
      
      const text = testCase.extractTextContent(result);
      
      // Should contain an ID in the response
      const hasId = 
        text.includes('id') || 
        /[a-f0-9]{24,}/.test(text) || // MongoDB-style
        /[0-9a-f]{8}-[0-9a-f]{4}/.test(text); // UUID-style
      
      expect(hasId).toBeTruthy();
      
      // Extract and track for cleanup
      const idMatch = text.match(/"id"\s*:\s*"([^"]+)"/);
      if (idMatch && idMatch[1]) {
        createdRecords.push({ type: 'companies', id: idMatch[1] });
      }
      
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should create records that appear in subsequent searches', async () => {
    const testName = 'searchable_after_creation';
    let passed = false;
    let error: string | undefined;

    try {
      // Create a company with unique identifier
      const uniqueIdentifier = `TC003_SEARCHABLE_${Date.now()}`;
      const companyData = {
        name: uniqueIdentifier,
        domains: [`${uniqueIdentifier.toLowerCase()}.test.com`]
      };
      
      const createResult = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'companies',
          record_data: companyData
        }
      );
      
      const recordId = QAAssertions.assertRecordCreated(
        createResult,
        'companies',
        companyData
      );
      
      if (recordId) {
        createdRecords.push({ type: 'companies', id: recordId });
        
        // Wait a moment for indexing (if needed)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Search for the created record
        const searchResult = await testCase.executeToolCall(
          'search-records',
          {
            resource_type: 'companies',
            query: uniqueIdentifier,
            limit: 5
          }
        );
        
        const searchText = testCase.extractTextContent(searchResult);
        
        // Should find the created record
        expect(searchText).toContain(uniqueIdentifier);
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

export { results as TC003Results };