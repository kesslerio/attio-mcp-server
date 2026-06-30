---
title: 'refactor: Alias Imports Current Batch'
type: refactor
date: 2026-06-11
origin: https://github.com/kesslerio/attio-mcp-server/issues/745
---

# refactor: Alias Imports Current Batch

## Summary

Migrate the current highest-signal batch of remaining deep relative imports for issue #745 to the repository's existing TypeScript path aliases. This batch targets create/update services, legacy dispatcher operations, and paired service tests while keeping the change mechanical and reviewable.

---

## Problem Frame

Issue #745 asks the repo to finish replacing deep relative imports such as `../../../types/attio.js` and `../../src/services/...` with configured aliases. The issue body is stale: its original top files are already migrated in this checkout, but a fresh scan still reports 903 deep relative import lines across `src/` and `test/`. The useful next step is a bounded batch based on the current hotspots, not a repo-wide sweep.

---

## Requirements

- R1. Replace deep relative import and dynamic-import specifiers in the selected batch with existing aliases.
- R2. Preserve ESM `.js` suffixes for TypeScript source imports under NodeNext.
- R3. Do not add or change path aliases; use the existing `tsconfig.json` and Vitest alias surface.
- R4. Keep the diff mechanical: no behavior changes, no cleanup beyond import specifiers and formatter fallout.
- R5. Validate with Bun-based repo commands rather than the stale npm/npx commands in the issue body.
- R6. Leave a clear residual accounting for remaining issue #745 batches.

---

## Scope Boundaries

- In scope: selected high-count production files in `src/services/create`, `src/services/update`, and `src/handlers/tools/dispatcher/operations`, plus paired service tests in `test/services`.
- Out of scope: E2E-wide migration, low-count scattered imports, alias design, runtime behavior changes, dependency updates, and GitHub issue label cleanup.
- Out of scope: generated output, `dist/`, historical manual test artifacts, and non-TypeScript files unless validation proves they are necessary for this batch.

---

## Context & Research

- `tsconfig.json` already defines `@/*`, `@api/*`, `@config/*`, `@constants/*`, `@handlers/*`, `@services/*`, `@errors/*`, `@shared-types/*`, `@utils/*`, `@test-support/*`, and `@test/*`.
- `configs/vitest/aliases.ts` maps the same aliases for test execution and includes `.js` to `.ts` handling.
- Current highest production hotspots include `src/services/create/mock-create.service.ts`, `src/services/create/strategies/PersonCreateStrategy.ts`, `src/services/create/strategies/DealCreateStrategy.ts`, `src/services/update/strategies/PersonUpdateStrategy.ts`, and the legacy dispatcher operation files under `src/handlers/tools/dispatcher/operations`.
- Current highest paired service-test hotspots include `test/services/UniversalCreateService-core-resources.test.ts`, `test/services/UniversalCreateService-objects-deals-tasks.test.ts`, `test/services/UniversalUpdateService-validation.test.ts`, `test/services/UniversalSearchService-records-tasks.test.ts`, `test/services/content-search.test.ts`, and search-strategy tests.
- The repo requires Bun for validation and uses NodeNext module resolution, so alias imports must keep their `.js` suffixes.

---

## Key Technical Decisions

- **Use existing aliases only:** Use dedicated aliases for configured source roots (`@services`, `@handlers`, `@api`, `@config`, `@utils`, `@shared-types`) and `@/` for source areas without a dedicated alias such as `src/objects` or `src/middleware`.
- **Batch current hotspots:** Ignore stale issue counts and the June 9 batch's already-cleared targets; select files from the fresh scan to avoid no-op work.
- **Update dynamic imports when they target source modules:** Dynamic `await import('../../utils/task-debug.js')` calls should move to aliases too, because they are part of the same resolver surface.
- **Keep mocks honest:** Change `vi.mock()` paths only when they refer to the same source module being imported through an alias; do not change local helper paths unnecessarily.

---

## Implementation Units

### U1. Create and Update Service Imports

**Goal:** Convert deep relative imports in the create/update service hotspots to existing source aliases.

**Requirements:** R1, R2, R3, R4

**Files:**

- Modify: `src/services/create/mock-create.service.ts`
- Modify: `src/services/create/strategies/PersonCreateStrategy.ts`
- Modify: `src/services/create/strategies/DealCreateStrategy.ts`
- Modify: `src/services/update/strategies/PersonUpdateStrategy.ts`
- Optional Modify: nearby `src/services/create/**` or `src/services/update/**` files only when a same-pattern import is needed to keep the batch coherent.

**Approach:**

- Map `src/types/**` imports to `@shared-types/...`.
- Map `src/services/**` imports to `@services/...`.
- Map `src/handlers/**` imports to `@handlers/...`.
- Map `src/config/**` imports to `@config/...`.
- Map `src/utils/**` imports to `@utils/...`.
- Map `src/objects/**` imports to `@/objects/...`.
- Preserve `.js` suffixes and import type/value distinctions.

**Patterns to follow:**

- `src/services/UniversalCreateService.ts`
- `src/services/UniversalUpdateService.ts`
- `src/services/search-strategies/interfaces.ts`

**Test scenarios:**

- TypeScript resolves every changed create/update service import.
- Dynamic imports still target the same modules.
- No runtime statements change except module specifiers.

**Verification:**

- `bun run typecheck`
- `bun run lint:file -- "src/services/create/mock-create.service.ts src/services/create/strategies/PersonCreateStrategy.ts src/services/create/strategies/DealCreateStrategy.ts src/services/update/strategies/PersonUpdateStrategy.ts"`

### U2. Legacy Dispatcher Operation Imports

**Goal:** Convert deep relative imports in the legacy dispatcher operation files to aliases without changing dispatcher behavior.

**Requirements:** R1, R2, R3, R4

**Files:**

- Modify: `src/handlers/tools/dispatcher/operations/lists.ts`
- Modify: `src/handlers/tools/dispatcher/operations/search.ts`
- Modify: `src/handlers/tools/dispatcher/operations/notes.ts`
- Modify: `src/handlers/tools/dispatcher/operations/details.ts`
- Modify: `src/handlers/tools/dispatcher/operations/advanced-search.ts`
- Optional Modify: adjacent dispatcher operation files if the same import pattern is directly repeated.

**Approach:**

- Map dispatcher-local shared imports to `@handlers/tools/...` rather than fragile relative hops.
- Map API, object, type, and utility imports to their configured aliases.
- Keep the existing operation exports and function bodies unchanged.

**Patterns to follow:**

- `src/handlers/tools/dispatcher/core.ts`
- `src/handlers/tools/registry.ts`
- `src/handlers/tool-configs/universal/core/notes-operations.ts`

**Test scenarios:**

- `findToolConfig` and dispatcher execution still resolve operation modules.
- List, search, note, detail, and advanced-search operation imports compile.
- No handler behavior changes appear in the diff.

**Verification:**

- `bun run typecheck`
- `bun run lint:file -- "src/handlers/tools/dispatcher/operations/lists.ts src/handlers/tools/dispatcher/operations/search.ts src/handlers/tools/dispatcher/operations/notes.ts src/handlers/tools/dispatcher/operations/details.ts src/handlers/tools/dispatcher/operations/advanced-search.ts"`

### U3. Paired Service Test Imports

**Goal:** Convert high-count paired service-test imports to aliases and preserve Vitest mock identity.

**Requirements:** R1, R2, R3, R4, R5

**Files:**

- Modify: `test/services/UniversalCreateService-core-resources.test.ts`
- Modify: `test/services/UniversalCreateService-objects-deals-tasks.test.ts`
- Modify: `test/services/UniversalUpdateService-validation.test.ts`
- Modify: `test/services/UniversalSearchService-records-tasks.test.ts`
- Modify: `test/services/content-search.test.ts`
- Modify: `test/services/search-strategies/TaskSearchStrategy.test.ts`
- Modify: `test/services/search-strategies/CompanySearchStrategy.test.ts`

**Approach:**

- Replace `../../src/...` and `../../../src/...` imports with source aliases.
- Preserve test-local relative imports only when they point to neighboring test helpers.
- Align `vi.mock()` module names with the aliased import names when the mock targets a source module.

**Patterns to follow:**

- `test/services/openai-compatibility.service.test.ts`
- `test/handlers/tools/registry-mode.test.ts`
- `test/configs/vitest/aliases.test.ts`

**Test scenarios:**

- The selected tests still import the same production modules.
- Mocked modules still match the implementation imports they replace.
- Targeted service tests pass or any failures are documented as pre-existing or unrelated.

**Verification:**

- `bun run test:offline:run -- test/services/UniversalCreateService-core-resources.test.ts`
- `bun run test:offline:run -- test/services/UniversalCreateService-objects-deals-tasks.test.ts`
- `bun run test:offline:run -- test/services/UniversalUpdateService-validation.test.ts`
- `bun run test:offline:run -- test/services/UniversalSearchService-records-tasks.test.ts`
- `bun run test:offline:run -- test/services/content-search.test.ts`
- `bun run test:offline:run -- test/services/search-strategies/TaskSearchStrategy.test.ts test/services/search-strategies/CompanySearchStrategy.test.ts`

### U4. Batch Validation and Residual Accounting

**Goal:** Prove this alias batch is coherent and document what remains for later #745 work.

**Requirements:** R5, R6

**Files:**

- Modify: no additional source files expected.
- Optional Modify: `CHANGELOG.md` only if repo policy requires an Unreleased entry for this internal refactor.

**Approach:**

- Run a fresh scan over changed files and confirm no selected file still has deep relative imports.
- Run targeted tests first, then broad typecheck and lint as time allows.
- Mention in the PR body that this is a current-hotspot batch and does not close all of #745.

**Test scenarios:**

- Fresh scan reports zero deep relative imports in changed files.
- Typecheck passes after alias conversion.
- Targeted tests covering changed service imports pass.

**Verification:**

- `rg -n "from ['\\\"](\\.\\./){2,}|import\\(['\\\"](\\.\\./){2,}" <changed-files>`
- `bun run typecheck`
- Targeted commands from U1, U2, and U3.

---

## Risks and Mitigations

- **Alias mismatch risk:** Use only aliases already present in `tsconfig.json` and `configs/vitest/aliases.ts`; verify with typecheck and targeted tests.
- **Vitest mock identity risk:** Keep mock specifiers aligned with implementation imports and run the selected tests directly.
- **Oversized PR risk:** Stop at the current batch and leave E2E-wide and scattered low-count files for later.
- **False completion risk:** Treat this as a #745 batch, not the whole issue; include residual scan context in the PR.

---

## Verification Checklist

- [ ] Selected production files use aliases instead of deep relative imports.
- [ ] Selected service tests use aliases and preserve mock behavior.
- [ ] Fresh scan reports no deep relative imports in changed files.
- [ ] `bun run typecheck` passes.
- [ ] Targeted service tests pass or unrelated failures are documented.
- [ ] PR body references issue #745 and says this is a current-hotspot batch, not the full migration.
