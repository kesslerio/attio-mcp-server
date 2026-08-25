---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
type: fix
title: 'fix: Make date-parser unit tests timezone-safe'
origin: 'https://github.com/kesslerio/attio-mcp-server/issues/1253'
created: 2026-08-25
target_repo: attio-mcp-server
---

# fix: Make date-parser unit tests timezone-safe

## Goal Capsule

- Objective: `test/utils/date-parser.test.ts` passes on every host timezone so pre-push / offline unit runs do not flake or force `SKIP_PREPUSH`.
- Means: Pin `TZ=UTC` in the vitest configs that execute this suite (default + offline), matching the ISO calendar expectations already hardcoded in the tests. Do not change production `date-parser` behavior in this PR.
- Authority: Issue #1253 acceptance criteria; no session-settled product forks.
- Stop when: Suite is green under `TZ=Asia/Tokyo` (and other non-UTC hosts) via the normal `bun run test:single` / offline paths, with no production parser edits unless a separate blocker appears.

## Product Contract

### Requirements

- R1. Date-parser unit tests pass on non-UTC hosts (including positive UTC offsets such as Asia/Tokyo and Europe/Berlin) without `SKIP_PREPUSH`.
- R2. Expectations stay timezone-safe by pinning `TZ` in test config and/or computing boundaries with the same zone logic as the parser.
- R3. `bun run test:single test/utils/date-parser.test.ts` is green locally and remains green in CI.
- R4. No production parser behavior change unless required to fix incorrect timezone handling for this issue's test failures.

### Actors

- A1. Developer on a non-UTC machine running unit / pre-push tests.
- A2. CI runners (typically UTC today) that must stay green after the pin.

### Acceptance examples

- AE1. `TZ=Asia/Tokyo bun run test:single test/utils/date-parser.test.ts` → 29/29 pass after the fix (baseline today: 19 failed).
- AE2. Host `America/Los_Angeles` continues to pass (already green today for this suite).
- AE3. Pre-push offline path (`bun run test:offline:run`) inherits the same UTC pin so date-parser cannot fail that gate solely due to host TZ.

### Scope boundaries

**In scope** — vitest env pin(s) for unit/offline configs that run `test/utils/date-parser.test.ts`; optional one-line comment documenting why `TZ=UTC` is set; CHANGELOG Fixed entry referencing #1253.

**Out of scope / deferred** — rewriting `src/utils/date-parser.ts` to use consistent UTC calendar helpers (`getUTC*` / `setUTC*` or a date library). The parser mixes local `setHours`/`getDay` with `toISOString()` calendar slicing, which is a real production timezone footgun, but #1253 AC prefers test stability without a behavior change unless required. Track as follow-up if desired.

**Rejected alternative** — rewriting every expectation to derive from local-zone math at runtime. That couples assertions to host TZ and obscures the intended calendar ranges; pinning UTC keeps the existing readable fixtures and matches CI.

## Planning Contract

### Key Technical Decisions

- KTD1. Pin `TZ: 'UTC'` via vitest `test.env` in `configs/vitest/vitest.config.ts` and `configs/vitest/vitest.config.offline.ts`. Chosen over rewriting fixtures or changing the parser: vitest worker env is applied at fork start (verified: `TZ=Asia/Tokyo` + config `env.TZ=UTC` makes local midnight format as UTC midnight). Offline config is required because husky pre-push runs `test:offline:run`.
- KTD2. Leave `src/utils/date-parser.ts` unchanged for this issue. Satisfies R4; production UTC rewrite is deferred, not denied forever.

### Assumptions

- Vitest `test.env.TZ` is sufficient on threads and forks pools used by this repo's unit configs (spot-checked with a throwaway vitest config under host `Asia/Tokyo`).
- Other vitest configs (e2e, mcp, integration, performance) do not need the pin for #1253 unless they also execute this file; they currently do not.

### Risks

- Low: some future test might intentionally assert host-local timezone behavior and would then run under UTC. Mitigate with a short comment on the `env` block; if such a test appears later, give it an explicit local override or a dedicated config.

## Implementation Units

### U1. Pin UTC in unit/offline vitest configs

- Goal — Make date-parser (and other local-Date unit tests) deterministic regardless of host TZ. Covers R1, R2, R3, R4 via KTD1/KTD2.
- Dependencies — none.
- Files — `configs/vitest/vitest.config.ts`, `configs/vitest/vitest.config.offline.ts`; optionally `CHANGELOG.md`.
- Approach —
  - Add `env: { TZ: 'UTC' }` under `test` in both configs (merge with any existing `env` if present; today neither unit/offline file sets `env`).
  - Add a one-line comment referencing timezone-sensitive date utilities / #1253.
  - Do not edit `test/utils/date-parser.test.ts` or `src/utils/date-parser.ts` unless verification shows the pin alone is insufficient.
- Patterns to follow — existing `env` blocks in `configs/vitest/vitest.config.integration.ts` / `vitest.config.e2e.ts`.
- Test scenarios —
  - Happy: with host `TZ=Asia/Tokyo`, `bun run test:single test/utils/date-parser.test.ts` → all 29 pass.
  - Happy: with host `TZ=UTC` and `TZ=America/Los_Angeles`, same command stays green.
  - Regression: offline config path still discovers and passes the suite (`bun run test:offline:run -- test/utils/date-parser.test.ts` or equivalent filter).
  - Edge: week-boundary case (`2024-03-17T12:00:00Z` / "this week") returns Mon–Sun `2024-03-11`–`2024-03-17` under the pin.
- Execution note — smoke-first: reproduce failure under `TZ=Asia/Tokyo` before the pin, then confirm green after.
- Verification — commands in Verification Contract.

## Verification Contract

- Reproduce (expected fail today): `TZ=Asia/Tokyo bun run test:single test/utils/date-parser.test.ts` → ~19 failures.
- After U1: same command → 29 passed.
- Also: `TZ=Europe/Berlin bun run test:single test/utils/date-parser.test.ts` → 29 passed.
- Also: `TZ=America/Los_Angeles bun run test:single test/utils/date-parser.test.ts` → 29 passed.
- Offline gate sample: `TZ=Asia/Tokyo bun run test:offline:run -- test/utils/date-parser.test.ts` → pass.
- No `src/utils/date-parser.ts` diff unless a blocker forces KTD2 revisit.

## Definition of Done

- U1 complete; vitest default + offline configs pin `TZ=UTC`.
- Acceptance criteria on #1253 checklist satisfied.
- CHANGELOG `[Unreleased]` Fixed entry with `#1253` when shipping user/dev-facing test infra reliability.
- PR titled `Fix: …`, body with What / Why / Tests / AI Assistance, targeting `kesslerio/attio-mcp-server`.

## Appendix

### Failure mechanism (research)

`parseRelativeDate` builds boundaries with local setters (`setHours(0,0,0,0)`, `getDay()`, `setDate`) then emits calendars via `toISOString().split('T')[0]`. On positive UTC offsets, local midnight is the previous UTC calendar day, so assertions hardcoded for UTC March 2024 week/month boundaries fail (~19/29). Negative offsets (e.g. America/Los_Angeles) often still match those fixtures when the fake clock is noon UTC; positive offsets do not. Pinning `TZ=UTC` aligns local calendar ops with the ISO date slice the tests expect.
