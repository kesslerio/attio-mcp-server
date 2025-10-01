# Cleanup Utilities Guide

> **Context:** Comprehensive test data cleanup procedures and utilities  
> **Prerequisites:** Test data created with standard prefixes (QA*, TEST*, E2E\_)  
> **Critical:** Always clean up test data to prevent Attio workspace pollution

## Overview

Test data cleanup is **mandatory** after every QA test session to maintain workspace hygiene and prevent interference with future tests. This guide covers both automated utilities and manual cleanup procedures.

## Automated Cleanup (Recommended)

The project includes comprehensive cleanup utilities for efficient batch cleanup with safety features.

### Primary Cleanup Commands

#### Safe Preview (Always Run First)

```bash
# Preview what would be deleted (safe dry-run)
npm run cleanup:test-data

# Alternative: Shell wrapper with detailed output
./scripts/cleanup-test-data.sh --dry-run
```

#### Full Cleanup Execution

```bash
# Clean all test data across all resource types
npm run cleanup:test-data:live

# Alternative: Shell wrapper with confirmation prompts
./scripts/cleanup-test-data.sh --live
```

### Resource-Specific Cleanup

Clean individual resource types when needed:

```bash
# Companies only
npm run cleanup:test-data:companies -- --live

# People only
npm run cleanup:test-data:people -- --live

# Tasks only
npm run cleanup:test-data:tasks -- --live

# Lists only
npm run cleanup:test-data:lists -- --live

# Deals only
npm run cleanup:test-data:deals -- --live
```

### Advanced Cleanup Options

#### Custom Prefixes

```bash
# Default prefixes: TEST_, QA_, E2E_, DEMO_
./scripts/cleanup-test-data.sh --prefix=CUSTOM_,TEMP_ --live

# Single prefix
./scripts/cleanup-test-data.sh --prefix=BUILD_ --live
```

#### Performance Tuning

```bash
# Parallel processing (default: 5 concurrent)
./scripts/cleanup-test-data.sh --parallel=10 --live

# With rate limiting for API protection
./scripts/cleanup-test-data.sh --parallel=3 --live
```

#### Batch Size Control

```bash
# Smaller batches for stability
./scripts/cleanup-test-data.sh --batch-size=50 --live

# Larger batches for speed (if API supports)
./scripts/cleanup-test-data.sh --batch-size=200 --live
```

## Automated Utility Features

### Safety Features

- ✅ **Dry-run by default** - Preview before deletion
- ✅ **Prefix-based filtering** - Only targets test data
- ✅ **Comprehensive logging** - Full audit trail
- ✅ **Error handling** - Graceful failure recovery
- ✅ **Rate limiting** - API protection

### Performance Features

- ✅ **Parallel processing** - Concurrent deletions
- ✅ **Batch operations** - Efficient API usage
- ✅ **Progress tracking** - Real-time status updates
- ✅ **Resource optimization** - Memory and connection management

### Reporting Features

- ✅ **Detailed summaries** - Deletion counts and timing
- ✅ **Error reporting** - Failed deletions with reasons
- ✅ **Performance metrics** - Throughput and efficiency stats

## Manual Cleanup Procedures

### When to Use Manual Cleanup

- Automated utilities unavailable
- Specific record ID cleanup needed
- Troubleshooting cleanup issues
- Custom cleanup scenarios

### Manual Deletion by Search

```bash
# 1. Search for test records
mcp__attio__records.search resource_type="companies" query="QA Test" limit=100

# 2. Extract IDs from results (example with specific IDs)
# Note: Replace with actual IDs from search results

# 3. Delete individual records
mcp__attio__delete-record resource_type="companies" record_id="COMPANY_ID_1"
mcp__attio__delete-record resource_type="companies" record_id="COMPANY_ID_2"
mcp__attio__delete-record resource_type="companies" record_id="COMPANY_ID_3"
```

### Systematic Manual Cleanup

#### Companies Cleanup

```bash
# Search and identify
mcp__attio__records.search resource_type="companies" query="QA Test Company" limit=100

# Delete each (replace with actual IDs)
mcp__attio__delete-record resource_type="companies" record_id="[COMPANY_ID_1]"
mcp__attio__delete-record resource_type="companies" record_id="[COMPANY_ID_2]"
mcp__attio__delete-record resource_type="companies" record_id="[COMPANY_ID_3]"
```

#### People Cleanup

```bash
# Search and identify
mcp__attio__records.search resource_type="people" query="QA Tester" limit=100

# Delete each (replace with actual IDs)
mcp__attio__delete-record resource_type="people" record_id="[PERSON_ID_1]"
mcp__attio__delete-record resource_type="people" record_id="[PERSON_ID_2]"
mcp__attio__delete-record resource_type="people" record_id="[PERSON_ID_3]"
```

#### Tasks Cleanup

```bash
# Search and identify
mcp__attio__records.search resource_type="tasks" query="QA Test Task" limit=100

# Delete each (replace with actual IDs)
mcp__attio__delete-record resource_type="tasks" record_id="[TASK_ID_1]"
mcp__attio__delete-record resource_type="tasks" record_id="[TASK_ID_2]"
```

#### Deals Cleanup

```bash
# Search and identify
mcp__attio__records.search resource_type="deals" query="QA Test Deal" limit=100

# Delete each (replace with actual IDs)
mcp__attio__delete-record resource_type="deals" record_id="[DEAL_ID_1]"
mcp__attio__delete-record resource_type="deals" record_id="[DEAL_ID_2]"
```

## Cleanup Verification

### Post-Cleanup Validation

After cleanup execution, verify workspace is clean:

```bash
# Verify no test companies remain
mcp__attio__records.search resource_type="companies" query="QA Test" limit=10
# Expected: Empty results or no matches

# Verify no test people remain
mcp__attio__records.search resource_type="people" query="QA Tester" limit=10
# Expected: Empty results or no matches

# Verify no test tasks remain
mcp__attio__records.search resource_type="tasks" query="QA Test Task" limit=10
# Expected: Empty results or no matches

# Verify no test deals remain
mcp__attio__records.search resource_type="deals" query="QA Test Deal" limit=10
# Expected: Empty results or no matches
```

### Cleanup Success Indicators

- ✅ All search queries return empty results
- ✅ No records with QA/TEST prefixes found
- ✅ Cleanup utility reports successful deletions
- ✅ No error messages in cleanup logs

## Cleanup Integration Workflows

### Pre-Test Cleanup

```bash
# Ensure clean starting environment
npm run cleanup:test-data:live

# Verify cleanliness
mcp__attio__records.search resource_type="companies" query="QA Test" limit=5
```

### Post-Test Cleanup

```bash
# Standard post-test cleanup
npm run cleanup:test-data:live

# Verify complete cleanup
npm run cleanup:test-data  # Should show no items to delete
```

### CI/CD Integration

```bash
# Cleanup in CI environments with specific prefixes
npm run cleanup:test-data:live --prefix=CI_,BUILD_

# Jenkins/GitHub Actions cleanup
./scripts/cleanup-test-data.sh --prefix=CI_${BUILD_NUMBER} --live
```

## Troubleshooting Cleanup Issues

### Common Issues & Solutions

#### Issue: "Record not found" errors during cleanup

**Cause:** Records already deleted or IDs changed  
**Solution:** Continue cleanup, these are safe to ignore

#### Issue: API rate limiting during cleanup

**Cause:** Too many concurrent deletion requests  
**Solution:** Reduce parallel processing: `--parallel=3`

#### Issue: Partial cleanup completion

**Cause:** Network issues or API timeouts  
**Solution:** Re-run cleanup - it will skip already deleted records

#### Issue: Permissions errors during deletion

**Cause:** API key lacks deletion permissions  
**Solution:** Verify API key permissions for delete operations

### Cleanup Recovery Procedures

#### Failed Automated Cleanup

1. Check cleanup logs for specific error messages
2. Try manual cleanup for remaining records
3. Re-run automated cleanup with reduced parallelism
4. Contact system administrator if permissions issues persist

#### Orphaned Test Data

1. Use broader search terms to find remaining test data
2. Check alternative resource types that might have been missed
3. Use custom prefix cleanup for non-standard test data
4. Document any persistent orphaned data for cleanup tool improvements

## Best Practices

### Prevention

- **Always use standard prefixes** (QA*, TEST*, E2E\_) for test data
- **Include timestamp** in test data names for uniqueness
- **Document test data IDs** during creation for manual cleanup fallback
- **Run dry-run first** - never skip preview step

### Execution

- **Clean before and after testing** to ensure consistent environment
- **Use automated utilities** whenever possible for reliability
- **Verify cleanup completion** with post-cleanup validation
- **Monitor cleanup logs** for errors and performance issues

### Maintenance

- **Update cleanup utilities** when new resource types are added
- **Review cleanup effectiveness** after each major test cycle
- **Document any manual cleanup procedures** needed for special cases
- **Test cleanup utilities** in development environments regularly

---

**Related Documentation:**

- [Previous: Quick Commands Reference](./quick-commands.md)
- [Previous: Test Data Setup](./test-data-setup.md)
- [Back: Reference Directory](./index.md)
- [Main: Execution Process](../03-execution.md)
