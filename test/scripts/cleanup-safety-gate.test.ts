/**
 * Unit tests for the cleanup safety gate (#620 review follow-up).
 *
 * runCleanupPass handlers are dependency-injected so the
 * SAFETY_MAX_DELETIONS gate can be verified without network access or
 * live deletion.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import type {
  AttioRecord,
  CleanupOptions,
  ResourceSummary,
} from '../../scripts/cleanup/core/types.js';
import {
  runCleanupPass,
  type CleanupHandlers,
} from '../../scripts/cleanup/core/orchestrator.js';
import {
  runCleanupWithSafety,
  SAFETY_MAX_DELETIONS,
} from '../../scripts/cleanup/core/main.js';

const TOKEN = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

function fakeSummary(found: number, deleted = 0): ResourceSummary {
  return { type: 'tasks', found, deleted, errors: 0, items: [] };
}

function handlersFor(foundPerResource: number): CleanupHandlers & {
  applySafetyChain: ReturnType<typeof vi.fn>;
} {
  return {
    getClient: () => ({ delete: vi.fn() }) as unknown as AxiosInstance,
    testConnection: vi.fn(async () => true),
    validatePermissions: vi.fn(async () => undefined),
    applySafetyChain: vi.fn(async () => fakeSummary(foundPerResource)),
  };
}

function options(overrides: Partial<CleanupOptions> = {}): CleanupOptions {
  return {
    dryRun: true,
    live: false,
    resources: ['tasks'],
    apiToken: TOKEN,
    parallel: 5,
    verbose: false,
    force: false,
    ...overrides,
  };
}

describe('SAFETY_MAX_DELETIONS gate (#620 review C6)', () => {
  it('exports the 100-deletion safety limit', () => {
    expect(SAFETY_MAX_DELETIONS).toBe(100);
  });

  it('live run over the limit throws before pass 2 and never deletes', async () => {
    const handlers = handlersFor(150);

    await expect(
      runCleanupWithSafety(options({ dryRun: false, live: true }), handlers)
    ).rejects.toThrow(/SAFETY LIMIT EXCEEDED/);

    // Gate refusal must happen before the live pass: exactly one
    // (dry-run) pass ran, and it was not a delete pass.
    expect(handlers.applySafetyChain).toHaveBeenCalledTimes(1);
    expect(handlers.applySafetyChain).toHaveBeenCalledWith(
      expect.anything(),
      'tasks',
      TOKEN,
      [],
      true, // dryRun
      5
    );
  });

  it('live run under the limit completes and reports deletions', async () => {
    const handlers = handlersFor(5);
    // Second call is the live pass; make it report deletions.
    handlers.applySafetyChain
      .mockResolvedValueOnce(fakeSummary(5, 0))
      .mockResolvedValueOnce(fakeSummary(5, 5));

    const result = await runCleanupWithSafety(
      options({ dryRun: false, live: true }),
      handlers
    );

    expect(result.totalDeleted).toBe(5);
    // Both passes ran through the SAME function (fetch-identity invariant).
    expect(handlers.applySafetyChain).toHaveBeenCalledTimes(2);
    const calls = handlers.applySafetyChain.mock.calls;
    expect(calls[0][4]).toBe(true); // pass 1 dry-run
    expect(calls[1][4]).toBe(false); // pass 2 live
  });

  it('dry-run request performs exactly one pass and reports zero deleted', async () => {
    const handlers = handlersFor(50);

    const result = await runCleanupWithSafety(options(), handlers);

    expect(handlers.applySafetyChain).toHaveBeenCalledTimes(1);
    expect(result.totalFound).toBe(50);
    // Dry runs report found-but-not-deleted: zero deleted, nothing removed.
    expect(result.totalDeleted).toBe(0);
  });

  it('--force overrides the gate and runs the live pass', async () => {
    const handlers = handlersFor(150);

    const result = await runCleanupWithSafety(
      options({ dryRun: false, live: true, force: true }),
      handlers
    );

    expect(handlers.applySafetyChain).toHaveBeenCalledTimes(2);
    expect(result.totalFound).toBe(150);
  });

  it('a mid-list failure in pass 2 propagates without extra attempts', async () => {
    const handlers = handlersFor(5);
    handlers.applySafetyChain
      .mockResolvedValueOnce(fakeSummary(5, 0))
      .mockRejectedValueOnce(new Error('deletion failed mid-list'));

    await expect(
      runCleanupWithSafety(options({ dryRun: false, live: true }), handlers)
    ).rejects.toThrow('deletion failed mid-list');
    expect(handlers.applySafetyChain).toHaveBeenCalledTimes(2);
  });
});

describe('runCleanupPass validation (C4)', () => {
  it('rejects an unsupported resource before touching the client', async () => {
    const handlers = handlersFor(1);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((
      code?: number
    ) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    try {
      await expect(
        runCleanupPass(options({ resources: ['bogus'] }), false, handlers)
      ).rejects.toThrow('process.exit:1');
      expect(handlers.testConnection).not.toHaveBeenCalled();
    } finally {
      exitSpy.mockRestore();
    }
  });
});
