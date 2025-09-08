/**
 * Customer Journey & Advanced Operations - Customer Success Playbook Tests
 * 
 * Tests advanced customer success operations including journey optimization,
 * strategic account management, and performance monitoring.
 */
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestClient } from 'mcp-test-client';
import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';

import { executePlaybookTest } from '../shared/test-executor.js';
import { PlaybookTestResult, ValidationLevel } from '../shared/types.js';


suiteFn('🎯 Customer Journey & Advanced Operations', () => {
  let client: MCPTestClient;
  const testResults: PlaybookTestResult[] = [];
  let resolvedCompanyId: string | null = null;
  let seededCompanyName: string | null = null;

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
          { resource_type: 'companies', record_data: { name: seededCompanyName } },
          (toolResult: ToolResult) => {
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
      result.validationLevel === ValidationLevel.PARTIAL_SUCCESS);
      result.validationLevel === ValidationLevel.FULL_SUCCESS);

    console.log('\n📊 Customer Journey Suite Summary:');
    console.log(`   🟢 Full Success: ${fullSuccesses.length}/${testResults.length}`);
    console.log(`   🟡 Partial Success: ${partialSuccesses.length}/${testResults.length}`);
    console.log(`   🔴 Failures: ${failures.length}/${testResults.length}`);

    // Print validation breakdown
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<ValidationLevel, number>);

    console.log('\n🔍 Customer Journey Validation Breakdown:');
    Object.entries(validationBreakdown).forEach(([level, count]) => {
      console.log(`   ${emoji} ${level}: ${count}`);
    });

    // Export results for main orchestrator if needed
    (global as any).customerJourneyResults = testResults;
  }, 120000);

  describe('Relationship & Growth Opportunities', () => {
    it('should identify expansion opportunities through account review', async () => {

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

        client,
        prompt,
        expectedOutcome,
        'create-record',
        {
          resource_type: 'notes',
          record_data: {
            title: 'Strategic Account Plan - Q4 Business Review',
            content: 'Annual business review preparation and strategic planning for key customer account',
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

      // Seed a note with matching keywords to make content search deterministic
      if (resolvedCompanyId) {
        await client.assertToolCall(
          'create-record',
          {
            resource_type: 'notes',
            record_data: {
              title: 'Customer Feedback Survey – Seed',
              content: 'feedback satisfaction survey: seeded content for validation',
              parent_object: 'companies',
              parent_record_id: resolvedCompanyId,
            },
          },
          () => true
        );
      }

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

      // Relax window: use 365 days to accommodate sparse data
      daysAgo.setDate(daysAgo.getDate() - 365);
      
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

        client,
        prompt,
        expectedOutcome,
        'create-record',
        {
          resource_type: 'tasks',
          record_data: {
            title: '30-Day Customer Success Check-in',
            content: 'Initial value realization and satisfaction assessment for new customer',
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should identify and mitigate customer retention risks', async () => {

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
