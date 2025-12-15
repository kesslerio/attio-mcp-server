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

| Use Case              | Primary Object | Related Objects   | Description                          |
| --------------------- | -------------- | ----------------- | ------------------------------------ |
| `lead-qualification`  | companies      | people            | Qualify and score inbound leads      |
| `deal-management`     | deals          | companies, people | Manage deals through pipeline stages |
| `customer-onboarding` | companies      | people, deals     | Structured onboarding workflows      |

## Generation Process

### Step 1: Gather Workspace Schema (Targeted)

**You (Claude) must discover the workspace schema** for the **specific use-case**. The Python scripts are sandboxed and cannot access APIs or MCP tools.

**IMPORTANT: Gather data for the PRIMARY OBJECT only.** Do not gather full schemas for all objects.

**Determine what to gather based on use-case:**

| Use Case              | Gather Attributes For | Gather Lists?         |
| --------------------- | --------------------- | --------------------- |
| `lead-qualification`  | companies             | NO (unless requested) |
| `deal-management`     | deals                 | NO (unless requested) |
| `customer-onboarding` | companies             | NO (unless requested) |

**FIRST: Check for attio-workspace-schema skill**

Before using MCP tools, check if the `attio-workspace-schema` skill is installed by looking for its resource files.

**Option A: Use attio-workspace-schema skill (PREFERRED - faster, no API calls)**

If `attio-workspace-schema` skill exists:

1. Read ONLY the primary object's resource file:
   - `deal-management` → read `resources/deals-attributes.md`
   - `lead-qualification` → read `resources/companies-attributes.md`
   - `customer-onboarding` → read `resources/companies-attributes.md`
2. Extract attributes and select/status options for that object
3. Build JSON schema structure

**Option B: Query MCP tools (FALLBACK - only if no schema skill)**

If `attio-workspace-schema` skill is NOT available:

```
1. Call records_discover_attributes for the PRIMARY OBJECT ONLY
   - deal-management → records_discover_attributes for "deals"
   - lead-qualification → records_discover_attributes for "companies"
   - customer-onboarding → records_discover_attributes for "companies"

2. For select/status fields on the primary object, call records_get_attribute_options
```

**Do NOT call get-lists** unless the user specifically asks for list-related functionality. Lists are organizational containers, not essential to core workflows like deal management or lead qualification.

**Do NOT gather:**

- Full attribute schemas for secondary/related objects (companies, people for deal-management)
- Lists (unless user explicitly requests list functionality)

**Note on related objects:** Deal management involves linked companies and people, but these relationships are handled through record-reference fields on the deals object. You don't need full attribute lists for related objects.

### Step 2: Build Schema JSON

Structure the discovered data as JSON for the generator. **This structure is CRITICAL for correct output.**

**⚠️ REQUIRED FIELDS for each attribute:**

- `api_slug` - The API field name (required)
- `type` - Field type: text, status, select, number, date, etc. (required)
- `is_required` - Boolean, true if field is required (optional, defaults to false)
- `is_multiselect` - Boolean, true if field accepts multiple values (optional, defaults to false)
- `options` - Array of option objects for status/select fields (REQUIRED for status/select types!)

**⚠️ OPTIONS ARE CRITICAL:** For `status` and `select` type fields, you MUST include the `options` array with the actual option titles from the workspace. Without this, the generated skill won't show pipeline stages or dropdown values!

```json
{
  "objects": {
    "deals": {
      "display_name": "Deals",
      "attributes": [
        {
          "api_slug": "name",
          "display_name": "Deal Name",
          "type": "text",
          "is_required": true,
          "is_multiselect": false
        },
        {
          "api_slug": "stage",
          "display_name": "Deal Stage",
          "type": "status",
          "is_required": true,
          "is_multiselect": false,
          "options": [
            { "title": "MQL" },
            { "title": "Demo Request" },
            { "title": "Discovery Call" },
            { "title": "Demo Booked" },
            { "title": "Negotiations" },
            { "title": "Won 🎉" },
            { "title": "Lost" }
          ]
        },
        {
          "api_slug": "primary_interest",
          "display_name": "Primary Interest",
          "type": "select",
          "is_multiselect": false,
          "options": [
            { "title": "GLP-1 / medical weight loss" },
            { "title": "Body contouring / aesthetics" },
            { "title": "Replacing existing device" }
          ]
        },
        {
          "api_slug": "lost_reason",
          "display_name": "Lost Reason",
          "type": "select",
          "is_multiselect": true,
          "options": [
            { "title": "Pricing/Cost" },
            { "title": "Competitor" },
            { "title": "Timing Not Right" }
          ]
        },
        {
          "api_slug": "associated_people",
          "display_name": "Associated People",
          "type": "record-reference",
          "is_multiselect": true
        },
        {
          "api_slug": "associated_company",
          "display_name": "Company",
          "type": "record-reference",
          "is_multiselect": false
        }
      ]
    }
  },
  "lists": []
}
```

**Key points:**

- `lists` array is empty by default. Only populate if user requests list functionality.
- For `status`/`select` fields, copy the EXACT option titles from the workspace schema
- Set `is_multiselect: true` for fields that accept multiple values (check the Multi column in schema)

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

**User:** "Use attio-skill-generator to create a Deal Management skill for my workspace"

**Claude:**

1. I'll generate a Deal Management skill. Let me check for attio-workspace-schema skill...
   - [If schema skill exists: reads `resources/deals-attributes.md`]
   - [If no schema skill: calls `records_discover_attributes` for **deals only**]
   - [Does NOT call `get-lists` - lists are not needed for deal management]
2. Building workspace schema JSON with deals attributes only...
3. Running generator:
   ```bash
   python scripts/generator.py --use-case deal-management --name my-deal-management --workspace-schema-file schema.json
   ```
4. Here's the generated skill preview:
   [Shows SKILL.md content with deal stages and attributes]
5. Does this look correct? I can modify it before packaging.
6. Packaging skill...
   ```bash
   python scripts/package_skill.py ./generated-skills/my-deal-management
   ```
7. Your skill is ready: `./my-deal-management.skill`

**Note:** The skill includes record-reference fields (associated_company, contacts) that link to companies and people, but without documenting those objects' full schemas. Lists are not included unless explicitly requested.

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
