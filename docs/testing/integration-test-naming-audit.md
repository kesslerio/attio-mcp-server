# Integration Test Naming Audit

> **📚 Quick Links:**
>
> - **[Integration Test Catalog](./integration-test-catalog.md)** - Complete IT-XXX test inventory and mapping
> - **[Integration Test README](../../test/integration/README.md)** - Naming conventions and quick start guide
> - **[Testing Guide](./testing.md)** - IT-XXX vs TC-XXX taxonomy explained

## Summary

- Catalogued eight integration suites under `test/integration`, aligning their file locations, `describe` banners, and `it` case titles with the `IT-XXX` taxonomy.【F:test/integration/core/IT-001-batch-company-operations.integration.test.ts†L1-L117】【F:test/integration/advanced/IT-302-list-membership-operations.integration.test.ts†L1-L198】
- Standardized execution guards with the shared `shouldRunIntegrationTests()` helper (including dry-run support for deterministic suites).【F:test/utils/integration-guards.ts†L1-L35】【F:test/integration/services/IT-201-rate-limiting.integration.test.ts†L1-L55】
- Updated documentation (`test/integration/README.md`, catalog, and this audit) to reflect the completed migration and provide authoritative ownership metadata.【F:test/integration/README.md†L1-L123】【F:docs/testing/integration-test-catalog.md†L1-L154】
- Preserved the historical audit to document pre-migration gaps while capturing the resolved state for future QA reviews.

> **Status Update (Phase 3 Complete)**: The tables below first document the post-migration layout. A legacy snapshot remains at the end of this file for historical reference. See the [Integration Test Catalog](./integration-test-catalog.md) for the canonical inventory.

## Current State Inventory (Post-Migration)

| Path                                                                              | Top-level `describe`                      | Execution gate                                                       | Notes                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test/integration/core/IT-001-batch-company-operations.integration.test.ts`       | `'IT-001: Batch company operations'`      | `describe.skipIf(!shouldRunIntegrationTests())`                      | Seeds, updates, and cleans up companies via batch helpers to verify live API workflows.【F:test/integration/core/IT-001-batch-company-operations.integration.test.ts†L9-L117】                          |
| `test/integration/api/IT-101-advanced-search-api.integration.test.ts`             | `'IT-101: Advanced search API'`           | `describe.skipIf(!shouldRunIntegrationTests())`                      | Exercises company search and generic search helpers across eight validation-focused cases.【F:test/integration/api/IT-101-advanced-search-api.integration.test.ts†L5-L156】                             |
| `test/integration/api/IT-105-advanced-search-validation.integration.test.ts`      | `'IT-105: Advanced search validation'`    | `describe.skipIf(!shouldRunIntegrationTests())`                      | Concentrates on error handling for malformed filter payloads and missing metadata.【F:test/integration/api/IT-105-advanced-search-validation.integration.test.ts†L5-L101】                              |
| `test/integration/api/IT-106-attribute-validation.integration.test.ts`            | `'IT-106: Attribute validation'`          | `describe.skipIf(!shouldRunIntegrationTests())`                      | Validates type coercion, attribute updates, and cleanup for company records against the live API.【F:test/integration/api/IT-106-attribute-validation.integration.test.ts†L5-L150】                     |
| `test/integration/api/IT-107-industry-categories-mapping.integration.test.ts`     | `'IT-107: Industry categories mapping'`   | `describe.skipIf(!shouldRunIntegrationTests()                        |                                                                                                                                                                                                         | !industryMappingEnabled)` | Feature-flagged coverage ensuring industry category mappings populate list-backed fields on create.【F:test/integration/api/IT-107-industry-categories-mapping.integration.test.ts†L5-L69】 |
| `test/integration/services/IT-201-rate-limiting.integration.test.ts`              | `'IT-201: Rate limiting (deterministic)'` | `describe.skipIf(!shouldRunIntegrationTests({ allowDryRun: true }))` | Deterministic stress test that exhausts the rate limiter without requiring live credentials.【F:test/integration/services/IT-201-rate-limiting.integration.test.ts†L1-L55】                             |
| `test/integration/advanced/IT-301-relationship-filters.integration.test.ts`       | `'IT-301: Relationship filters'`          | `describe.skipIf(!shouldRunIntegrationTests())`                      | Covers six relationship-filter scenarios for people and companies, mirroring production queries.【F:test/integration/advanced/IT-301-relationship-filters.integration.test.ts†L8-L136】                 |
| `test/integration/advanced/IT-302-list-membership-operations.integration.test.ts` | `'IT-302: List membership operations'`    | `describe.skipIf(!shouldRunIntegrationTests())`                      | Validates universal tool-driven list membership workflows, including configuration guards and error paths.【F:test/integration/advanced/IT-302-list-membership-operations.integration.test.ts†L8-L198】 |

## Comparison to MCP E2E Naming

- E2E suites consistently embed numbered IDs in comments, file annotations, and `describe` titles (e.g., `TC-001: Search Records - Basic Search Functionality`).【F:test/e2e/mcp/core-operations/search-records.mcp.test.ts†L1-L44】
- Multi-case suites split IDs for each `it` block (`TC-D01` through `TC-D04`) while keeping a combined `describe` banner for roll-up reporting.【F:test/e2e/mcp/deal-operations/deal-crud.mcp.test.ts†L24-L89】
- The README enumerates every MCP test case with the `TC-XXX` prefix, reinforcing the taxonomy in documentation and tooling.【F:test/e2e/mcp/README.md†L10-L56】

## Resolved Inconsistencies & Improvements

- **IT-XXX naming applied:** All suites use consistent ID-prefixed file paths and `describe` titles, ensuring dashboards can group coverage without manual mapping.【F:test/integration/core/IT-001-batch-company-operations.integration.test.ts†L1-L117】【F:test/integration/api/IT-101-advanced-search-api.integration.test.ts†L15-L155】
- **Shared execution guard:** Each suite imports `shouldRunIntegrationTests()` (with optional `allowDryRun`) to centralize environment gating.【F:test/utils/integration-guards.ts†L1-L35】【F:test/integration/services/IT-201-rate-limiting.integration.test.ts†L1-L55】
- **Feature flag clarity:** Tests with additional prerequisites document them inline using scoped skip logic instead of ad hoc environment variables.【F:test/integration/api/IT-107-industry-categories-mapping.integration.test.ts†L14-L69】【F:test/integration/advanced/IT-302-list-membership-operations.integration.test.ts†L60-L198】
- **Documentation alignment:** The README and catalog enumerate suites with matching IDs for QA traceability.【F:test/integration/README.md†L13-L118】【F:docs/testing/integration-test-catalog.md†L12-L153】

## Legacy Snapshot (Pre-Migration)

- Mixed naming patterns (`.integration.test.ts`, missing infix, nested folders) and inconsistent skip flags (`shouldRunTests`, `SKIP_TESTS`, `RUN_INTEGRATION_TESTS`) complicated selective runs.
- Some suites self-identified as "E2E" despite living in `test/integration`, causing scope confusion.
- Individual test IDs were absent, preventing dashboards from tracking integration coverage per capability.
- These findings are retained for historical context; see issue #810 for the original audit results.

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
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

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
