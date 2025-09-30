# Tool Quality Standards (Phase 0 Baseline)

This guide captures the engineering guardrails introduced in Issue #776 Phase 0. Use it as the authoritative reference before modifying or adding MCP tools.

## 1. Naming & Aliases

- **Verb-first pattern**: Follow `<resource>.<action>` (e.g., `people.search`, `deals.update_stage`). See `src/handlers/tools/standards/index.ts` for the template.
- **Alias registry**: `src/config/tool-aliases.ts` holds deprecated → canonical mappings.
  - Aliases are enabled by default; set `MCP_DISABLE_TOOL_ALIASES=true` to disable at runtime.
  - Every alias entry must document `target`, optional `reason`, and planned `removal` release.
  - Alias usage is logged under the `tools.aliases` scope for telemetry.
- **Renaming workflow**: Phase 1+ must add aliases instead of deleting legacy names, update docs, and remove aliases only after client validation.

## 2. Descriptions & Error Copy

- Use `formatToolDescription()` to compose descriptions with the following segments:
  1. Capability (`"Search people by email."`)
  2. Boundary (`"Does not: create new records."`)
  3. Constraints (optional limits, pagination, required filters)
  4. Recovery hint (`"If this fails: run lists.discover_attributes."`)
  5. Approval flag when applicable (`"WRITE: requires approval"`)
- Error payloads should be created via `buildErrorTemplate()` to guarantee JSON-RPC compliance and actionable recovery hints.

## 3. Schema Expectations

- Top-level `inputSchema` must include `additionalProperties: false` unless explicitly justified.
- Provide at least one example in the schema to guide planners.
- Explicitly list enums for constrained values and clarify either/or relationships in descriptions (schema-level `oneOf` remains disallowed).
- Unbounded lists should declare `limit`, `offset`, and `more_available` in responses.

## 4. Automation & CI

- **Schema linter**: `npm run lint:tools` executes `scripts/tool-schema-lint.ts` against all tool definitions.
  - Default mode records errors but exits 0; set `MCP_TOOL_LINT_MODE=strict` locally/CI to fail on violations.
  - Phase 1+ must drive error count toward zero as tools are remediated.
- **Discovery snapshot**: `scripts/generate-tools-snapshot.ts` writes `docs/tools/tool-discovery-baseline.json` for golden tests and quick diffing.
  - Regenerate after meaningful tool changes; commit alongside code.

## 5. Rollback Mechanics

- Aliases can be toggled via `MCP_DISABLE_TOOL_ALIASES=true` if a rename causes regressions.
- Schema lint stays non-blocking in Phase 0 to avoid false positives; escalate to strict mode per category as it is remediated.
- The discovery snapshot lets us revert to the last known-good surface quickly (compare diff + revert offending changes).

## 6. Checklist Before Modifying Tools

- [ ] Update naming to fit the verb-first standard or register an alias.
- [ ] Update descriptions with capability/boundary/recovery segments.
- [ ] Ensure schemas declare `additionalProperties`, examples, enums, and pagination hints as needed.
- [ ] Add/update tests (golden discovery snapshot, routing smoke tests, targeted unit suites).
- [ ] Run `npm run lint:tools` (consider `MCP_TOOL_LINT_MODE=strict`) and resolve new violations.
- [ ] Update documentation (developer guide, migration notes) and reference acceptance criteria in PR.

Keep this document tight; revise it at the end of each phase after we harden additional quality gates.
