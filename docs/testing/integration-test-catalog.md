# Integration Test Catalog

Complete catalog of integration tests using the **IT-XXX** naming taxonomy. This mirrors the [MCP E2E Test Catalog](../../test/e2e/mcp/README.md) but focuses on individual API operations and edge cases rather than complete workflows.

## 📋 Quick Reference

- **Total Integration Tests**: 8 suites (IT-XXX naming complete)
- **ID Prefix**: `IT-XXX` (Integration Test)
- **Location**: `test/integration/`
- **Execution**: `npm run test:integration`
- **Prerequisites**: `ATTIO_API_KEY` environment variable

## 🎯 IT-XXX Taxonomy

> **Note on ID Sequences**: Gaps in test IDs (e.g., IT-102–IT-104) are intentional and reserved for future tests within that category. This maintains organized ID ranges while allowing test suite growth without renumbering.

### IT-001–IT-099: Core Object CRUD Operations

| ID         | Title                    | File Path                                                  | Environment                   | Owner    | Status       |
| ---------- | ------------------------ | ---------------------------------------------------------- | ----------------------------- | -------- | ------------ |
| **IT-001** | Batch Company Operations | `core/IT-001-batch-company-operations.integration.test.ts` | `shouldRunIntegrationTests()` | Platform | ✅ Completed |

**Description**: Validates batch create, update, and delete operations for company records. Tests chunking behavior, error handling, and API response consistency.

**Test Cases**:

- IT-001.1: Updates multiple companies in a batch【F:test/integration/core/IT-001-batch-company-operations.integration.test.ts†L82-L117】

---

### IT-100–IT-199: API Validation & Edge Cases

| ID         | Title                           | File Path                                                    | Environment                                                          | Owner    | Status       |
| ---------- | ------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- | -------- | ------------ |
| **IT-101** | Advanced Search API             | `api/IT-101-advanced-search-api.integration.test.ts`         | `shouldRunIntegrationTests()`                                        | API Team | ✅ Completed |
| **IT-105** | Advanced Search Validation      | `api/IT-105-advanced-search-validation.integration.test.ts`  | `shouldRunIntegrationTests()`                                        | API Team | ✅ Completed |
| **IT-106** | Attribute Validation (Live API) | `api/IT-106-attribute-validation.integration.test.ts`        | `shouldRunIntegrationTests()`                                        | API Team | ✅ Completed |
| **IT-107** | Industry Categories Mapping     | `api/IT-107-industry-categories-mapping.integration.test.ts` | `shouldRunIntegrationTests()` + `ENABLE_INDUSTRY_MAPPING_TESTS=true` | API Team | ✅ Completed |

**IT-101: Advanced Search API**

- IT-101.1: Returns companies matching a simple name filter【F:test/integration/api/IT-101-advanced-search-api.integration.test.ts†L28-L47】
- IT-101.2: Handles OR logic with multiple conditions【F:test/integration/api/IT-101-advanced-search-api.integration.test.ts†L49-L67】
- IT-101.3: Handles company-specific attributes【F:test/integration/api/IT-101-advanced-search-api.integration.test.ts†L69-L83】
- IT-101.4: Reports invalid filter structures【F:test/integration/api/IT-101-advanced-search-api.integration.test.ts†L85-L94】
- IT-101.5: Reports invalid filter conditions【F:test/integration/api/IT-101-advanced-search-api.integration.test.ts†L95-L110】
- IT-101.6: Searches via the generic API helper【F:test/integration/api/IT-101-advanced-search-api.integration.test.ts†L112-L131】
- IT-101.7: Surfaces filter validation errors【F:test/integration/api/IT-101-advanced-search-api.integration.test.ts†L132-L146】
- IT-101.8: Rejects non-array filter collections【F:test/integration/api/IT-101-advanced-search-api.integration.test.ts†L148-L159】

**IT-105: Advanced Search Validation**

- IT-105.1: Rejects missing filters object【F:test/integration/api/IT-105-advanced-search-validation.integration.test.ts†L34-L38】
- IT-105.2: Rejects missing filters array【F:test/integration/api/IT-105-advanced-search-validation.integration.test.ts†L40-L44】
- IT-105.3: Rejects non-array filter collections【F:test/integration/api/IT-105-advanced-search-validation.integration.test.ts†L46-L54】
- IT-105.4: Rejects filter objects without attribute metadata【F:test/integration/api/IT-105-advanced-search-validation.integration.test.ts†L56-L69】
- IT-105.5: Rejects attribute definitions without slug【F:test/integration/api/IT-105-advanced-search-validation.integration.test.ts†L71-L85】
- IT-105.6: Rejects filters missing condition property【F:test/integration/api/IT-105-advanced-search-validation.integration.test.ts†L87-L100】

**IT-106: Attribute Validation**

- IT-106.1: Fetches live attribute metadata【F:test/integration/api/IT-106-attribute-validation.integration.test.ts†L60-L68】
- IT-106.2: Validates company creation with type coercion【F:test/integration/api/IT-106-attribute-validation.integration.test.ts†L71-L86】
- IT-106.3: Validates company updates with type coercion【F:test/integration/api/IT-106-attribute-validation.integration.test.ts†L89-L112】
- IT-106.4: Validates individual attribute updates【F:test/integration/api/IT-106-attribute-validation.integration.test.ts†L115-L134】
- IT-106.5: Rejects invalid attribute values【F:test/integration/api/IT-106-attribute-validation.integration.test.ts†L140-L153】

**IT-107: Industry Categories Mapping**

- IT-107.1: Maps industries to list-backed categories on create【F:test/integration/api/IT-107-industry-categories-mapping.integration.test.ts†L30-L69】

---

### IT-200–IT-299: Platform Services

| ID         | Title                         | File Path                                           | Environment                                        | Owner    | Status       |
| ---------- | ----------------------------- | --------------------------------------------------- | -------------------------------------------------- | -------- | ------------ |
| **IT-201** | Rate Limiting (Deterministic) | `services/IT-201-rate-limiting.integration.test.ts` | `shouldRunIntegrationTests({ allowDryRun: true })` | Platform | ✅ Completed |

**IT-201: Rate Limiting**

- IT-201.1: Triggers rate limit after exceeding threshold with headers【F:test/integration/services/IT-201-rate-limiting.integration.test.ts†L19-L55】

**Note**: This is a deterministic/unit-style test that doesn't require live API access. Consider moving to `test/unit/` during migration.

---

### IT-300–IT-399: Advanced Features

| ID         | Title                      | File Path                                                        | Environment                   | Owner      | Status       |
| ---------- | -------------------------- | ---------------------------------------------------------------- | ----------------------------- | ---------- | ------------ |
| **IT-301** | Relationship Filters       | `advanced/IT-301-relationship-filters.integration.test.ts`       | `shouldRunIntegrationTests()` | Platform   | ✅ Completed |
| **IT-302** | List Membership Operations | `advanced/IT-302-list-membership-operations.integration.test.ts` | `shouldRunIntegrationTests()` | Lists Team | ✅ Completed |

**IT-301: Relationship Filters**

- IT-301.1: Finds people who work at tech companies【F:test/integration/advanced/IT-301-relationship-filters.integration.test.ts†L35-L60】
- IT-301.2: Finds companies with executive roles【F:test/integration/advanced/IT-301-relationship-filters.integration.test.ts†L62-L83】
- IT-301.3: Finds people in a specific list【F:test/integration/advanced/IT-301-relationship-filters.integration.test.ts†L87-L102】
- IT-301.4: Finds companies in a specific list【F:test/integration/advanced/IT-301-relationship-filters.integration.test.ts†L102-L114】
- IT-301.5: Finds people via nested list relationships【F:test/integration/advanced/IT-301-relationship-filters.integration.test.ts†L115-L126】
- IT-301.6: Finds companies via nested list relationships【F:test/integration/advanced/IT-301-relationship-filters.integration.test.ts†L127-L144】

**IT-302: List Membership Operations**

- IT-302.0: Requires TEST_LIST_ID and TEST_COMPANY_ID configuration【F:test/integration/advanced/IT-302-list-membership-operations.integration.test.ts†L63-L104】
- IT-302.1: Adds list membership with required parameters【F:test/integration/advanced/IT-302-list-membership-operations.integration.test.ts†L121-L134】
- IT-302.2: Adds list membership with parent object context【F:test/integration/advanced/IT-302-list-membership-operations.integration.test.ts†L136-L153】
- IT-302.3: Adds list membership with entry values【F:test/integration/advanced/IT-302-list-membership-operations.integration.test.ts†L155-L169】
- IT-302.4: Adds list membership with all parameters【F:test/integration/advanced/IT-302-list-membership-operations.integration.test.ts†L171-L186】
- IT-302.5: Surfaces validation errors for missing record_id【F:test/integration/advanced/IT-302-list-membership-operations.integration.test.ts†L175-L183】
- IT-302.6: Surfaces validation errors for missing resource_type【F:test/integration/advanced/IT-302-list-membership-operations.integration.test.ts†L185-L194】

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

### Current Status: Phase 3 Complete ✅

- ✅ **Phase 1**: Audit complete - [Integration Test Naming Audit](./integration-test-naming-audit.md)
- ✅ **Phase 2**: Convention documented in this catalog and [test/integration/README.md](../../test/integration/README.md)
- ✅ **Phase 3**: File renaming and ID assignment (tracked in issue #834)

### Migration Blockers

- ✅ Completed - Phase 3 merged via issue #834

### Environment Variable Consolidation

All integration suites now rely on the shared `shouldRunIntegrationTests()` helper (with `allowDryRun` support for IT-201). Legacy guards such as `RUN_INTEGRATION_TESTS` and `SKIP_TESTS` have been removed.

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
