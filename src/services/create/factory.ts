/**
 * Create Service Factory
 *
 * Central factory for selecting between real API and mock implementations
 * based on environment flags. Provides single point of service selection logic.
 */

import type { CreateService, CreateServiceFactory } from './types.js';
import { AttioCreateService } from './attio-create.service.js';
import { MockCreateService } from './mock-create.service.js';
import { debug } from '../../utils/logger.js';

/**
 * Determines if mock data should be used based on environment flags
 * Priority: E2E_MODE > explicit USE_MOCK_DATA > other test environments
 */
export function shouldUseMockData(): boolean {
  // Respect explicit USE_MOCK_DATA first
  if (process.env.USE_MOCK_DATA === 'true') return true;
  if (process.env.USE_MOCK_DATA === 'false') return false;

  // E2E policy: do NOT auto-mock when E2E_MODE=true
  if (process.env.E2E_MODE === 'true') return false;

  // Offline/perf/unit tests (NODE_ENV=test) use mocks by default
  const result =
    process.env.OFFLINE_MODE === 'true' ||
    process.env.PERFORMANCE_TEST === 'true' ||
    process.env.NODE_ENV === 'test';

  // Debug logging for service selection transparency
  debug('CreateServiceFactory', 'Environment detection', {
    result,
    USE_MOCK_DATA: process.env.USE_MOCK_DATA,
    OFFLINE_MODE: process.env.OFFLINE_MODE,
    PERFORMANCE_TEST: process.env.PERFORMANCE_TEST,
    E2E_MODE: process.env.E2E_MODE,
    NODE_ENV: process.env.NODE_ENV,
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
  const useMocks = shouldUseMockData();

  if (useMocks) {
    debug('CreateServiceFactory', 'Selected MockCreateService');
    return new MockCreateService();
  }

  // Fail fast if real API requested but no credentials available
  // Issue #928: Support both ATTIO_API_KEY and ATTIO_ACCESS_TOKEN (OAuth alternative)
  if (!process.env.ATTIO_API_KEY && !process.env.ATTIO_ACCESS_TOKEN) {
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
