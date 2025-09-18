# Issue #635 Plan — Refactor: Replace console.log statements with proper logging

## Summary

Replace all `console.*` usage in production code (`src/`) with the existing structured logger. Allow `console.*` in `test/` and `scripts/` only when justified (diagnostics or CLI UX). Maintain behavior (no functional changes), improve observability and consistency.

## Logger Mapping

- `console.debug` → `logger.debug`
- `console.log` / `console.info` → `logger.info`
- `console.warn` → `logger.warn`
- `console.error` → `logger.error`

Notes:

- Prefer structured context objects: `logger.info("message", { contextKey })`.
- Do not introduce environment-based branching (no NODE_ENV conditionals in logger calls).
- Remove any `console.*` from `src/` entirely.

## Scope Rules

- `src/`: No `console.*` allowed — replace with `logger.*`.
- `test/`: `console.*` allowed for diagnostics; prefer spying on `logger` for assertions.
- `scripts/`: `console.*` acceptable (user-facing CLI), but keep consistent formatting.

## Acceptance Criteria (from issue)

- [ ] Audit codebase for all `console.log/console.warn/console.error` usage
- [ ] Replace with appropriate `logger` calls (levels mapped appropriately)
- [ ] Ensure messages are meaningful and structured
- [ ] Verify no `console` statements remain in production code (`src/`)
- [ ] Update related documentation

## Phased Implementation

1. Audit: `rg -n "console\.(log|info|warn|error|debug)\(" src/ test/ scripts/`
2. Replace in `src/handlers/**`
3. Replace in `src/api/**`
4. Replace in `src/tools/**`
5. Replace in `src/utils/**` (avoid recursion/ensure logger not self-logging)
6. Final sweep and remove stragglers

## Testing & Quality Gates

- Run `npm run test:offline` locally per commit.
- Pre-commit hook enforces: lint, format, build, tests — keep changes small.
- No `console.*` in `src/` per logging standards.

## References

- Issue: https://github.com/kesslerio/attio-mcp-server/issues/635
- Logger: `src/utils/logger.ts` (verify and import consistently)
- Project logging standards (CLAUDE.md / project docs)

## Risks & Mitigations

- Pre-commit failures unrelated to this change → keep PR focused (docs-only first).
- Missing logger in some modules → add import and use; ensure no circular deps.
- Behavior change risk → do not change message semantics; only routing + structure.
