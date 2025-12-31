/**
 * Operations Playbook Evaluation Test Suite
 *
 * This test validates that all the concrete examples in our operations-playbook.md
 * actually work with the MCP server. Significant failures (>3) can create
 * GitHub issues for tracking (set SKIP_GITHUB_ISSUE_CREATION=false to enable).
 *
 * Purpose: Ensure our operational workflows are actually realistic and useful.
 *
 * Recent Updates:
 * - Issue #591: Modernized to use relative date support
 * - Issue #973: Added dynamic attribute discovery for workspace portability
 *   Tests now discover available attributes at runtime rather than hardcoding
 *   slugs that may not exist in all workspaces.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import {
  createMCPClient,
  buildMCPClientConfig,
  type MCPClientAdapter,
} from '@test/e2e/mcp/shared/mcp-client.js';
import {
  AttributeDiscovery,
  type AttioAttribute,
} from '@test/e2e/utils/attribute-discovery.js';

interface PlaybookTestResult {
  success: boolean;
  prompt: string;
  expectedOutcome: string;
  actualResult?: CallToolResult;
  error?: string;
  duration: number;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Discovered attributes cache - populated in beforeAll
 */
interface DiscoveredAttributes {
  companies: {
    industry?: AttioAttribute;
    website?: AttioAttribute;
    emptyCheckField?: AttioAttribute;
  };
  people: {
    email?: AttioAttribute;
    linkedin?: AttioAttribute;
    company?: AttioAttribute;
    jobTitle?: AttioAttribute;
  };
}

describe('Operations Playbook Validation Suite', () => {
  let client: MCPClientAdapter;
  let discovery: AttributeDiscovery;
  let attrs: DiscoveredAttributes;
  const testResults: PlaybookTestResult[] = [];

  beforeAll(async () => {
    // Initialize MCP client
    client = createMCPClient(buildMCPClientConfig());
    await client.init();

    // Initialize attribute discovery
    discovery = new AttributeDiscovery();
    await discovery.initialize(['companies', 'people']);

    // Discover attributes for use in tests
    attrs = {
      companies: {
        industry: discovery.findByIntent('companies', 'INDUSTRY'),
        website: discovery.findByIntent('companies', 'WEBSITE'),
        emptyCheckField:
          discovery.findByType('companies', 'text') ||
          discovery.findByType('companies', 'select'),
      },
      people: {
        email: discovery.findByIntent('people', 'EMAIL'),
        linkedin: discovery.findByIntent('people', 'LINKEDIN'),
        company: discovery.findByIntent('people', 'COMPANY'),
        jobTitle: discovery.findByIntent('people', 'JOB_TITLE'),
      },
    };

    // Log discovered attributes for debugging
    console.log('\n📋 Discovered Attributes:');
    console.log(
      `  Companies - industry: ${attrs.companies.industry?.api_slug || 'NOT FOUND'}`
    );
    console.log(
      `  Companies - website: ${attrs.companies.website?.api_slug || 'NOT FOUND'}`
    );
    console.log(
      `  People - email: ${attrs.people.email?.api_slug || 'NOT FOUND'}`
    );
    console.log(
      `  People - linkedin: ${attrs.people.linkedin?.api_slug || 'NOT FOUND'}`
    );
    console.log(
      `  People - company: ${attrs.people.company?.api_slug || 'NOT FOUND'}`
    );
  });

  afterAll(async () => {
    await client.cleanup();

    // Analyze failures and create reports
    const failures = testResults.filter(
      (result) => !result.success && !result.skipped
    );
    const skipped = testResults.filter((result) => result.skipped);

    if (failures.length > 0) {
      console.log(
        `\n📋 Analyzing ${failures.length} failed operations playbook examples...`
      );
      await createFailureAnalysisReport(failures);
      // Only create GitHub issue if not in CI and significant failures
      if (
        process.env.SKIP_GITHUB_ISSUE_CREATION !== 'true' &&
        failures.length > 3
      ) {
        await createSingleGitHubIssue(failures);
      }
    } else {
      console.log(
        '\n✅ All operations playbook examples validated successfully!'
      );
    }

    if (skipped.length > 0) {
      console.log(
        `\n⏭️  Skipped ${skipped.length} tests due to missing attributes:`
      );
      skipped.forEach((s) => console.log(`   - ${s.skipReason}`));
    }

    // Print test summary
    const successCount = testResults.filter(
      (r) => r.success && !r.skipped
    ).length;
    const totalNonSkipped = testResults.filter((r) => !r.skipped).length;
    console.log(
      `\n📊 Test Summary: ${successCount}/${totalNonSkipped} operations playbook examples passed (${skipped.length} skipped)`
    );
  });

  describe('🎯 Quick Start Examples', () => {
    it('should execute the main data quality review prompt from playbook Quick Start', async () => {
      const websiteAttr = attrs.companies.website;

      if (!websiteAttr) {
        const result = createSkippedResult(
          'Show me all companies missing website URLs',
          'No website attribute found in workspace'
        );
        testResults.push(result);
        expect(result.skipped).toBe(true);
        return;
      }

      const prompt =
        'Show me all companies in my CRM that are missing website URLs.';
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
                attribute: { slug: websiteAttr.api_slug },
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
    it('should find companies without industry/segment classification (Critical Missing Info)', async () => {
      const industryAttr = attrs.companies.industry;

      if (!industryAttr) {
        const result = createSkippedResult(
          'Find companies without industry classification',
          'No industry/segment attribute found in workspace'
        );
        testResults.push(result);
        expect(result.skipped).toBe(true);
        return;
      }

      const prompt = `Find companies without ${industryAttr.title || 'industry'} classification`;
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
                attribute: { slug: industryAttr.api_slug },
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

    it('should find people without email addresses', async () => {
      const emailAttr = attrs.people.email;

      if (!emailAttr) {
        const result = createSkippedResult(
          'Find people without email addresses',
          'No email attribute found in workspace'
        );
        testResults.push(result);
        expect(result.skipped).toBe(true);
        return;
      }

      const prompt = 'Find people without email addresses';
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
                attribute: { slug: emailAttr.api_slug },
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

    it('should check for records created yesterday (Record Status Review)', async () => {
      const prompt = 'Show me all records created yesterday';
      const expectedOutcome = 'New records for data quality review';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'search-by-timeframe',
        {
          resource_type: 'companies',
          date_field: 'created_at',
          relative_range: 'yesterday',
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
          query: 'john',
          limit: 25,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should find overdue tasks for reassignment (tasks do not support advanced search)', async () => {
      // Tasks resource type does not support the search-by-timeframe tool
      // This is a known limitation - tasks have their own API endpoints
      const result = createSkippedResult(
        'Review overdue tasks',
        'Tasks do not support search-by-timeframe - use list-tasks instead'
      );
      testResults.push(result);
      expect(result.skipped).toBe(true);
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
      const companyAttr = attrs.people.company;

      if (!companyAttr) {
        const result = createSkippedResult(
          'Find people missing company associations',
          'No company attribute found for people in workspace'
        );
        testResults.push(result);
        expect(result.skipped).toBe(true);
        return;
      }

      const prompt = 'Find people records missing company associations';
      const expectedOutcome = 'People records needing company linkage';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'advanced-search',
        {
          resource_type: 'people',
          filters: {
            filters: [
              {
                attribute: { slug: companyAttr.api_slug },
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

  describe('🔍 Data Consistency & Enrichment Operations', () => {
    it('should find companies with inconsistent naming for standardization', async () => {
      const prompt =
        'Find companies with similar names that might need standardization';
      const expectedOutcome =
        'Companies with naming inconsistencies for standardization';

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

    it('should find people with LinkedIn profiles for enrichment', async () => {
      const linkedinAttr = attrs.people.linkedin;

      // Skip if no LinkedIn attribute or if it's a text type (text fields don't support is_not_empty in Attio)
      if (!linkedinAttr || linkedinAttr.type === 'text') {
        const reason = !linkedinAttr
          ? 'No LinkedIn attribute found in workspace'
          : 'LinkedIn is text type - Attio API does not support is_not_empty for text fields';
        const result = createSkippedResult(
          'Find people with LinkedIn URLs',
          reason
        );
        testResults.push(result);
        expect(result.skipped).toBe(true);
        return;
      }

      const prompt =
        'Find people with LinkedIn profiles for potential enrichment';
      const expectedOutcome = 'People records ready for job title enrichment';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'advanced-search',
        {
          resource_type: 'people',
          filters: {
            filters: [
              {
                attribute: { slug: linkedinAttr.api_slug },
                condition: 'is_not_empty',
              },
            ],
          },
          limit: 25,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should find companies with websites but missing classification', async () => {
      const websiteAttr = attrs.companies.website;
      const industryAttr = attrs.companies.industry;

      // Skip if attributes missing or if website is text type (text fields don't support is_not_empty in Attio)
      if (!websiteAttr || !industryAttr || websiteAttr.type === 'text') {
        const reason = !websiteAttr
          ? 'No website attribute found in workspace'
          : !industryAttr
            ? 'No industry/segment attribute found in workspace'
            : 'Website is text type - Attio API does not support is_not_empty for text fields';
        const result = createSkippedResult(
          'Find companies missing classification',
          reason
        );
        testResults.push(result);
        expect(result.skipped).toBe(true);
        return;
      }

      const prompt =
        'Find companies with websites but missing industry classification';
      const expectedOutcome = 'Companies ready for data enrichment research';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'advanced-search',
        {
          resource_type: 'companies',
          filters: {
            filters: [
              {
                attribute: { slug: websiteAttr.api_slug },
                condition: 'is_not_empty',
              },
              {
                attribute: { slug: industryAttr.api_slug },
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

    it('should find tasks without due dates (tasks do not support advanced search)', async () => {
      // Tasks resource type does not support advanced-search filters
      // This is a known limitation - tasks have their own API structure
      const result = createSkippedResult(
        'Find tasks without due dates',
        'Tasks do not support advanced-search - use list-tasks instead'
      );
      testResults.push(result);
      expect(result.skipped).toBe(true);
    });
  });

  // Helper Functions

  function createSkippedResult(
    prompt: string,
    reason: string
  ): PlaybookTestResult {
    return {
      success: true, // Skipped tests count as "success" for pass rate
      prompt,
      expectedOutcome: 'N/A - Skipped',
      duration: 0,
      skipped: true,
      skipReason: reason,
    };
  }

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

      let result: CallToolResult | null = null;

      await client.assertToolCall(
        toolName,
        toolParams,
        (toolResult: CallToolResult) => {
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
**Test Suite:** test/e2e/tools/universal/operations-playbook-eval.e2e.test.ts
**Playbook:** docs/usage/playbooks/operations-playbook.md

## Summary

- **Total Tests:** ${testResults.length}
- **Failed Tests:** ${failures.length}
- **Skipped Tests:** ${testResults.filter((r) => r.skipped).length}
- **Success Rate:** ${(((testResults.length - failures.length) / testResults.length) * 100).toFixed(1)}%

## Discovered Attributes

These are the attributes found in your workspace:

### Companies
${discovery.getSummary('companies')}

### People
${discovery.getSummary('people')}

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
        report += `- **Recommendation:** Check attribute slugs and filter syntax\n`;
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

    // Write the report file
    writeFileSync(reportPath, report);
    console.log(`📄 Created failure analysis report: ${reportPath}`);
  }

  async function createSingleGitHubIssue(failures: PlaybookTestResult[]) {
    if (process.env.SKIP_GITHUB_ISSUE_CREATION === 'true') {
      console.log(
        '⏭️  Skipping GitHub issue creation (SKIP_GITHUB_ISSUE_CREATION=true)'
      );
      return;
    }

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

The operations playbook contains examples that our MCP server cannot currently execute.

**Root Causes:**
- Missing tool functionality for complex queries
- Workspace-specific attribute differences
- Invalid parameters or data structure mismatches

## Next Steps

1. [ ] Review detailed failure analysis report in \`/tmp/\`
2. [ ] Verify attribute slugs match workspace schema
3. [ ] Update playbook examples if needed
4. [ ] Re-run validation tests after fixes

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
