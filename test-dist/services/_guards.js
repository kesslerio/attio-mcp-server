/**
 * Guardrails and invariants for E2E test enforcement
 *
 * These guards prevent improper configurations and enforce
 * architectural constraints during E2E testing.
 */
/**
 * Asserts that MockService usage is forbidden under E2E+real API mode
 *
 * @throws {Error} If called in E2E mode with real API
 */
export function assertNoMockInE2E() {
    if (process.env.E2E_MODE === 'true' &&
        process.env.USE_MOCK_DATA === 'false') {
        throw new Error('MockService usage forbidden under E2E+real API mode');
    }
}
/**
 * Route enforcement for operations that must go through specific resource types
 *
 * @param actualRoute - The actual resource_type being used
 * @param expectedRoute - The expected resource_type for this operation
 * @throws {Error} If route doesn't match expectation
 */
export function enforceExpectedRoute(actualRoute, expectedRoute) {
    if (actualRoute !== expectedRoute) {
        throw new Error(`Route override: expected ${expectedRoute}, got ${actualRoute}`);
    }
}
/**
 * Validates that list membership operations go through RECORDS route
 *
 * @param params - Search parameters
 * @throws {Error} If list_membership used with wrong resource type in E2E
 */
export function assertListMembershipRoute(params) {
    if (process.env.E2E_MODE === 'true' && params?.filters?.list_membership) {
        const resourceType = String(params.resource_type || '').toLowerCase();
        if (resourceType !== 'records') {
            throw new Error('Wrong route: list_membership must go through RECORDS');
        }
    }
}
