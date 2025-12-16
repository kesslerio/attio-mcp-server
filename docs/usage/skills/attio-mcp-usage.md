# Attio MCP Usage Skill

Universal workflow patterns and error prevention for the Attio MCP server.

## Overview

The `attio-mcp-usage` skill teaches Claude **HOW** to work with Attio MCP tools effectively. It provides universal patterns that work across ANY Attio workspace, preventing common API errors and guiding multi-step workflows.

> **First skill to install**: This is your foundation skill. Install it before working with any Attio workspace.

## When to Use

| Scenario                                | Use This Skill                    |
| --------------------------------------- | --------------------------------- |
| Planning multi-step workflows           | Yes                               |
| Troubleshooting API errors              | Yes                               |
| Learning MCP tool syntax                | Yes                               |
| Building integrations                   | Yes                               |
| Need workspace-specific attribute names | No - use `attio-workspace-schema` |

## Installation

### Claude Desktop

**Option A: Drag and Drop**

1. ZIP the `skills/attio-mcp-usage/` folder
2. Drag the ZIP into Claude Desktop chat window
3. Confirm installation when prompted

**Option B: Settings Menu**

1. Open Settings (gear icon) > Skills
2. Click **Install Skill**
3. Select the ZIP or folder

### Claude Code (CLI)

```bash
# Copy to personal skills directory
cp -r skills/attio-mcp-usage ~/.claude/skills/

# Or for project-level (shared with team)
cp -r skills/attio-mcp-usage .claude/skills/
```

### Verify Installation

Ask Claude:

```
What are the golden rules for Attio MCP usage?
```

Claude should reference the error prevention system with NEVER/ALWAYS rules.

## What's Included

### Resource Files

| File                      | Purpose                                                          | Lines |
| ------------------------- | ---------------------------------------------------------------- | ----- |
| `golden-rules.md`         | Error prevention system (5 NEVER + 6 ALWAYS rules)               | ~326  |
| `workflows.md`            | Universal workflow patterns (find-or-create, batch update, etc.) | ~220  |
| `tool-reference.md`       | Complete MCP tool signatures and examples                        | ~747  |
| `integration-patterns.md` | 7 real-world workflow examples                                   | ~535  |

### Golden Rules Highlights

**NEVER Do These:**

1. Never update read-only fields (`record_id`, `created_at`, etc.)
2. Never forget arrays for multi-select fields
3. Never mix data types (strings vs numbers vs booleans)
4. Never skip UUID validation
5. Never use display names as API slugs

**ALWAYS Do These:**

1. Discover schema first - know your fields
2. Check the schema skill for workspace specifics
3. Validate before updating
4. Use exact option values for select/status fields
5. Verify field persistence after updates
6. Add context with notes

### Integration Patterns

Seven complete workflow patterns:

1. **Deal Pipeline Workflow** - 6-step deal progression
2. **List-Based Organization** - 5-step list management
3. **Lead Qualification** - 6-step lead scoring
4. **Bulk Data Import** - 6-step import pattern
5. **Deal Stage Automation** - 6-step automation
6. **Data Enrichment Pipeline** - Company/deal/person enrichment
7. **Error Handling Template** - Comprehensive try/catch pattern

## How It Works with Other Skills

```
attio-mcp-usage (this skill)
├── Teaches HOW to use MCP tools
├── Universal error prevention
└── Applies to ALL workspaces

attio-workspace-schema (companion)
├── Documents WHAT your workspace has
├── Specific attribute slugs
└── Specific option values

Together:
└── Usage skill tells you the patterns
└── Schema skill gives you the specifics
```

**Example workflow:**

1. Claude reads `attio-mcp-usage` to understand patterns
2. Claude reads `attio-workspace-schema` for your attribute names
3. Claude combines both to execute correctly

## Example Prompts

**Error troubleshooting:**

```
I'm getting "expects array" errors when updating companies.
What am I doing wrong?
```

**Learning patterns:**

```
How should I structure a find-or-create workflow for deals?
```

**Tool reference:**

```
What parameters does the records_search tool accept?
```

## Customization

This skill works out-of-the-box for most use cases. If you need to customize:

### Extending Golden Rules

Edit `skills/attio-mcp-usage/resources/golden-rules.md` to add workspace-specific rules:

```markdown
### 6. Never [Your Custom Rule]

**Your workspace-specific constraint here**
```

### Adding Workflow Patterns

Edit `skills/attio-mcp-usage/resources/integration-patterns.md`:

```markdown
## Pattern 8: [Your Custom Workflow]

### Steps

1. Step one
2. Step two
   ...
```

## Troubleshooting

### "Claude doesn't know my attribute names"

This skill provides **universal patterns**, not workspace-specific data. For your specific attribute names and option values, use the `attio-workspace-schema` skill:

```bash
npx attio-discover generate-skill --all --zip
```

### "Pattern doesn't match my workflow"

The patterns are templates. Adapt them to your specific use case by:

1. Keeping the error prevention rules
2. Adjusting the tool sequence for your needs
3. Using your workspace's actual attribute slugs

## Related Documentation

- [Attio Workspace Schema Skill](./attio-workspace-skill.md) - Generate workspace-specific documentation
- [Attio Skill Generator](./attio-skill-generator.md) - Create custom workflow skills
- [Skills Overview](./README.md) - All available skills
- [Attio Tools Reference](../../tools/attio-tools-reference.md) - Complete tool documentation
