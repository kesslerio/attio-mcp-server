/**
 * Environment Variable Loader for E2E Tests
 *
 * This setup file loads environment variables BEFORE test files are evaluated.
 * This ensures that describe.skipIf() conditions can properly access env vars.
 *
 * Loaded by vitest via setupFiles configuration.
 */

import {
  collectEnvironmentStatus,
  DEFAULT_ENV_FILES,
  loadEnvironmentFiles,
  logSecretPresence,
} from '../utils/environment.js';
import { createE2ELogger } from '../utils/logger.js';

const logger = createE2ELogger('E2E Setup');

logger.info('Loading environment variables for E2E tests...');

loadEnvironmentFiles({ files: DEFAULT_ENV_FILES, logger });

const status = collectEnvironmentStatus(['ATTIO_API_KEY']);

if (status.missingRequired.length > 0) {
  logger.warn(
    `Missing required environment variables: ${status.missingRequired.join(', ')}`
  );
  logger.warn('Tests will be skipped unless these are set.');
} else {
  logger.success('All required environment variables loaded');
  logSecretPresence({ key: 'ATTIO_API_KEY', logger });
}

(globalThis as any).__E2E_ENV_LOADED__ = true;

if (status.presentRequired.includes('ATTIO_API_KEY')) {
  logger.info('Final verification: ATTIO_API_KEY is present in process.env');
} else {
  logger.warn('Final verification: ATTIO_API_KEY is NOT in process.env');
}
