# Strict Mode Configuration Guide

## Overview

Strict mode is a configuration option in the Attio MCP Server that enables enhanced field validation and attribute checking. When enabled, it provides more rigorous validation of field names, types, and values to prevent common errors and ensure data consistency.

## Purpose and Benefits

### Why Use Strict Mode?

1. **Enhanced Data Quality**: Prevents incorrect field mappings and invalid data from reaching the Attio API
2. **Early Error Detection**: Catches field naming mistakes and type mismatches before API calls
3. **Improved Developer Experience**: Provides clear, actionable error messages with suggestions
4. **Consistency Enforcement**: Ensures consistent field naming conventions across different resource types
5. **Production Safety**: Reduces the likelihood of data corruption or API errors in production

### Key Features

- **Attribute-Aware Validation**: Validates field names against actual Attio schema attributes
- **Type Safety**: Enforces correct data types for known fields
- **Field Mapping**: Automatically corrects common field naming mistakes
- **Collision Detection**: Prevents multiple input fields from mapping to the same target field
- **Suggestion Engine**: Provides helpful suggestions for invalid or unknown fields

## Configuration

### Global Configuration

Strict mode can be configured globally or per resource type in `src/handlers/tool-configs/universal/config.ts`:

```typescript
/**
 * Global strict mode configuration
 */
export const STRICT_MODE_DEFAULTS = {
  // Enable strict mode globally
  enabled: true,
  
  // Resource-specific overrides
  resourceTypes: {
    companies: true,
    people: true,
    deals: true,
    tasks: false,     // Disabled for legacy compatibility
    notes: true,
    records: true,
    lists: true,
  }
};
```

### Environment Variables

You can also control strict mode via environment variables:

```bash
# Enable strict mode globally
STRICT_MODE_ENABLED=true

# Enable for specific resource types
STRICT_MODE_COMPANIES=true
STRICT_MODE_PEOPLE=true
STRICT_MODE_DEALS=true
STRICT_MODE_TASKS=false
STRICT_MODE_NOTES=true
STRICT_MODE_RECORDS=true
STRICT_MODE_LISTS=true
```

### Programmatic Configuration

Check if strict mode is enabled for a resource type:

```typescript
import { strictModeFor } from './config.js';

// Check if strict mode is enabled for companies
const isStrictForCompanies = strictModeFor(UniversalResourceType.COMPANIES);

if (isStrictForCompanies) {
  // Perform enhanced validation
  validateFieldsStrict(resourceType, fieldData);
} else {
  // Use basic validation
  validateFieldsBasic(resourceType, fieldData);
}
```

## How Strict Mode Works

### Field Validation Process

When strict mode is enabled, the validation process follows these steps:

1. **Schema Discovery**: Fetch available attributes from Attio API (with caching)
2. **Field Mapping**: Map input field names to correct Attio field names
3. **Collision Detection**: Check for multiple fields mapping to the same target
4. **Type Validation**: Validate field values against expected types
5. **Suggestion Generation**: Provide helpful suggestions for invalid fields

### Example: Company Creation with Strict Mode

**Input (with common mistakes):**
```json
{
  "company_name": "Acme Corp",
  "website": "https://acme.com",
  "about": "A software company",
  "employees": 50
}
```

**Strict Mode Processing:**
```typescript
// 1. Field mapping applies automatically
{
  "name": "Acme Corp",           // company_name → name
  "domains": ["https://acme.com"], // website → domains (array)
  "description": "A software company", // about → description
  "team_size": 50                // employees → team_size
}

// 2. Type corrections applied
{
  "name": "Acme Corp",
  "domains": ["acme.com"],       // URL cleaned, protocol removed
  "description": "A software company",
  "team_size": 50
}
```

**Without Strict Mode:**
- Fields might be rejected by Attio API
- No automatic corrections applied
- Generic error messages returned
- No field suggestions provided

## Migration Guide

### From Non-Strict to Strict Mode

**Step 1: Enable Strict Mode Gradually**

Start by enabling strict mode for one resource type:

```typescript
export const STRICT_MODE_DEFAULTS = {
  enabled: false,  // Keep global disabled
  resourceTypes: {
    companies: true,  // Enable for companies only
    people: false,
    deals: false,
    // ... other types disabled
  }
};
```

**Step 2: Test and Validate**

1. Run your existing test suite
2. Monitor error logs for validation warnings
3. Update any failing field names based on suggestions

**Step 3: Gradually Expand**

Enable strict mode for additional resource types once you're confident:

```typescript
export const STRICT_MODE_DEFAULTS = {
  enabled: false,
  resourceTypes: {
    companies: true,
    people: true,     // Add people
    deals: false,
    // ... 
  }
};
```

**Step 4: Full Migration**

Once all resource types are working correctly:

```typescript
export const STRICT_MODE_DEFAULTS = {
  enabled: true,    // Enable globally
  resourceTypes: {
    // All resource types inherit global setting
    tasks: false,   // Keep tasks disabled if needed for compatibility
  }
};
```

### Handling Legacy Code

If you have existing code that relies on non-strict behavior:

**Option 1: Update Field Names**
```typescript
// Before (might fail in strict mode)
await createRecord({
  resource_type: 'companies',
  record_data: {
    company_name: 'Acme',
    website: 'https://acme.com'
  }
});

// After (strict mode compatible)
await createRecord({
  resource_type: 'companies',
  record_data: {
    name: 'Acme',
    domains: ['acme.com']
  }
});
```

**Option 2: Disable Strict Mode Temporarily**
```typescript
// Disable strict mode for specific calls
await createRecord({
  resource_type: 'companies',
  record_data: {
    company_name: 'Acme',
    website: 'https://acme.com'
  },
  options: {
    useStrictMode: false  // Bypass strict validation
  }
});
```

## Impact on Field Validation

### With Strict Mode Enabled

**Enhanced Validation:**
- Field names validated against Attio schema
- Automatic field mapping applied
- Type coercion and format corrections
- Collision detection prevents conflicts
- Detailed error messages with suggestions

**Example Error Message:**
```
Field validation failed for companies:
  ❌ Unknown field "website". Did you mean "domains"?
  ❌ Field "about" not found. Did you mean "description"?

💡 Suggestions:
  • Use "domains" for company websites (as an array of strings)
  • Use "description" for company descriptions
  • Use "name" instead of "company_name"

📋 Available fields for companies:
  name, domains, description, industry, team_size, founded_at
```

### With Strict Mode Disabled

**Basic Validation:**
- Only validates required fields
- No automatic field mapping
- Generic error messages
- Fields passed directly to Attio API

**Example Error Message:**
```
Field validation failed: Invalid field names provided
```

## Performance Considerations

### Attribute Discovery Caching

Strict mode uses attribute discovery to validate field names. To minimize performance impact:

**Caching Strategy:**
- Attributes cached for 5 minutes by default
- Cache shared across all requests for same resource type
- Automatic cache cleanup and expiration
- Cache statistics available for monitoring

**Performance Metrics:**
```typescript
// Get cache performance stats
const stats = CachingService.getCacheStats();
console.log('Attribute cache hit rate:', stats.cacheEfficiency.attributes);
```

### Configuration Options

**Custom Cache TTL:**
```typescript
// Use longer cache for production
await discoverAttributesForResourceType(
  UniversalResourceType.COMPANIES,
  { 
    cacheTtl: 600000  // 10 minutes
  }
);
```

**Disable Caching for Development:**
```typescript
// Skip caching in development
await discoverAttributesForResourceType(
  UniversalResourceType.COMPANIES,
  { 
    useCache: false 
  }
);
```

## Troubleshooting

### Common Issues

**1. Field Mapping Conflicts**
```
Error: Multiple fields map to "domains": website, url, company_domain
```

**Solution:** Use only one field name:
```typescript
// Instead of multiple conflicting fields
{
  website: 'acme.com',
  url: 'acme.com',        // Conflict!
  company_domain: 'acme.com'  // Conflict!
}

// Use single field
{
  domains: ['acme.com']
}
```

**2. Unknown Fields**
```
Error: Unknown field "company_size". Did you mean "team_size"?
```

**Solution:** Use suggested field name:
```typescript
// Incorrect
{ company_size: 50 }

// Correct
{ team_size: 50 }
```

**3. Type Mismatches**
```
Error: Field "team_size" expects number, received string "50"
```

**Solution:** Use correct type:
```typescript
// Incorrect
{ team_size: "50" }

// Correct
{ team_size: 50 }
```

### Debugging

**Enable Debug Logging:**
```bash
DEBUG=UniversalCreateService,UniversalMetadataService npm start
```

**Check Cache Statistics:**
```typescript
import { CachingService } from './services/CachingService.js';

// Log cache performance
console.log('Cache Stats:', CachingService.getCacheStats());
```

**Validate Field Mappings:**
```typescript
import { mapRecordFields } from './handlers/tool-configs/universal/field-mapper.js';

// Test field mapping for a resource type
const result = await mapRecordFields(
  UniversalResourceType.COMPANIES,
  { company_name: 'Test', website: 'test.com' },
  ['name', 'domains', 'description']
);

console.log('Mapped fields:', result.mapped);
console.log('Warnings:', result.warnings);
console.log('Errors:', result.errors);
```

## Best Practices

### Recommended Settings

**For Development:**
- Enable strict mode for new features
- Use shorter cache TTL (1-2 minutes)
- Enable debug logging
- Test with both strict and non-strict modes

**For Production:**
- Enable strict mode globally
- Use longer cache TTL (5-10 minutes)
- Monitor cache hit rates
- Keep tasks in non-strict mode if using legacy task formats

### Field Naming Conventions

**Follow Attio's field naming:**
```typescript
// Preferred field names
{
  name: 'Company Name',          // Not: company_name, title
  domains: ['example.com'],      // Not: website, url
  email_addresses: ['...'],      // Not: email, emails
  phone_numbers: ['...'],        // Not: phone, phones
  team_size: 100,               // Not: size, employees
  description: 'About us',       // Not: about, summary
}
```

### Error Handling

**Always handle validation errors:**
```typescript
try {
  await createRecord({
    resource_type: 'companies',
    record_data: companyData
  });
} catch (error) {
  if (error instanceof UniversalValidationError) {
    // Handle field validation errors
    console.error('Field validation failed:', error.message);
    
    // Check for suggestions
    if (error.details?.suggestion) {
      console.log('Suggestion:', error.details.suggestion);
    }
  }
  throw error;
}
```

## API Reference

### Configuration Functions

```typescript
/**
 * Check if strict mode is enabled for a resource type
 */
function strictModeFor(resourceType: UniversalResourceType): boolean

/**
 * Get current strict mode configuration
 */
function getStrictModeConfig(): StrictModeConfig

/**
 * Override strict mode for a specific operation
 */
interface CreateOptions {
  useStrictMode?: boolean;
}
```

### Caching Functions

```typescript
/**
 * Get cached attribute discovery results
 */
CachingService.getCachedAttributes(
  resourceType: UniversalResourceType,
  objectSlug?: string,
  ttl?: number
): Record<string, unknown> | undefined

/**
 * Invalidate attribute cache
 */
CachingService.invalidateAttributeCache(
  resourceType: UniversalResourceType,
  objectSlug?: string
): void

/**
 * Get cache statistics
 */
CachingService.getCacheStats(): CacheStats
```

## Related Documentation

- [Field Mapping Guide](./field-mapping-guide.md)
- [Error Handling Best Practices](./error-handling.md)
- [Performance Optimization](./performance-optimization.md)
- [API Reference](./api-reference.md)