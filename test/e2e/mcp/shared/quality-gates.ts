/**
 * Quality Gates Implementation
 * Enforces pass/fail criteria for MCP test suite based on QA test plan requirements
 */

export interface TestResult {
  test: string;
  passed: boolean;
  duration?: number;
  error?: string;
}

export interface QualityGateResult {
  passed: boolean;
  passRate: number;
  message: string;
  blockDeployment: boolean;
  details?: {
    total: number;
    passed: number;
    failed: number;
    failedTests?: string[];
  };
}

export class QualityGates {
  /**
   * P0 Quality Gate - 100% Pass Required (MANDATORY)
   * If ANY P0 test fails, the system is not ready for testing
   */
  static validateP0Results(results: TestResult[]): QualityGateResult {
    const totalCount = results.length;
    const passedTests = results.filter(r => r.passed);
    const passCount = passedTests.length;
    const failedTests = results.filter(r => !r.passed);
    const passRate = (passCount / totalCount) * 100;

    if (passCount !== totalCount) {
      return {
        passed: false,
        passRate,
        message: `⚠️ P0 CRITICAL FAILURE: ${passCount}/${totalCount} tests passed (${passRate.toFixed(1)}%). System NOT ready for testing.`,
        blockDeployment: true,
        details: {
          total: totalCount,
          passed: passCount,
          failed: failedTests.length,
          failedTests: failedTests.map(t => `${t.test}${t.error ? `: ${t.error}` : ''}`)
        }
      };
    }

    return {
      passed: true,
      passRate: 100,
      message: `✅ P0 SUCCESS: All ${totalCount} core tests passed. System ready for P1 testing.`,
      blockDeployment: false,
      details: {
        total: totalCount,
        passed: passCount,
        failed: 0
      }
    };
  }

  /**
   * P1 Quality Gate - 80% Pass Required (PRODUCTION GATE)
   * Essential tests for production readiness
   */
  static validateP1Results(results: TestResult[]): QualityGateResult {
    const totalCount = results.length;
    const passedTests = results.filter(r => r.passed);
    const passCount = passedTests.length;
    const failedTests = results.filter(r => !r.passed);
    const passRate = (passCount / totalCount) * 100;
    const requiredPassRate = 80;

    if (passRate < requiredPassRate) {
      return {
        passed: false,
        passRate,
        message: `⚠️ P1 PRODUCTION GATE FAILED: ${passCount}/${totalCount} tests passed (${passRate.toFixed(1)}%). Minimum ${requiredPassRate}% required.`,
        blockDeployment: true,
        details: {
          total: totalCount,
          passed: passCount,
          failed: failedTests.length,
          failedTests: failedTests.map(t => `${t.test}${t.error ? `: ${t.error}` : ''}`)
        }
      };
    }

    return {
      passed: true,
      passRate,
      message: `✅ P1 PRODUCTION GATE PASSED: ${passCount}/${totalCount} tests passed (${passRate.toFixed(1)}%). Ready for production.`,
      blockDeployment: false,
      details: {
        total: totalCount,
        passed: passCount,
        failed: failedTests.length,
        failedTests: failedTests.length > 0 ? failedTests.map(t => t.test) : undefined
      }
    };
  }

  /**
   * P2 Quality Assessment - 50% Pass Target (ENHANCEMENT)
   * Advanced features that don't block release
   */
  static validateP2Results(results: TestResult[]): QualityGateResult {
    const totalCount = results.length;
    const passedTests = results.filter(r => r.passed);
    const passCount = passedTests.length;
    const failedTests = results.filter(r => !r.passed);
    const passRate = (passCount / totalCount) * 100;
    const targetPassRate = 50;

    const passed = passRate >= targetPassRate;

    return {
      passed,
      passRate,
      message: passed
        ? `✅ P2 TARGET MET: ${passCount}/${totalCount} tests passed (${passRate.toFixed(1)}%). Advanced features working well.`
        : `📊 P2 BELOW TARGET: ${passCount}/${totalCount} tests passed (${passRate.toFixed(1)}%). Target ${targetPassRate}%. Document for future improvement.`,
      blockDeployment: false, // P2 never blocks deployment
      details: {
        total: totalCount,
        passed: passCount,
        failed: failedTests.length,
        failedTests: failedTests.length > 0 ? failedTests.map(t => t.test) : undefined
      }
    };
  }

  /**
   * Generate quality gate summary report
   */
  static generateSummaryReport(
    p0Results?: QualityGateResult,
    p1Results?: QualityGateResult,
    p2Results?: QualityGateResult
  ): string {
    const lines: string[] = [
      '\n' + '='.repeat(60),
      'MCP TEST SUITE QUALITY GATE SUMMARY',
      '='.repeat(60)
    ];

    if (p0Results) {
      lines.push(
        '\nP0 Core Tests (100% Required):',
        `  Status: ${p0Results.passed ? '✅ PASSED' : '❌ FAILED'}`,
        `  Pass Rate: ${p0Results.passRate.toFixed(1)}%`,
        `  ${p0Results.details?.passed}/${p0Results.details?.total} tests passed`
      );
      
      if (!p0Results.passed && p0Results.details?.failedTests) {
        lines.push('  Failed Tests:');
        p0Results.details.failedTests.forEach(test => {
          lines.push(`    - ${test}`);
        });
      }
    }

    if (p1Results) {
      lines.push(
        '\nP1 Essential Tests (80% Required):',
        `  Status: ${p1Results.passed ? '✅ PASSED' : '❌ FAILED'}`,
        `  Pass Rate: ${p1Results.passRate.toFixed(1)}%`,
        `  ${p1Results.details?.passed}/${p1Results.details?.total} tests passed`
      );
      
      if (!p1Results.passed && p1Results.details?.failedTests) {
        lines.push('  Failed Tests:');
        p1Results.details.failedTests.forEach(test => {
          lines.push(`    - ${test}`);
        });
      }
    }

    if (p2Results) {
      lines.push(
        '\nP2 Advanced Tests (50% Target):',
        `  Status: ${p2Results.passed ? '✅ TARGET MET' : '📊 BELOW TARGET'}`,
        `  Pass Rate: ${p2Results.passRate.toFixed(1)}%`,
        `  ${p2Results.details?.passed}/${p2Results.details?.total} tests passed`
      );
    }

    // Overall deployment decision
    const canDeploy = (!p0Results || p0Results.passed) && (!p1Results || p1Results.passed);
    
    lines.push(
      '\n' + '-'.repeat(60),
      'DEPLOYMENT DECISION:',
      canDeploy 
        ? '✅ READY FOR DEPLOYMENT - All quality gates passed'
        : '❌ DEPLOYMENT BLOCKED - Quality gate failures detected',
      '='.repeat(60) + '\n'
    );

    return lines.join('\n');
  }

  /**
   * Check if deployment should be blocked based on results
   */
  static shouldBlockDeployment(
    p0Results?: QualityGateResult,
    p1Results?: QualityGateResult
  ): boolean {
    return (p0Results?.blockDeployment === true) || (p1Results?.blockDeployment === true);
  }
}