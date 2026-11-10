---
date: 2026-09-11
topic: cloudflare-oauth-session-topology
problem_type: connector_topology
tags:
  - attio
  - mcp
  - cloudflare-workers
  - oauth
  - claude
  - session-management
---

# Cloudflare OAuth Session Topology and Connector Recovery

## Symptom

The claude.ai Attio MCP connector disconnected with HTTP 401 Unauthorized errors roughly one hour after connecting, and toggling disconnect/reconnect failed to restore connectivity.

## Cause

The "Attio MCP (Cloudflare)" connector in claude.ai is self-hosted via a Cloudflare Worker (`attio-mcp-server`) rather than Smithery:

1. **Two-Layer Authentication**:
   - Layer 1: claude.ai ↔ Cloudflare Worker via OAuth 2.1 handshake. claude.ai accesses the worker through Anthropic's MCP proxy (`https://mcp-proxy.anthropic.com/v1/mcp/...`).
   - Layer 2: Worker ↔ Attio API using per-session Attio OAuth access tokens stored AES-256-GCM-encrypted in Workers KV (`session:<token>`).
2. **Session TTL Mismatch**:
   - Attio API keys and OAuth tokens are non-expiring (`/v2/self` returns `exp: null`).
   - Previously, the worker applied a default 1-hour KV TTL to sessions because Attio returns no `expires_in` attribute, causing sessions to expire prematurely after 60 minutes.
3. **Session Cache Invalidation**:
   - Simply toggling disconnect and reconnect in claude.ai reuses the cached expired session token, failing to recover the connection.

## Fix

1. **Persistent Session Handling**:
   - Worker sessions must persist in Workers KV without a 1-hour TTL, and unresolved or invalid tokens must be rejected explicitly.
2. **Connector Healing Procedure**:
   - To heal a broken connector after deploying worker fixes, **fully remove and re-add** the connector in claude.ai rather than toggling disconnect/reconnect, ensuring a fresh OAuth session is initialized.
3. **Deployment Workflow**:
   - Build package: `bun run build` at repository root.
   - Deploy worker: `cd examples/cloudflare-mcp-server && npx wrangler deploy`.
   - Real `wrangler.toml` is gitignored (KV namespace `e728aadab16e4b2f8cde4770fdba6b25`). Cloudflare deploy tokens are managed via 1Password Clawd vault.
4. **Security Warnings & Policy**:
   - Never write secret values, API tokens, or OAuth secrets into repository files or commits. Reference the 1Password Clawd vault ("Attio MCP Credentials") instead.
   - Per `SECURITY.md`, report any security vulnerabilities via private GitHub Security Advisories.
