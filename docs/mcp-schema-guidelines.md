# MCP Tool Schema Guidelines

This document outlines important guidelines for creating tool schemas that are compatible with the Model Context Protocol (MCP).

## Critical Schema Restrictions

### No oneOf, allOf, or anyOf at the Top Level

⚠️ **IMPORTANT**: The MCP protocol does NOT support `oneOf`, `allOf`, or `anyOf` at the top level of tool input schemas. Using these will cause connection errors.

**❌ Invalid Schema Example:**
```typescript
{
  name: "get-company-details",
  description: "Get details of a company",
  inputSchema: {
    type: "object",
    properties: {
      companyId: { type: "string" },
      uri: { type: "string" }
    },
    // THIS WILL CAUSE MCP CONNECTION ERRORS!
    oneOf: [
      { required: ["companyId"] },
      { required: ["uri"] }
    ]
  }
}
```

**✅ Valid Schema Example:**
```typescript
{
  name: "get-company-details",
  description: "Get details of a company",
  inputSchema: {
    type: "object",
    properties: {
      companyId: { 
        type: "string",
        description: "ID of the company (provide either this or uri)"
      },
      uri: { 
        type: "string",
        description: "URI of the company (provide either this or companyId)"
      }
    }
    // No oneOf at the top level - validation handled in runtime
  }
}
```

## Best Practices

### 1. Handle Either/Or Logic in Runtime

When you need to validate that either one parameter or another is provided (but not both), handle this in your tool's implementation rather than in the schema:

```typescript
// In your tool handler
if (!companyId && !uri) {
  throw new Error("Either companyId or uri must be provided");
}
if (companyId && uri) {
  throw new Error("Provide either companyId or uri, not both");
}
```

### 2. Use Clear Descriptions

Since we can't use schema-level validation for either/or relationships, make this clear in the parameter descriptions:

```typescript
properties: {
  companyId: {
    type: "string",
    description: "Company ID (provide either this or uri, not both)"
  },
  uri: {
    type: "string", 
    description: "Company URI (provide either this or companyId, not both)"
  }
}
```

### 3. Nested Objects Can Use Complex Schemas

While the top level can't use `oneOf`, `allOf`, or `anyOf`, nested properties within your schema can:

```typescript
{
  name: "update-company",
  inputSchema: {
    type: "object",
    properties: {
      companyId: { type: "string" },
      updates: {
        type: "object",
        properties: {
          address: {
            // This is fine - not at the top level
            oneOf: [
              { type: "string" },
              { 
                type: "object",
                properties: {
                  street: { type: "string" },
                  city: { type: "string" }
                }
              }
            ]
          }
        }
      }
    },
    required: ["companyId", "updates"]
  }
}
```

## Common Error Messages

If you see this error when connecting your MCP server:
```
API Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"tools.47.custom.input_schema: input_schema does not support oneOf, allOf, or anyOf at the top level"}}
```

It means one of your tools has a schema with `oneOf`, `allOf`, or `anyOf` at the top level. Review all your tool schemas and refactor them according to these guidelines.

## Schema Validation Checklist

Before deploying your MCP server, check that:

- [ ] No tool has `oneOf` at the top level of its inputSchema
- [ ] No tool has `allOf` at the top level of its inputSchema  
- [ ] No tool has `anyOf` at the top level of its inputSchema
- [ ] Either/or parameter relationships are clearly documented in descriptions
- [ ] Runtime validation handles parameter constraints that can't be expressed in the schema

## References

- [MCP Tool Documentation](https://modelcontextprotocol.io/docs/concepts/tools)
- [JSON Schema Documentation](https://json-schema.org/)