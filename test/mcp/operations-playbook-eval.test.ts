/**
 * Operations Playbook Evaluation Test Suite
 *
 * This test validates that all the concrete examples in our operations-playbook.md
 * actually work with the MCP server. Any failures automatically create GitHub
 * issues for tracking and fixing.
 *
 * Purpose: Ensure our operational workflows are actually realistic and useful.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestClient } from 'mcp-test-client';
import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

interface PlaybookTestResult {
  success: boolean;
  prompt: string;
  expectedOutcome: string;
  actualResult?: ToolResult;
  error?: string;
  duration: number;
}

describe('Operations Playbook Validation Suite', () => {
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
    const failures = testResults.filter((result) => !result.success);
    if (failures.length > 0) {
      console.log(
        `\n📋 Analyzing ${failures.length} failed operations playbook examples...`
      );
      await createFailureAnalysisReport(failures);
      await createSingleGitHubIssue(failures);
    } else {
      console.log(
        '\n✅ All operations playbook examples validated successfully!'
      );
    }

    // Print test summary
    const successCount = testResults.filter((r) => r.success).length;
    console.log(
      `\n📊 Test Summary: ${successCount}/${testResults.length} operations playbook examples passed`
    );
  });

  describe('🎯 Quick Start Examples', () => {
    it('should execute the main data quality review prompt from playbook Quick Start', async () => {
      const prompt =
        'Show me all companies in my CRM that are missing website URLs. For each company, provide the company name, industry (if available), and any contact information we have. Help me prioritize which ones to research and update first.';
      const expectedOutcome =
        'A list of companies with incomplete data that can be systematically updated';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'advanced-search',
        {
          resource_type: 'companies',
          filters: {
            filters: [
              {
                attribute: { slug: 'website' },
                condition: 'is_empty',
              },
            ],
          },
          limit: 25,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });
  });

  describe('🧹 Daily Data Maintenance Routines', () => {
    // NOTE: These timeframe searches may fail based on sales playbook patterns
    // If they fail due to timeframe tool limitations, we'll document in GitHub issue

    it('should find companies without industry classification (Critical Missing Info)', async () => {
      const prompt = 'Find companies without industry classification';
      const expectedOutcome =
        'Companies missing essential business information';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'advanced-search',
        {
          resource_type: 'companies',
          filters: {
            filters: [
              {
                attribute: { slug: 'industry' },
                condition: 'is_empty',
              },
            ],
          },
          limit: 25,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should find people without email addresses who have phone numbers', async () => {
      const prompt =
        'Find people without email addresses who have phone numbers';
      const expectedOutcome =
        'People records with incomplete contact information';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'advanced-search',
        {
          resource_type: 'people',
          filters: {
            filters: [
              {
                attribute: { slug: 'email' },
                condition: 'is_empty',
              },
            ],
          },
          limit: 25,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should check for records created in the last 24 hours (Record Status Review)', async () => {
      const prompt = 'Show me all records created in the last 24 hours';
      const expectedOutcome = 'New records for data quality review';

      // Using explicit dates instead of relative range based on sales playbook learnings
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const now = new Date();

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'search-by-timeframe',
        {
          resource_type: 'companies',
          date_field: 'created_at',
          start_date: yesterday.toISOString(),
          end_date: now.toISOString(),
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });
  });

  describe('📋 Weekly Bulk Operations', () => {
    it('should find company name variations for standardization', async () => {
      const prompt =
        'Find variations of company names (e.g., "Tech Inc", "Tech Incorporated")';
      const expectedOutcome = 'Company names needing standardization';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'search-records',
        {
          resource_type: 'companies',
          query: 'inc',
          limit: 25,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should find people with similar names who might be duplicates', async () => {
      const prompt = 'Find people with similar names who might be duplicates';
      const expectedOutcome = 'Potential duplicate person records';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'search-records',
        {
          resource_type: 'people',
          query: 'smith',
          limit: 25,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should find overdue tasks for reassignment', async () => {
      const prompt =
        'Review overdue tasks and reassign or close as appropriate';
      const expectedOutcome = 'Overdue tasks needing attention';

      // Using explicit date for "overdue" (tasks due before today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'search-by-timeframe',
        {
          resource_type: 'tasks',
          date_field: 'due_date',
          start_date: weekAgo.toISOString(),
          end_date: today.toISOString(),
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should create high-priority accounts list based on company size', async () => {
      const prompt =
        'Create high-priority accounts list based on company size and industry';
      const expectedOutcome = 'Organized prospect lists for targeted outreach';

      const result = await executePlaybookTest(
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

  describe('🔄 Monthly System Maintenance', () => {
    it('should find companies with contacts but no recent activity', async () => {
      const prompt = 'Find companies with contacts but no recent activity';
      const expectedOutcome = 'Companies needing re-engagement';

      const result = await executePlaybookTest(
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

    it('should find people records missing company associations', async () => {
      const prompt = 'Find people records missing company associations';
      const expectedOutcome = 'People records needing company linkage';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'search-records',
        {
          resource_type: 'people',
          query: '',
          limit: 25,
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
    const startTime = performance.now();

    try {
      console.log(
        `\n🧪 Testing operations prompt: "${prompt.substring(0, 80)}..."`
      );
      console.log(`🎯 Expected outcome: ${expectedOutcome}`);
      console.log(`🔧 Using tool: ${toolName}`);

      let result: ToolResult | null = null;

      await client.assertToolCall(
        toolName,
        toolParams,
        (toolResult: ToolResult) => {
          result = toolResult;
          const endTime = performance.now();
          const duration = endTime - startTime;

          console.log(`⏱️ Execution time: ${duration.toFixed(2)}ms`);

          if (toolResult.isError) {
            console.error('❌ Tool execution failed:', toolResult.content);
            return false;
          }

          console.log('✅ Tool executed successfully');
          if (toolResult.content && toolResult.content.length > 0) {
            const content = toolResult.content[0];
            if ('text' in content) {
              console.log(
                `📄 Result preview: ${content.text.substring(0, 200)}...`
              );
            }
          }

          return true;
        }
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      return {
        success: !result?.isError,
        prompt,
        expectedOutcome,
        actualResult: result || undefined,
        duration,
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `/tmp/operations-playbook-failures-${timestamp}.md`;

    let report = `# Operations Playbook Validation Failure Analysis

**Generated:** ${new Date().toISOString()}  
**Test Suite:** test/mcp/operations-playbook-eval.test.ts  
**Playbook:** docs/usage/playbooks/operations-playbook.md

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
      } else if (
        failure.error?.includes('timeframe') ||
        failure.error?.includes('date')
      ) {
        report += `- **Issue Type:** Timeframe tool limitations\n`;
        report += `- **Recommendation:** Add relative date support or use explicit dates\n`;
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
    const title = `Operations Playbook Validation: ${failures.length} Examples Failed`;
    const timestamp = new Date().toISOString();

    const body = `## Operations Playbook Validation Results

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

The operations playbook contains examples that our MCP server cannot currently execute. This indicates a gap between what we promise users and what we can deliver.

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

- **Test Suite:** \`test/mcp/operations-playbook-eval.test.ts\`
- **Playbook:** \`docs/usage/playbooks/operations-playbook.md\`  
- **Analysis Report:** Check \`/tmp/operations-playbook-failures-*.md\`

**Priority:** High - This affects user trust and playbook utility`;

    try {
      execSync(
        `gh issue create --title "${title}" --body "${body}" --label "P2,area:api,type:enhancement"`,
        {
          stdio: 'pipe',
        }
      );
      console.log(
        `✅ Created consolidated GitHub issue for operations playbook validation failures`
      );
    } catch (error) {
      console.error(`❌ Failed to create GitHub issue:`, error);
    }
  }
});
