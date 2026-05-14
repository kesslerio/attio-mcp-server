# Backlog

This backlog captures the currently triaged MCP surface improvements after the
v1.6.0 release. It is ordered by practical user impact, implementation risk, and
how much each item unlocks later work.

## Current Priority Order

| Order | Issue                                                                                                               | Priority | Status | Why this order                                                                                                                                                            | First PR shape                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | [#1189](https://github.com/kesslerio/attio-mcp-server/issues/1189) Prompt catalog references stale tool names       | P0       | Ready  | Broken prompt instructions can cause tool-call failures even when the server has the right capability. Fixing this protects every prompt-driven workflow.                 | Audit prompt definitions and docs, replace stale tool names, and add a regression test that verifies prompt-referenced tools resolve.            |
| 2     | [#1188](https://github.com/kesslerio/attio-mcp-server/issues/1188) Compatibility wrappers for common MCP tool names | P1       | Ready  | Thin wrappers reduce model translation errors and make the tool surface easier to use without changing universal internals.                                               | Add wrapper/alias coverage for record, list, and task names; preserve safety annotations and structured output.                                  |
| 3     | [#1190](https://github.com/kesslerio/attio-mcp-server/issues/1190) Identity and team lookup tools                   | P1       | Ready  | A `whoami` path improves trust, debugging, and approval flows before adding more write or activity tools.                                                                 | Implement `whoami` from `/v2/self`, then current workspace member lookup. Defer generic teams unless the API semantics are confirmed.            |
| 4     | [#1192](https://github.com/kesslerio/attio-mcp-server/issues/1192) Note body retrieval and update tools             | P1       | Ready  | Full note readback is public-API-backed and high-value for CRM context. Note update should be split or deferred because no public update endpoint is currently confirmed. | Add `get_note` / note body retrieval with `content_plaintext` and `content_markdown`; document update as blocked unless an endpoint is verified. |
| 5     | [#1193](https://github.com/kesslerio/attio-mcp-server/issues/1193) Agent-readable list tool responses               | P2       | Ready  | List tools work, but raw JSON-heavy formatting burns tokens and weakens conversational UX. This is a contained quality win before adding more list features.              | Add readable summaries plus structured output for active list tools, with formatter tests for empty, paginated, and error results.               |
| 6     | [#1150](https://github.com/kesslerio/attio-mcp-server/issues/1150) Thread and comment lookup tools                  | P1       | Ready  | Collaboration context is public-API-backed and useful, but it should follow the response-formatting cleanup so outputs are consistent.                                    | Add read-only `list_threads`, `get_thread`, and `get_comment`; keep create/delete out of the first PR unless explicitly scoped.                  |
| 7     | [#1151](https://github.com/kesslerio/attio-mcp-server/issues/1151) Meeting lookup tools                             | P1       | Ready  | Meeting reads are public-API-backed but beta. They unlock real activity context after the safer identity/notes/comments work is in place.                                 | Add read-only `list_meetings` and `get_meeting` with cursor pagination and linked-record filters. Keep create/find-or-create experimental.       |
| 8     | [#1152](https://github.com/kesslerio/attio-mcp-server/issues/1152) Transcript and call recording lookup tools       | P2       | Ready  | Call recordings and transcripts are valuable, but depend on meeting IDs and beta surfaces, so they should follow meeting lookup.                                          | Add read-only `list_call_recordings`, `get_call_recording`, and `get_call_transcript`; skip upload/delete in the first PR.                       |
| 9     | [#1191](https://github.com/kesslerio/attio-mcp-server/issues/1191) `upsert_record` support                          | P1       | Ready  | High-value for automation, but write semantics and duplicate prevention need careful design after the compatibility/readback layer is stable.                             | Implement dry-run first, exact match handling, ambiguous-match errors, and custom-object routing over universal search/create/update.            |
| 10    | [#1153](https://github.com/kesslerio/attio-mcp-server/issues/1153) File lookup tools                                | P3       | Ready  | File metadata is useful but lower-frequency than notes, comments, meetings, and upsert workflows.                                                                         | Add read-only file metadata listing/get once higher-priority context tools are complete.                                                         |

## Deferred For Now

These are intentionally not implementation-ready until public API support is
confirmed:

- Email content lookup, email metadata search, and email semantic search.
- Reporting or aggregate report execution.
- Generic workspace teams, unless the intended API is confirmed as distinct
  from SCIM group administration.
- Note update, unless a public note update endpoint is verified.

## Triage Notes

- Prefer read-only slices first for collaboration and activity surfaces.
- Keep beta or alpha upstream API status visible in tool descriptions and docs.
- Add live API smoke checks before coding against newer endpoints.
- Preserve universal tools as the internal implementation layer; wrappers should
  be thin compatibility surfaces, not parallel business logic.
- Every new tool must include MCP safety annotations and formatter tests.
