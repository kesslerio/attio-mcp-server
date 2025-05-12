# Projects and Milestones

This module covers how to manage GitHub Projects and Milestones using the GitHub CLI (`gh`).

## Table of Contents

1. [Projects](#projects)
2. [Milestones](#milestones)
3. [Best Practices for Organization](#best-practices-for-organization)

## Projects

GitHub Projects (beta) are flexible tables and boards for planning and tracking your work. The `gh project` CLI lets you manage projects, views, items, and fields directly from the terminal.

> **IMPORTANT NOTE ON COMMON ERRORS**: 
> The GitHub CLI project commands have specific syntax requirements:
> - Project numbers must be provided without quotes (use `2` not `"2"`)
> - Owner must be specified with `--owner` (the `-o` shorthand doesn't work with projects)
> - When adding items, full URLs must be used (e.g., `https://github.com/owner/repo/issues/123`)
> - Project IDs are numeric and different from human-readable project names
> - Commands will fail silently or with unclear errors if formatting is incorrect

### List Projects

```sh
# List organization projects
gh project list --owner kesslerio

# List your projects (workaround with current username)
gh project list --owner "$(gh api user | jq -r .login)"
```

### View Project Details

```sh
# View project information
gh project view 2 --owner kesslerio

# View project field configuration
gh project field-list 2 --owner kesslerio
```

### Managing Projects

```sh
# Create a new project
gh project create --title "Project Name" --owner kesslerio

# Delete a project (CAUTION!)
gh project delete 2 --owner kesslerio

# CONFIRM WITHOUT PROMPT:
gh project delete 2 --owner kesslerio --yes
```

### Working with Project Items

```sh
# Add an issue to a project
gh project item-add 2 --owner kesslerio --url https://github.com/kesslerio/attio-mcp/issues/1

# List items in a project
gh project item-list 2 --owner kesslerio

# Archive project item
gh project item-archive 2 --owner kesslerio --id <item-id>

# Edit a field value
gh project item-edit 2 --owner kesslerio --id <item-id> --field-id <field-id> --text "New Value"
```

### Tips

- Use `--format json` for scripting and automation
- Use `--help` with any command for more options

## Milestones

Milestones are useful for tracking progress toward a specific goal, such as a feature release, sprint, or project phase.

### Usage

Milestones in the GitHub CLI require the installation of an extension:

```sh
# Install the gh-milestone extension
gh extension install valeriobelli/gh-milestone
```

By default, this extension uses the GitHub's Access Token of the current user for the host github.com.

### Creating and Managing Milestones

```sh
# Create a new milestone - Interactive mode
gh milestone create

# Create with flags
gh milestone create --title "v1.0.0" --description "This is a description" --due-date 2025-06-01

# List milestones
gh milestone list
gh milestone ls

# List closed Milestones
gh milestone list --state closed

# List milestones of specific repo
gh milestone list --repo kesslerio/attio-mcp

# Search by a pattern
gh milestone list --query "API"
```

### Working with Milestone Data

```sh
# Print milestones as JSON
gh milestone list --json id
gh milestone list --json id,progressPercentage --json number

# Access Milestone attributes via jq
gh milestone list --json id,progressPercentage --json number --jq ".[0].id"

# Edit a milestone
gh milestone edit <milestone number> --title "New title"
gh milestone edit <milestone number> --title "New title" --repo kesslerio/attio-mcp

# View a milestone
gh milestone view <milestone number>
gh milestone view <milestone number> --repo kesslerio/attio-mcp

# Delete milestone (Interactive mode)
gh milestone delete <milestone number>

# Delete milestone (Automatic)
gh milestone delete <milestone number> --confirm
gh milestone delete <milestone number> --confirm --repo kesslerio/attio-mcp
```

## Best Practices for Organization

### When to Use Projects vs Milestones

#### Projects
- **Purpose:** Track ongoing work and current status across multiple repositories or topics.
- **Use For:**
    - Cross-repository initiative tracking
    - Continuous iterative work
    - Work that spans multiple milestones or releases
    - Long-term objectives with varying task types

#### Milestones
- **Purpose:** Grouping issues and pull requests together to track progress towards a specific, larger goal, often time-bound or version-related.
- **Use For:**
    - **Releases:** Tracking all work required for a specific version release (e.g., "v1.2.0 Release").
    - **Specific Feature Completion:** Grouping all issues related to developing and releasing a specific feature.
    - **Major Features/Epics:** Tracking the completion of significant new capabilities.

### Organization Best Practices

1. **Consistent Naming**: Use consistent naming conventions for projects and milestones
2. **Clear Descriptions**: Always include clear descriptions
3. **Appropriate Scope**: Keep milestones focused and achievable
4. **Regular Updates**: Update project boards and milestone progress regularly
5. **Track Dependencies**: Use projects to track dependencies between issues
