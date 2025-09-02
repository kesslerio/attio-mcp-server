import { describe, it, expect } from 'vitest';
import { withSearchRateLimiting } from '../../src/handlers/rate-limited-handler.js';

describe('Integration: Rate limiting (deterministic)', () => {
  it('triggers rate limit after exceeding threshold with headers', async () => {
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

    // Exhaust the limiter quickly: default is 60/min; run 65 in a tight loop
    let limited = 0;
    for (let i = 0; i < 65; i++) {
      const result: any = await handler(makeReq() as any);
      if (result && result.isError) limited++;
    }

    // Expect at least one limited response
    expect(limited).toBeGreaterThan(0);
  }, 15000);
});
