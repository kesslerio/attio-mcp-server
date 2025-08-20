# Usability Tests - User Experience Validation

> **Priority:** Phase 2 - Usability Testing 👥  
> **Executor:** Fresh agent (unfamiliar with system)  
> **Duration:** 2-3 hours  
> **Focus:** Documentation clarity, parameter understanding, and user experience

## Overview

Usability testing validates that the Attio MCP Server tools are intuitive and well-documented for new users. This phase uses a "fresh agent" approach - someone unfamiliar with the system architecture - to identify documentation gaps and usability issues.

### Testing Philosophy

**Fresh Agent Approach:**
- Executor should be unfamiliar with system internals
- Tests user-facing documentation and tool descriptions
- Identifies parameter confusion and workflow obstacles
- Simulates real-world new user experience

### Test Prerequisites

- [ ] All functional testing (P0-P2) completed
- [ ] Fresh agent briefed only on basic objectives (no technical details)
- [ ] System accessible and stable
- [ ] Basic MCP tool list provided

## Usability Test Categories

### Category 1: Tool Discovery & Understanding

**Objective:** Validate that users can understand what tools do and when to use them

**Test Approach:**
1. **Tool Description Clarity**
   - Present agent with tool names and descriptions only
   - Ask agent to predict what each tool does
   - Compare predictions with actual tool functionality

2. **Use Case Identification**
   - Present common user scenarios
   - Ask agent to identify which tools they would use
   - Validate tool selection against intended usage

3. **Parameter Intuition**
   - Show tool parameter lists without documentation
   - Ask agent to predict what each parameter does
   - Test intuitive understanding of parameter names and types

**Success Criteria:**
- Agent correctly identifies tool purposes ≥80% of the time
- Parameter names are self-explanatory for basic use cases
- Tool descriptions match actual functionality

---

### Category 2: Documentation Completeness

**Objective:** Validate that documentation provides sufficient guidance for successful tool usage

**Test Approach:**
1. **Getting Started Experience**
   - Provide agent with basic "get started" documentation only
   - Ask them to complete simple tasks (search, create, update)
   - Document where they get stuck or confused

2. **Error Message Clarity**
   - Intentionally trigger common errors (invalid parameters, missing required fields)
   - Evaluate if error messages provide actionable guidance
   - Test if users can self-correct based on error feedback

3. **Example Quality**
   - Provide agent with documented examples
   - Ask them to modify examples for their own use cases
   - Test if examples cover common variations and edge cases

**Success Criteria:**
- Agent can complete basic tasks with documentation alone
- Error messages lead to successful problem resolution
- Examples can be adapted to new scenarios

---

### Category 3: Workflow Intuitiveness

**Objective:** Validate that common workflows are discoverable and logical

**Test Scenarios:**

#### Scenario 1: New Record Creation Workflow
**Task:** "Create a new company record and add a contact person"

**Evaluation Points:**
- Does agent know to use `get-attributes` first to discover fields?
- Can they construct valid `record_data` without extensive trial and error?
- Is the relationship between companies and people clear?

#### Scenario 2: Data Discovery Workflow  
**Task:** "Find all companies in the technology industry with more than 100 employees"

**Evaluation Points:**
- Does agent choose appropriate search tools?
- Can they construct effective search filters?
- Is the difference between basic and advanced search clear?

#### Scenario 3: Troubleshooting Workflow
**Task:** "A search is returning no results, but you know the data exists"

**Evaluation Points:**
- Does agent know how to debug search parameters?
- Can they identify and fix common search issues?
- Are troubleshooting resources discoverable?

**Success Criteria:**
- Agent completes workflows with minimal frustration
- Logical next steps are apparent at each stage
- Alternative approaches are discoverable

---

### Category 4: Parameter Clarity & Error Prevention

**Objective:** Validate that parameter requirements and formats are clear

**Test Focus Areas:**

#### Resource Type Parameters
- Are valid resource types clearly documented?
- Do error messages help when wrong resource types are used?
- Is the relationship between resource types and available operations clear?

#### Data Format Requirements  
- Are JSON format requirements clear for `record_data` parameters?
- Do examples show proper field naming and value formats?
- Are date format requirements specified and consistent?

#### Optional vs Required Parameters
- Is it clear which parameters are optional vs required?
- Do default values make sense and work as expected?
- Are parameter dependencies (if any) clearly documented?

**Success Criteria:**
- Agent can construct valid parameter combinations on first try ≥70% of the time
- Parameter validation errors are self-explanatory
- Documentation answers common "how do I..." questions

---

### Category 5: Edge Case Handling

**Objective:** Validate graceful handling of boundary conditions and edge cases

**Test Scenarios:**

#### Data Boundary Tests
- Empty result sets (searches with no matches)
- Large result sets (pagination behavior)
- Invalid or malformed input data
- Non-existent record IDs

#### System Boundary Tests
- Rate limiting behavior (if applicable)
- Network timeout scenarios
- Permission/authentication edge cases
- Concurrent operation handling

**Evaluation Criteria:**
- Error messages are helpful rather than cryptic
- System degrades gracefully under stress
- Users understand what went wrong and how to fix it

**Success Criteria:**
- Edge cases don't cause system crashes or data corruption
- Error messages provide actionable guidance
- Users can recover from edge case scenarios

## Usability Assessment Framework

### Scoring Methodology

Each usability category is scored on a 1-10 scale:

| Score | Assessment | Description |
|-------|------------|-------------|
| **9-10** | Excellent | Intuitive, self-explanatory, minimal friction |
| **7-8** | Good | Mostly clear, minor confusion points |
| **5-6** | Acceptable | Functional but requires some learning |
| **3-4** | Poor | Significant confusion, multiple friction points |
| **1-2** | Failing | Major usability barriers, unusable for new users |

### Overall Usability Metrics

- **Task Completion Rate:** % of tasks completed without assistance
- **Time to Competency:** How long until agent feels confident with basic operations
- **Error Recovery Rate:** % of errors that users can resolve independently
- **Documentation Effectiveness:** % of questions answered by existing documentation

### Success Thresholds

| Metric | Target | Acceptable | Concerning |
|---------|---------|------------|------------|
| **Task Completion** | ≥90% | ≥80% | <80% |
| **Time to Competency** | <30 min | <60 min | >60 min |
| **Error Recovery** | ≥80% | ≥70% | <70% |
| **Documentation Effectiveness** | ≥85% | ≥75% | <75% |

## Usability Report Template

```markdown
## Usability Test Report - [Date]

### Executive Summary
- Overall usability score: [X]/10
- Major usability barriers: [List]
- Key recommendations: [List]

### Category Results
- Tool Discovery: [Score]/10 - [Notes]
- Documentation: [Score]/10 - [Notes]  
- Workflow Intuition: [Score]/10 - [Notes]
- Parameter Clarity: [Score]/10 - [Notes]
- Edge Case Handling: [Score]/10 - [Notes]

### Critical Issues Found
1. [Issue description] - [Impact] - [Recommendation]
2. [Issue description] - [Impact] - [Recommendation]

### Enhancement Opportunities
1. [Opportunity] - [Expected benefit]
2. [Opportunity] - [Expected benefit]

### Recommendations
- **High Priority:** [Blocking usability issues]
- **Medium Priority:** [Friction reduction opportunities]  
- **Low Priority:** [Nice-to-have improvements]
```

---

**Related Documentation:**
- [Previous: P2 Advanced Tests](./p2-advanced-tests.md)
- [Back: Test Cases Overview](./index.md)
- [Templates: Bug Reporting](../06-bug-reporting.md)
- [Reference: Complete Test Plan](../index.md)