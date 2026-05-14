---
title: 'feat: List Configuration Tools'
type: feat
status: active
date: 2026-05-13
origin: docs/brainstorms/list-configuration-tools-requirements.md
---

# feat: List Configuration Tools

## Summary

Add `create-list` and `update-list-configuration` dedicated MCP tools with opinionated smart defaults (auto-resolve parent objects, list templates, response normalization, immutable-field detection) and dry-run support, plus harden the universal `create_record`/`update_record` path for lists via a shared validation module consumed by both dedicated and universal paths.

---

## Problem Frame

Agents cannot create Attio lists or modify list configuration through MCP tools. The universal `create_record`/`update_record` path technically supports lists but provides no list-specific validation, produces confusing errors for invalid parent objects or immutable fields, and returns raw Attio responses. This blocks operational workflows and forces manual list setup. (See origin for full narrative.)

---

## Requirements

- R1. MCP exposes a `create-list` tool with required inputs (name, parent_object) and optional inputs (description, access-control fields, template, dry_run).
- R2. MCP exposes an `update-list-configuration` tool that updates mutable list configuration fields for an existing list by list_id, with optional dry_run.
- R3. `create-list` auto-resolves valid parent object types from the workspace and rejects invalid values with a list of valid options.
- R4. `update-list-configuration` detects immutable fields (e.g., parent_object) and rejects attempts to change them with clear guidance.
- R5. Both tools normalize Attio responses into a consistent agent-friendly shape (list_id, name, parent_object, fields summary).
- R6. Both tools accept a `dry_run` boolean parameter (default: false) that validates and previews without writing.
- R7. `create-list` accepts an optional `template` parameter with three initial templates: `sales_pipeline`, `recruiting_tracker`, `support_queue`.
- R8. Template expansion happens before validation so dry-run and error messages reference actual values.
- R9. Errors distinguish four categories: unsupported input, insufficient token scope, Attio permission/access-control failure, generic API failure — each with a suggested next step.
- R10. Universal `create_record` with `resource_type: "lists"` applies the same parent-object validation and immutable-field detection as dedicated tools.
- R11. Universal `update_record` with `resource_type: "lists"` applies immutable-field detection and consistent error messages.
- R12. Both dedicated tools accept `workspace_access` and `workspace_member_access` as pass-through fields; hardening deferred to #1148.

**Origin actors:** A1 (Agent), A2 (Human operator), A3 (Attio API)
**Origin flows:** F1 (Create list), F2 (Update list configuration), F3 (Create from template)
**Origin acceptance examples:** AE1 (R3,R9), AE2 (R4,R9), AE3 (R6), AE4 (R7,R8), AE5 (R10), AE6 (R12)

---

## Scope Boundaries

- List attribute (field/column) management tools (`create-list-attribute`, `update-list-attribute`) — deferred to a future iteration
- Access-control hardening (403 distinction, plan/billing gating) — covered by #1148
- List deletion tool — not requested; `deleteList()` exists in codebase but no MCP tool surface
- Changes to existing entry-level list tools (`add-record-to-list`, `update-list-entry`, etc.)
- Template management UI or dynamic template discovery — templates are a static code-level catalog

### Deferred to Follow-Up Work

- List attribute management tools: future iteration after this lands
- Access-control 403 hardening: #1148
- List deletion MCP tool: not in scope but `deleteList()` exists in `src/objects/lists/base.ts`

---

## Context & Research

### Relevant Code and Patterns

- `src/handlers/tool-configs/lists.ts` — existing list tool configs and definitions; new tools register here
- `src/handlers/tools/dispatcher/operations/lists.ts` — existing list operation handlers; new dedicated-tool handlers go here
- `src/handlers/tools/registry.ts` — tool registration; `listsToolConfigs`/`listsToolDefinitions` already imported
- `src/handlers/tool-types.ts` — tool config interfaces; new `CreateListToolConfig`/`UpdateListToolConfig` types needed
- `src/objects/lists/base.ts` — `createList()` and `updateList()` core API functions; dedicated tools call these
- `src/services/create/strategies/ListCreateStrategy.ts` — universal create strategy for lists; will consume shared validation
- `src/services/update/strategies/ListUpdateStrategy.ts` — universal update strategy for lists; will consume shared validation
- `src/services/UniversalCreateService.ts` — routes `UniversalResourceType.LISTS` to `ListCreateStrategy`
- `src/services/update/UpdateOrchestrator.ts` — routes `UniversalResourceType.LISTS` to `ListUpdateStrategy`
- `src/api/attio-objects.ts` — `resolveObjectSlug()` already calls `GET /objects` via `getLazyAttioClient()` (line 51); pattern for new `getWorkspaceObjects()` function
- `src/cli/commands/attributes.ts` — `getAvailableObjects()` calls `GET /objects` but requires explicit apiKey; NOT suitable for service-layer (CLI-only)
- `src/utils/auto-discovery.ts` — uses `getAvailableObjects()` for attribute discovery; pattern reference
- `src/handlers/tool-configs/universal/validators/schema-validator.ts` — existing immutable-field detection for tasks; pattern to follow
- `src/handlers/tool-configs/universal/field-mapper/constants/lists.ts` — `LISTS_FIELD_MAPPING` for list field mapping
- `src/handlers/tools/standards/index.ts` — `formatToolDescription()` for tool description formatting
- `test/utils/mock-factories/ListMockFactory.ts` — mock factory for list test data

### Institutional Learnings

- Task immutable-field pattern (`schema-validator.ts`) provides a proven approach: detect forbidden fields before API call, throw `UniversalValidationError` with clear message
- `resolveObjectSlug()` in `src/api/attio-objects.ts` already calls `GET /objects` via the lazy client — extract a `getWorkspaceObjects()` helper there rather than importing the CLI-layer `getAvailableObjects()` which requires an explicit API key
- MCP servers must only write JSON-RPC to stdout; all logging to stderr via `logger.*`

---

## Key Technical Decisions

- **Shared validation module over inline checks**: A new `ListConfigurationValidator` module in `src/services/lists/` provides auto-resolve, immutable detection, template expansion, and response normalization. Both the dedicated tools and the universal strategies import it, guaranteeing consistent error messages across both paths. (See origin: opinionated tools + universal hardening.)
- **New `getWorkspaceObjects()` in `src/api/attio-objects.ts` for auto-resolve**: The existing `resolveObjectSlug()` in `src/api/attio-objects.ts` already calls `GET /objects` via `getLazyAttioClient()` (line 51) and iterates the response. A new `getWorkspaceObjects()` function in the same file extracts the object-slug list from that same API call, using the lazy client (no explicit API key). The validator wraps it with short-lived caching. This handles custom objects, not just a hardcoded set. Note: `getAvailableObjects()` in `src/cli/commands/attributes.ts` requires an explicit `apiKey` and creates its own Axios client — it is CLI-layer and not suitable for service-layer consumption.
- **Static template catalog as a typed constant**: Three templates (`sales_pipeline`, `recruiting_tracker`, `support_queue`) defined as a `LIST_TEMPLATES` map in the shared module. Template expansion merges caller overrides onto template defaults before validation. Easy to extend by adding entries.
- **Dedicated tools register alongside existing list tools**: New `create-list` and `update-list-configuration` tool configs and definitions are added to `listsToolConfigs`/`listsToolDefinitions` in `src/handlers/tool-configs/lists.ts`, following the existing pattern. They dispatch through the list operations dispatcher.
- **Normalized response shape**: Both tools return `{ list_id, name, parent_object, fields_summary, dry_run? }` via a `normalizeListResponse()` helper in the shared module. The `formatResult` function renders this as a human-readable string.

---

## Open Questions

### Resolved During Planning

- How are valid parent objects discovered at runtime? → New `getWorkspaceObjects()` in `src/api/attio-objects.ts` calling `GET /objects` via `getLazyAttioClient()`, following the existing `resolveObjectSlug()` pattern.
- What is the complete set of immutable list fields? → At minimum `parent_object`; the validator will define a `IMMUTABLE_LIST_FIELDS` set that can be expanded after testing against Attio API.
- What does the normalized response shape look like? → `{ list_id, name, parent_object, fields_summary, dry_run? }` where `fields_summary` lists configured fields and their values.

### Deferred to Implementation

- Exact Attio API behavior for partial-update rejection of immutable fields: the validator pre-filters, but the Attio API may reject additional fields. Implementation should test and expand `IMMUTABLE_LIST_FIELDS` accordingly.
- Template attribute details (stages, fields, defaults) for each of the three templates: defined during implementation based on Attio API capabilities and common CRM patterns.

---

## Output Structure

```
src/services/lists/
  ListConfigurationValidator.ts    # Shared validation: auto-resolve, immutable detection, template expansion, normalization
  list-templates.ts                 # LIST_TEMPLATES catalog and expansion logic
  types.ts                          # Shared types: NormalizedListResponse, ListTemplate, etc.
test/services/lists/
  ListConfigurationValidator.test.ts
  list-templates.test.ts
```

---

## High-Level Technical Design

> _This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce._

```
┌──────────────────┐     ┌──────────────────────────────┐
│  create-list     │────▶│  ListConfigurationValidator   │
│  (dedicated)     │     │  - validateParentObject()     │
└──────────────────┘     │  - expandTemplate()           │
                         │  - detectImmutableFields()    │
┌──────────────────────┐ │  - normalizeResponse()        │
│ update-list-config   │─▶│  - categorizeError()         │
│  (dedicated)         │  └──────────────────────────────┘
└──────────────────────┘           │
         │                         │
         ▼                         ▼
┌──────────────────┐     ┌──────────────────┐
│  ListCreate      │     │  ListUpdate      │
│  Strategy        │     │  Strategy        │
│  (universal)     │     │  (universal)     │
└──────────────────┘     └──────────────────┘
```

Both dedicated tools and universal strategies call the same `ListConfigurationValidator` methods before hitting the Attio API, guaranteeing consistent validation and error messages.

---

## Implementation Units

### U1. Shared List Configuration Validator

**Goal:** Create the `ListConfigurationValidator` module with auto-resolve, immutable detection, template expansion, response normalization, and error categorization — the core logic that both dedicated tools and universal strategies consume.

**Requirements:** R3, R4, R5, R7, R8, R9

**Dependencies:** None

**Files:**

- Create: `src/services/lists/ListConfigurationValidator.ts`
- Create: `src/services/lists/list-templates.ts`
- Create: `src/services/lists/types.ts`
- Modify: `src/api/attio-objects.ts` — add `getWorkspaceObjects()` function
- Test: `test/services/lists/ListConfigurationValidator.test.ts`
- Test: `test/services/lists/list-templates.test.ts`

**Approach:**

- `types.ts` defines `NormalizedListResponse`, `ListTemplate`, `ListErrorCategory`, and related interfaces
- `list-templates.ts` defines the `LIST_TEMPLATES` catalog (3 entries) and `expandTemplate()` which merges caller overrides onto template defaults
- `ListConfigurationValidator` provides static methods:
  - `validateParentObject(parentObject)` — calls new `getWorkspaceObjects()` from `src/api/attio-objects.ts` (with short-lived in-memory cache), rejects invalid values listing valid options
  - `detectImmutableFields(attributes, existingList?)` — checks against `IMMUTABLE_LIST_FIELDS` set, rejects with guidance
  - `expandTemplate(templateName, overrides)` — delegates to `list-templates.ts`
  - `normalizeResponse(rawAttioList, dryRun?)` — extracts list_id, name, parent_object, builds fields_summary
  - `categorizeError(error)` — maps Attio API errors to `ListErrorCategory` enum with suggested next steps

**Patterns to follow:**

- `src/handlers/tool-configs/universal/validators/schema-validator.ts` — immutable-field detection pattern for tasks
- `src/api/attio-objects.ts` — `resolveObjectSlug()` pattern for `GET /objects` via lazy client; new `getWorkspaceObjects()` function
- `src/services/update/UpdateValidation.ts` — validation module structure

**Test scenarios:**

- Happy path: `validateParentObject("companies")` succeeds when "companies" is in workspace objects
- Happy path: `expandTemplate("sales_pipeline", { name: "My Pipeline" })` merges name override onto template defaults
- Happy path: `normalizeResponse(rawAttioList)` returns shape with list_id, name, parent_object, fields_summary
- Happy path: `detectImmutableFields({ name: "New" })` passes (no immutable fields)
- Edge case: `validateParentObject("deals")` rejects when "deals" not in workspace objects, lists valid options
- Edge case: `expandTemplate("unknown_template")` throws with list of valid template names
- Error path: `detectImmutableFields({ parent_object: "people" })` rejects explaining parent_object is immutable
- Error path: `categorizeError(403 error)` returns permission-failure category with next-step suggestion
- Integration: template expansion + validation pipeline runs end-to-end (expand → validate → normalize)

**Verification:**

- All unit tests pass for `ListConfigurationValidator`, `list-templates`, and `types`
- `validateParentObject` rejects invalid objects and lists valid ones
- `detectImmutableFields` catches `parent_object` mutation attempts
- `normalizeResponse` always includes list_id, name, parent_object, fields_summary

---

### U2. Dedicated `create-list` Tool

**Goal:** Add the `create-list` MCP tool that creates Attio lists with smart defaults, template support, dry-run, and normalized responses.

**Requirements:** R1, R3, R5, R6, R7, R8, R9, R12

**Dependencies:** U1

**Files:**

- Modify: `src/handlers/tool-configs/lists.ts` — add `createList` tool config and definition
- Modify: `src/handlers/tool-types.ts` — add `CreateListToolConfig` interface
- Modify: `src/handlers/tools/dispatcher/operations/lists.ts` — add `handleCreateListOperation`
- Test: `test/handlers/tools/dispatcher/operations/create-list.test.ts`

**Approach:**

- Add `CreateListToolConfig` interface to `tool-types.ts` with handler signature accepting name, parent_object, description, template, dry_run, workspace_access, workspace_member_access
- Add `createList` entry to `listsToolConfigs` with handler that:
  1. If template provided, call `ListConfigurationValidator.expandTemplate()`
  2. Call `ListConfigurationValidator.validateParentObject()`
  3. If `dry_run`, return normalized preview without calling `createList()` API
  4. Call `createList()` from `src/objects/lists/base.ts`
  5. Call `ListConfigurationValidator.normalizeResponse()` on result
  6. On error, call `ListConfigurationValidator.categorizeError()`
- Add `create-list` definition to `listsToolDefinitions` with inputSchema (name required, parent_object required, template/description/dry_run/workspace_access/workspace_member_access optional)
- Add `handleCreateListOperation` to dispatcher that routes to the tool config handler
- `formatResult` renders the normalized response as readable text

**Patterns to follow:**

- Existing tool configs in `src/handlers/tool-configs/lists.ts` (e.g., `addRecordToList`)
- `formatToolDescription()` for description formatting
- Dispatcher handler pattern in `src/handlers/tools/dispatcher/operations/lists.ts`

**Test scenarios:**

- Happy path: create list with name + parent_object returns normalized response with list_id
- Happy path: create list with template expands template and creates list
- Covers AE3: create list with `dry_run: true` returns preview, no list created in Attio
- Covers AE4: create list with template + dry_run shows expanded attributes
- Covers AE1: create list with invalid parent_object returns error listing valid objects
- Edge case: create list with template + explicit name override uses the override
- Error path: create list with unknown template returns error listing valid templates
- Error path: Attio 403 surfaced with category-appropriate message (pass-through per R12)

**Verification:**

- `create-list` tool appears in MCP tool list
- Creating a list with valid inputs returns normalized response
- Dry-run mode validates but does not persist
- Invalid parent_object produces actionable error with valid options

---

### U3. Dedicated `update-list-configuration` Tool

**Goal:** Add the `update-list-configuration` MCP tool that updates mutable list configuration with immutable-field detection, dry-run, and normalized responses.

**Requirements:** R2, R4, R5, R6, R9, R12

**Dependencies:** U1

**Files:**

- Modify: `src/handlers/tool-configs/lists.ts` — add `updateListConfiguration` tool config and definition
- Modify: `src/handlers/tool-types.ts` — add `UpdateListToolConfig` interface
- Modify: `src/handlers/tools/dispatcher/operations/lists.ts` — add `handleUpdateListConfigurationOperation`
- Test: `test/handlers/tools/dispatcher/operations/update-list-configuration.test.ts`

**Approach:**

- Add `UpdateListToolConfig` interface with handler accepting list_id, attributes, dry_run
- Add `updateListConfiguration` entry to `listsToolConfigs` with handler that:
  1. Call `ListConfigurationValidator.detectImmutableFields()` on the attributes
  2. If `dry_run`, fetch current list via `getListDetails()`, compute preview of changes, return normalized response with `dry_run: true`
  3. Call `updateList()` from `src/objects/lists/base.ts`
  4. Call `ListConfigurationValidator.normalizeResponse()` on result
  5. On error, call `ListConfigurationValidator.categorizeError()`
- Add `update-list-configuration` definition to `listsToolDefinitions` with inputSchema (list_id required, attributes required, dry_run optional)
- Add `handleUpdateListConfigurationOperation` to dispatcher

**Patterns to follow:**

- Same patterns as U2 for tool config, definition, and dispatcher

**Test scenarios:**

- Happy path: update list name returns normalized response with updated name
- Happy path: update list with dry_run returns preview without persisting
- Covers AE2: update list attempting to change parent_object rejects with immutable-field explanation
- Edge case: update with empty attributes object returns validation error
- Error path: update non-existent list_id returns 404 categorized error
- Error path: Attio 403 surfaced with category-appropriate message (pass-through per R12)

**Verification:**

- `update-list-configuration` tool appears in MCP tool list
- Updating mutable fields succeeds with normalized response
- Attempting to update parent_object is rejected before API call
- Dry-run mode previews changes without persisting

---

### U4. Universal Path Hardening

**Goal:** Harden the universal `create_record`/`update_record` paths for lists by integrating the shared `ListConfigurationValidator`, ensuring consistent error messages with the dedicated tools.

**Requirements:** R10, R11

**Dependencies:** U1

**Files:**

- Modify: `src/services/create/strategies/ListCreateStrategy.ts` — add parent-object validation before API call
- Modify: `src/services/update/strategies/ListUpdateStrategy.ts` — add immutable-field detection before API call
- Test: `test/services/create/strategies/ListCreateStrategy.test.ts`
- Test: `test/services/update/strategies/ListUpdateStrategy.test.ts`

**Approach:**

- In `ListCreateStrategy.create()`: before calling `createList()`, call `ListConfigurationValidator.validateParentObject()` on `values.parent_object`. On rejection, throw `UniversalValidationError` with the same message format the dedicated tool uses.
- In `ListUpdateStrategy.update()`: before calling `updateList()`, call `ListConfigurationValidator.detectImmutableFields()` on `values`. On rejection, throw `UniversalValidationError` with the same message format.
- Both strategies continue to handle `Cannot find attribute` errors as they do today (field suggestions).

**Patterns to follow:**

- Existing error handling in `ListCreateStrategy` and `ListUpdateStrategy` (UniversalValidationError pattern)
- `src/handlers/tool-configs/universal/validators/schema-validator.ts` — task immutable-field validation in universal path

**Test scenarios:**

- Covers AE5: universal `create_record` with `resource_type: "lists"` and invalid parent_object returns error matching dedicated tool format
- Happy path: universal create with valid parent_object succeeds as before
- Happy path: universal update with mutable fields succeeds as before
- Error path: universal update attempting to change parent_object throws UniversalValidationError
- Integration: error messages from universal path are textually consistent with dedicated tool errors

**Verification:**

- Universal create with invalid parent_object produces actionable error listing valid objects
- Universal update with immutable field produces clear rejection before API call
- Existing universal list operations continue to work unchanged

---

### U5. Integration Tests and E2E Coverage

**Goal:** Add integration and E2E tests covering the full flows (F1, F2, F3) and acceptance examples (AE1–AE6).

**Requirements:** All (R1–R12)

**Dependencies:** U2, U3, U4

**Files:**

- Create: `test/integration/list-configuration-tools.integration.test.ts`
- Modify: `test/e2e/mcp/list-management/list-operations.mcp.test.ts` — add E2E cases for create/update config

**Approach:**

- Integration tests use `ATTIO_API_KEY` to test real API calls for create and update flows
- E2E tests exercise the full MCP tool call pipeline (tool request → dispatcher → handler → API → response)
- Each AE from the origin document has a corresponding test case

**Test scenarios:**

- Covers AE1: invalid parent_object on create-list lists valid options
- Covers AE2: immutable parent_object on update-list-configuration rejects with guidance
- Covers AE3: dry_run on create-list returns preview without creating list
- Covers AE4: template + dry_run shows expanded attributes
- Covers AE5: universal create_record with invalid parent_object matches dedicated tool error format
- Covers AE6: workspace_access pass-through on create-list, 403 surfaced as-is

**Verification:**

- `bun run test:offline` passes (unit/mocked tests)
- `bun run test:integration` passes (real API with ATTIO_API_KEY)
- E2E suite covers all six acceptance examples

---

## System-Wide Impact

- **Interaction graph:** New tools register in `listsToolConfigs`/`listsToolDefinitions` — consumed by `registry.ts` and `dispatcher/core.ts`. No changes to existing tool routing.
- **Error propagation:** `ListConfigurationValidator.categorizeError()` produces consistent error categories; universal strategies throw `UniversalValidationError` as they do today.
- **State lifecycle risks:** Dry-run mode must not persist data — validator returns preview without calling API. Template expansion is stateless.
- **API surface parity:** Dedicated tools and universal path now produce consistent errors for lists. Other resource types (companies, people, tasks) are unaffected.
- **Integration coverage:** U5 covers cross-layer scenarios (tool request → validation → API → normalization → response).
- **Unchanged invariants:** Existing list entry tools (`add-record-to-list`, `filter-list-entries`, etc.), list read tools (`get-lists`, `get-list-details`), and all non-list resource tools remain unchanged.

---

## Risks & Dependencies

| Risk                                                        | Mitigation                                                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Attio API rejects fields not in `IMMUTABLE_LIST_FIELDS`     | Validator pre-filters known immutable fields; unknown rejections surface as generic API errors. Expand set after testing. |
| `getWorkspaceObjects()` latency on every create call        | Short-lived in-memory cache (TTL ~60s) in validator; `resolveObjectSlug()` already caches per-slug.                       |
| Template attributes don't match Attio's current API shape   | Templates validated during implementation against real Attio API; dry-run lets agents preview before committing.          |
| Universal hardening changes error format for existing users | Error messages become more specific (improvement), not less. Existing `UniversalValidationError` type preserved.          |

---

## Documentation / Operational Notes

- New tools (`create-list`, `update-list-configuration`) should be documented in the MCP tool reference
- Template catalog should be documented so agents know available options
- Dry-run behavior should be called out in tool descriptions for agent discoverability

---

## Sources & References

- **Origin document:** [docs/brainstorms/list-configuration-tools-requirements.md](docs/brainstorms/list-configuration-tools-requirements.md)
- Related code: `src/objects/lists/base.ts` (createList, updateList)
- Related code: `src/handlers/tool-configs/lists.ts` (existing list tool configs)
- Related code: `src/services/create/strategies/ListCreateStrategy.ts`
- Related code: `src/services/update/strategies/ListUpdateStrategy.ts`
- Related code: `src/cli/commands/attributes.ts` (getAvailableObjects)
- Related PRs/issues: #1195, #1148
