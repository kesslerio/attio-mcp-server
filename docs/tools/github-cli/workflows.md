# Workflows and Best Practices

This module covers GitHub workflow recommendations and standards for the Attio MCP project, including the automated workflow enforcement tools.

## Table of Contents

1. [Attio MCP GitHub Workflow](#attio-mcp-github-workflow)
2. [Branch Strategy](#branch-strategy)
3. [Commit Message Standards](#commit-message-standards)
4. [Issue Management Workflow](#issue-management-workflow)
5. [Workflow Enforcement Tools](#workflow-enforcement-tools)
6. [Common Workflows](#common-workflows)
7. [Workflow DON'Ts](#workflow-donts)

## Attio MCP GitHub Workflow

The Attio MCP project follows a standardized GitHub workflow that enforces consistency in issue management, branch naming, and commit message formats.

### Key Components

1. **Issue Templates**: Standardized templates for feature requests and bug reports
2. **Git Hooks**: Pre-commit hooks to validate workflow requirements 
3. **Validation Scripts**: Scripts to enforce standards
4. **Label System**: Comprehensive labeling system for organizing issues

### Workflow Documentation

For full workflow details, see the [`WORKFLOW.md`](../../WORKFLOW.md) file in the project root.

## Branch Strategy

- **NEVER work directly on main** except for critical hotfixes
- **Create feature branches** with consistent naming conventions
- **Branch Naming Format**: Use one of these prefixes:
  ```
  feature/descriptive-name
  fix/issue-description
  docs/what-is-documented
  refactor/what-is-refactored
  test/what-is-tested
  ```
- **Example**: `feature/add-people-api-support`

## Commit Message Standards

Every commit message must follow this format:

```
<Type>: <description> #<issue-number>

- Optional bullet points with more details
- Another point if needed
```

### Commit Type Prefixes

| Type | Description |
|------|-------------|
| `Feature:` | New functionality |
| `Fix:` | Bug fixes |
| `Docs:` | Documentation changes |
| `Documentation:` | Documentation changes (alternative) |
| `Refactor:` | Code restructuring |
| `Test:` | Test additions/modifications |
| `Chore:` | Routine maintenance tasks |

### Commit Message Examples

```
Feature: Implement People API client #42

Fix: Resolve race condition in rate limiter #13

Docs: Update API documentation with rate limiting details #28
```

### Hotfixes

For critical hotfixes, include `[HOTFIX]` in the commit message:

```
Fix: [HOTFIX] Resolve critical security vulnerability in API auth
```

## Issue Management Workflow

### Issue Creation Checklist

1. **Search First**: Look for existing issues before creating new ones
2. **Use Templates**: Always use the provided issue templates
3. **Descriptive Titles**: Use the format `type: Clear description`
4. **Required Labels**: Add all required label categories:
   - Priority label (P0-P4)
   - Type label (bug, feature, enhancement, etc.)
   - Area label (appropriate to the issue)
   - Status label (usually start with status:untriaged)

### Issue Closure Requirements

Before closing an issue, ensure:

1. **All criteria checked off**: Mark all checkboxes in the issue as complete
2. **Implementation comments**: Add a detailed comment with:
   - Implementation details
   - Key implementation elements (3+ points)
   - Lessons learned (3+ insights)
   - Challenges/solutions
   - Future considerations
3. **Verification statement**: Add a statement:
   ```
   ✅ VERIFICATION: I have completed all GitHub documentation requirements including: [list requirements]
   ```

## Workflow Enforcement Tools

The Attio MCP project includes automated tools to enforce workflow requirements:

### Pre-commit Hook

The pre-commit hook validates:
- Branch naming conventions
- Commit message format
- Issue references

It runs automatically during commits or can be manually triggered:

```sh
./build/validate_workflow.py --pre-commit
```

### Issue Validation

Verify that an issue meets all closure requirements:

```sh
./build/validate_workflow.py --issue-close <issue-id>

# Or use the Git alias
git issue-validate <issue-id>
```

### Setup Scripts

The project includes scripts to set up and manage the workflow system:

```sh
# Set up workflow tools
./build/setup_workflow.sh

# Set up GitHub labels
./build/setup_labels.sh
./build/setup_additional_labels.sh
```

### Husky Integration

The workflow validation is integrated with Husky for reliable Git hooks management. 

## Common Workflows

### Feature Development Workflow

1. **Create an issue** using the feature request template
2. **Label appropriately** with priority, type, area, and status
3. **Create a feature branch**: `git checkout -b feature/descriptive-name`
4. **Implement the feature** with tests and documentation
5. **Commit with proper format**: `Feature: Implement X functionality #123`
6. **Create a PR** referencing the issue: `Closes #123`
7. **Address feedback** during review
8. **Update issue** with implementation details before closing

### Bug Fix Workflow

1. **Create an issue** using the bug report template
2. **Label appropriately** with priority, type, area, and status
3. **Create a fix branch**: `git checkout -b fix/issue-description`
4. **Implement the fix** with tests
5. **Commit with proper format**: `Fix: Resolve X issue #123`
6. **Create a PR** referencing the issue: `Closes #123`
7. **Address feedback** during review
8. **Update issue** with implementation details before closing

### Documentation Update Workflow

1. **Create or use an existing issue** for documentation
2. **Create a docs branch**: `git checkout -b docs/what-is-documented`
3. **Make documentation changes**
4. **Commit with proper format**: `Docs: Update X documentation #123`
5. **Create a PR** referencing the issue

## Workflow DON'Ts

- DON'T create new issue templates for specific features or components
- DON'T document milestones in markdown files (use GitHub Milestones instead)
- DON'T create alternative workflows for specific project components
- DON'T bypass the established label system with custom solutions
- DON'T create separate process documentation for individual features
- DON'T attempt operations without verifying paths/files exist first
- DON'T create duplicate issues or PRs (check existing ones first)
- DON'T continue with failed commands without resolving root causes
