# Working with Issues and Labels

This module covers how to manage GitHub issues and labels using the GitHub CLI (`gh`).

## Table of Contents

1. [Working with Issues](#working-with-issues)
2. [Issue Templates](#issue-templates)
3. [Working with Labels](#working-with-labels)
4. [Attio MCP Label Structure](#attio-mcp-label-structure)

## Working with Issues

### Listing and Viewing Issues

```sh
# List issues
gh issue list

# List issues with specific labels
gh issue list --label "bug,area:api"

# List issues assigned to you
gh issue list --assignee @me

# View a specific issue
gh issue view <number>

# View an issue in browser
gh issue view <number> --web
```

### Creating Issues

```sh
# Interactive mode
gh issue create

# Non-interactive with all parameters
gh issue create --title "type: Clear description" --body "Detailed description..." --label existing-label --assignee username

# IMPORTANT: Only use existing labels - do NOT create new labels inline
# Run gh label list to see available labels first
```

### Managing Issues

```sh
# Comment on an issue
gh issue comment <number> --body "Your comment here"

# Close an issue
gh issue close <number>

# Reopen an issue
gh issue reopen <number>

# Edit an issue
gh issue edit <number> --title "New title" --body "New description"

# Add labels to an issue
gh issue edit <number> --add-label "bug,P1,area:api"

# Remove labels from an issue
gh issue edit <number> --remove-label "bug"

# Assign an issue
gh issue edit <number> --add-assignee username

# Search for issues
gh issue list --search "keywords in:title,body"
```

## Issue Templates

Attio MCP provides standardized issue templates located in `.github/ISSUE_TEMPLATE/` directory:

1. **Feature Request Template** - `.github/ISSUE_TEMPLATE/feature_request.md`
2. **Bug Report Template** - `.github/ISSUE_TEMPLATE/bug_report.md`

These templates enforce project standards and ensure all required information is included.

## Working with Labels

```sh
# List all labels
gh label list

# Create a new label
gh label create "label-name" --color "#RRGGBB" --description "Description"

# Delete a label
gh label delete "label-name"

# Clone labels from another repository
gh label clone <source-repo>
```

## Attio MCP Label Structure

The Attio MCP project uses a standardized set of labels to categorize issues and pull requests:

### Priority Labels

| Label | Description |
|-------|-------------|
| `P0` | Critical priority (service down, security issue) |
| `P1` | High priority (blocking functionality) |
| `P2` | Medium priority (important but not blocking) |
| `P3` | Low priority (minor improvements) |
| `P4` | Trivial priority (cosmetic, nice-to-have) |

### Type Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working as expected |
| `feature` | New feature or request |
| `enhancement` | Improvement to existing functionality |
| `documentation` | Documentation improvements |
| `test` | Test improvements |

### Status Labels

| Label | Description |
|-------|-------------|
| `status:ready` | Ready for implementation |
| `status:in-progress` | Currently being worked on |
| `status:blocked` | Cannot proceed due to dependencies |
| `status:needs-info` | Requires additional information |
| `status:review` | Ready for or in review |
| `status:untriaged` | Not yet assessed |

### Area Labels

**Module Areas:**
- `area:core` - Core module
- `area:api` - API functionality
- `area:build` - Build system
- `area:dist` - Distribution

**API-Specific Areas:**
- `area:api:people` - People API functionality
- `area:api:lists` - Lists API functionality
- `area:api:notes` - Notes API functionality
- `area:api:objects` - Objects API functionality
- `area:api:records` - Records API functionality
- `area:api:tasks` - Tasks API functionality

**Content Areas:**
- `area:documentation` - Documentation
- `area:testing` - Testing
- `area:performance` - Performance
- `area:refactor` - Refactoring

**Functional Areas:**
- `area:extension` - MCP extension 
- `area:integration` - Integration with other systems
- `area:security` - Security concerns
- `area:rate-limiting` - API rate limiting
- `area:error-handling` - Error handling
- `area:logging` - Logging functionality
