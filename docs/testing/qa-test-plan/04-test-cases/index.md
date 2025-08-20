# Test Cases Directory

> **Context:** Detailed test case specifications organized by priority level  
> **Prerequisites:** [Test Strategy](../02-strategy.md) and [Execution Process](../03-execution.md)  
> **Navigation:** Choose test cases by priority level for systematic execution

## Test Cases Overview

This directory contains comprehensive test specifications organized by the priority framework established in our test strategy.

### Priority-Based Test Organization

| Priority Level | Test Count | Success Criteria | Time Allocation | Focus Area |
|----------------|------------|------------------|-----------------|------------|
| **[P0 - Core](./p0-core-tests.md)** ⚡ | 5 tests | 100% pass rate | 2 hours | CRUD operations |
| **[P1 - Essential](./p1-essential-tests.md)** 🔧 | 4 tests | 80% pass rate | 2 hours | Schema & advanced search |
| **[P2 - Advanced](./p2-advanced-tests.md)** 🚀 | 5 tests | 50% pass rate | 2 hours | Relationships & batch ops |
| **[Usability](./usability-tests.md)** 👥 | Variable | Clear UX | 2-3 hours | Documentation & ease of use |

### Execution Order

**Sequential Execution Required:**
1. **P0 Tests First** - Must achieve 100% pass rate before proceeding
2. **P1 Tests Second** - Must achieve 80% pass rate for production readiness  
3. **P2 Tests Third** - 50% pass rate acceptable for release
4. **Usability Tests** - Separate phase with fresh agent

### Test Case Format

Each test case follows this structure:
- **Test ID** (TC-XXX)
- **Objective** - What the test validates
- **Prerequisites** - Required setup or dependencies
- **Test Steps** - Detailed execution steps
- **Expected Results** - Success criteria
- **Error Scenarios** - Edge cases and error handling

### Quick Navigation

#### By Execution Priority
- [Start Here: P0 Core Tests](./p0-core-tests.md) ⚡
- [Continue: P1 Essential Tests](./p1-essential-tests.md) 🔧
- [Final: P2 Advanced Tests](./p2-advanced-tests.md) 🚀

#### By Test Category  
- **CRUD Operations:** [P0 Core Tests](./p0-core-tests.md)
- **Schema Discovery:** [P1 Essential Tests](./p1-essential-tests.md)
- **Advanced Search:** [P1 Essential Tests](./p1-essential-tests.md)
- **Relationship Queries:** [P2 Advanced Tests](./p2-advanced-tests.md)
- **Batch Operations:** [P2 Advanced Tests](./p2-advanced-tests.md)

#### By User Type
- **Test Executors:** Follow sequential order P0 → P1 → P2
- **Test Planners:** Review all test specifications for coverage assessment
- **Developers:** Focus on specific test categories relevant to feature development

### Support Materials

- **Test Data Setup:** [Reference Guide](../07-reference/test-data-setup.md)
- **Quick Commands:** [Command Reference](../07-reference/quick-commands.md)
- **Bug Reporting:** [Issue Templates](../06-bug-reporting.md)
- **Cleanup Utilities:** [Cleanup Guide](../07-reference/cleanup-utilities.md)

---

**Related Documentation:**
- [Back: Execution Process](../03-execution.md)
- [Reference: Quality Gates](../05-quality-gates.md)
- [Support: Test Data Setup](../07-reference/test-data-setup.md)
- [Templates: Bug Reporting](../06-bug-reporting.md)