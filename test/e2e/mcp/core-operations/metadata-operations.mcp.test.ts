/**
 * TC-CO07: Metadata Operations Coverage
 * P1 Essential Test - Ensures schema discovery and relationship metadata are available.
 *
 * Validates metadata discovery across core resource types using live Attio data:
 * - Object schema enumeration for companies
 * - Attribute metadata retrieval for people
 * - Relationship field discovery for deals
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import type { TestResult } from '../shared/quality-gates';

class MetadataOperationsTest extends MCPTestBase {
  constructor() {
    super('TCCO07');
  }
}

describe('TC-CO07: Metadata Operations Coverage', () => {
  const testCase = new MetadataOperationsTest();
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
      `\nTC-CO07 Results: ${passedCount}/${totalCount} passed (${passRate.toFixed(1)}%)`
    );

    if (passRate < 80) {
      console.warn(
        `⚠️  P1 Quality Gate Warning: Metadata operations pass rate ${passRate.toFixed(1)}% below 80% threshold`
      );
    }
  });

  it('should enumerate company schema including relationship fields', async () => {
    const testName = 'company_schema_relationships';
    let passed = false;
    let error: string | undefined;

    try {
      const result = await testCase.executeToolCall('discover-attributes', {
        resource_type: 'companies',
      });

      QAAssertions.assertValidSchema(result, 'companies');

      const text = testCase.extractTextContent(result).toLowerCase();
      expect(text).toContain('attributes');
      expect(text).toMatch(/associated[_\s-]?deals/);
      expect(text).toMatch(/team/);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should retrieve person attribute metadata with contact fields', async () => {
    const testName = 'person_attribute_metadata';
    let passed = false;
    let error: string | undefined;

    try {
      const result = await testCase.executeToolCall('get-attributes', {
        resource_type: 'people',
      });

      QAAssertions.assertValidSchema(result, 'people');

      const text = testCase.extractTextContent(result).toLowerCase();
      expect(text).toContain('email');
      expect(text).toContain('phone');
      expect(text).toMatch(/company/);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should expose relationship mappings for deals metadata', async () => {
    const testName = 'deal_relationship_mappings';
    let passed = false;
    let error: string | undefined;

    try {
      const result = await testCase.executeToolCall('discover-attributes', {
        resource_type: 'deals',
      });

      QAAssertions.assertValidSchema(result, 'deals');

      const text = testCase.extractTextContent(result).toLowerCase();
      expect(text).toMatch(/associated[_\s-]?company/);
      expect(text).toMatch(/associated[_\s-]?people/);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });
});
