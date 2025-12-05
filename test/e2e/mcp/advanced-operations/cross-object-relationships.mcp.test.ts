/**
 * TC-AO03: Cross-Object Relationship Operations
 * P1 Advanced Test - Validates bidirectional relationship queries using live Attio data.
 *
 * Scenario:
 * - Create company and person records
 * - Create deal linked to both records
 * - Verify relationship searches from company → deals/people and person → deals
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

class CrossObjectRelationshipsTest extends MCPTestBase {
  constructor() {
    super('TCAO03');
  }
}

describe('TC-AO03: Cross-Object Relationship Operations', () => {
  const testCase = new CrossObjectRelationshipsTest();
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
      `\nTC-AO03 Results: ${passedCount}/${totalCount} passed (${passRate.toFixed(1)}%)`
    );

    if (passRate < 80) {
      console.warn(
        `⚠️  P1 Quality Gate Warning: Relationship operations pass rate ${passRate.toFixed(1)}% below 80% threshold`
      );
    }
  });

  it('should surface linked deals and people through relationship searches', async () => {
    const testName = 'relationship_search_end_to_end';
    let passed = false;
    let error: string | undefined;

    try {
      const companyData = TestDataFactory.createCompanyData('TCAO03_company');
      const companyResult = await testCase.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: companyData,
      });
      const companyId = QAAssertions.assertRecordCreated(
        companyResult,
        'companies'
      );
      testCase.trackRecord('companies', companyId);

      const personData = TestDataFactory.createPersonData('TCAO03_person');
      const personResult = await testCase.executeToolCall('create-record', {
        resource_type: 'people',
        record_data: personData,
      });
      const personId = QAAssertions.assertRecordCreated(personResult, 'people');
      testCase.trackRecord('people', personId);

      const dealData = TestDataFactory.createDealData('TCAO03_deal');
      dealData.associated_company = companyId;
      dealData.associated_people = [personId];
      const dealResult = await testCase.executeToolCall('create-record', {
        resource_type: 'deals',
        record_data: dealData,
      });
      const dealId = QAAssertions.assertRecordCreated(dealResult, 'deals');
      testCase.trackRecord('deals', dealId);

      const companyDeals = await testCase.executeToolCall(
        'search-by-relationship',
        {
          relationship_type: 'company_to_deals',
          source_id: companyId,
          target_resource_type: 'deals',
          limit: 5,
        }
      );
      QAAssertions.assertSearchResults(companyDeals, 'deals', 1);
      const companyDealsText = testCase.extractTextContent(companyDeals);
      expect(companyDealsText).toContain(dealData.name.split(' ')[0]);

      const companyPeople = await testCase.executeToolCall(
        'search-by-relationship',
        {
          relationship_type: 'company_to_people',
          source_id: companyId,
          target_resource_type: 'people',
          limit: 5,
        }
      );
      QAAssertions.assertSearchResults(companyPeople, 'people', 1);
      const companyPeopleText = testCase.extractTextContent(companyPeople);
      expect(companyPeopleText).toContain(personData.name.split(' ')[0]);

      const personDeals = await testCase.executeToolCall(
        'search-by-relationship',
        {
          relationship_type: 'person_to_deals',
          source_id: personId,
          target_resource_type: 'deals',
          limit: 5,
        }
      );
      QAAssertions.assertSearchResults(personDeals, 'deals', 1);
      const personDealsText = testCase.extractTextContent(personDeals);
      expect(personDealsText).toContain(dealData.name.split(' ')[0]);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });
});
