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

```bash
# Required: Set your Attio API key
export ATTIO_API_KEY=your_api_key_here

# Optional: Skip integration tests
export SKIP_INTEGRATION_TESTS=true
```

### Commands

```bash
# Run all integration tests
npm run test:integration

# Run specific suite
npm test test/integration/api/IT-105-advanced-search-validation.integration.test.ts

# Run with verbose output
npm run test:integration -- --reporter=verbose
```

## 📊 Current Test Inventory

The migration to IT-XXX naming is complete. Refer to the [Integration Test Catalog](../../docs/testing/integration-test-catalog.md) for the authoritative index.

### Active Suites

| IT ID  | File Path                                                                         | Description                                    |
| ------ | --------------------------------------------------------------------------------- | ---------------------------------------------- |
| IT-001 | `test/integration/core/IT-001-batch-company-operations.integration.test.ts`       | Batch company CRUD operations                  |
| IT-101 | `test/integration/api/IT-101-advanced-search-api.integration.test.ts`             | Advanced search API coverage                   |
| IT-105 | `test/integration/api/IT-105-advanced-search-validation.integration.test.ts`      | Advanced search validation edge cases          |
| IT-106 | `test/integration/api/IT-106-attribute-validation.integration.test.ts`            | Attribute validation with live API             |
| IT-107 | `test/integration/api/IT-107-industry-categories-mapping.integration.test.ts`     | Industry categories field mapping              |
| IT-201 | `test/integration/services/IT-201-rate-limiting.integration.test.ts`              | Rate limiting behavior (deterministic)         |
| IT-301 | `test/integration/advanced/IT-301-relationship-filters.integration.test.ts`       | Relationship filter validation                 |
| IT-302 | `test/integration/advanced/IT-302-list-membership-operations.integration.test.ts` | List membership operations via universal tools |

## 🔄 Integration vs E2E Tests

| Aspect          | Integration Tests (IT-XXX)             | E2E Tests (TC-XXX)                 |
| --------------- | -------------------------------------- | ---------------------------------- |
| **Scope**       | Individual API operations              | Complete workflows                 |
| **Focus**       | Edge cases, validation, error handling | User scenarios, tool orchestration |
| **Environment** | Live Attio API                         | Live Attio API + MCP protocol      |
| **Execution**   | `npm run test:integration`             | `npm run test:e2e`                 |
| **ID Prefix**   | IT-XXX                                 | TC-XXX                             |
| **Location**    | `test/integration/`                    | `test/e2e/`                        |

## 📚 Documentation

- **[Integration Test Catalog](../../docs/testing/integration-test-catalog.md)** - Complete IT-XXX mapping with ownership and requirements
- **[Integration Test Naming Audit](../../docs/testing/integration-test-naming-audit.md)** - Migration strategy and rationale
- **[Testing Guide](../../docs/testing.md)** - Overall testing strategy and guidelines
- **[E2E Test Guide](../e2e/README.md)** - End-to-end test documentation with TC-XXX catalog

## 🚧 Migration Status

Migration to the IT-XXX convention is **complete**. Future integration suites should follow the documented naming and guard patterns by default.
