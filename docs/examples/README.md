# Issue Templates and Examples

This directory contains examples and templates for creating well-structured issues in the Attio MCP Server repository.

## Available Templates

| Template | Description | Use Case |
|----------|-------------|----------|
| [Comprehensive Issue Template](./issue-template.md) | Full example of a well-structured issue | General reference for all issue types |
| [Bug Issue Template](./bug-issue-template.md) | Example of a bug report | Reporting defects and unexpected behavior |
| [Enhancement Issue Template](./enhancement-issue-template.md) | Example of an enhancement request | Requesting improvements to existing functionality |

## Quick Reference

### Issue Types and Prefixes

- **Feature**: New functionality (e.g., "Feature: Implement Tasks API")
- **Fix**: Bug fixes (e.g., "Fix: People search not working with email addresses")
- **Enhancement**: Improvements to existing features (e.g., "Enhancement: Add pagination to list responses")
- **Docs**: Documentation-only changes (e.g., "Docs: Update API reference for People tools")
- **Refactor**: Code changes that neither fix bugs nor add features (e.g., "Refactor: Reorganize API operations")
- **Test**: Adding or updating tests (e.g., "Test: Add unit tests for API error handling")
- **Chore**: Maintenance tasks (e.g., "Chore: Update dependencies")

### Required Sections

A well-structured issue should include:

1. **Title**: Clear and concise with appropriate prefix
2. **Overview**: Brief summary of the issue
3. **Problem Statement**: Detailed description of the problem or requirement
4. **Implementation Details** (for features/enhancements) or **Steps to Reproduce** (for bugs)
5. **Acceptance Criteria**: Checklist of conditions to satisfy
6. **Related Issues**: Links to related issues or PRs

### Labels and Prioritization

- **Priority Labels**:
  - `P0`: Critical (service down, security issue)
  - `P1`: High (blocking functionality)
  - `P2`: Medium (important but not blocking)
  - `P3`: Low (minor improvements)
  - `P4`/`P5`: Trivial (cosmetic, nice-to-have)

- **Type Labels**:
  - `bug`: Incorrect functionality
  - `feature`: New capability
  - `enhancement`: Improvement to existing feature
  - `documentation`: Documentation updates
  - `test`: Test improvements

- **Status Labels**:
  - `status:blocked`: Work cannot proceed due to dependencies or blockers
  - `status:in-progress`: Work is currently being actively worked on
  - `status:ready`: Ready for implementation or review
  - `status:review`: Ready for or currently under review
  - `status:needs-info`: Requires additional information to proceed
  - `status:untriaged`: Not yet assessed or categorized

- **Area Labels**:
  - Module: `area:core`, `area:api`, `area:build`, `area:dist`
  - Content: `area:documentation`, `area:testing`, `area:performance`, `area:refactor`
  - API-specific: `area:api:people`, `area:api:lists`, etc.
  - Functional: `area:extension`, `area:integration`, `area:security`, etc.

## Issue Creation Workflow

1. **Search First**: Check if a similar issue already exists
2. **Select Template**: Choose the appropriate issue template
3. **Fill in Details**: Complete all required sections
4. **Add Labels**: Apply appropriate labels for type, priority, status, and area
5. **Link Related Issues**: Reference any related issues
6. **Assign (Optional)**: Assign to yourself or appropriate team member if known
7. **Milestone (Optional)**: Add to a milestone if applicable

## Tips for Effective Issues

1. **Be Specific**: Avoid vague descriptions
2. **Use Examples**: Include code snippets or screenshots when helpful
3. **Consider Edge Cases**: Think about potential complications
4. **Break Down Large Issues**: Split complex issues into smaller, manageable parts
5. **Focus on Outcomes**: Describe what needs to be achieved, not just how
6. **Follow Up**: Respond to questions and update the issue as needed

## Examples of Good vs. Poor Issues

### Good Example

```markdown
# Fix: People Search Not Working with Email Addresses

## Overview
The `search-people` tool fails to find people when searching by email address, even when the email exists in the database.

## Problem Statement
When users search for people using an email address, the search returns no results despite the person existing in the database. This is due to the search filter only including the name field.

## Steps to Reproduce
1. Create a person with email "john@example.com"
2. Use the `search-people` tool with query "john@example.com"
3. Observe that no results are returned

## Proposed Solution
Update the search filter to include email and phone fields when searching people.

## Acceptance Criteria
- [ ] People can be found by searching with their email address
- [ ] People can be found by searching with their phone number
- [ ] Documentation is updated to reflect new search capabilities
- [ ] All tests pass

## Related Issues
- #15 Enhance People search functionality
```

### Poor Example

```markdown
# Search not working

Email search doesn't work. Please fix.

```

The poor example lacks specific details, steps to reproduce, proposed solution, and acceptance criteria, making it difficult for developers to understand and address the issue.