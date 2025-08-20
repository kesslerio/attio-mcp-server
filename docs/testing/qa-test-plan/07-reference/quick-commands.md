# Quick Commands Reference

> **Context:** Copy-paste ready commands for efficient test execution  
> **Prerequisites:** Test data created using [Test Data Setup](./test-data-setup.md)  
> **Usage:** Copy commands directly during test execution, replace IDs as needed

## Command Categories

### P0 Core Test Commands

#### TC-001: Search Records
```bash
# Basic company search
mcp__attio__search-records resource_type="companies" query="QA Test" limit=5

# Basic people search
mcp__attio__search-records resource_type="people" query="QA Tester" limit=5

# Basic task search
mcp__attio__search-records resource_type="tasks" query="QA Test Task" limit=5

# Basic deal search
mcp__attio__search-records resource_type="deals" query="QA Test Deal" limit=5
```

#### TC-002: Get Record Details
```bash
# Get company details (replace with actual ID)
mcp__attio__get-record-details resource_type="companies" record_id="[COMPANY_ID_FROM_SEARCH]"

# Get person details (replace with actual ID)
mcp__attio__get-record-details resource_type="people" record_id="[PERSON_ID_FROM_SEARCH]"

# Get task details (replace with actual ID)
mcp__attio__get-record-details resource_type="tasks" record_id="[TASK_ID_FROM_SEARCH]"
```

#### TC-003: Create Records  
```bash
# Create test company
mcp__attio__create-record resource_type="companies" \
  record_data='{"name": "TC003 Test Company", "domains": ["tc003-test.com"]}'

# Create test person
mcp__attio__create-record resource_type="people" \
  record_data='{"name": "TC003 Test Person", "email_addresses": ["tc003@test.com"]}'

# Create test task
mcp__attio__create-record resource_type="tasks" \
  record_data='{"title": "TC003 Test Task", "status": "open"}'
```

#### TC-004: Update Records
```bash
# Update company (replace with actual ID from TC-003)
mcp__attio__update-record resource_type="companies" record_id="[TC003_COMPANY_ID]" \
  record_data='{"description": "Updated by TC004"}'

# Update person (replace with actual ID from TC-003)
mcp__attio__update-record resource_type="people" record_id="[TC003_PERSON_ID]" \
  record_data='{"job_title": "TC004 Updated Title"}'

# Update task (replace with actual ID from TC-003)
mcp__attio__update-record resource_type="tasks" record_id="[TC003_TASK_ID]" \
  record_data='{"status": "in_progress"}'
```

#### TC-005: Delete Records
```bash
# Delete test company (replace with actual ID from TC-003)
mcp__attio__delete-record resource_type="companies" record_id="[TC003_COMPANY_ID]"

# Delete test person (replace with actual ID from TC-003)
mcp__attio__delete-record resource_type="people" record_id="[TC003_PERSON_ID]"

# Delete test task (replace with actual ID from TC-003)
mcp__attio__delete-record resource_type="tasks" record_id="[TC003_TASK_ID]"
```

### P1 Essential Test Commands

#### TC-006: Get Attributes
```bash
# Get company attributes
mcp__attio__get-attributes resource_type="companies"

# Get people attributes
mcp__attio__get-attributes resource_type="people"

# Get task attributes
mcp__attio__get-attributes resource_type="tasks"

# Get list attributes
mcp__attio__get-attributes resource_type="lists"
```

#### TC-007: Discover Attributes
```bash
# Discover company attributes
mcp__attio__discover-attributes resource_type="companies"

# Discover people attributes
mcp__attio__discover-attributes resource_type="people"

# Discover deal attributes
mcp__attio__discover-attributes resource_type="deals"
```

#### TC-008: Get Detailed Info
```bash
# Get company activities (replace with actual ID)
mcp__attio__get-detailed-info resource_type="companies" record_id="[COMPANY_ID]" info_type="activities"

# Get person contact history (replace with actual ID)
mcp__attio__get-detailed-info resource_type="people" record_id="[PERSON_ID]" info_type="contact"

# Get task relationships (replace with actual ID)
mcp__attio__get-detailed-info resource_type="tasks" record_id="[TASK_ID]" info_type="relationships"
```

#### TC-009: Advanced Search
```bash
# Company search with filters
mcp__attio__advanced-search resource_type="companies" \
  filters='[{"field": "employee_count", "operator": ">", "value": "50"}]' \
  sort_by="name" sort_order="asc"

# People search with date filters
mcp__attio__advanced-search resource_type="people" \
  filters='[{"field": "created_at", "operator": ">=", "value": "2024-01-01"}]' \
  limit=20

# Multi-field task search
mcp__attio__advanced-search resource_type="tasks" \
  filters='[
    {"field": "status", "operator": "in", "value": ["open", "in_progress"]},
    {"field": "priority", "operator": "=", "value": "high"}
  ]'
```

### P2 Advanced Test Commands

#### TC-010: Search by Relationship
```bash
# Find people associated with a company (replace with actual ID)
mcp__attio__search-by-relationship relationship_type="company_person" \
  source_id="[COMPANY_ID]" target_resource_type="people" limit=10

# Find deals associated with a person (replace with actual ID)
mcp__attio__search-by-relationship relationship_type="person_deal" \
  source_id="[PERSON_ID]" target_resource_type="deals" limit=10

# Find tasks linked to a company (replace with actual ID)
mcp__attio__search-by-relationship relationship_type="company_task" \
  source_id="[COMPANY_ID]" target_resource_type="tasks" limit=10
```

#### TC-011: Search by Content
```bash
# Search companies by notes content
mcp__attio__search-by-content resource_type="companies" \
  content_type="notes" search_query="important client" limit=10

# Search people by description content
mcp__attio__search-by-content resource_type="people" \
  content_type="description" search_query="key contact" limit=10

# Search across multiple content types
mcp__attio__search-by-content resource_type="deals" \
  content_type="all" search_query="quarterly review" limit=10
```

#### TC-012: Search by Timeframe
```bash
# Search tasks by creation date
mcp__attio__search-by-timeframe resource_type="tasks" \
  timeframe_type="created_at" start_date="2024-01-01" end_date="2024-12-31" limit=20

# Search companies by last activity
mcp__attio__search-by-timeframe resource_type="companies" \
  timeframe_type="last_activity" start_date="2024-08-01" limit=15

# Search people by modified date
mcp__attio__search-by-timeframe resource_type="people" \
  timeframe_type="updated_at" start_date="2024-08-15" end_date="2024-08-20"
```

#### TC-013: Batch Operations
```bash
# Batch get multiple companies (replace with actual IDs)
mcp__attio__batch-operations resource_type="companies" \
  operation_type="get" record_ids='["[ID1]","[ID2]","[ID3]"]'

# Batch update multiple people (replace with actual IDs)
mcp__attio__batch-operations resource_type="people" \
  operation_type="update" \
  operations='[
    {"record_id": "[ID1]", "data": {"job_title": "Batch Updated 1"}},
    {"record_id": "[ID2]", "data": {"job_title": "Batch Updated 2"}}
  ]'

# Batch create multiple tasks
mcp__attio__batch-operations resource_type="tasks" \
  operation_type="create" \
  operations='[
    {"data": {"title": "Batch Task 1", "status": "open"}},
    {"data": {"title": "Batch Task 2", "status": "open"}}
  ]'
```

#### TC-019: Batch Search
```bash
# Parallel company searches
mcp__attio__batch-search resource_type="companies" \
  queries='["technology", "consulting", "software"]' limit=5

# Parallel people searches
mcp__attio__batch-search resource_type="people" \
  queries='["manager", "engineer", "director"]' limit=5

# Mixed resource batch search
mcp__attio__batch-search resource_type="tasks" \
  queries='["urgent", "review", "meeting"]' limit=3
```

## Utility Commands

### Environment Validation
```bash
# Test basic connectivity
mcp__attio__search-records resource_type="companies" query="test" limit=1

# Verify permissions
mcp__attio__get-attributes resource_type="companies"
```

### Data Discovery
```bash
# Find available resources
mcp__attio__get-attributes resource_type="companies"
mcp__attio__get-attributes resource_type="people"
mcp__attio__get-attributes resource_type="lists"
mcp__attio__get-attributes resource_type="tasks"
mcp__attio__get-attributes resource_type="deals"
```

### Test Data Verification
```bash
# Check test data exists
mcp__attio__search-records resource_type="companies" query="QA Test" limit=10
mcp__attio__search-records resource_type="people" query="QA Tester" limit=10
mcp__attio__search-records resource_type="tasks" query="QA Test Task" limit=10
mcp__attio__search-records resource_type="deals" query="QA Test Deal" limit=10
```

### Cleanup Commands
```bash
# Preview cleanup (safe)
npm run cleanup:test-data

# Execute cleanup  
npm run cleanup:test-data:live

# Resource-specific cleanup
npm run cleanup:test-data:companies -- --live
npm run cleanup:test-data:people -- --live
npm run cleanup:test-data:tasks -- --live
```

## Command Usage Tips

### ID Replacement Strategy
1. **Execute search commands first** to get valid record IDs
2. **Copy IDs from results** and replace placeholders like `[COMPANY_ID]`
3. **Use consistent naming** in your test session for easy tracking
4. **Document IDs** in your test execution dashboard

### Error Handling
1. **Check command syntax** if errors occur
2. **Verify record IDs exist** before using in operations
3. **Re-run get-attributes** if field errors occur
4. **Use get-record-details** to verify record state

### Efficiency Tips
1. **Batch similar commands** when possible
2. **Keep test data IDs** in a scratch file for quick reference
3. **Use search results** to get valid IDs for subsequent tests
4. **Prepare command variations** for different scenarios

---

**Related Documentation:**
- [Previous: Test Data Setup](./test-data-setup.md)
- [Reference: Tool Reference](./tool-reference.md)
- [Reference: Cleanup Utilities](./cleanup-utilities.md)
- [Back: Reference Directory](./index.md)