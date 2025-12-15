# MCP Integration Guide

How to use Attio MCP tools for workspace discovery when generating skills.

---

## Overview

The skill generator needs workspace schema data to create accurate, workspace-specific skills. Since the Python scripts are sandboxed and cannot access APIs directly, **Claude must discover the workspace schema** and pass it to the generator.

---

## Discovery Methods

### Method 1: Read from attio-workspace-schema Skill (Preferred)

If the user has the `attio-workspace-schema` skill installed:

1. **Locate the skill files**:

   ```
   ~/.claude/skills/attio-workspace-schema/
   └── resources/
       ├── companies-attributes.md
       ├── people-attributes.md
       └── deals-attributes.md
   ```

2. **Parse attribute tables** from markdown:
   - Extract API slugs, types, multi-select flags
   - Extract select/status option values
   - Build JSON structure for generator

3. **Advantages**:
   - No API calls needed
   - Faster generation
   - Works offline
   - Reuses existing data

### Method 2: Query MCP Tools (Fallback)

If no schema skill is available, use MCP tools:

```
1. records_discover_attributes(resource_type: "companies")
2. records_discover_attributes(resource_type: "people")
3. records_discover_attributes(resource_type: "deals")
4. get-lists()
5. For each select/status field:
   records_get_attribute_options(resource_type, attribute)
```

---

## MCP Tool Reference

### records_discover_attributes

Discover all attributes for an object type.

**Input**:

```json
{
  "resource_type": "companies"
}
```

**Output**:

```json
{
  "attributes": [
    {
      "api_slug": "name",
      "title": "Name",
      "type": "text",
      "is_required": true,
      "is_multiselect": false,
      "is_writable": true
    },
    {
      "api_slug": "lead_status",
      "title": "Lead Status",
      "type": "status",
      "is_required": false,
      "is_multiselect": false,
      "is_writable": true
    }
  ]
}
```

### records_get_attribute_options

Get valid options for select/status fields.

**Input**:

```json
{
  "resource_type": "companies",
  "attribute": "lead_status"
}
```

**Output**:

```json
{
  "options": [
    { "id": "uuid-1", "title": "New" },
    { "id": "uuid-2", "title": "Qualified" },
    { "id": "uuid-3", "title": "Disqualified" }
  ]
}
```

### get-lists

Get all lists in the workspace.

**Input**:

```json
{}
```

**Output**:

```json
{
  "lists": [
    {
      "id": "uuid-1",
      "name": "Prospecting",
      "parent_object": "companies"
    },
    {
      "id": "uuid-2",
      "name": "Active Deals",
      "parent_object": "deals"
    }
  ]
}
```

---

## Building the Schema JSON

After discovery, build a JSON structure for the generator:

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
          "is_multiselect": false,
          "is_required": false,
          "is_writable": true,
          "options": [
            {"id": "uuid-1", "title": "New"},
            {"id": "uuid-2", "title": "Qualified"}
          ]
        }
      ]
    },
    "people": {
      "display_name": "People",
      "attributes": [...]
    },
    "deals": {
      "display_name": "Deals",
      "attributes": [...]
    }
  },
  "lists": [
    {
      "id": "88709359-01f6-478b-ba66-c07347891b6f",
      "name": "Prospecting",
      "parent_object": "companies"
    }
  ]
}
```

---

## Passing Schema to Generator

Pass the JSON to the generator script:

```bash
python scripts/generator.py \
  --use-case lead-qualification \
  --name acme-leads \
  --workspace-schema '{"objects": {...}, "lists": [...]}' \
  --output ./generated-skills
```

Or use a file:

```bash
python scripts/generator.py \
  --use-case lead-qualification \
  --name acme-leads \
  --workspace-schema-file ./workspace-schema.json \
  --output ./generated-skills
```

---

## Discovery Best Practices

### Rate Limiting

Add delays between MCP calls to avoid rate limits:

- 100ms between attribute discoveries
- 100ms between option lookups

### Caching

Consider caching discovered data:

- Workspace schema rarely changes
- Reduces API calls on regeneration
- Store in temporary file or memory

### Error Handling

Handle discovery failures gracefully:

- If an object fails, continue with others
- If options fail, include attribute without options
- Report what was discovered vs. what failed

### Minimal Discovery

Only discover what's needed:

- Lead qualification: companies, people
- Deal management: deals, companies
- Customer onboarding: companies, people, deals

---

## Troubleshooting

### "No MCP server available"

- Ensure Attio MCP server is running
- Check `attio-mcp` or `attio-discover` is configured
- Verify API key is set

### "Rate limit exceeded"

- Add delays between calls
- Use schema skill instead of MCP queries
- Cache results for reuse

### "Unknown attribute"

- Attribute may be workspace-specific
- Use discovery to verify available attributes
- Check for typos in attribute slugs

### "Empty options"

- Some fields may not have options configured
- Status fields may use `/statuses` endpoint instead
- Check field type (select vs. status)
