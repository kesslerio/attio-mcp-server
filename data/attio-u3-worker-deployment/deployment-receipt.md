# Deployment receipt — attio-mcp-server Cloudflare Worker (U3)

Deployed the reviewed Worker correction (https://github.com/kesslerio/attio-mcp-server/pull/1323,
revision `c91217fbf58309f6d0aead159cd92d959b7e`) as a new Worker on the
martin@kessler.io Cloudflare account, per the pre-existing finding that no
attio Worker existed (the account had only `fm-cf-validate`, `logan-birthday`,
and `lunchbox`, re-verified via the Workers scripts API immediately before
deploy). No live CRM calls were made during deploy or verification.

## Deploy facts

| Item | Value |
|------|-------|
| Worker name | `attio-mcp-server` |
| Deployed URL | https://attio-mcp-server.kessler.workers.dev |
| Account | Martin@kessler.io's Account, ID `d3701c379b286c754fd4085d3f44ea8a` (matches staged `firstmate/config/cloudflare-u3.env`) |
| Source revision | `c91217fbf58309f6d0aead159cd92d959b7e` (fix: preserve structured tool results through the Cloudflare Worker, #1323 / #1312) |
| Bundle | worker.ts + root `dist/` shared dispatcher, built with `bun run build` (tsc) at that revision |
| Wrangler version | **4.151.1** (pinned, npm, no global install) |
| Deploy timestamp | 2026-10-16T16:30:42Z → 2026-10-16T16:30:47Z (UTC) |
| Version ID | `12aa01a9-043e-4072-bf19-b5f3ae968146` |
| Worker startup time | 283 ms; upload 3049.05 KiB / 530.50 KiB gzip |
| Config | Derived from `wrangler.toml.example`: placeholder KV ID replaced with the real one; `[build]` command omitted (wrangler 4 bundles the TS entry itself; the example's `tsc --noEmit` is a typecheck, not a bundle step); `env.production`/`env.staging` sections omitted (single default environment deployed); copy of the deployed config kept beside this receipt as `wrangler.toml.deployed` |

### Wrangler pin rationale

The example's `package.json` declares `wrangler: ^4.147.0`. `npm audit` on
4.147.0 reported high-severity vulnerabilities in the `sharp` → `miniflare` →
`wrangler` chain, fixed by 4.151.1, which is still inside the repo's declared
range. Pinned exactly to 4.151.1; `npm audit` at that pin reports 0
vulnerabilities. Installed with npm (per the task brief) into the lane's
scratch tool directory only, no global install.

## Infrastructure and secrets created

| Resource | Value | Why it is the minimum |
|----------|-------|----------------------|
| KV namespace `TOKEN_STORE` | `eab235e49cf842a78e0d12ffdde18f0b` | The Worker's `/mcp` endpoint returns 503 (`token storage unavailable`) without it — it is the bearer-session auth gate, not optional storage |
| Secret `TOKEN_ENCRYPTION_KEY` | generated 32-byte hex; stored in 1Password (family account, `Agents` vault, item `234u7hl43hjzum45wpuwhdbp3q`, "Attio U3 Worker TOKEN_ENCRYPTION_KEY (attio-mcp-server)") and in `firstmate/data/attio-u3-worker-deployment/token-encryption-key.0600` (0600) | Required together with `TOKEN_STORE` for any `/mcp` response other than 503. Not an Attio credential — locally generated per the repo README |

**Deliberately NOT bound** (kept to the strict boot minimum): `ATTIO_CLIENT_ID`,
`ATTIO_CLIENT_SECRET`, `WORKER_URL`. The Worker boots and serves the full
protocol surface verified below without them; they are only needed for the
OAuth user flow (`/oauth/*`, discovery redirects) when Claude.ai/ChatGPT
connectors get enabled. Real Attio OAuth credentials were never read, printed,
or bound. Follow-up for a later task: set those three secrets and register the
redirect URI `https://attio-mcp-server.kessler.workers.dev/oauth/callback`
before pointing a connector at the Worker.

## Verification evidence (no live CRM writes)

All requests below hit the deployed URL with no Attio API traffic: the only
session in KV uses a synthetic placeholder access token that was never sent
anywhere, and the one `tools/call` probe targeted a nonexistent tool, which the
dispatcher rejects locally before any network call.

1. **GET /health** → HTTP 200, `{"status":"healthy","has_token_storage":true,"has_encryption_key":true,"has_client_id":false,"has_client_secret":false}` (client creds absent by design, see above).
2. **HEAD /** → HTTP 200 with `MCP-Protocol-Version: 2024-11-05`.
3. **POST /mcp without auth** → HTTP 401, JSON-RPC `-32600 "Missing or invalid Authorization header"`.
4. **POST /mcp `initialize`** (with the staged KV session bearer) → HTTP 200, `protocolVersion: "2024-11-05"`, `serverInfo: {"name":"attio-mcp-server","version":"1.0.0"}`, capabilities `tools/resources/prompts`, and a fresh `MCP-Session-Id` issued.
5. **POST /mcp `tools/list`** → HTTP 200: **46 tools, every one carrying an `outputSchema`** (the v2 structured-results contract surface). The deployed catalog is **byte-identical** to `getToolsListPayload()` from the locally built `c91217f` `dist/` (normalized comparison passed).
6. **POST /mcp `tools/call` on a nonexistent tool** → HTTP 200 JSON-RPC envelope, `-32602 "Tool not found: nonexistent_tool_u3verify"` — the dispatcher result path is live and returns structured JSON-RPC envelopes without touching Attio.

Off-cloud build proof at the same revision: `bun run test:single
test/cloudflare/structured-results.test.ts` — **7/7 passed** (the correction's
own suite: structuredContent preservation, connector content, error envelopes,
through Miniflare with synthetic upstreams).

## Verification session note

One KV entry was written for the handshake:
`token:session:u3verify-…` (AES-256-GCM envelope of a synthetic
`accessToken: "synthetic-verification-token-not-a-real-credential"`, 3-hour
TTL, auto-expires by 2026-10-16T19:33Z and self-deletes on lookup after
expiry). Rotating `TOKEN_ENCRYPTION_KEY` later also invalidates it.

## Risks / open items

- `ATTIO_CLIENT_ID` / `ATTIO_CLIENT_SECRET` / `WORKER_URL` secrets and the Attio OAuth app redirect URI are outstanding; the OAuth flow is unverified by design (no live credentials allowed in this task).
- The verification session token self-expires; no cleanup action required.
- KV namespace title is `TOKEN_STORE` (created via wrangler; the README's example title `attio-mcp-server-TOKEN_STORE` is cosmetic only).
