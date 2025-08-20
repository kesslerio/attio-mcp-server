# Test Data Setup Guide

> **Context:** Complete procedures for environment preparation and test data creation  
> **Prerequisites:** MCP server access and valid API key  
> **Usage:** Execute before beginning any test phase to ensure clean, consistent test environment

## Environment Verification

### Prerequisites Checklist
- [ ] MCP server running and accessible
- [ ] API key configured and valid
- [ ] Network connectivity confirmed
- [ ] Permissions verified for all resource types

### Verification Commands

```bash
# Verify MCP server accessibility
mcp__attio__search-records resource_type="companies" query="test" limit=1

# Verify API key and permissions
mcp__attio__get-attributes resource_type="companies"
mcp__attio__get-attributes resource_type="people"
mcp__attio__get-attributes resource_type="tasks"
mcp__attio__get-attributes resource_type="deals"
```

**Expected Results:**
- Search command returns valid response (even if empty)
- Get-attributes commands return schema information
- No authentication or permission errors

## Test Data Preparation

### Unique Naming Strategy

Create unique test data using timestamp-based naming to prevent conflicts:

```bash
# Create test timestamp for unique naming
TEST_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "Test run timestamp: $TEST_TIMESTAMP"
```

### Pre-Test Cleanup

Always start with a clean environment:

```bash
# Preview existing test data (safe)
npm run cleanup:test-data

# Clean any existing test data
npm run cleanup:test-data:live
```

### Required Test Records

Create the following test data for comprehensive testing:

| Resource Type | Count | Naming Convention |
|---------------|-------|------------------|
| Companies | 3 | `QA Test Company [Alpha/Beta/Gamma] ${TEST_TIMESTAMP}` |
| People | 3 | `[Alice/Bob/Carol] QA Tester ${TEST_TIMESTAMP}` |
| Tasks | 2 | `QA Test Task [Alpha/Beta]` |  
| Deals | 2 | `QA Test Deal [Alpha/Beta]` |

### Test Data Creation Commands

#### Step 1: Discover Fields (MANDATORY)

Always discover available fields before creating records:

```bash
# Discover company fields
mcp__attio__get-attributes resource_type="companies"

# Discover people fields  
mcp__attio__get-attributes resource_type="people"

# Discover task fields
mcp__attio__get-attributes resource_type="tasks"

# Discover deal fields
mcp__attio__get-attributes resource_type="deals"
```

#### Step 2: Create Test Companies

```bash
# Company Alpha - Technology
mcp__attio__create-record resource_type="companies" \
  record_data="{
    \"name\": \"QA Test Company Alpha ${TEST_TIMESTAMP}\",
    \"domains\": [\"qa-alpha-${TEST_TIMESTAMP}.test\"],
    \"description\": \"Technology company for QA testing\",
    \"industry\": \"Technology\"
  }"

# Company Beta - Finance  
mcp__attio__create-record resource_type="companies" \
  record_data="{
    \"name\": \"QA Test Company Beta ${TEST_TIMESTAMP}\",
    \"domains\": [\"qa-beta-${TEST_TIMESTAMP}.test\"],
    \"description\": \"Finance company for QA testing\",
    \"industry\": \"Finance\"
  }"

# Company Gamma - Healthcare
mcp__attio__create-record resource_type="companies" \
  record_data="{
    \"name\": \"QA Test Company Gamma ${TEST_TIMESTAMP}\",
    \"domains\": [\"qa-gamma-${TEST_TIMESTAMP}.test\"],
    \"description\": \"Healthcare company for QA testing\",
    \"industry\": \"Healthcare\"
  }"
```

#### Step 3: Create Test People

```bash
# Alice - QA Manager
mcp__attio__create-record resource_type="people" \
  record_data="{
    \"name\": \"Alice QA Tester ${TEST_TIMESTAMP}\",
    \"email_addresses\": [\"alice.qa.${TEST_TIMESTAMP}@qa-testing.com\"],
    \"job_title\": \"QA Manager\"
  }"

# Bob - QA Engineer
mcp__attio__create-record resource_type="people" \
  record_data="{
    \"name\": \"Bob QA Validator ${TEST_TIMESTAMP}\",
    \"email_addresses\": [\"bob.qa.${TEST_TIMESTAMP}@qa-testing.com\"],
    \"job_title\": \"QA Engineer\"
  }"

# Carol - QA Analyst
mcp__attio__create-record resource_type="people" \
  record_data="{
    \"name\": \"Carol QA Analyst ${TEST_TIMESTAMP}\",
    \"email_addresses\": [\"carol.qa.${TEST_TIMESTAMP}@qa-testing.com\"],
    \"job_title\": \"QA Analyst\"
  }"
```

#### Step 4: Create Test Tasks

```bash
# Task Alpha - High Priority
mcp__attio__create-record resource_type="tasks" \
  record_data="{
    \"title\": \"QA Test Task Alpha\",
    \"description\": \"Primary QA validation task\",
    \"status\": \"open\",
    \"priority\": \"high\"
  }"

# Task Beta - Medium Priority  
mcp__attio__create-record resource_type="tasks" \
  record_data="{
    \"title\": \"QA Test Task Beta\",
    \"description\": \"Secondary QA verification task\",
    \"status\": \"in_progress\",
    \"priority\": \"medium\"
  }"
```

#### Step 5: Create Test Deals

```bash
# Deal Alpha - Qualification Stage
mcp__attio__create-record resource_type="deals" \
  record_data="{
    \"name\": \"QA Test Deal Alpha\",
    \"value\": 50000,
    \"stage\": \"qualification\"
  }"

# Deal Beta - Proposal Stage
mcp__attio__create-record resource_type="deals" \
  record_data="{
    \"name\": \"QA Test Deal Beta\",
    \"value\": 75000,
    \"stage\": \"proposal\"
  }"
```

## Test Data Manifest

After creating test data, document the IDs for reference:

```markdown
# Test Data Manifest - [Date Created: YYYY-MM-DD HH:MM]

## Test Environment Details
- **Test Timestamp:** ${TEST_TIMESTAMP}
- **Created By:** [Agent/User Name]
- **Environment:** [Test Environment Name]

## Company Records
- **QA Test Company Alpha:** ID = [RECORD_ID_FROM_CREATION]
- **QA Test Company Beta:** ID = [RECORD_ID_FROM_CREATION]  
- **QA Test Company Gamma:** ID = [RECORD_ID_FROM_CREATION]

## People Records
- **Alice QA Tester:** ID = [RECORD_ID_FROM_CREATION]
- **Bob QA Validator:** ID = [RECORD_ID_FROM_CREATION]
- **Carol QA Analyst:** ID = [RECORD_ID_FROM_CREATION]

## Task Records
- **QA Test Task Alpha:** ID = [RECORD_ID_FROM_CREATION]
- **QA Test Task Beta:** ID = [RECORD_ID_FROM_CREATION]

## Deal Records  
- **QA Test Deal Alpha:** ID = [RECORD_ID_FROM_CREATION]
- **QA Test Deal Beta:** ID = [RECORD_ID_FROM_CREATION]

## Status
- **Created:** [YYYY-MM-DD HH:MM]
- **Status:** ACTIVE
- **Cleanup Scheduled:** [Post-testing]
```

## Validation & Troubleshooting

### Data Creation Validation

Verify all test data was created successfully:

```bash
# Verify companies created
mcp__attio__search-records resource_type="companies" query="QA Test Company" limit=10

# Verify people created
mcp__attio__search-records resource_type="people" query="QA Tester" limit=10

# Verify tasks created
mcp__attio__search-records resource_type="tasks" query="QA Test Task" limit=10

# Verify deals created
mcp__attio__search-records resource_type="deals" query="QA Test Deal" limit=10
```

### Common Issues & Solutions

#### Issue: "Field not found" errors
**Solution:** Re-run `get-attributes` and verify field names match exactly

#### Issue: "Invalid format" errors
**Solution:** Check data types and format requirements in schema

#### Issue: "Duplicate domain" errors
**Solution:** Verify TEST_TIMESTAMP is unique and domains don't conflict

#### Issue: Rate limiting errors
**Solution:** Add delays between record creation commands

### Environment Reset

If test data creation fails partially:

```bash
# Clean up partial data
npm run cleanup:test-data:live

# Wait for cleanup completion
sleep 10

# Restart test data creation process
# Re-run from Step 1 (Discover Fields)
```

---

**Related Documentation:**
- [Next: Quick Commands Reference](./quick-commands.md)
- [Reference: Cleanup Utilities](./cleanup-utilities.md)
- [Back: Reference Directory](./index.md)