---
name: attio-workspace-schema
description: Use when working with Attio workspace data to know valid attributes, field names, and option values for {{#each metadata.objects}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}.
---

# Attio Workspace Schema Reference

**Generated**: {{metadata.generatedAt}}
**Objects**: {{#each metadata.objects}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

⚠️ **CRITICAL: Display Name vs API Slug**

The #1 error source when working with Attio is using Display Names instead of API Slugs. **Always use API Slugs from the per-object files below.**

---

## Attribute Reference by Object

**Only open the file for the object you're working with** (progressive disclosure):

{{#each objects}}

- {{displayName}}: [resources/{{objectSlug}}-attributes.md](resources/{{objectSlug}}-attributes.md)
  {{/each}}

Each file contains:

- Select/status option values
- Complete attribute specifications
- Relationship definitions

## Complex Type Structures

See [resources/complex-types.md](resources/complex-types.md) for:

- Location object structure (10 required fields)
- Personal name object structure
- Phone number formatting
- Email address handling

---

## Usage Guidelines

1. **Always use API Slugs**, never Display Names
   - ❌ Wrong: `{"Team size": "51-200"}`
   - ✅ Correct: `{"team_size": "51-200"}`

2. **Check multi-select flag** before sending values
   - Multi-select (✓): Send array `["value1", "value2"]`
   - Single-select (✗): Send string `"value1"`

3. **Use exact option titles (slugs)** from the tables
   - Per Attio docs, select option slugs are the title field
   - Case-sensitive

4. **Complex types require specific object structures**
   - Location: All 10 fields must be present (use `null` for empty)
   - Personal-name: Minimum `first_name` required
   - See resources/complex-types.md for details

5. **When unsure, use MCP discovery tools**:
   - `records_discover_attributes` - Get attribute metadata
   - `records_get_attribute_options` - Get valid select/status values

---

## When to Use This Skill

Use this skill when:

- Creating or updating Attio records
- Filtering or searching by specific attributes
- Validating attribute values before API calls
- Understanding field requirements and constraints
- Working with select/status fields and need valid option values

> ⚠️ **This schema may become outdated.** When in doubt, verify with MCP discovery tools listed above.
