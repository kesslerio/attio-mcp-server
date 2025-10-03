# Field Verification Configuration

## Overview

The MCP server verifies that field updates persist correctly after API calls. This helps catch data transformation issues where Attio normalizes or reformats your data.

## Configuration Options

### Disable All Verification Warnings

By default, the server checks if updated fields match what you sent. To disable these checks:

```bash
export ENABLE_FIELD_VERIFICATION=false
```

### Strict Mode (Treat Warnings as Errors)

To convert format mismatch warnings into validation errors:

```bash
export STRICT_FIELD_VALIDATION=true
```

When enabled, any field persistence mismatch will cause the update to fail.

## Understanding Warnings

### What Persistence Warnings Mean

⚠️ **Field persistence mismatch** warnings indicate:

- ✅ The update **succeeded** (HTTP 200/204 status)
- ℹ️ The returned data has different formatting than what you sent
- 🔄 This is often cosmetic (Attio adds metadata or restructures)
- ✓ You can safely ignore these in most cases

### Common Examples

#### Example 1: Deal Stage Updates

**You send:**

```json
{
  "stage": "Demo"
}
```

**Attio returns:**

```json
{
  "stage": {
    "title": "Demo",
    "id": "stage-uuid",
    "active_from": "2025-08-23T10:00:00Z"
  }
}
```

This triggers a warning because the structure changed, but the update succeeded and the stage is correct.

#### Example 2: Select Fields

**You send:**

```json
{
  "status": "Active"
}
```

**Attio returns:**

```json
{
  "status": [
    {
      "value": "Active",
      "type": "select",
      "updated_at": "2025-08-23T10:00:00Z"
    }
  ]
}
```

Again, the format differs but the value is correct.

## When to Use Each Mode

### Default Mode (Warnings Enabled)

**Best for:** Most users and normal operations

- Shows informational warnings about format differences
- Allows updates to proceed
- Helps identify potential data transformation issues

### Disabled Mode (`ENABLE_FIELD_VERIFICATION=false`)

**Best for:** Production environments with known data transformations

- No verification performed
- Fastest performance
- Trust that Attio handles data correctly

### Strict Mode (`STRICT_FIELD_VALIDATION=true`)

**Best for:** Development and testing environments

- Catches any discrepancies between sent and received data
- Fails fast on unexpected transformations
- Helps debug field mapping issues

## Troubleshooting

### "Field persistence mismatch" Warnings

**Q: Should I be worried about these warnings?**

A: Not usually. These warnings indicate that Attio reformatted your data, but the update succeeded. Review the warning details to confirm the value is semantically correct (e.g., "Demo" vs `{title: "Demo"}`).

**Q: How do I silence these warnings?**

A: Set `ENABLE_FIELD_VERIFICATION=false` in your environment.

**Q: When should I investigate warnings?**

A: Investigate if:

- The semantic value changed (e.g., "Demo" became "Discovery")
- Required fields are missing from the response
- Multiple fields show mismatches consistently

### Common Issues

**Issue**: Too many warnings in logs

**Solution**: Disable verification or run in strict mode temporarily to identify real issues, then disable

**Issue**: Updates appear to fail but Attio shows data changed

**Solution**: Check if `STRICT_FIELD_VALIDATION=true` is set. Warnings are being treated as errors.

## Related Configuration

See also:

- [Warning Filter Configuration](./warning-filters.md) - Understanding cosmetic vs semantic mismatches, ESLint budgets, and suppression strategies
- [Environment Variables](../configuration.md#environment-variables) - All available env vars
- [Common Update Patterns](../examples/common-update-patterns.md) - Examples of typical updates
- [Error Handling](../error-handling.md) - Understanding error messages

---

**Issue**: #798 - UX improvements for error messages and person attributes
