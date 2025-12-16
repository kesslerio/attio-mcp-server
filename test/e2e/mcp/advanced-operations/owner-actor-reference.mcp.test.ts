/**
 * TC-AO03: Owner (actor-reference) filtering by name
 * P1 Advanced Test - Validates that actor-reference fields (e.g., deals.owner)
 * accept human names (not only email) in filters and return matching records.
 *
 * Strategy:
 * - Create a deal with owner set via email (workspace member)
 * - Search using records_search_advanced with filters:
 *   - owner equals <Owner Name> (name branch)
 *   - name contains <unique token> (to target the created deal)
 * - Assert that the created deal is returned
 *
 * Requirements:
 * - ATTIO_API_KEY for live API
 * - ATTIO_DEFAULT_DEAL_OWNER (email) - used by TestDataFactory (has default)
 * - ATTIO_DEFAULT_DEAL_OWNER_NAME (full name) - required to exercise name-based search
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

class OwnerActorReferenceTest extends MCPTestBase {
  constructor() {
    super('TCAO03');
  }
}

describe('TC-AO03: Owner (actor-reference) filtering by name', () => {
  const testCase = new OwnerActorReferenceTest();
  const results: TestResult[] = [];

  const OWNER_NAME = process.env.ATTIO_DEFAULT_DEAL_OWNER_NAME;
  const OWNER_EMAIL = process.env.ATTIO_DEFAULT_DEAL_OWNER;
  const OWNER_ID = process.env.WORKSPACE_MEMBER_ID; // Try using UUID/record_id for owner

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
      `\nTC-AO03 Results: ${passedCount}/${totalCount} passed (${passRate.toFixed(
        1
      )}%)`
    );

    if (passRate < 80) {
      console.warn(
        `⚠️  P1 Quality Gate Warning: Owner actor-reference pass rate ${passRate.toFixed(1)}% below 80% threshold`
      );
    }
  });

  it('should find a deal by owner UUID and unique deal token', async () => {
    const testName = 'owner_actor_reference_by_uuid';
    let passed = false;
    let error: string | undefined;

    if (!OWNER_ID) {
      console.warn(
        'Skipping TC-AO03 UUID test: WORKSPACE_MEMBER_ID is not set; cannot validate UUID-based owner filtering.'
      );
      return; // Skip gracefully without failing the suite
    }

    try {
      // Create a unique deal. TestDataFactory sets owner via email (env or default), which is fine for creation.
      const uniqueToken = TestDataFactory.generateTestId('TCAO03-UUID');
      const dealData = TestDataFactory.createDealData('TCAO03');
      dealData.name = `TCAO03 Owner UUID Filter ${uniqueToken}`;

      const createResult = await testCase.executeToolCall('create_record', {
        resource_type: 'deals',
        record_data: dealData,
      });

      const dealId = QAAssertions.assertRecordCreated(createResult, 'deals');
      testCase.trackRecord('deals', dealId);

      // Now search via advanced filters using OWNER_ID (UUID/record_id for actor-reference) + name contains uniqueToken
      const searchResult = await testCase.executeToolCall(
        'records_search_advanced',
        {
          resource_type: 'deals',
          filters: {
            filters: [
              {
                attribute: { slug: 'owner' },
                condition: 'equals',
                value: OWNER_ID, // actor-reference with UUID (record_id field)
              },
              {
                attribute: { slug: 'name' },
                condition: 'contains',
                value: uniqueToken,
              },
            ],
          },
          limit: 5,
        }
      );

      // Validate successful search and presence of our created deal
      const text = testCase.extractTextContent(searchResult);
      expect(text).toContain('Advanced search found');
      expect(text).toMatch(/deals?/i);
      expect(text).toMatch(new RegExp(uniqueToken));
      // No errors should appear in response
      expect(text.toLowerCase()).not.toContain('error');
      expect(text.toLowerCase()).not.toContain('invalid');

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should find a deal by owner EMAIL (auto-resolution) and unique deal token', async () => {
    const testName = 'owner_actor_reference_by_email';
    let passed = false;
    let error: string | undefined;

    if (!OWNER_EMAIL) {
      console.warn(
        'Skipping TC-AO03 EMAIL test: ATTIO_DEFAULT_DEAL_OWNER is not set; cannot validate email-based owner filtering with auto-resolution.'
      );
      return; // Skip gracefully without failing the suite
    }

    try {
      // Create a unique deal
      const uniqueToken = TestDataFactory.generateTestId('TCAO03-EMAIL');
      const dealData = TestDataFactory.createDealData('TCAO03');
      dealData.name = `TCAO03 Owner Email Filter ${uniqueToken}`;

      const createResult = await testCase.executeToolCall('create_record', {
        resource_type: 'deals',
        record_data: dealData,
      });

      const dealId = QAAssertions.assertRecordCreated(createResult, 'deals');
      testCase.trackRecord('deals', dealId);

      // Search using owner EMAIL - should auto-resolve to UUID
      const searchResult = await testCase.executeToolCall(
        'records_search_advanced',
        {
          resource_type: 'deals',
          filters: {
            filters: [
              {
                attribute: { slug: 'owner' },
                condition: 'equals',
                value: OWNER_EMAIL, // Email auto-resolves to workspace member UUID
              },
              {
                attribute: { slug: 'name' },
                condition: 'contains',
                value: uniqueToken,
              },
            ],
          },
          limit: 5,
        }
      );

      // Validate successful search and presence of our created deal
      const text = testCase.extractTextContent(searchResult);
      expect(text).toContain('Advanced search found');
      expect(text).toMatch(/deals?/i);
      expect(text).toMatch(new RegExp(uniqueToken));
      // No errors should appear in response
      expect(text.toLowerCase()).not.toContain('error');
      expect(text.toLowerCase()).not.toContain('invalid');
      expect(text.toLowerCase()).not.toContain('ambiguous');

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should find a deal by owner NAME (auto-resolution) and unique deal token', async () => {
    const testName = 'owner_actor_reference_by_name';
    let passed = false;
    let error: string | undefined;

    if (!OWNER_NAME) {
      console.warn(
        'Skipping TC-AO03 NAME test: ATTIO_DEFAULT_DEAL_OWNER_NAME is not set; cannot validate name-based owner filtering with auto-resolution.'
      );
      return; // Skip gracefully without failing the suite
    }

    try {
      // Create a unique deal
      const uniqueToken = TestDataFactory.generateTestId('TCAO03-NAME');
      const dealData = TestDataFactory.createDealData('TCAO03');
      dealData.name = `TCAO03 Owner Name Filter ${uniqueToken}`;

      const createResult = await testCase.executeToolCall('create_record', {
        resource_type: 'deals',
        record_data: dealData,
      });

      const dealId = QAAssertions.assertRecordCreated(createResult, 'deals');
      testCase.trackRecord('deals', dealId);

      // Search using owner full NAME - should auto-resolve to UUID
      const searchResult = await testCase.executeToolCall(
        'records_search_advanced',
        {
          resource_type: 'deals',
          filters: {
            filters: [
              {
                attribute: { slug: 'owner' },
                condition: 'equals',
                value: OWNER_NAME, // Full name auto-resolves to workspace member UUID
              },
              {
                attribute: { slug: 'name' },
                condition: 'contains',
                value: uniqueToken,
              },
            ],
          },
          limit: 5,
        }
      );

      // Validate successful search and presence of our created deal
      const text = testCase.extractTextContent(searchResult);
      expect(text).toContain('Advanced search found');
      expect(text).toMatch(/deals?/i);
      expect(text).toMatch(new RegExp(uniqueToken));
      // No errors should appear in response
      expect(text.toLowerCase()).not.toContain('error');
      expect(text.toLowerCase()).not.toContain('invalid');
      expect(text.toLowerCase()).not.toContain('ambiguous');

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });
});
