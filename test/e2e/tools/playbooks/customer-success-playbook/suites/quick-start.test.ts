/**
 * Quick Start Examples - Customer Success Playbook Tests
 *
 * Tests the foundational quick start examples that demonstrate
 * basic customer success operations.
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

suiteFn('🎯 Customer Success Quick Start Examples', () => {
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
        // Create demo company and parse ID from the returned text
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

      // Fallback discovery if not seeded or parse failed
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

    console.log('\n📊 Quick Start Suite Summary:');
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

    console.log('\n🔍 Quick Start Validation Breakdown:');
    Object.entries(validationBreakdown).forEach(([level, count]) => {
      const emoji = getValidationLevelEmoji(level as ValidationLevel);
      console.log(`   ${emoji} ${level}: ${count}`);
    });

    // Export results for main orchestrator if needed
    (global as any).quickStartResults = testResults;
  }, 120000);

  describe('Customer Portfolio Overview', () => {
    it('should execute the main customer review prompt from playbook Quick Start', async () => {
      const prompt =
        "Show me all customers (companies with closed deals) and their basic information. Include company name, total deal value, last contact date, and any open tasks or notes from the last 30 days. Help me identify which accounts haven't been contacted recently and might need attention.";
      const expectedOutcome =
        'A customer portfolio overview with recent activity and attention priorities';

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'search-records',
        {
          resource_type: 'companies',
          query: '',
          limit: 25,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });
  });

  describe('Daily Customer Management Routines', () => {
    it('should find active customer accounts for morning portfolio review', async () => {
      const prompt = 'List all active customer accounts for daily review';
      const expectedOutcome = 'Complete list of active customer accounts';

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'search-records',
        {
          resource_type: 'companies',
          query: '',
          limit: 50,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should find accounts with no recent contact (attention-needed alerts)', async () => {
      const prompt = 'Find accounts with no contact in the last 30 days';
      const expectedOutcome = 'List of accounts needing immediate attention';

      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'search-by-timeframe',
        {
          resource_type: 'companies',
          timeframe_type: 'modified',
          end_date: startDate, // Companies NOT updated since 30 days ago (invert logic)
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should create follow-up tasks for customer outreach planning', async () => {
      const prompt =
        'Create tasks for customer health checks and satisfaction surveys';
      const expectedOutcome = 'Successfully created customer outreach tasks';

      const result = await executePlaybookTest(
        client,
        prompt,
        expectedOutcome,
        'create-record',
        {
          resource_type: 'tasks',
          record_data: {
            title: 'Customer Health Check - Weekly Review',
            content:
              'Conduct customer satisfaction survey and account health assessment',
            due_date: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
          },
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });
  });

  describe('Weekly Strategic Operations', () => {
    it('should organize customer accounts by strategic importance (account segmentation)', async () => {
      const prompt =
        'Organize customer accounts by strategic importance and value';
      const expectedOutcome = 'Segmented customer accounts by importance tiers';

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
  });
});
