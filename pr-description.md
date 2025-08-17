## Summary

Fix Issue #472: Task records display as "Unnamed" instead of showing content

### Problem
Tasks were showing as "Unnamed" in search results and record details because the formatResult functions only checked name/title fields, not the content field which tasks primarily use.

### Solution
- Updated field priority logic in both formatResult functions to include content field  
- Tasks now display their content when name/title are unavailable
- Maintains existing behavior for other record types (companies, people)

### Quality Improvements (Based on Code Review)

**Code Deduplication:**
- ✅ Created `extractDisplayName` utility function in `UniversalUtilityService`
- ✅ Eliminated duplicate field checking logic in both `searchRecordsConfig.formatResult` and `getRecordDetailsConfig.formatResult`
- ✅ Centralized display name extraction with consistent field priority: name → full_name → title → content

**Type Safety Enhancements:**
- ✅ Added proper TypeScript interfaces: `AttioFieldValue`, `AttioRecordValues`, `DisplayNameField`
- ✅ Replaced generic `Record<string, unknown>` with specific interfaces for better type safety
- ✅ Enhanced type checking for field value extraction

**Comprehensive Testing:**
- ✅ Added 50+ tests for `extractDisplayName` utility covering all edge cases
- ✅ Includes regression tests for Issue #472 
- ✅ Tests field priority, error handling, real-world data patterns, and backward compatibility

### Testing Results
- ✅ All 1608 tests pass (including Issue #472 specific tests)
- ✅ Regression testing confirms no behavior changes for existing functionality
- ✅ Both search results and record details now correctly display task content

### Field Priority Logic
1. **name** field (checks both 'value' and 'full_name' properties)
2. **full_name** field
3. **title** field  
4. **content** field ← **New for Issue #472**
5. **"Unnamed"** fallback

### Example Output
**Before:**
```
Found 2 tasks:
1. Unnamed (ID: task-123)
2. Unnamed (ID: task-456)
```

**After:**
```
Found 2 tasks:
1. Follow up with client about proposal (ID: task-123)
2. Schedule team meeting for next week (ID: task-456)
```

Closes #472