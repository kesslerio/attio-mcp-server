# Field Value Mapping Guide

## Understanding Attribute vs Value Mapping

The Attio MCP Server handles two different types of mappings:

### 1. Attribute (Field Name) Mapping
This maps human-friendly field names to Attio API field slugs:
- ✅ "B2B Segment" → "type_persona"
- ✅ "Company Name" → "name"
- ✅ "Email" → "email"

This is handled by the configuration files in `/config/mappings/`.

### 2. Value Mapping
This would map human-friendly values to the actual values expected by Attio:
- ❌ "Aesthetics" → "Medical Spa/Aesthetics" (NOT SUPPORTED)
- ❌ "Surgeon" → "Plastic Surgeon" (NOT SUPPORTED)

Currently, the MCP server does NOT support value mapping.

## The "Aesthetics" Issue

When you search for companies with `b2b_segment` = "Aesthetics", you get an error because:

1. The attribute mapping works: `b2b_segment` → `type_persona` ✓
2. But "Aesthetics" is not a valid value for the `type_persona` field
3. The correct value is likely "Medical Spa/Aesthetics"

## Solutions

### Option 1: Use the Exact Value
Instead of searching for "Aesthetics", use the full value:
```json
{
  "filters": [{
    "attribute": { "slug": "b2b_segment" },
    "condition": "equals",
    "value": "Medical Spa/Aesthetics"
  }]
}
```

### Option 2: Use a Contains Search
If the field supports it, use a contains condition:
```json
{
  "filters": [{
    "attribute": { "slug": "b2b_segment" },
    "condition": "contains",
    "value": "Aesthetics"
  }]
}
```

### Option 3: Implement Value Mapping (Future Enhancement)
We could enhance the MCP server to support value mapping:
```json
{
  "values": {
    "type_persona": {
      "Aesthetics": "Medical Spa/Aesthetics",
      "Surgeon": "Plastic Surgeon",
      "Medical": "Medical Practice"
    }
  }
}
```

## Discovering Valid Values

To find valid values for a select field like `type_persona`:

1. **Use the Attio UI**: Navigate to the field settings to see all available options
2. **API Discovery**: Use the Attio API to fetch field metadata (if available)
3. **Trial and Error**: Test with known values from existing records

## Recommendations

1. For now, use exact values as they appear in Attio
2. Document commonly used values for your team
3. Consider implementing value mapping as a future enhancement
4. Use "contains" searches when appropriate to handle partial matches