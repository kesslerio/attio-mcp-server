/**
 * TC-EC16: Special Character Handling Edge Cases
 * P2 Edge Cases Test - Complete MCP Test Suite Implementation
 * Issue #815: Special character handling coverage in MCP E2E suite
 *
 * Validates that MCP record operations preserve special characters such as
 * quotes, HTML entities, and Unicode symbols across create → read → update
 * flows and for multiple resource types.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { EdgeCaseTestBase } from '../shared/edge-case-test-base';

class SpecialCharacterEdgeCaseTest extends EdgeCaseTestBase {
  constructor() {
    super('TC_EC16');
  }

  /**
   * Execute a tracked edge case scenario and capture pass/fail analytics.
   */
  async runTrackedScenario(
    testName: string,
    scenario: () => Promise<void>
  ): Promise<void> {
    this.startTestTiming();

    try {
      await scenario();
      this.results.push({
        test: testName,
        passed: true,
        executionTime: this.endTestTiming(),
        expectedBehavior: 'graceful_handling',
        actualBehavior: 'graceful_handling',
      });
    } catch (error) {
      this.results.push({
        test: testName,
        passed: false,
        executionTime: this.endTestTiming(),
        expectedBehavior: 'graceful_handling',
        actualBehavior: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Parse Attio record JSON from a tool response text payload.
   */
  parseRecordPayload(text: string): Record<string, unknown> | null {
    const jsonStart = text.indexOf('{');
    if (jsonStart === -1) {
      return null;
    }

    const jsonText = text.slice(jsonStart);

    try {
      return JSON.parse(jsonText) as Record<string, unknown>;
    } catch (error) {
      console.warn('Failed to parse record payload JSON', { error, text });
      return null;
    }
  }

  /**
   * Extract a normalized text value from Attio record payloads.
   */
  extractRecordValue(
    record: Record<string, unknown> | null,
    fieldName: string
  ): string | undefined {
    if (!record) {
      return undefined;
    }

    const values = (record.values as Record<string, unknown>) || record;
    const rawValue = values ? values[fieldName] : undefined;

    return this.normalizeValue(rawValue);
  }

  private normalizeValue(value: unknown): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        const normalized = this.normalizeValue(entry);
        if (normalized) {
          return normalized;
        }
      }
      return undefined;
    }

    if (typeof value === 'object') {
      const candidate = value as Record<string, unknown>;

      if ('value' in candidate) {
        return this.normalizeValue(candidate.value);
      }

      if ('values' in candidate) {
        return this.normalizeValue(candidate.values);
      }

      if ('text' in candidate) {
        return this.normalizeValue(candidate.text);
      }

      return JSON.stringify(candidate);
    }

    return String(value);
  }

  /**
   * Track a created record and return its identifier.
   */
  captureRecordId(resourceType: string, responseText: string): string {
    const recordId = this.extractRecordId(responseText);

    if (!recordId) {
      throw new Error(
        `Failed to extract ${resourceType} record ID from response: ${responseText}`
      );
    }

    this.trackRecord(resourceType, recordId);
    return recordId;
  }

  /**
   * Fetch record details and return both text + parsed payload.
   */
  async getRecordSnapshot(
    resourceType: string,
    recordId: string
  ): Promise<{
    text: string;
    payload: Record<string, unknown> | null;
  }> {
    const detailsResult = await this.executeToolCall('get-record-details', {
      resource_type: resourceType,
      record_id: recordId,
    });

    expect(detailsResult.isError).toBe(false);

    const text = this.extractTextContent(detailsResult);
    const payload = this.parseRecordPayload(text);

    return { text, payload };
  }
}

describe('TC-EC16: Special Character Handling Edge Cases', () => {
  const testCase = new SpecialCharacterEdgeCaseTest();

  beforeAll(async () => {
    await testCase.setup();
  }, 60000);

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();

    testCase.logDetailedResults();
    const summary = testCase.getResultsSummary();

    console.log(
      `\nTC-EC16 Special Character Handling Results: ${summary.passed}/${summary.total} passed (${summary.passRate.toFixed(1)}%)`
    );

    if (summary.total > 0) {
      if (summary.passRate < 75) {
        console.warn(
          `⚠️ TC-EC16 below P2 threshold: ${summary.passRate.toFixed(1)}% (required: 75%)`
        );
      } else {
        console.log(
          `✅ TC-EC16 meets P2 quality gate: ${summary.passRate.toFixed(1)}% (required: 75%)`
        );
      }
    }
  }, 60000);

  it('should preserve quotes and apostrophes through create → read → update', async () => {
    await testCase.runTrackedScenario(
      'quotes_apostrophes_preserved',
      async () => {
        const createResult = await testCase.executeToolCall('create-record', {
          resource_type: 'companies',
          record_data: {
            name: `O'Reilly "Media & Solutions"`,
            description: `Company with O'Brien's \"special\" quotes`,
          },
        });

        expect(createResult.isError).toBe(false);

        const createText = testCase.extractTextContent(createResult);
        expect(createText).toContain("O'Reilly");
        expect(createText).toContain('Media & Solutions');
        expect(createText).toContain("O'Brien's");

        const companyId = testCase.captureRecordId('companies', createText);

        const { text: detailsText, payload: detailsPayload } =
          await testCase.getRecordSnapshot('companies', companyId);

        expect(detailsText).toContain("O'Reilly");
        expect(detailsText).toContain('Media & Solutions');

        const nameValue = testCase.extractRecordValue(detailsPayload, 'name');
        const descriptionValue = testCase.extractRecordValue(
          detailsPayload,
          'description'
        );

        expect(nameValue).toContain('"Media & Solutions"');
        expect(descriptionValue).toContain(`O'Brien's`);
        expect(descriptionValue).toContain('"special"');

        const updateResult = await testCase.executeToolCall('update-record', {
          resource_type: 'companies',
          record_id: companyId,
          record_data: {
            name: `O'Reilly Media — "Best Practices" Guide`,
            description:
              'Updated "Quote" summary with apostrophes and ampersands & more',
          },
        });

        expect(updateResult.isError).toBe(false);

        const updateText = testCase.extractTextContent(updateResult);
        expect(updateText).toContain('"Best Practices"');
        expect(updateText).toContain('Updated "Quote" summary');

        const { payload: updatedPayload } = await testCase.getRecordSnapshot(
          'companies',
          companyId
        );

        const updatedName = testCase.extractRecordValue(updatedPayload, 'name');
        const updatedDescription = testCase.extractRecordValue(
          updatedPayload,
          'description'
        );

        expect(updatedName).toContain('"Best Practices"');
        expect(updatedDescription).toContain('Updated "Quote" summary');
        expect(updatedDescription).toContain('apostrophes');
      }
    );
  });

  it('should preserve HTML entities and tags without corruption', async () => {
    await testCase.runTrackedScenario('html_entities_preserved', async () => {
      const htmlName = '<strong>Important &amp; Co.</strong>';
      const htmlDescription =
        'Content with &amp; entities, &lt;tags&gt;, and <script>alert("test")</script>';

      const createResult = await testCase.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: {
          name: htmlName,
          description: htmlDescription,
        },
      });

      expect(createResult.isError).toBe(false);

      const createText = testCase.extractTextContent(createResult);
      expect(createText).toContain('&amp;');
      expect(createText).toContain('&lt;');
      expect(createText.toLowerCase()).toContain('<script>alert');

      const companyId = testCase.captureRecordId('companies', createText);

      const { payload } = await testCase.getRecordSnapshot(
        'companies',
        companyId
      );

      const nameValue = testCase.extractRecordValue(payload, 'name');
      const descriptionValue = testCase.extractRecordValue(
        payload,
        'description'
      );

      expect(nameValue).toContain('<strong>');
      expect(nameValue).toContain('&amp;');
      expect(descriptionValue).toContain('&amp;');
      expect(descriptionValue).toContain('&lt;tags&gt;');
      expect(descriptionValue).toMatch(/<script>|&lt;script/);

      const updateResult = await testCase.executeToolCall('update-record', {
        resource_type: 'companies',
        record_id: companyId,
        record_data: {
          description:
            'Updated markup with &nbsp; entity, <em>emphasis</em>, and XML-like <node attr="value"/>',
        },
      });

      expect(updateResult.isError).toBe(false);

      const { payload: updatedPayload } = await testCase.getRecordSnapshot(
        'companies',
        companyId
      );

      const updatedDescription = testCase.extractRecordValue(
        updatedPayload,
        'description'
      );

      expect(updatedDescription).toContain('&nbsp;');
      expect(updatedDescription).toContain('<em>');
      expect(updatedDescription).toContain('<node attr="value"/>');
    });
  });

  it('should handle special characters consistently across resources', async () => {
    await testCase.runTrackedScenario(
      'cross_resource_special_characters',
      async () => {
        const sharedName = 'Företag Cañón 株式会社 🚀';
        const sharedContent =
          'Notes with emoji ✅, entities &amp;, quotes " and apostrophes \' plus accents ñ';

        const companyResult = await testCase.executeToolCall('create-record', {
          resource_type: 'companies',
          record_data: {
            name: sharedName,
            description: sharedContent,
          },
        });
        expect(companyResult.isError).toBe(false);
        const companyText = testCase.extractTextContent(companyResult);
        const companyId = testCase.captureRecordId('companies', companyText);

        const personResult = await testCase.executeToolCall('create-record', {
          resource_type: 'people',
          record_data: {
            name: sharedName,
            email_addresses: [`special.char.${Date.now()}@example.com`],
            job_title: sharedContent,
          },
        });
        expect(personResult.isError).toBe(false);
        const personText = testCase.extractTextContent(personResult);
        const personId = testCase.captureRecordId('people', personText);

        const taskResult = await testCase.executeToolCall('create-record', {
          resource_type: 'tasks',
          record_data: {
            title: `${sharedName} Follow-up`,
            content: sharedContent,
            is_completed: false,
          },
        });
        expect(taskResult.isError).toBe(false);
        const taskText = testCase.extractTextContent(taskResult);
        const taskId = testCase.captureRecordId('tasks', taskText);

        const { payload: companyPayload } = await testCase.getRecordSnapshot(
          'companies',
          companyId
        );
        const { payload: personPayload } = await testCase.getRecordSnapshot(
          'people',
          personId
        );
        const { payload: taskPayload } = await testCase.getRecordSnapshot(
          'tasks',
          taskId
        );

        expect(testCase.extractRecordValue(companyPayload, 'name')).toContain(
          'Företag'
        );
        expect(
          testCase.extractRecordValue(companyPayload, 'description')
        ).toContain('✅');
        expect(testCase.extractRecordValue(personPayload, 'name')).toContain(
          '株式会社'
        );
        expect(
          testCase.extractRecordValue(personPayload, 'job_title')
        ).toContain('&amp;');
        expect(testCase.extractRecordValue(taskPayload, 'title')).toContain(
          '🚀'
        );
        expect(testCase.extractRecordValue(taskPayload, 'content')).toContain(
          'apostrophes'
        );

        const updateDescription =
          'Updated cross-resource summary with emoji 🎯 and multilingual text 北京';

        const updateCompany = await testCase.executeToolCall('update-record', {
          resource_type: 'companies',
          record_id: companyId,
          record_data: {
            description: updateDescription,
          },
        });
        expect(updateCompany.isError).toBe(false);

        const updatePerson = await testCase.executeToolCall('update-record', {
          resource_type: 'people',
          record_id: personId,
          record_data: {
            job_title: updateDescription,
          },
        });
        expect(updatePerson.isError).toBe(false);

        const updateTask = await testCase.executeToolCall('update-record', {
          resource_type: 'tasks',
          record_id: taskId,
          record_data: {
            content: updateDescription,
          },
        });
        expect(updateTask.isError).toBe(false);

        const { payload: updatedCompany } = await testCase.getRecordSnapshot(
          'companies',
          companyId
        );
        const { payload: updatedPerson } = await testCase.getRecordSnapshot(
          'people',
          personId
        );
        const { payload: updatedTask } = await testCase.getRecordSnapshot(
          'tasks',
          taskId
        );

        expect(
          testCase.extractRecordValue(updatedCompany, 'description')
        ).toContain('🎯');
        expect(
          testCase.extractRecordValue(updatedCompany, 'description')
        ).toContain('北京');
        expect(
          testCase.extractRecordValue(updatedPerson, 'job_title')
        ).toContain('北京');
        expect(testCase.extractRecordValue(updatedTask, 'content')).toContain(
          '🎯'
        );
      }
    );
  });
});
