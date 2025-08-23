# Debug Scripts

This directory contains debugging and diagnostic scripts used during development. These scripts are preserved for future troubleshooting and development work.

## ⚠️ IMPORTANT: Test Data Warning

Some debug scripts create test data in your Attio workspace. Always:
1. **Check script documentation** before running API-dependent scripts  
2. **Use cleanup tools** after testing: `./scripts/cleanup-test-data.sh --prefix=DEBUG_ --live`
3. **Prefer dry-run mode** when available to preview actions

Scripts that create data are clearly marked with ⚠️ in the documentation below.

## Prerequisites

1. **Build the project**: `npm run build` (scripts import from `dist/`)
2. **Working directory**: Run scripts from `scripts/debug/` directory
3. **API configuration**: Some scripts require `ATTIO_API_KEY` environment variable
4. **Node.js**: Scripts use ES6 modules and require Node.js 14+

## Quick Start

```bash
# From project root
npm run build

# Navigate to debug directory  
cd scripts/debug/

# Run any debug script
node debug-formatresult.js
```

## Email Processing Debug Scripts

### `debug-email-validation.js`
**Purpose**: Tests email validation pipeline to isolate "[object object]" errors
**Usage**: `node debug-email-validation.js`
**Key Features**: 
- Tests different email input formats (string vs object)
- Traces data transformation through normalization and validation
- Helps debug email address field parsing issues

## Field Processing Debug Scripts

### `debug-field-mapping.js`
**Purpose**: Tests field mapping and transformation logic
**Usage**: `node debug-field-mapping.js`
**Key Features**: Helps debug field mapping issues between different data formats

### `debug-formatresult.js`
**Purpose**: Tests formatResult behavior in different contexts
**Usage**: `node debug-formatresult.js`
**Key Features**: 
- Tests formatResult consistency (should always return string)
- Simulates universal dispatcher behavior
- Validates Issue #483 formatResult pattern compliance

## Data Processing Debug Scripts

### `debug-sanitize.js`
**Purpose**: Tests data sanitization and cleaning logic
**Usage**: `node debug-sanitize.js`

### `debug-recursive.js`
**Purpose**: Tests recursive data processing operations
**Usage**: `node debug-recursive.js`

### `debug-nonexistent-records.js`
**Purpose**: Tests handling of nonexistent or invalid record references
**Usage**: `node debug-nonexistent-records.js`

## API Integration Debug Scripts

### `debug-company-test.js`
**Purpose**: Tests company-specific API operations
**Usage**: `node debug-company-test.js`

### `debug-companies-import.js`
**Purpose**: Tests company import functionality
**Usage**: `node debug-companies-import.js`

### `debug-successful-response.js`
**Purpose**: Tests successful API response handling
**Usage**: `node debug-successful-response.js`

## Tool and Configuration Debug Scripts

### `debug-tools.js`
**Purpose**: Tests tool handler registration and functionality
**Usage**: `node debug-tools.js`
**Key Features**:
- Tests tool handler registration with mock server
- Provides mock server for tool testing
- Tests ListTools and CallTool functionality
- Validates tool discovery and execution pipeline

### `debug-tool-lookup.js`
**Purpose**: Tests tool discovery and lookup mechanisms
**Usage**: `node debug-tool-lookup.js`

### `debug-imports.js`
**Purpose**: Tests import resolution and module loading
**Usage**: `node debug-imports.js`

### `debug-tools.js`
**Purpose**: Tests MCP tool handler registration and functionality  
**Usage**: `node debug-tools.js`
**Key Features**:
- Mock server for tool testing
- Tests ListTools and CallTool operations  
- Validates tool handler registration
- Demonstrates MCP protocol compliance

### `debug-uuid.js`
**Purpose**: Tests UUID generation and validation
**Usage**: `node debug-uuid.js`

### `debug-specific.js`
**Purpose**: Specific debugging scenarios
**Usage**: `node debug-specific.js`

## General Test Scripts

### `test-*.js` files
Various test scripts for specific functionality:
- `test-comprehensive-fix.js`: Comprehensive fix validation
- `test-config-check.js`: Configuration validation
- `test-create-response.js/.mjs`: Response creation testing
- `test-deal-defaults-fix.js`: Deal defaults handling
- `test-deal-field-errors.js`: Deal field validation
- `test-field-filtering.js`: Field filtering logic
- `test-field-validation.js`: General field validation
- `test-get-record-list-memberships.js`: List membership operations
- `test-import-dist.js`: Distribution import testing
- `test-import.js`: General import testing
- `test-lists-exposure.js`: Lists API exposure testing
- `test-response.js`: Response handling
- `test-validation-only.js`: Validation-only operations

## Script Status

### ✅ Verified Working (Tested 2025-08-23)
- `debug-formatresult.js` - Fully functional, tests format consistency
- `debug-email-validation.js` - Fully functional, tests email normalization
- `test-import.js` - Functional, validates import resolution
- `debug-tools.js` - Functional, tests MCP tool registration

### ⚠️ Requires API Key
Scripts requiring `ATTIO_API_KEY` environment variable:
- `debug-field-mapping.js` ⚠️ **Creates test data** (with DEBUG_ prefix)
- `debug-company-test.js` ⚠️ **May create test data via E2E tests**
- `test-create-response.js` ✅ **Creates and cleans up test data**
- Most other `test-*.js` scripts with live API calls

### 🧹 Test Data Management
Scripts that create test data use `DEBUG_` prefixes for easy cleanup:
```bash
# Clean up all debug test data
./scripts/cleanup-test-data.sh --prefix=DEBUG_ --live

# Preview what would be deleted (dry run)
./scripts/cleanup-test-data.sh --prefix=DEBUG_ --dry-run
```

### 🔧 Import Path Fixed (Ready for Testing)
All remaining scripts have had import paths corrected from `./dist/` to `../../dist/`

## Usage Guidelines

1. **Before Running**: Ensure you have built the project (`npm run build`)
2. **Working Directory**: Run scripts from `scripts/debug/` directory
3. **API Keys**: Export `ATTIO_API_KEY=your_key` for API-dependent scripts  
4. **Dependencies**: Scripts import from the compiled distribution (`../../dist/`)

## Maintenance

- Review and update scripts when making major architectural changes
- Remove scripts that become obsolete
- Consider converting useful debug patterns into proper unit tests