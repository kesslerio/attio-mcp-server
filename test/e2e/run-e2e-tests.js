#!/usr/bin/env node

/**
 * E2E Test Runner with Environment Validation
 *
 * Validates the environment, provides actionable guidance for missing
 * configuration, and runs Vitest in the desired mode.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  collectEnvironmentStatus,
  DEFAULT_ENV_FILES,
  loadEnvironmentFiles,
  logSecretPresence,
} from './utils/environment.js';
import { createE2ELogger } from './utils/env-logger.js';
import {
  resolveTestPattern,
  listAvailablePatterns,
} from './config/test-patterns.js';

const CONFIG = {
  requiredEnvVars: ['ATTIO_API_KEY'],
  optionalEnvVars: [
    'E2E_TEST_PREFIX',
    'E2E_TEST_EMAIL_DOMAIN',
    'E2E_TEST_COMPANY_DOMAIN',
  ],
  configFiles: ['test/e2e/config.local.json', 'test/e2e/config.template.json'],
  vitestConfigPath: 'configs/vitest/vitest.config.e2e.ts',
};

const logger = createE2ELogger('E2E Runner');

function ensureEnvironmentFilesLoaded() {
  const loaderLogger = createE2ELogger('E2E Env Loader');
  loadEnvironmentFiles({ files: DEFAULT_ENV_FILES, logger: loaderLogger });
}

function parseCommandLineArgs(argv) {
  const options = {
    help: false,
    check: false,
    limited: false,
    verbose: false,
    reporter: null,
    pattern: 'all',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--check':
        options.check = true;
        break;
      case '--limited':
        options.limited = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--reporter':
        options.reporter = argv[index + 1] ?? null;
        index += 1;
        break;
      case '--pattern':
        options.pattern = argv[index + 1] ?? 'all';
        index += 1;
        break;
      default:
        if (!options.pattern || options.pattern === 'all') {
          options.pattern = arg;
        }
        break;
    }
  }

  return options;
}

function findConfigFile(configFiles) {
  return configFiles
    .map((file) => ({ file, absolute: join(process.cwd(), file) }))
    .find(({ absolute }) => existsSync(absolute));
}

function gatherEnvironmentDetails() {
  const envStatus = collectEnvironmentStatus(
    CONFIG.requiredEnvVars,
    CONFIG.optionalEnvVars
  );

  const info = [];
  const warnings = [];
  const issues = [];

  envStatus.presentRequired.forEach((envVar) => {
    info.push(`${envVar} is set`);
  });

  envStatus.presentOptional.forEach((envVar) => {
    info.push(`${envVar} is set`);
  });

  envStatus.missingRequired.forEach((envVar) => {
    issues.push(`Missing required environment variable: ${envVar}`);
  });

  envStatus.missingOptional.forEach((envVar) => {
    warnings.push(
      `Optional environment variable not set: ${envVar} (defaults will be used)`
    );
  });

  const configFile = findConfigFile(CONFIG.configFiles);
  if (configFile) {
    info.push(`Configuration file found: ${configFile.file}`);
  } else {
    issues.push(
      'No configuration file found. Create test/e2e/config.local.json from test/e2e/config.template.json'
    );
  }

  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (Number.isNaN(majorVersion) || majorVersion < 18) {
    warnings.push(
      `Node.js version ${nodeVersion} detected. Recommended: Node.js 18+`
    );
  } else {
    info.push(`Node.js version: ${nodeVersion}`);
  }

  const mcpMode = (process.env.MCP_TEST_MODE || 'local').toLowerCase();
  info.push(`MCP_TEST_MODE=${mcpMode}`);

  if (mcpMode === 'remote') {
    if (process.env.MCP_REMOTE_ENDPOINT) {
      info.push('MCP_REMOTE_ENDPOINT is set');
    } else {
      issues.push(
        'MCP_REMOTE_ENDPOINT is required when MCP_TEST_MODE=remote (e.g., https://your-worker.workers.dev/mcp)'
      );
    }

    if (process.env.MCP_REMOTE_AUTH_TOKEN) {
      info.push('MCP_REMOTE_AUTH_TOKEN is set (masked)');
    } else {
      warnings.push(
        'MCP_REMOTE_AUTH_TOKEN not set; remote MCP server must allow unauthenticated requests'
      );
    }
  }

  return { envStatus, configFile, info, warnings, issues };
}

function reportEnvironmentStatus(details) {
  if (details.info.length > 0) {
    logger.success('Environment status:');
    details.info.forEach((entry) => logger.info(`  • ${entry}`));
  }

  if (details.warnings.length > 0) {
    logger.warn('Warnings:');
    details.warnings.forEach((warning) => logger.warn(`  • ${warning}`));
  }

  if (details.issues.length > 0) {
    logger.error('Issues detected:');
    details.issues.forEach((issue) => logger.error(`  • ${issue}`));
  }
}

function printUsageHelp() {
  logger.info('E2E Test Runner Usage:');
  logger.log('  npm run test:e2e                - Run all E2E tests');
  logger.log('  npm run test:e2e -- --help      - Show this help');
  logger.log('  npm run test:e2e -- --check     - Environment check only');
  logger.log(
    '  npm run test:e2e -- --limited   - Run limited tests (no API calls)'
  );
  logger.log(
    '  npm run test:e2e -- --pattern <name> - Run specific test pattern'
  );
  logger.log('');
  logger.log('Available patterns:');
  listAvailablePatterns().forEach((pattern) => {
    logger.log(`  - ${pattern}`);
  });
  logger.log('');
  logger.log('Environment setup:');
  logger.log(
    '  1. Copy test/e2e/config.template.json to test/e2e/config.local.json'
  );
  logger.log('  2. Set ATTIO_API_KEY environment variable');
  logger.log('  3. Optionally set additional E2E_* environment variables');
}

function printSolutionGuidance(details) {
  if (details.issues.length === 0) {
    return;
  }

  const guidance = [];
  if (details.issues.some((issue) => issue.includes('ATTIO_API_KEY'))) {
    guidance.push(
      '1. Acquire an Attio API key and set ATTIO_API_KEY in your environment or .env file.'
    );
  }

  if (details.issues.some((issue) => issue.includes('configuration file'))) {
    guidance.push(
      '2. Copy test/e2e/config.template.json to test/e2e/config.local.json and update it with your workspace settings.'
    );
  }

  if (guidance.length > 0) {
    logger.info('How to resolve the issues:');
    guidance.forEach((item) => logger.info(`  • ${item}`));
  }
}

function buildVitestArguments(patternKey, options) {
  const resolvedPattern = resolveTestPattern(patternKey);
  const args = ['run', '--config', CONFIG.vitestConfigPath];

  if (patternKey && patternKey !== 'all') {
    args.push(resolvedPattern);
  }

  if (options.reporter) {
    args.push('--reporter', options.reporter);
  }

  if (options.verbose) {
    args.push('--reporter', 'verbose');
  }

  return { args, resolvedPattern };
}

function executeVitestProcess(args) {
  return new Promise((resolve, reject) => {
    const vitest = spawn('npx', ['vitest', ...args], {
      stdio: 'inherit',
      env: { ...process.env },
    });

    vitest.on('close', (code) => {
      resolve(code ?? 1);
    });

    vitest.on('error', (error) => {
      reject(error);
    });
  });
}

async function runVitest(patternKey, options) {
  const { args, resolvedPattern } = buildVitestArguments(patternKey, options);

  if (options.limited) {
    process.env.SKIP_E2E_TESTS = 'true';
    logger.warn('Running in limited mode - API tests will be skipped');
  }

  logger.info(`Running E2E tests: ${resolvedPattern}`);
  logger.info(`Command: npx vitest ${args.join(' ')}`);

  if (process.env.ATTIO_API_KEY) {
    logSecretPresence({ key: 'ATTIO_API_KEY', logger });
  } else {
    logger.warn('ATTIO_API_KEY not found in environment');
  }

  const exitCode = await executeVitestProcess(args);

  if (exitCode === 0) {
    logger.success('E2E tests completed successfully');
  } else {
    logger.warn(`E2E tests finished with exit code ${exitCode}`);
  }

  return exitCode;
}

async function main() {
  ensureEnvironmentFilesLoaded();

  const options = parseCommandLineArgs(process.argv.slice(2));

  logger.info('Attio MCP Server - E2E Test Runner');

  if (options.help) {
    printUsageHelp();
    return process.exit(0);
  }

  const details = gatherEnvironmentDetails();
  reportEnvironmentStatus(details);

  if (options.check) {
    const exitCode = details.issues.length > 0 ? 1 : 0;
    if (exitCode === 0) {
      logger.success('Environment check completed successfully');
    } else {
      logger.warn('Environment check detected issues');
    }
    return process.exit(exitCode);
  }

  if (!details.configFile) {
    logger.error('Cannot run tests without configuration file');
    printSolutionGuidance(details);
    return process.exit(1);
  }

  const missingApiKey =
    details.envStatus.missingRequired.includes('ATTIO_API_KEY');
  if (missingApiKey && !options.limited) {
    logger.warn('No API key detected. Use --limited to run without API calls.');
    printSolutionGuidance(details);
    return process.exit(1);
  }

  if (missingApiKey && options.limited) {
    logger.warn('Running without API key - limited tests only');
  }

  try {
    const exitCode = await runVitest(options.pattern, options);

    if (exitCode === 0) {
      logger.success('All E2E tests passed!');
    } else {
      logger.warn('Some E2E tests failed. Check the output above for details.');
      if (missingApiKey) {
        logger.warn('Failures may be due to running without ATTIO_API_KEY.');
      }
    }

    process.exit(exitCode);
  } catch (error) {
    logger.error(
      `E2E test execution failed: ${(error && error.message) || error}`
    );
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection detected');
  logger.error(String(reason), promise);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${(error && error.message) || error}`);
  process.exit(1);
});

main();
