# Integration Test Catalog

Complete catalog of integration tests using the **IT-XXX** naming taxonomy. This mirrors the [MCP E2E Test Catalog](../../test/e2e/mcp/README.md) but focuses on individual API operations and edge cases rather than complete workflows.

## 📋 Quick Reference

- **Total Integration Tests**: 8 suites (pending migration to IT-XXX)
- **ID Prefix**: `IT-XXX` (Integration Test)
- **Location**: `test/integration/`
- **Execution**: `npm run test:integration`
- **Prerequisites**: `ATTIO_API_KEY` environment variable

## 🎯 IT-XXX Taxonomy

### IT-001–IT-099: Core Object CRUD Operations

| ID         | Title                    | Current File                                 | Environment                                 | Owner    | Status            |
| ---------- | ------------------------ | -------------------------------------------- | ------------------------------------------- | -------- | ----------------- |
| **IT-001** | Batch Company Operations | `batch-update-companies.integration.test.ts` | `ATTIO_API_KEY` + `!SKIP_INTEGRATION_TESTS` | Platform | ⏳ Pending rename |

**Description**: Validates batch create, update, and delete operations for company records. Tests chunking behavior, error handling, and API response consistency.

**Test Cases**:

- IT-001.1: Batch create companies with valid data
- IT-001.2: Batch update companies with partial payloads
- IT-001.3: Batch delete with cascading relationship cleanup
- IT-001.4: Error handling for invalid company data in batch

---

### IT-100–IT-199: API Validation & Edge Cases

| ID         | Title                           | Current File                                            | Environment                                                | Owner    | Status            |
| ---------- | ------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- | -------- | ----------------- |
| **IT-101** | Advanced Search API             | `api/advanced-search.integration.test.ts`               | `ATTIO_API_KEY` + `!SKIP_INTEGRATION_TESTS`                | API Team | ⏳ Pending rename |
| **IT-105** | Advanced Search Validation      | `api/advanced-search-validation.integration.test.ts`    | `ATTIO_API_KEY` + `!SKIP_INTEGRATION_TESTS`                | API Team | ⏳ Pending rename |
| **IT-106** | Attribute Validation (Live API) | `api/attribute-validation-real-api.integration.test.ts` | `ATTIO_API_KEY` + `!SKIP_INTEGRATION_TESTS`                | API Team | ⏳ Pending rename |
| **IT-107** | Industry Categories Mapping     | `api/industry-categories-mapping.integration.test.ts`   | `ATTIO_API_KEY` + `!SKIP_INTEGRATION_TESTS` + feature flag | API Team | ⏳ Pending rename |

**IT-101: Advanced Search API**

- IT-101.1: Multi-filter search with AND/OR logic
- IT-101.2: Date range filtering
- IT-101.3: Pagination with large result sets
- IT-101.4: Search performance benchmarks

**IT-105: Advanced Search Validation**

- IT-105.1: Rejects missing filter payloads
- IT-105.2: Validates filter type compatibility
- IT-105.3: Handles malformed query structures
- IT-105.4: Edge cases with empty/null filter values

**IT-106: Attribute Validation**

- IT-106.1: Custom attribute type enforcement
- IT-106.2: Required field validation
- IT-106.3: Field length limits
- IT-106.4: Invalid attribute API responses

**IT-107: Industry Categories Mapping**

- IT-107.1: Standard industry category lookup
- IT-107.2: Custom category creation
- IT-107.3: Category hierarchy traversal
- IT-107.4: Deprecated category handling

---

### IT-200–IT-299: Platform Services

| ID         | Title                         | Current File                        | Environment        | Owner    | Status            |
| ---------- | ----------------------------- | ----------------------------------- | ------------------ | -------- | ----------------- |
| **IT-201** | Rate Limiting (Deterministic) | `rate-limiting.integration.test.ts` | Local (no API key) | Platform | ⏳ Pending rename |

**IT-201: Rate Limiting**

- IT-201.1: Throttles requests over limit (local simulation)
- IT-201.2: Queue overflow handling
- IT-201.3: Priority request queueing
- IT-201.4: Rate limit header parsing

**Note**: This is a deterministic/unit-style test that doesn't require live API access. Consider moving to `test/unit/` during migration.

---

### IT-300–IT-399: Advanced Features

| ID         | Title                      | Current File                                   | Environment                                    | Owner      | Status            |
| ---------- | -------------------------- | ---------------------------------------------- | ---------------------------------------------- | ---------- | ----------------- |
| **IT-301** | Relationship Filters       | `relationship-filters.test.ts`                 | `RUN_INTEGRATION_TESTS=true` + `ATTIO_API_KEY` | Platform   | ⏳ Pending rename |
| **IT-302** | List Membership Operations | `lists/add-record-to-list.integration.test.ts` | `ATTIO_API_KEY` + `!SKIP_INTEGRATION_TESTS`    | Lists Team | ⏳ Pending rename |

**IT-301: Relationship Filters**

- IT-301.1: Filter companies by related people
- IT-301.2: Bidirectional relationship queries
- IT-301.3: Nested relationship filtering
- IT-301.4: Performance with deep relationship graphs

**IT-302: List Membership Operations**

- IT-302.1: Add record to list with universal tools
- IT-302.2: Remove record from list
- IT-302.3: Update list entry metadata
- IT-302.4: Bulk membership operations

---

## 🔄 Integration vs E2E Comparison

| Aspect          | Integration (IT-XXX)       | E2E (TC-XXX)                               |
| --------------- | -------------------------- | ------------------------------------------ |
| **Test Count**  | 8 suites                   | 38+ test cases                             |
| **Scope**       | API operations, edge cases | Complete workflows                         |
| **Catalog**     | This document              | [MCP README](../../test/e2e/mcp/README.md) |
| **Numbering**   | IT-001, IT-105, IT-201...  | TC-001, TC-L01, TC-D01...                  |
| **Environment** | Live Attio API             | Live Attio API + MCP protocol              |

## 🚧 Migration Tracking

### Current Status: Phase 2 Complete ✅

- ✅ **Phase 1**: Audit complete - [Integration Test Naming Audit](./integration-test-naming-audit.md)
- ✅ **Phase 2**: Convention documented in this catalog and [test/integration/README.md](../../test/integration/README.md)
- ⏳ **Phase 3**: File renaming and ID assignment (tracked in issue #834)

### Migration Blockers

- [ ] None - ready for Phase 3 implementation after team review

### Environment Variable Consolidation

**Current inconsistency** (to be fixed in Phase 3):

- `shouldRunTests` wrapper (batch-update-companies)
- `SKIP_TESTS` guard (advanced-search, attribute-validation)
- `RUN_INTEGRATION_TESTS` flag (relationship-filters)
- `SKIP_INTEGRATION_TESTS` flag (lists, industry-categories)

**Target state**: Single `shouldRunIntegrationTests()` helper honoring `ATTIO_API_KEY` and `SKIP_INTEGRATION_TESTS`.

## 📚 Related Documentation

- **[Integration Test README](../../test/integration/README.md)** - Naming convention and quick start guide
- **[Integration Test Naming Audit](./integration-test-naming-audit.md)** - Detailed audit findings and migration strategy
- **[MCP E2E Test Catalog](../../test/e2e/mcp/README.md)** - TC-XXX taxonomy for E2E tests
- **[Testing Guide](./testing.md)** - Overall testing strategy

## 🔗 External References

- **Issue #810**: Integration test naming convention audit (Phases 1 & 2)
- **Issue #834**: Phase 3 migration implementation (file renaming)
- **PR #827**: Audit documentation and catalog creation
- **PR #804**: Test relocation that exposed naming inconsistencies
