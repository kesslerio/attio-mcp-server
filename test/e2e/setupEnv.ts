/**
 * E2E Environment Setup and Validation
 *
 * Ensures required environment variables are loaded before any tests run.
 * Prevents the "↓ skipped" issue by failing fast with clear error messages.
 */

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

/**
 * Validate environment variables and fail fast if any required ones are missing
 */
function validateEnvironment(): void {
  console.log('🔍 Validating E2E environment variables...');

  // Check required variables
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => {
      console.error(`   • ${key}`);
    });
    console.error('\n💡 Solutions:');
    console.error('   • Copy .env.example to .env and add your API key');
    console.error('   • Run: echo "ATTIO_API_KEY=your_key_here" >> .env');
    console.error('   • Check that .env exists and contains the API key');

    process.exit(1);
  }

  // Log successful validation
  console.log('✅ All required environment variables are present');

  // Check optional variables and warn if missing
  const missingOptional = OPTIONAL_ENV_VARS.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    console.log(
      '⚠️  Optional environment variables not set (will use defaults):'
    );
    missingOptional.forEach((key) => {
      console.log(`   • ${key}`);
    });
  }

  // Log loaded API key (redacted)
  const apiKey = process.env.ATTIO_API_KEY!;
  const redactedKey =
    apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
  console.log(`🔑 API key loaded: ${redactedKey}`);
}

/**
 * Initialize environment for E2E tests
 */
export function setupE2EEnvironment(): void {
  // Validate all required environment variables
  validateEnvironment();

  // Set E2E-specific environment variables (defaults if not already set)
  process.env.E2E_MODE = 'true';
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  // E2E Test Configuration defaults
  process.env.E2E_TEST_PREFIX = process.env.E2E_TEST_PREFIX || 'E2E_TEST_';
  process.env.E2E_TEST_EMAIL_DOMAIN =
    process.env.E2E_TEST_EMAIL_DOMAIN || 'e2e.test';
  process.env.E2E_TEST_COMPANY_DOMAIN =
    process.env.E2E_TEST_COMPANY_DOMAIN || 'e2e-company.test';
  process.env.E2E_CLEANUP_AFTER_TESTS =
    process.env.E2E_CLEANUP_AFTER_TESTS || 'true';
  process.env.E2E_SKIP_CLEANUP = process.env.E2E_SKIP_CLEANUP || 'false';

  // Performance settings
  process.env.E2E_TIMEOUT = process.env.E2E_TIMEOUT || '120000';
  process.env.E2E_MAX_RETRIES = process.env.E2E_MAX_RETRIES || '2';

  // Logging settings
  process.env.E2E_VERBOSE_LOGGING = process.env.E2E_VERBOSE_LOGGING || 'true';
  process.env.E2E_LOG_RESPONSES = process.env.E2E_LOG_RESPONSES || 'false';

  console.log('🎯 E2E environment setup complete');
  console.log(`   • Test prefix: ${process.env.E2E_TEST_PREFIX}`);
  console.log(`   • Email domain: ${process.env.E2E_TEST_EMAIL_DOMAIN}`);
  console.log(`   • Company domain: ${process.env.E2E_TEST_COMPANY_DOMAIN}`);
}

// Auto-run validation when this module is imported
setupE2EEnvironment();

// Export for explicit use if needed
export { validateEnvironment };
