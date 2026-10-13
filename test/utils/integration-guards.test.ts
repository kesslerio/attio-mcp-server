import { afterEach, describe, expect, it, vi } from 'vitest';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

afterEach(() => vi.unstubAllEnvs());
describe('live integration guards', () => {
  it.each(['', ' ', undefined])('skips a missing/blank API key (%s)', (key) => {
    vi.stubEnv('ATTIO_API_KEY', key);
    vi.stubEnv('SKIP_INTEGRATION_TESTS', 'false');
    expect(shouldRunIntegrationTests()).toBe(false);
  });
  it('allows the live tier only with a key and no skip override', () => {
    vi.stubEnv('ATTIO_API_KEY', 'fake-contract-key');
    vi.stubEnv('SKIP_INTEGRATION_TESTS', 'false');
    expect(shouldRunIntegrationTests()).toBe(true);
    vi.stubEnv('SKIP_INTEGRATION_TESTS', 'TRUE');
    expect(shouldRunIntegrationTests()).toBe(false);
    expect(shouldRunIntegrationTests({ allowDryRun: true })).toBe(false);
  });
  it('keeps the explicit deterministic dry-run exception separate', () => {
    vi.stubEnv('ATTIO_API_KEY', '');
    vi.stubEnv('SKIP_INTEGRATION_TESTS', 'false');
    expect(shouldRunIntegrationTests({ allowDryRun: true })).toBe(true);
    expect(shouldRunIntegrationTests()).toBe(false);
  });
});
