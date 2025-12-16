# Attio Workspace Schema Skill

Generate workspace-specific documentation from your Attio workspace using the CLI tool.

## Overview

The `attio-discover generate-skill` CLI command creates a Claude Skill that documents YOUR workspace's exact:

- Attribute names (display name to API slug mapping)
- Select/status option values
- Complex type structures (location, phone, etc.)
- Read-only vs writable fields

> **Solves the #1 LLM error**: Using display names instead of API slugs. This skill gives Claude the exact values to use.

## When to Use

| Scenario                       | Use This Tool                    |
| ------------------------------ | -------------------------------- |
| Setting up a new workspace     | Yes - generate once              |
| Attributes changed in Attio    | Yes - regenerate                 |
| Claude using wrong field names | Yes - regenerate                 |
| Need universal patterns        | No - use `attio-mcp-usage`       |
| Need custom workflows          | No - use `attio-skill-generator` |

## Quick Start

```bash
# Generate skill for all Phase 1 objects (companies, people, deals)
npx attio-discover generate-skill --all --zip

# Output: ./output/attio-workspace-skill.zip
```

Then import the ZIP into Claude Desktop or copy the folder for Claude Code.

## CLI Reference

### Basic Syntax

```bash
npx attio-discover generate-skill [OPTIONS]
```

### Options

| Option                 | Short | Type    | Default         | Description                                            |
| ---------------------- | ----- | ------- | --------------- | ------------------------------------------------------ |
| `--object`             | `-o`  | string  | -               | Single object to generate (e.g., `companies`)          |
| `--all`                | `-a`  | boolean | false           | Generate for Phase 1 objects: companies, people, deals |
| `--format`             | `-f`  | choice  | `skill`         | Output format: `skill`, `markdown`, or `json`          |
| `--output`             | -     | string  | `./output`      | Output directory path                                  |
| `--zip`                | `-z`  | boolean | false           | Package as ZIP file (ready for Claude upload)          |
| `--max-options`        | -     | number  | 20              | Max select/status options per attribute                |
| `--option-fetch-delay` | -     | number  | 100             | Delay between attribute option fetches (ms)            |
| `--include-archived`   | -     | boolean | false           | Include archived options in output                     |
| `--api-key`            | `-k`  | string  | `ATTIO_API_KEY` | Attio API key (env var preferred)                      |

### Examples

```bash
# Generate for companies only
npx attio-discover generate-skill --object companies

# Generate as plain markdown (for non-Claude LLMs)
npx attio-discover generate-skill --all --format markdown

# Generate as JSON (machine-readable)
npx attio-discover generate-skill --all --format json

# Include archived options
npx attio-discover generate-skill --all --include-archived

# Custom output directory
npx attio-discover generate-skill --all --output ./my-skills

# Reduce delay between option fetches (higher-rate API tiers)
npx attio-discover generate-skill --all --option-fetch-delay 50
```

## Output Formats

### Claude Skill (default)

Creates a structured skill directory:

```
attio-workspace-skill/
├── SKILL.md                          # Main skill definition
├── resources/
│   ├── companies-attributes.md       # Companies attribute reference
│   ├── people-attributes.md          # People attribute reference
│   ├── deals-attributes.md           # Deals attribute reference
│   └── complex-types.md              # Shared complex type structures
```

**Benefits:**

- Progressive disclosure (Claude loads only what it needs)
- Reduces token usage (~2k per object vs ~10k monolithic)
- Structured for skill routing

### Markdown

Single file: `attio-workspace-schema.md`

**Use for:** Non-Claude LLMs, documentation, reference

### JSON

Single file: `attio-workspace-schema.json`

**Use for:** Programmatic access, tooling integration

## Installation

### Step 1: Generate the Skill

```bash
# Option A: Set API key in environment
export ATTIO_API_KEY=your_key_here

# Option B: Add to .env file (recommended)
echo "ATTIO_API_KEY=your_key_here" >> .env

# Generate and package as ZIP
npx attio-discover generate-skill --all --zip
```

> **Tip**: The CLI reads `ATTIO_API_KEY` from your `.env` file automatically.

### Step 2: Import into Claude

**Claude Desktop:**

- **Drag and Drop**: Drag `./output/attio-workspace-skill.zip` into chat window
- **Or Settings**: Settings > Skills > Install Skill > Select ZIP

**Claude Code (CLI):**

```bash
# Copy to personal skills directory
cp -r output/attio-workspace-skill ~/.claude/skills/

# Or for project-level (shared with team)
cp -r output/attio-workspace-skill .claude/skills/
```

### Step 3: Verify

Ask Claude:

```
What are the available attributes for companies in my Attio workspace?
```

Claude should list your workspace-specific attributes with API slugs.

## What Gets Generated

### Attribute Reference

For each object, the generated skill includes:

| Information  | Example                    |
| ------------ | -------------------------- |
| Display Name | "Lead Type"                |
| API Slug     | `lead_type`                |
| Type         | select, text, number, etc. |
| Required     | Yes/No                     |
| Writable     | Yes/No (read-only marked)  |
| Multi-select | Yes/No                     |
| Options      | For select/status fields   |

### Select/Status Options

```markdown
#### lead_type (select)

| Option     | API Value    |
| ---------- | ------------ |
| Enterprise | `enterprise` |
| SMB        | `smb`        |
| Startup    | `startup`    |
```

### Complex Types

Documents structures for:

- **Location**: 10 required fields with null defaults
- **Personal Name**: first_name, last_name, full_name parsing
- **Phone Number**: country_code, number format
- **Email Address**: email_address field structure

## Progressive Disclosure

The skill uses progressive disclosure to minimize token usage:

1. Claude reads `SKILL.md` (small, routing logic)
2. When working with companies, Claude loads `companies-attributes.md`
3. Only loads other objects when needed

**Result:** ~2,000 tokens per object instead of ~10,000 for everything.

## Regenerating

Regenerate when:

- You add/remove attributes in Attio
- Select/status options change
- You switch workspaces

```bash
# Delete old output and regenerate
rm -rf ./output/attio-workspace-skill
npx attio-discover generate-skill --all --zip
```

## How It Works with Other Skills

```
attio-workspace-schema (this skill)
├── Documents YOUR workspace
├── Specific attribute slugs
├── Specific option values
└── Generated by CLI

attio-mcp-usage (companion)
├── Universal HOW-TO patterns
├── Error prevention rules
└── Works with any workspace

Together:
└── Schema skill provides the WHAT
└── Usage skill provides the HOW
```

## Troubleshooting

### "No API key provided"

```bash
# Add to .env (recommended)
echo "ATTIO_API_KEY=your_key_here" >> .env

# Or set in environment
export ATTIO_API_KEY=your_key_here

# Or pass directly
npx attio-discover generate-skill --all --api-key your_key_here
```

### "Objects are experimental"

Phase 1 objects are: `companies`, `people`, `deals`. Other objects work but are less tested:

```bash
# Non-Phase 1 objects show a warning but still generate
npx attio-discover generate-skill --object tasks
```

### "Claude uses wrong attribute names"

1. Verify the skill is installed: ask Claude "what skills do you have?"
2. Regenerate if your workspace changed
3. Ensure Claude references the skill: "using the attio-workspace-schema skill, what are..."

### "Too many options truncated"

Increase the limit:

```bash
npx attio-discover generate-skill --all --max-options 50
```

## Related Documentation

- [Attio MCP Usage Skill](./attio-mcp-usage.md) - Universal patterns and error prevention
- [Attio Skill Generator](./attio-skill-generator.md) - Create custom workflow skills
- [Skills Overview](./README.md) - All available skills
- [Getting Started Guide](../getting-started.md) - First-time setup
