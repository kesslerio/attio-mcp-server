# Issue #176: Industry Field Mapping Issue

## Problem Description

Claude tries to use the `industry` field name when creating or updating companies, but the Attio API expects a different field name or format for this data. This causes failures when attempting to set company industry values.

## Investigation Steps

1. **Analyze Attribute Mapping System**:
   - Examine the existing attribute mapping code in `/src/utils/attribute-mapping/`
   - Review the mapping configuration in `/config/mappings/default.json`
   - Check `legacy-maps.ts` for how industry is currently mapped

2. **Identify Current Implementation**:
   - Look at how industry is defined in company types:
     - `src/types/company-types.ts`
     - `src/objects/companies/types.ts`
   - Examine API usage in company creation/update operations

3. **Verify API Requirements**:
   - Check what field name the Attio API actually expects for industry data
   - Determine if there's a formatting mismatch (e.g., string vs. select option)
   - Test with direct API calls to confirm the expected format

4. **Review Existing Tests**:
   - Look at test cases that use industry field
   - Note any tests that may be working despite the issue (workarounds)
   - Check for error patterns in failing tests

## Root Cause Analysis

The issue likely stems from one of these causes:

1. **Field Name Mismatch**: The Attio API expects a different field name than "industry" (e.g., "industry_type" or "sector")
2. **Value Format Mismatch**: The API expects a structured format for industry values (e.g., select ID vs. string value)
3. **Mapping Chain Issue**: The attribute mapper fails to properly translate "industry" to the correct API field

Based on our codebase investigation, the most likely issues are:

- The API expecting a select value with specific structure instead of a string
- Different field name requirements in different API endpoints (inconsistency)

## Implementation Guidelines

### 1. Enhance Special Case Handling

Update the `handleSpecialCases` function in `src/utils/attribute-mapping/mapping-utils.ts` to include industry-specific mappings:

```typescript
export function handleSpecialCases(key: string): string | undefined {
  // Convert to lowercase for consistency
  const lowerKey = key.toLowerCase();
  
  // Map of special cases with their mappings
  const specialCases: Record<string, string> = {
    // Existing mappings...
    
    // Add industry-specific mappings
    'industry': 'industry_type', // If API expects a different field name
    'industry_type': 'industry_type',
    'sector': 'industry_type',
    'business_sector': 'industry_type',
    // Add any additional variants needed
  };
  
  // Rest of the function remains the same
}
```

### 2. Update Value Formatting

If the issue is with value formatting, implement a value transformation in `src/utils/attribute-mapping/attribute-mappers.ts`:

```typescript
export function formatAttributeValue(
  objectType: string, 
  attributeName: string, 
  value: any
): any {
  // Special handling for industry values if needed
  if (objectType === 'companies' && attributeName === 'industry_type') {
    // Convert string values to the expected format
    if (typeof value === 'string') {
      return { value, id: `industry_${value.toLowerCase().replace(/\s+/g, '_')}` };
      // Or return structure required by the API
    }
  }
  
  // Default case: return the value as is
  return value;
}
```

### 3. Update Configuration

Ensure the mapping configuration in `config/mappings/default.json` correctly maps industry:

```json
{
  "mappings": {
    "attributes": {
      "common": {
        // Update if needed
        "Industry": "industry_type"
      },
      "objects": {
        "companies": {
          "Industry": "industry_type",
          "Sector": "industry_type",
          "Business Sector": "industry_type"
        }
      }
    }
  }
}
```

### 4. Add Detection and Validation

Add validation in `src/validators/company-validator.ts` to ensure industry values are formatted correctly:

```typescript
validateIndustryField(value: any): boolean {
  // Implement validation logic based on API requirements
  // Return true if valid, false otherwise
}
```

### 5. Add Fallback for Compatibility

Implement a fallback mechanism in company operations to handle both formats:

```typescript
// In src/objects/companies/basic.ts or other relevant file
function normalizeCompanyAttributes(attributes: CompanyAttributes): CompanyAttributes {
  const normalized = { ...attributes };
  
  // Handle industry field
  if ('industry' in normalized && !('industry_type' in normalized)) {
    normalized.industry_type = normalized.industry;
    // Keep original for backward compatibility or delete if it causes issues
    // delete normalized.industry;
  }
  
  return normalized;
}
```

## Testing Procedures

1. **Unit Tests**:
   - Add tests for industry field mapping in `/test/utils/attribute-mapping.test.ts`
   - Test both string values and structured values

2. **Integration Tests**:
   - Create test for company creation with industry field
   - Test company updates specifically updating the industry field
   - Test batch operations including industry updates

3. **Test Cases to Implement**:
   ```typescript
   // Industry mapping test
   it('should correctly map industry field names', () => {
     const variations = ['Industry', 'industry', 'Business Sector', 'sector'];
     variations.forEach(name => {
       const result = getAttributeSlug(name, 'companies');
       expect(result).toBe('industry_type'); // Or whatever the correct mapping is
     });
   });
   
   // Company creation with industry test
   it('should successfully create company with industry field', async () => {
     const company = await createCompany({
       name: 'Test Company',
       industry: 'Technology'
     });
     
     expect(company.values?.industry_type?.[0]?.value).toBe('Technology');
     // Or verify the expected structure
   });
   ```

4. **Manual Verification**:
   - Test with real API using a test account
   - Verify industry values are correctly displayed in the Attio UI
   - Verify Claude can correctly handle industry fields in different contexts

## Acceptance Criteria

1. Claude can successfully create companies with industry values
2. Claude can successfully update company industry values
3. Industry field is properly displayed when retrieving company information
4. Attribute mapping works for variations of "industry" (case insensitive)
5. Works with both direct attribute access and nested company operations
6. All tests pass, including new tests specifically for this issue
7. The solution is backward compatible with existing code

## Additional Considerations

- Check if this issue affects other similar fields that might use select values
- Document the fix in the codebase with clear comments
- Consider adding logging to help diagnose similar issues in the future
- Update any related documentation about the attribute mapping system