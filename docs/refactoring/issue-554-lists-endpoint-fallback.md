# Issue #554: List Entry Endpoint Fallback – Investigation Plan

Decision
- Chosen: Option A (simplify) — use only `POST /lists/{listId}/entries/query`.
- Rationale: Prefer simplicity; fallback complexity is not justified unless integration tests show failures.
- Next: Validate against real Attio API; if stable, consider removing `utils/api-fallback.ts` in follow-up.

Context
- Current implementation previously used `executeWithListFallback` to try:
  1) POST `/lists/{listId}/entries/query`
  2) POST `/lists-entries/query`
  3) GET `/lists-entries` (only without filters)
- Goal: Determine if a single endpoint can be used reliably and simplify accordingly.

Plan
1. Research
   - Review git history and PRs that introduced/modified the fallback.
   - Check Attio API docs for official guidance and expected shapes.
   - Run integration tests for each endpoint path and capture logs.
2. Decision
   - Primary endpoint appears reliable → adopt Option A (implemented).
3. Validation
   - Unit + integration + E2E within existing test suites.
   - Confirm `formatResult` and error paths are consistent.

Test Strategy
- Use `npm run test:integration` for real API.
- For E2E debug: run with no bail and capture logs (see CLAUDE.md guidance).
- Ensure test data cleanup via `npm run cleanup:test-data -- --dry-run` first.

Notes
- Keep production/test separation, avoid importing tests into `src/`.
- Prefer `Record<string, unknown>` over `any`; preserve existing API types.
- Follow import order and style (2-space indentation, snake_case files).
