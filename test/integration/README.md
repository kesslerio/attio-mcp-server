# Integration Test Suite

Integration tests validate Attio MCP Server components against the live Attio API. Unlike E2E tests that validate complete workflows, integration tests focus on individual API operations and edge cases.

## 🎯 Naming Convention

Integration tests follow the **IT-XXX** naming pattern to align with the MCP E2E **TC-XXX** taxonomy while maintaining clear scope separation.

### File Naming Pattern

```
test/integration/<domain>/IT-XXX-<slug>.integration.test.ts
```

**Examples:**

- `test/integration/api/IT-105-advanced-search-validation.integration.test.ts`
- `test/integration/core/IT-001-batch-company-operations.integration.test.ts`
- `test/integration/services/IT-201-rate-limiting.integration.test.ts`

### Test Structure

```typescript
/**
 * IT-XXX: <Test Description>
 * Prerequisites: ATTIO_API_KEY required
 * Skips automatically when SKIP_INTEGRATION_TESTS=true
 */
import { describe, it, expect } from 'vitest';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

const runTests = shouldRunIntegrationTests();

describe.skipIf(!runTests)('IT-XXX: <Title>', () => {
  it('IT-XXX.1: <specific behavior>', async () => {
    // Test implementation
  });

  it('IT-XXX.2: <another behavior>', async () => {
    // Test implementation
  });
});
```

### ID Ranges

- **IT-001–IT-099**: Core object CRUD operations (companies, people, deals)
- **IT-100–IT-199**: API validation and edge cases
- **IT-200–IT-299**: Platform services (rate limiting, queues, caching)
- **IT-300–IT-399**: Advanced features (filters, relationships, batch ops)
- **IT-400+**: Reserved for future categories

## 🚀 Running Integration Tests

### Prerequisites

Use a dedicated test workspace. Live suites require `ATTIO_API_KEY`; writing
suites resolve the API-token actor UUID from `GET /self` before creation when
`WORKSPACE_API_UUID` is absent. Only active workspace tokens are accepted; their
`client_id` and `aud` identify the token, never the workspace or authorizing member.
An explicitly supplied `WORKSPACE_API_UUID` must be that token actor UUID. Missing/blank API keys skip live suites, and
`SKIP_INTEGRATION_TESTS=true` skips the entire tier. An invalid supplied or unresolvable actor UUID
fails writing-suite setup before creation rather than silently skipping coverage.

### Commands

```bash
# Mocked unit smoke: no live API signal
bun run test:smoke

# Five real-API cases, serialized; target under two minutes
bun run test:integration:smoke

# Full integration tier (test:integration remains a compatible alias)
bun run test:integration:full
bun run test:integration

# Run one live suite through the integration config, without global unit mocks
bun run test:integration:full -- test/integration/api/IT-105-advanced-search-validation.integration.test.ts

# Safe collection/skip check; does not verify live behavior
ATTIO_API_KEY='' SKIP_INTEGRATION_TESTS=true bun run test:integration:smoke
```

The live smoke selects IT-101.1/101.2 (search), IT-001.1 (owned company batch
update), IT-106.1 (metadata), and the default full-access list creation case.
It inherits the full tier's real client and aliases, has no mock setup, and does
not retry failures. IT-201 is deterministic and is deliberately excluded from
live smoke. Smoke performs CRM writes in its fixtures and therefore requires
both credentials above. The two-minute target is a budget, not a measured
live-run guarantee; API latency and cleanup also count.

### Owned fixtures and cleanup

Writing suites (IT-001, IT-106, IT-107, IT-302, IT-401 and list access-control)
use `IntegrationFixtures` in `test/utils/integration-fixtures.ts`. Create new
resources through its callback, using the supplied exact name; never assert or
upsert existing workspace resources. The name includes the token UUID, a random
run UUID, and a sequence. The helper records returned IDs before assertions,
so teardown can clean partial setup and failed test runs. List membership tests use the maintained `list_entries_manage` tool (the old
`records_update` membership payload is no longer supported). They
create their own company and list; deleting that list also removes its entries.
They require no `TEST_LIST_ID`, `TEST_COMPANY_ID`, or custom list attributes.

Cleanup only fetches IDs registered in this fixture instance. Immediately before
deletion it checks the returned ID, exact tagged name, and API-token creator
(`values.created_by` for companies, `created_by_actor` for lists). It never scans
by a shared name prefix, and never accepts an attribute's last updater as the
resource creator. Unknown or changed ownership prevents deletion and fails
teardown, while other owned resources are still attempted. Already absent
resources are harmless; other API errors fail teardown and retain the ID for a
retry. No workspace-wide cleanup script runs automatically.

Run this tier in an isolated workspace without concurrent human edits. Attio
read-then-delete is not transactional: a rename between verification and delete
cannot be locked by the test helper. A killed process or a create response lost
before its ID is received may leave a fixture behind. Review its exact run tag
and API-token creator manually before cleanup; never broaden the deletion filter.
The full tier retains workspace-specific attribute prerequisites in IT-106
(`is_customer` and `company_size`) and the opt-in industry-mapping suite.
Tests cover allowed and denied cleanup using a local fake API. This change was
verified without running live API mutation tests.

## 📊 Current Test Inventory

The migration to IT-XXX naming is complete. Refer to the [Integration Test Catalog](../../docs/testing/integration-test-catalog.md) for the authoritative index.

### Active Suites

| IT ID  | File Path                                                                         | Description                                          |
| ------ | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| IT-001 | `test/integration/core/IT-001-batch-company-operations.integration.test.ts`       | Batch company CRUD operations                        |
| IT-101 | `test/integration/api/IT-101-advanced-search-api.integration.test.ts`             | Advanced search API coverage                         |
| IT-105 | `test/integration/api/IT-105-advanced-search-validation.integration.test.ts`      | Advanced search validation edge cases                |
| IT-106 | `test/integration/api/IT-106-attribute-validation.integration.test.ts`            | Attribute validation with live API                   |
| IT-107 | `test/integration/api/IT-107-industry-categories-mapping.integration.test.ts`     | Industry categories field mapping                    |
| IT-201 | `test/integration/services/IT-201-rate-limiting.integration.test.ts`              | Rate limiting behavior (deterministic)               |
| IT-301 | `test/integration/advanced/IT-301-relationship-filters.integration.test.ts`       | Relationship filter validation                       |
| IT-302 | `test/integration/advanced/IT-302-list-membership-operations.integration.test.ts` | List membership operations via list entry tools      |
| IT-401 | `test/integration/advanced/IT-401-universal-lists.integration.test.ts`            | Guarded universal-list contracts using an owned list |

## 🔄 Integration vs E2E Tests

| Aspect          | Integration Tests (IT-XXX)             | E2E Tests (TC-XXX)                 |
| --------------- | -------------------------------------- | ---------------------------------- |
| **Scope**       | Individual API operations              | Complete workflows                 |
| **Focus**       | Edge cases, validation, error handling | User scenarios, tool orchestration |
| **Environment** | Live Attio API                         | Live Attio API + MCP protocol      |
| **Execution**   | `bun run test:integration:full`        | `bun run test:e2e`                 |
| **ID Prefix**   | IT-XXX                                 | TC-XXX                             |
| **Location**    | `test/integration/`                    | `test/e2e/`                        |

## 📚 Documentation

- **[Integration Test Catalog](../../docs/testing/integration-test-catalog.md)** - Complete IT-XXX mapping with ownership and requirements
- **[Integration Test Naming Audit](../../docs/testing/integration-test-naming-audit.md)** - Migration strategy and rationale
- **[Testing Guide](../../docs/testing.md)** - Overall testing strategy and guidelines
- **[E2E Test Guide](../e2e/README.md)** - End-to-end test documentation with TC-XXX catalog

## 🚧 Migration Status

Migration to the IT-XXX convention is **complete**. Future integration suites should follow the documented naming and guard patterns by default.
