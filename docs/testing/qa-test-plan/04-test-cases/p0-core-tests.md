# P0 Core Tests - CRUD Operations

> **Priority:** P0 - Core Foundation ⚡  
> **Success Criteria:** 100% pass rate (5/5 tests) - MANDATORY  
> **Duration:** 2 hours maximum  
> **Quality Gate:** If ANY test fails, STOP - system not ready

## Overview

Priority 0 tests validate essential CRUD (Create, Read, Update, Delete) operations that form the foundation of the Attio MCP Server. These tests must achieve 100% success rate before proceeding to higher priority levels.

### Test Prerequisites

- [ ] Environment verified and accessible
- [ ] Test data prepared (see [Test Data Setup](../07-reference/test-data-setup.md))
- [ ] API key configured and permissions confirmed
- [ ] Execution dashboard prepared (template in [Execution Process](../03-execution.md))

### Quick Resources
- **Copy-Paste Commands:** [P0 Quick Commands](../07-reference/quick-commands.md#p0-core-test-commands)
- **Tool Parameters:** [CRUD Tools Reference](../07-reference/tool-reference.md)
- **Bug Reporting:** [Issue Templates](../06-bug-reporting.md) for failures
- **Quality Gates:** [Decision Criteria](../05-quality-gates.md) for P0 failures

## Core Test Cases

### TC-001: Search Records - Basic Search Functionality

**Objective:** Validate basic search capabilities across all resource types

**Test Steps:**
1. Execute basic search for companies: `mcp__attio__search-records resource_type="companies" query="QA Test" limit=5`
2. Execute basic search for people: `mcp__attio__search-records resource_type="people" query="QA Tester" limit=5`
3. Execute basic search for tasks: `mcp__attio__search-records resource_type="tasks" query="QA Test Task" limit=5`

**Expected Results:**
- Returns structured search results for each resource type
- Results include relevant records matching search query
- Response format is consistent across resource types
- No error messages or exceptions thrown

**Success Criteria:** All three searches return valid results with proper formatting

---

### TC-002: Get Record Details - Data Retrieval

**Objective:** Validate ability to retrieve specific record details by ID

**Prerequisites:** Valid record IDs from TC-001 search results

**Test Steps:**
1. Get company details: `mcp__attio__get-record-details resource_type="companies" record_id="[ID_FROM_TC001]"`
2. Get person details: `mcp__attio__get-record-details resource_type="people" record_id="[ID_FROM_TC001]"`
3. Get task details: `mcp__attio__get-record-details resource_type="tasks" record_id="[ID_FROM_TC001]"`

**Expected Results:**
- Returns complete record details for valid IDs
- Response includes all available fields and their values
- Data structure matches resource type schema
- Handles non-existent IDs gracefully with appropriate error messages

**Success Criteria:** All record details retrieved successfully with complete data

---

### TC-003: Create Records - Data Creation

**Objective:** Validate ability to create new records across resource types

**Test Steps:**
1. Create test company:
   ```bash
   mcp__attio__create-record resource_type="companies" \
     record_data='{"name": "TC003 Test Company", "domains": ["tc003-test.com"]}'
   ```

2. Create test person:
   ```bash
   mcp__attio__create-record resource_type="people" \
     record_data='{"name": "TC003 Test Person", "email_addresses": ["tc003@test.com"]}'
   ```

3. Create test task:
   ```bash
   mcp__attio__create-record resource_type="tasks" \
     record_data='{"title": "TC003 Test Task", "status": "open"}'
   ```

**Expected Results:**
- Successfully creates records with generated unique IDs
- Returns confirmation with created record details
- New records appear in subsequent searches
- Proper field validation and error handling for invalid data

**Success Criteria:** All three record types created successfully with valid IDs returned

---

### TC-004: Update Records - Data Modification

**Objective:** Validate ability to modify existing record data

**Prerequisites:** Valid record IDs from TC-003 (created records)

**Test Steps:**
1. Update company description:
   ```bash
   mcp__attio__update-record resource_type="companies" record_id="[TC003_COMPANY_ID]" \
     record_data='{"description": "Updated by TC004"}'
   ```

2. Update person job title:
   ```bash
   mcp__attio__update-record resource_type="people" record_id="[TC003_PERSON_ID]" \
     record_data='{"job_title": "TC004 Updated Title"}'
   ```

3. Update task status:
   ```bash
   mcp__attio__update-record resource_type="tasks" record_id="[TC003_TASK_ID]" \
     record_data='{"status": "in_progress"}'
   ```

**Expected Results:**
- Successfully updates specified fields without affecting other data
- Returns confirmation of update with modified field values
- Changes persist when retrieved with get-record-details
- Proper validation prevents invalid field updates

**Success Criteria:** All updates applied successfully with data persistence verified

---

### TC-005: Delete Records - Data Removal

**Objective:** Validate ability to safely remove records from the system

**Prerequisites:** Valid record IDs from TC-003 (records to be deleted)

**Test Steps:**
1. Delete test company:
   ```bash
   mcp__attio__delete-record resource_type="companies" record_id="[TC003_COMPANY_ID]"
   ```

2. Delete test person:
   ```bash
   mcp__attio__delete-record resource_type="people" record_id="[TC003_PERSON_ID]"
   ```

3. Delete test task:
   ```bash
   mcp__attio__delete-record resource_type="tasks" record_id="[TC003_TASK_ID]"
   ```

**Expected Results:**
- Successfully removes records from the system
- Returns deletion confirmation
- Deleted records no longer appear in search results
- Attempting to get details of deleted records returns appropriate "not found" error

**Success Criteria:** All records deleted successfully with proper cleanup verification

## P0 Quality Gate Validation

Before proceeding to P1 tests, verify:

- [ ] **TC-001** ✅ Search functionality working across all resource types
- [ ] **TC-002** ✅ Record details retrieval working for all resource types  
- [ ] **TC-003** ✅ Record creation working for all resource types
- [ ] **TC-004** ✅ Record updates working for all resource types
- [ ] **TC-005** ✅ Record deletion working for all resource types

**⚠️ CRITICAL:** If ANY P0 test fails, STOP execution. The system is not ready for testing.

**✅ SUCCESS:** If all P0 tests pass, proceed to [P1 Essential Tests](./p1-essential-tests.md)

---

**Related Documentation:**
- [Next: P1 Essential Tests](./p1-essential-tests.md)
- [Back: Test Cases Overview](./index.md)
- [Reference: Quick Commands](../07-reference/quick-commands.md)
- [Support: Test Data Setup](../07-reference/test-data-setup.md)