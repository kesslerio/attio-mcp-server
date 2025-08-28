#!/usr/bin/env node
/**
 * Test Impact Analysis Script
 * Analyzes git changes and runs only affected tests
 */

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

// Import our TypeScript analyzer (compile on-demand if needed)
async function loadAnalyzer() {
  const analyzerPath = path.join(__dirname, '../dist/utils/test-impact-analyzer.js');
  
  // Ensure the project is built
  if (!existsSync(analyzerPath)) {
    console.log('Building project for test impact analysis...');
    execSync('npm run build', { stdio: 'inherit' });
  }
  
  const { TestImpactAnalyzer } = require(analyzerPath);
  return new TestImpactAnalyzer();
}

async function main() {
  try {
    const baseBranch = process.argv[2] || 'main';
    const analyzer = await loadAnalyzer();
    const selection = analyzer.getAffectedTests(baseBranch);
    
    console.log('\n🔍 Test Impact Analysis Results:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📂 Category: ${selection.category.toUpperCase()}`);
    console.log(`⏱️  Estimated Time: ${selection.estimatedTime}`);
    console.log(`💡 Reason: ${selection.reason}`);
    console.log(`🧪 Tests to Run: ${selection.affected.length}`);
    
    if (selection.affected.length === 0) {
      console.log('\n✅ No specific tests need to run based on your changes!');
      return;
    }
    
    // Generate test command based on category
    let testCommand;
    switch (selection.category) {
      case 'smoke':
        testCommand = 'npm run test:smoke';
        break;
      case 'core':
        // Run specific affected tests
        const testPattern = selection.affected.join(' ');
        testCommand = `npx vitest --run ${testPattern}`;
        break;
      case 'extended':
        testCommand = 'npm run test:extended';
        break;
      case 'integration':
        testCommand = 'npm run test:integration';
        break;
      default:
        testCommand = 'npm run test:offline';
    }
    
    console.log(`\n🚀 Running Command: ${testCommand}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // Execute the test command
    const startTime = Date.now();
    execSync(testCommand, { stdio: 'inherit' });
    const endTime = Date.now();
    const actualTime = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ Tests completed in ${actualTime}s (estimated ${selection.estimatedTime})`);
    
    // Generate and save report
    if (process.env.CI || process.argv.includes('--report')) {
      const report = analyzer.generateReport(baseBranch);
      const fs = require('fs');
      const reportPath = 'test-impact-report.md';
      fs.writeFileSync(reportPath, report);
      console.log(`📝 Report saved to ${reportPath}`);
    }
    
  } catch (error) {
    console.error('❌ Test impact analysis failed:', error.message);
    
    // Fallback to smoke tests
    console.log('⚠️  Running smoke tests as fallback...');
    try {
      execSync('npm run test:smoke', { stdio: 'inherit' });
    } catch (fallbackError) {
      console.error('❌ Smoke tests also failed:', fallbackError.message);
      process.exit(1);
    }
  }
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Test Impact Analysis Tool

Usage: node scripts/test-affected.js [base-branch] [options]

Arguments:
  base-branch    Git branch to compare against (default: main)

Options:
  --report       Generate detailed report (automatic in CI)
  --help, -h     Show this help message

Examples:
  node scripts/test-affected.js
  node scripts/test-affected.js develop
  node scripts/test-affected.js main --report

This tool analyzes your git changes and runs only the tests that are affected,
saving time during development while maintaining confidence in your changes.
`);
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});