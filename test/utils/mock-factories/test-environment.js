/**
 * Test Environment Detection Utilities
 *
 * Centralized utilities for detecting test environments and determining
 * when mock data should be used instead of real API calls.
 *
 * This module replaces scattered test environment checks throughout
 * the production code with a clean, centralized detection system.
 */
/**
 * Detects if the current execution context is within a test environment.
 *
 * This function checks multiple environment indicators to determine
 * if we're running in a test context:
 * - NODE_ENV=test
 * - VITEST execution context
 * - JEST execution context
 * - CI environment detection
 * - Global test functions availability
 *
 * @returns true if running in test environment, false otherwise
 *
 * @example
 * ```typescript
 * if (isTestEnvironment()) {
 *   console.log('Running in test mode');
 * }
 * ```
 */
export function isTestEnvironment() {
    return (process.env.NODE_ENV === 'test' ||
        process.env.VITEST === 'true' ||
        process.env.VITEST !== undefined || // Vitest sets this to "true" or other values
        process.env.E2E_MODE === 'true' ||
        process.env.JEST_WORKER_ID !== undefined ||
        process.env.CI === 'true' ||
        typeof global !== 'undefined' && (typeof global.it === 'function' ||
            typeof global.describe === 'function' ||
            typeof global.beforeEach === 'function' ||
            typeof global.afterEach === 'function'));
}
/**
 * Determines if mock data should be used instead of real API calls.
 *
 * This provides a centralized decision point for when to use mock data:
 * - Always in test environments
 * - When explicitly enabled via environment variable
 * - During development when offline mode is enabled
 *
 * @returns true if mock data should be used, false otherwise
 *
 * @example
 * ```typescript
 * if (shouldUseMockData()) {
 *   return TaskMockFactory.createTask(overrides);
 * } else {
 *   return await realApiCall(params);
 * }
 * ```
 */
export function shouldUseMockData() {
    const isTest = isTestEnvironment();
    const useMock = process.env.USE_MOCK_DATA === 'true';
    const offline = process.env.OFFLINE_MODE === 'true';
    const e2eMode = process.env.E2E_MODE === 'true';
    const result = isTest || useMock || offline || e2eMode;
    // Only log in development or when verbose testing is enabled
    if (isDevelopmentEnvironment() || process.env.VERBOSE_TESTS === 'true') {
        console.log('🔍 shouldUseMockData check:', {
            isTestEnvironment: isTest,
            USE_MOCK_DATA: process.env.USE_MOCK_DATA,
            OFFLINE_MODE: process.env.OFFLINE_MODE,
            E2E_MODE: process.env.E2E_MODE,
            NODE_ENV: process.env.NODE_ENV,
            VITEST: process.env.VITEST,
            result
        });
    }
    return result;
}
/**
 * Checks if we're in a development environment with debug logging enabled.
 *
 * Used to determine when debug logging and development-specific code
 * should be active. This replaces direct NODE_ENV checks in production code.
 *
 * @returns true if in development mode, false otherwise
 */
export function isDevelopmentEnvironment() {
    return (process.env.NODE_ENV === 'development' ||
        process.env.DEBUG === 'true' ||
        process.env.VERBOSE_LOGGING === 'true');
}
/**
 * Detects if running in CI/CD pipeline environment.
 *
 * Useful for enabling CI-specific behaviors like:
 * - Extended timeouts
 * - Different logging levels
 * - Mock data preferences
 *
 * @returns true if running in CI environment, false otherwise
 */
export function isContinuousIntegrationEnvironment() {
    return (process.env.CI === 'true' ||
        process.env.CONTINUOUS_INTEGRATION === 'true' ||
        // Common CI environment indicators
        !!(process.env.GITHUB_ACTIONS ||
            process.env.TRAVIS ||
            process.env.CIRCLECI ||
            process.env.JENKINS_URL ||
            process.env.BUILDKITE ||
            process.env.GITLAB_CI));
}
/**
 * Determines test execution context for appropriate mock selection.
 *
 * Different test contexts may need different mock behaviors:
 * - unit: Minimal mocks for fast execution
 * - integration: More realistic mocks with API-like responses
 * - e2e: Full mock scenarios matching real workflows
 *
 * @returns the detected test context
 */
export function getTestContext() {
    if (!isTestEnvironment()) {
        return 'production';
    }
    // Check for E2E test indicators
    if (process.env.TEST_TYPE === 'e2e' ||
        process.env.E2E_TESTS === 'true' ||
        process.cwd().includes('/test/e2e/') ||
        // Check if current test file path indicates E2E
        global.__filename?.includes('/test/e2e/')) {
        return 'e2e';
    }
    // Check for integration test indicators
    if (process.env.TEST_TYPE === 'integration' ||
        process.env.INTEGRATION_TESTS === 'true' ||
        process.cwd().includes('/test/integration/') ||
        global.__filename?.includes('/test/integration/')) {
        return 'integration';
    }
    // Default to unit tests
    return 'unit';
}
/**
 * Test environment configuration utilities
 */
export const TestEnvironment = {
    /**
     * Check if current environment is test
     */
    isTest: isTestEnvironment,
    /**
     * Check if mock data should be used
     */
    useMocks: shouldUseMockData,
    /**
     * Check if in development mode
     */
    isDev: isDevelopmentEnvironment,
    /**
     * Check if in CI environment
     */
    isCI: isContinuousIntegrationEnvironment,
    /**
     * Get current test context
     */
    getContext: getTestContext,
    /**
     * Quick environment checks
     */
    get isUnit() { return getTestContext() === 'unit'; },
    get isIntegration() { return getTestContext() === 'integration'; },
    get isE2E() { return getTestContext() === 'e2e'; },
    get isProduction() { return getTestContext() === 'production'; },
    /**
     * Environment-specific logging helper
     */
    log: (message, ...args) => {
        if (isDevelopmentEnvironment() || process.env.VERBOSE_TESTS === 'true') {
            console.log(`[${getTestContext().toUpperCase()}] ${message}`, ...args);
        }
    },
    /**
     * Environment-specific warning helper
     */
    warn: (message, ...args) => {
        if (isDevelopmentEnvironment() || isTestEnvironment()) {
            console.warn(`[${getTestContext().toUpperCase()}] ${message}`, ...args);
        }
    }
};
//# sourceMappingURL=test-environment.js.map