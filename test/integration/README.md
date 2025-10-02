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
import { shouldRunIntegrationTests } from '../utils/integration-guards';

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

> **Note**: Tests are currently in migration to the IT-XXX naming convention. See [Integration Test Catalog](../../docs/testing/integration-test-catalog.md) for the complete mapping.

### Active Suites (Legacy Naming)

| Current File                                            | Proposed IT-XXX | Description                            | Status            |
| ------------------------------------------------------- | --------------- | -------------------------------------- | ----------------- |
| `batch-update-companies.integration.test.ts`            | IT-001          | Batch company CRUD operations          | ⏳ Pending rename |
| `rate-limiting.integration.test.ts`                     | IT-201          | Rate limiting behavior (deterministic) | ⏳ Pending rename |
| `relationship-filters.test.ts`                          | IT-301          | Relationship filter validation         | ⏳ Pending rename |
| `lists/add-record-to-list.integration.test.ts`          | IT-302          | List membership operations             | ⏳ Pending rename |
| `api/advanced-search.integration.test.ts`               | IT-101          | Advanced search API                    | ⏳ Pending rename |
| `api/advanced-search-validation.integration.test.ts`    | IT-105          | Advanced search validation             | ⏳ Pending rename |
| `api/attribute-validation-real-api.integration.test.ts` | IT-106          | Attribute validation with live API     | ⏳ Pending rename |
| `api/industry-categories-mapping.integration.test.ts`   | IT-107          | Industry-categories field mapping      | ⏳ Pending rename |

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

The integration test suite is currently migrating to the IT-XXX naming convention to improve:

- **Discoverability**: Consistent numbering aligned with E2E tests
- **Reporting**: Better dashboard integration and coverage tracking
- **Maintenance**: Clear scope boundaries and test organization

**Migration tracked in**: Issue #834 - Integration test naming migration

For migration details and implementation plan, see [Integration Test Naming Audit](../../docs/testing/integration-test-naming-audit.md).
