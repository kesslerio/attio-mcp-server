# U1 delivery evidence and verification scope

The current native result contract follows KTD4: `search_records` and
`get_record_details` publish a sanitized envelope in `structuredContent` and
serialize that same envelope in `content[0].text`. Search includes `data`,
`count`, and `next_cursor`; details includes `data`. Optional prose follows in
`content[1]`. `MCP_TEXT_RESULTS=false` skips the prose formatter and leaves one
JSON block. Connector `search` and `fetch` retain their approved success formats.

The captured verification plan is historical evidence. Its native JSON
compatibility projection and prose opt-out deferral claims were superseded by
the recorded Firstmate decisions. Neither describes the current implementation.

Focused behavior coverage includes native Axios failures through list, task,
and note details, applicable connector fetch calls, legacy relationship mutation
annotations and uncertain outcomes, fresh mode denial, envelope-first MCP
serialization, prose opt-out, formatter failure, and transport-observable
mutation replay guards.

Revised-head verification awaits the pipeline Test step. Earlier focused test
attempts exited 127 because Vitest was absent from the fix checkout; earlier
submitted-head results do not verify these revisions. The focused command is:

```sh
bun run test:single test/handlers/tools/result-contract.test.ts test/handlers/tools/structured-protocol.test.ts test/handlers/tools/relationship-mutation-contract.test.ts
```

The real stdio discovery/error and read composition test remains at
`test/e2e/mcp/core-operations/structured-results.mcp.test.ts`. Live-read acceptance
remains skipped pending an Attio API key. No live mutations are authorized for
verification.

U2 retains the standing R9 acceptance item: replay-proofing of legacy mutation
owners lands with U2, including post-write decoding relocation and mutation-owner
restructuring. U1's uncertainty retry and fallback guards remain in place.
