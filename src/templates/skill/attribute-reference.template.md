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
**Description**: {{description}}{{/if}}

{{#if options}}
**Options**: {{#each options}}{{title}}{{#unless @last}}, {{/unless}}{{/each}}{{#if optionsTruncated}} _(showing {{options.length}} of {{totalOptions}})_{{/if}}
{{/if}}

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
