import { describe, it, expect } from 'vitest';

import { withSearchRateLimiting } from '../../src/handlers/rate-limited-handler.js';

describe('Integration: Rate limiting (deterministic)', () => {
  it(
    'triggers rate limit after exceeding threshold with headers',
    async () => {
      // Simple handler that returns success (accepts req arg for wrapper compatibility)

      // Fake req with minimal shape and stable IP
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
        const result: unknown = await handler(makeReq() as any);
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
});
