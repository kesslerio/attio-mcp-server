# Install Script Tests

Automated tests for bash install scripts using Vitest + Node.js child_process.

## Overview

This test suite validates the install scripts in `/scripts/`:

- `install-claude-desktop.sh` - Claude Desktop installer
- `install-cursor.sh` - Cursor IDE installer
- `install-claude-code.sh` - Claude Code CLI installer

## Running Tests

```bash
# Run install script tests only
npm run test:install-scripts

# Run as part of full test suite
npm test
```

## Test Categories

### 1. Syntax Validation

Validates bash script syntax without execution using `bash -n`.

### 2. Function Tests

Tests individual bash functions in isolation:

- `validate_api_key` - API key format validation (security)
- `get_claude_config_dir` - OS-specific config directory detection
- `command_exists` - Command availability checking
- `backup_config` - Config file backup creation

### 3. Security Tests

Validates injection prevention:

- Command injection via API key
- Special character handling in paths
- Quote and backtick escape prevention

## Test Architecture

```
test/scripts/
├── install-scripts.test.ts    # Main test file
├── helpers/
│   └── shell-test-utils.ts    # Bash execution utilities
├── fixtures/
│   └── mock-config.json       # Test fixture
└── README.md                  # This file
```

## How It Works

Tests use `child_process.execSync` to:

1. Source the bash script
2. Call specific functions with test arguments
3. Capture stdout, stderr, and exit codes
4. Assert expected behavior

Example:

```typescript
// Test that validate_api_key rejects injection attempts
const isValid = testBashPredicate(SCRIPT_PATH, 'validate_api_key', [
  'key; rm -rf /',
]);
expect(isValid).toBe(false);
```

## Adding New Tests

1. Import utilities from `./helpers/shell-test-utils.js`
2. Use `execBashFunction()` for function output testing
3. Use `testBashPredicate()` for exit code testing
4. Use `createTempDir()`/`cleanupTempDir()` for file operations

## References

- Issue #958: Install Script Test Suite
- PR #956: Install script implementation
