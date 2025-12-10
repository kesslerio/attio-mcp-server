/**
 * TC-EC07: Attribute Validation Error Handling
 * P2 Edge Cases Test - Phase 4 Coverage #975
 *
 * Validates attribute-not-found error handling with Levenshtein suggestions
 * and discovery hints for unknown attributes.
 *
 * Test scenarios:
 * - Invalid attribute on update triggers enhanced error with suggestions
 * - Error message includes `records_discover_attributes` hint
 * - New `records_get_attribute_options` tool returns valid options
 * - Field alias mapping normalizes common mistakes (linkedin_url → linkedin)
 *
 * Resources covered: people, companies
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  EdgeCaseTestBase,
  type EdgeCaseTestResult,
} from '../shared/edge-case-test-base';
import { TestDataFactory } from '../shared/test-data-factory';

class AttributeValidationTest extends EdgeCaseTestBase {
  private baselinePersonId: string | null = null;
  private baselineCompanyId: string | null = null;

  constructor() {
    super('TC_EC07');
  }

  /**
   * Create baseline records used by attribute validation scenarios
   */
  async setupBaselineRecords(): Promise<void> {
    // Create person for update tests
    try {
      const personData = TestDataFactory.createPersonData('TC_EC07_BASE');
      const personResult = await this.executeToolCall('create-record', {
        resource_type: 'people',
        record_data: personData,
      });

      this.baselinePersonId = this.extractRecordId(
        this.extractTextContent(personResult)
      );
      if (this.baselinePersonId) {
        this.trackRecord('people', this.baselinePersonId);
      }
    } catch (error) {
      console.error('Failed to create baseline person for TC-EC07:', error);
    }

    // Create company for attribute options test
    try {
      const companyData = TestDataFactory.createCompanyData('TC_EC07_BASE');
      const companyResult = await this.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: companyData,
      });

      this.baselineCompanyId = this.extractRecordId(
        this.extractTextContent(companyResult)
      );
      if (this.baselineCompanyId) {
        this.trackRecord('companies', this.baselineCompanyId);
      }
    } catch (error) {
      console.error('Failed to create baseline company for TC-EC07:', error);
    }
  }

  getPersonIdOrThrow(): string {
    if (!this.baselinePersonId) {
      throw new Error('Baseline person ID unavailable for TC-EC07 tests');
    }
    return this.baselinePersonId;
  }

  getCompanyIdOrThrow(): string {
    if (!this.baselineCompanyId) {
      throw new Error('Baseline company ID unavailable for TC-EC07 tests');
    }
    return this.baselineCompanyId;
  }
}

describe('TC-EC07: Attribute Validation Error Handling', () => {
  const testCase = new AttributeValidationTest();
  const testResults: EdgeCaseTestResult[] = [];

  beforeAll(async () => {
    await testCase.setup();
    await testCase.setupBaselineRecords();
  }, 60000);

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();

    testCase.logDetailedResults();
    const summary = testCase.getResultsSummary();

    console.log(
      `\nTC-EC07 Attribute Validation Results: ${summary.passed}/${summary.total} passed (${summary.passRate.toFixed(1)}%)`
    );

    if (summary.total > 0) {
      const passRate = summary.passRate;
      if (passRate < 75) {
        console.warn(
          `⚠️ TC-EC07 below P2 threshold: ${passRate.toFixed(1)}% (required: 75%)`
        );
      } else {
        console.log(
          `✅ TC-EC07 meets P2 quality gate: ${passRate.toFixed(1)}% (required: 75%)`
        );
      }
    }
  }, 60000);

  describe('Attribute Not Found Error Handling', () => {
    it('should normalize linkedin_url alias on update (Phase 4 field mapping)', async () => {
      // Phase 4 field mapper converts linkedin_url → linkedin
      // This should succeed (graceful_handling) because the alias is mapped
      const result = await testCase.executeExpectedFailureTest(
        'linkedin_url_alias_update',
        'update-record',
        {
          resource_type: 'people',
          record_id: testCase.getPersonIdOrThrow(),
          record_data: { linkedin_url: 'https://linkedin.com/in/test-user' },
        },
        'graceful_handling', // Alias mapping allows this to succeed
        ['linkedin'] // Either success message or contains "linkedin"
      );

      testResults.push(result);
      expect(result.passed).toBe(true);
    });

    it('should include discovery hint for truly unknown attribute', async () => {
      // Truly unknown attributes (no alias) trigger enhanced error with discovery hint
      const result = await testCase.executeExpectedFailureTest(
        'unknown_attribute_discovery_hint',
        'update-record',
        {
          resource_type: 'people',
          record_id: testCase.getPersonIdOrThrow(),
          record_data: { totally_unknown_field_xyz: 'test value' },
        },
        'error',
        ['records_discover_attributes'] // Must include tool hint
      );

      testResults.push(result);
      expect(result.passed).toBe(true);
    });

    it('should normalize twitter_handle alias on update (Phase 4 field mapping)', async () => {
      // Phase 4 field mapper converts twitter_handle → twitter
      // This should succeed (graceful_handling) because the alias is mapped
      const result = await testCase.executeExpectedFailureTest(
        'twitter_handle_alias_update',
        'update-record',
        {
          resource_type: 'people',
          record_id: testCase.getPersonIdOrThrow(),
          record_data: { twitter_handle: '@testuser' },
        },
        'graceful_handling', // Alias mapping allows this to succeed
        ['twitter'] // Either success message or contains "twitter"
      );

      testResults.push(result);
      expect(result.passed).toBe(true);
    });
  });

  describe('Records Get Attribute Options Tool', () => {
    it('should retrieve valid options for select attribute', async () => {
      // Test the new records_get_attribute_options tool
      const result = await testCase.executeToolCall(
        'records_get_attribute_options',
        {
          resource_type: 'companies',
          attribute: 'categories',
        }
      );

      const text = testCase.extractTextContent(result);
      const isSuccess = !result.isError && text.length > 0;

      testResults.push({
        test: 'get_attribute_options_categories',
        passed: isSuccess,
        executionTime: 0,
        expectedBehavior: 'graceful_handling',
        actualBehavior: isSuccess ? 'success' : 'error',
      });

      expect(result.isError).toBeFalsy();
      // Verify response contains options or expected structure
      expect(text.toLowerCase()).toMatch(/option|value|title/i);
    });

    it('should retrieve valid options for status attribute (deals stage)', async () => {
      const result = await testCase.executeToolCall(
        'records_get_attribute_options',
        {
          resource_type: 'deals',
          attribute: 'stage',
        }
      );

      const text = testCase.extractTextContent(result);
      const isSuccess = !result.isError && text.length > 0;

      testResults.push({
        test: 'get_attribute_options_stage',
        passed: isSuccess,
        executionTime: 0,
        expectedBehavior: 'graceful_handling',
        actualBehavior: isSuccess ? 'success' : 'error',
      });

      expect(result.isError).toBeFalsy();
      // Verify response contains stage options
      expect(text.toLowerCase()).toMatch(/mql|demo|won|stage|option/i);
    });

    it('should return error for non-select attribute', async () => {
      // "name" is a text field, not a select - should return helpful error
      const result = await testCase.executeExpectedFailureTest(
        'get_attribute_options_non_select',
        'records_get_attribute_options',
        {
          resource_type: 'companies',
          attribute: 'name',
        },
        'graceful_handling',
        ['not', 'select', 'status'] // Error should explain it's not an option field
      );

      testResults.push(result);
      expect(result.passed).toBe(true);
    });
  });

  describe('Field Alias Mapping (Create Path)', () => {
    it('should normalize linkedin_url to linkedin on create', async () => {
      // Phase 4 adds field alias mapping: linkedin_url → linkedin
      // On create, this should succeed (mapped) rather than error
      const result = await testCase.executeToolCall('create-record', {
        resource_type: 'people',
        record_data: {
          name: `TC-EC07 LinkedIn Alias Test ${Date.now()}`,
          email_addresses: [`tc-ec07-alias-${Date.now()}@example.com`],
          linkedin_url: 'https://linkedin.com/in/alias-test',
        },
      });

      const text = testCase.extractTextContent(result);
      const recordId = testCase.extractRecordId(text);

      // Track for cleanup
      if (recordId) {
        testCase.trackRecord('people', recordId);
      }

      const isSuccess = !result.isError && recordId !== null;

      testResults.push({
        test: 'linkedin_url_alias_mapping',
        passed: isSuccess,
        executionTime: 0,
        expectedBehavior: 'graceful_handling',
        actualBehavior: isSuccess ? 'success' : 'error',
        error: isSuccess ? undefined : text,
      });

      // If alias mapping works, create should succeed
      // If it fails, the test will catch that
      expect(result.isError).toBeFalsy();
    });
  });
});
