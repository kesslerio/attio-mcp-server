/**
 * Regression coverage for the cleanup interval of EnhancedPerformanceTracker.
 *
 * Issue #1288: the interval was created ref'd, so a stdio server whose client
 * went away never drained its event loop and stayed resident forever. The fix
 * releases the interval's hold on the loop without changing its schedule.
 *
 * Two properties have to be pinned separately, because the fix is allowed to
 * change exactly one of them:
 *   - the loop hold:  released (this is the fix)
 *   - the schedule:   unchanged, still created, still fires, never cleared
 *
 * Scheduling is asserted here at the construction boundary. Observing a real
 * five-minute tick is not viable in any lane (per-test budgets are 10s and 30s),
 * so a faked clock stands in for wall time. The subprocess behaviour — a real
 * process actually exiting — is proven in test/lifecycle/stdio-server-exit.test.ts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { EnhancedPerformanceTracker } from '@/middleware/performance-enhanced.js';

const MODULE_PATH = '@/middleware/performance-enhanced.js';
const CLEANUP_PERIOD_MS = 5 * 60 * 1000;
/** Well past the cleanup tick, so pruning it would be a bug, not a race. */
const LONG_LIVED_TTL_MS = CLEANUP_PERIOD_MS * 3;
/** Well short of it, so the cleanup pass has something expired to remove. */
const EXPIRED_TTL_MS = 1000;

/** Private state the pruning assertions have to reach. Only key presence is
 *  exercised, so the value shape is deliberately not restated here. */
type TrackerInternals = {
  cache404: Map<string, unknown>;
};

/** One interval the module under test asked for, and what happened to it. */
interface RecordedInterval {
  delay: number | undefined;
  released: () => boolean;
  handleHasRef: () => boolean;
}

/**
 * Import the tracker with a wrapped setInterval that records what was asked for
 * and decorates the handle it hands back.
 *
 * The decoration has to happen inside the wrapper: the release is called
 * synchronously inside the private constructor during import, so there is no
 * later point at which the call can still be observed.
 */
async function importTrackerWithIntervalSpy(): Promise<{
  tracker: EnhancedPerformanceTracker;
  intervals: RecordedInterval[];
  clearedHandles: unknown[];
}> {
  const intervals: RecordedInterval[] = [];
  const clearedHandles: unknown[] = [];

  const realSetInterval = globalThis.setInterval;
  const realClearInterval = globalThis.clearInterval;

  vi.spyOn(globalThis, 'setInterval').mockImplementation(((
    fn: TimerHandler,
    delay?: number,
    ...args: unknown[]
  ) => {
    // The global signature is an overload set whose first overload reports
    // `number`; under Node's types the real handle is a Timeout object.
    const handle = realSetInterval(
      fn,
      delay,
      ...args
    ) as unknown as NodeJS.Timeout;

    let released = false;
    const originalUnref = handle.unref?.bind(handle);
    handle.unref = () => {
      released = true;
      originalUnref?.();
      return handle;
    };

    intervals.push({
      delay,
      released: () => released,
      handleHasRef: () =>
        typeof handle.hasRef === 'function' ? handle.hasRef() : true,
    });

    return handle;
    // The global signature is an overload set that a single implementation
    // cannot structurally match; the shape actually handed back is correct.
  }) as unknown as typeof globalThis.setInterval);

  // Node's clearTimeout also cancels a setInterval handle, so both must feed the
  // same ledger. Spying only clearInterval leaves a real hole: cancelling the
  // cleanup pass via clearTimeout would keep this guard green.
  const recordClear = (real: (handle: unknown) => void) =>
    ((handle: unknown) => {
      clearedHandles.push(handle);
      return real(handle);
    }) as unknown as typeof globalThis.clearInterval;

  const realClearTimeout = globalThis.clearTimeout;
  vi.spyOn(globalThis, 'clearInterval').mockImplementation(
    recordClear(realClearInterval)
  );
  vi.spyOn(globalThis, 'clearTimeout').mockImplementation(
    recordClear(realClearTimeout) as unknown as typeof globalThis.clearTimeout
  );

  const imported = await import(MODULE_PATH);
  return {
    tracker: imported.enhancedPerformanceTracker,
    intervals,
    clearedHandles,
  };
}

const cleanupIntervals = (intervals: RecordedInterval[]): RecordedInterval[] =>
  intervals.filter((i) => Number(i.delay) === CLEANUP_PERIOD_MS);

describe('EnhancedPerformanceTracker cleanup interval (#1288)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.stubEnv('MCP_SERVER_MODE', 'true');
  });

  afterEach(() => {
    // Order matters: the spies captured the *fake* implementations, since
    // spyOn ran after useFakeTimers. Restoring first, then installing real
    // timers, leaves the genuine originals rather than a detached fake.
    vi.restoreAllMocks();
    vi.useRealTimers();
    // Required, not decorative: unstubEnvs defaults to false in this vitest
    // version, so without this the stub would outlive the test. test/setup.ts
    // re-stubs its own keys from its beforeEach, so rolling back is safe.
    vi.unstubAllEnvs();
  });

  it('creates the five-minute cleanup interval when running as an MCP server', async () => {
    const { intervals } = await importTrackerWithIntervalSpy();

    expect(cleanupIntervals(intervals)).toHaveLength(1);
  });

  it('releases the cleanup interval so it cannot hold the event loop open', async () => {
    const { intervals } = await importTrackerWithIntervalSpy();
    const [cleanup] = cleanupIntervals(intervals);

    expect(cleanup).toBeDefined();
    expect(cleanup!.released()).toBe(true);
    expect(cleanup!.handleHasRef()).toBe(false);
  });

  it('does not cancel the cleanup interval while constructing', async () => {
    const { intervals, clearedHandles } = await importTrackerWithIntervalSpy();

    expect(cleanupIntervals(intervals)).toHaveLength(1);
    expect(clearedHandles).toHaveLength(0);
  });

  it('keeps pruning on later ticks, so the interval is not cancelled after the first', async () => {
    const { tracker } = await importTrackerWithIntervalSpy();
    const internals = tracker as unknown as TrackerInternals;

    // First tick.
    tracker.cache404Response('expired-1', { notFound: true }, EXPIRED_TTL_MS);
    vi.advanceTimersByTime(CLEANUP_PERIOD_MS);
    expect(internals.cache404.has('expired-1')).toBe(false);

    // Seeded after the first tick, so pruning it can only come from a second one.
    // A clearInterval issued at any point after the first pass strands this key.
    tracker.cache404Response('expired-2', { notFound: true }, EXPIRED_TTL_MS);
    vi.advanceTimersByTime(CLEANUP_PERIOD_MS);

    expect(internals.cache404.has('expired-2')).toBe(false);
  });

  it('still prunes expired entries when the clock reaches the firing point', async () => {
    const { tracker } = await importTrackerWithIntervalSpy();
    const internals = tracker as unknown as TrackerInternals;

    // Short TTL, so this entry is expired well before the cleanup tick. Reading
    // it back through getCached404 would prune lazily and prove nothing, so the
    // map is inspected directly: only the interval's own pass empties it.
    tracker.cache404Response('expired-key', { notFound: true }, EXPIRED_TTL_MS);
    expect(internals.cache404.has('expired-key')).toBe(true);

    vi.advanceTimersByTime(CLEANUP_PERIOD_MS);

    expect(internals.cache404.has('expired-key')).toBe(false);
  });

  it('keeps a still-valid entry alive across a cleanup tick', async () => {
    const { tracker } = await importTrackerWithIntervalSpy();
    const internals = tracker as unknown as TrackerInternals;

    // TTL beyond the tick, so pruning this would be wrong rather than merely lazy.
    tracker.cache404Response(
      'fresh-key',
      { notFound: true },
      LONG_LIVED_TTL_MS
    );

    vi.advanceTimersByTime(CLEANUP_PERIOD_MS);

    expect(internals.cache404.has('fresh-key')).toBe(true);
  });

  it('creates no cleanup interval outside MCP server mode', async () => {
    // stubEnv with undefined is vitest's own delete branch.
    vi.stubEnv('MCP_SERVER_MODE', undefined);

    const { intervals } = await importTrackerWithIntervalSpy();

    expect(cleanupIntervals(intervals)).toHaveLength(0);
  });
});
