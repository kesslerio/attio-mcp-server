# U5 delivery scope and verification

The collection continuation contract follows KTD6: opaque, versioned, sealed
tokens bound to the caller's credential scope, canonical operation, resource,
query shape, and page size; verified before any Attio request; expiring after
30 minutes and dying with the server process. Supported families page through
`UniversalSearchService.searchRecordsPage` (records search paths),
`handleUniversalGetNotesPage` (notes, preserving the native upstream cursor
sealed inside the token), and the list-entries cursor seam. Bounded or ranked
families disclose `pagination: { supported: false, truncated: <boolean> }`
instead of fabricating continuation.

Attribute metadata caches are keyed by a credential fingerprint (U5 request
isolation): two tenant contexts sharing a process cannot read each other's
attribute metadata.

Focused verification command:

```sh
bun run test:single test/handlers/tools/result-cursor.test.ts test/handlers/tools/codemode-composition.test.ts
```

The real stdio pagination test is
`test/e2e/mcp/core-operations/structured-pagination.mcp.test.ts`. Offline it
proves the structural schema and structured-failure paths; the two-page live
composition runs when an Attio API key is present. Pre-existing mainline
failures (`test/objects/records.test.ts` fallback case and three
`test/unit/services/search/QueryApiService.test.ts` not-found cases) are named,
not owned by this boundary.
