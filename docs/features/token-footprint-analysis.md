# Token Footprint Analysis

The Attio MCP server loads every tool definition and built-in prompt template into the LLM context during the MCP discovery handshake (`tools/list` + `prompts/list`). These payloads represent a constant context tax on every session, even if no tools are invoked. The token footprint analyzer provides a deterministic way to measure and optimize that baseline load.

## Running the Analyzer

```bash
npm run analyze:token-footprint
```

This command:

1. Simulates the discovery handshake using the same definitions exported to MCP clients.
2. Counts tokens for the JSON payload using `@dqbd/tiktoken` and the configured model (defaults to `claude-3-7-sonnet-20250219` or `COUNT_MODEL_DEFAULT`).
3. Writes timestamped reports to `/tmp/`:
   - JSON (`attio-mcp-token-footprint-<timestamp>.json`) with structured data
   - Markdown summary for quick review
4. Prints a console summary that includes overall totals, context window percentages (32K / 128K / 200K), and the top token-heavy items.

Example output:

```
Attio MCP Baseline Token Footprint
----------------------------------
Total tokens: 3247
Tools: 2105 tokens across 14 definitions
Prompts: 1142 tokens across 10 definitions

Context window impact:
  - 32k: 10.15%
  - 128k: 2.54%
  - 200k: 1.62%

Top items:
  - tool :: records.search :: 387 tokens (category: records) ⚠️
  - prompt :: qualify_lead.v1 :: 312 tokens (category: qualification)

Detailed reports:
  • /tmp/attio-mcp-token-footprint-20250823-143022.json
  • /tmp/attio-mcp-token-footprint-20250823-143022.md
```

## Report Structure

The JSON report contains:

- `baseline_context_load.total_tokens` – total discovery payload tokens.
- `baseline_context_load.tools` / `prompts` – section totals, counts, per-category breakdowns, and per-item tokens.
- `context_window_percentages` – percentage usage for 32K / 128K / 200K context windows.
- `heaviest_items` – top N items (configurable via `topN`) sorted by token cost, flagged if they exceed `heavyThreshold` (default 250).

## Configuration

Environment variables influence the analyzer:

| Variable                    | Description                            | Default                      |
| --------------------------- | -------------------------------------- | ---------------------------- |
| `COUNT_MODEL_DEFAULT`       | Model to use for token estimation      | `claude-3-7-sonnet-20250219` |
| `TOKEN_FOOTPRINT_THRESHOLD` | Override heavy item threshold (tokens) | `250`                        |
| `TOKEN_FOOTPRINT_TOP_N`     | Override number of top items in report | `10`                         |

## Optimization Tips

- **Reduce verbose descriptions** while keeping key instructions.
- **Consolidate tools** where possible to avoid duplicate schemas.
- **Prune or simplify prompt templates** that rarely deliver value.
- **Monitor regressions**: run the analyzer before merging large tool/prompt changes and compare reports.

Keeping the baseline footprint lean helps MCP clients maintain more headroom for dynamic tool usage and user context.
