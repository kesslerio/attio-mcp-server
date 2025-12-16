# Attio MCP Server Skills

Claude Skills that enhance LLM interactions with the Attio MCP server.

## Why Skills?

LLMs make predictable errors when working with Attio:

- Using display names instead of API slugs
- Forgetting arrays for multi-select fields
- Missing required field structures
- Not knowing valid option values

**Skills solve this** by giving Claude workspace-specific knowledge and universal patterns.

## Available Skills

| Skill                                                | Type      | Purpose                                 | Complexity                |
| ---------------------------------------------------- | --------- | --------------------------------------- | ------------------------- |
| [attio-mcp-usage](./attio-mcp-usage.md)              | Universal | Error prevention, workflow patterns     | Low - works out of box    |
| [attio-workspace-schema](./attio-workspace-skill.md) | Generated | YOUR workspace's attributes and options | Low - CLI generates it    |
| [attio-skill-generator](./attio-skill-generator.md)  | Meta      | Create custom workflow skills           | High - requires prompting |

## Quick Decision Guide

**"I'm setting up for the first time"**

1. Install `attio-mcp-usage` (patterns + error prevention)
2. Generate `attio-workspace-schema` with `npx attio-discover generate-skill --all --zip`

**"Claude keeps using wrong field names"**

- Regenerate `attio-workspace-schema` (your workspace may have changed)

**"I need a custom lead qualification workflow"**

- Use `attio-skill-generator` to create a tailored skill

**"I'm getting API errors"**

- Check `attio-mcp-usage` golden rules

## Skill Comparison

### attio-mcp-usage (Universal)

**What it provides:**

- 5 "NEVER do" rules (error prevention)
- 6 "ALWAYS do" best practices
- 7 real-world integration patterns
- Complete MCP tool reference

**Install method:** Copy from `skills/attio-mcp-usage/`

**Customization:** Minimal - works for any workspace

**Best for:** Everyone. Install this first.

### attio-workspace-schema (Generated)

**What it provides:**

- YOUR workspace's exact attribute slugs
- YOUR select/status option values
- YOUR complex type structures
- Display name to API slug mapping

**Install method:** Generate with CLI

```bash
npx attio-discover generate-skill --all --zip
```

**Customization:** Regenerate when workspace changes

**Best for:** Anyone whose workspace has custom attributes or needs Claude to know exact field values.

### attio-skill-generator (Advanced)

**What it provides:**

- Custom workflow skills (lead qualification, deal management, onboarding)
- Tailored to YOUR workflow steps
- Uses YOUR workspace schema

**Install method:** Python scripts + prompting Claude

```bash
pip install chevron pyyaml
# Then prompt Claude to use the skill
```

**Customization:** High - creates entirely new skills

**Best for:** Power users who want tailored workflow automation.

## Installing Skills

### Claude Desktop

**Option A: Drag and Drop (easiest)**

1. ZIP the skill folder (e.g., `attio-mcp-usage/`)
2. Drag the ZIP file into Claude Desktop chat window
3. Claude will prompt to install the skill

**Option B: Settings Menu**

1. Open Claude Desktop Settings (gear icon)
2. Navigate to **Skills**
3. Click **Install Skill**
4. Select the ZIP file or folder

### Claude Code (CLI)

Copy skill folders to your personal skills directory:

```bash
# Copy bundled skills to Claude Code
cp -r skills/attio-mcp-usage ~/.claude/skills/
cp -r skills/attio-skill-generator ~/.claude/skills/

# Copy generated workspace skill
cp -r output/attio-workspace-skill ~/.claude/skills/
```

Claude Code automatically discovers skills in `~/.claude/skills/`.

### Project-Level Skills

For team sharing, place skills in your project's `.claude/skills/` directory:

```bash
mkdir -p .claude/skills
cp -r skills/attio-mcp-usage .claude/skills/
```

## Recommended Setup

### Minimal Setup (Most Users)

```bash
# 1. Ensure API key is set (add to .env or environment)
echo "ATTIO_API_KEY=your_key_here" >> .env

# 2. Generate workspace schema
npx attio-discover generate-skill --all --zip

# 3. Import into Claude
# - Claude Desktop: Settings > Skills > Install Skill > Select ZIP
# - Claude Code: cp -r output/attio-workspace-skill ~/.claude/skills/
```

> **Security**: Ensure `.env` is in your `.gitignore` and never commit API keys to version control.

The `attio-mcp-usage` skill is bundled with the server.

### Full Setup (Power Users)

```bash
# 1. Ensure API key is set
echo "ATTIO_API_KEY=your_key_here" >> .env

# 2. Generate workspace schema
npx attio-discover generate-skill --all --zip

# 3. Install Python dependencies (for skill generator)
pip install chevron pyyaml

# 4. Install all skills
# Claude Desktop: Settings > Skills > Install Skill for each ZIP
# Claude Code: cp -r skills/* ~/.claude/skills/
```

Then prompt Claude:

```
Using the attio-skill-generator skill, create a Lead Qualification
workflow skill for my workspace
```

## How Skills Work Together

```
┌─────────────────────────────────────────────────────────────┐
│                    User Request                              │
│        "Update the deal stage for Acme Corp"                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              attio-mcp-usage                                 │
│   • HOW to structure the update                              │
│   • Error prevention (arrays, types, validation)             │
│   • Workflow pattern (find-then-update)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            attio-workspace-schema                            │
│   • WHAT attribute slugs to use (deal_stage)                 │
│   • WHAT option values are valid ("qualified", "proposal")   │
│   • WHAT fields are read-only                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Correct MCP Tool Call                           │
│   update-record with exact slugs and valid values            │
└─────────────────────────────────────────────────────────────┘
```

## Skill Files Location

```
attio-mcp-server/
├── skills/
│   ├── attio-mcp-usage/          # Universal patterns (bundled)
│   │   ├── SKILL.md
│   │   └── resources/
│   │       ├── golden-rules.md
│   │       ├── workflows.md
│   │       ├── tool-reference.md
│   │       └── integration-patterns.md
│   └── attio-skill-generator/    # Meta skill (bundled)
│       ├── SKILL.md
│       ├── resources/
│       │   ├── templates/
│       │   └── use-cases/
│       └── scripts/
└── output/
    └── attio-workspace-skill/    # Generated (you create this)
        ├── SKILL.md
        └── resources/
            ├── companies-attributes.md
            ├── people-attributes.md
            ├── deals-attributes.md
            └── complex-types.md
```

## Troubleshooting

### "Claude doesn't use the skills"

1. Verify skills are installed: ask "what skills do you have?"
2. Reference explicitly: "using the attio-mcp-usage skill, how do I..."
3. For Claude Desktop: check Settings > Skills shows them

### "Generated skill has wrong data"

Regenerate from fresh API data:

```bash
rm -rf ./output/attio-workspace-skill
npx attio-discover generate-skill --all --zip
```

### "Skill generator fails"

Check Python dependencies:

```bash
pip install chevron pyyaml
```

## Related Documentation

- [Getting Started Guide](../getting-started.md) - First-time MCP server setup
- [Attio Tools Reference](../../tools/attio-tools-reference.md) - Complete tool documentation
- [Troubleshooting](../troubleshooting.md) - Common issues and solutions
