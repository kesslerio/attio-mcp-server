# {{#each objects}}{{displayName}}{{/each}} Attributes

⚠️ **Always use API Slugs, never Display Names**

{{#each objects}}

## Display Name → API Slug Mapping

| Display Name | API Slug | Type | Multi | Required | Unique |
| ------------ | -------- | ---- | ----- | -------- | ------ |

{{#each attributes}}
| {{displayName}} | `{{apiSlug}}` | {{type}} | {{#if isMultiselect}}✓{{else}}✗{{/if}} | {{#if isRequired}}✓{{else}}✗{{/if}} | {{#if isUnique}}✓{{else}}✗{{/if}} |
{{/each}}

---

## Detailed Specifications

{{#each attributes}}

### {{displayName}} (`{{apiSlug}}`)

**Type**: `{{type}}`{{#if isMultiselect}} _(multi-select)_{{/if}}{{#if isRequired}} _(required)_{{/if}}{{#if isUnique}} _(unique)_{{/if}}{{#unless isWritable}} _(read-only)_{{/unless}}{{#if description}}
**Description**: {{{description}}}{{/if}}
{{#if options}}
**Options**: {{#each options}}{{{title}}}{{#unless @last}}, {{/unless}}{{/each}}{{#if optionsTruncated}} _(showing {{options.length}} of {{totalOptions}})_{{/if}}
{{/if}}
{{#if complexTypeStructure}}
**Structure**:

```json
{{{json complexTypeStructure}}}
```

{{/if}}
{{#if relationship}}
**Relationship**:

- Target Object: `{{relationship.targetObject}}`
- Cardinality: {{relationship.cardinality}}
  {{/if}}

---

{{/each}}

---

## ⚠️ Common Pitfalls

### 1. Option Fields: Status vs Select Behavior

**Status fields** (type: `status`) - Auto-converts human-readable titles:

- ✅ Use title: `stage: "Demo Scheduling"`
- ✅ Already converts to: `{ status_id: "uuid" }`
- Titles are case-insensitive and support partial matching

**Select fields** (type: `select`) - Accepts titles OR UUIDs:

- ✅ Use title: `lead_type: ["Potential Customer"]`
- ✅ Use UUID: `lead_type: ["8f6ac4eb-6ab6-40be-909a-29042d3674e7"]`
- Titles are case-sensitive (exact match required)
- Multi-select fields must always use arrays (even for single values)

**Both field types accept exact titles** - Use whichever is more convenient for your use case

### 2. Array Fields: Always Use Arrays

These field types **require arrays** even for single values:

**Multi-select fields** (marked with ✓ in Multi column):

- ❌ Wrong: `domains: "example.com"`
- ✅ Correct: `domains: ["example.com"]`

**Select fields** (even single-select):

- ❌ Wrong: `lead_type: "uuid"`
- ✅ Correct: `lead_type: ["uuid"]`

**Record references** (actor-reference, record-reference types):

- ❌ Wrong: `team: "person_id"`
- ✅ Correct: `team: ["person_id"]`

**Common error**: `"expects array"` or `"invalid type"`

### 3. Data Type Formatting

Types must match exactly:

**Number fields**:

- ✅ Correct: `lead_score: 85`
- ❌ Wrong: `lead_score: "85"` or `lead_score: "8.5/10"`

**Boolean fields** (checkbox type):

- ✅ Correct: `has_weight_loss_program_boolean: true`
- ❌ Wrong: `has_weight_loss_program_boolean: "true"`

**Date fields**:

- ✅ Correct: `foundation_date: "2024-12-14"`
- ❌ Wrong: `foundation_date: "December 14, 2024"`

### 4. Read-Only Fields

Fields marked as _(read-only)_ cannot be updated:

- `record_id`, `created_at`, `created_by`, interaction fields

Attempting to update read-only fields will cause API errors.

### 5. Complex Type Structures

Location, personal-name, phone-number, and email-address types require **complete object structures**. See [complex-types.md](complex-types.md) for required field formats.

**Common mistake**: Sending incomplete location objects

- ❌ Wrong: `primary_location: {locality: "San Francisco"}`
- ✅ Correct: All 10 location fields must be present (use `null` for empty fields)

{{/each}}
