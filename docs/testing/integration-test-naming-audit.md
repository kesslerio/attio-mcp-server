# Integration Test Naming Audit

> **📚 Quick Links:**
>
> - **[Integration Test Catalog](./integration-test-catalog.md)** - Complete IT-XXX test inventory and mapping
> - **[Integration Test README](../../test/integration/README.md)** - Naming conventions and quick start guide
> - **[Testing Guide](./testing.md)** - IT-XXX vs TC-XXX taxonomy explained

## Summary

- Inventoried seven integration suites under `test/integration` and captured their naming, gating flags, and describe titles to expose inconsistencies.
- Compared integration conventions to the MCP E2E `TC-XXX` taxonomy that already drives reporting and QA dashboards.
- Highlighted anti-patterns (mixed suffixes, inconsistent skip flags, unnumbered test cases, "E2E" phrasing inside integration suites) that make triage and coverage reporting harder.
- Proposed an `IT-XXX` numbering scheme with aligned file names, describe blocks, and `it` titles plus supporting metadata to match E2E rigor while preserving integration scope.
- Outlined a phased migration plan covering ID assignment, renames, documentation updates, and quality gate wiring.

## Current State Inventory

| Path                                                                     | File name pattern                      | Top-level `describe`                                                      | Execution gate                                                               | Notes                                                                                                                                                  |
| ------------------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `test/integration/batch-update-companies.integration.test.ts`            | Uses `.integration.test.ts` suffix     | `'Batch Company Operations - Integration'`                                | `shouldRunTests` wrapper around `ATTIO_API_KEY` and `SKIP_INTEGRATION_TESTS` | Mixes `beforeAll` guards and console warnings without numeric IDs.【F:test/integration/batch-update-companies.integration.test.ts†L1-L78】             |
| `test/integration/rate-limiting.integration.test.ts`                     | `.integration.test.ts`                 | `'Integration: Rate limiting (deterministic)'`                            | No env guard (pure local)                                                    | Deterministic/unit-style test still labeled integration, lacks ID.【F:test/integration/rate-limiting.integration.test.ts†L1-L49】                      |
| `test/integration/relationship-filters.test.ts`                          | Lacks `.integration` infix             | `'Relationship Filter Integration Tests'`                                 | `RUN_INTEGRATION_TESTS` must be `true` plus `ATTIO_API_KEY`                  | Only suite using `RUN_INTEGRATION_TESTS`, mixes `it`/`it.skip` toggles per block.【F:test/integration/relationship-filters.test.ts†L1-L111】           |
| `test/integration/lists/add-record-to-list.integration.test.ts`          | Nested folder + `.integration.test.ts` | `'Add Record To List Integration (Universal Tools)'`                      | `SKIP_INTEGRATION_TESTS` or missing env; provides manual config message      | First-class docstring but no numeric naming, uses `test.skip` fallback stub.【F:test/integration/lists/add-record-to-list.integration.test.ts†L1-L75】 |
| `test/integration/api/advanced-search.integration.test.ts`               | `.integration.test.ts`                 | `'Advanced Search API Tests'`                                             | `SKIP_TESTS` guard for `ATTIO_API_KEY`/`SKIP_INTEGRATION_TESTS`              | Nested describes lack numeric IDs and reuse general phrasing.【F:test/integration/api/advanced-search.integration.test.ts†L20-L68】                    |
| `test/integration/api/advanced-search-validation.integration.test.ts`    | `.integration.test.ts`                 | `'Advanced Search Validation Tests'`                                      | `SKIP_TESTS` guard                                                           | Validation focus but same naming as API test; no numbering.【F:test/integration/api/advanced-search-validation.integration.test.ts†L20-L53】           |
| `test/integration/api/attribute-validation-real-api.integration.test.ts` | `.integration.test.ts`                 | `describe.skipIf(SKIP_TESTS)('Attribute Validation with Real Attio API')` | `SKIP_TESTS` guard                                                           | Uses `describe.skipIf`, unique to this suite.【F:test/integration/api/attribute-validation-real-api.integration.test.ts†L53-L76】                      |
| `test/integration/api/industry-categories-mapping.integration.test.ts`   | `.integration.test.ts`                 | `'Industry-Categories Mapping - E2E Tests'`                               | `SKIP_INTEGRATION_TESTS` plus feature flag                                   | Calls itself "E2E" despite location in integration folder.【F:test/integration/api/industry-categories-mapping.integration.test.ts†L1-L69】            |

## Comparison to MCP E2E Naming

- E2E suites consistently embed numbered IDs in comments, file annotations, and `describe` titles (e.g., `TC-001: Search Records - Basic Search Functionality`).【F:test/e2e/mcp/core-operations/search-records.mcp.test.ts†L1-L44】
- Multi-case suites split IDs for each `it` block (`TC-D01` through `TC-D04`) while keeping a combined `describe` banner for roll-up reporting.【F:test/e2e/mcp/deal-operations/deal-crud.mcp.test.ts†L24-L89】
- The README enumerates every MCP test case with the `TC-XXX` prefix, reinforcing the taxonomy in documentation and tooling.【F:test/e2e/mcp/README.md†L10-L56】

## Identified Inconsistencies & Anti-Patterns

- **File suffix drift:** one suite omits `.integration`, others mix nested folders without a consistent slug order.【F:test/integration/relationship-filters.test.ts†L1-L30】
- **Describe labels lack IDs:** none of the integration suites expose machine-friendly IDs (no `IT-###`), making dashboards or selective runs harder compared to E2E counterparts.【F:test/integration/api/advanced-search.integration.test.ts†L20-L48】【F:test/e2e/mcp/core-operations/search-records.mcp.test.ts†L1-L44】
- **Mixed skip environment variables:** files use `shouldRunTests`, `SKIP_TESTS`, `SKIP_INTEGRATION_TESTS`, and `RUN_INTEGRATION_TESTS`, increasing confusion when toggling suites locally or in CI.【F:test/integration/relationship-filters.test.ts†L24-L41】【F:test/integration/batch-update-companies.integration.test.ts†L23-L55】
- **Terminology mismatch:** `industry-categories-mapping.integration.test.ts` self-identifies as "E2E" despite living in `integration`, blurring scope boundaries.【F:test/integration/api/industry-categories-mapping.integration.test.ts†L1-L23】
- **Per-test skip toggles:** some suites wrap each `it` in ternaries instead of using scoped `describe.skip`, creating uneven reporting when tests are disabled.【F:test/integration/relationship-filters.test.ts†L38-L75】
- **No shared index of integration IDs:** unlike E2E README, there is no canonical list mapping integration coverage to business capabilities.

## Recommendations

### Proposed Naming Pattern

1. **Adopt `IT-###` identifiers** for integration suites, mirroring `TC-###` but scoped to Attio API integrations. Example taxonomy:
   - `IT-001`–`IT-099`: Core object CRUD integrations.
   - `IT-100`–`IT-199`: API edge cases & validation.
   - `IT-200`–`IT-299`: Platform services (rate limiting, queues, etc.).
2. **File naming:** `test/integration/<domain>/IT-XYZ-<slug>.integration.test.ts` with zero-padded IDs to align with lexical sorting.
3. **Describe convention:** Top-level `describe('IT-XYZ: <Title>', () => { ... })`; nested describes optional but should stay descriptive without reusing IDs.
4. **Individual tests:** Prefix `it` blocks with sub-identifiers when suites contain multiple behaviors, e.g., `'IT-201.1: throttles requests over limit'` to keep granular metrics.
5. **Metadata banner:** Keep the leading JSDoc-style comment to state prerequisites and link to issues, but include the `IT-XYZ` ID for traceability.
6. **Environment gates:** Normalize on a single helper (e.g., `shouldRunIntegrationTests()` in a shared test util) honoring `ATTIO_API_KEY` and `SKIP_INTEGRATION_TESTS`, eliminating divergent env switches.

### Example Template

```ts
/**
 * IT-105: Advanced Search validation against live API
 * Requires ATTIO_API_KEY and skips automatically when SKIP_INTEGRATION_TESTS=true.
 */
import { describe, it, expect } from 'vitest';
import { shouldRunIntegrationTests } from '../utils/integration-guards';

const runTests = shouldRunIntegrationTests();

describe.skipIf(!runTests)('IT-105: Advanced search validation', () => {
  it('IT-105.1: rejects missing filters payloads', async () => {
    // ...
  });

  it('IT-105.2: accepts valid multi-filter payload', async () => {
    // ...
  });
});
```

### Documentation & Tracking

- Publish an `docs/testing/integration-test-catalog.md` mirroring the MCP README, listing each `IT-###` with ownership, environment requirements, and related issues.
- Update `docs/testing.md` to reference the catalog and clarifying the difference between integration (`IT-###`) and MCP E2E (`TC-###`).
- Extend CI dashboards or reporting scripts to surface `IT-###` IDs alongside MCP results once naming is standardized.

## Migration Strategy

1. **Assign IDs & catalog:** Workshop with QA to assign `IT-###` numbers to existing suites and document them; reserve ranges for future categories.
2. **Create shared guard helper:** Add a utility in `test/utils` centralizing skip logic (supports dry-run mode for tests like rate limiting that do not need API keys).
3. **Rename files & describe blocks:** Use `git mv` to apply the `IT-###-slug.integration.test.ts` pattern and update describe/it titles accordingly; adjust any import paths if necessary.
4. **Update references:** Search for old file names in documentation (`docs/testing.md`, runbooks) and update links; ensure package scripts or selective test commands reference the new names.
5. **Introduce catalog doc:** Commit the new integration test catalog in the same change-set and link it from QA/testing documentation.
6. **Add lint rule (optional):** Consider a custom lint check or Vitest reporter that warns when `describe` titles lack the `IT-` prefix to prevent regressions.
7. **Phase rollout:** Start with low-risk suites (e.g., rate limiting) to validate the pattern, then tackle API-heavy suites during a scheduled maintenance window to avoid conflicts with live testing.

## Risks & Mitigations

- **Historical log references:** Renaming files may break links in past incidents; mitigate by noting the mapping table in the catalog and referencing legacy names.
- **Parallel workstreams:** Coordinate with teams currently touching integration suites to avoid merge conflicts; perform the migration in a dedicated branch with clear communication.
- **Tooling alignment:** Ensure reporting dashboards or scripts that parse filenames are updated simultaneously to consume the new `IT-###` format, preventing data gaps.
