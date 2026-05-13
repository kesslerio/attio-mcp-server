---
date: 2026-05-13
topic: list-configuration-tools
---

# List Configuration Tools

## Summary

Add opinionated `create-list` and `update-list-configuration` MCP tools with smart defaults (parent-object auto-resolution, list templates, response normalization, immutable-field detection) and dry-run support, plus harden the universal `create_record`/`update_record` path for lists. No list-attribute management tools in this iteration.

---

## Problem Frame

Agents can manage entries on existing Attio lists through MCP tools, but cannot create new lists or modify list configuration. When a user asks an agent to set up a new sales pipeline or recruiting tracker, the agent must refuse or direct the user to the Attio UI — even when the service token has `list_configuration:read-write` scope. The universal `create_record`/`update_record` path technically supports lists but provides no list-specific validation, produces confusing errors for invalid parent objects or immutable fields, and returns raw Attio responses that are hard for agents to act on. This blocks operational workflows and forces manual list setup, inconsistent structures, and repeated agent refusals.

---

## Actors

- A1. **Agent**: Calls the new tools to create or update list configurations on behalf of a user
- A2. **Human operator**: Requests list setup through an agent, reviews dry-run output, or falls back to Attio UI for unsupported operations
- A3. **Attio API**: The upstream service that validates and persists list configuration

---

## Key Flows

- F1. **Create a new list**
  - **Trigger:** Agent receives a request to set up a new list (e.g., sales pipeline)
  - **Actors:** A1, A3
  - **Steps:** Agent calls `create-list` with name, parent object type (or template). Tool auto-resolves valid parent objects, validates inputs, optionally runs dry-run. On confirm, creates list and returns normalized response.
  - **Outcome:** A new Attio list exists with validated configuration; agent receives actionable response with list_id and field summary.
  - **Covered by:** R1, R3, R5, R6, R9

- F2. **Update list configuration**
  - **Trigger:** Agent needs to rename a list, change description, or adjust settings
  - **Actors:** A1, A3
  - **Steps:** Agent calls `update-list-configuration` with list_id and fields to change. Tool detects immutable fields and rejects with guidance, validates mutable fields, optionally runs dry-run. On confirm, updates list and returns normalized response.
  - **Outcome:** List configuration updated; agent receives confirmation with before/after for changed fields.
  - **Covered by:** R2, R4, R5, R6, R7, R9

- F3. **Create list from template**
  - **Trigger:** Agent wants to create a common list type without specifying every field
  - **Actors:** A1, A3
  - **Steps:** Agent calls `create-list` with a template name (e.g., "sales_pipeline"). Tool expands template into full attributes, validates against workspace, optionally runs dry-run. On confirm, creates list.
  - **Outcome:** A new list matching the template structure; agent doesn't need to know Attio schema details.
  - **Covered by:** R1, R3, R8

---

## Requirements

**Dedicated tools**

- R1. MCP exposes a `create-list` tool that creates an Attio list for a supported parent object type, with required inputs (name, parent_object) and optional inputs (description, access-control fields, template selection).
- R2. MCP exposes an `update-list-configuration` tool that updates mutable list configuration fields for an existing list, identified by list_id.

**Smart defaults**

- R3. `create-list` auto-resolves valid parent object types from the workspace before sending the create request, and rejects invalid parent_object values with a list of valid options.
- R4. `update-list-configuration` detects immutable fields (e.g., parent_object) and rejects attempts to change them with a clear explanation, rather than letting Attio return a confusing error.
- R5. Both tools normalize Attio responses into a consistent agent-friendly shape that always includes list_id, name, parent_object, and a summary of configured fields.

**Dry-run**

- R6. Both tools accept a `dry_run` boolean parameter (default: false). When true, the tool validates inputs, resolves parent objects, expands templates, and detects immutable fields — but does not write to Attio. Returns the same normalized shape with a "dry_run" flag indicating the result is a preview.

**List templates**

- R7. `create-list` accepts an optional `template` parameter with an initial catalog of three templates: `sales_pipeline`, `recruiting_tracker`, `support_queue`. When provided, the template supplies default attributes that the caller can override.
- R8. When a template is selected, the tool expands it into concrete attributes before validation, so dry-run and error messages reference the actual values that would be sent.

**Error handling**

- R9. User-facing errors distinguish four categories: unsupported input (invalid parent_object, unknown template), insufficient token scope, Attio permission/access-control failure, and generic API failure. Each category includes a suggested next step.

**Universal path hardening**

- R10. The universal `create_record` path with `resource_type: "lists"` applies the same parent-object validation and immutable-field detection as the dedicated tools, producing consistent error messages rather than raw Attio errors.
- R11. The universal `update_record` path with `resource_type: "lists"` applies immutable-field detection and returns consistent error messages for list-specific failures.

**Access-control pass-through**

- R12. Both dedicated tools accept `workspace_access` and `workspace_member_access` fields and pass them through to the Attio API without additional validation or transformation. Hardening of 403 handling for these fields is deferred to #1148.

---

## Acceptance Examples

- AE1. **Covers R3, R9.** Given a workspace with parent objects [companies, people], when an agent calls `create-list` with `parent_object: "deals"`, the tool returns an error listing valid parent objects and suggesting one to use instead.
- AE2. **Covers R4, R9.** Given an existing list with `parent_object: "companies"`, when an agent calls `update-list-configuration` attempting to change `parent_object` to "people", the tool rejects the update explaining that parent_object is immutable after creation.
- AE3. **Covers R6.** Given valid inputs, when an agent calls `create-list` with `dry_run: true`, the tool returns the normalized response shape with a `dry_run: true` flag and no list is created in Attio.
- AE4. **Covers R7, R8.** Given a template "sales_pipeline", when an agent calls `create-list` with that template and `dry_run: true`, the response shows the expanded attributes (stages, fields) that would be created, merged with any caller overrides.
- AE5. **Covers R10.** Given the universal `create_record` path with `resource_type: "lists"` and an invalid `parent_object`, the error message matches the dedicated tool's format (lists valid objects, suggests next step) rather than a raw Attio API error.
- AE6. **Covers R12.** Given `workspace_access: "read-only"` in a `create-list` call, the field is passed through to Attio unchanged. If Attio returns a 403, the error is surfaced as-is without additional interpretation (deferred to #1148).

---

## Success Criteria

- An agent can create a new Attio list and update list configuration without falling back to the Attio UI or raw API calls.
- Dry-run mode lets agents preview list creation/update before committing, reducing workspace clutter from bad schemas.
- The universal path no longer produces confusing raw Attio errors for list operations — errors are consistent with the dedicated tools.
- Downstream planning can implement this without inventing validation rules, error categories, or template structure.

---

## Scope Boundaries

- List attribute (field/column) management tools (`create-list-attribute`, `update-list-attribute`) — deferred to a future iteration
- Access-control hardening (403 distinction, plan/billing gating) — covered by #1148
- List deletion tool — not requested; `deleteList()` exists in codebase but no MCP tool surface
- Changes to existing entry-level list tools (`add-record-to-list`, `update-list-entry`, etc.)
- Template management UI or dynamic template discovery — templates are a static code-level catalog

---

## Key Decisions

- **Opinionated tools over minimal mirroring**: Chosen over Approach A (minimal) because the universal path already provides a raw pass-through; dedicated tools should add real value through smart defaults, not duplicate the universal surface.
- **Both dedicated + universal hardening**: The universal path remains a valid entry point for lists; hardening it prevents confusing failures when agents use it instead of the dedicated tools.
- **Pass-through for access-control fields**: Accepting and forwarding `workspace_access`/`workspace_member_access` without additional validation keeps this issue's scope separate from #1148's hardening work.
- **Static template catalog**: Templates are defined in code rather than dynamically fetched, keeping the implementation simple and predictable at the cost of needing code changes to add new templates.

---

## Dependencies / Assumptions

- The Attio list create API (`POST /lists`) accepts the attributes shape currently used by `createList()` in `src/objects/lists/base.ts`, including `name`, `parent_object`, and access-control fields.
- The Attio list update API (`PATCH /lists/:id`) supports partial updates — only specified fields are changed.
- A known set of immutable fields exists for lists (at minimum `parent_object`). The exact set will be validated against Attio docs during planning.
- The workspace's available parent objects can be discovered at runtime (likely via the existing object discovery mechanism).
- Issue #1148 will handle 403 error categorization and access-control hardening separately.

---

## Outstanding Questions

### Resolve Before Planning

(None — all resolved)

### Deferred to Planning

- [Affects R3][Needs research] How are valid parent objects discovered at runtime? The existing object discovery mechanism should be evaluated for reuse.
- [Affects R4][Needs research] What is the complete set of immutable list fields that Attio rejects on update? Must be verified against Attio API docs.
- [Affects R5][Technical] What does the normalized response shape look like? Planning should define the exact fields included.
