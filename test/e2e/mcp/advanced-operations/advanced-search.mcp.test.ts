/**
 * TC-AO02: Advanced Search Operations
 * P1 Advanced Test - Validates universal advanced search tools against live Attio data.
 *
 * Coverage:
 * - Complex filter queries with records_search_advanced
 * - Relationship traversal via records_search_by_relationship
 * - Content keyword discovery with records_search_by_content
 * - Timeframe filtering with records_search_by_timeframe
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

class AdvancedSearchTest extends MCPTestBase {
  constructor() {
    super('TCAO02');
  }
}

describe('TC-AO02: Advanced Search Operations', () => {
  const testCase = new AdvancedSearchTest();
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
      `\nTC-AO02 Results: ${passedCount}/${totalCount} passed (${passRate.toFixed(1)}%)`
    );

    if (passRate < 80) {
      console.warn(
        `⚠️  P1 Quality Gate Warning: Advanced search pass rate ${passRate.toFixed(1)}% below 80% threshold`
      );
    }
  });

  it('should return records matching complex attribute filters', async () => {
    const testName = 'advanced_search_complex_filters';
    let passed = false;
    let error: string | undefined;

    try {
      const companyData = TestDataFactory.createCompanyData('TCAO02_filters');
      companyData.description = `${companyData.description} - filters scenario`;

      const createResult = await testCase.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: companyData,
      });

      const companyId = QAAssertions.assertRecordCreated(
        createResult,
        'companies'
      );
      testCase.trackRecord('companies', companyId);

      const searchResult = await testCase.executeToolCall(
        'records_search_advanced',
        {
          resource_type: 'companies',
          filters: {
            filters: [
              {
                attribute: { slug: 'name' },
                condition: 'contains',
                value: companyData.name.split(' ')[0],
              },
              {
                attribute: { slug: 'description' },
                condition: 'contains',
                value: 'filters scenario',
              },
            ],
          },
          limit: 5,
        }
      );

      const text = testCase.extractTextContent(searchResult);
      expect(text).toContain('Advanced search found');
      expect(text).toContain(companyData.name.split(' ')[0]);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should traverse relationships between companies, people, and deals', async () => {
    const testName = 'relationship_search_coverage';
    let passed = false;
    let error: string | undefined;

    try {
      const companyData = TestDataFactory.createCompanyData(
        'TCAO02_relationships_company'
      );
      const companyResult = await testCase.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: companyData,
      });
      const companyId = QAAssertions.assertRecordCreated(
        companyResult,
        'companies'
      );
      testCase.trackRecord('companies', companyId);

      const personData = TestDataFactory.createPersonData(
        'TCAO02_relationships_person'
      );
      const personResult = await testCase.executeToolCall('create-record', {
        resource_type: 'people',
        record_data: personData,
      });
      const personId = QAAssertions.assertRecordCreated(personResult, 'people');
      testCase.trackRecord('people', personId);

      const dealData = TestDataFactory.createDealData(
        'TCAO02_relationships_deal'
      );
      dealData.associated_company = companyId;
      dealData.associated_people = [personId];
      const dealResult = await testCase.executeToolCall('create-record', {
        resource_type: 'deals',
        record_data: dealData,
      });
      const dealId = QAAssertions.assertRecordCreated(dealResult, 'deals');
      testCase.trackRecord('deals', dealId);

      const companyPeople = await testCase.executeToolCall(
        'records_search_by_relationship',
        {
          relationship_type: 'company_to_people',
          source_id: companyId,
          target_resource_type: 'people',
          limit: 5,
        }
      );
      const companyPeopleText = testCase.extractTextContent(companyPeople);
      expect(companyPeopleText).toContain(personData.name.split(' ')[0]);

      const companyDeals = await testCase.executeToolCall(
        'records_search_by_relationship',
        {
          relationship_type: 'company_to_deals',
          source_id: companyId,
          target_resource_type: 'deals',
          limit: 5,
        }
      );
      const companyDealsText = testCase.extractTextContent(companyDeals);
      expect(companyDealsText).toContain(dealData.name.split(' ')[0]);

      const personDeals = await testCase.executeToolCall(
        'records_search_by_relationship',
        {
          relationship_type: 'person_to_deals',
          source_id: personId,
          target_resource_type: 'deals',
          limit: 5,
        }
      );
      const personDealsText = testCase.extractTextContent(personDeals);
      expect(personDealsText).toContain(dealData.name.split(' ')[0]);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should find notes by keyword content', async () => {
    const testName = 'content_search_notes';
    let passed = false;
    let error: string | undefined;

    try {
      const companyData = TestDataFactory.createCompanyData(
        'TCAO02_notes_company'
      );
      const companyResult = await testCase.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: companyData,
      });
      const companyId = QAAssertions.assertRecordCreated(
        companyResult,
        'companies'
      );
      testCase.trackRecord('companies', companyId);

      const noteKeyword = `attio-mcp-content-${Date.now()}`;
      const noteResult = await testCase.executeToolCall('create-note', {
        resource_type: 'companies',
        record_id: companyId,
        title: `TCAO02 Content Search ${noteKeyword}`,
        content: `Content search validation ${noteKeyword}`,
      });

      const noteText = testCase.extractTextContent(noteResult);
      const noteId = testCase.extractRecordId(noteText);
      if (noteId) {
        testCase.trackRecord('notes', noteId);
      }

      const searchResult = await testCase.executeToolCall(
        'records_search_by_content',
        {
          resource_type: 'notes',
          content_type: 'notes',
          search_query: noteKeyword,
          limit: 5,
        }
      );

      const text = testCase.extractTextContent(searchResult);
      expect(text).toContain('Found');
      expect(text).toContain(noteKeyword);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should filter records within a creation timeframe window', async () => {
    const testName = 'timeframe_search_created_records';
    let passed = false;
    let error: string | undefined;

    try {
      const dealData = TestDataFactory.createDealData('TCAO02_timeframe');
      const dealResult = await testCase.executeToolCall('create-record', {
        resource_type: 'deals',
        record_data: dealData,
      });
      const dealId = QAAssertions.assertRecordCreated(dealResult, 'deals');
      testCase.trackRecord('deals', dealId);

      const today = new Date();
      const startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const searchResult = await testCase.executeToolCall(
        'records_search_by_timeframe',
        {
          resource_type: 'deals',
          timeframe_type: 'created',
          start_date: startDate,
          end_date: endDate,
          limit: 10,
        }
      );

      const text = testCase.extractTextContent(searchResult);
      expect(text).toContain('Found');
      expect(text).toContain(dealData.name.split(' ')[0]);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });
});
