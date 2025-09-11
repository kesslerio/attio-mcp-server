# Deal Relationship Field Format Requirements

## Overview

This document outlines the specific field format requirements for deal relationship fields in the Attio MCP Server, based on the implementation and testing conducted during PR #617.

## Critical Format Requirements

### Associated Company Field

**Correct Format:**
```typescript
{
  "associated_company": [
    {
      "target_object": "companies",
      "target_record_id": "company-uuid-here"
    }
  ]
}
```

**INCORRECT Format (causes API errors):**
```typescript
{
  "associated_company": [
    {
      "record_id": "company-uuid-here"  // ❌ WRONG - missing target_object
    }
  ]
}
```

### Associated People Field

**Correct Format:**
```typescript
{
  "associated_people": [
    {
      "target_object": "people",
      "target_record_id": "person-uuid-here"
    },
    {
      "target_object": "people", 
      "target_record_id": "person-uuid-2"
    }
  ]
}
```

**INCORRECT Format (causes API errors):**
```typescript
{
  "associated_people": [
    {
      "record_id": "person-uuid-here"  // ❌ WRONG - missing target_object
    }
  ]
}
```

## Implementation Details

### Field Transformation

The `convertDealAttributes()` function in `src/utils/attribute-format-helpers.ts` handles automatic conversion:

```typescript
function convertDealAttributes(attributes: any): any {
  const corrected = { ...attributes };
  
  // Convert associated_company to proper format
  if ('associated_company' in corrected) {
    const value = corrected.associated_company;
    if (typeof value === 'string') {
      corrected.associated_company = [{ target_object: 'companies', target_record_id: value }];
    } else if (Array.isArray(value)) {
      corrected.associated_company = value.map(v => {
        if (typeof v === 'string') {
          return { target_object: 'companies', target_record_id: v };
        } else if (v && typeof v === 'object' && 'record_id' in v && !('target_record_id' in v)) {
          return { target_object: 'companies', target_record_id: v.record_id };
        }
        return v;
      });
    }
  }
  
  // Similar logic applies to associated_people
  return corrected;
}
```

### Input Flexibility

The system accepts multiple input formats and normalizes them:

1. **String format** (single ID): `"company-uuid"`
   - Automatically converted to proper object format

2. **Legacy object format**: `{ "record_id": "uuid" }`
   - Automatically converted to `{ "target_object": "companies", "target_record_id": "uuid" }`

3. **Correct object format**: `{ "target_object": "companies", "target_record_id": "uuid" }`
   - Used as-is

## Environment Configuration

### Stage Configuration

Use environment variables to avoid hard-coded stages:

```bash
# Basic stages for testing
ATTIO_VALID_DEAL_STAGES='["Interested","Qualified","In Progress"]'

# Full pipeline stages
ATTIO_DEAL_PIPELINE_STAGES='["Interested","Qualified","In Progress","Negotiation","Closed Won","Closed Lost"]'
```

### Deal Defaults

```bash
# Deal owner (must be email format)
ATTIO_DEFAULT_DEAL_OWNER=user@company.com

# Default stage (must exist in your Attio workspace)
ATTIO_DEFAULT_DEAL_STAGE=Interested

# Default currency
ATTIO_DEFAULT_CURRENCY=USD
```

## Testing Implications

### Test Data Factory

The `TestDataFactory.createDealData()` method now uses environment-configurable stages:

```typescript
static createDealData(testCase: string): DealCreateData {
  const stages = this.getValidDealStages(); // Uses env config
  return {
    name: `${testCase} Test Deal ${uniqueId}`,
    stage: stages[Math.floor(Math.random() * stages.length)],
    value: values[Math.floor(Math.random() * values.length)],
    owner: process.env.ATTIO_DEFAULT_DEAL_OWNER || 'martin@shapescale.com'
  };
}
```

### Quality Gate Requirements

- **P1 Essential Tests**: 100% pass rate required for deal operations
- All relationship field formats must be validated in tests
- Error handling must include specific field format guidance

## Troubleshooting

### Common Errors

1. **"record_id field not recognized"**
   - Cause: Using legacy `record_id` instead of `target_record_id`
   - Solution: Use proper format with `target_object` and `target_record_id`

2. **"Invalid stage name"**
   - Cause: Hard-coded stage that doesn't exist in workspace
   - Solution: Configure `ATTIO_VALID_DEAL_STAGES` environment variable

3. **"Owner field validation failed"**
   - Cause: Using workspace member ID instead of email
   - Solution: Use email format for `ATTIO_DEFAULT_DEAL_OWNER`

### Debug Tools

Use debug scripts for field mapping validation:

```bash
# Build project first
npm run build

# Debug field mapping
node scripts/debug/debug-field-mapping.js

# Debug format result compliance
node scripts/debug/debug-formatresult.js
```

## Migration Notes

If upgrading from older versions:

1. Update environment configuration to use new variables
2. Verify deal stages exist in your Attio workspace  
3. Convert owner configuration from member ID to email format
4. Test relationship field formats with debug tools

## Implementation Checklist

- [ ] Environment variables configured
- [ ] Relationship fields use proper `target_object`/`target_record_id` format
- [ ] Owner field uses email format
- [ ] Stages validated against workspace
- [ ] Debug tools tested
- [ ] Quality gates pass at 100%