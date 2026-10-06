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
composition runs when an Attio API key is present. Pre-existing mainline
failures (`test/objects/records.test.ts` fallback case and three
`test/unit/services/search/QueryApiService.test.ts` not-found cases) are named,
not owned by this boundary.
