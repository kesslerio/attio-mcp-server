/**
 * Regression coverage for issue #1288: the stdio server never exited when its
 * client went away.
 *
 * This is the only check that can prove the defect is gone. "Nothing is left
 * holding the event loop" is a property of a running process, not of a module,
 * so it has to be observed from outside one: spawn the real built entrypoint,
 * reach readiness, close the write end of stdin, and require the child to go
 * away on its own.
 *
 * Notes on shape:
 *   - The child is spawned as `node`, named explicitly. Under `bun run test:*`
 *     the current executable is Bun, while the shipped bin carries a node
 *     shebang; asserting Bun's loop behaviour would prove nothing about the
 *     runtime that leaks. This mirrors test/e2e/mcp/shared/mcp-client.ts.
 *   - The child's cwd is a temp directory. The entrypoint loads a local .env, so
 *     inheriting the repo root would make a developer's real credentials part of
 *     the thing under test.
 *   - Readiness is gated on the entrypoint's own log line. Without that gate, a
 *     child that died immediately would satisfy "the process is gone".
 *   - This suite only bites while the entrypoint sets MCP_SERVER_MODE (src/cli.ts).
 *     Without it no cleanup interval is ever created, so the child would exit and the
 *     two exit tests would go green with the fix reverted. The unit suite is what pins
 *     that branch, so the two files are load-bearing together.
 */

import {
  spawn,
  type ChildProcess,
  type ChildProcessByStdio,
} from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '../..');
const CLI_PATH = path.join(REPO_ROOT, 'dist', 'cli.js');
const READY_MARKER = 'Server connected and ready';

/** How often the bounded waiters re-check, in ms. */
const POLL_INTERVAL_MS = 50;
const MAX_RETAINED_OUTPUT = 64 * 1024;
/** Grace for a SIGKILL to land before teardown stops waiting on a child. */
const REAP_GRACE_MS = 2000;

/** Bound for a child that does nothing but reach readiness and lose its stdin. */
const IDLE_EXIT_BOUND_MS = 5000;
/**
 * A request path can leave transient ref'd timers behind — credential caching
 * uses a ref'd 10s setTimeout (src/api/client-context.ts). None is reachable
 * from `initialize` alone, but this bound also covers a future request path,
 * so it clears 10s plus drain rather than the ~13ms measured here.
 */
const AFTER_REQUEST_EXIT_BOUND_MS = 15000;

const READY_BOUND_MS = 20000;
const RESPONSE_BOUND_MS = 5000;

/**
 * Headroom on every per-test budget.
 *
 * A budget must cover the slowest legitimate path *plus* the reap that
 * teardown performs afterwards. Budgets that only cover the path itself fail
 * with vitest's generic "test timed out", discarding the specific diagnostic
 * this suite exists to produce.
 */
const TEST_HEADROOM_MS = REAP_GRACE_MS * 3 + 2000;

const BUILD_MISSING = !existsSync(CLI_PATH);

if (BUILD_MISSING) {
  // A lane that did not build is not a lane where the defect returned.
  console.warn(
    `[stdio-server-exit] skipping: ${path.relative(REPO_ROOT, CLI_PATH)} not found. ` +
      'Run `bun run build` first.'
  );
  if (process.env.CI) {
    // Silent-skip is acceptable locally, and the opposite of acceptable in a
    // gate whose whole purpose is to notice this regression (#1288).
    throw new Error(
      `${CLI_PATH} not found in CI: the lifecycle gate cannot run.`
    );
  }
}

const INITIALIZE_REQUEST = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'stdio-exit-regression', version: '1.0.0' },
  },
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poll `check` until it returns true or the bound expires.
 *
 * Polls rather than taking one long timer: each check is a cheap read of a
 * growing buffer, and re-checking once at the bound stops an arrival landing
 * just after a poll from being reported as a miss.
 */
async function waitUntil(
  check: () => boolean,
  boundMs: number
): Promise<boolean> {
  const deadline = Date.now() + boundMs;
  while (Date.now() < deadline) {
    if (check()) return true;
    await sleep(POLL_INTERVAL_MS);
  }
  return check();
}

/** Outcome of a child that went away. `null` means it is still resident. */
type ExitOutcome = {
  code: number | null;
  signal: NodeJS.Signals | null;
} | null;

/**
 * Keep a bounded tail of a stream. Children on the teardown path are still
 * running, so an uncapped append would keep growing inside the worker.
 */
function retainTail(stream: NodeJS.ReadableStream): () => string {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk: string) => {
    buffer += chunk;
    if (buffer.length > MAX_RETAINED_OUTPUT) {
      buffer = buffer.slice(-MAX_RETAINED_OUTPUT);
    }
  });
  return () => buffer;
}

type ServerChild = ChildProcessByStdio<Writable, Readable, Readable>;

interface SpawnedServer {
  child: ServerChild;
  /** Snapshot of the child's stderr as it stands right now. */
  readStderr: () => string;
  waitForReady: () => Promise<void>;
  waitForInitializeResponse: () => Promise<void>;
  waitForExit: (boundMs: number) => Promise<ExitOutcome>;
}

async function spawnServer(
  cwd: string,
  live: ChildProcess[]
): Promise<SpawnedServer> {
  const child = spawn('node', [CLI_PATH], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ATTIO_API_KEY: 'attio-mcp-regression-key' },
  });
  // Registered at spawn rather than by each caller, so a future test cannot
  // forget it and orphan a child on its failure path.
  live.push(child);

  const readStderr = retainTail(child.stderr);
  const readStdout = retainTail(child.stdout);

  let settled: NonNullable<ExitOutcome> | null = null;
  let spawnFailure: string | null = null;

  const exited = new Promise<NonNullable<ExitOutcome>>((resolve) => {
    child.on('exit', (code, signal) => resolve({ code, signal }));
  });
  void exited.then((outcome) => {
    settled = outcome;
  });

  // A spawn-time failure (e.g. `node` absent from PATH) emits 'error' and no
  // 'exit'. Unobserved, this promise would never settle and readiness would
  // spend its whole budget waiting on a process that never started. Node also
  // throws on an unhandled 'error', so the listener is required, not cosmetic.
  child.once('error', (err) => {
    spawnFailure = err.message;
  });

  /** True once the child is gone or never started, for any reason. */
  const childLost = () => settled !== null || spawnFailure !== null;

  const checkReady = () => readStderr().includes(READY_MARKER);

  const failPrematureExit = async (): Promise<never> => {
    if (spawnFailure !== null) {
      throw new Error(`server failed to start: ${spawnFailure}`);
    }
    await exited;
    throw new Error(
      `server exited before readiness with ${JSON.stringify(settled)}.\n` +
        `stderr tail:\n${readStderr().slice(-2000)}`
    );
  };

  const waitForReady = async (): Promise<void> => {
    // Abort as soon as the child is lost, not only when the bound expires: a
    // child that dies immediately must fail in one poll, not after 20 seconds.
    const decided = await waitUntil(
      () => checkReady() || childLost(),
      READY_BOUND_MS
    );
    if (decided && !childLost()) return;
    // Losing the child before readiness defeats the test's premise; reporting it
    // as a pass would be the false green this suite exists to prevent.
    if (childLost()) await failPrematureExit();
    throw new Error(
      `readiness marker never appeared within ${READY_BOUND_MS}ms.\n` +
        `stderr tail:\n${readStderr().slice(-2000)}`
    );
  };

  /**
   * Confirm the server answered the initialize frame. Without this, "exited
   * after having served a request" would only prove a frame was written.
   */
  const waitForInitializeResponse = async (): Promise<void> => {
    const answered = await waitUntil(() => {
      const out = readStdout();
      // Require a result, not just the id: a JSON-RPC error frame also echoes
      // the request id, and serving an error is not serving the request.
      return (
        out.includes('"result"') &&
        out.includes(`"id":${INITIALIZE_REQUEST.id}`)
      );
    }, RESPONSE_BOUND_MS);
    if (!answered) {
      throw new Error(
        `no initialize response within ${RESPONSE_BOUND_MS}ms, so the request ` +
          `was never actually served.\nstdout tail:\n${readStdout().slice(-2000)}`
      );
    }
  };

  const waitForExit = async (boundMs: number): Promise<ExitOutcome> => {
    // Abort on a stream error too, not only on exit. Otherwise a child that
    // dies with an error is reported as "still resident", sending the next
    // reader hunting for a leak that is not there.
    const lost = await waitUntil(
      () => settled !== null || spawnFailure !== null,
      boundMs
    );
    if (!lost) return null;
    if (settled === null && spawnFailure !== null) {
      throw new Error(
        `server errored before exiting: ${spawnFailure}.\n` +
          `stderr tail:\n${readStderr().slice(-2000)}`
      );
    }
    return settled;
  };

  return {
    child,
    readStderr,
    waitForReady,
    waitForInitializeResponse,
    waitForExit,
  };
}

describe.skipIf(BUILD_MISSING)(
  'stdio server exit on client disconnect (#1288)',
  () => {
    let workdir: string;
    const live: ChildProcess[] = [];

    beforeAll(async () => {
      workdir = await mkdtemp(path.join(tmpdir(), 'attio-mcp-exit-'));
    });

    afterAll(async () => {
      // Never leave behind the thing this test exists to prevent.
      const survivors: number[] = [];
      await Promise.all(
        live.splice(0).map(
          (c) =>
            new Promise<void>((resolve) => {
              if (c.exitCode !== null || c.signalCode !== null)
                return resolve();
              c.once('exit', () => resolve());
              c.kill('SIGKILL');
              setTimeout(() => {
                // The grace timer firing is not evidence of exit; re-check.
                if (c.exitCode === null && c.signalCode === null)
                  survivors.push(c.pid ?? -1);
                resolve();
              }, REAP_GRACE_MS);
            })
        )
      );
      try {
        if (survivors.length) {
          throw new Error(
            `children survived teardown and would be orphaned: ${survivors.join(
              ', '
            )}`
          );
        }
      } finally {
        // Still remove the temp dir when the reap reports survivors.
        await rm(workdir, { recursive: true, force: true });
      }
    });

    it(
      'exits on its own, unsignalled, once the client closes stdin',
      async () => {
        const server = await spawnServer(workdir, live);

        await server.waitForReady();
        server.child.stdin.end();

        const result = await server.waitForExit(IDLE_EXIT_BOUND_MS);

        expect(
          result,
          `child pid ${server.child.pid} still resident ${IDLE_EXIT_BOUND_MS}ms ` +
            `after stdin closed; stderr tail:\n${server.readStderr().slice(-1000)}`
        ).not.toBeNull();

        // signal null rules out a kill from outside; code 0 rules out a forced
        // process.exit() on stdin end, which would exit unsignalled too while
        // abandoning any work still in flight. A clean drain drains, so 0/None.
        expect(result!.signal).toBeNull();
        expect(result!.code).toBe(0);
      },
      IDLE_EXIT_BOUND_MS + READY_BOUND_MS + TEST_HEADROOM_MS
    );

    it(
      'exits after having served a request, not only when idle',
      async () => {
        const server = await spawnServer(workdir, live);

        await server.waitForReady();

        server.child.stdin.write(`${JSON.stringify(INITIALIZE_REQUEST)}\n`);
        await server.waitForInitializeResponse();

        server.child.stdin.end();

        const result = await server.waitForExit(AFTER_REQUEST_EXIT_BOUND_MS);

        expect(
          result,
          `child pid ${server.child.pid} still resident ` +
            `${AFTER_REQUEST_EXIT_BOUND_MS}ms after stdin closed, having served a ` +
            `request; stderr tail:\n${server.readStderr().slice(-1000)}`
        ).not.toBeNull();
        expect(result!.signal).toBeNull();
        // Same reason as the idle case: an unsignalled non-zero exit is a forced
        // termination, not a drained event loop.
        expect(result!.code).toBe(0);
      },
      AFTER_REQUEST_EXIT_BOUND_MS +
        READY_BOUND_MS +
        RESPONSE_BOUND_MS +
        TEST_HEADROOM_MS
    );

    it(
      'reaps cleanly when the run is torn down with a child still alive',
      async () => {
        const server = await spawnServer(workdir, live);

        await server.waitForReady();

        // Deliberately do not close stdin: this child is still holding the loop,
        // which is exactly the state teardown must survive without orphaning.
        server.child.kill('SIGKILL');

        const reaped = await server.waitForExit(REAP_GRACE_MS * 2);
        expect(
          reaped,
          `child pid ${server.child.pid} survived SIGKILL and would be orphaned`
        ).not.toBeNull();
        // Kill-path teardown is expected to report a signal, unlike a clean drain.
        expect(reaped!.signal).toBe('SIGKILL');
      },
      READY_BOUND_MS + REAP_GRACE_MS * 4
    );
  }
);
