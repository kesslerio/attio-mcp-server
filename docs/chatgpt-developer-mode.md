# ChatGPT Developer Mode Integration

This guide explains how to expose the Attio MCP server to ChatGPT users in two configurations:

1. **Full Developer Mode** – Pro/Plus accounts with the Developer Mode beta enabled can access the entire Attio toolset, including write operations, with built-in approval flows.
2. **Search-Only Compatibility** – For accounts without Developer Mode, expose a minimal `search`/`fetch` surface that mirrors OpenAI’s baseline MCP requirements.

The server now publishes MCP safety annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`) on every tool definition so ChatGPT can make informed approval decisions.

---

## 1. Requirements

| Scenario       | Requirements                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| Developer Mode | ChatGPT Pro/Plus subscription, browser access, _Settings → Connectors → Advanced → Developer Mode_ enabled |
| Search Only    | Any ChatGPT account that supports custom connectors                                                        |

### Server prerequisites

- Publicly accessible HTTPS endpoint (or a tunnel such as `smithery dev --public` during development).
- Standard MCP transport (STDIO is fine locally, Smithery or your hosting provider for production).
- Set `ATTIO_API_KEY`/`ATTIO_WORKSPACE_ID` for Attio API access.

---

## 2. Enabling Developer Mode Access

1. **Expose the full tool catalogue** (do _not_ set `ATTIO_MCP_TOOL_MODE`).
2. Deploy the server (see the main README for deployment options).
3. In ChatGPT:
   - Open **Settings → Connectors → Advanced**.
   - Enable **Developer Mode**.
   - Add the Attio MCP server URL.
4. ChatGPT will automatically:
   - Auto-approve tools with `readOnlyHint: true` (e.g. `search-records`, `get-record-details`).
   - Prompt for approval on write tools (`create-record`, `update-record`) and destructive tools (`delete-record`).

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

| Symptom                                            | Likely Cause                                                                  | Fix                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| ChatGPT requests consent for read-only tools       | `readOnlyHint` missing                                                        | Confirm you are running a version that includes safety annotations |
| ChatGPT cannot see write tools                     | Running with `ATTIO_MCP_TOOL_MODE=search`                                     | Unset the variable for full access                                 |
| `search` returns no results                        | Ensure Attio API credentials are set and universal search works in Claude/CLI |
| PR validation fails with missing Attio credentials | Expected if secrets are not available locally; see `README.md` testing notes  |

---

## 6. Next Steps

- Monitor approval logs to verify the safety flow.
- Add targeted UI messaging in ChatGPT descriptions for high-risk tools (`delete-record`, `batch-operations`).
- Expand the test suite with real Developer Mode integration tests once mocked approval APIs become available.
