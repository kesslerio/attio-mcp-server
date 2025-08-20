# Bug Reporting & Issue Tracking

> **Context:** Standardized processes for documenting and tracking issues found during testing  
> **Prerequisites:** [Test Cases](./04-test-cases/) - Understanding of test execution context  
> **Usage:** All testing personas for consistent issue documentation and tracking

## Overview

This document provides standardized templates and processes for documenting bugs, issues, and improvement opportunities discovered during QA testing. Consistent reporting enables efficient triage, resolution, and tracking of system issues.

## Bug Severity Levels

### Severity Classification Framework

| Level | Description | Examples | Response Time |
|-------|-------------|----------|---------------|
| **Critical** | System unusable | Tool crashes, data corruption | Immediate |
| **High** | Major functionality broken | Core CRUD operations fail | Same day |
| **Medium** | Feature impaired | Search returns wrong results | 2-3 days |
| **Low** | Minor issues | Formatting problems | Next sprint |

### Severity Assessment Guidelines

#### Critical Severity
**Criteria:**
- System completely unusable or inaccessible
- Data corruption or loss occurs
- Security vulnerabilities exposed
- Complete tool failures that block all testing

**Examples:**
- MCP server crashes when executing any tool
- `create-record` tool corrupts existing data
- Authentication bypassed or credentials exposed
- All search operations return server errors

#### High Severity  
**Criteria:**
- Major functionality broken or severely limited
- Core workflows cannot be completed
- Multiple users impacted
- Significant data accuracy issues

**Examples:**
- `search-records` returns no results when data exists
- `update-record` fails for all resource types
- Required fields not properly validated
- Performance degradation >500% from baseline

#### Medium Severity
**Criteria:**
- Feature partially working but with limitations
- Workarounds available but inconvenient
- Limited user impact
- Non-critical data accuracy issues

**Examples:**
- Advanced search filters work but sorting is incorrect  
- Error messages unclear but not misleading
- Optional parameters ignored without warning
- Performance slower than expected but functional

#### Low Severity
**Criteria:**
- Cosmetic or minor functional issues
- Minimal user impact
- Easy workarounds available
- Documentation or formatting problems

**Examples:**
- Inconsistent response formatting
- Typos in error messages
- Missing optional parameters in examples
- Response times slightly slower than optimal

## Bug Report Template

### Standard Bug Report Format

When bugs are found, document them using this template:

```markdown
## Bug Report - [Tool Name] - [Date]

**Bug ID:** BUG-YYYY-MM-DD-###  
**Tool:** [tool-name]  
**Severity:** [Critical/High/Medium/Low]  
**Test Case:** [TC-XXX]  
**Priority Level:** [P0/P1/P2/Usability]

### Summary
[One-line description of the issue]

### Expected Behavior  
[What should happen]  

### Actual Behavior
[What actually happened]  

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Result]

### Test Environment
- **MCP Server Version:** [version]
- **Test Data Used:** [description]
- **Timestamp:** [YYYY-MM-DD HH:MM:SS]

### Parameters Used
```bash
[Exact command/parameters that triggered the issue]
```

### Error Message/Output
```
[Full error text or unexpected output]
```

### Impact Assessment
- **User Workflows Affected:** [description]
- **Workaround Available:** [Yes/No - describe if yes]
- **Data Integrity Risk:** [Yes/No - describe if yes]

### Additional Context
[Screenshots, logs, related issues, etc.]

### Suggested Resolution
[If apparent, suggest potential fix or investigation direction]
```

### Bug Report Examples

#### Critical Bug Example
```markdown
## Bug Report - create-record - 2024-08-20

**Bug ID:** BUG-2024-08-20-001  
**Tool:** create-record  
**Severity:** Critical  
**Test Case:** TC-003  
**Priority Level:** P0

### Summary
create-record tool crashes MCP server when creating company records

### Expected Behavior  
Should create new company record and return confirmation with record ID

### Actual Behavior
MCP server terminates with connection error, no record created

### Steps to Reproduce
1. Execute: `mcp__attio__create-record resource_type="companies" record_data='{"name": "Test Company"}'`
2. Server connection drops immediately
3. Subsequent tool calls fail until server restart

### Impact Assessment
- **User Workflows Affected:** All record creation workflows blocked
- **Workaround Available:** No - server restart required
- **Data Integrity Risk:** No - no data corruption detected
```

#### Medium Bug Example  
```markdown
## Bug Report - advanced-search - 2024-08-20

**Bug ID:** BUG-2024-08-20-002  
**Tool:** advanced-search  
**Severity:** Medium  
**Test Case:** TC-009  
**Priority Level:** P1

### Summary
Advanced search sorting parameter ignored, results return unsorted

### Expected Behavior  
Results should be sorted by specified field and order

### Actual Behavior
Results returned in random order despite sort_by and sort_order parameters

### Parameters Used
```bash
mcp__attio__advanced-search resource_type="companies" \
  filters='[{"field": "employee_count", "operator": ">", "value": "50"}]' \
  sort_by="name" sort_order="asc"
```

### Impact Assessment
- **User Workflows Affected:** Users expecting sorted results for analysis
- **Workaround Available:** Yes - manual sorting of results
- **Data Integrity Risk:** No - data accuracy unaffected
```

## Issue Tracking Process

### Bug Lifecycle

1. **Discovery** → Document using standard template
2. **Triage** → Assign severity and priority
3. **Investigation** → Technical analysis and root cause
4. **Resolution** → Fix development and testing  
5. **Verification** → Confirm fix resolves issue
6. **Closure** → Update documentation and close

### Triage Guidelines

#### Immediate Actions (Critical/High)
- [ ] Stop current testing if Critical severity
- [ ] Document full reproduction steps
- [ ] Notify technical lead immediately  
- [ ] Preserve error logs and system state
- [ ] Identify workarounds if available

#### Standard Actions (Medium/Low)
- [ ] Complete current test before documenting
- [ ] Document with standard template
- [ ] Continue testing unless blocking
- [ ] Batch report with other findings

### Issue Tracking Tools

**Primary Tracking:** GitHub Issues  
**Labels to Use:**
- `bug`, `enhancement`, `documentation`
- `P0-critical`, `P1-high`, `P2-medium`, `P3-low`
- `qa-testing`, `usability`, `performance`

**Cross-References:**
- Link to relevant test cases: `Related to TC-XXX`
- Link to quality gates: `Affects P0/P1/P2 criteria`
- Link to related issues: `Duplicate of #XXX` or `Related to #XXX`

## Enhancement Opportunity Template

For non-bug improvements discovered during testing:

```markdown
## Enhancement Opportunity - [Area] - [Date]

**Enhancement ID:** ENH-YYYY-MM-DD-###  
**Category:** [Usability/Performance/Documentation/Feature]  
**Discovery Context:** [Test case or scenario where identified]

### Current State
[How it works now]

### Proposed Enhancement
[How it could work better]

### Business Value
[Why this improvement would be valuable]

### Implementation Effort
[Rough estimate: Low/Medium/High]

### Success Metrics
[How to measure improvement success]
```

## Reporting Summary Template

### Test Session Bug Summary

```markdown
# Bug Report Summary - [Date]

## Overall Statistics
- **Total Issues Found:** [X]
- **Critical:** [X] | **High:** [X] | **Medium:** [X] | **Low:** [X]
- **P0 Blocking Issues:** [X]
- **P1 Production Impact:** [X]

## Critical Issues Requiring Immediate Action
1. [BUG-ID] - [Brief description] - [Impact]
2. [BUG-ID] - [Brief description] - [Impact]

## Production Readiness Impact
- **P0 Quality Gate:** [PASS/FAIL] - [Details if failed]
- **P1 Quality Gate:** [PASS/FAIL] - [Details if <80%]
- **Overall Recommendation:** [GO/NO-GO/CONDITIONAL]

## Enhancement Opportunities
1. [ENH-ID] - [Brief description] - [Value]
2. [ENH-ID] - [Brief description] - [Value]

## Next Steps
- [ ] [Action item with owner and timeline]
- [ ] [Action item with owner and timeline]
```

---

**Related Documentation:**
- [Previous: Quality Gates & Success Criteria](./05-quality-gates.md)
- [Reference: Test Cases](./04-test-cases/)
- [Back: Execution Process](./03-execution.md)
- [Next: Reference Materials](./07-reference/)