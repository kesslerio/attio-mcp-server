/**
 * Customer Journey & Advanced Operations - Customer Success Playbook Tests
 *
 * Tests advanced customer success operations including journey optimization,
 * strategic account management, and performance monitoring.
 */
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestClient } from 'mcp-test-client';
import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';
import { PlaybookTestResult, ValidationLevel } from '../shared/types.js';
import { executePlaybookTest } from '../shared/test-executor.js';
import {
  createFailureAnalysisReport,
  createSingleGitHubIssue,
  createEnhancedValidationReport,
  getValidationLevelEmoji,
} from '../shared/reporting.js';

const CS_ENABLED = process.env.CS_E2E_ENABLE === 'true';
const suiteFn = CS_ENABLED ? describe : describe.skip;

suiteFn('🎯 Customer Journey & Advanced Operations', () => {
  let client: MCPTestClient;
  let testResults: PlaybookTestResult[] = [];
  let resolvedCompanyId: string | null = null;
  let seededCompanyName: string | null = null;
  const SEED = process.env.CS_E2E_SEED === 'true';

  beforeAll(async () => {
    client = new MCPTestClient({
      serverCommand: 'node',
      serverArgs: ['./dist/index.js'],
    });
    await client.init();

    try {
      if (SEED) {
        seededCompanyName = `Demo CS Co ${new Date().toISOString().replace(/[:.]/g, '-')}`;
        await client.assertToolCall(
          'create-record',
          {
            resource_type: 'companies',
            record_data: { name: seededCompanyName },
          },
          (toolResult: ToolResult) => {
            const text =
              toolResult?.content?.[0] && 'text' in toolResult.content[0]
                ? ((toolResult.content[0] as any).text as string)
                : '';
            const m = text.match(/\(ID:\s*([0-9a-fA-F-]{10,})\)/);
            if (m) resolvedCompanyId = m[1];
            return true;
          }
        );
      }
      if (!resolvedCompanyId) {
        await client.assertToolCall(
          'search-records',
          { resource_type: 'companies', query: '', limit: 1 },
          (result: ToolResult) => {
            const text =
              result?.content?.[0] && 'text' in result.content[0]
                ? ((result.content[0] as any).text as string)
                : '';
            const m = text.match(/\(ID:\s*([0-9a-fA-F-]{10,})\)/);
            if (m) resolvedCompanyId = m[1];
            return true;
          }
        );
      }
    } catch {
      resolvedCompanyId = null;
    }
  }, 120000);

  afterAll(async () => {
    await client.cleanup();

    // Print local results for this suite
    const failures = testResults.filter((result) => !result.success);
    const partialSuccesses = testResults.filter(
      (result) => result.validationLevel === ValidationLevel.PARTIAL_SUCCESS
    );
    const fullSuccesses = testResults.filter(
      (result) => result.validationLevel === ValidationLevel.FULL_SUCCESS
    );

    console.log('\n📊 Customer Journey Suite Summary:');
    console.log(
      `   🟢 Full Success: ${fullSuccesses.length}/${testResults.length}`
    );
    console.log(
      `   🟡 Partial Success: ${partialSuccesses.length}/${testResults.length}`
    );
    console.log(`   🔴 Failures: ${failures.length}/${testResults.length}`);

    // Print validation breakdown
    const validationBreakdown = testResults.reduce(
      (acc, result) => {
        const level = result.validationLevel || ValidationLevel.FRAMEWORK_ERROR;
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {} as Record<ValidationLevel, number>
    );

    console.log('\n🔍 Customer Journey Validation Breakdown:');
    Object.entries(validationBreakdown).forEach(([level, count]) => {
      const emoji = getValidationLevelEmoji(level as ValidationLevel);
      console.log(`   ${emoji} ${level}: ${count}`);
    });

    // Export results for main orchestrator if needed
    (global as any).customerJourneyResults = testResults;
  }, 120000);

  describe('Relationship & Growth Opportunities', () => {
    it('should identify expansion opportunities through account review', async () => {
      const prompt =
        'Identify customers with expansion potential based on account activity';
      const expectedOutcome = 'List of accounts with growth opportunities';

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'search-by-relationship',
        {
          relationship_type: 'company_to_deals',
          source_id: 'sample-company-id-123',
          target_resource_type: 'deals',
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should map and maintain customer relationships (stakeholder mapping)', async () => {
      const prompt =
        'Map decision makers, influencers, and end users across customer accounts';
      const expectedOutcome =
        'Comprehensive stakeholder mapping for customer accounts';

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'search-by-relationship',
        {
          relationship_type: 'company_to_people',
          source_id: 'sample-company-id-123',
          target_resource_type: 'people',
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });
  });

  describe('Strategic Communication & Planning', () => {
    it('should establish communication strategies with regular check-in schedules', async () => {
      const prompt =
        'Create systematic customer communication schedule based on account tier';
      const expectedOutcome =
        'Structured communication calendar for customer touchpoints';

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'batch-operations',
        {
          resource_type: 'tasks',
          operations: [
            {
              operation: 'create',
              record_data: {
                title: 'High-Value Customer Check-in',
                content: 'Weekly check-in call with strategic customer',
                recurring: true,
              },
            },
          ],
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should develop strategic account plans for key customers', async () => {
      const prompt =
        'Develop strategic account plans for key customers with business review preparation';
      const expectedOutcome =
        'Strategic account plans with business review schedules';

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'create-record',
        {
          resource_type: 'notes',
          record_data: {
            title: 'Strategic Account Plan - Q4 Business Review',
            content:
              'Annual business review preparation and strategic planning for key customer account',
            parent_object: 'companies',
            parent_record_id: resolvedCompanyId || 'sample-company-id-123',
          },
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });
  });

  describe('Performance & Feedback Management', () => {
    it('should review customer success performance metrics', async () => {
      const prompt =
        'Review customer success performance through available data';
      const expectedOutcome =
        'Customer success metrics and performance analysis';

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'get-detailed-info',
        {
          resource_type: 'companies',
          record_id: resolvedCompanyId || 'sample-company-id-123',
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should collect and analyze customer feedback systematically', async () => {
      const prompt =
        'Schedule regular satisfaction surveys and collect customer feedback';
      const expectedOutcome =
        'Systematic customer feedback collection and analysis';

      // Seed a note with matching keywords to make content search deterministic
      if (resolvedCompanyId) {
        await client.assertToolCall(
          'create-record',
          {
            resource_type: 'notes',
            record_data: {
              title: 'Customer Feedback Survey – Seed',
              content:
                'feedback satisfaction survey: seeded content for validation',
              parent_object: 'companies',
              parent_record_id: resolvedCompanyId,
            },
          },
          () => true
        );
      }

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'search-by-content',
        {
          resource_type: 'notes',
          content_type: 'notes',
          search_query: 'feedback satisfaction survey',
          limit: 20,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should optimize customer success processes for continuous improvement', async () => {
      const prompt =
        'Review customer success workflow efficiency and identify process improvements';
      const expectedOutcome =
        'Process improvement recommendations for customer success workflows';

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'list-notes',
        {
          resource_type: 'companies',
          record_id: resolvedCompanyId || 'sample-company-id-123',
          limit: 10,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });
  });

  describe('Customer Journey Optimization', () => {
    it('should track and optimize customer onboarding milestones', async () => {
      const prompt =
        'Track key implementation milestones and onboarding completion rates';
      const expectedOutcome =
        'Customer onboarding milestone tracking and optimization';

      // Relax window: use 365 days to accommodate sparse data
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - 365);
      const startDate = daysAgo.toISOString().split('T')[0];

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'search-by-timeframe',
        {
          resource_type: 'companies',
          timeframe_type: 'created',
          start_date: startDate, // Companies created in the last 365 days
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should validate early customer success with 30-day check-ins', async () => {
      const prompt = 'Schedule 30-day success check-ins with new customers';
      const expectedOutcome =
        'Early success validation system for new customers';

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'create-record',
        {
          resource_type: 'tasks',
          record_data: {
            title: '30-Day Customer Success Check-in',
            content:
              'Initial value realization and satisfaction assessment for new customer',
            due_date: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          },
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should identify and mitigate customer retention risks', async () => {
      const prompt =
        'Monitor customer engagement patterns and identify retention risks';
      const expectedOutcome =
        'Retention risk identification and mitigation strategies';

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'search-records',
        {
          resource_type: 'companies',
          query: seededCompanyName ? seededCompanyName : 'a',
          limit: 1,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should systematically develop customer growth opportunities', async () => {
      const prompt =
        'Identify successful customer use cases suitable for expansion';
      const expectedOutcome =
        'Customer growth opportunity development and tracking';

      // Seed a note with matching keywords for deterministic content search
      if (resolvedCompanyId) {
        await client.assertToolCall(
          'create-record',
          {
            resource_type: 'notes',
            record_data: {
              title: 'Growth Opportunity – Seed',
              content: 'success story expansion opportunity growth – seeded',
              parent_object: 'companies',
              parent_record_id: resolvedCompanyId,
            },
          },
          () => true
        );
      }

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'search-by-content',
        {
          resource_type: 'notes',
          content_type: 'notes',
          search_query: 'success story expansion opportunity growth',
          limit: 15,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });
  });
});
