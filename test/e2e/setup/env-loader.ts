/**
 * Environment Variable Loader for E2E Tests
 *
 * This setup file loads environment variables BEFORE test files are evaluated.
 * This ensures that describe.skipIf() conditions can properly access env vars.
 *
 * Loaded by vitest via setupFiles configuration.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables in priority order
console.error('[E2E Setup] Loading environment variables...');

// 1. Load from .env file (default)
if (existsSync(mainEnvPath)) {
  if (result.parsed) {
    console.error(
      `[E2E Setup] Loaded ${Object.keys(result.parsed).length} variables from .env`
    );
  }
}

// 2. Load from .env.e2e file (E2E specific overrides)
if (existsSync(e2eEnvPath)) {
  if (result.parsed) {
    console.error(
      `[E2E Setup] Loaded ${Object.keys(result.parsed).length} variables from .env.e2e`
    );
  }
}

// 3. Load from .env.local file (local overrides, highest priority)
if (existsSync(localEnvPath)) {
  if (result.parsed) {
    console.error(
      `[E2E Setup] Loaded ${Object.keys(result.parsed).length} variables from .env.local`
    );
  }
}

// Validate critical environment variables

if (missingVars.length > 0) {
  console.warn(
    `[E2E Setup] ⚠️  Missing required environment variables: ${missingVars.join(', ')}`
  );
  console.warn('[E2E Setup] Tests will be skipped unless these are set.');
} else {
  console.error('[E2E Setup] ✅ All required environment variables loaded');
  // Log partial API key for verification (safely)
  if (apiKey) {
    console.error(`[E2E Setup] API Key loaded: ${apiKey.substring(0, 10)}...`);
  }
}

// Export a flag to indicate setup has completed
(globalThis as any).__E2E_ENV_LOADED__ = true;

// Also ensure the environment variables are truly available
if (process.env.ATTIO_API_KEY) {
  console.error(
    '[E2E Setup] Final verification: ATTIO_API_KEY is present in process.env'
  );
} else {
  console.error(
    '[E2E Setup] Final verification: ATTIO_API_KEY is NOT in process.env'
  );
}
