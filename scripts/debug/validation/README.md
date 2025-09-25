# Validation Debug Scripts

Scripts for testing validation flows, field mapping, and enhanced validation UX.

## Scripts

### `test-update-validation-flow.js`

Tests the complete update record validation workflow including:

- Enhanced validation for deals
- Field mapping warnings and suggestions
- Validation metadata formatting
- PII sanitization checks

**Usage:**

```bash
npm run build
node scripts/debug/validation/test-update-validation-flow.js
```

### `debug-field-mapping.js`

Debugs field mapping logic and transformation issues:

- Tests field name mappings
- Validates transformation rules
- Checks for mapping collisions
- Identifies invalid field mappings

**Usage:**

```bash
npm run build
node scripts/debug/validation/debug-field-mapping.js
```

### `test-field-validation.js`

Tests individual field validation rules:

- Type validation
- Format validation
- Required field checks
- Custom validation rules

### `test-validation-only.js`

Isolated validation testing without side effects:

- Pure validation logic testing
- No API calls or data persistence
- Fast iteration for validation rule development

## Key Validation Features

### Enhanced Deal Validation

- Uses `UniversalUpdateService.updateWithEnhancedValidation()`
- Provides field mapping suggestions
- Shows actual vs expected values
- Handles validation metadata gracefully

### PII Sanitization

- Scrubs sensitive data from validation messages
- Ensures no secrets in validation metadata
- Maintains compliance with data protection requirements

### Field Mapping Intelligence

- Detects common field name variations
- Suggests standard field names
- Provides context-aware recommendations
- Handles domain-specific mappings

## Related Issues

- Issue #728: Enhanced validation warnings UX for deal field mapping
- PR #732: Enhanced deal field mapping for intuitive field names
- Issue #720: Deal field mapping improvements
