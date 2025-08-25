# P2 Advanced Tests - Relationships & Batch Operations

> **Priority:** P2 - Advanced Features 🚀  
> **Success Criteria:** 50% pass rate (3/5 tests) - ENHANCEMENT  
> **Duration:** 2 hours maximum  
> **Quality Gate:** Document results but don't block release

## Overview

Priority 2 tests validate advanced functionality including relationship queries, content-based searches, and batch operations. These are enhancement features with a 50% success rate target - failures don't block release but should be documented for future improvement.

### Test Prerequisites

- [ ] P0 tests completed with 100% success rate
- [ ] P1 tests completed with ≥80% success rate
- [ ] Test data with relationships established
- [ ] System performance acceptable for batch operations

## Advanced Test Cases

### TC-010: Search by Relationship - Related Record Searches

**Objective:** Validate ability to find records through relationship connections

**Prerequisites:** Established relationships between test records

⚠️ **IMPLEMENTATION NOTE**: As of Issue #523, this test requires proper query API implementation. Current MCP tools may not use correct Attio API structure.

**Test Steps:**
1. Find people associated with a company:
   ```bash
   # PREFERRED: Use advanced-search with proper filter structure (after Issue #523 fix)
   mcp__attio__advanced-search resource_type="people" \
     filters='{"filter": {"path": ["company", "id"], "constraints": [{"operator": "equals", "value": "[COMPANY_ID]"}]}}'
   
   # LEGACY: Current relationship search (may fail until Issue #523 resolved)
   mcp__attio__search-by-relationship relationship_type="company_person" \
     source_id="[COMPANY_ID]" target_resource_type="people" limit=10
   ```

2. Find deals associated with a person:
   ```bash
   # PREFERRED: Query API approach
   mcp__attio__advanced-search resource_type="deals" \
     filters='{"filter": {"path": ["person", "id"], "constraints": [{"operator": "equals", "value": "[PERSON_ID]"}]}}'
   ```

3. Find tasks linked to a company:
   ```bash
   # PREFERRED: Query API approach  
   mcp__attio__advanced-search resource_type="tasks" \
     filters='{"filter": {"path": ["company", "id"], "constraints": [{"operator": "equals", "value": "[COMPANY_ID]"}]}}'
   ```

**Expected Results:**
- Returns related records based on established relationships
- Supports different relationship types and directions
- Handles cases with no relationships gracefully
- Performance is acceptable for reasonable data volumes

**Success Criteria:** Relationship searches return accurate connected records for at least 2/3 relationship types tested

**Related Issues:** [Issue #523](https://github.com/kesslerio/attio-mcp-server/issues/523) - Query API implementation needed

---

### TC-011: Search by Content - Content-Based Searches

**Objective:** Validate search capabilities across notes, descriptions, and content fields

⚠️ **IMPLEMENTATION NOTE**: As of Issue #523, this test requires proper query API implementation. Current MCP tools use incorrect filter structure.

**Test Steps:**
1. Search companies by content:
   ```bash
   # PREFERRED: Use advanced-search with proper content path (after Issue #523 fix)
   mcp__attio__advanced-search resource_type="companies" \
     filters='{"filter": {"path": ["description"], "constraints": [{"operator": "contains", "value": "important client"}]}}'
   
   # LEGACY: Current content search (fails until Issue #523 resolved)
   mcp__attio__search-by-content resource_type="companies" \
     content_type="notes" search_query="important client" limit=10
   ```

2. Search people by content:
   ```bash
   # PREFERRED: Query API with specific content field
   mcp__attio__advanced-search resource_type="people" \
     filters='{"filter": {"path": ["bio"], "constraints": [{"operator": "contains", "value": "key contact"}]}}'
   ```

3. Search across multiple content types:
   ```bash
   # PREFERRED: Multiple filter approach for different content fields
   mcp__attio__advanced-search resource_type="deals" \
     filters='{"filter": {"path": ["description"], "constraints": [{"operator": "contains", "value": "quarterly review"}]}}'
   ```

**Expected Results:**
- Searches within content fields (notes, descriptions, comments)
- Returns relevant results ranked by relevance
- Supports different content_type specifications
- Handles empty results and invalid content types

**Success Criteria:** Content search returns relevant results for at least 2/3 search scenarios

**Related Issues:** [Issue #523](https://github.com/kesslerio/attio-mcp-server/issues/523) - Query API implementation needed

---

### TC-012: Search by Timeframe - Date Range Searches

**Objective:** Validate temporal filtering and date-based searches

⚠️ **IMPLEMENTATION NOTE**: As of Issue #523, this test requires proper query API implementation. Current MCP tools attempt direct timeframe search instead of date filtering.

**Test Steps:**
1. Search tasks by creation date:
   ```bash
   # PREFERRED: Use advanced-search with date filter (after Issue #523 fix)
   mcp__attio__advanced-search resource_type="tasks" \
     filters='[{"field": "created_at", "operator": ">=", "value": "2024-01-01"}, {"field": "created_at", "operator": "<=", "value": "2024-12-31"}]'
   
   # LEGACY: Current timeframe search (fails until Issue #523 resolved)
   mcp__attio__search-by-timeframe resource_type="tasks" \
     timeframe_type="created_at" start_date="2024-01-01" end_date="2024-12-31" limit=20
   ```

2. Search companies by last activity:
   ```bash
   # PREFERRED: Query API with date operator
   mcp__attio__advanced-search resource_type="companies" \
     filters='[{"field": "created_at", "operator": ">=", "value": "2024-08-01"}]' \
     sort_by="created_at" sort_order="desc" limit=15
   ```

3. Search people by modified date:
   ```bash
   # PREFERRED: Date range filtering with query API
   mcp__attio__advanced-search resource_type="people" \
     filters='[{"field": "updated_at", "operator": ">=", "value": "2024-08-15"}, {"field": "updated_at", "operator": "<=", "value": "2024-08-20"}]'
   ```

**Expected Results:**
- Filters records within specified date ranges
- Supports different timeframe_type options
- Handles date format variations appropriately
- Returns chronologically sorted results

**Success Criteria:** Timeframe searches accurately filter by dates for at least 2/3 scenarios

**Related Issues:** [Issue #523](https://github.com/kesslerio/attio-mcp-server/issues/523) - Query API implementation needed

---

### TC-013: Batch Operations - Bulk Processing

**Objective:** Validate bulk operations for efficient data processing

**Prerequisites:** Multiple test records available for batch operations

**Test Steps:**
1. Batch get multiple companies:
   ```bash
   mcp__attio__batch-operations resource_type="companies" \
     operation_type="get" record_ids='["[ID1]","[ID2]","[ID3]"]'
   ```

2. Batch update multiple people:
   ```bash
   mcp__attio__batch-operations resource_type="people" \
     operation_type="update" \
     operations='[
       {"record_id": "[ID1]", "data": {"job_title": "Batch Updated 1"}},
       {"record_id": "[ID2]", "data": {"job_title": "Batch Updated 2"}}
     ]'
   ```

3. Batch create multiple tasks:
   ```bash
   mcp__attio__batch-operations resource_type="tasks" \
     operation_type="create" \
     operations='[
       {"data": {"title": "Batch Task 1", "status": "open"}},
       {"data": {"title": "Batch Task 2", "status": "open"}}
     ]'
   ```

**Expected Results:**
- Processes multiple operations efficiently
- Returns batch results with success/failure status for each item
- Handles partial failures gracefully
- Performance scales reasonably with batch size

**Success Criteria:** Batch operations complete successfully for at least 2/3 operation types

---

### TC-019: Batch Search - Multiple Parallel Searches

**Objective:** Validate parallel search execution for efficiency

**Test Steps:**
1. Parallel company searches:
   ```bash
   mcp__attio__batch-search resource_type="companies" \
     queries='["technology", "consulting", "software"]' limit=5
   ```

2. Parallel people searches:
   ```bash
   mcp__attio__batch-search resource_type="people" \
     queries='["manager", "engineer", "director"]' limit=5
   ```

3. Mixed resource batch search:
   ```bash
   mcp__attio__batch-search resource_type="tasks" \
     queries='["urgent", "review", "meeting"]' limit=3
   ```

**Expected Results:**
- Executes multiple searches in parallel or efficiently
- Returns consolidated results for all queries
- Maintains individual query performance
- Handles query failures without stopping entire batch

**Success Criteria:** Batch search completes efficiently with results for at least 2/3 query sets

## P2 Quality Assessment

Document results without blocking release:

- [ ] **TC-010** [Pass/Fail] Relationship searches
- [ ] **TC-011** [Pass/Fail] Content-based searches  
- [ ] **TC-012** [Pass/Fail] Timeframe searches
- [ ] **TC-013** [Pass/Fail] Batch operations
- [ ] **TC-019** [Pass/Fail] Batch search operations

**Pass Rate Calculation:** [Tests Passed] / 5 = [XX]%

### Results Documentation

| Pass Rate | Assessment | Recommendation |
|-----------|------------|----------------|
| **≥60% (3+/5)** | ✅ Excellent | Advanced features working well |
| **50% (3/5)** | ✅ Target Met | Acceptable enhancement level |
| **40% (2/5)** | ⚠️ Below Target | Document limitations, plan improvements |
| **<40% (1-/5)** | ❌ Concerning | Consider disabling advanced features |

### Enhancement Planning

For failed tests, document:
- **Failure Details:** Specific error or limitation encountered
- **Impact Assessment:** Effect on user experience and workflows
- **Workaround Options:** Alternative approaches users can take
- **Development Priority:** Priority for future enhancement work

**✅ COMPLETE:** P2 testing complete. Proceed to [Phase 2 Usability Testing](./usability-tests.md)

**📝 DOCUMENT:** Record all findings for release notes and future enhancement planning

---

**Related Documentation:**
- [Previous: P1 Essential Tests](./p1-essential-tests.md)
- [Next: Usability Tests](./usability-tests.md)
- [Back: Test Cases Overview](./index.md)
- [Reference: Quality Gates](../05-quality-gates.md)