# Issue #754: Insecure randomness audit

## Scope

This review covered every production TypeScript module flagged by CodeQL for "Insecure randomness" (Math.random usage) under `/src`. Test fixtures and documentation were excluded because they do not affect the shipped server.

## Findings summary

| File                                                | Purpose of randomness                                                                               | Execution context                                                | Security impact                                                                     | Notes |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----- |
| `src/middleware/performance-enhanced.ts`            | Builds ephemeral `operationId` strings that are only used inside the in-memory performance tracker. | Internal telemetry only.                                         | Not security-critical. Collisions would only affect logging; no secrecy is assumed. |
| `src/handlers/tools/dispatcher/operations/notes.ts` | Generates mock note identifiers while `E2E_MODE` is enabled.                                        | Mock/testing pathway gated behind `E2E_MODE`.                    | Not security-critical. IDs never reach production API.                              |
| `src/utils/AttioFilterOperators.ts`                 | Adds ±100 ms jitter to 429 retry backoff.                                                           | Production API client.                                           | Not security-critical. Randomness merely spreads retries.                           |
| `src/utils/validation/uuid-validation.ts`           | Produces example UUIDs for error messages and docs.                                                 | Developer-facing helper.                                         | Not security-critical. Values are illustrative only.                                |
| `src/api/operations/retry.ts`                       | Applies jitter multiplier when calculating retry delays.                                            | Production API client.                                           | Not security-critical. No attacker-controlled secrets involved.                     |
| `src/api/client.ts`                                 | Adds 0–300 ms jitter before Axios retries.                                                          | Production API client.                                           | Not security-critical. Timing variance only.                                        |
| `src/objects/records/index.ts`                      | Creates mock IDs & jittered delays when E2E fallback logic runs.                                    | Mock/testing fallback behind `E2E_MODE`.                         | Not security-critical. Prevents duplicate domains in tests; not used in production. |
| `src/objects/tasks.ts`                              | Produces mock task IDs when mock mode is active.                                                    | Mock/testing pathway behind `shouldUseMockData()`.               | Not security-critical. Does not run against live API.                               |
| `src/objects/companies/basic.ts`                    | Generates mock company IDs across several fallback branches for tests.                              | Mock/testing pathway behind `E2E_MODE` or `NODE_ENV === 'test'`. | Not security-critical. Ensures tests continue when API misbehaves.                  |

## Conclusion

None of the reviewed `Math.random` usages influence cryptographic material, user-visible secrets, or authorization decisions. They are either:

- **Telemetry-only** identifiers.
- **Retry jitter** meant to stagger network calls.
- **Mock/test helpers** that never execute in production deployments.

Accordingly, Issue #754 does not require security fixes in this PR. If we ever need stronger guarantees (for example, tamper-resistant telemetry IDs), we can switch those call sites to `crypto.randomUUID()` without changing the overall assessment.
