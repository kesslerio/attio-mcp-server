import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import assert from 'node:assert/strict';
import { createTokenStorage } from '../src/token-storage.ts';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Requires the root build and the Worker's frozen, locked development tooling.
// Wrangler supplies real nodejs_compat shims; no application module is mocked.
const workerRoot = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), 'attio-sdk-workerd-'));
const output = path.join(temporary, 'bundle');
const config = path.join(temporary, 'wrangler.json');
await writeFile(
  config,
  JSON.stringify({
    name: 'attio-sdk-offline-check',
    main: path.join(workerRoot, 'worker.ts'),
    compatibility_date: '2024-12-01',
    compatibility_flags: ['nodejs_compat'],
  })
);
let writes = 0;
let mf;
try {
  execFileSync(
    process.execPath,
    [
      path.join(workerRoot, 'node_modules/wrangler/bin/wrangler.js'),
      'deploy',
      '--dry-run',
      '--config',
      config,
      '--outdir',
      output,
    ],
    {
      cwd: workerRoot,
      timeout: 60000,
      stdio: 'pipe',
      env: {
        PATH: process.env.PATH,
        HOME: temporary,
        XDG_CONFIG_HOME: temporary,
        WRANGLER_SEND_METRICS: 'false',
      },
    }
  );
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      modulesRoot: output,
      scriptPath: path.join(output, 'worker.js'),
      compatibilityDate: '2024-12-01',
      compatibilityFlags: ['nodejs_compat'],
      bindings: {
        WORKER_URL: 'http://worker.test',
        TOKEN_ENCRYPTION_KEY: '11'.repeat(32),
      },
      outboundService: async (request) => {
        if (request.method === 'DELETE') writes++;
        return new globalThis.Response('offline upstream failure', {
          status: 503,
        });
      },
      kvNamespaces: ['TOKEN_STORE'],
    })
  );
  await mf.ready;
  const health = await mf.dispatchFetch('http://worker.test/health');
  assert.equal(health.status, 200);
  const unauth = await mf.dispatchFetch('http://worker.test/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  assert.equal(unauth.status, 401);
  const kv = await mf.getKVNamespace('TOKEN_STORE');
  const storage = createTokenStorage({ kv, encryptionKey: '11'.repeat(32) });
  await storage.storeToken('session:offline-session', {
    accessToken: 'offline-credential',
    expiresAt: Math.floor(Date.now() / 1000) + 600,
    tokenType: 'Bearer',
  });
  async function rpc(method, params = {}, token = 'offline-session') {
    const response = await mf.dispatchFetch('http://worker.test/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method, params }),
    });
    return { status: response.status, body: await response.json() };
  }
  assert.equal((await rpc('tools/list', {}, 'invalid-session')).status, 401);
  const init = await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'offline', version: '1' },
  });
  assert.equal(init.body.result.protocolVersion, '2024-11-05');
  const catalog = await rpc('tools/list');
  assert.equal(catalog.status, 200);
  assert.ok(
    catalog.body.result.tools.find((t) => t.name === 'records_get_details')
      .outputSchema
  );
  const uncertain = await rpc('tools/call', {
    name: 'records_delete',
    arguments: {
      resource_type: 'companies',
      record_id: '12345678-1234-4234-8234-123456789012',
    },
  });
  assert.equal(uncertain.body.result.isError, true);
  const error = JSON.parse(uncertain.body.result.content[0].text).error;
  assert.equal(error.retryable, false);
  assert.match(error.message, /read back/i);
  assert.equal(writes, 1);
  console.log(
    'PASS: workerd actual Worker health, missing/invalid session denial, authorized legacy initialize/catalog, schema exposure and nonreplayed uncertain delete (one offline upstream request)'
  );
} finally {
  await mf?.dispose();
  await rm(temporary, { recursive: true, force: true });
}
