/**
 * Quick Start Examples - Customer Success Playbook Tests
 * 
 * Tests the foundational quick start examples that demonstrate
 * basic customer success operations.
 */
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestClient } from 'mcp-test-client';
import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';

import { executePlaybookTest } from '../shared/test-executor.js';
import { PlaybookTestResult, ValidationLevel } from '../shared/types.js';



suiteFn('🎯 Customer Success Quick Start Examples', () => {
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
        // Create demo company and parse ID from the returned text
        seededCompanyName = `Demo CS Co ${new Date().toISOString().replace(/[:.]/g, '-')}`;
        await client.assertToolCall(
          'create-record',
          {
            resource_type: 'companies',
            record_data: { name: seededCompanyName },
          },
          (toolResult: ToolResult) => {
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

    console.log('\n📊 Quick Start Suite Summary:');
    console.log(`   🟢 Full Success: ${fullSuccesses.length}/${testResults.length}`);
    console.log(`   🟡 Partial Success: ${partialSuccesses.length}/${testResults.length}`);
    console.log(`   🔴 Failures: ${failures.length}/${testResults.length}`);

    // Print validation breakdown
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<ValidationLevel, number>);

    console.log('\n🔍 Quick Start Validation Breakdown:');
    Object.entries(validationBreakdown).forEach(([level, count]) => {
      console.log(`   ${emoji} ${level}: ${count}`);
    });

    // Export results for main orchestrator if needed
    (global as any).quickStartResults = testResults;
  }, 120000);

  describe('Customer Portfolio Overview', () => {
    it('should execute the main customer review prompt from playbook Quick Start', async () => {
        'Show me all customers (companies with closed deals) and their basic information. Include company name, total deal value, last contact date, and any open tasks or notes from the last 30 days. Help me identify which accounts haven\'t been contacted recently and might need attention.';
        'A customer portfolio overview with recent activity and attention priorities';

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

      // Calculate date 30 days ago
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
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

        client,
        prompt,
        expectedOutcome,
        'create-record',
        {
          resource_type: 'tasks',
          record_data: {
            title: 'Customer Health Check - Weekly Review',
            content: 'Conduct customer satisfaction survey and account health assessment',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });
  });

  describe('Weekly Strategic Operations', () => {
    it('should organize customer accounts by strategic importance (account segmentation)', async () => {

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
