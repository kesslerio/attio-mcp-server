interface ShouldRunIntegrationTestsOptions {
  /**
   * Allows deterministic tests that simulate integration behavior without
   * requiring real API credentials (e.g. rate limiting dry runs).
   */
  allowDryRun?: boolean;
}

const hasAttioApiKey = (): boolean => {
  const apiKey = process.env.ATTIO_API_KEY;
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
};

const isIntegrationSkipped = (): boolean => {
  const skipFlag = process.env.SKIP_INTEGRATION_TESTS;
  return typeof skipFlag === 'string' && skipFlag.toLowerCase() === 'true';
};

/**
 * Determines whether integration tests should run in the current environment.
 *
 * Conditions:
 * - Requires ATTIO_API_KEY to be present unless {@link allowDryRun} is enabled.
 * - Respects SKIP_INTEGRATION_TESTS=true to force skipping all integration suites.
 */
export const shouldRunIntegrationTests = (
  options: ShouldRunIntegrationTestsOptions = {}
): boolean => {
  if (isIntegrationSkipped()) {
    return false;
  }

  if (options.allowDryRun) {
    return true;
  }

  return hasAttioApiKey();
};

export type { ShouldRunIntegrationTestsOptions };
