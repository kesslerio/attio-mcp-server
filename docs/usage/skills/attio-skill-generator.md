# Attio Skill Generator

Generate customized Claude Skills for your Attio workspace workflows.

## Overview

The `attio-skill-generator` is a **Python meta-skill** that creates workflow-specific skills for common Attio use cases like lead qualification, deal management, and customer onboarding. Generated skills include your actual attribute slugs, list IDs, and status options.

> **Not the workspace schema generator:** This skill generates _workflow_ skills (deal-management, lead-qualification, etc.). To generate the `attio-workspace-schema` skill that documents your entire workspace structure, use the Node CLI instead:
>
> ```bash
> npx attio-discover generate-skill --output ./output/attio-workspace-skill
> ```
>
> The `attio-skill-generator` works best when `attio-workspace-schema` is already installed—it reads schema data from there instead of making API calls.

## Prerequisites

- Python 3.8+
- **Required:** `chevron` (templating engine—generator fails without it)
- **Recommended:** `pyyaml` (for custom use-case YAML files; falls back to built-in config if missing)
- Attio MCP Server installed and configured

## Installation

### 1. Install Python Dependencies

```bash
pip install chevron pyyaml
```

### 2. Install the Skill in Claude

**Option A: Import from project directory**

If you're working with the attio-mcp-server repo:

```bash
# The skill is located at:
skills/attio-skill-generator/
```

**Option B: Package and import**

```bash
cd skills/attio-skill-generator
python scripts/package_skill.py .
# Creates: attio-skill-generator.skill
```

Then import the `.skill` file into Claude Desktop or Claude Code.

## Quick Start

### Example Prompts

Use these prompts to activate the skill and generate workflows for your workspace:

**Lead Qualification:**

```
Use the attio-skill-generator skill to create a Lead Qualification workflow for my Attio workspace
```

**Deal Management:**

```
Use the attio-skill-generator skill and generate a Deal Management skill for my Attio workspace
```

**Customer Onboarding:**

```
Use the attio-skill-generator skill to build a Customer Onboarding workflow skill for my workspace
```

**Custom name:**

```
Use attio-skill-generator to create a lead qualification skill called "acme-lead-scoring" for my workspace
```

### What Claude Will Do

1. Activate the `attio-skill-generator` skill
2. Identify the **primary object** for your use-case (e.g., `deals` for Deal Management)
3. Gather schema for that primary object:
   - **Option A (preferred):** Read from `attio-workspace-schema` skill resources (e.g., `resources/deals-attributes.md`)—no API calls needed
   - **Option B (fallback):** If schema skill isn't installed, call MCP discovery tools (`records_discover_attributes`)
4. Generate a customized skill tailored to your workspace
5. Show you a preview for approval
6. Package it as a `.skill` file for import

**Note:** Lists are NOT gathered by default. Only request list functionality if your workflow specifically needs it. Related objects (e.g., companies linked to deals) are referenced through record-reference fields, but their full schemas are not gathered.

> **Claude Desktop users:** The generator runs Python scripts locally. If Claude Desktop can't execute scripts in your setup, run the commands manually in your terminal.

### Available Use Cases

| Use Case            | Primary Object | Related Objects   | Description                          |
| ------------------- | -------------- | ----------------- | ------------------------------------ |
| Lead Qualification  | companies      | people            | Score and qualify inbound leads      |
| Deal Management     | deals          | companies, people | Manage deals through pipeline stages |
| Customer Onboarding | companies      | people, deals     | Structured onboarding workflows      |

## Manual Generation

If you prefer to run the generator manually:

### Step 1: Create Workspace Schema JSON

```json
{
  "objects": {
    "companies": {
      "display_name": "Companies",
      "attributes": [
        {
          "api_slug": "name",
          "display_name": "Name",
          "type": "text",
          "is_required": true
        },
        {
          "api_slug": "lead_status",
          "display_name": "Lead Status",
          "type": "status",
          "options": [
            { "title": "New", "id": "uuid-1" },
            { "title": "Qualified", "id": "uuid-2" }
          ]
        }
      ]
    }
  },
  "lists": []
}
```

Save as `workspace-schema.json`.

> **Tip:** Leave `lists` empty unless your workflow specifically needs list operations.

### Step 2: Run Generator

```bash
cd skills/attio-skill-generator

python scripts/generator.py \
  --use-case lead-qualification \
  --name my-lead-qualification \
  --workspace-schema-file workspace-schema.json \
  --output ./generated-skills
```

### Step 3: Validate

```bash
python scripts/quick_validate.py ./generated-skills/my-lead-qualification
```

### Step 4: Package

```bash
python scripts/package_skill.py ./generated-skills/my-lead-qualification
```

Output: `my-lead-qualification.skill`

## CLI Reference

### generator.py

```
Usage: python scripts/generator.py [OPTIONS]

Options:
  -u, --use-case TEXT          Use case: lead-qualification, deal-management,
                               customer-onboarding
  -n, --name TEXT              Skill name (hyphen-case, max 64 chars)
  -f, --workspace-schema-file  Path to JSON file with workspace schema
  -w, --workspace-schema       JSON string (for small schemas)
  -o, --output TEXT            Output directory (default: ./generated-skills)
  -i, --interactive            Interactive mode with prompts
```

### quick_validate.py

```
Usage: python scripts/quick_validate.py <skill-path>

Validates:
  - SKILL.md exists with valid frontmatter
  - name: hyphen-case, max 64 characters
  - description: max 1024 characters, no angle brackets
```

### package_skill.py

```
Usage: python scripts/package_skill.py <skill-path>

Creates a .skill ZIP file ready for import into Claude.
```

## Generated Skill Structure

```
my-lead-qualification/
├── SKILL.md              # Main skill definition
├── resources/
│   ├── workflows.md      # Step-by-step workflow patterns
│   ├── tool-reference.md # MCP tool signatures
│   └── examples.md       # Real-world interaction examples
└── references/
    └── (optional reference docs)
```

## Customization

### Modify Templates

Templates are in `skills/attio-skill-generator/resources/templates/`:

- `SKILL.template.md` - Main skill structure
- `workflows.template.md` - Workflow patterns
- `tool-reference.template.md` - Tool documentation
- `examples.template.md` - Example interactions

### Add Use Cases

Create a new YAML file in `skills/attio-skill-generator/resources/use-cases/`:

```yaml
# skills/attio-skill-generator/resources/use-cases/my-use-case.yaml
name: My Custom Workflow
description: Description of what this workflow does
primary_object: companies
secondary_objects:
  - people
workflow_steps:
  - name: Step 1
    description: First step description
    tools:
      - records_search
      - records_get_details
```

Then update `USE_CASES` in `skills/attio-skill-generator/scripts/generator.py`.

> **Tool names:** Use canonical tool names (e.g., `records_search`, `records_get_details`) rather than aliases (`search-records`, `get-record-details`) to avoid deprecation drift.

## Troubleshooting

### "chevron package required"

```bash
pip install chevron
```

### "Workspace schema missing primary object"

Ensure your schema JSON includes the primary object for your use case:

- `lead-qualification` requires `companies`
- `deal-management` requires `deals`
- `customer-onboarding` requires `companies`

### Validation Fails

Check:

- Skill name is hyphen-case (lowercase, digits, hyphens only)
- Skill name doesn't exceed 64 characters
- Description doesn't exceed 1024 characters
- Description contains no `<` or `>` characters

> **Description length warning:** While the Python generator allows up to 1024 characters, some Claude Skill importers enforce shorter limits (~200 chars). Keep descriptions concise.

## Related Documentation

- [Attio MCP Tools Reference](../../tools/attio-tools-reference.md)
- [Getting Started Guide](../getting-started.md)
- [Universal Tools Quick Reference](../universal-tools-quick-reference.md)
