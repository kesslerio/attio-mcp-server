/**
 * Sales Playbook Evaluation Test Suite
 *
 * This test validates that all the concrete examples in our sales-playbook.md
 * actually work with the MCP server. Any failures automatically create GitHub
 * issues for tracking and fixing.
 *
 * Purpose: Ensure our "realistic" playbooks are actually realistic and useful.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { execSync } from 'child_process';
import { MCPTestClient } from 'mcp-test-client';
import { writeFileSync } from 'fs';
import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';

interface PlaybookTestResult {
  success: boolean;
  prompt: string;
  expectedOutcome: string;
  actualResult?: ToolResult;
  error?: string;
  duration: number;
}

describe('Sales Playbook Validation Suite', () => {
  let client: MCPTestClient;
  const testResults: PlaybookTestResult[] = [];

  beforeAll(async () => {
    client = new MCPTestClient({
      serverCommand: 'node',
      serverArgs: ['./dist/index.js'],
    });
    await client.init();
  });

  afterAll(async () => {
    await client.cleanup();

    // Analyze failures and create reports
    if (failures.length > 0) {
      console.log(
        `\n📋 Analyzing ${failures.length} failed playbook examples...`
      );
      await createFailureAnalysisReport(failures);
      await createSingleGitHubIssue(failures);
    } else {
      console.log('\n✅ All sales playbook examples validated successfully!');
    }

    // Print test summary
    console.log(
      `\n📊 Test Summary: ${successCount}/${testResults.length} playbook examples passed`
    );
  });

  describe('🎯 Quick Start Examples', () => {
    it('should execute the main pipeline review prompt from playbook Quick Start', async () => {
        'Show me my current sales pipeline with all open opportunities. Include company name, deal value, current stage, last activity date, and next steps. Help me identify which deals need immediate attention and what actions I should prioritize today.';
        'A prioritized list of active deals with clear next actions';

        prompt,
        expectedOutcome,
        'search-records',
        {
          resource_type: 'deals',
          query: '',
          limit: 25,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });
  });

  describe('🌅 Daily Sales Activities', () => {
    it('should find deals with no recent activity (Deal Status Check)', async () => {

        prompt,
        expectedOutcome,
        'search-by-timeframe',
        {
          resource_type: 'deals',
          date_field: 'updated_at',
          relative_range: 'last_7_days',
          invert_range: true,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should find tasks scheduled for today (Action Items)', async () => {

        prompt,
        expectedOutcome,
        'search-by-timeframe',
        {
          resource_type: 'tasks',
          date_field: 'due_date',
          relative_range: 'today',
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should find new leads to contact (Prospect Outreach)', async () => {
        'Show me new leads added in the last 7 days that need first contact';

        prompt,
        expectedOutcome,
        'search-by-timeframe',
        {
          resource_type: 'companies',
          date_field: 'created_at',
          relative_range: 'last_7_days',
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });
  });

  describe('📈 Weekly Pipeline Management', () => {
    it('should analyze high-value deals (Pipeline Forecasting)', async () => {
        'Show me deals over $10,000 for revenue projection analysis';

        prompt,
        expectedOutcome,
        'advanced-search',
        {
          resource_type: 'deals',
          filters: {
            filters: [
              {
                attribute: { slug: 'value' },
                condition: 'greater_than',
                value: 10000,
              },
            ],
          },
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should find companies with multiple contacts (Account Development)', async () => {
        'Show me companies where we have 2+ contacts for relationship mapping';

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

  describe('🕵️ Market Research & Competitive Analysis', () => {
    it('should find competitive mentions in records (Competitive Tracking)', async () => {
        'Search through our notes and deal records for mentions of competitors';

        prompt,
        expectedOutcome,
        'search-records',
        {
          resource_type: 'deals',
          query: 'competitor',
          limit: 15,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should find lost deals for analysis (Lost Deal Analysis)', async () => {
        'Find deals marked as lost or closed-lost in the last 90 days';

        prompt,
        expectedOutcome,
        'advanced-search',
        {
          resource_type: 'deals',
          filters: {
            filters: [
              {
                attribute: { slug: 'status' },
                condition: 'equals',
                value: 'closed-lost',
              },
            ],
          },
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should analyze won deals by industry (Industry Performance)', async () => {

        prompt,
        expectedOutcome,
        'advanced-search',
        {
          resource_type: 'deals',
          filters: {
            filters: [
              {
                attribute: { slug: 'status' },
                condition: 'equals',
                value: 'closed-won',
              },
            ],
          },
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });
  });

  describe('🚀 Deal-Specific Workflows', () => {
    it('should identify stalled deals needing attention (Deal Recovery)', async () => {
        'Find deals with no activity in 2+ weeks that may be stalled';

        prompt,
        expectedOutcome,
        'search-by-timeframe',
        {
          resource_type: 'deals',
          date_field: 'updated_at',
          relative_range: 'last_14_days',
          invert_range: true,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should find prospects for re-engagement (Lead Nurturing)', async () => {

        prompt,
        expectedOutcome,
        'search-by-timeframe',
        {
          resource_type: 'people',
          date_field: 'updated_at',
          relative_range: 'last_30_days',
          invert_range: true,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });
  });

  // Helper Functions
  async function executePlaybookTest(
    prompt: string,
    expectedOutcome: string,
    toolName: string,
    toolParams: Record<string, unknown>
  ): Promise<PlaybookTestResult> {

    try {
      console.log(
        `\n🧪 Testing playbook prompt: "${prompt.substring(0, 80)}..."`
      );
      console.log(`🎯 Expected outcome: ${expectedOutcome}`);
      console.log(`🔧 Using tool: ${toolName}`);

      let result: ToolResult | null = null;

      await client.assertToolCall(
        toolName,
        toolParams,
        (toolResult: ToolResult) => {
          result = toolResult;

          console.log(`⏱️ Execution time: ${duration.toFixed(2)}ms`);

          if (toolResult.isError) {
            console.error('❌ Tool execution failed:', toolResult.content);
            return false;
          }

          console.log('✅ Tool executed successfully');
          if (toolResult.content && toolResult.content.length > 0) {
            if ('text' in content) {
              console.log(
                `📄 Result preview: ${content.text.substring(0, 200)}...`
              );
            }
          }

          return true;
        }
      );


      return {
        success: !result?.isError,
        prompt,
        expectedOutcome,
        actualResult: result || undefined,
        duration,
      };
    } catch (error) {

      console.error('❌ Test execution failed:', error);

      return {
        success: false,
        prompt,
        expectedOutcome,
        error: error instanceof Error ? error.message : String(error),
        duration,
      };
    }
  }

  async function createFailureAnalysisReport(failures: PlaybookTestResult[]) {

    let report = `# Sales Playbook Validation Failure Analysis

**Generated:** ${new Date().toISOString()}  
**Test Suite:** test/mcp/sales-playbook-eval.test.ts  
**Playbook:** docs/usage/playbooks/sales-playbook.md

## Summary

- **Total Tests:** ${failures.length + (testResults.length - failures.length)}
- **Failed Tests:** ${failures.length}
- **Success Rate:** ${(((testResults.length - failures.length) / testResults.length) * 100).toFixed(1)}%

## Failed Examples Analysis

`;

    failures.forEach((failure, index) => {
      report += `### ${index + 1}. ${failure.prompt.substring(0, 80)}...

**Expected Outcome:** ${failure.expectedOutcome}

**Error:** ${failure.error || 'Tool execution failed'}

**Execution Time:** ${failure.duration.toFixed(2)}ms

**Analysis:**
`;

      // Analyze the type of failure
      if (
        failure.error?.includes('not found') ||
        failure.error?.includes('404')
      ) {
        report += `- **Issue Type:** Missing API endpoint or data\n`;
        report += `- **Recommendation:** This feature may need to be implemented or the playbook example updated\n`;
      } else if (
        failure.error?.includes('400') ||
        failure.error?.includes('invalid')
      ) {
        report += `- **Issue Type:** Invalid request parameters\n`;
        report += `- **Recommendation:** Review tool parameters or add better validation\n`;
      } else if (
        failure.error?.includes('timeout') ||
        failure.duration > 5000
      ) {
        report += `- **Issue Type:** Performance problem\n`;
        report += `- **Recommendation:** Optimize query or add caching\n`;
      } else {
        report += `- **Issue Type:** Unknown failure\n`;
        report += `- **Recommendation:** Investigate error details\n`;
      }

      report += `\n---\n\n`;
    });

    report += `## Recommendations

### High Priority
- Review failed examples to determine if they represent missing features
- Update playbook examples that are genuinely unrealistic
- Fix any clear bugs in tool implementations

### Medium Priority  
- Add better error handling and validation
- Optimize slow-performing operations
- Consider adding new tools for common use cases

### Low Priority
- Improve error messages for better debugging
- Add performance monitoring for playbook validation
- Create automated alerts for regression failures
`;

    // Write the report file
    writeFileSync(reportPath, report);
    console.log(`📄 Created failure analysis report: ${reportPath}`);
  }

  async function createSingleGitHubIssue(failures: PlaybookTestResult[]) {


**Test Date:** ${timestamp}  
**Failed Examples:** ${failures.length}/${testResults.length}  
**Success Rate:** ${(((testResults.length - failures.length) / testResults.length) * 100).toFixed(1)}%

## Failed Examples Summary

${failures
  .map(
    (failure, index) => `### ${index + 1}. ${failure.prompt.substring(0, 60)}...
- **Expected:** ${failure.expectedOutcome}
- **Error:** ${failure.error || 'Tool execution failed'}  
- **Duration:** ${failure.duration.toFixed(2)}ms`
  )
  .join('\n\n')}

## Analysis

The sales playbook contains examples that our MCP server cannot currently execute. This indicates a gap between what we promise users and what we can deliver.

**Root Causes:**
- Missing tool functionality for complex queries
- Performance issues with certain operations  
- Invalid parameters or data structure mismatches

## Next Steps

1. [ ] Review detailed failure analysis report in \`/tmp/\`
2. [ ] Determine which failures indicate missing features vs bugs
3. [ ] Update playbook examples that are genuinely unrealistic
4. [ ] Implement missing functionality where feasible
5. [ ] Re-run validation tests after fixes

## Files Involved

- **Test Suite:** \`test/mcp/sales-playbook-eval.test.ts\`
- **Playbook:** \`docs/usage/playbooks/sales-playbook.md\`  
- **Analysis Report:** Check \`/tmp/sales-playbook-failures-*.md\`

**Priority:** High - This affects user trust and playbook utility`;

    try {
      execSync(
        `gh issue create --title "${title}" --body "${body}" --label "playbook-validation,sales,testing" --repo kesslerio/attio-mcp-server`,
        {
          stdio: 'pipe',
        }
      );
      console.log(
        `✅ Created consolidated GitHub issue for sales playbook validation failures`
      );
    } catch (error) {
      console.error(`❌ Failed to create GitHub issue:`, error);
    }
  }
});
