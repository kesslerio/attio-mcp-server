# Search Scoring Configuration

Search scoring powers the `records_search` tool with client-side relevance ranking and caching. The defaults are tuned for Issue #885, but you can adjust behavior through environment variables.

## Environment Variables

| Variable                  | Default              | Description                                                                                                                       |
| ------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ENABLE_SEARCH_SCORING`   | `true`               | Toggle the scoring and caching layer. Set to `false` to fall back to Attio API ordering.                                          |
| `SEARCH_DEFAULT_LIMIT`    | `20`                 | Number of results returned to callers. Must be a positive integer.                                                                |
| `SEARCH_FETCH_MULTIPLIER` | `5`                  | Multiplier used when scoring is enabled to fetch a larger candidate set before ranking.                                           |
| `SEARCH_FETCH_MIN`        | `50`                 | Minimum number of candidates fetched when scoring is enabled.                                                                     |
| `SEARCH_FAST_PATH_LIMIT`  | `5`                  | Minimum batch size for the exact-match fast path. The implementation automatically bumps this to at least `SEARCH_DEFAULT_LIMIT`. |
| `SEARCH_CACHE_TTL_MS`     | `300000` (5 minutes) | TTL for cached search results in milliseconds.                                                                                    |
| `SEARCH_CACHE_MAX`        | `500`                | Maximum number of cached search entries stored in memory.                                                                         |

All values are parsed as integers. Invalid or non-positive values fall back to the defaults listed above.

## Operator Verification

Run `scripts/test-attio-operators.mjs` to confirm which Attio operators are supported by your workspace. The script prints a compatibility matrix (Issue #885 verified that `$eq`, `$contains`, `$starts_with`, `$ends_with`, and `$not_empty` are available; `$equals` and `$in` are not).

```bash
npm run tsx scripts/test-attio-operators.mjs
```

Ensure `ATTIO_API_KEY` is set in your environment before running the script.

## Operational Tips

- Leave scoring enabled for production to guarantee exact domain/email/name matches surface first.
- Lower the cache TTL if your workspace experiences rapid data churn and stale search results are a concern.
- If you need to diagnose ranking issues, temporarily reduce `SEARCH_FETCH_MULTIPLIER` to reproduce API-only ordering.
