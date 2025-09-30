# QA Test Plan - Developer Quick Start

> **⚡ Quick reference for developers who need to run QA tests fast**  
> **⏱️ Time budget: 15 minutes setup + 6 hours testing + 15 minutes cleanup**

## TL;DR - Just Run Tests

### Prerequisites (2 minutes)

```bash
# 1. Verify environment
export ATTIO_API_KEY="your_api_key_here"
npm run typecheck  # Ensure build works

# 2. Clean slate
npm run cleanup:test-data:live
```

### Essential Test Flow (6 hours)

```bash
# 1. P0 Core Tests (2 hours) - MANDATORY 100% pass
# Run each P0 test case from 04-test-cases/p0-core-tests.md

# 2. P1 Essential Tests (2 hours) - TARGET 80% pass
# Run each P1 test case from 04-test-cases/p1-essential-tests.md

# 3. P2 Advanced Tests (2 hours) - TARGET 50% pass
# Run each P2 test case from 04-test-cases/p2-advanced-tests.md

# 4. Cleanup
npm run cleanup:test-data:live
```

### Pass/Fail Decision

- **P0 Failure** → STOP, system not ready for production
- **P1 < 80%** → Evaluate risk, may proceed with documented issues
- **P2 < 50%** → Document but don't block release

---

## Copy-Paste Commands

### Test Data Setup (5 minutes)

```bash
# Create test companies
mcp__attio__create-record resource_type="companies" \
  record_data='{"name": "QA Test Company Alpha", "domains": ["qa-alpha.com"]}'

mcp__attio__create-record resource_type="companies" \
  record_data='{"name": "QA Test Company Beta", "domains": ["qa-beta.com"]}'

# Create test people
mcp__attio__create-record resource_type="people" \
  record_data='{"name": "QA Tester Alpha", "email_addresses": [{"email_address": "alpha@qa-test.com", "email_type": "work"}]}'

mcp__attio__create-record resource_type="people" \
  record_data='{"name": "QA Tester Beta", "email_addresses": [{"email_address": "beta@qa-test.com", "email_type": "work"}]}'

# Create test tasks
mcp__attio__create-record resource_type="tasks" \
  record_data='{"title": "QA Test Task Alpha", "status": "open", "priority": "high"}'

mcp__attio__create-record resource_type="tasks" \
  record_data='{"title": "QA Test Task Beta", "status": "open", "priority": "medium"}'

# Create test deals
mcp__attio__create-record resource_type="deals" \
  record_data='{"name": "QA Test Deal Alpha", "value": 10000, "stage": "proposal"}'

mcp__attio__create-record resource_type="deals" \
  record_data='{"name": "QA Test Deal Beta", "value": 25000, "stage": "qualification"}'
```

### Core Operations Test (30 minutes)

```bash
# Search (replace with your test data names)
mcp__attio__records.search resource_type="companies" query="QA Test" limit=5
mcp__attio__records.search resource_type="people" query="QA Tester" limit=5
mcp__attio__records.search resource_type="tasks" query="QA Test Task" limit=5

# Get details (replace [ID] with actual IDs from search results)
mcp__attio__records.get_details resource_type="companies" record_id="[COMPANY_ID]"
mcp__attio__records.get_details resource_type="people" record_id="[PERSON_ID]"
mcp__attio__records.get_details resource_type="tasks" record_id="[TASK_ID]"

# Update (replace [ID] with actual IDs)
mcp__attio__update-record resource_type="companies" record_id="[COMPANY_ID]" \
  record_data='{"description": "Updated by QA Test"}'

mcp__attio__update-record resource_type="people" record_id="[PERSON_ID]" \
  record_data='{"job_title": "QA Updated Title"}'

mcp__attio__update-record resource_type="tasks" record_id="[TASK_ID]" \
  record_data='{"status": "in_progress"}'
```

### Schema Validation (15 minutes)

```bash
# Get all schemas
mcp__attio__get-attributes resource_type="companies"
mcp__attio__get-attributes resource_type="people"
mcp__attio__get-attributes resource_type="tasks"
mcp__attio__get-attributes resource_type="deals"

# Discover dynamic attributes
mcp__attio__discover-attributes resource_type="companies"
mcp__attio__discover-attributes resource_type="people"
```

### Cleanup (Always Run)

```bash
# Preview cleanup first (safe)
npm run cleanup:test-data

# Execute cleanup
npm run cleanup:test-data:live

# Verify cleanup worked
mcp__attio__records.search resource_type="companies" query="QA Test" limit=5
# Should return empty results
```

---

## Quick Reference Links

### Essential Documentation

- **[Test Cases →](./04-test-cases/)** - All test specifications
- **[Quick Commands →](./07-reference/quick-commands.md)** - Copy-paste commands
- **[Tool Reference →](./07-reference/tool-reference.md)** - Parameter specifications
- **[Cleanup Guide →](./07-reference/cleanup-utilities.md)** - Data cleanup procedures

### By Priority Level

- **[P0 Core Tests →](./04-test-cases/p0-core-tests.md)** - 100% pass required
- **[P1 Essential Tests →](./04-test-cases/p1-essential-tests.md)** - 80% target
- **[P2 Advanced Tests →](./04-test-cases/p2-advanced-tests.md)** - 50% target

### For Managers/Stakeholders

- **[Overview & Objectives →](./01-overview.md)** - Strategic context
- **[Quality Gates →](./05-quality-gates.md)** - Decision criteria
- **[Bug Reporting →](./06-bug-reporting.md)** - Issue templates

---

## Common Issues & Quick Fixes

### "Record not found" errors

**Fix:** Record may have been deleted. Search first to get valid IDs:

```bash
mcp__attio__records.search resource_type="companies" query="QA Test" limit=10
```

### API rate limiting

**Fix:** Add delays between commands or reduce batch sizes:

```bash
sleep 1  # Between individual commands
```

### Permission denied

**Fix:** Verify API key has required permissions:

```bash
mcp__attio__get-attributes resource_type="companies"  # Test read access
```

### Empty search results

**Fix:** Verify test data exists or recreate:

```bash
npm run cleanup:test-data:live  # Clean first
# Then re-run test data setup commands
```

---

## Build & Test Integration

### Pre-Test System Validation

```bash
# Verify build works
npm run build
npm run typecheck

# Verify tests pass
npm test -- --testTimeout=30000

# Clean environment
npm run cleanup:test-data:live
```

### Post-Test Validation

```bash
# Ensure clean state
npm run cleanup:test-data:live

# Verify no test data remains
npm run cleanup:test-data  # Should show nothing to clean
```

---

## Time Budget Breakdown

| Phase            | Duration      | Activities                            | Success Criteria           |
| ---------------- | ------------- | ------------------------------------- | -------------------------- |
| **Setup**        | 15 min        | Environment prep, test data creation  | Clean baseline established |
| **P0 Core**      | 2 hours       | CRUD operations, basic functionality  | 100% pass rate             |
| **P1 Essential** | 2 hours       | Advanced features, schema validation  | ≥80% pass rate             |
| **P2 Advanced**  | 2 hours       | Complex operations, edge cases        | ≥50% pass rate             |
| **Cleanup**      | 15 min        | Data cleanup, environment restoration | Workspace clean            |
| **TOTAL**        | **6.5 hours** | Complete QA validation cycle          | System production-ready    |

---

## Emergency Contacts & Escalation

### Test Blocking Issues

1. **P0 Test Failures** → Immediate escalation required
2. **API Access Issues** → Check API key and permissions
3. **Environment Problems** → Verify build and test suite passes
4. **Data Cleanup Failures** → Use manual cleanup procedures

### Documentation Issues

- **Missing Commands** → Check [Tool Reference](./07-reference/tool-reference.md)
- **Unclear Procedures** → Check [Execution Process](./03-execution.md)
- **Parameter Help** → Check [Resource Types](./07-reference/resource-types.md)

---

**🚀 Ready to start? Run the prerequisite commands above and dive into [P0 Core Tests](./04-test-cases/p0-core-tests.md)**

---

**📝 Last Updated:** 2024-08-20 | **📄 Version:** 2.0 (Modular) | **✅ Status:** Developer Ready
