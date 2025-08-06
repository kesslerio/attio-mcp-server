#!/usr/bin/env node

/**
 * E2E Test Runner with Environment Validation
 * 
 * This script provides a comprehensive E2E test runner that:
 * - Validates the test environment before running tests
 * - Provides clear guidance for missing configuration
 * - Handles API key requirements gracefully
 * - Offers multiple execution modes (full, limited, validation-only)
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration
const CONFIG = {
  requiredEnvVars: ['ATTIO_API_KEY'],
  optionalEnvVars: ['E2E_TEST_PREFIX', 'E2E_TEST_EMAIL_DOMAIN', 'E2E_TEST_COMPANY_DOMAIN'],
  configFiles: ['test/e2e/config.local.json', 'test/e2e/config.template.json'],
  testPatterns: {
    all: 'test/e2e/suites/**/*.e2e.test.ts',
    errorHandling: 'test/e2e/suites/error-handling.e2e.test.ts',
    universal: 'test/e2e/suites/universal-*.e2e.test.ts',
    notes: 'test/e2e/suites/notes-*.e2e.test.ts',
    tasks: 'test/e2e/suites/tasks-*.e2e.test.ts',
    lists: 'test/e2e/suites/lists-*.e2e.test.ts'
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function checkEnvironment() {
  console.log(colorize('\n🔍 Checking E2E Test Environment...', 'cyan'));
  
  const issues = [];
  const warnings = [];
  const info = [];

  // Check required environment variables
  CONFIG.requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      issues.push(`Missing required environment variable: ${envVar}`);
    } else {
      info.push(`✓ ${envVar} is set`);
    }
  });

  // Check optional environment variables
  CONFIG.optionalEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      warnings.push(`Optional environment variable not set: ${envVar} (will use defaults)`);
    } else {
      info.push(`✓ ${envVar} is set`);
    }
  });

  // Check configuration files
  const configFile = CONFIG.configFiles.find(file => existsSync(file));
  if (!configFile) {
    issues.push(`No configuration file found. Create test/e2e/config.local.json from test/e2e/config.template.json`);
  } else {
    info.push(`✓ Configuration file found: ${configFile}`);
  }

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    warnings.push(`Node.js version ${nodeVersion} detected. Recommended: Node.js 18+`);
  } else {
    info.push(`✓ Node.js version: ${nodeVersion}`);
  }

  return { issues, warnings, info };
}

function printEnvironmentStatus(status) {
  // Print info
  if (status.info.length > 0) {
    console.log(colorize('\n📋 Environment Status:', 'green'));
    status.info.forEach(item => console.log(`  ${item}`));
  }

  // Print warnings
  if (status.warnings.length > 0) {
    console.log(colorize('\n⚠️  Warnings:', 'yellow'));
    status.warnings.forEach(warning => console.log(`  • ${warning}`));
  }

  // Print issues
  if (status.issues.length > 0) {
    console.log(colorize('\n❌ Issues:', 'red'));
    status.issues.forEach(issue => console.log(`  • ${issue}`));
  }
}

function printUsageHelp() {
  console.log(colorize('\n📖 E2E Test Runner Usage:', 'cyan'));
  console.log(`
Available commands:
  ${colorize('npm run test:e2e', 'white')}              - Run all E2E tests
  ${colorize('npm run test:e2e -- --help', 'white')}   - Show this help
  ${colorize('npm run test:e2e -- --check', 'white')}  - Environment check only
  ${colorize('npm run test:e2e -- --limited', 'white')} - Run limited tests (no API calls)
  ${colorize('npm run test:e2e -- --pattern <name>', 'white')} - Run specific test pattern

Available patterns:
  ${colorize('errorHandling', 'white')} - Error handling tests
  ${colorize('universal', 'white')}     - Universal tool tests  
  ${colorize('notes', 'white')}         - Notes management tests
  ${colorize('tasks', 'white')}         - Tasks management tests
  ${colorize('lists', 'white')}         - Lists management tests

Environment setup:
  1. Copy ${colorize('test/e2e/config.template.json', 'white')} to ${colorize('test/e2e/config.local.json', 'white')}
  2. Set ${colorize('ATTIO_API_KEY', 'white')} environment variable
  3. Optionally set other E2E_* environment variables

Example:
  ${colorize('export ATTIO_API_KEY=your_api_key_here', 'white')}
  ${colorize('npm run test:e2e', 'white')}
`);
}

function printSolutionGuidance(status) {
  if (status.issues.length === 0) return;

  console.log(colorize('\n🔧 How to Fix These Issues:', 'cyan'));
  
  if (status.issues.some(issue => issue.includes('ATTIO_API_KEY'))) {
    console.log(`
${colorize('1. Get an Attio API Key:', 'white')}
   • Log into your Attio workspace
   • Go to Settings > API & Integrations > API Keys
   • Create a new API key with appropriate permissions
   • Copy the API key

${colorize('2. Set the API Key:', 'white')}
   • Export in your shell: ${colorize('export ATTIO_API_KEY=your_api_key_here', 'yellow')}
   • Or add to your .env file: ${colorize('ATTIO_API_KEY=your_api_key_here', 'yellow')}
   • Or create .env.e2e file: ${colorize('ATTIO_API_KEY=your_api_key_here', 'yellow')}
`);
  }

  if (status.issues.some(issue => issue.includes('configuration file'))) {
    console.log(`
${colorize('3. Create Configuration File:', 'white')}
   • Copy the template: ${colorize('cp test/e2e/config.template.json test/e2e/config.local.json', 'yellow')}
   • Edit test/e2e/config.local.json with your test settings
   • Ensure test data prefixes are unique to avoid conflicts
`);
  }

  console.log(`
${colorize('4. Alternative - Run Limited Tests:', 'white')}
   If you cannot get an API key immediately, you can run:
   ${colorize('npm run test:e2e -- --limited', 'yellow')}
   This will run tests that don't require API access.
`);
}

async function runVitest(pattern = 'all', options = {}) {
  const testPattern = CONFIG.testPatterns[pattern] || pattern;
  
  const vitestArgs = [
    'run',
    '--config', 'vitest.config.e2e.ts'
  ];
  
  // Only add pattern if it's not 'all' (let vitest config handle default includes)
  if (pattern !== 'all') {
    vitestArgs.push(testPattern);
  }

  if (options.limited) {
    // Add environment variable to skip API tests
    process.env.SKIP_E2E_TESTS = 'true';
    console.log(colorize('🚫 Running in limited mode - API tests will be skipped', 'yellow'));
  }

  if (options.reporter) {
    vitestArgs.push('--reporter', options.reporter);
  }

  if (options.verbose) {
    vitestArgs.push('--reporter', 'verbose');
  }

  console.log(colorize(`\n🧪 Running E2E tests: ${testPattern}`, 'cyan'));
  console.log(colorize(`Command: npx vitest ${vitestArgs.join(' ')}`, 'blue'));
  
  // Debug: Verify API key is loaded
  if (process.env.ATTIO_API_KEY) {
    console.log(colorize(`✓ API key loaded (${process.env.ATTIO_API_KEY.slice(0, 10)}...)`, 'green'));
  } else {
    console.log(colorize('⚠️  API key not found in environment!', 'yellow'));
  }

  return new Promise((resolve, reject) => {
    // Ensure environment variables are properly passed to child process
    // Using spread operator to create a new object with all current env vars
    const vitest = spawn('npx', ['vitest', ...vitestArgs], {
      stdio: 'inherit',
      env: { ...process.env }
    });

    vitest.on('close', (code) => {
      if (code === 0) {
        console.log(colorize('\n✅ E2E tests completed successfully', 'green'));
        resolve(code);
      } else {
        console.log(colorize(`\n❌ E2E tests failed with exit code ${code}`, 'red'));
        resolve(code); // Don't reject, let caller handle the exit code
      }
    });

    vitest.on('error', (error) => {
      console.error(colorize(`\n💥 Failed to start E2E tests: ${error.message}`, 'red'));
      reject(error);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const options = {
    help: args.includes('--help') || args.includes('-h'),
    check: args.includes('--check'),
    limited: args.includes('--limited'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    reporter: args.includes('--reporter') ? args[args.indexOf('--reporter') + 1] : null,
    pattern: args.includes('--pattern') ? args[args.indexOf('--pattern') + 1] : 'all'
  };

  console.log(colorize('🎯 Attio MCP Server - E2E Test Runner', 'cyan'));
  
  if (options.help) {
    printUsageHelp();
    process.exit(0);
  }

  // Environment check
  const envStatus = checkEnvironment();
  printEnvironmentStatus(envStatus);

  if (options.check) {
    console.log(colorize('\n✅ Environment check completed', 'green'));
    process.exit(envStatus.issues.length > 0 ? 1 : 0);
  }

  // Determine if we can run tests
  const hasApiKey = !envStatus.issues.some(issue => issue.includes('ATTIO_API_KEY'));
  const hasConfig = !envStatus.issues.some(issue => issue.includes('configuration file'));

  if (!hasConfig) {
    console.log(colorize('\n❌ Cannot run tests without configuration file', 'red'));
    printSolutionGuidance(envStatus);
    process.exit(1);
  }

  if (!hasApiKey && !options.limited) {
    console.log(colorize('\n⚠️  No API key detected', 'yellow'));
    console.log('You can either:');
    console.log(`  1. Set ATTIO_API_KEY and run: ${colorize('npm run test:e2e', 'white')}`);
    console.log(`  2. Run limited tests: ${colorize('npm run test:e2e -- --limited', 'white')}`);
    console.log(`  3. Check environment only: ${colorize('npm run test:e2e -- --check', 'white')}`);
    
    printSolutionGuidance(envStatus);
    process.exit(1);
  }

  // Run the tests
  try {
    const exitCode = await runVitest(options.pattern, options);
    
    // Print summary
    if (exitCode === 0) {
      console.log(colorize('\n🎉 All E2E tests passed!', 'green'));
    } else {
      console.log(colorize('\n⚠️  Some E2E tests failed. Check the output above for details.', 'yellow'));
      
      if (!hasApiKey) {
        console.log(colorize('Note: Some failures might be due to missing API key.', 'yellow'));
      }
    }
    
    process.exit(exitCode);
  } catch (error) {
    console.error(colorize(`\n💥 E2E test execution failed: ${error.message}`, 'red'));
    process.exit(1);
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error(colorize('💥 Unhandled Rejection at:', 'red'), promise, colorize('reason:', 'red'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(colorize('💥 Uncaught Exception:', 'red'), error);
  process.exit(1);
});

// Run the main function
main().catch(error => {
  console.error(colorize(`💥 Script execution failed: ${error.message}`, 'red'));
  process.exit(1);
});