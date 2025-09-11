/**
 * TC-D08 to TC-D10: Deal Relationship Operations
 * P1 Essential Test - 100% Pass Rate Required
 * 
 * Validates deal relationship management:
 * - TC-D08: Associate deal with company
 * - TC-D09: Associate deal with people/contacts
 * - TC-D10: Search deals by associated records
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

class DealRelationshipsTest extends MCPTestBase {
  constructor() {
    super('TCD08-10');
  }
}

describe('TC-D08 to TC-D10: Deal Relationship Operations', () => {
  const testCase = new DealRelationshipsTest();
  const results: TestResult[] = [];
  
  // Store created IDs for cleanup
  const createdRecords: Array<{ type: string; id: string }> = [];
  let testCompanyId: string | null = null;
  let testPersonId: string | null = null;
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
        // Ignore cleanup errors
      }
    }
    
    await testCase.teardown();
    
    // Log quality gate results for this test case
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const passRate = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;
    console.log(`\nDeal Relationships Results: ${passedCount}/${totalCount} passed (${passRate.toFixed(1)}%)`);
    
    // P1 Quality Gate: 100% pass rate required
    if (passRate < 100) {
      console.warn(`⚠️  P1 Quality Gate Warning: Deal Relationships pass rate ${passRate.toFixed(1)}% below 100% threshold`);
    }
  });

  it('TC-D08: should associate deal with company', async () => {
    const testName = 'deal_company_association';
    let passed = false;
    let error: string | undefined;

    try {
      // First, create a test company
      const companyData = TestDataFactory.createCompanyData('TCD08');
      
      const companyResult = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'companies',
          record_data: companyData
        }
      );
      
      testCompanyId = QAAssertions.assertRecordCreated(companyResult, 'companies');
      if (testCompanyId) {
        createdRecords.push({ type: 'companies', id: testCompanyId });
      }

      // Create a deal with company association
      const dealData = TestDataFactory.createDealData('TCD08');
      // Note: associated_company requires company record ID based on field mappings
      dealData.associated_company = testCompanyId;
      
      const dealResult = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'deals',
          record_data: dealData
        }
      );
      
      testDealId = QAAssertions.assertRecordCreated(dealResult, 'deals');
      if (testDealId) {
        createdRecords.push({ type: 'deals', id: testDealId });
      }
      
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('TC-D09: should associate deal with people/contacts', async () => {
    const testName = 'deal_people_association';
    let passed = false;
    let error: string | undefined;

    try {
      // Create a test person
      const personData = TestDataFactory.createPersonData('TCD09');
      
      const personResult = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'people',
          record_data: personData
        }
      );
      
      testPersonId = QAAssertions.assertRecordCreated(personResult, 'people');
      if (testPersonId) {
        createdRecords.push({ type: 'people', id: testPersonId });
      }

      // Create a deal with people association
      const dealData = TestDataFactory.createDealData('TCD09');
      // Note: associated_people requires array of person record IDs
      dealData.associated_people = [testPersonId];
      
      const dealResult = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'deals',
          record_data: dealData
        }
      );
      
      const dealId = QAAssertions.assertRecordCreated(dealResult, 'deals');
      if (dealId) {
        createdRecords.push({ type: 'deals', id: dealId });
      }
      
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('TC-D10: should search deals by associated records', async () => {
    const testName = 'search_deals_by_relationships';
    let passed = false;
    let error: string | undefined;

    try {
      // Create company and person for relationship testing
      const relatedCompanyData = TestDataFactory.createCompanyData('TCD10');
      const relatedPersonData = TestDataFactory.createPersonData('TCD10');
      
      // Create company
      const companyResult = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'companies',
          record_data: relatedCompanyData
        }
      );
      
      const companyId = QAAssertions.assertRecordCreated(companyResult, 'companies');
      if (companyId) {
        createdRecords.push({ type: 'companies', id: companyId });
      }

      // Create person
      const personResult = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'people',
          record_data: relatedPersonData
        }
      );
      
      const personId = QAAssertions.assertRecordCreated(personResult, 'people');
      if (personId) {
        createdRecords.push({ type: 'people', id: personId });
      }

      // Create deal with both company and people associations
      const dealData = TestDataFactory.createDealData('TCD10');
      dealData.associated_company = companyId;
      dealData.associated_people = [personId];
      
      const dealResult = await testCase.executeToolCall(
        'create-record',
        {
          resource_type: 'deals',
          record_data: dealData
        }
      );
      
      const searchDealId = QAAssertions.assertRecordCreated(dealResult, 'deals');
      if (searchDealId) {
        createdRecords.push({ type: 'deals', id: searchDealId });
      }

      // Search for deals - should find the related deal
      const searchResult = await testCase.executeToolCall(
        'search-records',
        {
          resource_type: 'deals',
          query: 'TCD10',
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