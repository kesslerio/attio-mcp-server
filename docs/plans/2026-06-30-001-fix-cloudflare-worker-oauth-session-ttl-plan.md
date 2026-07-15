---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
type: fix
title: 'fix: Persist OAuth sessions and reject unresolved tokens in Cloudflare MCP worker'
created: 2026-06-30
target_repo: attio-mcp-server
---

# fix: Persist OAuth sessions and reject unresolved tokens in Cloudflare MCP worker

## Summary

The Cloudflare Worker that backs the remote Attio MCP connector stamps a 1-hour expiry on every KV session→token mapping, even though Attio's OAuth tokens never expire. ~1 hour after each connect the mapping is evicted; the worker then forwards the orphaned session token straight to Attio and every `/mcp` call returns `401`. This plan fixes the root cause: use a sane session lifetime when Attio omits `expires_in`, and reject an unresolved session token with a `401`/re-auth instead of silently forwarding it. Per-caller OAuth authentication is preserved and strengthened.

This supersedes an earlier static-API-key approach, which a security review found removed per-caller authentication (any bearer would have been accepted in static-key mode). That approach is dropped.

---

## Problem Frame

`handleMcp` (`examples/cloudflare-mcp-server/worker.ts`) takes the Bearer claude.ai sends, resolves it in KV (`session:<token>`), and uses the stored Attio access token downstream. Two defects compound:

1. **Self-expiring sessions.** The Attio token is stored with `expiresAt = now + (tokens.expires_in || 3600)`. Attio returns no `expires_in` (its OAuth tokens are long-lived), so `expiresAt` defaults to 1 hour. `token-storage.ts` derives the KV TTL and the expiry check from `expiresAt`, so the `session:<token>` mapping is evicted ~1 hour after connect.
2. **Silent passthrough on miss.** When the KV lookup misses, the code falls through with `let attioToken = token`, forwarding the now-orphaned session token to `api.attio.com`. Attio rejects it → `401`. Reconnecting in claude.ai reuses the cached session token, so the UI cannot recover (confirmed empirically: an identical dead 43-char session token is sent across reconnect and revoke-and-reconnect).

The combination makes the connector reliably break ~1 hour after every connect.

---

## Requirements

- **R1** — When Attio's token response omits `expires_in`, the worker uses a long session lifetime (not 1 hour) so the KV `session:<token>` mapping does not self-expire shortly after connect.
- **R2** — When token storage is configured and the incoming token resolves to no KV session (expired, revoked, or never issued), the worker returns `401` with a re-authenticate signal instead of forwarding the raw bearer to Attio.
- **R3** — A valid, worker-issued session token continues to resolve and call Attio exactly as before (no regression for the working path).
- **R4** — A real `expires_in` returned by Attio is still honored (the change only alters the _fallback_).

---

## Key Technical Decisions

- **30-day default session lifetime.** Introduce `DEFAULT_SESSION_TTL_SECONDS = 30 days` as the `expires_in` fallback. Long enough that connections stay stable, bounded enough that a revoked token cannot linger indefinitely; clients transparently re-authenticate after it elapses. Fixing the single source (`expiresAt`) propagates correctly to the KV TTL, the expiry check, and the `expires_in` returned to the client.
- **Reject-on-miss enforces the auth gate.** Returning `401` on an unresolved token (rather than passthrough) makes a valid worker-issued session _required_ for `/mcp` when KV is configured. This removes the raw-bearer passthrough as an authentication bypass and turns a confusing downstream Attio 401 into an actionable re-auth signal. The no-KV path (dev/degraded, token storage unconfigured) is unchanged.
- **No static API key.** The downstream credential stays the per-session OAuth token, preserving per-caller identity and authorization. (See Scope Boundaries for why the static-key alternative was rejected.)

---

## Implementation Units

### U1. Persist sessions and reject unresolved tokens

- **Goal** — Stop sessions self-expiring after ~1h and stop forwarding orphaned tokens to Attio. (R1, R2, R3, R4)
- **Dependencies** — none.
- **Files** — `examples/cloudflare-mcp-server/worker.ts`
- **Approach** —
  - Add module constant `DEFAULT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60` with a comment explaining the Attio non-expiring-token context.
  - In the OAuth callback's `storedToken`, change `expiresAt` to use `tokens.expires_in || DEFAULT_SESSION_TTL_SECONDS`. This is the single source feeding the session token, KV TTL, and the `expires_in` returned at `/oauth/token`.
  - In `handleMcp`, after the session/legacy/raw lookup cascade, when token storage is configured and no `storedToken` resolves, return a `401` JSON-RPC error (`WWW-Authenticate: Bearer`, "re-authenticate via the OAuth flow") instead of falling through to forward the raw bearer. Mirror the existing missing-Bearer `401` shape in the same function.
- **Patterns to follow** — the existing missing-`Authorization` `401` response in `handleMcp`; the existing `createTokenStorage` usage.
- **Test scenarios** — `Test expectation: none -- the example worker has no unit-test harness; verified by typecheck and live integration (Verification Contract).`
- **Verification** — `tsc --noEmit` clean; with a fresh OAuth session the connector returns `200` and continues working well past 1 hour; an expired/unknown bearer returns `401` (not a forwarded Attio call); `expires_in` honored when Attio supplies it.

---

## Scope Boundaries

**In scope** — the session-TTL fallback and the reject-on-miss behavior in `worker.ts` (U1), plus a CHANGELOG entry.

### Rejected alternative

- **Static `ATTIO_API_KEY` override (the "B" hotfix).** Bypassing the OAuth/KV path with a static workspace key was prototyped and dropped: a security review found that, with the key set, the worker accepted _any_ `Authorization: Bearer <anything>` and used the workspace key downstream — removing per-caller authentication. The root-cause fix here preserves OAuth auth instead.

### Deferred to Follow-Up Work

- **Unit-test harness for the example worker.** None exists today; adding vitest coverage for `handleMcp` token resolution and the TTL math is out of scope for this fix.
- **CORS narrowing.** `mcp-handler.ts` reflects any `Origin`; tightening it to the known MCP client hosts is a separate hardening change.

---

## Verification Contract

- `cd examples/cloudflare-mcp-server && npx tsc --noEmit` exits clean.
- Deploy; fully remove and re-add the connector in claude.ai to mint a fresh OAuth session; an authenticated MCP read (`get-lists`) returns `200` and still works well beyond 1 hour.
- A request with an expired/unknown bearer returns `401` with `WWW-Authenticate: Bearer` (worker does not call Attio).
- Existing valid-session behavior unchanged (R3).

## Definition of Done

- U1 complete; typecheck clean.
- Sessions persist past 1 hour; unresolved tokens 401 instead of forwarding.
- CHANGELOG `[Unreleased]` entry added under **Fixed**.
- Static-key approach removed from the branch.
- PR opened against `kesslerio/attio-mcp-server` following repo conventions (`fix:` type; `What`/`Why`/`Tests`/`AI Assistance` body).

---

## Sources & Research

- `examples/cloudflare-mcp-server/worker.ts` — `handleMcp` token resolution + passthrough; OAuth callback `expiresAt`; `/oauth/token` session-token issuance.
- `examples/cloudflare-mcp-server/src/token-storage.ts` — `storeToken` KV TTL and `getTokenResult` expiry check derived from `expiresAt`.
- Security/adversarial review of the rejected static-key approach (auth-bypass finding) that motivated this root-cause fix.
