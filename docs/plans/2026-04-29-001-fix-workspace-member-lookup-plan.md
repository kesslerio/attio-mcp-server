---
title: fix: Accept valid workspace member IDs in get-workspace-member
type: fix
status: active
date: 2026-04-29
---

# fix: Accept valid workspace member IDs in get-workspace-member

## Summary

Fix issue #1173 by making the workspace-member MCP tool handlers pass schema-shaped arguments into the object/API layer correctly, with tests that prove a `memberId` returned by `list-workspace-members` reaches Attio as the documented `workspace_member_id` path segment.

---

## Problem Frame

`get-workspace-member` returns a 400-style tool error for a valid `workspace_member_id` copied from `list-workspace-members`. Local inspection points to the dispatcher passing the entire MCP arguments object into handlers whose object-layer functions expect positional values; for `getWorkspaceMember`, that can turn the request path into `/workspace_members/[object Object]`.

---

## Requirements

- R1. `get-workspace-member` must accept a valid `memberId` from the MCP schema and call Attio with that exact workspace member UUID.
- R2. `list-workspace-members` and `search-workspace-members` must keep working through the same dispatcher path after handler argument normalization is fixed.
- R3. The implementation must preserve the documented Attio endpoint shape: `GET /v2/workspace_members/{workspace_member_id}`.
- R4. Invalid or missing `memberId` input must fail before making a malformed Attio request.
- R5. The fix must be covered by focused tests at the handler adapter boundary and the API path-construction boundary.
- R6. User-visible bug-fix behavior must be recorded in the changelog if the repo's `[Unreleased]` section is present.

---

## Scope Boundaries

- Do not rename the public MCP tools or their schema properties.
- Do not replace the documented single-member endpoint with a roster-search implementation as the primary path.
- Do not add caching, owner-resolution behavior, or downstream Lobster workflow changes in this PR.
- Do not broaden this into a workspace-member resolver rewrite; `src/services/workspace-member-resolver.ts` is adjacent but not the failing direct lookup path.

### Deferred to Follow-Up Work

- Add a defensive roster fallback only if implementation-time characterization shows Attio returns 400 for valid UUID path lookups even when the handler passes a string correctly.

---

## Context & Research

### Relevant Code and Patterns

- `src/handlers/tools/dispatcher/core.ts` routes `listWorkspaceMembers`, `searchWorkspaceMembers`, and `getWorkspaceMember` by passing `request.params.arguments` directly to each tool config's handler.
- `src/handlers/tool-configs/workspace-members.ts` currently wires those config handlers directly to object-layer functions and defines the public schemas for `search`, `query`, `page`, `pageSize`, and `memberId`.
- `src/objects/workspace-members.ts` exposes positional object-layer functions: list accepts `search, page, pageSize`, search accepts `query`, and get accepts `memberId`.
- `src/api/operations/workspace-members.ts` constructs the Attio paths and currently uses `/workspace_members/${memberId}` for single-member lookup.
- `test/unit/objects/workspace-members.test.ts` covers mock object-layer shape but does not exercise dispatcher/config argument adaptation or API path construction.

### Institutional Learnings

- No `docs/solutions/` directory exists in this checkout, so there is no repo-local solution note to carry forward.
- `CONTRIBUTING.md` asks for focused bug-fix PRs, exact validation commands, and explicit AI-assistance disclosure.
- `.github/PULL_REQUEST_TEMPLATE.md` requires security impact, repro/verification evidence, compatibility/migration notes, and failure recovery.

### External References

- Attio REST docs for [Get a workspace member](https://docs.attio.com/rest-api/endpoint-reference/workspace-members/get-a-workspace-member) show `GET /v2/workspace_members/{workspace_member_id}` and require `user_management:read`.
- Attio REST docs for [List workspace members](https://docs.attio.com/rest-api/endpoint-reference/workspace-members/list-workspace-members) show list results returning `id.workspace_member_id`, which is the value expected by the get endpoint.

---

## Key Technical Decisions

- Fix the adapter boundary, not the API endpoint: the official docs and current API operation agree on the endpoint, while local code shows a handler/config argument-shape mismatch.
- Keep object-layer functions positional for this narrow bug fix: changing them to argument objects would touch more call sites and create avoidable refactor scope.
- Add adapter-level tests rather than relying on mock object tests: the failure sits between MCP schema arguments and object-layer functions.
- Add API path-construction coverage so future edits cannot silently send `[object Object]` or a schema wrapper as the path segment.

---

## Open Questions

### Resolved During Planning

- Should the implementation switch to a list-and-filter fallback as the main behavior? No. That would mask a local adapter bug and turn a direct lookup into an unnecessary roster fetch.
- Is external API research needed? Yes. This touches an external Attio contract, and the current docs confirm the existing endpoint shape.

### Deferred to Implementation

- Exact validation helper placement: the implementing agent should decide whether a tiny local type guard in `src/handlers/tool-configs/workspace-members.ts` is enough or whether an existing shared validation helper is already a better fit.
- Whether real API verification is available: if `ATTIO_API_KEY` is configured, prove `list-workspace-members` followed by `get-workspace-member` against the real workspace; otherwise document the offline validation gap.

---

## Implementation Units

- U1. **Characterize the handler argument contract**

**Goal:** Add focused failing coverage that shows workspace-member tool configs translate MCP argument objects into the positional object-layer calls expected by `src/objects/workspace-members.ts`.

**Requirements:** R1, R2, R4, R5

**Dependencies:** None

**Files:**

- Create: `test/unit/handlers/tool-configs/workspace-members.test.ts`
- Review: `src/handlers/tool-configs/workspace-members.ts`

**Approach:**

- Mock the object-layer workspace-member functions and exercise each workspace-member tool config handler with schema-shaped argument objects.
- Cover `getWorkspaceMember.handler({ memberId })`, `searchWorkspaceMembers.handler({ query })`, and `listWorkspaceMembers.handler({ search, page, pageSize })`.
- Keep the test assertions at the adapter boundary: the object-layer mock should receive `memberId` as a string, not the whole argument object.

**Execution note:** Start with this adapter test failing before changing the config handlers.

**Patterns to follow:**

- Existing handler config tests under `test/handlers/tool-configs/` and `test/unit/handlers/` for mocking imported services.
- `test/unit/objects/workspace-members.test.ts` for workspace-member mock data shape.

**Test scenarios:**

- Happy path: `getWorkspaceMember.handler({ memberId: "d28a35f1-5788-49f9-a320-6c8c353147d8" })` calls the object-layer get function with that exact string.
- Happy path: `searchWorkspaceMembers.handler({ query: "martin" })` calls the object-layer search function with `"martin"`.
- Happy path: `listWorkspaceMembers.handler({ search: "martin", page: 2, pageSize: 50 })` calls the object-layer list function with those positional values.
- Edge case: `listWorkspaceMembers.handler({})` preserves default pagination semantics instead of passing `{}` as the search value.
- Error path: missing or non-string `memberId` produces a validation-style failure without calling the object-layer get function.

**Verification:**

- The failing issue shape is reproduced at the handler boundary without requiring live Attio credentials.

- U2. **Normalize workspace-member tool arguments**

**Goal:** Update the workspace-member tool configs so all three public tools adapt MCP schema arguments into the existing object-layer signatures.

**Requirements:** R1, R2, R3, R4

**Dependencies:** U1

**Files:**

- Modify: `src/handlers/tool-configs/workspace-members.ts`
- Review: `src/handlers/tools/dispatcher/core.ts`
- Test: `test/unit/handlers/tool-configs/workspace-members.test.ts`

**Approach:**

- Replace direct handler references with small adapter functions in `workspaceMembersToolConfigs`.
- Validate required string arguments at the config boundary for `memberId` and `query`, matching the schema intent before any API call can be built.
- Preserve the existing `formatResult` behavior and public tool definitions.
- Leave the generic dispatcher path unchanged unless implementation proves other tool families rely on the same unsafe direct pass-through pattern.

**Patterns to follow:**

- Existing tool config modules that adapt argument objects before calling lower layers.
- Project policy that formatters return strings and wrap only behavior relevant to the tool surface.

**Test scenarios:**

- Happy path: `get-workspace-member` config returns formatted member details for a valid mocked object-layer result.
- Edge case: empty `memberId` is rejected before reaching `getWorkspaceMember`.
- Error path: object-layer errors still propagate through the dispatcher's existing error handling rather than being swallowed by the adapter.
- Integration: the dispatcher path for workspace-member tools still produces an MCP success response when the config handler returns a valid member.

**Verification:**

- Public tool invocation with schema-shaped args no longer constructs a malformed object-valued member identifier.

- U3. **Lock the Attio API path contract**

**Goal:** Prove the API operation constructs the documented single-member path from a string UUID and does not accept object-shaped values silently.

**Requirements:** R1, R3, R5

**Dependencies:** U2

**Files:**

- Create: `test/unit/api/workspace-members.test.ts`
- Modify if needed: `src/api/operations/workspace-members.ts`

**Approach:**

- Mock the resolved Attio client and `callWithRetry` so the test can assert the exact path passed into `api.get`.
- Assert `getWorkspaceMember("d28a35f1-5788-49f9-a320-6c8c353147d8")` calls `/workspace_members/d28a35f1-5788-49f9-a320-6c8c353147d8`.
- Add a negative coverage point only if the API layer accepts unknown inputs through TypeScript escape hatches; the main validation should live at the handler boundary.

**Patterns to follow:**

- `test/unit/api/tasks.create.validation.test.ts` and `test/unit/api/tasks.multiple-assignees.test.ts` for API operation mocking patterns.
- `src/api/operations/workspace-members.ts` list/search tests should mirror existing path-construction conventions rather than introducing a new API harness.

**Test scenarios:**

- Happy path: valid UUID string becomes exactly one documented Attio path segment.
- Happy path: response data is returned unchanged when `res.data.data` contains a workspace member.
- Error path: missing `data` in the response still throws the existing "not found in current workspace" error.
- Regression: object-shaped input cannot be coerced into `/workspace_members/[object Object]` through the public handler path covered in U1/U2.

**Verification:**

- Unit tests prove the direct API path remains aligned with Attio's documented contract.

- U4. **Verify user-facing behavior and changelog**

**Goal:** Validate the repaired MCP flow and document the bug fix for users.

**Requirements:** R1, R2, R5, R6

**Dependencies:** U1, U2, U3

**Files:**

- Modify: `CHANGELOG.md`
- Test or runbook reference: `test/e2e/mcp/shared/mcp-test-base.ts`

**Approach:**

- Add an `[Unreleased]` fixed entry referencing #1173 if the changelog has the expected section.
- Run targeted unit tests for the handler and API operation.
- If `ATTIO_API_KEY` is available, run a real read-only verification: list workspace members, copy the first `workspace_member_id`, then call `get-workspace-member` with that ID and confirm it returns the same member details.
- If live credentials are unavailable, record that gap explicitly in the PR verification section.

**Patterns to follow:**

- Existing changelog entries that cite issue numbers and describe user-facing fixes.
- `test/e2e/mcp/shared/mcp-test-base.ts` for read-only workspace-member discovery behavior.

**Test scenarios:**

- Integration: MCP-level `list-workspace-members` result provides an ID that `get-workspace-member` accepts.
- Error path: invalid `memberId` still produces a useful tool error instead of a malformed Attio request.
- Compatibility: `list-workspace-members` and `search-workspace-members` outputs remain formatted as before.

**Verification:**

- The issue #1173 repro no longer fails for a valid listed workspace member ID, or the PR states why live verification could not be run.

---

## System-Wide Impact

- **Interaction graph:** MCP schema definitions feed `dispatcher/core.ts`, which calls `workspaceMembersToolConfigs`, which should adapt arguments before reaching `src/objects/workspace-members.ts` and `src/api/operations/workspace-members.ts`.
- **Error propagation:** Adapter validation should fail early for missing required values; downstream Attio failures should keep the existing dispatcher/tool error path.
- **State lifecycle risks:** None; the affected tools are read-only workspace-member lookups.
- **API surface parity:** Public tool names and argument names remain unchanged. The fix makes runtime behavior match the existing schema.
- **Integration coverage:** Unit tests should cover the adapter and API path; live read-only verification should cover the full MCP-to-Attio flow when credentials are available.
- **Unchanged invariants:** No new permissions, no write operations, no caching, and no changes to task owner/assignee semantics.

---

## Risks & Dependencies

| Risk                                                                           | Mitigation                                                                                                              |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Fixing only `get-workspace-member` leaves list/search adapters subtly wrong    | Normalize all three workspace-member tool configs in the same narrow file and test each argument shape.                 |
| Tests mock the wrong boundary and miss the dispatcher/config mismatch          | Add adapter tests that call tool config handlers with MCP schema-shaped objects.                                        |
| Attio really does return 400 for documented UUID path lookup after adapter fix | Defer a roster fallback decision until implementation can prove this with a string path and, ideally, live credentials. |
| Changelog update drifts into unrelated release notes                           | Add one concise `[Unreleased]` fixed entry tied to #1173 only.                                                          |

---

## Documentation / Operational Notes

- No README or API docs update should be needed because the public tool contract already says `memberId` is the workspace member UUID.
- PR verification should include exact targeted commands and whether live Attio verification was run.
- Security impact should be `No` for new permissions, secrets handling, and write surface; this remains a read-only `user_management:read` flow.

---

## Sources & References

- Related issue: [#1173](https://github.com/kesslerio/attio-mcp-server/issues/1173)
- Related code: `src/handlers/tool-configs/workspace-members.ts`
- Related code: `src/handlers/tools/dispatcher/core.ts`
- Related code: `src/objects/workspace-members.ts`
- Related code: `src/api/operations/workspace-members.ts`
- Related tests: `test/unit/objects/workspace-members.test.ts`
- External docs: [Attio get a workspace member](https://docs.attio.com/rest-api/endpoint-reference/workspace-members/get-a-workspace-member)
- External docs: [Attio list workspace members](https://docs.attio.com/rest-api/endpoint-reference/workspace-members/list-workspace-members)
