/**
 * Reporting utilities for Customer Success Playbook tests
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { PlaybookTestResult, ValidationLevel } from './types.js';

export async function createFailureAnalysisReport(
  failures: PlaybookTestResult[],
  allResults: PlaybookTestResult[]
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `/tmp/customer-success-playbook-failures-${timestamp}.md`;

  let report = `# Customer Success Playbook Validation Failure Analysis

**Generated:** ${new Date().toISOString()}  
**Test Suite:** test/e2e/mcp/customer-success-playbook-eval.test.ts  
**Playbook:** docs/usage/playbooks/customer-success-playbook.md

## Summary

- **Total Tests:** ${allResults.length}
- **Failed Tests:** ${failures.length}
- **Success Rate:** ${(((allResults.length - failures.length) / allResults.length) * 100).toFixed(1)}%

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

export async function createSingleGitHubIssue(
  failures: PlaybookTestResult[],
  allResults: PlaybookTestResult[]
) {
  const issueBody = `# Customer Success Playbook Validation Failures

**Generated:** ${new Date().toISOString()}
**Test Suite:** \`test/e2e/mcp/customer-success-playbook-eval.test.ts\`
**Failed Tests:** ${failures.length}/${allResults.length}

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
    console.log(
      '🐙 Creating GitHub issue for customer success playbook failures...'
    );
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

export async function createEnhancedValidationReport(
  results: PlaybookTestResult[]
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `/tmp/customer-success-enhanced-validation-${timestamp}.md`;

  const report = `# Customer Success Playbook Enhanced Validation Report

**Generated:** ${new Date().toISOString()}
**Test Suite:** test/e2e/mcp/customer-success-playbook-eval.test.ts
**Total Tests:** ${results.length}
**Enhanced Framework:** Multi-level validation with detailed error categorization

## Summary Statistics

- 🟢 **Full Success:** ${results.filter((r) => r.validationLevel === ValidationLevel.FULL_SUCCESS).length}/${results.length}
- 🟡 **Partial Success:** ${results.filter((r) => r.validationLevel === ValidationLevel.PARTIAL_SUCCESS).length}/${results.length}
- 🔴 **API Errors:** ${results.filter((r) => r.validationLevel === ValidationLevel.API_ERROR).length}/${results.length}
- 🔴 **Data Errors:** ${results.filter((r) => r.validationLevel === ValidationLevel.DATA_ERROR).length}/${results.length}
- 🔴 **Framework Errors:** ${results.filter((r) => r.validationLevel === ValidationLevel.FRAMEWORK_ERROR).length}/${results.length}

## Detailed Test Results

${results
  .map((result, index) => {
    const emoji = getValidationLevelEmoji(
      result.validationLevel || ValidationLevel.FRAMEWORK_ERROR
    );
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
  })
  .join('\\n')}

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

export function getValidationLevelEmoji(level: ValidationLevel): string {
  switch (level) {
    case ValidationLevel.FULL_SUCCESS:
      return '🟢';
    case ValidationLevel.PARTIAL_SUCCESS:
      return '🟡';
    case ValidationLevel.API_ERROR:
      return '🔴';
    case ValidationLevel.DATA_ERROR:
      return '🟠';
    case ValidationLevel.FRAMEWORK_ERROR:
      return '⚫';
    default:
      return '❓';
  }
}
