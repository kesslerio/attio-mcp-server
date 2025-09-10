/**
 * Customer Success Playbook Validation Suite - Main Orchestrator
 *
 * This is the main test orchestrator that runs all customer success playbook
 * test suites and provides consolidated reporting. It validates that all concrete
 * examples in our customer-success-playbook.md actually work with the MCP server.
 *
 * Purpose: Ensure our customer success playbooks are practical and deliver promised value.
 */
import { describe, it, afterAll } from 'vitest';
import { PlaybookTestResult, ValidationLevel } from './shared/types.js';
import {
  createFailureAnalysisReport,
  createSingleGitHubIssue,
  createEnhancedValidationReport,
  getValidationLevelEmoji,
} from './shared/reporting.js';

// Import test suites - these will run when imported
import './suites/quick-start.test.js';
import './suites/customer-journey.test.js';

const CS_ENABLED = process.env.CS_E2E_ENABLE === 'true';
const suiteFn = CS_ENABLED ? describe : describe.skip;

suiteFn('Customer Success Playbook Validation Suite - Orchestrator', () => {
  afterAll(async () => {
    // Collect results from all test suites
    const allResults: PlaybookTestResult[] = [];

    // Get results from individual suites (stored in global)
    const quickStartResults = (global as any).quickStartResults || [];
    const customerJourneyResults = (global as any).customerJourneyResults || [];

    allResults.push(...quickStartResults, ...customerJourneyResults);

    if (allResults.length === 0) {
      console.log('\n⚠️  No test results collected from individual suites');
      return;
    }

    // Enhanced analysis with validation levels
    const failures = allResults.filter((result) => !result.success);
    const partialSuccesses = allResults.filter(
      (result) => result.validationLevel === ValidationLevel.PARTIAL_SUCCESS
    );
    const fullSuccesses = allResults.filter(
      (result) => result.validationLevel === ValidationLevel.FULL_SUCCESS
    );

    console.log('\n📊 Final Customer Success Playbook Summary:');
    console.log(
      `   🟢 Full Success: ${fullSuccesses.length}/${allResults.length}`
    );
    console.log(
      `   🟡 Partial Success: ${partialSuccesses.length}/${allResults.length}`
    );
    console.log(`   🔴 Failures: ${failures.length}/${allResults.length}`);
    console.log(
      `   📈 Success Rate: ${(((allResults.length - failures.length) / allResults.length) * 100).toFixed(1)}%`
    );

    // Create detailed validation report
    await createEnhancedValidationReport(allResults);

    // Analyze failures and create reports
    if (failures.length > 0) {
      console.log(
        `\n📋 Analyzing ${failures.length} failed playbook examples...`
      );
      await createFailureAnalysisReport(failures, allResults);
      await createSingleGitHubIssue(failures, allResults);
    } else {
      console.log(
        '\n✅ All customer success playbook examples validated successfully!'
      );
    }

    // Print validation breakdown
    const validationBreakdown = allResults.reduce(
      (acc, result) => {
        const level = result.validationLevel || ValidationLevel.FRAMEWORK_ERROR;
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {} as Record<ValidationLevel, number>
    );

    console.log('\n🔍 Final Validation Level Breakdown:');
    Object.entries(validationBreakdown).forEach(([level, count]) => {
      const emoji = getValidationLevelEmoji(level as ValidationLevel);
      console.log(`   ${emoji} ${level}: ${count}`);
    });

    // Performance summary
    const avgDuration =
      allResults.reduce((sum, result) => sum + result.duration, 0) /
      allResults.length;
    const slowTests = allResults.filter((result) => result.duration > 2000);

    console.log('\n⏱️  Performance Summary:');
    console.log(`   📊 Average Duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`   🐌 Slow Tests (>2s): ${slowTests.length}`);
    if (slowTests.length > 0) {
      slowTests.forEach((test) => {
        console.log(
          `      - ${test.prompt.substring(0, 50)}... (${test.duration.toFixed(2)}ms)`
        );
      });
    }

    // Suite breakdown
    console.log('\n📦 Suite Breakdown:');
    console.log(`   🎯 Quick Start Tests: ${quickStartResults.length}`);
    console.log(
      `   🎯 Customer Journey Tests: ${customerJourneyResults.length}`
    );
    console.log(`   📊 Total Tests: ${allResults.length}`);

    // Quality gate assessment
    const successRate =
      ((allResults.length - failures.length) / allResults.length) * 100;
    const qualityGate = successRate >= 75 ? '✅ PASSED' : '❌ FAILED';
    console.log(
      `\n🎯 Quality Gate (75% threshold): ${qualityGate} (${successRate.toFixed(1)}%)`
    );

    if (successRate < 75) {
      console.log('\n💡 Recommendations:');
      console.log('   - Review failing test cases and fix underlying issues');
      console.log('   - Ensure test environment has adequate seed data');
      console.log('   - Verify all tools are properly configured');
      console.log('   - Check API connectivity and credentials');
    }
  });

  it('should orchestrate all customer success playbook test suites', () => {
    // This test serves as a placeholder for the orchestrator
    // The actual testing is done by the imported suites
    console.log('\n🎭 Customer Success Playbook Orchestrator initialized');
    console.log('   Running modular test suites...');
  });
});
