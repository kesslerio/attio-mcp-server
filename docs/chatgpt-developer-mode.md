# ChatGPT Developer Mode Integration

> **⚠️ Smithery Temporarily Unavailable**: Smithery has changed their deployment model to require external hosting. Use the **Cloudflare Worker** deployment method below for ChatGPT integration.

This guide explains how to expose the Attio MCP server to ChatGPT users in two configurations:

1. **Full Developer Mode** – Pro/Plus accounts with the Developer Mode beta enabled can access the entire Attio toolset, including write operations, with built-in approval flows.
2. **Search-Only Compatibility** – For accounts without Developer Mode, expose a minimal `search`/`fetch` surface that mirrors OpenAI's baseline MCP requirements.

The server now publishes MCP safety annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`) on every tool definition so ChatGPT can make informed approval decisions.

---

## 1. Requirements

| Scenario       | Requirements                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| Developer Mode | ChatGPT Pro/Plus subscription, browser access, _Settings → Connectors → Advanced → Developer Mode_ enabled |
| Search Only    | Any ChatGPT account that supports custom connectors                                                        |

### Server prerequisites

- Self-hosted Cloudflare Worker deployment (see [Cloudflare Worker Guide](../examples/cloudflare-mcp-server/README.md))
- Set `ATTIO_API_KEY`/`ATTIO_WORKSPACE_ID` for Attio API access

---

## 2. Enabling Developer Mode Access

### Prerequisites for ChatGPT Integration

**IMPORTANT**: ChatGPT Developer Mode requires a publicly accessible HTTPS endpoint with OAuth support. Deploy using the **Cloudflare Worker** template.

### Setup Steps

1. **Deploy the Cloudflare Worker**:

   ```bash
   cd examples/cloudflare-mcp-server
   npm install
   wrangler kv:namespace create "TOKEN_STORE"
   # Update wrangler.toml with the KV namespace ID
   wrangler secret put ATTIO_CLIENT_ID
   wrangler secret put ATTIO_CLIENT_SECRET
   wrangler secret put TOKEN_ENCRYPTION_KEY
   wrangler deploy
   ```

   See [Cloudflare Worker Deployment Guide](../examples/cloudflare-mcp-server/README.md) for detailed instructions.

2. **Expose the full tool catalogue** - Do NOT set `ATTIO_MCP_TOOL_MODE`. The server exposes all tools by default.

3. **Configure ChatGPT**:
   - Open **Settings → Connectors → Advanced**.
   - Enable **Developer Mode**.
   - Add your **Cloudflare Worker URL**: `https://your-worker.your-subdomain.workers.dev/mcp`
   - Complete OAuth authorization when prompted

4. **OAuth Authentication**:
   - ChatGPT will redirect to your Worker for OAuth authorization
   - Grant permissions for the Attio MCP server
   - The Worker handles token refresh automatically

5. **Verification**:
   - ChatGPT will automatically auto-approve tools with `readOnlyHint: true` (e.g. `records.search`, `records.get_details`)
   - Prompt for approval on write tools (`create-record`, `update-record`) and destructive tools (`delete-record`)

### Approval messaging tips

- Tool descriptions should clearly explain the effect of the operation (e.g. “Create a new Attio contact”).
- Validation errors should mention that approval may be required (we already surface this in handler responses).

---

## 3. Search-Only Compatibility Mode

For accounts without Developer Mode, configure `ATTIO_MCP_TOOL_MODE: 'search'` as an environment variable in your Cloudflare Worker.

When this mode is active, the server will only advertise:

| Tool                              | Behaviour                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `search`                          | Delegates to the universal search service and returns JSON-encoded results in a single text content item |
| `fetch`                           | Retrieves the full record payload for a search result ID                                                 |
| `health-check`/`aaa-health-check` | Simple readiness probes                                                                                  |

All other tools are filtered out at registry time and ignored by the dispatcher. This is ideal for accounts without Developer Mode or for a constrained roll-out.

Unset the variable (or set it to any value other than `search`) to restore the full tool catalogue.

---

## 4. Testing Matrix

| Mode           | Suggested Tests                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Developer Mode | `npm test -- --run test/services/openai-compatibility.service.test.ts`, plus manual validation in ChatGPT Developer Mode |
| Search-only    | Same test suite plus a quick `list_tools` in ChatGPT to confirm only `search`/`fetch` are visible                        |

> **Note:** Full MCP end-to-end suites still require Attio API credentials. Run them before production rollout (`npm test`) or rely on CI where the secrets are available.

---

## 5. Troubleshooting

| Symptom                                            | Likely Cause                                                                  | Fix                                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| ChatGPT requests consent for read-only tools       | `readOnlyHint` missing                                                        | Confirm you are running a version that includes safety annotations                 |
| **ChatGPT only sees 'search' and 'fetch' tools**   | **`ATTIO_MCP_TOOL_MODE` environment variable set**                            | **Remove `ATTIO_MCP_TOOL_MODE` - server defaults to full mode**                    |
| ChatGPT cannot see write tools                     | Running with `ATTIO_MCP_TOOL_MODE: 'search'`                                  | Remove the environment variable - do NOT set it for full access                    |
| ChatGPT cannot connect to server                   | Worker not deployed or incorrect URL                                          | Verify your Cloudflare Worker is deployed and use the correct `/mcp` endpoint      |
| OAuth authentication fails                         | Cloudflare Worker OAuth not configured properly                               | Check ATTIO_CLIENT_ID, ATTIO_CLIENT_SECRET, and TOKEN_ENCRYPTION_KEY secrets       |
| Tools show "unauthorized" errors                   | API credentials not configured                                                | Configure `ATTIO_API_KEY` and `ATTIO_WORKSPACE_ID` in Cloudflare Worker secrets    |
| `search` returns no results                        | Ensure Attio API credentials are set and universal search works in Claude/CLI | Verify credentials in Cloudflare Worker configuration                              |
| PR validation fails with missing Attio credentials | Expected if secrets are not available locally; see `README.md` testing notes  | Use Cloudflare Worker for production deployments with proper credential management |

---

## 6. Next Steps

- Monitor approval logs to verify the safety flow.
- Add targeted UI messaging in ChatGPT descriptions for high-risk tools (`delete-record`, `batch-operations`).
- Expand the test suite with real Developer Mode integration tests once mocked approval APIs become available.
