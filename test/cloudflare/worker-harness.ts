/**
 * Offline workerd harness: the real example Worker over the freshly built core,
 * with only upstream HTTP synthetic. Shared by the test/cloudflare suites.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { builtinModules } from 'node:module';
import { createHash, webcrypto } from 'node:crypto';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

const encryptionKey = 'ab'.repeat(32);
// dist is shared by every suite in the run; parallel rebuilds rewrite it in place.
const buildLock = join(
  tmpdir(),
  `attio-worker-build-${createHash('sha256').update(process.cwd()).digest('hex').slice(0, 16)}.lock`
);

async function withBuildLock<T>(work: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + 300_000;
  for (;;) {
    try {
      await mkdir(buildLock);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (Date.now() > deadline)
        throw new Error(
          `Timed out waiting for ${buildLock}; remove it if no build is running`,
          { cause: error }
        );
      await new Promise((done) => setTimeout(done, 250));
    }
  }
  try {
    return await work();
  } finally {
    await rm(buildLock, { recursive: true, force: true });
  }
}

export interface WorkerHarness {
  start(options: {
    /** JavaScript run before the Worker module, e.g. process.env setup. */
    banner?: string;
    /** Bearer session -> Attio credential stored in the encrypted session. */
    sessions: Record<string, string>;
    outboundService: (request: Request) => Promise<Response> | Response;
  }): Promise<Miniflare>;
  dispose(): Promise<void>;
}

export async function createWorkerHarness(): Promise<WorkerHarness> {
  const directory = await mkdtemp(join(tmpdir(), 'attio-worker-'));
  const basePath = join(directory, 'worker-base.mjs');
  const workers: Miniflare[] = [];

  // Build every time: stale or missing dist must never make a suite pass.
  await withBuildLock(async () => {
    execFileSync('bun', ['run', 'build'], {
      cwd: process.cwd(),
      timeout: 120_000,
      stdio: 'pipe',
    });
    await build({
      entryPoints: [resolve('examples/cloudflare-mcp-server/worker.ts')],
      outfile: basePath,
      bundle: true,
      format: 'esm',
      platform: 'browser',
      conditions: ['workerd', 'browser'],
      // The example deliberately imports dist, not Vitest's mocked source graph.
      plugins: [
        {
          name: 'worker-node-builtins',
          setup(builder) {
            builder.onResolve({ filter: /.*/ }, ({ path }) => {
              if (path.startsWith('node:') || builtinModules.includes(path)) {
                return {
                  path: path.startsWith('node:') ? path : `node:${path}`,
                  external: true,
                };
              }
            });
          },
        },
      ],
    });
  });
  const base = await readFile(basePath, 'utf8');

  return {
    async start({ banner = '', sessions, outboundService }) {
      const scriptPath = join(directory, `worker-${workers.length}.mjs`);
      await writeFile(scriptPath, `${banner}\n${base}`);
      const worker = new Miniflare({
        modules: true,
        modulesRoot: directory,
        scriptPath,
        compatibilityDate: '2026-07-30',
        compatibilityFlags: ['nodejs_compat'],
        kvNamespaces: ['TOKEN_STORE'],
        bindings: {
          TOKEN_ENCRYPTION_KEY: encryptionKey,
          WORKER_URL: 'https://worker.example',
        },
        // No request can reach live Attio (or any other external origin).
        outboundService,
      });
      workers.push(worker);
      // Seed only synthetic encrypted sessions, using the storage wire format.
      const kv = await worker.getKVNamespace('TOKEN_STORE');
      const key = await webcrypto.subtle.importKey(
        'raw',
        Buffer.from(encryptionKey, 'hex'),
        'AES-GCM',
        false,
        ['encrypt']
      );
      for (const [bearer, accessToken] of Object.entries(sessions)) {
        const iv = webcrypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await webcrypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          new TextEncoder().encode(
            JSON.stringify({
              accessToken,
              expiresAt: Math.floor(Date.now() / 1000) + 3600,
              tokenType: 'Bearer',
            })
          )
        );
        await kv.put(
          `token:session:${bearer}`,
          JSON.stringify({
            version: 1,
            iv: Buffer.from(iv).toString('base64'),
            ciphertext: Buffer.from(ciphertext).toString('base64'),
          })
        );
      }
      return worker;
    },
    async dispose() {
      await Promise.all(workers.map((worker) => worker.dispose()));
      await rm(directory, { recursive: true, force: true });
    },
  };
}

/** POST one JSON-RPC request over the listening HTTP socket. */
export async function postRpc(
  worker: Miniflare,
  bearer: string,
  method: string,
  params: Record<string, unknown> = {}
): Promise<Response> {
  return fetch(new URL('/mcp', await worker.ready), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
}
