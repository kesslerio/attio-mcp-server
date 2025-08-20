# Test Execution Process & Workflow

> **Context:** Step-by-step operational procedures for executing the QA test plan  
> **Prerequisites:** [Test Strategy](./02-strategy.md) - Understanding of priority framework and phases  
> **Next Steps:** [Test Cases](./04-test-cases/) or [Reference Materials](./07-reference/)

## Test Execution Process

This document provides the operational workflow for executing QA tests systematically, from environment setup through results documentation.

### Pre-Test Setup

#### 1. Environment Verification
- Verify MCP server accessibility
- Test basic connectivity with a simple search
- Confirm API key and permissions

#### 2. Test Data Preparation
- Create test records for each resource type
- Use timestamp-based naming to avoid conflicts
- Document created record IDs for reference
- **Setup Guide:** [Test Data Setup](./07-reference/test-data-setup.md) for detailed commands
- **Quick Commands:** [Copy-paste commands](./07-reference/quick-commands.md) for fast setup
- **Resource Schemas:** [Resource Types Guide](./07-reference/resource-types.md) for field requirements

#### 3. Test Execution Dashboard

Create and maintain this dashboard throughout testing:

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
**Decision Framework:** [Quality Gates](./05-quality-gates.md) for escalation procedures

**Resources:**
- **Detailed Test Cases:** [P0 Core Tests](./04-test-cases/p0-core-tests.md)
- **Quick Commands:** [P0 Commands](./07-reference/quick-commands.md#p0-core-test-commands)  
- **Bug Reporting:** [Issue Templates](./06-bug-reporting.md) for failures

#### Priority 1 (P1) - Essential Extensions  
**Target:** 80% pass rate (3/4 tests)

1. **TC-006:** Get Attributes - Schema information
2. **TC-007:** Discover Attributes - Dynamic schema discovery
3. **TC-008:** Get Detailed Info - Specific information types
4. **TC-009:** Advanced Search - Complex search operations

**Resources:**
- **Detailed Test Cases:** [P1 Essential Tests](./04-test-cases/p1-essential-tests.md)
- **Quick Commands:** [P1 Commands](./07-reference/quick-commands.md#p1-essential-test-commands)
- **Tool Reference:** [Schema Tools](./07-reference/tool-reference.md) for parameters

#### Priority 2 (P2) - Advanced Features
**Target:** 50% pass rate (3/5 tests)

1. **TC-010:** Search by Relationship - Related record searches
2. **TC-011:** Search by Content - Content-based searches  
3. **TC-012:** Search by Timeframe - Date range searches
4. **TC-013:** Batch Operations - Bulk operations
5. **TC-019:** Batch Search - Multiple parallel searches

**Resources:**
- **Detailed Test Cases:** [P2 Advanced Tests](./04-test-cases/p2-advanced-tests.md)
- **Quick Commands:** [P2 Commands](./07-reference/quick-commands.md#p2-advanced-test-commands)
- **Tool Reference:** [Advanced Tools](./07-reference/tool-reference.md) for complex operations

### Execution Guidelines

#### Time Management
- **Total Duration:** 6 hours maximum (functional testing)
- **P0:** 2 hours maximum (includes 30min setup)
- **P1:** 2 hours maximum  
- **P2:** 1.5 hours maximum
- **Buffer:** 30 minutes for documentation

#### Quality Control
- Update dashboard after each test completion
- Document failures immediately with [Bug Report Template](./06-bug-reporting.md#bug-report-template)
- Take screenshots/logs for critical failures
- Stop execution immediately on P0 failure

#### Decision Points
- **P0 Complete:** Proceed to P1 only if 100% pass rate achieved
- **P1 Complete:** Evaluate if <80% pass rate before proceeding to P2
- **P2 Complete:** Document results regardless of pass rate

### Post-Test Activities

#### 1. Results Documentation
- Update execution dashboard with final results
- Document any bugs found with severity levels
- Create improvement recommendations
- Generate summary report

#### 2. Test Data Cleanup  
- Remove all test-created records
- Use automated cleanup utilities (see [Cleanup Utilities](./07-reference/cleanup-utilities.md))
- Verify workspace is clean for future tests

#### 3. Handoff Preparation
For Phase 2 (Usability Testing):
- Package test results and findings
- Document any environmental issues encountered
- Prepare system for fresh agent testing
- Update any documentation based on findings

### Success Tracking

Track progress using the dashboard and these checkpoints:

**P0 Checkpoint:**
- [ ] All 5 core tests executed
- [ ] 100% pass rate achieved
- [ ] No critical blocking issues
- [ ] Dashboard updated

**P1 Checkpoint:**  
- [ ] All 4 essential tests executed
- [ ] ≥80% pass rate achieved (3/4 tests)
- [ ] Production readiness assessment completed
- [ ] Dashboard updated

**P2 Checkpoint:**
- [ ] All 5 advanced tests executed  
- [ ] ≥50% pass rate achieved (3/5 tests)
- [ ] Enhancement opportunities documented
- [ ] Dashboard updated

**Final Checkpoint:**
- [ ] All test data cleaned up
- [ ] Results documented and reported
- [ ] System ready for Phase 2 or production

---

**Related Documentation:**
- [Previous: Test Strategy & Priority Framework](./02-strategy.md)
- [Next: Detailed Test Cases](./04-test-cases/)
- [Reference: Quick Commands](./07-reference/quick-commands.md)
- [Reference: Test Data Setup](./07-reference/test-data-setup.md)
- [Templates: Bug Reporting](./06-bug-reporting.md)