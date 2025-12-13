# Detailed Attribute Reference

This document provides complete specifications for all attributes including select/status options, relationships, and complex type structures.

## {{#each objects}}

## {{displayName}}

{{#each attributes}}

### {{displayName}} (`{{apiSlug}}`)

**Specifications**:

- **Type**: `{{type}}`
- **Multi-select**: {{#if isMultiselect}}Yes{{else}}No{{/if}}
- **Required**: {{#if isRequired}}Yes{{else}}No{{/if}}
- **Unique**: {{#if isUnique}}Yes{{else}}No{{/if}}
- **Writable**: {{#if isWritable}}Yes{{else}}No{{/if}}
  {{#if description}}
- **Description**: {{description}}
  {{/if}}

{{#if options}}
**Valid Options**:

| ID  | Title | Value |
| --- | ----- | ----- |

{{#each options}}
| `{{id}}` | {{title}} | `{{value}}` |
{{/each}}

{{#if optionsTruncated}}

> ⚠️ **Showing {{options.length}} of {{totalOptions}} options.** Use `records_get_attribute_options` for the complete list.
> {{/if}}
> {{/if}}

{{#if complexTypeStructure}}
**Structure**:

```json
{{json complexTypeStructure}}
```

{{/if}}

{{#if relationship}}
**Relationship**:

- Target Object: `{{relationship.targetObject}}`
- Cardinality: {{relationship.cardinality}}
  {{/if}}

---

{{/each}}
{{/each}}

## How to Use This Reference

### Finding Attribute Information

1. **Locate your object** (Companies, People, Deals)
2. **Find the attribute** by its Display Name
3. **Use the API Slug** in your code (never the Display Name)

### Working with Select/Status Fields

```typescript
// ✅ Correct: Use API slug and exact option value
{
  "industry": "technology"
}

// ❌ Wrong: Using display name or title
{
  "Industry": "Technology"
}
```

### Working with Multi-Select Fields

```typescript
// ✅ Correct: Array of values for multi-select
{
  "tags": ["customer", "enterprise"]
}

// ❌ Wrong: Single value for multi-select
{
  "tags": "customer"
}
```

### Working with Complex Types

For complex types (location, personal-name, etc.), see [complex-types.md](complex-types.md) for complete structure requirements.
