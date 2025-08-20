# QA Test Plan - Attio MCP Server

## Overview

This document provides a systematic approach to testing the Attio MCP Server's 25+ tools across 6 resource types. The plan uses a priority-based framework with quality gates to ensure comprehensive validation.

### Objectives

- Test all MCP tools for functionality and usability
- Validate CRUD operations across all resource types
- Identify bugs, parameter issues, and error handling problems
- Ensure system readiness for production use

### Scope

| Component | Coverage |
|-----------|----------|
| **Tools** | 25+ MCP tools (Universal + Resource-specific) |
| **Resources** | Companies, People, Lists, Records, Tasks, Deals |
| **Test Types** | Happy Path, Edge Cases, Error Conditions |
| **Phases** | Functional Testing + Usability Validation |

## Test Strategy

### Priority Framework

Tests are organized in three priority levels with specific success criteria:

| Priority | Tools | Success Rate | Duration | Quality Gate |
|----------|-------|--------------|----------|-------------|
| **P0 - Core** ⚡ | CRUD operations | 100% (5/5) | 2 hours | MANDATORY |
| **P1 - Essential** 🔧 | Attributes, advanced search | 80% (3/4) | 2 hours | PRODUCTION GATE |
| **P2 - Advanced** 🚀 | Relationships, batch ops | 50% (3/5) | 2 hours | ENHANCEMENT |

**Quality Gates:**
- P0 failure = STOP testing (system not ready)
- P1 <80% = Evaluate production readiness
- P2 <50% = Document but don't block release

### Testing Phases

#### Phase 1: Functional Testing
- **Executor:** Technical agent (familiar with system)
- **Focus:** Core functionality validation
- **Duration:** 6 hours max (2 hours per priority)

#### Phase 2: Usability Testing
- **Executor:** Fresh agent (unfamiliar with system)
- **Focus:** Documentation clarity and user experience
- **Duration:** 2-3 hours

## Test Execution Process

### Pre-Test Setup

1. **Environment Verification**
   - Verify MCP server accessibility
   - Test basic connectivity with a simple search
   - Confirm API key and permissions

2. **Test Data Preparation**
   - Create test records for each resource type
   - Use timestamp-based naming to avoid conflicts
   - Document created record IDs for reference
   - See [Appendix A](#appendix-a-test-data-setup) for detailed commands

3. **Test Execution Dashboard**
   ```markdown
   ## Test Execution Dashboard - [Date]
   Priority | Total | Completed | Passed | Failed | Time | Status
   ---------|-------|-----------|--------|--------|------|--------
   P0       | 5     | 0         | 0      | 0      | 0:00 | PENDING
   P1       | 4     | 0         | 0      | 0      | 0:00 | BLOCKED
   P2       | 5     | 0         | 0      | 0      | 0:00 | BLOCKED
   ```

### Test Execution Workflow

#### Priority 0 (P0) - Core Foundation
**Must Complete:** All 5 tests pass (100%)

1. **TC-001:** Search Records - Basic search functionality
2. **TC-002:** Get Record Details - Retrieve specific records  
3. **TC-003:** Create Records - Create new records
4. **TC-004:** Update Records - Modify existing records
5. **TC-005:** Delete Records - Remove records

**Quality Gate:** If any P0 test fails, STOP - system not ready

#### Priority 1 (P1) - Essential Extensions  
**Target:** 80% pass rate (3/4 tests)

1. **TC-006:** Get Attributes - Schema information
2. **TC-007:** Discover Attributes - Dynamic schema discovery
3. **TC-008:** Get Detailed Info - Specific information types
4. **TC-009:** Advanced Search - Complex search operations

#### Priority 2 (P2) - Advanced Features
**Target:** 50% pass rate (3/5 tests)

1. **TC-010:** Search by Relationship - Related record searches
2. **TC-011:** Search by Content - Content-based searches  
3. **TC-012:** Search by Timeframe - Date range searches
4. **TC-013:** Batch Operations - Bulk operations
5. **TC-019:** Batch Search - Multiple parallel searches

### Post-Test Activities

1. **Results Documentation**
   - Update execution dashboard with results
   - Document any bugs found with severity levels
   - Create improvement recommendations

2. **Test Data Cleanup**  
   - Remove all test-created records
   - Use automated cleanup utilities (see [Appendix E](#appendix-e-cleanup-utilities))
   - Verify workspace is clean for future tests

## Success Criteria & Quality Gates

### Priority-Based Success Metrics

| Priority | Success Rate | Quality Gate | Action on Failure |
|----------|-------------|--------------|------------------|
| **P0 - Core** | 100% (5/5) | MANDATORY | STOP - System not ready |
| **P1 - Essential** | ≥80% (3/4) | PRODUCTION GATE | Evaluate readiness |  
| **P2 - Advanced** | ≥50% (3/5) | ENHANCEMENT | Document but don't block |

### Phase 2 Success Criteria (Usability)

- **Parameter Clarity:** Users can execute tools without parameter confusion
- **Error Messages:** Clear, actionable error messages for common mistakes
- **Documentation:** Tool descriptions sufficient for new users
- **Edge Cases:** Graceful handling of boundary conditions

### Overall Test Completion Criteria

**Go Decision:** System ready for production use
- P0: 100% pass rate achieved
- P1: ≥80% pass rate achieved  
- Critical bugs: None identified
- Usability: No blocking issues found

**No-Go Decision:** System requires additional development
- Any P0 test failure
- P1 pass rate <80%
- Critical bugs identified
- Major usability issues found

## Bug Reporting & Issue Tracking

### Bug Severity Levels

| Level | Description | Examples | Response Time |
|-------|-------------|----------|---------------|
| **Critical** | System unusable | Tool crashes, data corruption | Immediate |
| **High** | Major functionality broken | Core CRUD operations fail | Same day |
| **Medium** | Feature impaired | Search returns wrong results | 2-3 days |
| **Low** | Minor issues | Formatting problems | Next sprint |

### Bug Report Template

When bugs are found, document them with:

```markdown
## Bug Report - [Tool Name] - [Date]

**Bug ID:** BUG-YYYY-MM-DD-###  
**Tool:** [tool-name]  
**Severity:** [Critical/High/Medium/Low]  
**Test Case:** [TC-XXX]  

<<<<<<< Updated upstream
## People Records
- Alice QA Tester: ID = [FILL_IN_ID]
- Bob QA Validator: ID = [FILL_IN_ID]
- Carol QA Analyst: ID = [FILL_IN_ID]

## Task Records
- QA Test Task Alpha: ID = [FILL_IN_ID]
- QA Test Task Beta: ID = [FILL_IN_ID]

## Deal Records  
- QA Test Deal Alpha: ID = [FILL_IN_ID]
- QA Test Deal Beta: ID = [FILL_IN_ID]

## Test Data Status
- Created Date: [YYYY-MM-DD HH:MM]
- Creator: [Name/Agent]
- Environment: [Test Environment]
- Status: [ACTIVE/ARCHIVED/CLEANUP_PENDING]
```

### Test Data Cleanup Protocol

**CRITICAL**: Always clean up test data after completion to prevent Attio workspace pollution.

#### Option 1: Automated Cleanup (Recommended)

Use the comprehensive cleanup utility for efficient batch cleanup:

```bash
# 🚀 RECOMMENDED: Use automated cleanup utility
# Preview what would be deleted (safe dry-run)
./cleanup-test-data.sh --dry-run

# Perform actual cleanup of all test data
./cleanup-test-data.sh --live

# Alternative: Use npm scripts
npm run cleanup:test-data:dry    # Preview only
npm run cleanup:test-data:live   # Live deletion

# Clean specific resource types only
npm run cleanup:test-data:companies -- --live
npm run cleanup:test-data:people -- --live
npm run cleanup:test-data:tasks -- --live
npm run cleanup:test-data:lists -- --live

# Custom prefixes (default: TEST_, QA_, E2E_)
./cleanup-test-data.sh --prefix=DEMO_,TEMP_ --live

# Parallel processing for faster cleanup
./cleanup-test-data.sh --parallel=10 --live
```

#### Option 2: Manual Cleanup (Legacy)

For individual record cleanup when IDs are known:

```bash
# Manual deletion of specific test records
mcp__attio__delete-record resource_type="companies" record_id="$QA_COMPANY_1_ID"
mcp__attio__delete-record resource_type="companies" record_id="$QA_COMPANY_2_ID" 
mcp__attio__delete-record resource_type="companies" record_id="$QA_COMPANY_3_ID"

mcp__attio__delete-record resource_type="people" record_id="$QA_PERSON_1_ID"
mcp__attio__delete-record resource_type="people" record_id="$QA_PERSON_2_ID"
mcp__attio__delete-record resource_type="people" record_id="$QA_PERSON_3_ID"

mcp__attio__delete-record resource_type="tasks" record_id="$QA_TASK_1_ID"
mcp__attio__delete-record resource_type="tasks" record_id="$QA_TASK_2_ID"

mcp__attio__delete-record resource_type="deals" record_id="$QA_DEAL_1_ID"
mcp__attio__delete-record resource_type="deals" record_id="$QA_DEAL_2_ID"
```

#### Cleanup Features

- ✅ **Safe by Default**: Dry-run mode prevents accidental deletions
- ✅ **Comprehensive**: Covers all resource types (companies, people, tasks, lists, notes)
- ✅ **Efficient**: Parallel processing with rate limiting
- ✅ **Prefix-Based**: Uses test prefixes to avoid production data
- ✅ **Error Handling**: Retry logic with exponential backoff
- ✅ **Progress Tracking**: Detailed progress and summary reporting

#### Usage Guidelines

1. **Always run dry-run first**: `./cleanup-test-data.sh --dry-run`
2. **Use meaningful prefixes**: Ensure test data has consistent prefixes
3. **Monitor output**: Check for errors and confirmation of deletions
4. **Run after test completion**: Don't let test data accumulate in workspace

#### Integration with Test Execution

The cleanup utilities are integrated into the QA test plan execution workflow:

1. **Pre-Test Phase**: Run cleanup to ensure clean workspace
   ```bash
   # Clean existing test data before starting QA tests
   ./cleanup-test-data.sh --dry-run
   ./cleanup-test-data.sh --live
   ```

2. **During Test Execution**: Track test data creation for cleanup
   - All test data uses standardized prefixes (TEST_, QA_, E2E_)
   - Timestamp-based naming prevents conflicts on repeated runs
   - Test data manifest tracks created records for verification

3. **Post-Test Phase**: Comprehensive cleanup of all test data
   ```bash
   # Clean up all test data after QA test completion
   npm run cleanup:test-data:live
   
   # Or use shell wrapper with confirmation
   ./cleanup-test-data.sh --live
   ```

4. **CI/CD Integration**: Automated cleanup in continuous integration
   ```bash
   # Cleanup command in CI pipelines
   npm run cleanup:test-data:live --prefix=CI_,BUILD_
   ```

#### Cleanup Command Reference

| Command | Purpose | Safety Level |
|---------|---------|--------------|
| `npm run cleanup:test-data` | Dry-run preview | ✅ Safe (no deletions) |
| `npm run cleanup:test-data:live` | Live cleanup all types | ⚠️ Destructive |
| `./cleanup-test-data.sh --dry-run` | Shell wrapper preview | ✅ Safe (no deletions) |
| `./cleanup-test-data.sh --live` | Shell wrapper live cleanup | ⚠️ Destructive |
| `npm run cleanup:test-data:companies -- --live` | Companies only | ⚠️ Destructive |
| `npm run cleanup:test-data:people -- --live` | People only | ⚠️ Destructive |
| `npm run cleanup:test-data:tasks -- --live` | Tasks only | ⚠️ Destructive |

## Test Execution Tracking Matrix

### Priority 0 (P0) - Core Foundation Tests ⚡ [Must Complete: 5/5]

| Test ID | Tool Name | Test Cases | Dependencies | Time Est. | Status | Notes |
|---------|-----------|------------|--------------|-----------|--------|-------|
| TC-001 | search-records | 6 test cases (HP: 3, EC: 2, ER: 3) | Test data setup | 20 min | ⏳ PENDING | Core search functionality |
| TC-002 | get-record-details | 6 test cases (HP: 3, EC: 2, ER: 2) | TC-001 results | 15 min | ⏳ PENDING | Record retrieval |
| TC-003 | create-record | 9 test cases (HP: 3, EC: 3, ER: 3) | Test data setup | 25 min | ⏳ PENDING | Record creation |
| TC-004 | update-record | 9 test cases (HP: 3, EC: 3, ER: 3) | TC-003 results | 20 min | ⏳ PENDING | Record modification |
| TC-005 | delete-record | 6 test cases (HP: 3, EC: 2, ER: 3) | TC-003 results | 15 min | ⏳ PENDING | Record removal |

**P0 Quality Gate**: ALL 5 tools must PASS happy path tests. Zero critical failures allowed.

### Priority 1 (P1) - Essential Extensions Tests 🔧 [Target: 3/4]

| Test ID | Tool Name | Test Cases | Dependencies | Time Est. | Status | Notes |
|---------|-----------|------------|--------------|-----------|--------|-------|
| TC-006 | get-attributes | 6 test cases (HP: 3, EC: 2, ER: 2) | P0 completion | 15 min | 🚫 BLOCKED | Schema discovery |
| TC-007 | discover-attributes | 3 test cases (HP: 3, EC: 0, ER: 0) | P0 completion | 10 min | 🚫 BLOCKED | Attribute exploration |
| TC-008 | get-detailed-info | 6 test cases (HP: 3, EC: 2, ER: 2) | P0 completion | 20 min | 🚫 BLOCKED | Specific info types |
| TC-009 | advanced-search | 6 test cases (HP: 3, EC: 2, ER: 2) | P0 completion | 25 min | 🚫 BLOCKED | Complex filtering |

**P1 Quality Gate**: Minimum 3/4 tools must PASS (80% success rate). Consider production readiness.

### Priority 2 (P2) - Advanced Features Tests 🚀 [Target: 3/5]

| Test ID | Tool Name | Test Cases | Dependencies | Time Est. | Status | Notes |
|---------|-----------|------------|--------------|-----------|--------|-------|
| TC-010 | search-by-relationship | 6 test cases (HP: 3, EC: 2, ER: 2) | P0+P1 completion | 20 min | 🚫 BLOCKED | Relationship queries |
| TC-011 | search-by-content | 6 test cases (HP: 3, EC: 2, ER: 2) | P0+P1 completion | 20 min | 🚫 BLOCKED | Content-based search |
| TC-012 | search-by-timeframe | 6 test cases (HP: 3, EC: 2, ER: 2) | P0+P1 completion | 20 min | 🚫 BLOCKED | Time-based filtering |
| TC-013 | batch-operations | 9 test cases (HP: 3, EC: 3, ER: 3) | P0+P1 completion | 30 min | 🚫 BLOCKED | Bulk operations |
| TC-019 | batch-search | 9 test cases (HP: 3, EC: 3, ER: 3) | P0+P1 completion | 25 min | 🚫 BLOCKED | Multiple queries in parallel |

**P2 Quality Gate**: Minimum 3/5 tools must PASS (60% success rate). Nice-to-have features.

### Status Legend
- ✅ **PASSED**: All test cases completed successfully
- ⚠️ **PASSED WITH ISSUES**: Core functionality works but issues noted
- ❌ **FAILED**: Critical functionality broken
- ⏳ **PENDING**: Ready to execute
- 🚫 **BLOCKED**: Waiting for dependencies
- ⏸️ **SKIPPED**: Intentionally skipped due to time/priority

### Special Operations Tests

| Test ID | Tool Name | Resource Types | Priority | Dependencies | Status |
|---------|-----------|----------------|----------|--------------|--------|
| TC-014 | Lists Operations | Lists only | P0 | Test data setup | ⏳ PENDING |
| TC-015 | Notes CRUD Operations | All resource types | P0 | P0 completion | ⏳ PENDING |
| TC-016 | Advanced Universal Operations | All resource types | P1 | P0 completion | 🚫 BLOCKED |
| TC-017 | Tasks Resource Operations | Tasks only | P1 | P0 completion | 🚫 BLOCKED |
| TC-018 | Data Validation Checks | All resource types | P2 | P0+P1 completion | 🚫 BLOCKED |

## Quick Test Commands Reference

Use these copy-paste ready commands with your test data IDs:

### P0 Core Tests (Use with test data IDs from manifest)

```bash
# TC-001: Search Records
mcp__attio__search-records resource_type="companies" query="QA Test" limit=10
mcp__attio__search-records resource_type="people" query="QA" limit=5 offset=0
mcp__attio__search-records resource_type="tasks" filters='{"status":"open"}' limit=20

# TC-002: Get Record Details  
mcp__attio__get-record-details resource_type="companies" record_id="$QA_COMPANY_1_ID"
mcp__attio__get-record-details resource_type="people" record_id="$QA_PERSON_1_ID" fields='["name","email","title"]'

# TC-003: Create Records (Creates additional test data)
mcp__attio__create-record resource_type="companies" record_data='{"name":"QA Dynamic Company","domain":"qa-dynamic.test"}' return_details=true

# TC-004: Update Records (Use created record IDs)
mcp__attio__update-record resource_type="companies" record_id="$QA_COMPANY_1_ID" record_data='{"name":"QA Test Company Alpha Updated"}' return_details=true

# TC-005: Delete Records (Use dynamically created IDs from TC-003)
mcp__attio__delete-record resource_type="companies" record_id="$DYNAMIC_COMPANY_ID"
```

### P1 Essential Tests

```bash
# TC-006: Get Attributes
mcp__attio__get-attributes resource_type="companies"
mcp__attio__get-attributes resource_type="people" categories='["contact","business"]'

# TC-007: Discover Attributes  
mcp__attio__discover-attributes resource_type="companies"
mcp__attio__discover-attributes resource_type="deals"

# TC-008: Get Detailed Info
mcp__attio__get-detailed-info resource_type="companies" record_id="$QA_COMPANY_1_ID" info_type="business"
mcp__attio__get-detailed-info resource_type="people" record_id="$QA_PERSON_1_ID" info_type="contact"

# TC-009: Advanced Search
mcp__attio__advanced-search resource_type="companies" filters='{"industry":"Technology","employee_count":{"$gte":100}}' sort_by="created_at" sort_order="desc"
```

### P2 Advanced Tests

```bash
# TC-010: Search by Relationship
mcp__attio__search-by-relationship relationship_type="company_to_people" source_id="$QA_COMPANY_1_ID" limit=20

# TC-011: Search by Content
mcp__attio__search-by-content resource_type="companies" content_type="notes" search_query="quarterly" limit=10

# TC-012: Search by Timeframe  
mcp__attio__search-by-timeframe resource_type="companies" timeframe_type="created" start_date="2024-01-01" end_date="2024-12-31"

# TC-013: Batch Operations
mcp__attio__batch-operations resource_type="companies" operation_type="get" record_ids='["$QA_COMPANY_1_ID","$QA_COMPANY_2_ID"]'

# TC-019: Batch Search (Issue #471)
mcp__attio__batch-search resource_type="companies" queries='["technology","consulting","software"]' limit=10
mcp__attio__batch-search resource_type="people" queries='["manager","engineer","director"]' limit=5 offset=0
mcp__attio__batch-search resource_type="tasks" queries='["test","sample"]' limit=3
```

## Phase 1: Self-Testing Detailed Test Cases

### TC-001: Universal Search Tool (search-records)

#### TC-001-HP: Happy Path Tests

**Objective**: Validate basic search functionality across all resource types

```
Test Case: TC-001-HP-01 - Basic Company Search
Tool: mcp__attio__search-records
Parameters:
- resource_type: "companies"
- query: "technology"
- limit: 10

Expected Result:
- Returns up to 10 company records
- Each record contains basic company attributes
- Response includes pagination info if applicable
- HTTP 200 status equivalent

Test Case: TC-001-HP-02 - People Search with Pagination
Tool: mcp__attio__search-records
Parameters:
- resource_type: "people"
- query: "john"
- limit: 5
- offset: 10

Expected Result:
- Returns up to 5 people records starting from offset 10
- Proper pagination handling
- Records contain people-specific attributes

Test Case: TC-001-HP-03 - Task Search with Filters
Tool: mcp__attio__search-records
Parameters:
- resource_type: "tasks"
- filters: {"status": "open"}
- limit: 20

Expected Result:
- Returns tasks matching filter criteria
- All returned tasks have status "open"
- Response limited to 20 records
```

#### TC-001-EC: Edge Cases

```
Test Case: TC-001-EC-01 - Empty Query Search
Tool: mcp__attio__search-records
Parameters:
- resource_type: "companies"
- query: ""
- limit: 10

Expected Result:
- Returns general company listing or error message
- Handles empty query gracefully

Test Case: TC-001-EC-02 - Large Limit Value
Tool: mcp__attio__search-records
Parameters:
- resource_type: "people"
- query: "test"
- limit: 1000

Expected Result:
- Either processes large limit or returns appropriate error
- No system timeout or crash
- Reasonable response time (< 30 seconds)

Test Case: TC-001-EC-03 - Special Characters in Query
Tool: mcp__attio__search-records
Parameters:
- resource_type: "companies"
- query: "test@company.com & Co. (LLC)"

Expected Result:
- Handles special characters without syntax errors
- Returns relevant results or empty set
```

#### TC-001-ER: Error Conditions

```
Test Case: TC-001-ER-01 - Invalid Resource Type
Tool: mcp__attio__search-records
Parameters:
- resource_type: "invalid_type"
- query: "test"

Expected Result:
- Returns clear error message about invalid resource type
- Lists valid resource types in error message
- Does not crash or timeout

Test Case: TC-001-ER-02 - Negative Limit
Tool: mcp__attio__search-records
Parameters:
- resource_type: "companies"
- query: "test"
- limit: -5

Expected Result:
- Returns parameter validation error
- Clear error message about limit requirements
- No data corruption

Test Case: TC-001-ER-03 - Missing Required Parameters
Tool: mcp__attio__search-records
Parameters:
- query: "test"
(Missing resource_type)

Expected Result:
- Returns missing parameter error
- Specifies which parameter is required
- Provides usage guidance
```

### TC-002: Get Record Details (get-record-details)

#### TC-002-HP: Happy Path Tests

```
Test Case: TC-002-HP-01 - Get Company Details
Tool: mcp__attio__get-record-details
Parameters:
- resource_type: "companies"
- record_id: "[VALID_COMPANY_ID]"

Expected Result:
- Returns complete company record details
- All standard company fields populated
- Response time < 5 seconds

Test Case: TC-002-HP-02 - Get Person Details with Specific Fields
Tool: mcp__attio__get-record-details
Parameters:
- resource_type: "people"
- record_id: "[VALID_PERSON_ID]"
- fields: ["name", "email", "company"]

Expected Result:
- Returns person record with only requested fields
- Response excludes non-requested fields
- Maintains data accuracy

Test Case: TC-002-HP-03 - Get Task Details
Tool: mcp__attio__get-record-details
Parameters:
- resource_type: "tasks"
- record_id: "[VALID_TASK_ID]"

Expected Result:
- Returns complete task record
- Includes task-specific attributes
- Proper date/time formatting
```

#### TC-002-EC: Edge Cases

```
Test Case: TC-002-EC-01 - Very Long Field List
Tool: mcp__attio__get-record-details
Parameters:
- resource_type: "companies"
- record_id: "[VALID_COMPANY_ID]"
- fields: [50+ field names]

Expected Result:
- Handles large field list appropriately
- Returns requested fields or reasonable subset
- No performance degradation

Test Case: TC-002-EC-02 - Non-existent Field Names
Tool: mcp__attio__get-record-details
Parameters:
- resource_type: "people"
- record_id: "[VALID_PERSON_ID]"
- fields: ["nonexistent_field", "another_fake_field"]

Expected Result:
- Handles invalid field names gracefully
- Returns error or ignores invalid fields
- Provides guidance on valid field names
```

#### TC-002-ER: Error Conditions

```
Test Case: TC-002-ER-01 - Invalid Record ID
Tool: mcp__attio__get-record-details
Parameters:
- resource_type: "companies"
- record_id: "invalid_id_12345"

Expected Result:
- Returns "record not found" error
- Clear error message
- No system errors

Test Case: TC-002-ER-02 - Malformed Record ID
Tool: mcp__attio__get-record-details
Parameters:
- resource_type: "people"
- record_id: "!@#$%^&*()"

Expected Result:
- Returns parameter validation error
- Explains proper ID format
- No crashes or unexpected behavior
```

### TC-003: Create Record (create-record)

#### TC-003-HP: Happy Path Tests

```
Test Case: TC-003-HP-01 - Create Company Record
Tool: mcp__attio__create-record
Parameters:
- resource_type: "companies"
- record_data: {
    "name": "Test Company QA",
    "domain": "testcompanyqa.com",
    "industry": "Technology"
  }
- return_details: true

Expected Result:
- Creates new company record successfully
- Returns complete record details including generated ID
- All provided fields are saved correctly
- Response time < 10 seconds

Test Case: TC-003-HP-02 - Create Person Record
Tool: mcp__attio__create-record
Parameters:
- resource_type: "people"
- record_data: {
    "name": "Jane Doe QA",
    "email": "jane.doe.qa@testcompany.com",
    "title": "QA Engineer"
  }
- return_details: true

Expected Result:
- Creates new person record successfully
- Returns person details with ID
- Email validation passes
- Proper name formatting

Test Case: TC-003-HP-03 - Create Task Record
Tool: mcp__attio__create-record
Parameters:
- resource_type: "tasks"
- record_data: {
    "title": "QA Test Task",
    "description": "Test task for QA validation",
    "status": "open",
    "priority": "medium"
  }

Expected Result:
- Creates task successfully
- Status and priority set correctly
- Returns task ID and details
```

#### TC-003-EC: Edge Cases

```
Test Case: TC-003-EC-01 - Minimal Required Data
Tool: mcp__attio__create-record
Parameters:
- resource_type: "companies"
- record_data: {"name": "Minimal Company"}
- return_details: false

Expected Result:
- Creates record with minimal data
- Auto-populates required fields where possible
- Returns creation confirmation without full details

Test Case: TC-003-EC-02 - Maximum Data Payload
Tool: mcp__attio__create-record
Parameters:
- resource_type: "people"
- record_data: {[ALL_POSSIBLE_PERSON_FIELDS]}

Expected Result:
- Handles large data payload
- Creates record with all provided fields
- No data truncation or loss

Test Case: TC-003-EC-03 - Special Characters in Data
Tool: mcp__attio__create-record
Parameters:
- resource_type: "companies"
- record_data: {
    "name": "Test & Co. (LLC) - Français",
    "description": "Company with émojis 🏢 and symbols @#$%"
  }

Expected Result:
- Handles special characters and Unicode
- Preserves original formatting
- No encoding issues
```

#### TC-003-ER: Error Conditions

```
Test Case: TC-003-ER-01 - Missing Required Fields
Tool: mcp__attio__create-record
Parameters:
- resource_type: "companies"
- record_data: {"industry": "Technology"}
(Missing required "name" field)

Expected Result:
- Returns field validation error
- Specifies which required fields are missing
- Provides field requirements

Test Case: TC-003-ER-02 - Invalid Field Values
Tool: mcp__attio__create-record
Parameters:
- resource_type: "people"
- record_data: {
    "name": "Test Person",
    "email": "invalid-email-format"
  }

Expected Result:
- Returns validation error for email format
- Explains proper email format requirements
- Record creation fails gracefully

Test Case: TC-003-ER-03 - Duplicate Record Creation
Tool: mcp__attio__create-record
Parameters:
- resource_type: "companies"
- record_data: {
    "name": "Existing Company Name",
    "domain": "existing-domain.com"
  }

Expected Result:
- Handles duplicate detection appropriately
- Either prevents duplicate or returns warning
- Clear error message about conflict
```

### TC-004: Update Record (update-record)

#### TC-004-HP: Happy Path Tests

```
Test Case: TC-004-HP-01 - Update Company Record
Tool: mcp__attio__update-record
Parameters:
- resource_type: "companies"
- record_id: "[EXISTING_COMPANY_ID]"
- record_data: {
    "industry": "Updated Industry",
    "description": "Updated description"
  }
- return_details: true

Expected Result:
- Updates specified fields only
- Preserves unchanged fields
- Returns updated record details
- Proper timestamp updates

Test Case: TC-004-HP-02 - Partial Person Update
Tool: mcp__attio__update-record
Parameters:
- resource_type: "people"
- record_id: "[EXISTING_PERSON_ID]"
- record_data: {"title": "Senior QA Engineer"}

Expected Result:
- Updates only the title field
- Other person fields remain unchanged
- Returns confirmation of update

Test Case: TC-004-HP-03 - Task Status Update
Tool: mcp__attio__update-record
Parameters:
- resource_type: "tasks"
- record_id: "[EXISTING_TASK_ID]"
- record_data: {
    "status": "completed",
    "completion_date": "2024-01-15"
  }

Expected Result:
- Updates task status and completion date
- Maintains task history if applicable
- Proper date formatting validation
```

#### TC-004-EC: Edge Cases

```
Test Case: TC-004-EC-01 - Update with Same Values
Tool: mcp__attio__update-record
Parameters:
- resource_type: "companies"
- record_id: "[EXISTING_COMPANY_ID]"
- record_data: {[EXISTING_VALUES]}

Expected Result:
- Processes update without errors
- Handles duplicate values gracefully
- May skip update or confirm no changes

Test Case: TC-004-EC-02 - Update All Fields
Tool: mcp__attio__update-record
Parameters:
- resource_type: "people"
- record_id: "[EXISTING_PERSON_ID]"
- record_data: {[ALL_UPDATABLE_FIELDS]}

Expected Result:
- Updates all provided fields
- Maintains data integrity
- Proper field validation for each field

Test Case: TC-004-EC-03 - Clear Field Values
Tool: mcp__attio__update-record
Parameters:
- resource_type: "companies"
- record_id: "[EXISTING_COMPANY_ID]"
- record_data: {"description": null}

Expected Result:
- Handles null/empty values appropriately
- Either clears field or maintains existing value
- Clear behavior documentation
```

#### TC-004-ER: Error Conditions

```
Test Case: TC-004-ER-01 - Update Non-existent Record
Tool: mcp__attio__update-record
Parameters:
- resource_type: "companies"
- record_id: "non_existent_id"
- record_data: {"name": "Updated Name"}

Expected Result:
- Returns "record not found" error
- Clear error message
- No partial updates or corruption

Test Case: TC-004-ER-02 - Update with Invalid Data
Tool: mcp__attio__update-record
Parameters:
- resource_type: "people"
- record_id: "[EXISTING_PERSON_ID]"
- record_data: {"email": "invalid-email"}

Expected Result:
- Returns validation error
- Explains validation requirements
- Original record remains unchanged

Test Case: TC-004-ER-03 - Update Read-only Fields
Tool: mcp__attio__update-record
Parameters:
- resource_type: "companies"
- record_id: "[EXISTING_COMPANY_ID]"
- record_data: {
    "id": "new_id",
    "created_at": "2023-01-01"
  }

Expected Result:
- Returns error about read-only fields
- Lists which fields cannot be updated
- No unauthorized field modifications
```

### TC-005: Delete Record (delete-record)

#### TC-005-HP: Happy Path Tests

```
Test Case: TC-005-HP-01 - Delete Company Record
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "companies"
- record_id: "[TEST_COMPANY_ID]"

Expected Result:
- Deletes record successfully
- Returns deletion confirmation
- Record no longer retrievable via get-record-details
- Related data handling as per business rules

Test Case: TC-005-HP-02 - Delete Person Record
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "people"
- record_id: "[TEST_PERSON_ID]"

Expected Result:
- Removes person record
- Handles relationship cleanup appropriately
- Confirmation message returned

Test Case: TC-005-HP-03 - Delete Task Record
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "tasks"
- record_id: "[TEST_TASK_ID]"

Expected Result:
- Deletes task successfully
- Task no longer appears in searches
- Proper audit trail if applicable
```

#### TC-005-EC: Edge Cases

```
Test Case: TC-005-EC-01 - Delete Record with Dependencies
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "companies"
- record_id: "[COMPANY_WITH_PEOPLE]"

Expected Result:
- Handles dependent records appropriately
- Either cascades deletion or prevents deletion
- Clear messaging about dependencies

Test Case: TC-005-EC-02 - Delete Recently Created Record
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "tasks"
- record_id: "[JUST_CREATED_TASK_ID]"

Expected Result:
- Deletes newly created record without issues
- Handles rapid create/delete cycles
- No timing-related errors
```

#### TC-005-ER: Error Conditions

```
Test Case: TC-005-ER-01 - Delete Non-existent Record
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "companies"
- record_id: "non_existent_id"

Expected Result:
- Returns "record not found" error
- Clear error message
- Graceful handling without system errors

Test Case: TC-005-ER-02 - Delete with Invalid ID Format
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "people"
- record_id: "!@#$%^&*()"

Expected Result:
- Returns parameter validation error
- Explains proper ID format requirements
- No system corruption or crashes

Test Case: TC-005-ER-03 - Delete Protected Record
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "companies"
- record_id: "[PROTECTED_COMPANY_ID]"

Expected Result:
- Returns permission/protection error
- Explains why record cannot be deleted
- No unauthorized deletions
```

### TC-006: Get Attributes (get-attributes)

#### TC-006-HP: Happy Path Tests

```
Test Case: TC-006-HP-01 - Get Company Attributes
Tool: mcp__attio__get-attributes
Parameters:
- resource_type: "companies"

Expected Result:
- Returns comprehensive list of company attributes
- Includes attribute types and descriptions
- Organized by categories (basic, business, contact, etc.)

Test Case: TC-006-HP-02 - Get People Attributes by Category
Tool: mcp__attio__get-attributes
Parameters:
- resource_type: "people"
- categories: ["contact", "business"]

Expected Result:
- Returns only contact and business category attributes
- Proper category filtering
- Attributes relevant to people resource type

Test Case: TC-006-HP-03 - Get Specific Task Fields
Tool: mcp__attio__get-attributes
Parameters:
- resource_type: "tasks"
- fields: ["title", "status", "priority", "due_date"]

Expected Result:
- Returns details for specified fields only
- Field-specific metadata (type, required, validation rules)
- Task-appropriate field information
```

#### TC-006-EC: Edge Cases

```
Test Case: TC-006-EC-01 - Get All Categories
Tool: mcp__attio__get-attributes
Parameters:
- resource_type: "companies"
- categories: ["basic", "business", "contact", "social", "custom"]

Expected Result:
- Returns attributes from all categories
- Comprehensive attribute listing
- No missing categories

Test Case: TC-006-EC-02 - Get Attributes for Specific Record
Tool: mcp__attio__get-attributes
Parameters:
- resource_type: "people"
- record_id: "[SPECIFIC_PERSON_ID]"

Expected Result:
- Returns attributes schema for people
- May include record-specific customizations
- Maintains standard attribute structure
```

#### TC-006-ER: Error Conditions

```
Test Case: TC-006-ER-01 - Invalid Category Name
Tool: mcp__attio__get-attributes
Parameters:
- resource_type: "companies"
- categories: ["invalid_category"]

Expected Result:
- Returns error about invalid category
- Lists valid category names
- No system errors

Test Case: TC-006-ER-02 - Non-existent Field Names
Tool: mcp__attio__get-attributes
Parameters:
- resource_type: "tasks"
- fields: ["nonexistent_field", "fake_field"]

Expected Result:
- Returns error or empty result for invalid fields
- Lists available fields
- Clear error messaging
```

### TC-007: Discover Attributes (discover-attributes)

#### TC-007-HP: Happy Path Tests

```
Test Case: TC-007-HP-01 - Discover Company Schema
Tool: mcp__attio__discover-attributes
Parameters:
- resource_type: "companies"

Expected Result:
- Returns complete company schema
- All available attributes with types
- Field requirements and validation rules
- Organized structure

Test Case: TC-007-HP-02 - Discover People Schema
Tool: mcp__attio__discover-attributes
Parameters:
- resource_type: "people"

Expected Result:
- People-specific schema information
- Contact and relationship field details
- Proper field categorization

Test Case: TC-007-HP-03 - Discover All Resource Schemas
[Run for each resource type: companies, people, records, tasks, deals]

Expected Result:
- Each resource type returns unique schema
- Type-appropriate fields for each resource
- Consistent schema structure format
```

### TC-008: Get Detailed Info (get-detailed-info)

#### TC-008-HP: Happy Path Tests

```
Test Case: TC-008-HP-01 - Get Company Business Info
Tool: mcp__attio__get-detailed-info
Parameters:
- resource_type: "companies"
- record_id: "[COMPANY_ID]"
- info_type: "business"

Expected Result:
- Returns business-specific information
- Industry, size, revenue data if available
- Business-focused attributes only

Test Case: TC-008-HP-02 - Get Person Contact Info
Tool: mcp__attio__get-detailed-info
Parameters:
- resource_type: "people"
- record_id: "[PERSON_ID]"
- info_type: "contact"

Expected Result:
- Contact-specific details (email, phone, social)
- Communication preferences if available
- Contact method validation

Test Case: TC-008-HP-03 - Get Social Information
Tool: mcp__attio__get-detailed-info
Parameters:
- resource_type: "companies"
- record_id: "[COMPANY_ID]"
- info_type: "social"

Expected Result:
- Social media profiles and links
- Social engagement metrics if available
- Platform-specific information
```

### TC-009: Advanced Search (advanced-search)

#### TC-009-HP: Happy Path Tests

```
Test Case: TC-009-HP-01 - Company Search with Complex Filters
Tool: mcp__attio__advanced-search
Parameters:
- resource_type: "companies"
- filters: {
    "industry": "Technology",
    "employee_count": {"$gte": 100},
    "location": "San Francisco"
  }
- sort_by: "created_at"
- sort_order: "desc"
- limit: 25

Expected Result:
- Returns companies matching all filter criteria
- Proper sorting by creation date (newest first)
- Up to 25 results
- Complex filter logic works correctly

Test Case: TC-009-HP-02 - People Search with Relationship Filters
Tool: mcp__attio__advanced-search
Parameters:
- resource_type: "people"
- filters: {
    "title": {"$contains": "Engineer"},
    "company.industry": "Technology"
  }
- sort_by: "last_activity"
- limit: 50

Expected Result:
- Returns people with Engineer in title at Tech companies
- Relationship filtering works across linked records
- Sorted by most recent activity

Test Case: TC-009-HP-03 - Task Search with Date Ranges
Tool: mcp__attio__advanced-search
Parameters:
- resource_type: "tasks"
- filters: {
    "status": "open",
    "due_date": {
      "$gte": "2024-01-01",
      "$lte": "2024-12-31"
    }
  }
- sort_by: "due_date"
- sort_order: "asc"

Expected Result:
- Returns open tasks due within 2024
- Proper date range filtering
- Sorted by due date (earliest first)
```

### TC-010: Search by Relationship (search-by-relationship)

#### TC-010-HP: Happy Path Tests

```
Test Case: TC-010-HP-01 - Find People at Company
Tool: mcp__attio__search-by-relationship
Parameters:
- relationship_type: "company_to_people"
- source_id: "[COMPANY_ID]"
- limit: 20

Expected Result:
- Returns people associated with specified company
- Up to 20 people records
- Relationship data properly linked

Test Case: TC-010-HP-02 - Find Company for Person
Tool: mcp__attio__search-by-relationship
Parameters:
- relationship_type: "people_to_company"
- source_id: "[PERSON_ID]"

Expected Result:
- Returns company associated with person
- Company details properly retrieved
- Relationship mapping accurate

Test Case: TC-010-HP-03 - Find Tasks for Person
Tool: mcp__attio__search-by-relationship
Parameters:
- relationship_type: "person_to_tasks"
- source_id: "[PERSON_ID]"
- target_resource_type: "tasks"
- limit: 50

Expected Result:
- Returns tasks assigned to or created by person
- Task details with relationship context
- Proper task filtering
```

### TC-011: Search by Content (search-by-content)

#### TC-011-HP: Happy Path Tests

```
Test Case: TC-011-HP-01 - Search Notes Content
Tool: mcp__attio__search-by-content
Parameters:
- resource_type: "companies"
- content_type: "notes"
- search_query: "quarterly review"
- limit: 10

Expected Result:
- Returns companies with notes containing "quarterly review"
- Note content properly searched
- Relevant results with context

Test Case: TC-011-HP-02 - Search Activity Content
Tool: mcp__attio__search-by-content
Parameters:
- resource_type: "people"
- content_type: "activity"
- search_query: "meeting scheduled"
- limit: 15

Expected Result:
- Returns people with activity containing search terms
- Activity content properly indexed and searched
- Relevant activity context provided

Test Case: TC-011-HP-03 - Search Interactions
Tool: mcp__attio__search-by-content
Parameters:
- resource_type: "companies"
- content_type: "interactions"
- search_query: "phone call"
- limit: 25

Expected Result:
- Returns companies with interaction content matching search
- Interaction details properly searched
- Communication context provided
```

### TC-012: Search by Timeframe (search-by-timeframe)

#### TC-012-HP: Happy Path Tests

```
Test Case: TC-012-HP-01 - Recently Created Companies
Tool: mcp__attio__search-by-timeframe
Parameters:
- resource_type: "companies"
- timeframe_type: "created"
- start_date: "2024-01-01"
- end_date: "2024-01-31"
- limit: 30

Expected Result:
- Returns companies created in January 2024
- Proper date filtering
- Up to 30 results with creation dates

Test Case: TC-012-HP-02 - Recently Modified People
Tool: mcp__attio__search-by-timeframe
Parameters:
- resource_type: "people"
- timeframe_type: "modified"
- start_date: "2024-01-15"
- limit: 20

Expected Result:
- Returns people modified since January 15, 2024
- Modification date filtering works
- Recent changes properly tracked

Test Case: TC-012-HP-03 - Last Interaction Timeframe
Tool: mcp__attio__search-by-timeframe
Parameters:
- resource_type: "companies"
- timeframe_type: "last_interaction"
- start_date: "2024-01-01"
- end_date: "2024-01-31"

Expected Result:
- Returns companies with interactions in specified timeframe
- Interaction date filtering accurate
- Proper timeframe boundaries
```

### TC-013: Batch Operations (batch-operations)

#### TC-013-HP: Happy Path Tests

```
Test Case: TC-013-HP-01 - Batch Create Companies
Tool: mcp__attio__batch-operations
Parameters:
- resource_type: "companies"
- operation_type: "create"
- records: [
    {"name": "Batch Company 1", "industry": "Tech"},
    {"name": "Batch Company 2", "industry": "Finance"},
    {"name": "Batch Company 3", "industry": "Healthcare"}
  ]

Expected Result:
- Creates all 3 companies successfully
- Returns creation results for each record
- Proper batch processing
- Individual record IDs returned

Test Case: TC-013-HP-02 - Batch Update People
Tool: mcp__attio__batch-operations
Parameters:
- resource_type: "people"
- operation_type: "update"
- records: [
    {"id": "[PERSON_ID_1]", "title": "Updated Title 1"},
    {"id": "[PERSON_ID_2]", "title": "Updated Title 2"}
  ]

Expected Result:
- Updates both person records successfully
- Individual update confirmations
- Partial failure handling if applicable
- Batch operation efficiency

Test Case: TC-013-HP-03 - Batch Get Records
Tool: mcp__attio__batch-operations
Parameters:
- resource_type: "tasks"
- operation_type: "get"
- record_ids: ["[TASK_ID_1]", "[TASK_ID_2]", "[TASK_ID_3]"]

Expected Result:
- Retrieves all specified task records
- Individual record details returned
- Efficient batch retrieval
- Proper error handling for non-existent IDs
```

### TC-019: Batch Search (batch-search) - Issue #471

#### TC-019-HP: Happy Path Tests

```
Test Case: TC-019-HP-01 - Batch Company Search with Multiple Queries
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "companies"
- queries: ["technology", "consulting", "software"]
- limit: 10

Expected Result:
- Returns search results for all 3 queries
- Each query result contains query string and results array
- Individual query failures don't affect other queries
- Results maintain query order in response
- Performance >30% faster than sequential searches

Test Case: TC-019-HP-02 - Batch People Search with Pagination
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "people"
- queries: ["manager", "engineer", "director"]
- limit: 5
- offset: 0

Expected Result:
- Returns up to 5 people per query
- Proper pagination handling for each query
- Search results include people-specific attributes
- Batch processing completed within reasonable time (<10 seconds)

Test Case: TC-019-HP-03 - Mixed Resource Type Batch Searches
Tool: mcp__attio__batch-search
Parameters:
[Test with companies, people, tasks, records, deals individually]
- resource_type: [EACH_TYPE]
- queries: ["test", "sample", "demo"]
- limit: 3

Expected Result:
- All resource types handle batch search correctly
- Resource-specific field structures returned
- Consistent error handling across resource types
- Performance improvement validated for each type
```

#### TC-019-EC: Edge Cases

```
Test Case: TC-019-EC-01 - Large Batch Size
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "companies"
- queries: [Array of 50 search terms]
- limit: 2

Expected Result:
- Handles large query batch without errors
- Respects rate limiting with appropriate delays
- All queries processed within timeout limits (<60 seconds)
- No memory issues or performance degradation

Test Case: TC-019-EC-02 - Empty and Special Character Queries
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "people"
- queries: ["", "special-chars-!@#$%", "unicode-测试", "very-long-query-".repeat(20)]
- limit: 5

Expected Result:
- Handles empty queries gracefully
- Special characters processed without syntax errors
- Unicode queries handled correctly
- Long queries either processed or fail with clear errors

Test Case: TC-019-EC-03 - Single Query Batch
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "tasks"
- queries: ["single-query"]
- limit: 10

Expected Result:
- Single query processed correctly in batch format
- Result format consistent with multi-query batches
- No performance penalty for single query
- Returns proper batch search result structure
```

#### TC-019-ER: Error Conditions

```
Test Case: TC-019-ER-01 - Empty Queries Array
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "companies"
- queries: []
- limit: 10

Expected Result:
- Returns validation error about empty queries array
- Clear error message: "Queries array is required and must not be empty"
- No system errors or crashes

Test Case: TC-019-ER-02 - Invalid Resource Type
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "invalid_type"
- queries: ["test1", "test2"]

Expected Result:
- Returns resource type validation error
- Lists valid resource types in error message
- Batch processing stops gracefully

Test Case: TC-019-ER-03 - Partial Failure Scenarios
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "companies"
- queries: ["valid-query", "", "another-valid", "invalid-special-#@$%^&*()"]
- limit: 5

Expected Result:
- Valid queries return results successfully
- Invalid queries fail individually with specific errors
- Successful results not affected by failed queries
- Error isolation properly implemented
- Overall batch operation completes
```

#### TC-019-Performance: Performance Validation (Critical for Issue #471)

```
Test Case: TC-019-PERF-01 - Performance Improvement Validation
Tool: Performance comparison test
Method:
1. Execute 5 sequential search-records calls
2. Execute 1 batch-search call with same 5 queries
3. Compare execution times

Parameters:
- resource_type: "companies"
- queries: ["tech", "consulting", "software", "healthcare", "finance"]
- limit: 10

Expected Result:
- Batch search >30% faster than sequential searches
- Performance improvement documented in test results
- Consistent performance across multiple test runs
- No degradation in result quality

Test Case: TC-019-PERF-02 - Large Batch Performance
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "people"
- queries: [20 different search terms]
- limit: 5

Expected Result:
- Completes within 30 seconds
- Memory usage remains stable
- No timeout errors
- Performance scales reasonably with query count

Test Case: TC-019-PERF-03 - Concurrent User Simulation
Tool: Simulated concurrent batch searches
Method: Multiple batch-search calls with slight delays

Expected Result:
- System handles concurrent batch searches
- Individual batch performance not significantly degraded
- Rate limiting prevents system overload
- Error handling works under load
```

### TC-014: Lists Resource Type Operations

#### TC-014-HP-01: Get All Lists

```
Test Case: TC-014-HP-01 - Get All CRM Lists
Tool: get-lists
Parameters: (no parameters required)

Expected Result:
- Returns all available CRM lists
- List details include ID, name, type, and metadata
- Response time < 5 seconds
- Lists include sales pipelines, lead stages, customer segments
```

#### TC-014-HP-02: Get List Details

```
Test Case: TC-014-HP-02 - Get Specific List Details
Tool: get-list-details
Parameters:
- list_id: "[VALID_LIST_ID]"

Expected Result:
- Returns complete list information
- Includes list schema, entry counts, and configuration
- List attributes and field definitions provided
- Proper list metadata returned
```

#### TC-014-HP-03: Get List Entries

```
Test Case: TC-014-HP-03 - Get List Entries with Pagination
Tool: get-list-entries
Parameters:
- list_id: "[VALID_LIST_ID]"
- limit: 20
- offset: 0

Expected Result:
- Returns up to 20 list entries
- Each entry contains record data and list-specific attributes
- Pagination info included
- Entry relationships properly populated
```

#### TC-014-HP-04: Add Record to List

```
Test Case: TC-014-HP-04 - Add Company to List
Tool: add-record-to-list
Parameters:
- list_id: "[VALID_LIST_ID]"
- record_id: "[COMPANY_ID]"
- attributes: {"stage": "qualified", "priority": "high"}

Expected Result:
- Company successfully added to list
- List-specific attributes set correctly
- Confirmation of addition returned
- Record appears in subsequent list queries
```

#### TC-014-HP-05: Remove Record from List

```
Test Case: TC-014-HP-05 - Remove Record from List
Tool: remove-record-from-list
Parameters:
- list_id: "[VALID_LIST_ID]"
- record_id: "[RECORD_ID]"

Expected Result:
- Record successfully removed from list
- Confirmation of removal returned
- Record no longer appears in list queries
- List entry count updated
```

#### TC-014-HP-06: Filter List Entries

```
Test Case: TC-014-HP-06 - Filter List Entries by Attributes
Tool: filter-list-entries
Parameters:
- list_id: "[VALID_LIST_ID]"
- filter_conditions: {"stage": "qualified", "priority": {"$in": ["high", "medium"]}}
- limit: 50

Expected Result:
- Returns entries matching filter conditions
- Complex filter logic works correctly
- Results limited to 50 entries
- Filter performance acceptable
```

#### TC-014-HP-07: Update List Entry

```
Test Case: TC-014-HP-07 - Update List Entry Attributes
Tool: update-list-entry
Parameters:
- listId: "[VALID_LIST_ID]"
- entryId: "[ENTRY_ID]"
- attributes: {"stage": "closed_won", "close_date": "2024-01-15"}

Expected Result:
- Entry attributes updated successfully
- Changes reflected in subsequent queries
- Update timestamp recorded
- Proper validation of attribute values
```

#### TC-014-HP-08: Get Record List Memberships

```
Test Case: TC-014-HP-08 - Find All Lists Containing a Record
Tool: get-record-list-memberships
Parameters:
- recordId: "[VALID_COMPANY_ID]"
- objectType: "companies"
- includeEntryValues: true
- batchSize: 5

Expected Result:
- Returns all lists containing the specified record
- Each membership includes list name, ID, and entry ID
- Entry values included when requested
- Batch processing works correctly
```

#### TC-014-HP-09: Advanced Filter List Entries

```
Test Case: TC-014-HP-09 - Complex Multi-Condition List Filtering
Tool: advanced-filter-list-entries
Parameters:
- listId: "[VALID_LIST_ID]"
- filters: {
    "filters": [
      {"attribute": {"slug": "stage"}, "condition": "equals", "value": "qualified"},
      {"attribute": {"slug": "priority"}, "condition": "equals", "value": "high"}
    ],
    "matchAny": false
  }
- limit: 20

Expected Result:
- Returns entries matching all filter conditions
- Complex filter logic processes correctly
- Results properly limited
- Performance acceptable for advanced filtering
```

#### TC-014-HP-10: Filter List Entries by Parent

```
Test Case: TC-014-HP-10 - Filter Entries by Parent Record Attributes
Tool: filter-list-entries-by-parent
Parameters:
- listId: "[VALID_LIST_ID]"
- parentObjectType: "companies"
- parentAttributeSlug: "industry"
- condition: "equals"
- value: "Technology"
- limit: 10

Expected Result:
- Returns list entries where parent company industry equals Technology
- Parent attribute filtering works correctly
- Proper relationship traversal
- Results limited as specified
```

#### TC-014-HP-11: Filter List Entries by Parent ID

```
Test Case: TC-014-HP-11 - Filter Entries by Specific Parent Record
Tool: filter-list-entries-by-parent-id
Parameters:
- listId: "[VALID_LIST_ID]"
- recordId: "[VALID_COMPANY_ID]"
- limit: 5

Expected Result:
- Returns all list entries for the specified parent record
- Direct parent ID filtering works
- Efficient query execution
- Proper result limiting
```

### TC-015: Notes CRUD Operations

#### TC-015-HP-01: Create Company Note

```
Test Case: TC-015-HP-01 - Create Note for Company
Tool: create-company-note
Parameters:
- company_id: "[COMPANY_ID]"
- note_content: "Initial meeting notes - discussed project requirements and timeline"
- note_type: "meeting"

Expected Result:
- Note created successfully for company
- Returns note ID and creation timestamp
- Note associated with correct company
- Note content preserved exactly
```

#### TC-015-HP-02: Get Company Notes

```
Test Case: TC-015-HP-02 - Retrieve Company Notes
Tool: get-company-notes
Parameters:
- company_id: "[COMPANY_ID]"
- limit: 10
- offset: 0

Expected Result:
- Returns up to 10 notes for the company
- Notes sorted by creation date (newest first)
- Each note includes ID, content, type, timestamps
- Pagination info provided if applicable
```

#### TC-015-HP-03: Create Person Note

```
Test Case: TC-015-HP-03 - Create Note for Person
Tool: create-person-note
Parameters:
- person_id: "[PERSON_ID]"
- note_content: "Follow-up call scheduled for next week to discuss proposal"
- note_type: "follow_up"

Expected Result:
- Note created successfully for person
- Returns note ID and metadata
- Note linked to correct person record
- Note searchable via content search tools
```

#### TC-015-HP-04: Get Person Notes

```
Test Case: TC-015-HP-04 - Retrieve Person Notes with Filtering
Tool: get-person-notes
Parameters:
- person_id: "[PERSON_ID]"
- note_type: "meeting"
- limit: 5

Expected Result:
- Returns up to 5 meeting notes for person
- Filtered by note type correctly
- Notes include full content and metadata
- Proper chronological ordering
```

#### TC-015-HP-05: Update Note Content

```
Test Case: TC-015-HP-05 - Update Existing Note
Tool: update-note (if available)
Parameters:
- note_id: "[NOTE_ID]"
- note_content: "Updated: Meeting rescheduled to next Friday at 2 PM"

Expected Result:
- Note content updated successfully
- Update timestamp recorded
- Original creation date preserved
- Change history maintained if applicable
```

#### TC-015-HP-06: Create Deal Note

```
Test Case: TC-015-HP-06 - Create Note for Deal
Tool: create-deal-note
Parameters:
- dealId: "[DEAL_ID]"
- title: "Deal Progress Update"
- content: "Client meeting completed - discussed proposal details and next steps. Deal value confirmed at $75k, moving to final negotiation stage."

Expected Result:
- Note created successfully for deal
- Returns note ID and creation timestamp
- Note associated with correct deal record
- Note content preserved exactly
- Deal note appears in deal activity timeline
```

#### TC-015-HP-07: Get Deal Notes

```
Test Case: TC-015-HP-07 - Retrieve Deal Notes with Pagination
Tool: get-deal-notes
Parameters:
- dealId: "[DEAL_ID]"
- limit: 5
- offset: 0

Expected Result:
- Returns up to 5 notes for the deal
- Notes sorted by creation date (newest first)
- Each note includes title, content, timestamps
- Pagination info provided if applicable
- Notes display with 150-char content truncation for readability
```

#### TC-015-HP-08: Universal Note Operations for Deals

```
Test Case: TC-015-HP-08 - Universal Note CRUD for Deal Records
Tools: create-note, get-notes, update-note, search-notes, delete-note
Parameters (create-note):
- resource_type: "deals"
- parent_record_id: "[DEAL_ID]"
- title: "Universal Deal Note Test"
- content: "Testing universal note creation for deal records via universal tools"

Expected Result:
- Universal create-note works with deals resource type
- Universal get-notes retrieves deal notes correctly
- Universal update-note modifies deal note content
- Universal search-notes finds deal notes by content
- Universal delete-note removes deal notes properly
- All universal tools maintain consistency with specific deal note tools
```

### TC-016: Advanced Universal Operations

#### TC-016-HP-01: Advanced Search with Complex Filters

```
Test Case: TC-016-HP-01 - Multi-Condition Company Search
Tool: advanced-search
Parameters:
- resource_type: "companies"
- filters: {
    "industry": {"$in": ["Technology", "Finance"]},
    "employee_count": {"$gte": 50, "$lte": 500},
    "created_at": {"$gte": "2024-01-01"},
    "revenue": {"$gt": 1000000}
  }
- sort_by: "employee_count"
- sort_order: "desc"

Expected Result:
- Returns companies matching all filter conditions
- Complex multi-condition filtering works
- Results properly sorted by employee count
- Filter performance within acceptable limits
```

#### TC-016-HP-02: Relationship Search

```
Test Case: TC-016-HP-02 - Find All People at Technology Companies
Tool: search-by-relationship
Parameters:
- relationship_type: "company_to_people"
- source_filters: {"industry": "Technology"}
- target_resource_type: "people"
- limit: 100

Expected Result:
- Returns people working at technology companies
- Relationship filtering works correctly
- Results include both person and company context
- Up to 100 results returned efficiently
```

#### TC-016-HP-03: Timeframe Search

```
Test Case: TC-016-HP-03 - Recently Modified Records
Tool: search-by-timeframe
Parameters:
- resource_type: "companies"
- timeframe_type: "modified"
- start_date: "2024-01-01"
- end_date: "2024-01-31"
- limit: 50

Expected Result:
- Returns companies modified in January 2024
- Date filtering accurate to day precision
- Results include modification timestamps
- Performance acceptable for date range queries
```

### TC-017: Tasks Resource Type Operations

#### TC-017-HP-01: List Tasks with Filtering

```
Test Case: TC-017-HP-01 - List CRM Tasks with Status Filter
Tool: list-tasks
Parameters:
- status: "open"
- limit: 25
- sort_by: "due_date"

Expected Result:
- Returns up to 25 open tasks
- Tasks sorted by due date (earliest first)
- Each task includes title, status, priority, assignee
- Due date formatting consistent
```

#### TC-017-HP-02: Create New Task

```
Test Case: TC-017-HP-02 - Create Task with Full Details
Tool: create-task
Parameters:
- title: "Follow up on proposal with Acme Corp"
- description: "Schedule call to discuss Q1 implementation timeline"
- status: "open"
- priority: "high"
- due_date: "2024-02-15"
- assignee_id: "[USER_ID]"

Expected Result:
- Task created successfully with all details
- Returns task ID and creation timestamp
- Task appears in subsequent list-tasks queries
- All fields properly validated and stored
```

#### TC-017-HP-03: Update Existing Task

```
Test Case: TC-017-HP-03 - Update Task Status and Priority
Tool: update-task
Parameters:
- task_id: "[TASK_ID]"
- status: "in_progress"
- priority: "medium"
- notes: "Started initial research, waiting for client feedback"

Expected Result:
- Task updated successfully with new values
- Status change recorded with timestamp
- Original creation data preserved
- Update reflected in list queries immediately
```

#### TC-017-HP-04: Delete Completed Task

```
Test Case: TC-017-HP-04 - Delete Completed Task
Tool: delete-task
Parameters:
- task_id: "[COMPLETED_TASK_ID]"

Expected Result:
- Task successfully deleted from system
- Task no longer appears in any queries
- Related associations properly cleaned up
- Confirmation message returned
```

#### TC-017-HP-05: Link Task to Records

```
Test Case: TC-017-HP-05 - Associate Task with Company and Person
Tool: link-record-to-task
Parameters:
- task_id: "[TASK_ID]"
- linked_records: [
    {"type": "company", "id": "[COMPANY_ID]"},
    {"type": "person", "id": "[PERSON_ID]"}
  ]

Expected Result:
- Task successfully linked to both company and person
- Relationships created in both directions
- Task context includes linked record information
- Links appear in record relationship queries
```

#### TC-017-HP-06: Task Priority and Due Date Management

```
Test Case: TC-017-HP-06 - Complex Task Filtering and Sorting
Tool: list-tasks
Parameters:
- priority: {"$in": ["high", "critical"]}
- due_date: {"$lte": "2024-02-01"}
- status: {"$ne": "completed"}
- sort_by: "priority"
- sort_order: "desc"
- limit: 50

Expected Result:
- Returns high/critical priority tasks due by Feb 1
- Excludes completed tasks
- Results sorted by priority (critical first)
- Complex filtering logic works correctly
- Performance acceptable for filtered queries
```

### TC-018: Specialized Functionality and Data Validation

#### TC-018-HP-01: Attribute Discovery and Schema Validation

```
Test Case: TC-018-HP-01 - Discover Company Attributes Schema
Tool: discover-attributes
Parameters:
- resource_type: "companies"

Expected Result:
- Returns complete attribute schema for companies
- Includes data types, validation rules, and constraints
- Required vs optional fields clearly marked
- Custom field definitions included
- Schema format consistent and parseable
```

#### TC-018-HP-02: Data Type Validation - Email and Domain

```
Test Case: TC-018-HP-02 - Email and Domain Validation
Tool: create-record
Parameters:
- resource_type: "people"
- record_data: {
    "name": "Test Person",
    "email": "test@validcompany.com",
    "company_domain": "validcompany.com"
  }

Expected Result:
- Email format validated successfully
- Domain extraction and validation works
- Email domain consistency checks pass
- Invalid email formats rejected with clear messages
```

#### TC-018-HP-03: Data Type Validation - Phone Numbers

```
Test Case: TC-018-HP-03 - Phone Number Formatting and Validation
Tool: create-record
Parameters:
- resource_type: "people"
- record_data: {
    "name": "Test Person",
    "phone": "+1-555-123-4567",
    "mobile": "(555) 987-6543"
  }

Expected Result:
- Phone numbers formatted consistently
- International formats recognized
- Various phone number formats normalized
- Invalid phone numbers rejected appropriately
```

#### TC-018-HP-04: Data Type Validation - Boolean and Categories

```
Test Case: TC-018-HP-04 - Boolean and Industry Category Validation
Tool: create-record
Parameters:
- resource_type: "companies"
- record_data: {
    "name": "Test Company",
    "is_customer": true,
    "is_active": false,
    "industry": "Technology"
  }

Expected Result:
- Boolean values stored correctly (true/false)
- Industry categories validated against predefined list
- Invalid industry categories rejected
- Boolean field queries work correctly
```

#### TC-018-HP-05: Data Type Validation - Currency and Numbers

```
Test Case: TC-018-HP-05 - Currency and Numeric Field Validation
Tool: create-record
Parameters:
- resource_type: "deals"
- record_data: {
    "name": "Test Deal",
    "value": 250000.50,
    "currency": "USD",
    "probability": 75
  }

Expected Result:
- Currency values handled with proper precision
- Currency codes validated (USD, EUR, etc.)
- Numeric values within acceptable ranges
- Percentage fields validated (0-100)
```

#### TC-018-HP-06: Date and Timezone Handling

```
Test Case: TC-018-HP-06 - Date Fields with Timezone Support
Tool: create-record
Parameters:
- resource_type: "tasks"
- record_data: {
    "title": "Test Task",
    "due_date": "2024-02-15T14:30:00Z",
    "created_at": "2024-01-15T09:00:00-08:00"
  }

Expected Result:
- Date/time fields parsed correctly
- Timezone information preserved
- Date formats standardized in responses
- Date range queries work across timezones
```

#### TC-018-HP-07: Configuration System Validation

```
Test Case: TC-018-HP-07 - Deal Defaults and Configuration
Tool: advanced-search
Parameters:
- resource_type: "deals"
- filters: {"stage": "default"}

Expected Result:
- Default deal stages applied correctly
- Configuration-based defaults work
- Custom deal pipeline configurations respected
- Environment-based settings applied properly
```

#### TC-018-HP-08: Postal Code and Address Validation

```
Test Case: TC-018-HP-08 - Address and Postal Code Validation
Tool: create-record
Parameters:
- resource_type: "companies"
- record_data: {
    "name": "Test Company",
    "postal_code": "90210",
    "country": "US",
    "address": "123 Main St, Beverly Hills, CA"
  }

Expected Result:
- Postal codes validated by country
- Address formatting consistent
- Country-specific validation rules applied
- Invalid postal codes rejected with helpful messages
```

## Phase 2: Sub-Agent Testing (Usability Validation)

### Purpose

Phase 2 testing is designed to identify usability issues, unclear parameter requirements, and documentation gaps that would affect users unfamiliar with the system.

### Test Execution Guidelines for Sub-Agent

#### Pre-Testing Setup

1. **Agent Preparation**: Use an agent with no prior knowledge of Attio MCP Server
2. **Documentation Only**: Provide only the tool schema documentation, not implementation details
3. **Record Everything**: Document all confusion points, unclear parameters, and assumptions made

#### Focus Areas for Phase 2

1. **Parameter Clarity**: Are parameter names and descriptions clear?
2. **Required vs Optional**: Is it obvious which parameters are required?
3. **Value Examples**: Are example values provided where helpful?
4. **Error Messages**: Are error messages clear and actionable?
5. **Success Validation**: Is it clear when operations succeed?

#### Phase 2 Test Cases
||||||| Stash base
## People Records
- Alice QA Tester: ID = [FILL_IN_ID]
- Bob QA Validator: ID = [FILL_IN_ID]
- Carol QA Analyst: ID = [FILL_IN_ID]

## Task Records
- QA Test Task Alpha: ID = [FILL_IN_ID]
- QA Test Task Beta: ID = [FILL_IN_ID]

## Deal Records  
- QA Test Deal Alpha: ID = [FILL_IN_ID]
- QA Test Deal Beta: ID = [FILL_IN_ID]

## Test Data Status
- Created Date: [YYYY-MM-DD HH:MM]
- Creator: [Name/Agent]
- Environment: [Test Environment]
- Status: [ACTIVE/ARCHIVED/CLEANUP_PENDING]
```

### Test Data Cleanup Protocol

**CRITICAL**: Always clean up test data after completion to prevent Attio workspace pollution.

#### Option 1: Automated Cleanup (Recommended)

Use the comprehensive cleanup utility for efficient batch cleanup:

```bash
# 🚀 RECOMMENDED: Use automated cleanup utility
# Preview what would be deleted (safe dry-run)
./cleanup-test-data.sh --dry-run

# Perform actual cleanup of all test data
./cleanup-test-data.sh --live

# Alternative: Use npm scripts
npm run cleanup:test-data:dry    # Preview only
npm run cleanup:test-data:live   # Live deletion

# Clean specific resource types only
npm run cleanup:test-data:companies -- --live
npm run cleanup:test-data:people -- --live
npm run cleanup:test-data:tasks -- --live
npm run cleanup:test-data:lists -- --live

# Custom prefixes (default: TEST_, QA_, E2E_)
./cleanup-test-data.sh --prefix=DEMO_,TEMP_ --live

# Parallel processing for faster cleanup
./cleanup-test-data.sh --parallel=10 --live
```

#### Option 2: Manual Cleanup (Legacy)

For individual record cleanup when IDs are known:

```bash
# Manual deletion of specific test records
mcp__attio__delete-record resource_type="companies" record_id="$QA_COMPANY_1_ID"
mcp__attio__delete-record resource_type="companies" record_id="$QA_COMPANY_2_ID" 
mcp__attio__delete-record resource_type="companies" record_id="$QA_COMPANY_3_ID"

mcp__attio__delete-record resource_type="people" record_id="$QA_PERSON_1_ID"
mcp__attio__delete-record resource_type="people" record_id="$QA_PERSON_2_ID"
mcp__attio__delete-record resource_type="people" record_id="$QA_PERSON_3_ID"

mcp__attio__delete-record resource_type="tasks" record_id="$QA_TASK_1_ID"
mcp__attio__delete-record resource_type="tasks" record_id="$QA_TASK_2_ID"

mcp__attio__delete-record resource_type="deals" record_id="$QA_DEAL_1_ID"
mcp__attio__delete-record resource_type="deals" record_id="$QA_DEAL_2_ID"
```

#### Cleanup Features

- ✅ **Safe by Default**: Dry-run mode prevents accidental deletions
- ✅ **Comprehensive**: Covers all resource types (companies, people, tasks, lists, notes)
- ✅ **Efficient**: Parallel processing with rate limiting
- ✅ **Prefix-Based**: Uses test prefixes to avoid production data
- ✅ **Error Handling**: Retry logic with exponential backoff
- ✅ **Progress Tracking**: Detailed progress and summary reporting

#### Usage Guidelines

1. **Always run dry-run first**: `./cleanup-test-data.sh --dry-run`
2. **Use meaningful prefixes**: Ensure test data has consistent prefixes
3. **Monitor output**: Check for errors and confirmation of deletions
4. **Run after test completion**: Don't let test data accumulate in workspace

#### Integration with Test Execution

The cleanup utilities are integrated into the QA test plan execution workflow:

1. **Pre-Test Phase**: Run cleanup to ensure clean workspace
   ```bash
   # Clean existing test data before starting QA tests
   ./cleanup-test-data.sh --dry-run
   ./cleanup-test-data.sh --live
   ```

2. **During Test Execution**: Track test data creation for cleanup
   - All test data uses standardized prefixes (TEST_, QA_, E2E_)
   - Timestamp-based naming prevents conflicts on repeated runs
   - Test data manifest tracks created records for verification

3. **Post-Test Phase**: Comprehensive cleanup of all test data
   ```bash
   # Clean up all test data after QA test completion
   npm run cleanup:test-data:live
   
   # Or use shell wrapper with confirmation
   ./cleanup-test-data.sh --live
   ```

4. **CI/CD Integration**: Automated cleanup in continuous integration
   ```bash
   # Cleanup command in CI pipelines
   npm run cleanup:test-data:live --prefix=CI_,BUILD_
   ```

#### Cleanup Command Reference

| Command | Purpose | Safety Level |
|---------|---------|--------------|
| `npm run cleanup:test-data` | Dry-run preview | ✅ Safe (no deletions) |
| `npm run cleanup:test-data:live` | Live cleanup all types | ⚠️ Destructive |
| `./cleanup-test-data.sh --dry-run` | Shell wrapper preview | ✅ Safe (no deletions) |
| `./cleanup-test-data.sh --live` | Shell wrapper live cleanup | ⚠️ Destructive |
| `npm run cleanup:test-data:companies -- --live` | Companies only | ⚠️ Destructive |
| `npm run cleanup:test-data:people -- --live` | People only | ⚠️ Destructive |
| `npm run cleanup:test-data:tasks -- --live` | Tasks only | ⚠️ Destructive |

## Test Execution Tracking Matrix

### Priority 0 (P0) - Core Foundation Tests ⚡ [Must Complete: 5/5]

| Test ID | Tool Name | Test Cases | Dependencies | Time Est. | Status | Notes |
|---------|-----------|------------|--------------|-----------|--------|-------|
| TC-001 | search-records | 6 test cases (HP: 3, EC: 2, ER: 3) | Test data setup | 20 min | ⏳ PENDING | Core search functionality |
| TC-002 | get-record-details | 6 test cases (HP: 3, EC: 2, ER: 2) | TC-001 results | 15 min | ⏳ PENDING | Record retrieval |
| TC-003 | create-record | 9 test cases (HP: 3, EC: 3, ER: 3) | Test data setup | 25 min | ⏳ PENDING | Record creation |
| TC-004 | update-record | 9 test cases (HP: 3, EC: 3, ER: 3) | TC-003 results | 20 min | ⏳ PENDING | Record modification |
| TC-005 | delete-record | 6 test cases (HP: 3, EC: 2, ER: 3) | TC-003 results | 15 min | ⏳ PENDING | Record removal |

**P0 Quality Gate**: ALL 5 tools must PASS happy path tests. Zero critical failures allowed.

### Priority 1 (P1) - Essential Extensions Tests 🔧 [Target: 3/4]

| Test ID | Tool Name | Test Cases | Dependencies | Time Est. | Status | Notes |
|---------|-----------|------------|--------------|-----------|--------|-------|
| TC-006 | get-attributes | 6 test cases (HP: 3, EC: 2, ER: 2) | P0 completion | 15 min | 🚫 BLOCKED | Schema discovery |
| TC-007 | discover-attributes | 3 test cases (HP: 3, EC: 0, ER: 0) | P0 completion | 10 min | 🚫 BLOCKED | Attribute exploration |
| TC-008 | get-detailed-info | 6 test cases (HP: 3, EC: 2, ER: 2) | P0 completion | 20 min | 🚫 BLOCKED | Specific info types |
| TC-009 | advanced-search | 6 test cases (HP: 3, EC: 2, ER: 2) | P0 completion | 25 min | 🚫 BLOCKED | Complex filtering |

**P1 Quality Gate**: Minimum 3/4 tools must PASS (80% success rate). Consider production readiness.

### Priority 2 (P2) - Advanced Features Tests 🚀 [Target: 3/5]

| Test ID | Tool Name | Test Cases | Dependencies | Time Est. | Status | Notes |
|---------|-----------|------------|--------------|-----------|--------|-------|
| TC-010 | search-by-relationship | 6 test cases (HP: 3, EC: 2, ER: 2) | P0+P1 completion | 20 min | 🚫 BLOCKED | Relationship queries |
| TC-011 | search-by-content | 6 test cases (HP: 3, EC: 2, ER: 2) | P0+P1 completion | 20 min | 🚫 BLOCKED | Content-based search |
| TC-012 | search-by-timeframe | 6 test cases (HP: 3, EC: 2, ER: 2) | P0+P1 completion | 20 min | 🚫 BLOCKED | Time-based filtering |
| TC-013 | batch-operations | 9 test cases (HP: 3, EC: 3, ER: 3) | P0+P1 completion | 30 min | 🚫 BLOCKED | Bulk operations |
| TC-019 | batch-search | 9 test cases (HP: 3, EC: 3, ER: 3) | P0+P1 completion | 25 min | 🚫 BLOCKED | Multiple queries in parallel |

**P2 Quality Gate**: Minimum 3/5 tools must PASS (60% success rate). Nice-to-have features.

### Status Legend
- ✅ **PASSED**: All test cases completed successfully
- ⚠️ **PASSED WITH ISSUES**: Core functionality works but issues noted
- ❌ **FAILED**: Critical functionality broken
- ⏳ **PENDING**: Ready to execute
- 🚫 **BLOCKED**: Waiting for dependencies
- ⏸️ **SKIPPED**: Intentionally skipped due to time/priority

### Special Operations Tests

| Test ID | Tool Name | Resource Types | Priority | Dependencies | Status |
|---------|-----------|----------------|----------|--------------|--------|
| TC-014 | Lists Operations | Lists only | P0 | Test data setup | ⏳ PENDING |
| TC-015 | Notes CRUD Operations | All resource types | P0 | P0 completion | 🚫 BLOCKED |
| TC-016 | Advanced Universal Operations | All resource types | P1 | P0 completion | 🚫 BLOCKED |
| TC-017 | Tasks Resource Operations | Tasks only | P1 | P0 completion | 🚫 BLOCKED |
| TC-018 | Data Validation Checks | All resource types | P2 | P0+P1 completion | 🚫 BLOCKED |

## Quick Test Commands Reference

Use these copy-paste ready commands with your test data IDs:

### P0 Core Tests (Use with test data IDs from manifest)

```bash
# TC-001: Search Records
mcp__attio__search-records resource_type="companies" query="QA Test" limit=10
mcp__attio__search-records resource_type="people" query="QA" limit=5 offset=0
mcp__attio__search-records resource_type="tasks" filters='{"status":"open"}' limit=20

# TC-002: Get Record Details  
mcp__attio__get-record-details resource_type="companies" record_id="$QA_COMPANY_1_ID"
mcp__attio__get-record-details resource_type="people" record_id="$QA_PERSON_1_ID" fields='["name","email","title"]'

# TC-003: Create Records (Creates additional test data)
mcp__attio__create-record resource_type="companies" record_data='{"name":"QA Dynamic Company","domain":"qa-dynamic.test"}' return_details=true

# TC-004: Update Records (Use created record IDs)
mcp__attio__update-record resource_type="companies" record_id="$QA_COMPANY_1_ID" record_data='{"name":"QA Test Company Alpha Updated"}' return_details=true

# TC-005: Delete Records (Use dynamically created IDs from TC-003)
mcp__attio__delete-record resource_type="companies" record_id="$DYNAMIC_COMPANY_ID"
```

### P1 Essential Tests

```bash
# TC-006: Get Attributes
mcp__attio__get-attributes resource_type="companies"
mcp__attio__get-attributes resource_type="people" categories='["contact","business"]'

# TC-007: Discover Attributes  
mcp__attio__discover-attributes resource_type="companies"
mcp__attio__discover-attributes resource_type="deals"

# TC-008: Get Detailed Info
mcp__attio__get-detailed-info resource_type="companies" record_id="$QA_COMPANY_1_ID" info_type="business"
mcp__attio__get-detailed-info resource_type="people" record_id="$QA_PERSON_1_ID" info_type="contact"

# TC-009: Advanced Search
mcp__attio__advanced-search resource_type="companies" filters='{"industry":"Technology","employee_count":{"$gte":100}}' sort_by="created_at" sort_order="desc"
```

### P2 Advanced Tests

```bash
# TC-010: Search by Relationship
mcp__attio__search-by-relationship relationship_type="company_to_people" source_id="$QA_COMPANY_1_ID" limit=20

# TC-011: Search by Content
mcp__attio__search-by-content resource_type="companies" content_type="notes" search_query="quarterly" limit=10

# TC-012: Search by Timeframe  
mcp__attio__search-by-timeframe resource_type="companies" timeframe_type="created" start_date="2024-01-01" end_date="2024-12-31"

# TC-013: Batch Operations
mcp__attio__batch-operations resource_type="companies" operation_type="get" record_ids='["$QA_COMPANY_1_ID","$QA_COMPANY_2_ID"]'

# TC-019: Batch Search (Issue #471)
mcp__attio__batch-search resource_type="companies" queries='["technology","consulting","software"]' limit=10
mcp__attio__batch-search resource_type="people" queries='["manager","engineer","director"]' limit=5 offset=0
mcp__attio__batch-search resource_type="tasks" queries='["test","sample"]' limit=3
```

## Phase 1: Self-Testing Detailed Test Cases

### TC-001: Universal Search Tool (search-records)

#### TC-001-HP: Happy Path Tests

**Objective**: Validate basic search functionality across all resource types

```
Test Case: TC-001-HP-01 - Basic Company Search
Tool: mcp__attio__search-records
Parameters:
- resource_type: "companies"
- query: "technology"
- limit: 10

Expected Result:
- Returns up to 10 company records
- Each record contains basic company attributes
- Response includes pagination info if applicable
- HTTP 200 status equivalent

Test Case: TC-001-HP-02 - People Search with Pagination
Tool: mcp__attio__search-records
Parameters:
- resource_type: "people"
- query: "john"
- limit: 5
- offset: 10

Expected Result:
- Returns up to 5 people records starting from offset 10
- Proper pagination handling
- Records contain people-specific attributes

Test Case: TC-001-HP-03 - Task Search with Filters
Tool: mcp__attio__search-records
Parameters:
- resource_type: "tasks"
- filters: {"status": "open"}
- limit: 20

Expected Result:
- Returns tasks matching filter criteria
- All returned tasks have status "open"
- Response limited to 20 records
```

#### TC-001-EC: Edge Cases

```
Test Case: TC-001-EC-01 - Empty Query Search
Tool: mcp__attio__search-records
Parameters:
- resource_type: "companies"
- query: ""
- limit: 10

Expected Result:
- Returns general company listing or error message
- Handles empty query gracefully

Test Case: TC-001-EC-02 - Large Limit Value
Tool: mcp__attio__search-records
Parameters:
- resource_type: "people"
- query: "test"
- limit: 1000

Expected Result:
- Either processes large limit or returns appropriate error
- No system timeout or crash
- Reasonable response time (< 30 seconds)

Test Case: TC-001-EC-03 - Special Characters in Query
Tool: mcp__attio__search-records
Parameters:
- resource_type: "companies"
- query: "test@company.com & Co. (LLC)"

Expected Result:
- Handles special characters without syntax errors
- Returns relevant results or empty set
```

#### TC-001-ER: Error Conditions

```
Test Case: TC-001-ER-01 - Invalid Resource Type
Tool: mcp__attio__search-records
Parameters:
- resource_type: "invalid_type"
- query: "test"

Expected Result:
- Returns clear error message about invalid resource type
- Lists valid resource types in error message
- Does not crash or timeout

Test Case: TC-001-ER-02 - Negative Limit
Tool: mcp__attio__search-records
Parameters:
- resource_type: "companies"
- query: "test"
- limit: -5

Expected Result:
- Returns parameter validation error
- Clear error message about limit requirements
- No data corruption

Test Case: TC-001-ER-03 - Missing Required Parameters
Tool: mcp__attio__search-records
Parameters:
- query: "test"
(Missing resource_type)

Expected Result:
- Returns missing parameter error
- Specifies which parameter is required
- Provides usage guidance
```

### TC-002: Get Record Details (get-record-details)

#### TC-002-HP: Happy Path Tests

```
Test Case: TC-002-HP-01 - Get Company Details
Tool: mcp__attio__get-record-details
Parameters:
- resource_type: "companies"
- record_id: "[VALID_COMPANY_ID]"

Expected Result:
- Returns complete company record details
- All standard company fields populated
- Response time < 5 seconds

Test Case: TC-002-HP-02 - Get Person Details with Specific Fields
Tool: mcp__attio__get-record-details
Parameters:
- resource_type: "people"
- record_id: "[VALID_PERSON_ID]"
- fields: ["name", "email", "company"]

Expected Result:
- Returns person record with only requested fields
- Response excludes non-requested fields
- Maintains data accuracy

Test Case: TC-002-HP-03 - Get Task Details
Tool: mcp__attio__get-record-details
Parameters:
- resource_type: "tasks"
- record_id: "[VALID_TASK_ID]"

Expected Result:
- Returns complete task record
- Includes task-specific attributes
- Proper date/time formatting
```

#### TC-002-EC: Edge Cases

```
Test Case: TC-002-EC-01 - Very Long Field List
Tool: mcp__attio__get-record-details
Parameters:
- resource_type: "companies"
- record_id: "[VALID_COMPANY_ID]"
- fields: [50+ field names]

Expected Result:
- Handles large field list appropriately
- Returns requested fields or reasonable subset
- No performance degradation

Test Case: TC-002-EC-02 - Non-existent Field Names
Tool: mcp__attio__get-record-details
Parameters:
- resource_type: "people"
- record_id: "[VALID_PERSON_ID]"
- fields: ["nonexistent_field", "another_fake_field"]

Expected Result:
- Handles invalid field names gracefully
- Returns error or ignores invalid fields
- Provides guidance on valid field names
```

#### TC-002-ER: Error Conditions

```
Test Case: TC-002-ER-01 - Invalid Record ID
Tool: mcp__attio__get-record-details
Parameters:
- resource_type: "companies"
- record_id: "invalid_id_12345"

Expected Result:
- Returns "record not found" error
- Clear error message
- No system errors

Test Case: TC-002-ER-02 - Malformed Record ID
Tool: mcp__attio__get-record-details
Parameters:
- resource_type: "people"
- record_id: "!@#$%^&*()"

Expected Result:
- Returns parameter validation error
- Explains proper ID format
- No crashes or unexpected behavior
```

### TC-003: Create Record (create-record)

#### TC-003-HP: Happy Path Tests

```
Test Case: TC-003-HP-01 - Create Company Record
Tool: mcp__attio__create-record
Parameters:
- resource_type: "companies"
- record_data: {
    "name": "Test Company QA",
    "domain": "testcompanyqa.com",
    "industry": "Technology"
  }
- return_details: true

Expected Result:
- Creates new company record successfully
- Returns complete record details including generated ID
- All provided fields are saved correctly
- Response time < 10 seconds

Test Case: TC-003-HP-02 - Create Person Record
Tool: mcp__attio__create-record
Parameters:
- resource_type: "people"
- record_data: {
    "name": "Jane Doe QA",
    "email": "jane.doe.qa@testcompany.com",
    "title": "QA Engineer"
  }
- return_details: true

Expected Result:
- Creates new person record successfully
- Returns person details with ID
- Email validation passes
- Proper name formatting

Test Case: TC-003-HP-03 - Create Task Record
Tool: mcp__attio__create-record
Parameters:
- resource_type: "tasks"
- record_data: {
    "title": "QA Test Task",
    "description": "Test task for QA validation",
    "status": "open",
    "priority": "medium"
  }

Expected Result:
- Creates task successfully
- Status and priority set correctly
- Returns task ID and details
```

#### TC-003-EC: Edge Cases

```
Test Case: TC-003-EC-01 - Minimal Required Data
Tool: mcp__attio__create-record
Parameters:
- resource_type: "companies"
- record_data: {"name": "Minimal Company"}
- return_details: false

Expected Result:
- Creates record with minimal data
- Auto-populates required fields where possible
- Returns creation confirmation without full details

Test Case: TC-003-EC-02 - Maximum Data Payload
Tool: mcp__attio__create-record
Parameters:
- resource_type: "people"
- record_data: {[ALL_POSSIBLE_PERSON_FIELDS]}

Expected Result:
- Handles large data payload
- Creates record with all provided fields
- No data truncation or loss

Test Case: TC-003-EC-03 - Special Characters in Data
Tool: mcp__attio__create-record
Parameters:
- resource_type: "companies"
- record_data: {
    "name": "Test & Co. (LLC) - Français",
    "description": "Company with émojis 🏢 and symbols @#$%"
  }

Expected Result:
- Handles special characters and Unicode
- Preserves original formatting
- No encoding issues
```

#### TC-003-ER: Error Conditions

```
Test Case: TC-003-ER-01 - Missing Required Fields
Tool: mcp__attio__create-record
Parameters:
- resource_type: "companies"
- record_data: {"industry": "Technology"}
(Missing required "name" field)

Expected Result:
- Returns field validation error
- Specifies which required fields are missing
- Provides field requirements

Test Case: TC-003-ER-02 - Invalid Field Values
Tool: mcp__attio__create-record
Parameters:
- resource_type: "people"
- record_data: {
    "name": "Test Person",
    "email": "invalid-email-format"
  }

Expected Result:
- Returns validation error for email format
- Explains proper email format requirements
- Record creation fails gracefully

Test Case: TC-003-ER-03 - Duplicate Record Creation
Tool: mcp__attio__create-record
Parameters:
- resource_type: "companies"
- record_data: {
    "name": "Existing Company Name",
    "domain": "existing-domain.com"
  }

Expected Result:
- Handles duplicate detection appropriately
- Either prevents duplicate or returns warning
- Clear error message about conflict
```

### TC-004: Update Record (update-record)

#### TC-004-HP: Happy Path Tests

```
Test Case: TC-004-HP-01 - Update Company Record
Tool: mcp__attio__update-record
Parameters:
- resource_type: "companies"
- record_id: "[EXISTING_COMPANY_ID]"
- record_data: {
    "industry": "Updated Industry",
    "description": "Updated description"
  }
- return_details: true

Expected Result:
- Updates specified fields only
- Preserves unchanged fields
- Returns updated record details
- Proper timestamp updates

Test Case: TC-004-HP-02 - Partial Person Update
Tool: mcp__attio__update-record
Parameters:
- resource_type: "people"
- record_id: "[EXISTING_PERSON_ID]"
- record_data: {"title": "Senior QA Engineer"}

Expected Result:
- Updates only the title field
- Other person fields remain unchanged
- Returns confirmation of update

Test Case: TC-004-HP-03 - Task Status Update
Tool: mcp__attio__update-record
Parameters:
- resource_type: "tasks"
- record_id: "[EXISTING_TASK_ID]"
- record_data: {
    "status": "completed",
    "completion_date": "2024-01-15"
  }

Expected Result:
- Updates task status and completion date
- Maintains task history if applicable
- Proper date formatting validation
```

#### TC-004-EC: Edge Cases

```
Test Case: TC-004-EC-01 - Update with Same Values
Tool: mcp__attio__update-record
Parameters:
- resource_type: "companies"
- record_id: "[EXISTING_COMPANY_ID]"
- record_data: {[EXISTING_VALUES]}

Expected Result:
- Processes update without errors
- Handles duplicate values gracefully
- May skip update or confirm no changes

Test Case: TC-004-EC-02 - Update All Fields
Tool: mcp__attio__update-record
Parameters:
- resource_type: "people"
- record_id: "[EXISTING_PERSON_ID]"
- record_data: {[ALL_UPDATABLE_FIELDS]}

Expected Result:
- Updates all provided fields
- Maintains data integrity
- Proper field validation for each field

Test Case: TC-004-EC-03 - Clear Field Values
Tool: mcp__attio__update-record
Parameters:
- resource_type: "companies"
- record_id: "[EXISTING_COMPANY_ID]"
- record_data: {"description": null}

Expected Result:
- Handles null/empty values appropriately
- Either clears field or maintains existing value
- Clear behavior documentation
```

#### TC-004-ER: Error Conditions

```
Test Case: TC-004-ER-01 - Update Non-existent Record
Tool: mcp__attio__update-record
Parameters:
- resource_type: "companies"
- record_id: "non_existent_id"
- record_data: {"name": "Updated Name"}

Expected Result:
- Returns "record not found" error
- Clear error message
- No partial updates or corruption

Test Case: TC-004-ER-02 - Update with Invalid Data
Tool: mcp__attio__update-record
Parameters:
- resource_type: "people"
- record_id: "[EXISTING_PERSON_ID]"
- record_data: {"email": "invalid-email"}

Expected Result:
- Returns validation error
- Explains validation requirements
- Original record remains unchanged

Test Case: TC-004-ER-03 - Update Read-only Fields
Tool: mcp__attio__update-record
Parameters:
- resource_type: "companies"
- record_id: "[EXISTING_COMPANY_ID]"
- record_data: {
    "id": "new_id",
    "created_at": "2023-01-01"
  }

Expected Result:
- Returns error about read-only fields
- Lists which fields cannot be updated
- No unauthorized field modifications
```

### TC-005: Delete Record (delete-record)

#### TC-005-HP: Happy Path Tests

```
Test Case: TC-005-HP-01 - Delete Company Record
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "companies"
- record_id: "[TEST_COMPANY_ID]"

Expected Result:
- Deletes record successfully
- Returns deletion confirmation
- Record no longer retrievable via get-record-details
- Related data handling as per business rules

Test Case: TC-005-HP-02 - Delete Person Record
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "people"
- record_id: "[TEST_PERSON_ID]"

Expected Result:
- Removes person record
- Handles relationship cleanup appropriately
- Confirmation message returned

Test Case: TC-005-HP-03 - Delete Task Record
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "tasks"
- record_id: "[TEST_TASK_ID]"

Expected Result:
- Deletes task successfully
- Task no longer appears in searches
- Proper audit trail if applicable
```

#### TC-005-EC: Edge Cases

```
Test Case: TC-005-EC-01 - Delete Record with Dependencies
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "companies"
- record_id: "[COMPANY_WITH_PEOPLE]"

Expected Result:
- Handles dependent records appropriately
- Either cascades deletion or prevents deletion
- Clear messaging about dependencies

Test Case: TC-005-EC-02 - Delete Recently Created Record
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "tasks"
- record_id: "[JUST_CREATED_TASK_ID]"

Expected Result:
- Deletes newly created record without issues
- Handles rapid create/delete cycles
- No timing-related errors
```

#### TC-005-ER: Error Conditions

```
Test Case: TC-005-ER-01 - Delete Non-existent Record
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "companies"
- record_id: "non_existent_id"

Expected Result:
- Returns "record not found" error
- Clear error message
- Graceful handling without system errors

Test Case: TC-005-ER-02 - Delete with Invalid ID Format
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "people"
- record_id: "!@#$%^&*()"

Expected Result:
- Returns parameter validation error
- Explains proper ID format requirements
- No system corruption or crashes

Test Case: TC-005-ER-03 - Delete Protected Record
Tool: mcp__attio__delete-record
Parameters:
- resource_type: "companies"
- record_id: "[PROTECTED_COMPANY_ID]"

Expected Result:
- Returns permission/protection error
- Explains why record cannot be deleted
- No unauthorized deletions
```

### TC-006: Get Attributes (get-attributes)

#### TC-006-HP: Happy Path Tests

```
Test Case: TC-006-HP-01 - Get Company Attributes
Tool: mcp__attio__get-attributes
Parameters:
- resource_type: "companies"

Expected Result:
- Returns comprehensive list of company attributes
- Includes attribute types and descriptions
- Organized by categories (basic, business, contact, etc.)

Test Case: TC-006-HP-02 - Get People Attributes by Category
Tool: mcp__attio__get-attributes
Parameters:
- resource_type: "people"
- categories: ["contact", "business"]

Expected Result:
- Returns only contact and business category attributes
- Proper category filtering
- Attributes relevant to people resource type

Test Case: TC-006-HP-03 - Get Specific Task Fields
Tool: mcp__attio__get-attributes
Parameters:
- resource_type: "tasks"
- fields: ["title", "status", "priority", "due_date"]

Expected Result:
- Returns details for specified fields only
- Field-specific metadata (type, required, validation rules)
- Task-appropriate field information
```

#### TC-006-EC: Edge Cases

```
Test Case: TC-006-EC-01 - Get All Categories
Tool: mcp__attio__get-attributes
Parameters:
- resource_type: "companies"
- categories: ["basic", "business", "contact", "social", "custom"]

Expected Result:
- Returns attributes from all categories
- Comprehensive attribute listing
- No missing categories

Test Case: TC-006-EC-02 - Get Attributes for Specific Record
Tool: mcp__attio__get-attributes
Parameters:
- resource_type: "people"
- record_id: "[SPECIFIC_PERSON_ID]"

Expected Result:
- Returns attributes schema for people
- May include record-specific customizations
- Maintains standard attribute structure
```

#### TC-006-ER: Error Conditions

```
Test Case: TC-006-ER-01 - Invalid Category Name
Tool: mcp__attio__get-attributes
Parameters:
- resource_type: "companies"
- categories: ["invalid_category"]

Expected Result:
- Returns error about invalid category
- Lists valid category names
- No system errors

Test Case: TC-006-ER-02 - Non-existent Field Names
Tool: mcp__attio__get-attributes
Parameters:
- resource_type: "tasks"
- fields: ["nonexistent_field", "fake_field"]

Expected Result:
- Returns error or empty result for invalid fields
- Lists available fields
- Clear error messaging
```

### TC-007: Discover Attributes (discover-attributes)

#### TC-007-HP: Happy Path Tests

```
Test Case: TC-007-HP-01 - Discover Company Schema
Tool: mcp__attio__discover-attributes
Parameters:
- resource_type: "companies"

Expected Result:
- Returns complete company schema
- All available attributes with types
- Field requirements and validation rules
- Organized structure

Test Case: TC-007-HP-02 - Discover People Schema
Tool: mcp__attio__discover-attributes
Parameters:
- resource_type: "people"

Expected Result:
- People-specific schema information
- Contact and relationship field details
- Proper field categorization

Test Case: TC-007-HP-03 - Discover All Resource Schemas
[Run for each resource type: companies, people, records, tasks, deals]

Expected Result:
- Each resource type returns unique schema
- Type-appropriate fields for each resource
- Consistent schema structure format
```

### TC-008: Get Detailed Info (get-detailed-info)

#### TC-008-HP: Happy Path Tests

```
Test Case: TC-008-HP-01 - Get Company Business Info
Tool: mcp__attio__get-detailed-info
Parameters:
- resource_type: "companies"
- record_id: "[COMPANY_ID]"
- info_type: "business"

Expected Result:
- Returns business-specific information
- Industry, size, revenue data if available
- Business-focused attributes only

Test Case: TC-008-HP-02 - Get Person Contact Info
Tool: mcp__attio__get-detailed-info
Parameters:
- resource_type: "people"
- record_id: "[PERSON_ID]"
- info_type: "contact"

Expected Result:
- Contact-specific details (email, phone, social)
- Communication preferences if available
- Contact method validation

Test Case: TC-008-HP-03 - Get Social Information
Tool: mcp__attio__get-detailed-info
Parameters:
- resource_type: "companies"
- record_id: "[COMPANY_ID]"
- info_type: "social"

Expected Result:
- Social media profiles and links
- Social engagement metrics if available
- Platform-specific information
```

### TC-009: Advanced Search (advanced-search)

#### TC-009-HP: Happy Path Tests

```
Test Case: TC-009-HP-01 - Company Search with Complex Filters
Tool: mcp__attio__advanced-search
Parameters:
- resource_type: "companies"
- filters: {
    "industry": "Technology",
    "employee_count": {"$gte": 100},
    "location": "San Francisco"
  }
- sort_by: "created_at"
- sort_order: "desc"
- limit: 25

Expected Result:
- Returns companies matching all filter criteria
- Proper sorting by creation date (newest first)
- Up to 25 results
- Complex filter logic works correctly

Test Case: TC-009-HP-02 - People Search with Relationship Filters
Tool: mcp__attio__advanced-search
Parameters:
- resource_type: "people"
- filters: {
    "title": {"$contains": "Engineer"},
    "company.industry": "Technology"
  }
- sort_by: "last_activity"
- limit: 50

Expected Result:
- Returns people with Engineer in title at Tech companies
- Relationship filtering works across linked records
- Sorted by most recent activity

Test Case: TC-009-HP-03 - Task Search with Date Ranges
Tool: mcp__attio__advanced-search
Parameters:
- resource_type: "tasks"
- filters: {
    "status": "open",
    "due_date": {
      "$gte": "2024-01-01",
      "$lte": "2024-12-31"
    }
  }
- sort_by: "due_date"
- sort_order: "asc"

Expected Result:
- Returns open tasks due within 2024
- Proper date range filtering
- Sorted by due date (earliest first)
```

### TC-010: Search by Relationship (search-by-relationship)

#### TC-010-HP: Happy Path Tests

```
Test Case: TC-010-HP-01 - Find People at Company
Tool: mcp__attio__search-by-relationship
Parameters:
- relationship_type: "company_to_people"
- source_id: "[COMPANY_ID]"
- limit: 20

Expected Result:
- Returns people associated with specified company
- Up to 20 people records
- Relationship data properly linked

Test Case: TC-010-HP-02 - Find Company for Person
Tool: mcp__attio__search-by-relationship
Parameters:
- relationship_type: "people_to_company"
- source_id: "[PERSON_ID]"

Expected Result:
- Returns company associated with person
- Company details properly retrieved
- Relationship mapping accurate

Test Case: TC-010-HP-03 - Find Tasks for Person
Tool: mcp__attio__search-by-relationship
Parameters:
- relationship_type: "person_to_tasks"
- source_id: "[PERSON_ID]"
- target_resource_type: "tasks"
- limit: 50

Expected Result:
- Returns tasks assigned to or created by person
- Task details with relationship context
- Proper task filtering
```

### TC-011: Search by Content (search-by-content)

#### TC-011-HP: Happy Path Tests

```
Test Case: TC-011-HP-01 - Search Notes Content
Tool: mcp__attio__search-by-content
Parameters:
- resource_type: "companies"
- content_type: "notes"
- search_query: "quarterly review"
- limit: 10

Expected Result:
- Returns companies with notes containing "quarterly review"
- Note content properly searched
- Relevant results with context

Test Case: TC-011-HP-02 - Search Activity Content
Tool: mcp__attio__search-by-content
Parameters:
- resource_type: "people"
- content_type: "activity"
- search_query: "meeting scheduled"
- limit: 15

Expected Result:
- Returns people with activity containing search terms
- Activity content properly indexed and searched
- Relevant activity context provided

Test Case: TC-011-HP-03 - Search Interactions
Tool: mcp__attio__search-by-content
Parameters:
- resource_type: "companies"
- content_type: "interactions"
- search_query: "phone call"
- limit: 25

Expected Result:
- Returns companies with interaction content matching search
- Interaction details properly searched
- Communication context provided
```

### TC-012: Search by Timeframe (search-by-timeframe)

#### TC-012-HP: Happy Path Tests

```
Test Case: TC-012-HP-01 - Recently Created Companies
Tool: mcp__attio__search-by-timeframe
Parameters:
- resource_type: "companies"
- timeframe_type: "created"
- start_date: "2024-01-01"
- end_date: "2024-01-31"
- limit: 30

Expected Result:
- Returns companies created in January 2024
- Proper date filtering
- Up to 30 results with creation dates

Test Case: TC-012-HP-02 - Recently Modified People
Tool: mcp__attio__search-by-timeframe
Parameters:
- resource_type: "people"
- timeframe_type: "modified"
- start_date: "2024-01-15"
- limit: 20

Expected Result:
- Returns people modified since January 15, 2024
- Modification date filtering works
- Recent changes properly tracked

Test Case: TC-012-HP-03 - Last Interaction Timeframe
Tool: mcp__attio__search-by-timeframe
Parameters:
- resource_type: "companies"
- timeframe_type: "last_interaction"
- start_date: "2024-01-01"
- end_date: "2024-01-31"

Expected Result:
- Returns companies with interactions in specified timeframe
- Interaction date filtering accurate
- Proper timeframe boundaries
```

### TC-013: Batch Operations (batch-operations)

#### TC-013-HP: Happy Path Tests

```
Test Case: TC-013-HP-01 - Batch Create Companies
Tool: mcp__attio__batch-operations
Parameters:
- resource_type: "companies"
- operation_type: "create"
- records: [
    {"name": "Batch Company 1", "industry": "Tech"},
    {"name": "Batch Company 2", "industry": "Finance"},
    {"name": "Batch Company 3", "industry": "Healthcare"}
  ]

Expected Result:
- Creates all 3 companies successfully
- Returns creation results for each record
- Proper batch processing
- Individual record IDs returned

Test Case: TC-013-HP-02 - Batch Update People
Tool: mcp__attio__batch-operations
Parameters:
- resource_type: "people"
- operation_type: "update"
- records: [
    {"id": "[PERSON_ID_1]", "title": "Updated Title 1"},
    {"id": "[PERSON_ID_2]", "title": "Updated Title 2"}
  ]

Expected Result:
- Updates both person records successfully
- Individual update confirmations
- Partial failure handling if applicable
- Batch operation efficiency

Test Case: TC-013-HP-03 - Batch Get Records
Tool: mcp__attio__batch-operations
Parameters:
- resource_type: "tasks"
- operation_type: "get"
- record_ids: ["[TASK_ID_1]", "[TASK_ID_2]", "[TASK_ID_3]"]

Expected Result:
- Retrieves all specified task records
- Individual record details returned
- Efficient batch retrieval
- Proper error handling for non-existent IDs
```

### TC-019: Batch Search (batch-search) - Issue #471

#### TC-019-HP: Happy Path Tests

```
Test Case: TC-019-HP-01 - Batch Company Search with Multiple Queries
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "companies"
- queries: ["technology", "consulting", "software"]
- limit: 10

Expected Result:
- Returns search results for all 3 queries
- Each query result contains query string and results array
- Individual query failures don't affect other queries
- Results maintain query order in response
- Performance >30% faster than sequential searches

Test Case: TC-019-HP-02 - Batch People Search with Pagination
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "people"
- queries: ["manager", "engineer", "director"]
- limit: 5
- offset: 0

Expected Result:
- Returns up to 5 people per query
- Proper pagination handling for each query
- Search results include people-specific attributes
- Batch processing completed within reasonable time (<10 seconds)

Test Case: TC-019-HP-03 - Mixed Resource Type Batch Searches
Tool: mcp__attio__batch-search
Parameters:
[Test with companies, people, tasks, records, deals individually]
- resource_type: [EACH_TYPE]
- queries: ["test", "sample", "demo"]
- limit: 3

Expected Result:
- All resource types handle batch search correctly
- Resource-specific field structures returned
- Consistent error handling across resource types
- Performance improvement validated for each type
```

#### TC-019-EC: Edge Cases

```
Test Case: TC-019-EC-01 - Large Batch Size
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "companies"
- queries: [Array of 50 search terms]
- limit: 2

Expected Result:
- Handles large query batch without errors
- Respects rate limiting with appropriate delays
- All queries processed within timeout limits (<60 seconds)
- No memory issues or performance degradation

Test Case: TC-019-EC-02 - Empty and Special Character Queries
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "people"
- queries: ["", "special-chars-!@#$%", "unicode-测试", "very-long-query-".repeat(20)]
- limit: 5

Expected Result:
- Handles empty queries gracefully
- Special characters processed without syntax errors
- Unicode queries handled correctly
- Long queries either processed or fail with clear errors

Test Case: TC-019-EC-03 - Single Query Batch
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "tasks"
- queries: ["single-query"]
- limit: 10

Expected Result:
- Single query processed correctly in batch format
- Result format consistent with multi-query batches
- No performance penalty for single query
- Returns proper batch search result structure
```

#### TC-019-ER: Error Conditions

```
Test Case: TC-019-ER-01 - Empty Queries Array
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "companies"
- queries: []
- limit: 10

Expected Result:
- Returns validation error about empty queries array
- Clear error message: "Queries array is required and must not be empty"
- No system errors or crashes

Test Case: TC-019-ER-02 - Invalid Resource Type
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "invalid_type"
- queries: ["test1", "test2"]

Expected Result:
- Returns resource type validation error
- Lists valid resource types in error message
- Batch processing stops gracefully

Test Case: TC-019-ER-03 - Partial Failure Scenarios
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "companies"
- queries: ["valid-query", "", "another-valid", "invalid-special-#@$%^&*()"]
- limit: 5

Expected Result:
- Valid queries return results successfully
- Invalid queries fail individually with specific errors
- Successful results not affected by failed queries
- Error isolation properly implemented
- Overall batch operation completes
```

#### TC-019-Performance: Performance Validation (Critical for Issue #471)

```
Test Case: TC-019-PERF-01 - Performance Improvement Validation
Tool: Performance comparison test
Method:
1. Execute 5 sequential search-records calls
2. Execute 1 batch-search call with same 5 queries
3. Compare execution times

Parameters:
- resource_type: "companies"
- queries: ["tech", "consulting", "software", "healthcare", "finance"]
- limit: 10

Expected Result:
- Batch search >30% faster than sequential searches
- Performance improvement documented in test results
- Consistent performance across multiple test runs
- No degradation in result quality

Test Case: TC-019-PERF-02 - Large Batch Performance
Tool: mcp__attio__batch-search
Parameters:
- resource_type: "people"
- queries: [20 different search terms]
- limit: 5

Expected Result:
- Completes within 30 seconds
- Memory usage remains stable
- No timeout errors
- Performance scales reasonably with query count

Test Case: TC-019-PERF-03 - Concurrent User Simulation
Tool: Simulated concurrent batch searches
Method: Multiple batch-search calls with slight delays

Expected Result:
- System handles concurrent batch searches
- Individual batch performance not significantly degraded
- Rate limiting prevents system overload
- Error handling works under load
```

### TC-014: Lists Resource Type Operations

#### TC-014-HP-01: Get All Lists

```
Test Case: TC-014-HP-01 - Get All CRM Lists
Tool: get-lists
Parameters: (no parameters required)

Expected Result:
- Returns all available CRM lists
- List details include ID, name, type, and metadata
- Response time < 5 seconds
- Lists include sales pipelines, lead stages, customer segments
```

#### TC-014-HP-02: Get List Details

```
Test Case: TC-014-HP-02 - Get Specific List Details
Tool: get-list-details
Parameters:
- list_id: "[VALID_LIST_ID]"

Expected Result:
- Returns complete list information
- Includes list schema, entry counts, and configuration
- List attributes and field definitions provided
- Proper list metadata returned
```

#### TC-014-HP-03: Get List Entries

```
Test Case: TC-014-HP-03 - Get List Entries with Pagination
Tool: get-list-entries
Parameters:
- list_id: "[VALID_LIST_ID]"
- limit: 20
- offset: 0

Expected Result:
- Returns up to 20 list entries
- Each entry contains record data and list-specific attributes
- Pagination info included
- Entry relationships properly populated
```

#### TC-014-HP-04: Add Record to List

```
Test Case: TC-014-HP-04 - Add Company to List
Tool: add-record-to-list
Parameters:
- list_id: "[VALID_LIST_ID]"
- record_id: "[COMPANY_ID]"
- attributes: {"stage": "qualified", "priority": "high"}

Expected Result:
- Company successfully added to list
- List-specific attributes set correctly
- Confirmation of addition returned
- Record appears in subsequent list queries
```

#### TC-014-HP-05: Remove Record from List

```
Test Case: TC-014-HP-05 - Remove Record from List
Tool: remove-record-from-list
Parameters:
- list_id: "[VALID_LIST_ID]"
- record_id: "[RECORD_ID]"

Expected Result:
- Record successfully removed from list
- Confirmation of removal returned
- Record no longer appears in list queries
- List entry count updated
```

#### TC-014-HP-06: Filter List Entries

```
Test Case: TC-014-HP-06 - Filter List Entries by Attributes
Tool: filter-list-entries
Parameters:
- list_id: "[VALID_LIST_ID]"
- filter_conditions: {"stage": "qualified", "priority": {"$in": ["high", "medium"]}}
- limit: 50

Expected Result:
- Returns entries matching filter conditions
- Complex filter logic works correctly
- Results limited to 50 entries
- Filter performance acceptable
```

#### TC-014-HP-07: Update List Entry

```
Test Case: TC-014-HP-07 - Update List Entry Attributes
Tool: update-list-entry
Parameters:
- listId: "[VALID_LIST_ID]"
- entryId: "[ENTRY_ID]"
- attributes: {"stage": "closed_won", "close_date": "2024-01-15"}

Expected Result:
- Entry attributes updated successfully
- Changes reflected in subsequent queries
- Update timestamp recorded
- Proper validation of attribute values
```

#### TC-014-HP-08: Get Record List Memberships

```
Test Case: TC-014-HP-08 - Find All Lists Containing a Record
Tool: get-record-list-memberships
Parameters:
- recordId: "[VALID_COMPANY_ID]"
- objectType: "companies"
- includeEntryValues: true
- batchSize: 5

Expected Result:
- Returns all lists containing the specified record
- Each membership includes list name, ID, and entry ID
- Entry values included when requested
- Batch processing works correctly
```

#### TC-014-HP-09: Advanced Filter List Entries

```
Test Case: TC-014-HP-09 - Complex Multi-Condition List Filtering
Tool: advanced-filter-list-entries
Parameters:
- listId: "[VALID_LIST_ID]"
- filters: {
    "filters": [
      {"attribute": {"slug": "stage"}, "condition": "equals", "value": "qualified"},
      {"attribute": {"slug": "priority"}, "condition": "equals", "value": "high"}
    ],
    "matchAny": false
  }
- limit: 20

Expected Result:
- Returns entries matching all filter conditions
- Complex filter logic processes correctly
- Results properly limited
- Performance acceptable for advanced filtering
```

#### TC-014-HP-10: Filter List Entries by Parent

```
Test Case: TC-014-HP-10 - Filter Entries by Parent Record Attributes
Tool: filter-list-entries-by-parent
Parameters:
- listId: "[VALID_LIST_ID]"
- parentObjectType: "companies"
- parentAttributeSlug: "industry"
- condition: "equals"
- value: "Technology"
- limit: 10

Expected Result:
- Returns list entries where parent company industry equals Technology
- Parent attribute filtering works correctly
- Proper relationship traversal
- Results limited as specified
```

#### TC-014-HP-11: Filter List Entries by Parent ID

```
Test Case: TC-014-HP-11 - Filter Entries by Specific Parent Record
Tool: filter-list-entries-by-parent-id
Parameters:
- listId: "[VALID_LIST_ID]"
- recordId: "[VALID_COMPANY_ID]"
- limit: 5

Expected Result:
- Returns all list entries for the specified parent record
- Direct parent ID filtering works
- Efficient query execution
- Proper result limiting
```

### TC-015: Notes CRUD Operations

#### TC-015-HP-01: Create Company Note

```
Test Case: TC-015-HP-01 - Create Note for Company
Tool: create-company-note
Parameters:
- company_id: "[COMPANY_ID]"
- note_content: "Initial meeting notes - discussed project requirements and timeline"
- note_type: "meeting"

Expected Result:
- Note created successfully for company
- Returns note ID and creation timestamp
- Note associated with correct company
- Note content preserved exactly
```

#### TC-015-HP-02: Get Company Notes

```
Test Case: TC-015-HP-02 - Retrieve Company Notes
Tool: get-company-notes
Parameters:
- company_id: "[COMPANY_ID]"
- limit: 10
- offset: 0

Expected Result:
- Returns up to 10 notes for the company
- Notes sorted by creation date (newest first)
- Each note includes ID, content, type, timestamps
- Pagination info provided if applicable
```

#### TC-015-HP-03: Create Person Note

```
Test Case: TC-015-HP-03 - Create Note for Person
Tool: create-person-note
Parameters:
- person_id: "[PERSON_ID]"
- note_content: "Follow-up call scheduled for next week to discuss proposal"
- note_type: "follow_up"

Expected Result:
- Note created successfully for person
- Returns note ID and metadata
- Note linked to correct person record
- Note searchable via content search tools
```

#### TC-015-HP-04: Get Person Notes

```
Test Case: TC-015-HP-04 - Retrieve Person Notes with Filtering
Tool: get-person-notes
Parameters:
- person_id: "[PERSON_ID]"
- note_type: "meeting"
- limit: 5

Expected Result:
- Returns up to 5 meeting notes for person
- Filtered by note type correctly
- Notes include full content and metadata
- Proper chronological ordering
```

#### TC-015-HP-05: Update Note Content

```
Test Case: TC-015-HP-05 - Update Existing Note
Tool: update-note (if available)
Parameters:
- note_id: "[NOTE_ID]"
- note_content: "Updated: Meeting rescheduled to next Friday at 2 PM"

Expected Result:
- Note content updated successfully
- Update timestamp recorded
- Original creation date preserved
- Change history maintained if applicable
```

### TC-016: Advanced Universal Operations

#### TC-016-HP-01: Advanced Search with Complex Filters

```
Test Case: TC-016-HP-01 - Multi-Condition Company Search
Tool: advanced-search
Parameters:
- resource_type: "companies"
- filters: {
    "industry": {"$in": ["Technology", "Finance"]},
    "employee_count": {"$gte": 50, "$lte": 500},
    "created_at": {"$gte": "2024-01-01"},
    "revenue": {"$gt": 1000000}
  }
- sort_by: "employee_count"
- sort_order: "desc"

Expected Result:
- Returns companies matching all filter conditions
- Complex multi-condition filtering works
- Results properly sorted by employee count
- Filter performance within acceptable limits
```

#### TC-016-HP-02: Relationship Search

```
Test Case: TC-016-HP-02 - Find All People at Technology Companies
Tool: search-by-relationship
Parameters:
- relationship_type: "company_to_people"
- source_filters: {"industry": "Technology"}
- target_resource_type: "people"
- limit: 100

Expected Result:
- Returns people working at technology companies
- Relationship filtering works correctly
- Results include both person and company context
- Up to 100 results returned efficiently
```

#### TC-016-HP-03: Timeframe Search

```
Test Case: TC-016-HP-03 - Recently Modified Records
Tool: search-by-timeframe
Parameters:
- resource_type: "companies"
- timeframe_type: "modified"
- start_date: "2024-01-01"
- end_date: "2024-01-31"
- limit: 50

Expected Result:
- Returns companies modified in January 2024
- Date filtering accurate to day precision
- Results include modification timestamps
- Performance acceptable for date range queries
```

### TC-017: Tasks Resource Type Operations

#### TC-017-HP-01: List Tasks with Filtering

```
Test Case: TC-017-HP-01 - List CRM Tasks with Status Filter
Tool: list-tasks
Parameters:
- status: "open"
- limit: 25
- sort_by: "due_date"

Expected Result:
- Returns up to 25 open tasks
- Tasks sorted by due date (earliest first)
- Each task includes title, status, priority, assignee
- Due date formatting consistent
```

#### TC-017-HP-02: Create New Task

```
Test Case: TC-017-HP-02 - Create Task with Full Details
Tool: create-task
Parameters:
- title: "Follow up on proposal with Acme Corp"
- description: "Schedule call to discuss Q1 implementation timeline"
- status: "open"
- priority: "high"
- due_date: "2024-02-15"
- assignee_id: "[USER_ID]"

Expected Result:
- Task created successfully with all details
- Returns task ID and creation timestamp
- Task appears in subsequent list-tasks queries
- All fields properly validated and stored
```

#### TC-017-HP-03: Update Existing Task

```
Test Case: TC-017-HP-03 - Update Task Status and Priority
Tool: update-task
Parameters:
- task_id: "[TASK_ID]"
- status: "in_progress"
- priority: "medium"
- notes: "Started initial research, waiting for client feedback"

Expected Result:
- Task updated successfully with new values
- Status change recorded with timestamp
- Original creation data preserved
- Update reflected in list queries immediately
```

#### TC-017-HP-04: Delete Completed Task

```
Test Case: TC-017-HP-04 - Delete Completed Task
Tool: delete-task
Parameters:
- task_id: "[COMPLETED_TASK_ID]"

Expected Result:
- Task successfully deleted from system
- Task no longer appears in any queries
- Related associations properly cleaned up
- Confirmation message returned
```

#### TC-017-HP-05: Link Task to Records

```
Test Case: TC-017-HP-05 - Associate Task with Company and Person
Tool: link-record-to-task
Parameters:
- task_id: "[TASK_ID]"
- linked_records: [
    {"type": "company", "id": "[COMPANY_ID]"},
    {"type": "person", "id": "[PERSON_ID]"}
  ]

Expected Result:
- Task successfully linked to both company and person
- Relationships created in both directions
- Task context includes linked record information
- Links appear in record relationship queries
```

#### TC-017-HP-06: Task Priority and Due Date Management

```
Test Case: TC-017-HP-06 - Complex Task Filtering and Sorting
Tool: list-tasks
Parameters:
- priority: {"$in": ["high", "critical"]}
- due_date: {"$lte": "2024-02-01"}
- status: {"$ne": "completed"}
- sort_by: "priority"
- sort_order: "desc"
- limit: 50

Expected Result:
- Returns high/critical priority tasks due by Feb 1
- Excludes completed tasks
- Results sorted by priority (critical first)
- Complex filtering logic works correctly
- Performance acceptable for filtered queries
```

### TC-018: Specialized Functionality and Data Validation

#### TC-018-HP-01: Attribute Discovery and Schema Validation

```
Test Case: TC-018-HP-01 - Discover Company Attributes Schema
Tool: discover-attributes
Parameters:
- resource_type: "companies"

Expected Result:
- Returns complete attribute schema for companies
- Includes data types, validation rules, and constraints
- Required vs optional fields clearly marked
- Custom field definitions included
- Schema format consistent and parseable
```

#### TC-018-HP-02: Data Type Validation - Email and Domain

```
Test Case: TC-018-HP-02 - Email and Domain Validation
Tool: create-record
Parameters:
- resource_type: "people"
- record_data: {
    "name": "Test Person",
    "email": "test@validcompany.com",
    "company_domain": "validcompany.com"
  }

Expected Result:
- Email format validated successfully
- Domain extraction and validation works
- Email domain consistency checks pass
- Invalid email formats rejected with clear messages
```

#### TC-018-HP-03: Data Type Validation - Phone Numbers

```
Test Case: TC-018-HP-03 - Phone Number Formatting and Validation
Tool: create-record
Parameters:
- resource_type: "people"
- record_data: {
    "name": "Test Person",
    "phone": "+1-555-123-4567",
    "mobile": "(555) 987-6543"
  }

Expected Result:
- Phone numbers formatted consistently
- International formats recognized
- Various phone number formats normalized
- Invalid phone numbers rejected appropriately
```

#### TC-018-HP-04: Data Type Validation - Boolean and Categories

```
Test Case: TC-018-HP-04 - Boolean and Industry Category Validation
Tool: create-record
Parameters:
- resource_type: "companies"
- record_data: {
    "name": "Test Company",
    "is_customer": true,
    "is_active": false,
    "industry": "Technology"
  }

Expected Result:
- Boolean values stored correctly (true/false)
- Industry categories validated against predefined list
- Invalid industry categories rejected
- Boolean field queries work correctly
```

#### TC-018-HP-05: Data Type Validation - Currency and Numbers

```
Test Case: TC-018-HP-05 - Currency and Numeric Field Validation
Tool: create-record
Parameters:
- resource_type: "deals"
- record_data: {
    "name": "Test Deal",
    "value": 250000.50,
    "currency": "USD",
    "probability": 75
  }

Expected Result:
- Currency values handled with proper precision
- Currency codes validated (USD, EUR, etc.)
- Numeric values within acceptable ranges
- Percentage fields validated (0-100)
```

#### TC-018-HP-06: Date and Timezone Handling

```
Test Case: TC-018-HP-06 - Date Fields with Timezone Support
Tool: create-record
Parameters:
- resource_type: "tasks"
- record_data: {
    "title": "Test Task",
    "due_date": "2024-02-15T14:30:00Z",
    "created_at": "2024-01-15T09:00:00-08:00"
  }

Expected Result:
- Date/time fields parsed correctly
- Timezone information preserved
- Date formats standardized in responses
- Date range queries work across timezones
```

#### TC-018-HP-07: Configuration System Validation

```
Test Case: TC-018-HP-07 - Deal Defaults and Configuration
Tool: advanced-search
Parameters:
- resource_type: "deals"
- filters: {"stage": "default"}

Expected Result:
- Default deal stages applied correctly
- Configuration-based defaults work
- Custom deal pipeline configurations respected
- Environment-based settings applied properly
```

#### TC-018-HP-08: Postal Code and Address Validation

```
Test Case: TC-018-HP-08 - Address and Postal Code Validation
Tool: create-record
Parameters:
- resource_type: "companies"
- record_data: {
    "name": "Test Company",
    "postal_code": "90210",
    "country": "US",
    "address": "123 Main St, Beverly Hills, CA"
  }

Expected Result:
- Postal codes validated by country
- Address formatting consistent
- Country-specific validation rules applied
- Invalid postal codes rejected with helpful messages
```

## Phase 2: Sub-Agent Testing (Usability Validation)

### Purpose

Phase 2 testing is designed to identify usability issues, unclear parameter requirements, and documentation gaps that would affect users unfamiliar with the system.

### Test Execution Guidelines for Sub-Agent

#### Pre-Testing Setup

1. **Agent Preparation**: Use an agent with no prior knowledge of Attio MCP Server
2. **Documentation Only**: Provide only the tool schema documentation, not implementation details
3. **Record Everything**: Document all confusion points, unclear parameters, and assumptions made

#### Focus Areas for Phase 2

1. **Parameter Clarity**: Are parameter names and descriptions clear?
2. **Required vs Optional**: Is it obvious which parameters are required?
3. **Value Examples**: Are example values provided where helpful?
4. **Error Messages**: Are error messages clear and actionable?
5. **Success Validation**: Is it clear when operations succeed?

#### Phase 2 Test Cases
=======
**Expected:** [What should happen]  
**Actual:** [What actually happened]  
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Result]
>>>>>>> Stashed changes

**Parameters Used:** [Exact parameters]  
**Error Message:** [Full error text]  
**Impact:** [Effect on testing/users]
```

---

## Appendices

### Appendix A: Test Data Setup

#### Environment Verification Commands
```bash
# Verify MCP server accessibility
mcp__attio__search-records resource_type="companies" query="test" limit=1

# Create test timestamp for unique naming
TEST_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
```

#### Test Data Creation

**Required Test Records:**

| Resource Type | Count | Naming Convention |
|---------------|-------|------------------|
| Companies | 3 | `QA Test Company [Alpha/Beta/Gamma] ${TEST_TIMESTAMP}` |
| People | 3 | `[Alice/Bob/Carol] QA Tester ${TEST_TIMESTAMP}` |
| Tasks | 2 | `QA Test Task [Alpha/Beta]` |  
| Deals | 2 | `QA Test Deal [Alpha/Beta]` |

**Key Commands:**
```bash
# Always discover fields first
mcp__attio__get-attributes resource_type="companies"
mcp__attio__get-attributes resource_type="people"

# Create companies with unique domains
mcp__attio__create-record resource_type="companies" \
  record_data='{"name": "QA Test Company Alpha '${TEST_TIMESTAMP}'", 
                "domains": ["qa-alpha-'${TEST_TIMESTAMP}'.test"]}'

# Create people with unique emails  
mcp__attio__create-record resource_type="people" \
  record_data='{"name": "Alice QA Tester '${TEST_TIMESTAMP}'",
                "email_addresses": ["alice.qa.'${TEST_TIMESTAMP}'@qa-testing.com"]}'
```

**Complete setup commands available in:** `/scripts/test-data-setup.sh`

### Appendix B: Quick Test Commands Reference

#### P0 Core Tests
```bash
# TC-001: Search Records
mcp__attio__search-records resource_type="companies" query="QA Test" limit=5

# TC-002: Get Record Details (use ID from TC-001)  
mcp__attio__get-record-details resource_type="companies" record_id="[RECORD_ID]"

# TC-003: Create Records  
mcp__attio__create-record resource_type="companies" \
  record_data='{"name": "Test Create Company", "domains": ["test-create.com"]}'

# TC-004: Update Records (use ID from TC-003)
mcp__attio__update-record resource_type="companies" record_id="[NEW_ID]" \
  record_data='{"description": "Updated description"}'

# TC-005: Delete Records (use ID from TC-003)
mcp__attio__delete-record resource_type="companies" record_id="[NEW_ID]"
```

#### P1 Essential Tests  
```bash
# TC-006: Get Attributes
mcp__attio__get-attributes resource_type="companies"

# TC-007: Discover Attributes
mcp__attio__discover-attributes resource_type="people"

# TC-008: Get Detailed Info
mcp__attio__get-detailed-info resource_type="companies" record_id="[ID]" info_type="activities"

# TC-009: Advanced Search  
mcp__attio__advanced-search resource_type="companies" \
  filters='[{"field": "employee_count", "operator": ">", "value": "50"}]'
```

#### P2 Advanced Tests
```bash  
# TC-010: Search by Relationship
mcp__attio__search-by-relationship relationship_type="company_person" \
  source_id="[COMPANY_ID]" target_resource_type="people"

# TC-011: Search by Content
mcp__attio__search-by-content resource_type="companies" \
  content_type="notes" search_query="important"

# TC-012: Search by Timeframe  
mcp__attio__search-by-timeframe resource_type="tasks" \
  timeframe_type="created_at" start_date="2024-01-01" end_date="2024-12-31"

# TC-013: Batch Operations
mcp__attio__batch-operations resource_type="companies" operation_type="delete" \
  record_ids='["id1", "id2", "id3"]'

# TC-019: Batch Search
mcp__attio__batch-search resource_type="companies" \
  queries='[{"query": "tech", "limit": 5}, {"query": "finance", "limit": 5}]'
```

### Appendix C: Tool Quick Reference

| Tool | Primary Use | Key Parameters |
|------|-------------|----------------|
| **search-records** | Find records by query | `resource_type`, `query`, `limit` |
| **get-record-details** | Get specific record | `resource_type`, `record_id` |  
| **create-record** | Create new record | `resource_type`, `record_data` |
| **update-record** | Modify existing record | `resource_type`, `record_id`, `record_data` |
| **delete-record** | Remove record | `resource_type`, `record_id` |
| **get-attributes** | Get schema info | `resource_type` |
| **discover-attributes** | Discover schema | `resource_type` |
| **advanced-search** | Complex searching | `resource_type`, `filters` |
| **search-by-relationship** | Find related records | `relationship_type`, `source_id` |
| **batch-operations** | Bulk operations | `resource_type`, `operation_type` |

### Appendix D: Resource Types Reference

| Resource Type | Description | Key Fields |
|---------------|-------------|------------|
| **companies** | Business organizations | `name`, `domains`, `industry`, `employee_count` |
| **people** | Individual contacts | `name`, `email_addresses`, `job_title` |
| **lists** | CRM lists and pipelines | `name`, `type`, `entry_count` |
| **tasks** | Action items | `title`, `description`, `status`, `priority` |
| **deals** | Sales opportunities | `name`, `value`, `stage` |
| **records** | Generic records | Varies by record type |

### Appendix E: Cleanup Utilities

#### Automated Cleanup (Recommended)
```bash
# Preview cleanup (safe)
npm run cleanup:test-data

# Execute cleanup  
npm run cleanup:test-data:live

# Resource-specific cleanup
npm run cleanup:test-data:companies -- --live
npm run cleanup:test-data:people -- --live
```

#### Manual Cleanup Commands
```bash
# Search and delete test companies
mcp__attio__search-records resource_type="companies" query="QA Test" limit=100
# Use returned IDs with delete-record tool

# Search and delete test people  
mcp__attio__search-records resource_type="people" query="QA Tester" limit=100
# Use returned IDs with delete-record tool
```

**⚠️ Critical:** Always clean up test data after testing to prevent workspace pollution.

---

*Last Updated: [Date] | Version: 2.0 | Status: Refactored for Clarity*