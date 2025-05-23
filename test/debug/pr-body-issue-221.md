Resolves #221

## Problem Statement
**CRITICAL Data Integrity Issue**: The `create-company` MCP tool was not automatically extracting domain information from website URLs, causing duplicate company records to be created instead of recognizing existing companies. This violated Attio's uniqueness constraints and led to data fragmentation.

## Root Cause Analysis
Attio uses the `domains` attribute as a key identifier for company uniqueness. When the MCP server failed to populate this field automatically, Attio could not prevent duplicate company creation, leading to:

- **Duplicate Records**: Same companies created multiple times
- **Data Fragmentation**: Company information scattered across multiple records  
- **Relationship Corruption**: People associated with wrong company records
- **Broken Business Logic**: Analytics and uniqueness checks failing

## Solution Implemented
### 🔧 **Automatic Domain Extraction**
Added `CompanyValidator.extractDomainFromWebsite()` method that:
- Extracts domains from website URLs (e.g., `https://www.example.com` → `example.com`)
- Normalizes domains (removes www prefix using existing `normalizeDomain()`)
- Populates `domains` field automatically during company creation/update
- Preserves manually set domains (doesn't overwrite existing values)

### 🛡️ **Data Integrity Protection** 
- Integrates with existing domain extraction utilities for consistency
- Skips validation conflicts for auto-extracted domains
- Works for both `create-company` and `update-company` operations
- Maintains backward compatibility with existing workflows

### ✅ **Verification Results**
Test results confirm:
```
[CompanyValidator] Auto-extracted domain "theplasticsdoc.com" from website "https://www.theplasticsdoc.com"
```

When attempting to create a duplicate:
```
uniqueness_conflict: The value "{"domain":"theplasticsdoc.com"}" conflicts with one already in the system. 
This attribute has a uniqueness constraint.
```

**This error is exactly what we want** - it proves:
1. ✅ Domain extraction working correctly
2. ✅ Attio receiving domain data properly  
3. ✅ Uniqueness constraints preventing duplicates
4. ✅ Data integrity issue resolved

## Impact
- **Eliminates duplicate company creation**
- **Restores CRM data integrity**  
- **Enables proper relationship management**
- **Fixes analytics and reporting accuracy**
- **Reduces manual data cleanup overhead**

## Files Changed
- `src/validators/company-validator.ts` - Added domain extraction logic
- `test/debug/test-*.js` - Comprehensive test scripts for verification

## Backward Compatibility
✅ Fully backward compatible - existing workflows unchanged, new functionality enhances data quality automatically. 