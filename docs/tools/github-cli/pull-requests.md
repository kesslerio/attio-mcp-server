# Pull Requests

This module covers how to manage GitHub Pull Requests (PRs) using the GitHub CLI (`gh`).

## Table of Contents

1. [Basic PR Operations](#basic-pr-operations)
2. [Creating Pull Requests](#creating-pull-requests)
3. [Reviewing Pull Requests](#reviewing-pull-requests)
4. [Managing Pull Requests](#managing-pull-requests)
5. [PR Best Practices](#pr-best-practices)

## Basic PR Operations

### Listing and Viewing PRs

```sh
# List all open PRs
gh pr list

# List PRs with specific filters
gh pr list --assignee @me
gh pr list --label bug
gh pr list --state closed

# View a specific PR
gh pr view <number>

# View a PR in browser
gh pr view <number> --web

# View PR status with review details
gh pr status
```

### Working with PR Branches

```sh
# Checkout a PR branch
gh pr checkout <number>

# Create a new PR branch
git checkout -b feature/new-feature

# Get details of checked out PR
gh pr view
```

## Creating Pull Requests

```sh
# Create a PR interactively
gh pr create

# Create with title and body
gh pr create --title "Fix: Update rate limiting logic" --body "This PR fixes #123 by improving the rate limiting algorithm."

# Create with title, body, and labels
gh pr create --title "Feature: Add new API client" --body "This adds support for new API endpoints" --label enhancement,area:api

# Create a draft PR
gh pr create --draft

# Create PR linking to issue
gh pr create --title "Fix timezone handling" --body "Closes #42"

# Fill PR details from commit messages
gh pr create --fill
```

### PR Templates

When creating a PR interactively, `gh` will use your repository's PR template if one exists.

## Reviewing Pull Requests

```sh
# Check out a PR locally
gh pr checkout <number>

# View PR changes
gh pr diff <number>

# Add a review comment
gh pr review <number> --comment -b "This looks good but needs tests"

# Approve a PR
gh pr review <number> --approve

# Request changes
gh pr review <number> --request-changes -b "Please fix these issues before merging"
```

## Managing Pull Requests

```sh
# Merge a PR
gh pr merge <number>

# Merge with specific strategy
gh pr merge <number> --merge  # Create merge commit
gh pr merge <number> --squash  # Squash all commits
gh pr merge <number> --rebase  # Rebase and merge

# Close a PR without merging
gh pr close <number>

# Reopen a closed PR
gh pr reopen <number>

# Check for merge conflicts
gh pr checks <number>

# Add reviewers
gh pr edit <number> --add-reviewer username1,username2

# Add labels
gh pr edit <number> --add-label bug,area:api

# Edit PR title or body
gh pr edit <number> --title "New title" --body "Updated description"
```

## PR Best Practices

### Writing Good PR Descriptions

1. **Link Related Issues**: Always reference related issues with `Closes #123` or `Relates to #123`
2. **Explain the Changes**: Clearly explain what changes were made and why
3. **Include Testing Details**: Describe how the changes were tested
4. **Add Screenshots/Examples**: For UI changes or new features
5. **Mention Breaking Changes**: Highlight any breaking changes or migration steps

### PR Size Guidelines

- **Keep PRs Small**: Aim for PRs that can be reviewed in 30 minutes or less
- **Single Responsibility**: Each PR should address a single concern
- **Logical Commits**: Make logical, atomic commits with clear messages

### PR Review Flow

1. **Self-Review**: Always review your own PR before requesting reviews
2. **Automated Checks**: Make sure automated tests and linters pass
3. **Address Feedback**: Respond to all comments and fix requested changes
4. **Get Approvals**: Wait for required approvals before merging
5. **Squash History**: Consider squashing commits for a clean history

### Attio MCP Specific Guidelines

When creating PRs for the Attio MCP project:

1. **Reference Issues**: Always link to the related issue
2. **Follow Naming Convention**: Use the format `<type>: <description>` for PR titles
3. **Apply Labels**: Add appropriate labels (API area, priority level, etc.)
4. **Update Documentation**: Add or update documentation for new features
5. **Include Tests**: Ensure adequate test coverage for your changes
