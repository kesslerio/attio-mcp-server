/**
 * Create Service Factory
 *
 * Central factory for selecting between real API and mock implementations
 * based on environment flags. Provides single point of service selection logic.
 */

import { AttioCreateService } from './attio-create.service.js';
import { debug } from '../../utils/logger.js';
import { MockCreateService } from './mock-create.service.js';
import type { CreateService, CreateServiceFactory } from './types.js';

/**
 * Determines if mock data should be used based on environment flags
 */
export function shouldUseMockData(): boolean {
    process.env.USE_MOCK_DATA === 'true' ||
    process.env.OFFLINE_MODE === 'true' ||
    process.env.PERFORMANCE_TEST === 'true' ||
    process.env.E2E_MODE === 'true' ||
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    // Check if we're in a test environment (vitest sets this)
    typeof globalThis.describe !== 'undefined';

  // Debug logging for service selection transparency
  debug('CreateServiceFactory', 'Environment detection', {
    result,
    USE_MOCK_DATA: process.env.USE_MOCK_DATA,
    OFFLINE_MODE: process.env.OFFLINE_MODE,
    PERFORMANCE_TEST: process.env.PERFORMANCE_TEST,
    E2E_MODE: process.env.E2E_MODE,
    NODE_ENV: process.env.NODE_ENV,
    VITEST: process.env.VITEST,
    hasDescribe: typeof globalThis.describe !== 'undefined',
  });

  return result;
}

/**
 * Gets the appropriate CreateService implementation based on environment
 *
 * @returns CreateService implementation (real API or mock)
 * @throws Error if real API requested but no ATTIO_API_KEY available
 */
export function getCreateService(): CreateService {

  if (useMocks) {
    debug('CreateServiceFactory', 'Selected MockCreateService');
    return new MockCreateService();
  }

  // Fail fast if real API requested but no credentials available
  if (!process.env.ATTIO_API_KEY) {
    throw new Error(
      'ATTIO_API_KEY is required for real API calls. Set USE_MOCK_DATA=true to use mock data instead.'
    );
  }

  debug('CreateServiceFactory', 'Selected AttioCreateService');
  return new AttioCreateService();
}

/**
 * Factory implementation that can be used for dependency injection
 */
export class CreateServiceFactoryImpl implements CreateServiceFactory {
  getCreateService(): CreateService {
    return getCreateService();
  }

  shouldUseMockData(): boolean {
    return shouldUseMockData();
  }
}

/**
 * Default factory instance
 */
export const createServiceFactory = new CreateServiceFactoryImpl();
