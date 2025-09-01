# Issue #554: List Entry Endpoint Fallback – Investigation Plan

Context
- Current implementation uses `executeWithListFallback` to try:
  1) POST `/lists/{listId}/entries/query`
  2) POST `/lists-entries/query`
  3) GET `/lists-entries` (only without filters)
- Goal: Determine if a single endpoint can be used reliably and simplify accordingly.

Questions
1. Why were multiple endpoints required originally? (API evolution, workspace differences, compatibility)
2. Are all endpoints still necessary today? (Test against current API)
3. What is the actual failure rate/success patterns?

Options
- Option A (Simplify): Use only `/lists/{listId}/entries/query` if reliable.
- Option B (Document/Optimize): Keep fallback with explicit documentation, logging, metrics; optimize ordering and consider caching per-workspace success.

Plan
1. Research
   - Review git history and PRs that introduced/modified the fallback.
   - Check Attio API docs for official guidance and expected shapes.
   - Run integration tests for each endpoint path and capture logs.
2. Decision
   - If primary endpoint is reliable → adopt Option A.
   - If not → implement Option B with instrumentation hooks.
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
