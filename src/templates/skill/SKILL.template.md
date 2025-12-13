---
name: attio-workspace-schema
description: Use when working with Attio workspace data to know valid attributes, field names, and option values for {{#each metadata.objects}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}.
---

# Attio Workspace Schema Reference

**Generated**: {{metadata.generatedAt}}
**Objects**: {{#each metadata.objects}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

⚠️ **CRITICAL: Display Name vs API Slug**

The #1 error source when working with Attio is using Display Names instead of API Slugs. **Always use the API Slug column below.**

---

## Quick Reference: Display Name → API Slug Mapping

{{#each objects}}

### {{displayName}}

| Display Name | API Slug | Type | Multi | Required | Unique |
| ------------ | -------- | ---- | ----- | -------- | ------ |

{{#each attributes}}
| {{displayName}} | `{{apiSlug}}` | {{type}} | {{#if isMultiselect}}✓{{else}}✗{{/if}} | {{#if isRequired}}✓{{else}}✗{{/if}} | {{#if isUnique}}✓{{else}}✗{{/if}} |
{{/each}}

{{/each}}

---

## Detailed Attribute Reference

See [resources/attribute-reference.md](resources/attribute-reference.md) for:

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

3. **Use exact option values** from the tables
   - Values are case-sensitive
   - Use the "Value" column, not "Title"

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
