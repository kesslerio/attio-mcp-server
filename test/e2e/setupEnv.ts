/**
 * E2E Environment Setup and Validation
 *
 * Ensures required environment variables are loaded before any tests run.
 * Prevents the "↓ skipped" issue by failing fast with clear error messages.
 */

import {
  collectEnvironmentStatus,
  DEFAULT_ENV_FILES,
  loadEnvironmentFiles,
  logSecretPresence,
} from './utils/environment.js';
import { createE2ELogger } from './utils/logger.js';

const logger = createE2ELogger('E2E Setup');

// Required environment variables for E2E tests
const REQUIRED_ENV_VARS = ['ATTIO_API_KEY'] as const;

// Optional environment variables (won't fail if missing, but will warn)
const OPTIONAL_ENV_VARS = [
  'E2E_TEST_PREFIX',
  'E2E_TEST_EMAIL_DOMAIN',
  'E2E_TEST_COMPANY_DOMAIN',
  'E2E_CLEANUP_AFTER_TESTS',
  'E2E_SKIP_CLEANUP',
] as const;

export class MissingEnvironmentVariablesError extends Error {
  public readonly missingVariables: readonly string[];

  constructor(missing: readonly string[]) {
    super('Missing required environment variables');
    this.missingVariables = missing;
  }
}

/**
 * Validate environment variables and fail fast if any required ones are missing
 */
export function validateEnvironment(): {
  missingOptional: readonly string[];
  missingRequired: readonly string[];
} {
  logger.info('Validating E2E environment variables...');

  const status = collectEnvironmentStatus(REQUIRED_ENV_VARS, OPTIONAL_ENV_VARS);

  if (status.missingRequired.length > 0) {
    logger.error('Missing required environment variables:');
    status.missingRequired.forEach((key) => {
      logger.error(`  • ${key}`);
    });

    logger.info('Solutions:');
    logger.info('  • Copy .env.example to .env and add your API key');
    logger.info('  • Run: echo "ATTIO_API_KEY=your_key_here" >> .env');
    logger.info('  • Check that .env exists and contains the API key');

    throw new MissingEnvironmentVariablesError(status.missingRequired);
  }

  logger.success('All required environment variables are present');

  if (status.missingOptional.length > 0) {
    logger.warn(
      'Optional environment variables not set (defaults will be used):'
    );
    status.missingOptional.forEach((key) => {
      logger.warn(`  • ${key}`);
    });
  }

  logSecretPresence({ key: 'ATTIO_API_KEY', logger });

  return {
    missingOptional: status.missingOptional,
    missingRequired: status.missingRequired,
  };
}

/**
 * Initialize environment for E2E tests
 */
export function setupE2EEnvironment(): void {
  loadEnvironmentFiles({ files: DEFAULT_ENV_FILES, logger });

  validateEnvironment();

  // Set E2E-specific environment variables (defaults if not already set)
  process.env.E2E_MODE = 'true';
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  // E2E Test Configuration defaults
  process.env.E2E_TEST_PREFIX = process.env.E2E_TEST_PREFIX || 'E2E_TEST_';
  process.env.E2E_TEST_EMAIL_DOMAIN =
    process.env.E2E_TEST_EMAIL_DOMAIN || 'example.com';
  process.env.E2E_TEST_COMPANY_DOMAIN =
    process.env.E2E_TEST_COMPANY_DOMAIN || 'example.com';
  process.env.E2E_CLEANUP_AFTER_TESTS =
    process.env.E2E_CLEANUP_AFTER_TESTS || 'true';
  process.env.E2E_SKIP_CLEANUP = process.env.E2E_SKIP_CLEANUP || 'false';

  // Performance settings
  process.env.E2E_TIMEOUT = process.env.E2E_TIMEOUT || '120000';
  process.env.E2E_MAX_RETRIES = process.env.E2E_MAX_RETRIES || '2';

  // Logging settings
  process.env.E2E_VERBOSE_LOGGING = process.env.E2E_VERBOSE_LOGGING || 'true';
  process.env.E2E_LOG_RESPONSES = process.env.E2E_LOG_RESPONSES || 'false';

  logger.success('E2E environment setup complete');
  logger.info(`  • Test prefix: ${process.env.E2E_TEST_PREFIX}`);
  logger.info(`  • Email domain: ${process.env.E2E_TEST_EMAIL_DOMAIN}`);
  logger.info(`  • Company domain: ${process.env.E2E_TEST_COMPANY_DOMAIN}`);
}

try {
  setupE2EEnvironment();
} catch (error) {
  if (error instanceof MissingEnvironmentVariablesError) {
    logger.error('E2E environment setup failed due to missing variables.');
  } else if (error instanceof Error) {
    logger.error(`E2E environment setup failed: ${error.message}`);
  }

  throw error;
}
