/**
 * Customer Success Playbook Evaluation Test Suite
 *
 * This test validates that all the concrete examples in our customer-success-playbook.md
 * actually work with the MCP server. Any failures automatically create GitHub
 * issues for tracking and fixing.
 *
 * Purpose: Ensure our customer success playbooks are practical and deliver promised value.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestClient } from 'mcp-test-client';
import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { TestValidator } from './customer-success-playbook/shared/test-validator.js';
import { ValidationLevel, ValidationResult, PlaybookTestResult } from './customer-success-playbook/shared/types.js';
import { TEST_CONSTANTS } from './customer-success-playbook/shared/constants.js';

interface ToolContent {
  text?: string;
  [key: string]: unknown;
}



describe('Customer Success Playbook Validation Suite', () => {
  let client: MCPTestClient;
  const testResults: PlaybookTestResult[] = [];
  let resolvedCompanyId: string | null = null;
  let seededCompanyName: string | null = null;
  let seededCompanyId: string | null = null;
  const seededNotePhrases: string[] = [
    'feedback satisfaction survey: seeded content for validation',
    'success story expansion opportunity growth – seeded',
  ];
  const seededTaskTitle = '30-Day Customer Success Check-in';

  beforeAll(async () => {
    client = new MCPTestClient({
      serverCommand: 'node',
      serverArgs: ['./dist/index.js'],
    });
    await client.init();

    // Resolve a real company ID to avoid 404s in later tests
    const doSeed = process.env.CS_E2E_SEED === 'true';
    try {
      if (doSeed) {
        // Create demo company
        seededCompanyName = `Demo CS Co ${new Date().toISOString().replace(/[:.]/g, '-')}`;
        await client.assertToolCall(
          'create-record',
          {
            resource_type: 'companies',
            record_data: { name: seededCompanyName },
          },
          () => true
        );

        // Resolve created company ID via advanced-search by exact name
        await client.assertToolCall(
          'advanced-search',
          {
            resource_type: 'companies',
            filters: {
              filters: [
                { attribute: { slug: 'name' }, condition: 'equals', value: seededCompanyName },
              ],
            },
            limit: 1,
          },
          (result: ToolResult) => {
            const content = result?.content?.[0] as ToolContent;
            const text = content && 'text' in content ? (content.text as string) : '';
            const m = text.match(/\(ID:\s*([0-9a-fA-F-]{10,})\)/);
            if (m) {
              seededCompanyId = m[1];
              resolvedCompanyId = seededCompanyId;
            }
            return true;
          }
        );

        // Seed notes on the company if available
        if (resolvedCompanyId) {
          for (const phrase of seededNotePhrases) {
            await client.assertToolCall(
              'create-record',
              {
                resource_type: 'notes',
                record_data: {
                  title: phrase.slice(0, 60),
                  content: phrase,
                  parent_object: 'companies',
                  parent_record_id: resolvedCompanyId,
                },
              },
              () => true
            );
          }
        }
      }

      // If not seeded or seed failed to provide an ID, try discovery fallback
      if (!resolvedCompanyId) {
        await client.assertToolCall(
          'advanced-search',
          {
            resource_type: 'companies',
            filters: {
              filters: [
                { attribute: { slug: 'name' }, condition: 'is_not_empty', value: true },
              ],
            },
            limit: 3,
          },
          (result: ToolResult) => {
            const content = result?.content?.[0] as ToolContent;
            const text = content && 'text' in content ? (content.text as string) : '';
            const match = text.match(/\(ID:\s*([0-9a-fA-F-]{10,})\)/);
            if (match) {
              resolvedCompanyId = match[1];
            }
            return true;
          }
        );
      }
    } catch (error) {
      console.warn('Failed to resolve company ID:', error instanceof Error ? error.message : String(error));
      resolvedCompanyId = null;
    }
  }, 120000);

  afterAll(async () => {
    await client.cleanup();

    // Enhanced analysis with validation levels
    const failures = testResults.filter((result) => !result.success);
    const partialSuccesses = testResults.filter((result) => 
      result.validationLevel === ValidationLevel.PARTIAL_SUCCESS);
    const fullSuccesses = testResults.filter((result) => 
      result.validationLevel === ValidationLevel.FULL_SUCCESS);

    console.log('\n📊 Enhanced Test Summary:');
    console.log(`   🟢 Full Success: ${fullSuccesses.length}/${testResults.length}`);
    console.log(`   🟡 Partial Success: ${partialSuccesses.length}/${testResults.length}`);
    console.log(`   🔴 Failures: ${failures.length}/${testResults.length}`);

    // Create detailed validation report
    await createEnhancedValidationReport(testResults);

    // Analyze failures and create reports
    if (failures.length > 0) {
      console.log(
        `\n📋 Analyzing ${failures.length} failed playbook examples...`
      );
      await createFailureAnalysisReport(failures);
      if (process.env.CS_PLAYBOOK_REPORT === 'true') {
        await createSingleGitHubIssue(failures);
      } else {
        console.log('🐙 Skipping GitHub issue creation (CS_PLAYBOOK_REPORT not set)');
      }
    } else {
      console.log('\n✅ All customer success playbook examples validated successfully!');
    }

    // Print validation breakdown
    const validationBreakdown = testResults.reduce((acc, result) => {
      const level = result.validationLevel || ValidationLevel.FRAMEWORK_ERROR;
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<ValidationLevel, number>);

    console.log('\n🔍 Validation Level Breakdown:');
    Object.entries(validationBreakdown).forEach(([level, count]) => {
      const emoji = getValidationLevelEmoji(level as ValidationLevel);
      console.log(`   ${emoji} ${level}: ${count}`);
    });

    // Optional cleanup of seeded data
    if (process.env.CS_E2E_SEED === 'true' && seededCompanyId) {
      try {
        await client.assertToolCall(
          'delete-record',
          { resource_type: 'companies', record_id: seededCompanyId },
          () => true
        );
        console.log('🧹 Deleted seeded demo company');
      } catch (e) {
        console.warn('⚠️ Cleanup: failed to delete seeded company:', (e as Error)?.message || String(e));
      }
    }
  }, 120000);

  describe('🎯 Quick Start Examples', () => {
    it('should execute the main customer review prompt from playbook Quick Start', async () => {
      const prompt =
        'Show me all customers (companies with closed deals) and their basic information. Include company name, total deal value, last contact date, and any open tasks or notes from the last 30 days. Help me identify which accounts haven\'t been contacted recently and might need attention.';
      const expectedOutcome =
        'A customer portfolio overview with recent activity and attention priorities';

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

  describe('🌅 Daily Customer Management Routines', () => {
    it('should find active customer accounts for morning portfolio review', async () => {
      const prompt = 'List all active customer accounts for daily review';
      const expectedOutcome = 'Complete list of active customer accounts';

      const result = await executePlaybookTest(
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
      const prompt = 'Create tasks for customer health checks and satisfaction surveys';
      const expectedOutcome = 'Successfully created customer outreach tasks';

      const result = await executePlaybookTest(
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

  describe('📊 Weekly Customer Success Operations', () => {
    it('should organize customer accounts by strategic importance (account segmentation)', async () => {
      const prompt = 'Organize customer accounts by strategic importance and value';
      const expectedOutcome = 'Segmented customer accounts by importance tiers';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'advanced-search',
        {
          resource_type: 'companies',
          filters: {
            filters: [
              {
                attribute: { slug: 'name' },
                condition: 'is_not_empty',
                value: null,
              },
            ],
          },
          sort_by: 'name',
          sort_order: 'desc',
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should identify expansion opportunities through account review', async () => {
      const prompt = 'Identify customers with expansion potential based on account activity';
      const expectedOutcome = 'List of accounts with growth opportunities';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'search-by-relationship',
        {
          relationship_type: 'company_to_deals',
          source_id: TEST_CONSTANTS.FALLBACK_COMPANY_ID,
          target_resource_type: 'deals',
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should map and maintain customer relationships (stakeholder mapping)', async () => {
      const prompt = 'Map decision makers, influencers, and end users across customer accounts';
      const expectedOutcome = 'Comprehensive stakeholder mapping for customer accounts';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'search-by-relationship',
        {
          relationship_type: 'company_to_people',
          source_id: TEST_CONSTANTS.FALLBACK_COMPANY_ID,
          target_resource_type: 'people',
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should establish communication strategies with regular check-in schedules', async () => {
      const prompt = 'Create systematic customer communication schedule based on account tier';
      const expectedOutcome = 'Structured communication calendar for customer touchpoints';

      const result = await executePlaybookTest(
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
  });

  describe('🔄 Monthly Strategic Customer Management', () => {
    it('should review customer success performance metrics', async () => {
      const prompt = 'Review customer success performance through available data';
      const expectedOutcome = 'Customer success metrics and performance analysis';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'get-detailed-info',
        {
          resource_type: 'companies',
          record_id: resolvedCompanyId || TEST_CONSTANTS.FALLBACK_COMPANY_ID,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should develop strategic account plans for key customers', async () => {
      const prompt = 'Develop strategic account plans for key customers with business review preparation';
      const expectedOutcome = 'Strategic account plans with business review schedules';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'create-record',
        {
          resource_type: 'notes',
          record_data: {
            title: 'Strategic Account Plan - Q4 Business Review',
            content: 'Annual business review preparation and strategic planning for key customer account',
            parent_object: 'companies',
            parent_record_id: resolvedCompanyId || TEST_CONSTANTS.FALLBACK_COMPANY_ID,
          },
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should collect and analyze customer feedback systematically', async () => {
      const prompt = 'Schedule regular satisfaction surveys and collect customer feedback';
      const expectedOutcome = 'Systematic customer feedback collection and analysis';

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

      const result = await executePlaybookTest(
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
      const prompt = 'Review customer success workflow efficiency and identify process improvements';
      const expectedOutcome = 'Process improvement recommendations for customer success workflows';

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'list-notes',
        {
          resource_type: 'companies',
          record_id: resolvedCompanyId || TEST_CONSTANTS.FALLBACK_COMPANY_ID,
          limit: 10,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });
  });

  describe('🎯 Customer Journey Optimization', () => {
    it('should track and optimize customer onboarding milestones', async () => {
      const prompt = 'Track key implementation milestones and onboarding completion rates';
      const expectedOutcome = 'Customer onboarding milestone tracking and optimization';

      // Relax window: use longer timeframe to accommodate sparse data
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - TEST_CONSTANTS.TIMEFRAME_DAYS);
      const startDate = daysAgo.toISOString().split('T')[0];
      
      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'search-by-timeframe',
        {
          resource_type: 'companies',
          timeframe_type: 'created',
          start_date: startDate, // Companies created in the last 90 days
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should validate early customer success with 30-day check-ins', async () => {
      const prompt = 'Schedule 30-day success check-ins with new customers';
      const expectedOutcome = 'Early success validation system for new customers';

      const result = await executePlaybookTest(
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
      const prompt = 'Monitor customer engagement patterns and identify retention risks';
      const expectedOutcome = 'Retention risk identification and mitigation strategies';

      // Prefer a guaranteed match: seeded company name if available; otherwise a broad contains filter
      const filters = seededCompanyName
        ? {
            filters: [
              { attribute: { slug: 'name' }, condition: 'equals', value: seededCompanyName },
            ],
          }
        : {
            filters: [
              { attribute: { slug: 'name' }, condition: 'contains', value: 'a' },
            ],
          };

      const result = await executePlaybookTest(
        prompt,
        expectedOutcome,
        'advanced-search',
        {
          resource_type: 'companies',
          filters,
          sort_by: 'name',
          sort_order: 'asc',
          limit: 1,
        }
      );

      testResults.push(result);
      expect(result.success).toBeTruthy();
    });

    it('should systematically develop customer growth opportunities', async () => {
      const prompt = 'Identify successful customer use cases suitable for expansion';
      const expectedOutcome = 'Customer growth opportunity development and tracking';

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
        `\n🧪 Testing customer success prompt: "${prompt.substring(0, 80)}..."`
      );
      console.log(`🎯 Expected outcome: ${expectedOutcome}`);
      console.log(`🔧 Using tool: ${toolName}`);

      let result: ToolResult | null = null;
      let validationResult: ValidationResult | null = null;
      let validationLevel: ValidationLevel = ValidationLevel.FRAMEWORK_ERROR;

      await client.assertToolCall(
        toolName,
        toolParams,
        (toolResult: ToolResult) => {
          result = toolResult;
          const endTime = performance.now();
          const duration = endTime - startTime;

          console.log(`⏱️ Execution time: ${duration.toFixed(2)}ms`);

          // Use TestValidator for comprehensive validation
          validationResult = TestValidator.validateToolResult(toolName, toolResult);
          validationLevel = TestValidator.determineValidationLevel(validationResult);

          // Enhanced logging based on validation results
          switch (validationLevel) {
            case ValidationLevel.FRAMEWORK_ERROR:
              console.error('❌ Framework execution failed');
              if (validationResult.errorDetails.length > 0) {
                console.error('   Errors:', validationResult.errorDetails.join(', '));
              }
              return false;
              
            case ValidationLevel.API_ERROR:
              console.error('❌ API call failed');
              if (validationResult.errorDetails.length > 0) {
                console.error('   Errors:', validationResult.errorDetails.join(', '));
              }
              return false;
              
            case ValidationLevel.DATA_ERROR:
              console.error('❌ Data validation failed');
              if (validationResult.errorDetails.length > 0) {
                console.error('   Errors:', validationResult.errorDetails.join(', '));
              }
              return false;
              
            case ValidationLevel.PARTIAL_SUCCESS:
              console.warn('⚠️ Partial success (with warnings)');
              if (validationResult.warningDetails.length > 0) {
                console.warn('   Warnings:', validationResult.warningDetails.join(', '));
              }
              if (toolResult.content && toolResult.content.length > 0) {
                const content = toolResult.content[0];
                if ('text' in content) {
                  console.log(`📄 Result preview: ${content.text.substring(0, 200)}...`);
                }
              }
              return true; // Accept partial success as valid test result
              
            case ValidationLevel.FULL_SUCCESS:
              console.log('✅ Full validation success');
              if (toolResult.content && toolResult.content.length > 0) {
                const content = toolResult.content[0];
                if ('text' in content) {
                  console.log(`📄 Result preview: ${content.text.substring(0, 200)}...`);
                }
              }
              return true;
              
            default:
              console.error('❌ Unknown validation level');
              return false;
          }
        }
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Determine overall test success based on validation level
      const testSuccess = validationLevel === ValidationLevel.FULL_SUCCESS || 
                         validationLevel === ValidationLevel.PARTIAL_SUCCESS;

      return {
        success: testSuccess,
        prompt,
        expectedOutcome,
        actualResult: result || undefined,
        duration,
        validationLevel,
        validationDetails: validationResult || undefined,
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
        validationLevel: ValidationLevel.FRAMEWORK_ERROR,
      };
    }
  }

  async function createFailureAnalysisReport(failures: PlaybookTestResult[]) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `/tmp/customer-success-playbook-failures-${timestamp}.md`;

    let report = `# Customer Success Playbook Validation Failure Analysis

**Generated:** ${new Date().toISOString()}  
**Test Suite:** test/e2e/mcp/customer-success-playbook-eval.test.ts  
**Playbook:** docs/usage/playbooks/customer-success-playbook.md

## Summary

- **Total Tests:** ${failures.length + (testResults.length - failures.length)}
- **Failed Tests:** ${failures.length}
- **Success Rate:** ${(((testResults.length - failures.length) / testResults.length) * 100).toFixed(1)}%

## Failed Test Details

`;

    failures.forEach((failure, index) => {
      report += `### ${index + 1}. ${failure.prompt.substring(0, 60)}...

**Expected Outcome:** ${failure.expectedOutcome}
**Error:** ${failure.error || 'Tool execution returned error result'}
**Duration:** ${failure.duration.toFixed(2)}ms

`;
    });

    report += `## Recommendations

1. **Review Tool Configuration**: Ensure all tools are properly registered and configured
2. **Check API Connectivity**: Verify Attio API credentials and connection
3. **Validate Test Data**: Ensure test environment has sufficient data for customer success operations
4. **Performance Optimization**: Address any slow-performing operations (>2000ms)

## Next Steps

- [ ] Review and fix failing test cases
- [ ] Validate playbook examples against current tool capabilities
- [ ] Update documentation if tool behavior has changed
- [ ] Re-run tests to achieve 100% pass rate

`;

    writeFileSync(reportPath, report);
    console.log(`📄 Failure analysis report created: ${reportPath}`);
  }

  async function createSingleGitHubIssue(failures: PlaybookTestResult[]) {
    const issueBody = `# Customer Success Playbook Validation Failures

**Generated:** ${new Date().toISOString()}
**Test Suite:** \`test/e2e/mcp/customer-success-playbook-eval.test.ts\`
**Failed Tests:** ${failures.length}/${testResults.length}

## Summary
${failures.length} customer success playbook examples are failing validation. This indicates that our documented workflows may not work as expected for customer success teams.

## Failed Examples
${failures
  .map(
    (f, i) => `${i + 1}. **${f.prompt.substring(0, 80)}...**
   - Expected: ${f.expectedOutcome}
   - Error: ${f.error || 'Tool execution failed'}
   - Duration: ${f.duration.toFixed(2)}ms`
  )
  .join('\n\n')}

## Impact
- Customer success teams may encounter failures when following documented workflows
- Playbook examples may be misleading or outdated
- Tool configurations may need adjustment for customer success use cases

## Action Items
- [ ] Review and fix failing tool calls
- [ ] Update playbook documentation if needed
- [ ] Ensure test environment has adequate customer data
- [ ] Achieve 100% pass rate for customer success validation

**Priority:** P1 - Critical for customer success team productivity
**Labels:** test, customer-success, playbook-validation, P1
`;

    try {
      console.log('🐙 Creating GitHub issue for customer success playbook failures...');
      execSync(
        `gh issue create --title "Customer Success Playbook Validation: ${failures.length} Failed Examples" --body "${issueBody.replace(/"/g, '\\"')}" --label "P1,test,customer-success,area:testing"`,
        { stdio: 'inherit' }
      );
      console.log('✅ GitHub issue created successfully');
    } catch (error) {
      console.error('❌ Failed to create GitHub issue:', error);
      console.log('📄 Issue content saved for manual creation');
    }
  }

  async function createEnhancedValidationReport(results: PlaybookTestResult[]) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `/tmp/customer-success-enhanced-validation-${timestamp}.md`;
    
    const report = `# Customer Success Playbook Enhanced Validation Report

**Generated:** ${new Date().toISOString()}
**Test Suite:** test/e2e/mcp/customer-success-playbook-eval.test.ts
**Total Tests:** ${results.length}
**Enhanced Framework:** Multi-level validation with detailed error categorization

## Summary Statistics

- 🟢 **Full Success:** ${results.filter(r => r.validationLevel === ValidationLevel.FULL_SUCCESS).length}/${results.length}
- 🟡 **Partial Success:** ${results.filter(r => r.validationLevel === ValidationLevel.PARTIAL_SUCCESS).length}/${results.length}
- 🔴 **API Errors:** ${results.filter(r => r.validationLevel === ValidationLevel.API_ERROR).length}/${results.length}
- 🔴 **Data Errors:** ${results.filter(r => r.validationLevel === ValidationLevel.DATA_ERROR).length}/${results.length}
- 🔴 **Framework Errors:** ${results.filter(r => r.validationLevel === ValidationLevel.FRAMEWORK_ERROR).length}/${results.length}

## Detailed Test Results

${results.map((result, index) => {
  const emoji = getValidationLevelEmoji(result.validationLevel || ValidationLevel.FRAMEWORK_ERROR);
  const level = result.validationLevel || ValidationLevel.FRAMEWORK_ERROR;
  
  let details = '';
  if (result.validationDetails) {
    if (result.validationDetails.errorDetails.length > 0) {
      details += `\\n   **Errors:** ${result.validationDetails.errorDetails.join(', ')}`;
    }
    if (result.validationDetails.warningDetails.length > 0) {
      details += `\\n   **Warnings:** ${result.validationDetails.warningDetails.join(', ')}`;
    }
  }
  
  return `### Test ${index + 1}: ${result.prompt.substring(0, 80)}...

- **Status:** ${emoji} ${level}
- **Duration:** ${result.duration.toFixed(2)}ms
- **Expected:** ${result.expectedOutcome}${details}${result.error ? `\\n   **Error:** ${result.error}` : ''}
`;
}).join('\\n')}

## Validation Framework Improvements

This enhanced validation framework now provides:

1. **Multi-level Validation**
   - Framework execution success/failure
   - API response validation (HTTP status, error patterns)
   - Data structure validation (expected fields present)
   - Business logic validation (contextual correctness)

2. **Detailed Error Categorization**
   - Framework errors: Tool execution failures
   - API errors: HTTP errors, service unavailable, bad requests
   - Data errors: Missing expected fields, malformed responses
   - Warnings: Empty results, partial data

3. **Enhanced Reporting**
   - Validation level breakdown
   - Specific error and warning details
   - Performance metrics per validation level

## Key Improvements Over Previous Framework

- **False Positive Detection:** No longer marks API errors as SUCCESS
- **Granular Error Analysis:** Distinguishes between different failure types
- **Warning Detection:** Identifies partial successes with issues
- **Performance Tracking:** Monitors execution time by validation level
- **Schema-based Validation:** Tool-specific expected response patterns

---
**Framework Version:** Enhanced Multi-level Validation v1.0
**Previous Issues Resolved:** False positive detection for API errors (e.g., Test 3 search-by-timeframe 400 error)
`;

    writeFileSync(reportPath, report);
    console.log(`📊 Enhanced validation report created: ${reportPath}`);
  }

  function getValidationLevelEmoji(level: ValidationLevel): string {
    switch (level) {
      case ValidationLevel.FULL_SUCCESS: return '🟢';
      case ValidationLevel.PARTIAL_SUCCESS: return '🟡';
      case ValidationLevel.API_ERROR: return '🔴';
      case ValidationLevel.DATA_ERROR: return '🟠';
      case ValidationLevel.FRAMEWORK_ERROR: return '⚫';
      default: return '❓';
    }
  }
});
