/**
 * TC-EC07: Attribute Validation Error Handling
 * P2 Edge Cases Test - PR #976 Complete Coverage (Phases 1-4) + Issue #980
 *
 * Validates all attribute-related error handling and UX improvements:
 *
 * Phase 1:
 * - `records_get_attribute_options` tool returns valid options
 * - `records_discover_attributes` returns correct types (not "unknown")
 *
 * Phase 2:
 * - Invalid select/status values show valid workspace options
 * - Typos in category values suggest correct alternatives
 *
 * Phase 3:
 * - LISTS resource_type returns clear error for attribute options
 *
 * Phase 4:
 * - Invalid attribute on update triggers enhanced error with suggestions
 * - Error message includes `records_discover_attributes` hint
 * - Field alias mapping normalizes common mistakes (linkedin_url → linkedin)
 *
 * Issue #980 UX Fixes:
 * - Display name → API slug resolution ("Deal stage" → "stage")
 * - Error messages show actual attribute name (not "attribute" placeholder)
 *
 * Resources covered: people, companies, deals, lists
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

  /**
   * Discovers a multi-select attribute for companies and returns a valid option.
   * Makes tests workspace-agnostic by not hardcoding specific field names.
   *
   * @returns Field slug and valid option, or null if no multi-select found
   */
  async discoverMultiSelectFieldAndOption(): Promise<{
    fieldSlug: string;
    validOption: string;
    isMultiSelect: boolean;
  } | null> {
    // Common multi-select field candidates across workspaces
    const potentialSelects = [
      'categories',
      'lead_type',
      'inbound_outbound',
      'regions',
      'tags',
      'types',
    ];

    for (const attr of potentialSelects) {
      try {
        const optionsResult = await this.executeToolCall(
          'records_get_attribute_options',
          {
            resource_type: 'companies',
            attribute: attr,
          }
        );

        if (!optionsResult.isError) {
          const optionsText = this.extractTextContent(optionsResult);

          // Check if this is a multi-select attribute
          const isMultiSelect =
            optionsText.toLowerCase().includes('multi-select') ||
            optionsText.toLowerCase().includes('multiselect') ||
            optionsText.toLowerCase().includes('is_multiselect: true');

          // Extract first option value from response
          // Try to parse as JSON first, then fall back to regex patterns
          let validOption: string | null = null;

          // Try JSON parsing - look for options array with title fields
          try {
            const parsed = this.parseJsonFromResult(optionsResult) as {
              options?: Array<{ title?: string; value?: string }>;
              data?: Array<{ title?: string; value?: string }>;
            };
            const options = parsed?.options || parsed?.data || [];
            if (Array.isArray(options) && options.length > 0) {
              // Get first non-archived option
              const firstOption = options.find(
                (opt) => opt.title && opt.title !== attr
              );
              if (firstOption?.title) {
                validOption = firstOption.title;
              }
            }
          } catch {
            // JSON parsing failed, fall back to regex
          }

          // Regex fallback for non-JSON responses
          if (!validOption) {
            const optionPatterns = [
              /"title":\s*"([^"]+)"/gi, // JSON format: "title": "Option"
              /Option:\s*["']?([^"'\n,]+)/gi, // "Option: Value" format
            ];

            for (const pattern of optionPatterns) {
              const matches = [...optionsText.matchAll(pattern)];
              // Find first option that isn't the attribute name itself
              const validMatch = matches.find(
                (m) =>
                  m[1] &&
                  m[1].trim().toLowerCase() !== attr.toLowerCase() &&
                  m[1].trim().length > 1
              );
              if (validMatch) {
                validOption = validMatch[1].trim();
                break;
              }
            }
          }

          if (validOption) {
            return {
              fieldSlug: attr,
              validOption,
              isMultiSelect,
            };
          }
        }
      } catch {
        // Try next attribute
        continue;
      }
    }

    return null;
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

  describe('Select/Status Error Enhancement (Phase 2)', () => {
    it('should show valid stages when invalid deal stage provided', async () => {
      // Phase 2: enhanceSelectStatusError() should return workspace-specific stages
      const result = await testCase.executeExpectedFailureTest(
        'invalid_deal_stage',
        'create-record',
        {
          resource_type: 'deals',
          record_data: {
            name: `TC-EC07 Invalid Stage Deal ${Date.now()}`,
            stage: 'TotallyInvalidStageName',
          },
        },
        'graceful_handling',
        ['stage'] // Should mention stage in error/warning
      );

      testResults.push(result);
      expect(result.passed).toBe(true);
    });

    it('should handle invalid company category gracefully', async () => {
      // Phase 2: enhanceSelectStatusError() with select attribute
      const result = await testCase.executeExpectedFailureTest(
        'invalid_company_category',
        'create-record',
        {
          resource_type: 'companies',
          record_data: {
            name: `TC-EC07 Invalid Category ${Date.now()}`,
            categories: ['TotallyInvalidCategory'],
          },
        },
        'graceful_handling',
        ['categor'] // Should mention categories in error/warning
      );

      testResults.push(result);
      expect(result.passed).toBe(true);
    });
  });

  describe('LISTS Resource Type Handling (Phase 3)', () => {
    it('should return clear error for lists attribute options', async () => {
      // Phase 3: LISTS branch should error clearly
      const result = await testCase.executeExpectedFailureTest(
        'lists_attribute_options_error',
        'records_get_attribute_options',
        {
          resource_type: 'lists',
          attribute: 'stage',
        },
        'error',
        ['list'] // Error should mention lists
      );

      testResults.push(result);
      expect(result.passed).toBe(true);
    });
  });

  describe('Display Name to API Slug Resolution (Issue #980)', () => {
    it('should resolve display name "Deal stage" to API slug "stage"', async () => {
      // Issue #980: When user provides display name instead of API slug,
      // the tool should automatically resolve it
      const result = await testCase.executeToolCall(
        'records_get_attribute_options',
        {
          resource_type: 'deals',
          attribute: 'Deal stage', // Display name, not API slug
        }
      );

      const text = testCase.extractTextContent(result);
      const isSuccess = !result.isError && text.length > 0;

      testResults.push({
        test: 'display_name_resolution_deal_stage',
        passed: isSuccess,
        executionTime: 0,
        expectedBehavior: 'graceful_handling',
        actualBehavior: isSuccess ? 'success' : 'error',
        error: isSuccess ? undefined : text,
      });

      // Should succeed by resolving "Deal stage" to "stage"
      expect(result.isError).toBeFalsy();
      // Verify response contains stage options
      expect(text.toLowerCase()).toMatch(/option|stage/i);
    });

    it('should show attribute name in error messages (not placeholder)', async () => {
      // Issue #980: formatResult was showing "attribute" instead of actual name
      const result = await testCase.executeToolCall(
        'records_get_attribute_options',
        {
          resource_type: 'companies',
          attribute: 'name', // text field, not a select
        }
      );

      const text = testCase.extractTextContent(result);
      // Error message should mention "name", not generic "attribute"
      const hasActualAttributeName =
        text.includes('"name"') || text.includes("'name'");
      const hasGenericPlaceholder =
        text.includes('"attribute"') && !text.includes('"name"');

      testResults.push({
        test: 'error_shows_actual_attribute_name',
        passed: hasActualAttributeName && !hasGenericPlaceholder,
        executionTime: 0,
        expectedBehavior: 'graceful_handling',
        actualBehavior: hasActualAttributeName ? 'success' : 'error',
        error:
          hasActualAttributeName && !hasGenericPlaceholder
            ? undefined
            : `Expected "name" in message, got placeholder: ${text.substring(0, 200)}`,
      });

      expect(hasActualAttributeName).toBe(true);
      expect(hasGenericPlaceholder).toBe(false);
    });
  });

  describe('Attribute Type Discovery (Phase 1 Bug Fix)', () => {
    it('should return correct attribute types (not unknown)', async () => {
      // Phase 1: discoverCompanyAttributes should return real types
      const result = await testCase.executeToolCall(
        'records_discover_attributes',
        {
          resource_type: 'companies',
        }
      );

      const text = testCase.extractTextContent(result);

      // Verify types are returned (not all "unknown")
      const hasRealTypes =
        /select|text|number|checkbox|status|record-reference/i.test(text);
      const unknownMatches = text.match(/\(unknown\)/gi) || [];
      const unknownCount = unknownMatches.length;

      // Count total attributes by looking for numbered list items
      const attributeMatches = text.match(/^\d+\./gm) || [];
      const totalAttributes = attributeMatches.length;

      // Less than 20% should be unknown (allowing some tolerance)
      const unknownRatio =
        totalAttributes > 0 ? unknownCount / totalAttributes : 0;

      const isSuccess = hasRealTypes && unknownRatio < 0.2;

      testResults.push({
        test: 'attribute_types_not_unknown',
        passed: isSuccess,
        executionTime: 0,
        expectedBehavior: 'graceful_handling',
        actualBehavior: isSuccess ? 'success' : 'error',
        error: isSuccess
          ? undefined
          : `Unknown ratio: ${(unknownRatio * 100).toFixed(1)}% (${unknownCount}/${totalAttributes})`,
      });

      expect(result.isError).toBeFalsy();
      expect(hasRealTypes).toBe(true);
      expect(unknownRatio).toBeLessThan(0.2);
    });
  });

  /**
   * Issue #992: Multi-select Array Auto-Transformation
   *
   * Tests that single values are automatically wrapped in arrays for multi-select
   * attributes before being sent to the Attio API. This prevents the error:
   * "Multi-select attribute 'X' expects an array but received a single value."
   *
   * WORKSPACE-AGNOSTIC: Tests dynamically discover a multi-select field and
   * valid option value rather than hardcoding workspace-specific fields.
   */
  describe('Multi-select Array Auto-Transformation (Issue #992)', () => {
    let multiSelectField: {
      fieldSlug: string;
      validOption: string;
      isMultiSelect: boolean;
    } | null = null;

    beforeAll(async () => {
      // Dynamically discover a multi-select field in this workspace
      multiSelectField = await testCase.discoverMultiSelectFieldAndOption();
      if (multiSelectField) {
        console.log(
          `🔍 Discovered multi-select field: ${multiSelectField.fieldSlug} ` +
            `with option: "${multiSelectField.validOption}"`
        );
      } else {
        console.log(
          '⚠️ No multi-select field found in workspace - tests will create without multi-select data'
        );
      }
    }, 30000); // 30s timeout for discovery API calls

    it('should auto-wrap single value in array for multi-select on create', async () => {
      // Issue #992: Creating a company with a single value for a multi-select
      // field should succeed (auto-wrapped to array)
      const uniqueName = `TC_EC07_MULTISELECT_${Date.now()}`;

      // Build company data dynamically based on discovered field
      const companyData: Record<string, unknown> = { name: uniqueName };
      if (multiSelectField) {
        companyData[multiSelectField.fieldSlug] = multiSelectField.validOption;
      }

      const result = await testCase.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: companyData,
      });

      const text = testCase.extractTextContent(result);
      // Check if creation succeeded (not a multi-select array error)
      const hasArrayError =
        text.toLowerCase().includes('expects an array') ||
        text.toLowerCase().includes('multi-select attribute');
      const hasSuccess =
        text.includes(uniqueName) ||
        text.includes('ID:') ||
        text.includes('record_id');

      // Cleanup if record was created
      const recordId = testCase.extractRecordId(text);
      if (recordId) {
        testCase.trackRecord('companies', recordId);
      }

      const fieldInfo = multiSelectField
        ? `field=${multiSelectField.fieldSlug}, value="${multiSelectField.validOption}"`
        : 'no multi-select field tested';

      testResults.push({
        test: 'multiselect_auto_wrap_on_create',
        passed: hasSuccess && !hasArrayError,
        executionTime: 0,
        expectedBehavior: 'graceful_handling',
        actualBehavior: hasSuccess ? `success (${fieldInfo})` : 'error',
        error:
          hasSuccess && !hasArrayError
            ? undefined
            : `Expected auto-wrap to array for ${fieldInfo}. Response: ${text.substring(0, 300)}`,
      });

      // Should NOT have the array format error
      expect(hasArrayError).toBe(false);
    });

    it('should auto-wrap single value in array for multi-select on update', async () => {
      if (!multiSelectField) {
        // Skip gracefully if no multi-select field discovered
        testResults.push({
          test: 'multiselect_auto_wrap_on_update',
          passed: true,
          executionTime: 0,
          expectedBehavior: 'graceful_handling',
          actualBehavior: 'skipped - no multi-select field in workspace',
        });
        return;
      }

      // Issue #992: Updating a company with a single value for a multi-select
      // field should succeed (auto-wrapped to array)
      const updateData: Record<string, unknown> = {};
      updateData[multiSelectField.fieldSlug] = multiSelectField.validOption;

      const result = await testCase.executeToolCall('update-record', {
        resource_type: 'companies',
        record_id: testCase.getCompanyIdOrThrow(),
        record_data: updateData,
      });

      const text = testCase.extractTextContent(result);
      // Check if update succeeded (not a multi-select array error)
      const hasArrayError =
        text.toLowerCase().includes('expects an array') ||
        text.toLowerCase().includes('multi-select attribute');

      testResults.push({
        test: 'multiselect_auto_wrap_on_update',
        passed: !hasArrayError,
        executionTime: 0,
        expectedBehavior: 'graceful_handling',
        actualBehavior: hasArrayError
          ? 'error'
          : `success (field=${multiSelectField.fieldSlug})`,
        error: hasArrayError
          ? `Expected auto-wrap for ${multiSelectField.fieldSlug}. Response: ${text.substring(0, 300)}`
          : undefined,
      });

      // Should NOT have the array format error
      expect(hasArrayError).toBe(false);
    });
  });
});
