/**
 * TC-CO07: Metadata & Detailed Info Operations
 * P1 Essential Test - Ensures schema discovery and detailed info coverage using live Attio data.
 *
 * Validates metadata discovery across core resource types using universal tools:
 * - Attribute enumeration via records_get_attributes for companies, people, and tasks
 * - Schema discovery coverage via records_discover_attributes across key resource types
 * - Detailed info retrieval via records_get_info for contact and business data slices
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

const collectAttributeSlugs = (payload: unknown): string[] => {
  const slugs = new Set<string>();
  const visited = new WeakSet<object>();

  const visit = (value: unknown): void => {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    if (typeof value === 'object') {
      if (visited.has(value as object)) {
        return;
      }
      visited.add(value as object);

      const record = value as Record<string, unknown>;
      const slugCandidate =
        record.api_slug ||
        record.slug ||
        record.key ||
        record.field ||
        record.id ||
        record.name ||
        record.title;

      if (typeof slugCandidate === 'string') {
        slugs.add(slugCandidate.toLowerCase());
      }

      if (Array.isArray(record.attributes)) {
        visit(record.attributes);
      }

      if (Array.isArray(record.data)) {
        visit(record.data);
      }

      for (const nested of Object.values(record)) {
        if (typeof nested === 'object' || Array.isArray(nested)) {
          visit(nested);
        }
      }
    }
  };

  visit(payload);

  return Array.from(slugs);
};

const toNormalizedString = (payload: unknown, fallback: string): string => {
  if (!payload) {
    return fallback.toLowerCase();
  }

  try {
    return JSON.stringify(payload).toLowerCase();
  } catch (error) {
    return fallback.toLowerCase();
  }
};

class MetadataOperationsTest extends MCPTestBase {
  constructor() {
    super('TCCO07');
  }
}

describe('TC-CO07: Metadata & Detailed Info Operations', () => {
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

  it('should retrieve company attribute metadata via records_get_attributes', async () => {
    const testName = 'company_attribute_metadata';
    let passed = false;
    let error: string | undefined;

    try {
      const result = await testCase.executeToolCall('records_get_attributes', {
        resource_type: 'companies',
      });

      QAAssertions.assertValidSchema(result, 'companies');

      const payload = testCase.parseJsonFromResult(result);
      const attributeSlugs = collectAttributeSlugs(payload);

      if (attributeSlugs.length > 0) {
        expect(attributeSlugs).toEqual(
          expect.arrayContaining(['name', 'domains', 'description'])
        );
      } else {
        const text = testCase.extractTextContent(result).toLowerCase();
        expect(text).toContain('available company attributes');
        expect(text).toContain('name');
        expect(text).toContain('domains');
        expect(text).toContain('description');
      }

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should expose people attributes including contact fields', async () => {
    const testName = 'people_attribute_metadata';
    let passed = false;
    let error: string | undefined;

    try {
      const result = await testCase.executeToolCall('records_get_attributes', {
        resource_type: 'people',
      });

      QAAssertions.assertValidSchema(result, 'people');

      const payload = testCase.parseJsonFromResult(result);
      const attributeSlugs = collectAttributeSlugs(payload);

      if (attributeSlugs.length > 0) {
        expect(attributeSlugs).toEqual(
          expect.arrayContaining(['email', 'phone', 'job_title'])
        );
      } else {
        const text = testCase.extractTextContent(result).toLowerCase();
        expect(text).toContain('available person attributes');
        expect(text).toContain('email');
        expect(text).toContain('phone');
        expect(text).toContain('job_title');
      }

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should surface task scheduling fields from records_get_attributes', async () => {
    const testName = 'task_attribute_metadata';
    let passed = false;
    let error: string | undefined;

    try {
      const result = await testCase.executeToolCall('records_get_attributes', {
        resource_type: 'tasks',
      });

      QAAssertions.assertValidSchema(result, 'tasks');

      const payload = testCase.parseJsonFromResult(result);
      const attributeSlugs = collectAttributeSlugs(payload);

      if (attributeSlugs.length > 0) {
        expect(attributeSlugs).toEqual(
          expect.arrayContaining(['title', 'deadline', 'is_completed'])
        );
      } else {
        const text = testCase.extractTextContent(result).toLowerCase();
        expect(text).toContain('available task attributes');
        expect(text).toContain('title');
        expect(text).toContain('deadline');
        expect(text).toContain('is_completed');
      }

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should discover schema requirements across core resource types', async () => {
    const testName = 'discover_attributes_all_resources';
    let passed = false;
    let error: string | undefined;

    try {
      const resourceTypes = ['companies', 'people', 'deals', 'tasks'];

      for (const resourceType of resourceTypes) {
        const result = await testCase.executeToolCall(
          'records_discover_attributes',
          {
            resource_type: resourceType,
          }
        );

        QAAssertions.assertValidSchema(result, resourceType);

        const payload = testCase.parseJsonFromResult(result);
        const attributeSlugs = collectAttributeSlugs(payload);

        if (attributeSlugs.length > 0) {
          expect(attributeSlugs.length).toBeGreaterThan(5);
        } else {
          const text = testCase.extractTextContent(result).toLowerCase();
          expect(text).toContain('available');
          expect(text).toContain('attributes');
          expect(text.length).toBeGreaterThan(100);
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

  it('should return contact-focused details for people via records_get_info', async () => {
    const testName = 'person_contact_info';
    let passed = false;
    let error: string | undefined;

    try {
      const personData = TestDataFactory.createPersonData('TCCO07_contact');
      const createResult = await testCase.executeToolCall('create-record', {
        resource_type: 'people',
        record_data: personData,
      });

      const personId = QAAssertions.assertRecordCreated(createResult, 'people');
      testCase.trackRecord('people', personId);

      const infoResult = await testCase.executeToolCall('records_get_info', {
        resource_type: 'people',
        record_id: personId,
      });

      const payload = testCase.parseJsonFromResult(infoResult);
      const text = testCase.extractTextContent(infoResult);
      const normalized = toNormalizedString(payload, text);
      expect(normalized).toContain('person');
      expect(normalized).toContain(personData.email_addresses[0].toLowerCase());
      expect(normalized).toMatch(/0100/);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });

  it('should expose business context for companies via records_get_info', async () => {
    const testName = 'company_business_info';
    let passed = false;
    let error: string | undefined;

    try {
      const companyData = TestDataFactory.createCompanyData('TCCO07_business');
      const createResult = await testCase.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: companyData,
      });

      const companyId = QAAssertions.assertRecordCreated(
        createResult,
        'companies'
      );
      testCase.trackRecord('companies', companyId);

      const infoResult = await testCase.executeToolCall('records_get_info', {
        resource_type: 'companies',
        record_id: companyId,
      });

      const payload = testCase.parseJsonFromResult(infoResult);
      const text = testCase.extractTextContent(infoResult);
      const normalized = toNormalizedString(payload, text);
      expect(normalized).toContain('company');
      expect(normalized).toContain(companyData.domains[0].toLowerCase());
      expect(normalized).toContain('description');

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });
});
