/**
 * Guardrails and invariants for E2E test enforcement
 *
 * These guards prevent improper configurations and enforce
 * architectural constraints during E2E testing.
 */

/**
 * Asserts that mock service usage is forbidden under E2E+real API mode
 *
 * @throws {Error} If called in E2E mode with real API
 */
export function assertNoMockInE2E(): void {
  if (
    process.env.E2E_MODE === 'true' &&
    process.env.USE_MOCK_DATA === 'false'
  ) {
    throw new Error('Mock service usage forbidden under E2E+real API mode');
  }
}

/**
 * Route enforcement for operations that must go through specific resource types
 *
 * @param actualRoute - The actual resource_type being used
 * @param expectedRoute - The expected resource_type for this operation
 * @throws {Error} If route doesn't match expectation
 */
export function enforceExpectedRoute(
  actualRoute: string,
  expectedRoute: string
): void {
  if (actualRoute !== expectedRoute) {
    throw new Error(
      `Route override: expected ${expectedRoute}, got ${actualRoute}`
    );
  }
}

import type { ListMembershipParams } from '../types/service-types.js';

