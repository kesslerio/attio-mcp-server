---
title: 'refactor: Alias Imports Batch 1'
type: refactor
status: active
date: 2026-06-09
origin: https://github.com/kesslerio/attio-mcp-server/issues/745
---

# refactor: Alias Imports Batch 1

## Summary

Migrate the first high-impact batch of remaining deep relative imports to the existing TypeScript path aliases for issue #745. This batch targets current production hotspots and their paired service tests, without attempting the full repo-wide migration in one oversized PR.

---

## Problem Frame

Issue #745 asks for the repo to finish moving away from deep relative imports such as `../../src/...` and `../utils/...` toward configured aliases like `@/`, `@services/*`, `@handlers/*`, and `@test/*`. The original Tier 1 files from the issue analysis are already migrated in this checkout, but a fresh scan still finds roughly 1,200 deep relative import lines across `src/` and `test/`. A bounded first batch should reduce the worst current hotspots while preserving reviewability.

---

## Requirements

- R1. Replace deep relative import/export specifiers in the selected batch with existing path aliases.
- R2. Preserve ESM `.js` suffixes where imports currently resolve TypeScript sources through NodeNext.
- R3. Do not add new aliases unless an existing alias cannot express the import cleanly.
- R4. Keep the change mechanical: no behavior changes, no refactors beyond import specifiers.
- R5. Validate with Bun-based repo commands, not stale `npm`/`npx` commands from the old issue body.
- R6. Keep the PR reviewable and leave the broader repo-wide migration to later #745 batches.

---

## Scope Boundaries

- In scope: selected high-count production files and directly relevant paired service tests.
- Out of scope: all remaining repo imports, E2E-wide migration, new path alias design, runtime behavior changes, dependency updates, issue label cleanup.
- Out of scope: converting imports inside generated output, `dist/`, or historical test artifacts.

### Deferred to Follow-Up Work

- Additional #745 batches for `test/e2e/**`, `test/handlers/**`, lower-count production modules, and any directories still showing deep relative imports after this PR.
- Optional issue hygiene update to remove stale `status:untriaged` from #745.

---

## Context & Research

### Relevant Code and Patterns

- `tsconfig.json` already defines aliases for `@/*`, `@handlers/*`, `@services/*`, `@api/*`, `@config/*`, `@shared-types/*`, `@utils/*`, `@errors/*`, `@test-support/*`, and `@test/*`.
- Current code already uses aliases with `.js` suffixes, for example `@/handlers/tool-configs/universal/shared-handlers.js`, `@services/UniversalSearchService.js`, and `@api/operations/query-parser.js`.
- Fresh scan on 2026-06-09 found the original Tier 1 files already migrated: `src/handlers/tool-configs/universal/shared-handlers.ts`, `src/services/UniversalSearchService.ts`, `src/services/UniversalRetrievalService.ts`, and `src/handlers/tools/registry.ts`.
- Current highest production hotspots include `src/objects/companies/basic.ts`, `src/objects/records/index.ts`, `src/objects/companies/notes.ts`, `src/services/UniversalDeleteService.ts`, `src/services/create/CreateValidation.ts`, and `src/objects/tasks.ts`.
- Current highest paired service-test hotspots include `test/services/UniversalRetrievalService-validation.test.ts`, `test/services/UniversalRetrievalService-core-operations.test.ts`, `test/services/UniversalUpdateService-core-operations.test.ts`, `test/services/UniversalSearchService-companies-people-lists.test.ts`, and `test/services/UniversalDeleteService.test.ts`.

### Institutional Learnings

- Repository guidance requires Bun commands for validation.
- Import alias migration must preserve `.js` suffixes because the project uses `moduleResolution: "NodeNext"`.
- PR size guidance prefers focused batches; the full remaining migration is too large for one normal PR.

---

## Key Technical Decisions

- **Use existing aliases only**: Use `@/` for source areas without dedicated aliases, such as `src/objects`, and use dedicated aliases where already present (`@services/*`, `@handlers/*`, `@utils/*`, `@api/*`, `@shared-types/*`, `@test/*`). This avoids tsconfig churn.
- **Batch by current import count, not old issue count**: The old Tier 1 files are already migrated, so implementation should target the current scan results.
- **Include paired service tests where low-risk**: Service tests import the same central modules and are good coverage for alias resolution. Avoid sweeping E2E files in this first PR because those are more likely to involve test-runner path and mock subtleties.
- **Use mechanical replacement with verification**: Prefer AST- or resolver-aware reasoning where possible, but the implementation can use deterministic specifier replacement because only import paths change.

---

## Open Questions

### Resolved During Planning

- Should this PR migrate the entire repo? No. The current scan shows roughly 1,200 import lines, which would exceed normal PR-size guidance and muddy review.
- Are the issue's original top four files still the right first target? No. They are already using aliases in this checkout.

### Deferred to Implementation

- Exact final file set can adjust slightly if a selected file has path shapes that are risky or if nearby paired tests are needed to keep validation green.

---

## Implementation Units

### U1. Production Import Hotspots

**Goal:** Convert deep relative imports in the highest-count production files to existing aliases while preserving behavior.

**Requirements:** R1, R2, R3, R4, R6

**Dependencies:** None

**Files:**

- Modify: `src/objects/companies/basic.ts`
- Modify: `src/objects/records/index.ts`
- Modify: `src/objects/companies/notes.ts`
- Modify: `src/services/UniversalDeleteService.ts`
- Modify: `src/services/create/CreateValidation.ts`
- Modify: `src/objects/tasks.ts`
- Modify: other adjacent high-count production files only if needed to keep the batch coherent and reviewable

**Approach:**

- Replace relative imports targeting `src/` with aliases:
  - `src/objects/**` targets use `@/objects/...`
  - `src/services/**` targets use `@services/...`
  - `src/handlers/**` targets use `@handlers/...`
  - `src/api/**` targets use `@api/...`
  - `src/utils/**` targets use `@utils/...`
  - `src/types/**` targets use `@shared-types/...` or existing local convention when the file already prefers `@/types/...`
- Preserve `.js` suffixes.
- Avoid changing import ordering unless the formatter/linter requires it.

**Patterns to follow:**

- `src/services/UniversalSearchService.ts`
- `src/services/UniversalRetrievalService.ts`
- `src/handlers/tools/registry.ts`

**Test scenarios:**

- TypeScript resolves every changed production import.
- Build/lint do not report unresolved modules.
- No runtime code changes appear in the diff except import specifiers.

**Verification:**

- `bun run typecheck`
- `bun run lint:src`

### U2. Paired Service Test Imports

**Goal:** Convert deep relative imports in the paired service tests that cover the migrated central services.

**Requirements:** R1, R2, R3, R4, R5, R6

**Dependencies:** U1

**Files:**

- Modify: `test/services/UniversalRetrievalService-validation.test.ts`
- Modify: `test/services/UniversalRetrievalService-core-operations.test.ts`
- Modify: `test/services/UniversalUpdateService-core-operations.test.ts`
- Modify: `test/services/UniversalSearchService-companies-people-lists.test.ts`
- Modify: `test/services/UniversalDeleteService.test.ts`

**Approach:**

- Replace `../../src/...` test imports with `@/...` or dedicated source aliases.
- Replace relative imports to test utilities with `@test/...` where appropriate.
- Check `vi.mock()` path strings carefully; update only when the mocked module path should match the new alias and Vitest alias resolution already supports it.

**Patterns to follow:**

- `test/services/openai-compatibility.service.test.ts`
- `test/integration/universal-tools-lists.test.ts`
- `test/handlers/tools/registry-mode.test.ts`

**Test scenarios:**

- Tests still import the same production modules.
- Vitest mocks still target the intended modules.
- The selected service tests pass or fail only for pre-existing unrelated reasons documented in verification output.

**Verification:**

- `bun run test:offline:run -- test/services/UniversalRetrievalService-validation.test.ts`
- `bun run test:offline:run -- test/services/UniversalRetrievalService-core-operations.test.ts`
- `bun run test:offline:run -- test/services/UniversalUpdateService-core-operations.test.ts`
- `bun run test:offline:run -- test/services/UniversalSearchService-companies-people-lists.test.ts`
- `bun run test:offline:run -- test/services/UniversalDeleteService.test.ts`

### U3. Batch-Level Validation and Residual Accounting

**Goal:** Prove the first alias batch is coherent and leave a clear accounting of remaining issue #745 work.

**Requirements:** R5, R6

**Dependencies:** U1, U2

**Files:**

- Modify: no source files expected beyond U1/U2
- Optional Modify: `docs/plans/2026-06-09-001-refactor-alias-imports-batch-1-plan.md` status only at shipping time if the workflow marks it complete

**Approach:**

- Run a fresh import scan after edits to show the selected files no longer contain deep relative import/export specifiers.
- Run targeted validation first, then broader `bun run typecheck`.
- If full offline tests are cheap enough in the current environment, run `bun run test:offline:run`; otherwise document why targeted tests were used.

**Test scenarios:**

- Fresh scan reports zero deep relative import lines in changed files.
- Typecheck passes after alias conversion.
- Targeted service tests pass.

**Verification:**

- `rg -n "^\\s*(import|export)\\s+(type\\s+)?(.+?\\s+from\\s+)?['\\\"]\\.\\./|import\\(['\\\"]\\.\\./" <changed-files>`
- `bun run typecheck`
- Targeted test commands from U2

---

## Risks and Mitigations

- **Alias mismatch risk:** Use aliases already configured in `tsconfig.json`; verify with `bun run typecheck`.
- **Vitest mock identity risk:** Be careful with `vi.mock()` path strings; run the affected tests directly.
- **Oversized PR risk:** Keep this to batch 1 and defer the rest of issue #745.
- **False progress risk:** The old issue scan is stale; rely on fresh import scans before and after changes.

---

## Verification Checklist

- [ ] Changed production files use aliases instead of deep relative imports.
- [ ] Changed service tests use aliases where practical and still target the same modules.
- [ ] Fresh scan reports no deep relative imports in changed files.
- [ ] `bun run typecheck` passes.
- [ ] Targeted service tests pass or any unrelated pre-existing failures are documented.
- [ ] PR body references issue #745 and states this is batch 1, not the full migration.
