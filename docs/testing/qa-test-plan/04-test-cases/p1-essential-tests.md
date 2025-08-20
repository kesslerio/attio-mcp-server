# P1 Essential Tests - Schema & Advanced Operations

> **Priority:** P1 - Essential Extensions 🔧  
> **Success Criteria:** 80% pass rate (3/4 tests) - PRODUCTION GATE  
> **Duration:** 2 hours maximum  
> **Quality Gate:** If <80% pass rate, evaluate production readiness

## Overview

Priority 1 tests validate essential schema discovery and advanced search operations that extend beyond basic CRUD functionality. These tests require 80% success rate to proceed with production deployment.

### Test Prerequisites

- [ ] All P0 tests completed with 100% success rate
- [ ] Test data from P0 tests available or new test data prepared
- [ ] Environment stable and responsive

## Essential Test Cases

### TC-006: Get Attributes - Schema Information

**Objective:** Validate ability to discover and retrieve schema information for resource types

**Test Steps:**
1. Get company attributes: `mcp__attio__get-attributes resource_type="companies"`
2. Get people attributes: `mcp__attio__get-attributes resource_type="people"`
3. Get tasks attributes: `mcp__attio__get-attributes resource_type="tasks"`
4. Get lists attributes: `mcp__attio__get-attributes resource_type="lists"`

**Expected Results:**
- Returns comprehensive schema information for each resource type
- Includes field names, types, validation rules, and constraints
- Schema information is accurate and up-to-date
- Supports all standard resource types

**Success Criteria:** Schema information retrieved for all tested resource types with complete field definitions

---

### TC-007: Discover Attributes - Dynamic Schema Discovery

**Objective:** Validate dynamic attribute discovery for flexible schema exploration

**Test Steps:**
1. Discover company attributes: `mcp__attio__discover-attributes resource_type="companies"`
2. Discover people attributes: `mcp__attio__discover-attributes resource_type="people"`
3. Discover deals attributes: `mcp__attio__discover-attributes resource_type="deals"`

**Expected Results:**
- Returns discoverable attributes including custom fields
- Identifies optional vs required fields
- Shows field relationships and dependencies
- Provides usage examples or hints where applicable

**Success Criteria:** Dynamic discovery works for all resource types with comprehensive attribute information

---

### TC-008: Get Detailed Info - Specific Information Types

**Objective:** Validate retrieval of specific information types and related data

**Prerequisites:** Valid record IDs from previous tests

**Test Steps:**
1. Get company activities: `mcp__attio__get-detailed-info resource_type="companies" record_id="[COMPANY_ID]" info_type="activities"`
2. Get person contact history: `mcp__attio__get-detailed-info resource_type="people" record_id="[PERSON_ID]" info_type="contact"`
3. Get task relationships: `mcp__attio__get-detailed-info resource_type="tasks" record_id="[TASK_ID]" info_type="relationships"`

**Expected Results:**
- Returns specific information types as requested
- Data is relevant and properly formatted
- Handles missing or unavailable information gracefully
- Provides appropriate info_type options for each resource

**Success Criteria:** Detailed information retrieved successfully for specified info_types across resource types

---

### TC-009: Advanced Search - Complex Search Operations

**Objective:** Validate advanced search capabilities with filters, sorting, and complex queries

**Test Steps:**
1. Company search with filters:
   ```bash
   mcp__attio__advanced-search resource_type="companies" \
     filters='[{"field": "employee_count", "operator": ">", "value": "50"}]' \
     sort_by="name" sort_order="asc"
   ```

2. People search with date filters:
   ```bash
   mcp__attio__advanced-search resource_type="people" \
     filters='[{"field": "created_at", "operator": ">=", "value": "2024-01-01"}]' \
     limit=20
   ```

3. Multi-field task search:
   ```bash
   mcp__attio__advanced-search resource_type="tasks" \
     filters='[
       {"field": "status", "operator": "in", "value": ["open", "in_progress"]},
       {"field": "priority", "operator": "=", "value": "high"}
     ]'
   ```

**Expected Results:**
- Returns filtered results matching specified criteria
- Sorting and pagination work as expected
- Complex multi-field filters function correctly
- Handles invalid filters with appropriate error messages

**Success Criteria:** Advanced search operations work with filters, sorting, and complex query combinations

## P1 Quality Gate Assessment

Evaluate results before proceeding to P2:

- [ ] **TC-006** ✅ Schema discovery working for all resource types
- [ ] **TC-007** ✅ Dynamic attribute discovery functional
- [ ] **TC-008** ✅ Detailed information retrieval working
- [ ] **TC-009** ✅ Advanced search operations functional

**Pass Rate Calculation:** [Tests Passed] / 4 = [XX]%

### Decision Matrix

| Pass Rate | Decision | Action |
|-----------|----------|---------|
| **100% (4/4)** | ✅ Excellent | Proceed to P2 with confidence |
| **≥80% (3/4)** | ✅ Acceptable | Proceed to P2, document failed test |
| **<80% (2/4 or less)** | ⚠️ Concerning | **Evaluate production readiness** |

### If Pass Rate <80%

**Evaluation Questions:**
- Which specific test failed and why?
- Is the failure in core functionality or edge cases?
- Can the failure be worked around in production?
- Does the failure block critical user workflows?

**Decision Options:**
1. **Proceed to P2** if failures are minor and don't block core workflows
2. **Stop testing** if failures indicate fundamental issues
3. **Fix and retest** if time allows and fixes are straightforward

**✅ CONTINUE:** If pass rate ≥80%, proceed to [P2 Advanced Tests](./p2-advanced-tests.md)

**⚠️ EVALUATE:** If pass rate <80%, assess production readiness before proceeding

---

**Related Documentation:**
- [Previous: P0 Core Tests](./p0-core-tests.md)
- [Next: P2 Advanced Tests](./p2-advanced-tests.md)
- [Back: Test Cases Overview](./index.md)
- [Reference: Quality Gates](../05-quality-gates.md)