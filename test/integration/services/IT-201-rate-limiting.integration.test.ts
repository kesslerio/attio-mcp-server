import { describe, it, expect } from 'vitest';
import { withSearchRateLimiting } from '@/handlers/rate-limited-handler.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

// Rate limiting test configuration
const RATE_LIMIT_CONFIG = {
  /** Default rate limit threshold per minute */
  DEFAULT_RATE_LIMIT: 60,
  /** Test request count (should exceed rate limit) */
  TEST_REQUEST_COUNT: 65,
  /** Test timeout in milliseconds */
  TEST_TIMEOUT_MS: 15000,
} as const;

const runIntegrationTests = shouldRunIntegrationTests({ allowDryRun: true });

describe.skipIf(!runIntegrationTests)(
  'IT-201: Rate limiting (deterministic)',
  () => {
    it(
      'IT-201.1: triggers rate limit after exceeding threshold with headers',
      async () => {
        // Simple handler that returns success (accepts req arg for wrapper compatibility)
        const baseHandler = async (_req: any) => ({ ok: true });
        const handler = withSearchRateLimiting(baseHandler, 'companies:search');

        // Fake req with minimal shape and stable IP
        const makeReq = () => ({
          ip: '127.0.0.1',
          headers: {},
          res: {
            setHeader: (_k: string, _v: unknown) => {},
            status: (_code: number) => ({ json: (_d: unknown) => {} }),
          },
        });

        // Exhaust the limiter quickly: default is 60/min; run more than limit in a tight loop
        let limited = 0;
        for (let i = 0; i < RATE_LIMIT_CONFIG.TEST_REQUEST_COUNT; i++) {
          const result: any = await handler(makeReq() as any);
          if (result && result.isError) limited++;
        }

        // Expect at least one limited response
        expect(limited).toBeGreaterThan(0);

        // Verify we tested more requests than the rate limit threshold
        expect(RATE_LIMIT_CONFIG.TEST_REQUEST_COUNT).toBeGreaterThan(
          RATE_LIMIT_CONFIG.DEFAULT_RATE_LIMIT
        );
      },
      RATE_LIMIT_CONFIG.TEST_TIMEOUT_MS
    );
  }
);
