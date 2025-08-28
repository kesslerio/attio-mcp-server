#!/usr/bin/env node
/**
 * Performance Budget Checker
 * Validates execution times against defined budgets and detects regressions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceBudgetChecker {
  constructor() {
    this.budgetsPath = path.join(__dirname, '../config/performance-budgets.json');
    this.resultsPath = path.join(__dirname, '../performance-results');
    this.budgets = this.loadBudgets();
    
    // Ensure results directory exists
    if (!fs.existsSync(this.resultsPath)) {
      fs.mkdirSync(this.resultsPath, { recursive: true });
    }
  }

  loadBudgets() {
    try {
      return JSON.parse(fs.readFileSync(this.budgetsPath, 'utf8'));
    } catch (error) {
      console.error('❌ Failed to load performance budgets:', error.message);
      process.exit(1);
    }
  }

  /**
   * Run performance checks for test execution
   */
  async checkTestPerformance() {
    console.log('🧪 Checking test execution performance...');
    
    const categories = ['smoke', 'core', 'extended'];
    const results = {};
    
    for (const category of categories) {
      console.log(`  📊 Running ${category} tests...`);
      const result = await this.measureTestCategory(category);
      results[category] = result;
      
      const budget = this.budgets.budgets.test_execution[category];
      const status = this.checkBudget(result.duration, budget.max_duration);
      
      console.log(`  ${status.emoji} ${category}: ${result.duration}s (budget: ${budget.max_duration})`);
      
      if (status.exceeded) {
        console.error(`    ⚠️ Budget exceeded by ${status.percentage}%`);
      }
    }
    
    return results;
  }

  /**
   * Measure execution time for a test category
   */
  async measureTestCategory(category) {
    const startTime = Date.now();
    
    try {
      const command = `npm run test:${category}`;
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);
      
      // Parse test count from output
      const testCountMatch = output.match(/(\d+) passed/);
      const testCount = testCountMatch ? parseInt(testCountMatch[1]) : 0;
      
      return {
        category,
        duration: parseFloat(duration),
        testCount,
        success: true,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);
      
      return {
        category,
        duration: parseFloat(duration),
        testCount: 0,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if a measurement exceeds budget
   */
  checkBudget(actual, budgetStr) {
    const budget = this.parseDuration(budgetStr);
    const percentage = (actual / budget * 100).toFixed(1);
    const exceeded = actual > budget;
    
    let emoji = '✅';
    if (percentage > this.budgets.thresholds.warning.percentage) {
      emoji = '⚠️';
    }
    if (exceeded) {
      emoji = '❌';
    }
    
    return {
      exceeded,
      percentage,
      emoji,
      budget,
      actual
    };
  }

  /**
   * Parse duration string to seconds
   */
  parseDuration(durationStr) {
    const match = durationStr.match(/^(\d+(?:\.\d+)?)([smh])$/);
    if (!match) return parseFloat(durationStr);
    
    const [, value, unit] = match;
    const num = parseFloat(value);
    
    switch (unit) {
      case 's': return num;
      case 'm': return num * 60;
      case 'h': return num * 3600;
      default: return num;
    }
  }

  /**
   * Check build performance
   */
  async checkBuildPerformance() {
    console.log('🔨 Checking build performance...');
    
    const results = {};
    
    // TypeScript compilation
    console.log('  📊 Measuring TypeScript compilation...');
    const tscResult = await this.measureCommand('npx tsc --noEmit');
    results.typescript = tscResult;
    
    const tscBudget = this.budgets.budgets.build_performance.typescript_compilation;
    const tscStatus = this.checkBudget(tscResult.duration, tscBudget.max_duration);
    console.log(`  ${tscStatus.emoji} TypeScript: ${tscResult.duration}s (budget: ${tscBudget.max_duration})`);
    
    // Lint check
    console.log('  📊 Measuring lint check...');
    const lintResult = await this.measureCommand('npm run lint:check');
    results.lint = lintResult;
    
    const lintBudget = this.budgets.budgets.build_performance.lint_check;
    const lintStatus = this.checkBudget(lintResult.duration, lintBudget.max_duration);
    console.log(`  ${lintStatus.emoji} Lint: ${lintResult.duration}s (budget: ${lintBudget.max_duration})`);
    
    return results;
  }

  /**
   * Measure command execution time
   */
  async measureCommand(command) {
    const startTime = Date.now();
    
    try {
      execSync(command, { 
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8'
      });
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);
      
      return {
        command,
        duration: parseFloat(duration),
        success: true,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);
      
      return {
        command,
        duration: parseFloat(duration),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Save results for trend analysis
   */
  saveResults(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `performance-${timestamp}.json`;
    const filepath = path.join(this.resultsPath, filename);
    
    const data = {
      timestamp: new Date().toISOString(),
      results,
      budgets: this.budgets.budgets,
      git_commit: this.getGitCommit(),
      environment: {
        node_version: process.version,
        platform: process.platform,
        ci: !!process.env.CI
      }
    };
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`📝 Results saved to ${filename}`);
    
    return filepath;
  }

  /**
   * Get current git commit
   */
  getGitCommit() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Generate performance report
   */
  generateReport(testResults, buildResults) {
    let report = '# Performance Budget Report\n\n';
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Git Commit**: ${this.getGitCommit()}\n\n`;
    
    // Test performance section
    report += '## Test Execution Performance\n\n';
    report += '| Category | Duration | Budget | Status | Tests |\n';
    report += '|----------|----------|--------|--------|---------|\n';
    
    Object.values(testResults).forEach(result => {
      const budget = this.budgets.budgets.test_execution[result.category];
      const status = this.checkBudget(result.duration, budget.max_duration);
      
      report += `| ${result.category} | ${result.duration}s | ${budget.max_duration} | ${status.emoji} ${status.exceeded ? 'EXCEEDED' : 'OK'} | ${result.testCount} |\n`;
    });
    
    // Build performance section
    report += '\n## Build Performance\n\n';
    report += '| Process | Duration | Budget | Status |\n';
    report += '|---------|----------|--------|--------|\n';
    
    if (buildResults.typescript) {
      const budget = this.budgets.budgets.build_performance.typescript_compilation;
      const status = this.checkBudget(buildResults.typescript.duration, budget.max_duration);
      report += `| TypeScript | ${buildResults.typescript.duration}s | ${budget.max_duration} | ${status.emoji} ${status.exceeded ? 'EXCEEDED' : 'OK'} |\n`;
    }
    
    if (buildResults.lint) {
      const budget = this.budgets.budgets.build_performance.lint_check;
      const status = this.checkBudget(buildResults.lint.duration, budget.max_duration);
      report += `| Lint Check | ${buildResults.lint.duration}s | ${budget.max_duration} | ${status.emoji} ${status.exceeded ? 'EXCEEDED' : 'OK'} |\n`;
    }
    
    return report;
  }

  /**
   * Check for regressions compared to baseline
   */
  checkRegressions() {
    const resultFiles = fs.readdirSync(this.resultsPath)
      .filter(f => f.startsWith('performance-') && f.endsWith('.json'))
      .sort()
      .slice(-5); // Last 5 results
    
    if (resultFiles.length < 2) {
      console.log('ℹ️  Not enough historical data for regression analysis');
      return false;
    }
    
    console.log('📈 Checking for performance regressions...');
    
    const latest = JSON.parse(fs.readFileSync(
      path.join(this.resultsPath, resultFiles[resultFiles.length - 1]),
      'utf8'
    ));
    
    const baseline = JSON.parse(fs.readFileSync(
      path.join(this.resultsPath, resultFiles[0]),
      'utf8'
    ));
    
    let hasRegression = false;
    
    // Compare test performance
    Object.keys(latest.results).forEach(category => {
      if (baseline.results[category]) {
        const latestDuration = latest.results[category].duration;
        const baselineDuration = baseline.results[category].duration;
        const change = ((latestDuration - baselineDuration) / baselineDuration * 100).toFixed(1);
        
        if (change > this.budgets.thresholds.regression.percentage - 100) {
          console.log(`  ⚠️  ${category} tests: ${change}% slower than baseline`);
          hasRegression = true;
        } else {
          console.log(`  ✅ ${category} tests: ${change}% change from baseline`);
        }
      }
    });
    
    return hasRegression;
  }
}

// CLI interface
async function main() {
  const checker = new PerformanceBudgetChecker();
  
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Performance Budget Checker

Usage: node scripts/check-performance-budgets.js [options]

Options:
  --tests-only     Check only test execution performance
  --build-only     Check only build performance  
  --report         Generate detailed report
  --regression     Check for performance regressions
  --help, -h       Show this help message

Examples:
  node scripts/check-performance-budgets.js
  node scripts/check-performance-budgets.js --tests-only
  node scripts/check-performance-budgets.js --regression
    `);
    return;
  }
  
  let testResults = {};
  let buildResults = {};
  let hasFailures = false;
  
  try {
    // Check test performance
    if (!process.argv.includes('--build-only')) {
      testResults = await checker.checkTestPerformance();
      
      // Check for budget failures
      Object.values(testResults).forEach(result => {
        const budget = checker.budgets.budgets.test_execution[result.category];
        const status = checker.checkBudget(result.duration, budget.max_duration);
        if (status.exceeded) hasFailures = true;
      });
    }
    
    // Check build performance  
    if (!process.argv.includes('--tests-only')) {
      buildResults = await checker.checkBuildPerformance();
      
      // Check for build budget failures
      if (buildResults.typescript) {
        const budget = checker.budgets.budgets.build_performance.typescript_compilation;
        const status = checker.checkBudget(buildResults.typescript.duration, budget.max_duration);
        if (status.exceeded) hasFailures = true;
      }
    }
    
    // Save results
    const resultsFile = checker.saveResults({ ...testResults, ...buildResults });
    
    // Generate report
    if (process.argv.includes('--report')) {
      const report = checker.generateReport(testResults, buildResults);
      const reportPath = path.join(checker.resultsPath, 'latest-report.md');
      fs.writeFileSync(reportPath, report);
      console.log(`📊 Report generated: ${reportPath}`);
    }
    
    // Check regressions
    if (process.argv.includes('--regression')) {
      const hasRegression = checker.checkRegressions();
      if (hasRegression) hasFailures = true;
    }
    
    // Summary
    console.log('\n📋 Performance Budget Summary:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    if (hasFailures) {
      console.log('❌ Performance budget violations detected!');
      process.exit(1);
    } else {
      console.log('✅ All performance budgets within limits');
    }
    
  } catch (error) {
    console.error('❌ Performance check failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { PerformanceBudgetChecker };