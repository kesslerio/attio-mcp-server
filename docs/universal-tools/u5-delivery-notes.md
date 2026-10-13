# U5 delivery scope and verification

The [Collection Continuation contract](api-reference.md#collection-continuation-u5)
owns supported paths, token scope, and bounded-result disclosures. The cursor
implementation is [`result-cursor.ts`](../../src/handlers/tools/result-cursor.ts).
Credential-scoped attribute cache ownership is explained beside
[`credentialCacheScope`](../../src/api/attribute-types.ts).

Focused verification command:

```sh
bun run test:single test/handlers/tools/result-cursor.test.ts test/handlers/tools/codemode-composition.test.ts test/handlers/tools/u5-review-regressions.test.ts
```

The real stdio pagination test is
`test/e2e/mcp/core-operations/structured-pagination.mcp.test.ts`. Offline it
proves the structural schema and structured-failure paths; the two-page live
composition runs when an Attio API key is present.

The stale offline assertions recorded at U5 delivery were aligned with the
accepted contracts in #1330. Missing-object responses remain typed failures;
successful zero-match queries return empty pages. Generic record searches use
exact query offsets, bounded list results disclose completeness, and uncertain
creates never trigger a fallback write. Run their coverage without live API calls:

```sh
bun run test:offline:run -- test/unit/services/search/QueryApiService.test.ts test/unit/services/search/RecordsSearchService.test.ts test/unit/list-tools-filter-consolidated.test.ts test/objects/records.test.ts
```
