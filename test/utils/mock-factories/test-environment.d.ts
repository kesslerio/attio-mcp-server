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
export declare function isTestEnvironment(): boolean;
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
export declare function shouldUseMockData(): boolean;
/**
 * Checks if we're in a development environment with debug logging enabled.
 *
 * Used to determine when debug logging and development-specific code
 * should be active. This replaces direct NODE_ENV checks in production code.
 *
 * @returns true if in development mode, false otherwise
 */
export declare function isDevelopmentEnvironment(): boolean;
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
export declare function isContinuousIntegrationEnvironment(): boolean;
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
export declare function getTestContext():
  | 'unit'
  | 'integration'
  | 'e2e'
  | 'production';
/**
 * Test environment configuration utilities
 */
export declare const TestEnvironment: {
  /**
   * Check if current environment is test
   */
  readonly isTest: typeof isTestEnvironment;
  /**
   * Check if mock data should be used
   */
  readonly useMocks: typeof shouldUseMockData;
  /**
   * Check if in development mode
   */
  readonly isDev: typeof isDevelopmentEnvironment;
  /**
   * Check if in CI environment
   */
  readonly isCI: typeof isContinuousIntegrationEnvironment;
  /**
   * Get current test context
   */
  readonly getContext: typeof getTestContext;
  /**
   * Quick environment checks
   */
  readonly isUnit: boolean;
  readonly isIntegration: boolean;
  readonly isE2E: boolean;
  readonly isProduction: boolean;
  /**
   * Environment-specific logging helper
   */
  readonly log: (message: string, ...args: any[]) => void;
  /**
   * Environment-specific warning helper
   */
  readonly warn: (message: string, ...args: any[]) => void;
};
//# sourceMappingURL=test-environment.d.ts.map
