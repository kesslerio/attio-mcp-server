---
name: attio-skill-generator
description: Generate use-case-specific Attio workflow skills from templates. Use when creating new skills for lead qualification, deal management, customer onboarding, or custom Attio workflows.
license: Apache-2.0 (see LICENSE.txt for attribution)
---

# Attio Skill Generator

A meta-skill that generates customized Attio workflow skills tailored to your workspace.

## When to Use This Skill

Use this skill when you want to:

- Create a **lead qualification** skill for your workspace
- Generate a **deal management** workflow skill
- Build a **customer onboarding** skill
- Create **custom Attio workflow** skills

## Available Use Cases

| Use Case              | Primary Object | Description                          |
| --------------------- | -------------- | ------------------------------------ |
| `lead-qualification`  | companies      | Qualify and score inbound leads      |
| `deal-management`     | deals          | Manage deals through pipeline stages |
| `customer-onboarding` | companies      | Structured onboarding workflows      |

## Generation Process

### Step 1: Gather Workspace Schema

**You (Claude) must discover the workspace schema** before running the generator. The Python scripts are sandboxed and cannot access APIs or MCP tools.

**Option A: Read from attio-workspace-schema skill (preferred)**

If the user has the `attio-workspace-schema` skill installed:

1. Read `resources/companies-attributes.md`, `resources/people-attributes.md`, `resources/deals-attributes.md`
2. Extract object slugs, attributes, and select/status options
3. Build JSON schema structure

**Option B: Query MCP tools (fallback)**

If no schema skill is available:

```
1. Call records_discover_attributes for each object (companies, people, deals)
2. Call get-lists to discover available lists
3. For select/status fields, call records_get_attribute_options
4. Build JSON schema structure from responses
```

### Step 2: Build Schema JSON

Structure the discovered data as JSON for the generator:

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
          "is_multiselect": false,
          "is_required": true,
          "is_writable": true
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
  "lists": [
    { "name": "Prospecting", "id": "uuid", "parent_object": "companies" },
    { "name": "Active Deals", "id": "uuid", "parent_object": "deals" }
  ]
}
```

### Step 3: Run the Generator

Execute the generator script with the workspace schema.

**Recommended: Use file-based input** (avoids shell escaping issues with large JSON):

```bash
# Save schema to file first
echo '<JSON from Step 2>' > workspace-schema.json

# Run generator with file input
python scripts/generator.py \
  --use-case lead-qualification \
  --name acme-lead-qualification \
  --workspace-schema-file workspace-schema.json \
  --output ./generated-skills
```

**Alternative: Inline JSON** (only for small schemas):

```bash
python scripts/generator.py \
  --use-case lead-qualification \
  --name acme-lead-qualification \
  --workspace-schema '{"objects": {...}}' \
  --output ./generated-skills
```

**Parameters:**

- `--use-case`: One of `lead-qualification`, `deal-management`, `customer-onboarding`
- `--name`: Skill name (hyphen-case, max 64 chars)
- `--workspace-schema-file`: Path to JSON file with workspace data (recommended)
- `--workspace-schema`: JSON string with workspace data (alternative for small schemas)
- `--output`: Output directory (default: `./generated-skills`)

### Step 4: Preview Generated Skill

Show the user the generated SKILL.md content for review:

```bash
cat ./generated-skills/acme-lead-qualification/SKILL.md
```

Allow the user to request modifications before packaging.

### Step 5: Validate and Package

Validate the generated skill:

```bash
python scripts/quick_validate.py ./generated-skills/acme-lead-qualification
```

Package as a .skill file:

```bash
python scripts/package_skill.py ./generated-skills/acme-lead-qualification
```

### Step 6: Return to User

Provide the user with:

1. Preview of generated skill contents
2. Path to the `.skill` ZIP file
3. Instructions for importing into Claude

## Scripts Reference

| Script              | Purpose                          | Input                  |
| ------------------- | -------------------------------- | ---------------------- |
| `generator.py`      | Generate skill from templates    | JSON schema + use-case |
| `init_skill.py`     | Initialize empty skill structure | Skill name             |
| `package_skill.py`  | Validate and create ZIP          | Skill directory path   |
| `quick_validate.py` | Validate SKILL.md frontmatter    | Skill directory path   |

## Example Interaction

**User:** "Generate a lead qualification skill for my workspace"

**Claude:**

1. First, let me discover your workspace schema...
   - [Calls `records_discover_attributes` for companies, people]
   - [Calls `get-lists` to find available lists]
2. Building workspace schema JSON...
3. Running generator:
   ```bash
   python scripts/generator.py --use-case lead-qualification --name my-lead-qualification --workspace-schema '...'
   ```
4. Here's the generated skill preview:
   [Shows SKILL.md content]
5. Does this look correct? I can modify it before packaging.
6. Packaging skill...
   ```bash
   python scripts/package_skill.py ./generated-skills/my-lead-qualification
   ```
7. Your skill is ready: `./my-lead-qualification.skill`

## Template Customization

Templates are in `resources/templates/`. You can customize:

- `SKILL.template.md` - Main skill metadata and structure
- `workflows.template.md` - Workflow step patterns
- `tool-reference.template.md` - MCP tool reference
- `examples.template.md` - Example interactions

Use-case configurations are in `resources/use-cases/`:

- `lead-qualification.yaml`
- `deal-management.yaml`
- `customer-onboarding.yaml`

## Dependencies

The generator requires these Python packages:

- `chevron` - Handlebars-compatible templating
- `pyyaml` - YAML parsing

Install if needed: `pip install chevron pyyaml`

## Validation Checklist

Before packaging, verify the generated skill:

- [ ] All object slugs exist in the user's workspace
- [ ] All list IDs are valid UUIDs from the workspace
- [ ] Attribute slugs match the workspace schema
- [ ] Select/status options use exact titles from workspace
- [ ] No hardcoded values from other workspaces
- [ ] Skill name is hyphen-case, max 64 characters
- [ ] Description is max 1024 characters

See [resources/validation-checklist.md](resources/validation-checklist.md) for detailed checklist.

## Attribution

This skill extends [anthropics/skills/skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator).
Licensed under Apache License 2.0. See LICENSE.txt for full terms.

**Modifications from original:**

- Added Attio workspace schema integration
- Added use-case specific template rendering
- Added preview system for generated skills
- Adapted for MCP tool workflow
