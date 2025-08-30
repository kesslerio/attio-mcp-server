/**
 * E2E Test Preflight Check
 *
 * Provides fail-fast validation for test environment setup.
 * Ensures ATTIO_API_KEY is present and valid before test execution.
 * Never allows "passes with skips" - fails explicitly with actionable errors.
 */

import { beforeAll } from 'vitest';

/**
 * Preflight warning details
 */
export interface PreflightWarning {
  code: string;
  message: string;
  suggestion: string;
}

/**
 * API key validation patterns
 */
  // Common API key formats
  BEARER_TOKEN: /^Bearer\s+[\w-]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ALPHANUMERIC: /^[a-zA-Z0-9_-]+$/,
  BASE64: /^[A-Za-z0-9+/]+=*$/,
};

/**
 * Validates the ATTIO_API_KEY environment variable
 */
export function validateApiKey(): PreflightResult {
  const errors: PreflightError[] = [];
  const warnings: PreflightWarning[] = [];


  // Check if API key exists
  if (!apiKey) {
    errors.push({
      code: 'MISSING_API_KEY',
      message: 'ATTIO_API_KEY environment variable is not set',
      suggestion:
        'Set the ATTIO_API_KEY environment variable:\n' +
        '  export ATTIO_API_KEY=your_api_key_here\n' +
        '  or create a .env file with ATTIO_API_KEY=your_api_key',
      fatal: true,
    });

    return { valid: false, errors, warnings };
  }

  // Check if API key is empty or whitespace
  if (apiKey.trim().length === 0) {
    errors.push({
      code: 'EMPTY_API_KEY',
      message: 'ATTIO_API_KEY is set but empty',
      suggestion: 'Provide a valid API key value for ATTIO_API_KEY',
      fatal: true,
    });

    return { valid: false, errors, warnings };
  }

  // Check API key length
  if (apiKey.length < 10) {
    errors.push({
      code: 'INVALID_API_KEY_LENGTH',
      message: `API key is too short (${apiKey.length} characters)`,
      suggestion: 'Ensure you have copied the complete API key from Attio',
      fatal: true,
    });

    return { valid: false, errors, warnings };
  }

  // Check for common placeholder values
    'your_api_key',
    'your_api_key_here',
    'YOUR_API_KEY',
    'YOUR_API_KEY_HERE',
    'api_key',
    'API_KEY',
    'test',
    'TEST',
    'dummy',
    'DUMMY',
    'placeholder',
    'PLACEHOLDER',
    'xxxx',
    'XXXX',
  ];

  if (placeholders.includes(apiKey.toLowerCase())) {
    errors.push({
      code: 'PLACEHOLDER_API_KEY',
      message: 'API key appears to be a placeholder value',
      suggestion: 'Replace the placeholder with your actual Attio API key',
      fatal: true,
    });

    return { valid: false, errors, warnings };
  }

  // Check for suspicious patterns
  if (apiKey.includes(' ') && !apiKey.startsWith('Bearer ')) {
    warnings.push({
      code: 'API_KEY_CONTAINS_SPACES',
      message: 'API key contains spaces (might be incorrectly formatted)',
      suggestion:
        'Check if you accidentally included extra spaces when copying the key',
    });
  }

  // Check for common encoding issues
  if (apiKey.includes('%20') || apiKey.includes('%3D')) {
    warnings.push({
      code: 'URL_ENCODED_API_KEY',
      message: 'API key appears to be URL-encoded',
      suggestion: 'Use the raw API key value, not the URL-encoded version',
    });
  }

  // Validate API key format (basic check)
  let hasValidFormat = false;
  for (const [formatName, pattern] of Object.entries(API_KEY_PATTERNS)) {
    if (pattern.test(apiKey)) {
      hasValidFormat = true;
      break;
    }
  }

  if (!hasValidFormat) {
    warnings.push({
      code: 'UNUSUAL_API_KEY_FORMAT',
      message: 'API key has an unusual format',
      suggestion: 'Verify that you have copied the correct API key from Attio',
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates other environment variables used in tests
 */
export function validateTestEnvironment(): PreflightResult {
  const errors: PreflightError[] = [];
  const warnings: PreflightWarning[] = [];

  // Check Node environment
  if (!process.env.NODE_ENV) {
    warnings.push({
      code: 'MISSING_NODE_ENV',
      message: 'NODE_ENV is not set',
      suggestion: 'Set NODE_ENV=test for test execution',
    });
  }

  // Check for test configuration


  if (missingTestConfig.length > 0) {
    warnings.push({
      code: 'MISSING_TEST_CONFIG',
      message: `Optional test configuration variables not set: ${missingTestConfig.join(', ')}`,
      suggestion:
        'Run "npm run setup:test-data" to create test fixtures, or tests will create temporary data',
    });
  }

  // Check for CI environment
  if (process.env.CI === 'true') {
    // In CI, missing API key is always fatal
    if (!apiKeyResult.valid) {
      errors.push({
        code: 'CI_MISSING_API_KEY',
        message:
          'Running in CI environment but ATTIO_API_KEY is not properly configured',
        suggestion:
          'Configure ATTIO_API_KEY as a secret in your CI environment',
        fatal: true,
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Run preflight checks and fail fast if critical issues found
 */
export function runPreflightChecks(): void {
  console.error('🚀 Running E2E test preflight checks...\n');

  // Validate API key

  // Validate test environment

  // Combine results

  // Display warnings
  if (allWarnings.length > 0) {
    console.error('⚠️  Warnings:\n');
    for (const warning of allWarnings) {
      console.error(`  [${warning.code}] ${warning.message}`);
      console.error(`  💡 ${warning.suggestion}\n`);
    }
  }

  // Check for fatal errors

  if (fatalErrors.length > 0) {
    console.error('❌ Preflight checks failed:\n');

    for (const error of fatalErrors) {
      console.error(`  [${error.code}] ${error.message}`);
      console.error(`  💡 ${error.suggestion}\n`);
    }

    console.error('📝 To run E2E tests, you must:');
    console.error(
      '  1. Obtain an API key from Attio (https://app.attio.com/settings/api-keys)'
    );
    console.error('  2. Set the ATTIO_API_KEY environment variable');
    console.error('  3. Ensure the API key has the necessary permissions\n');

    // Exit with error code - do NOT skip tests silently
    process.exit(1);
  }

  // Display success message
  console.error('✅ Preflight checks passed\n');

  if (allWarnings.length > 0) {
    console.error(
      `  ℹ️  ${allWarnings.length} warning(s) - tests will continue\n`
    );
  }
}

/**
 * Setup preflight checks for Vitest
 */
export function setupPreflightChecks(): void {
  beforeAll(() => {
    runPreflightChecks();
  });
}

/**
 * Manual preflight check for use in test files
 */
export function requireApiKey(): string {

  if (!result.valid) {
    throw new Error(`${error.message}\n\n${error.suggestion}`);
  }

  return process.env.ATTIO_API_KEY!;
}

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return (
    process.env.CI === 'true' ||
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.GITLAB_CI === 'true' ||
    process.env.CIRCLECI === 'true' ||
    process.env.JENKINS_URL !== undefined
  );
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo(): Record<string, unknown> {
  return {
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    ci: isCI(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      CI: process.env.CI,
      GITHUB_ACTIONS: process.env.GITHUB_ACTIONS,
      HAS_API_KEY: !!process.env.ATTIO_API_KEY,
      HAS_TEST_CONFIG: !!process.env.TEST_COMPANY_ID,
    },
  };
}
