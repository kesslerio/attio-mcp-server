# ChatGPT Developer Mode Integration

This guide explains how to expose the Attio MCP server to ChatGPT users in two configurations:

1. **Full Developer Mode** – Pro/Plus accounts with the Developer Mode beta enabled can access the entire Attio toolset, including write operations, with built-in approval flows.
2. **Search-Only Compatibility** – For ChatGPT accounts without Developer Mode, expose a minimal `search`/`fetch` surface that mirrors OpenAI's baseline MCP requirements.

The server now publishes MCP safety annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`) on every tool definition so ChatGPT can make informed approval decisions.

---

## 1. Requirements

| Scenario       | Requirements                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Developer Mode | ChatGPT Pro/Team/Enterprise/Edu subscription, browser access, _Settings → Connectors → Advanced → Developer Mode_ enabled |
| Search Only    | Any ChatGPT account without Developer Mode that supports custom connectors                                                |

### Server prerequisites

- Publicly accessible HTTPS endpoint (or a tunnel such as `smithery dev --public` during development).
- Standard MCP transport (STDIO is fine locally, Smithery or your hosting provider for production).
- Set `ATTIO_API_KEY`/`ATTIO_WORKSPACE_ID` for Attio API access.

---

## 2. Enabling Developer Mode Access

### Prerequisites for ChatGPT Integration

**IMPORTANT**: ChatGPT Developer Mode requires deployment via **Smithery** for OAuth authentication. Direct server URLs are not supported.

**New to Smithery?** Check out these helpful resources:

- 📖 [Smithery Quick Start Guide](https://smithery.ai/docs/getting_started/quickstart_build)
- 🛠️ [Our Smithery CLI Setup Guide](../deployment/smithery-cli-setup.md)
- 🎮 [Live Demo: Smithery Playground](https://smithery.ai/server/@kesslerio/attio-mcp-server)

### Setup Steps

1. **Expose the full tool catalogue** (do _not_ set `ATTIO_MCP_TOOL_MODE`).

2. **Deploy the server** to Smithery (required for ChatGPT compatibility):

   ```bash
   # Development testing
   npm run dev  # Opens Smithery Playground with ngrok tunnel

   # Production deployment - already available at Smithery marketplace
   ```

3. **Configure ChatGPT**:
   - Open **Settings → Connectors → Advanced**.
   - Enable **Developer Mode**.
   - Add the **Attio MCP Server URL**: `https://server.smithery.ai/@kesslerio/attio-mcp-server/mcp`
     - This is the official ChatGPT endpoint with the required `/mcp` suffix
     - Server marketplace page: https://smithery.ai/server/@kesslerio/attio-mcp-server
   - **Do NOT use direct server URLs** - ChatGPT requires Smithery OAuth integration

4. **OAuth Authentication**:
   - ChatGPT will redirect to Smithery for OAuth authorization
   - Grant permissions for the Attio MCP server
   - Smithery handles token refresh and API key management automatically

5. **Verification**:
   - ChatGPT will automatically auto-approve tools with `readOnlyHint: true` (e.g. `records.search`, `records.get_details`)
   - Prompt for approval on write tools (`create-record`, `update-record`) and destructive tools (`delete-record`)

### Approval messaging tips

- Tool descriptions should clearly explain the effect of the operation (e.g. “Create a new Attio contact”).
- Validation errors should mention that approval may be required (we already surface this in handler responses).

---

## 3. Search-Only Compatibility Mode

Set the environment variable:

```bash
export ATTIO_MCP_TOOL_MODE=search
```

When this flag is present the server will only advertise:

| Tool                              | Behaviour                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `search`                          | Delegates to the universal search service and returns JSON-encoded results in a single text content item |
| `fetch`                           | Retrieves the full record payload for a search result ID                                                 |
| `health-check`/`aaa-health-check` | Simple readiness probes                                                                                  |

All other tools are filtered out at registry time and ignored by the dispatcher. This is ideal for ChatGPT accounts without Developer Mode or for a constrained roll-out.

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

| Symptom                                            | Likely Cause                                                                  | Fix                                                                                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| ChatGPT requests consent for read-only tools       | `readOnlyHint` missing                                                        | Confirm you are running a version that includes safety annotations                                                                       |
| **ChatGPT only sees 'search' and 'fetch' tools**   | **Server running in search-only mode (Issue #869)**                           | **Redeploy to Smithery - fixed in v1.1.1+ with explicit full-mode default**. Set `ATTIO_MCP_TOOL_MODE: 'full'` in Smithery configuration |
| ChatGPT cannot see write tools                     | Running with `ATTIO_MCP_TOOL_MODE=search` for non-Developer Mode              | For Developer Mode: set `ATTIO_MCP_TOOL_MODE: 'full'` in Smithery configuration                                                          |
| ChatGPT shows all tools but only uses search/fetch | ChatGPT Developer Mode not enabled                                            | Enable Developer Mode in ChatGPT settings or set `ATTIO_MCP_TOOL_MODE: 'search'` to match capabilities                                   |
| ChatGPT cannot connect to server                   | Using direct server URL instead of Smithery                                   | Use ChatGPT endpoint URL: `https://server.smithery.ai/@kesslerio/attio-mcp-server/mcp`                                                   |
| OAuth authentication fails                         | Smithery deployment not configured properly                                   | Ensure server is deployed via `npm run dev` or available at Smithery marketplace                                                         |
| Tools show "unauthorized" errors                   | API credentials not configured in Smithery                                    | Configure `ATTIO_API_KEY` and `ATTIO_WORKSPACE_ID` in Smithery dashboard                                                                 |
| `search` returns no results                        | Ensure Attio API credentials are set and universal search works in Claude/CLI | Verify credentials in Smithery configuration                                                                                             |
| PR validation fails with missing Attio credentials | Expected if secrets are not available locally; see `README.md` testing notes  | Use Smithery for production deployments with proper credential management                                                                |

---

## 6. Next Steps

- Monitor approval logs to verify the safety flow.
- Add targeted UI messaging in ChatGPT descriptions for high-risk tools (`delete-record`, `batch-operations`).
- Expand the test suite with real Developer Mode integration tests once mocked approval APIs become available.
