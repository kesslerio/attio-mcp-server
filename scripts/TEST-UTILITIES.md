# Test Utility Scripts

This directory contains enhanced test utility scripts to improve the testing workflow for the Attio MCP Server project.

## Scripts Overview

### 1. test-quick.sh
**Purpose**: Fast, targeted test execution for quick feedback during development.

**Key Features**:
- Run tests by pattern, file, or area (handlers, api, utils, etc.)
- Support for unit, integration, and E2E tests
- Color-coded output for quick visual feedback
- Coverage reporting
- Watch mode support
- Environment validation for integration tests

**Usage Examples**:
```bash
# Run all unit tests (fast, no API calls)
./scripts/test-quick.sh

# Run tests matching "companies"
./scripts/test-quick.sh companies

# Run handler tests with coverage
./scripts/test-quick.sh --handlers --coverage

# Run specific test file
./scripts/test-quick.sh test/utils/domain-utils.test.ts

# Run integration tests (requires API key)
./scripts/test-quick.sh --integration

# Watch companies tests for continuous feedback
./scripts/test-quick.sh companies --watch
```

### 2. test-watch.sh
**Purpose**: Continuous test running optimized for development workflow.

**Key Features**:
- Automatic re-runs on file changes
- Failed-only output by default (cleaner focus)
- Support for changed files only
- Vitest UI integration
- Real-time coverage updates
- VS Code terminal integration

**Usage Examples**:
```bash
# Watch all tests with smart defaults
./scripts/test-watch.sh

# Watch only failed tests in handlers
./scripts/test-watch.sh --handlers --failed-only

# Launch interactive Vitest UI
./scripts/test-watch.sh --ui

# Watch only changed files (great for active development)
./scripts/test-watch.sh --changed

# Watch specific test with coverage
./scripts/test-watch.sh companies --coverage
```

### 3. test-runner.sh
**Purpose**: Comprehensive menu-driven test runner for thorough testing.

**Key Features**:
- Interactive menu interface
- Environment validation before integration tests
- Test data setup utilities
- Multiple test suite options
- Resource-specific test categories
- Coverage reporting with browser integration
- Non-interactive mode for CI/automation

**Usage Examples**:
```bash
# Launch interactive menu
./scripts/test-runner.sh

# Run unit tests directly (non-interactive)
./scripts/test-runner.sh --non-interactive 2

# Run coverage report directly
./scripts/test-runner.sh --non-interactive 18
```

## Test Categories

### By Area
- `--handlers`: Handler tests (`test/handlers/`)
- `--api`: API tests (`test/api/`)
- `--utils`: Utility tests (`test/utils/`)
- `--objects`: Object tests (`test/objects/`)
- `--validators`: Validator tests (`test/validators/`)
- `--errors`: Error handling tests (`test/errors/`)

### By Resource Type
- `companies`: Company-related tests
- `people`: People-related tests
- `lists`: List management tests
- `notes`: Notes functionality tests
- `tasks`: Task management tests
- `records`: General record tests

### By Test Type
- `--unit`: Unit tests only (default, fast, offline)
- `--integration`: Integration tests (requires API key)
- `--e2e`: End-to-end tests (full workflow testing)

## Environment Requirements

### For Unit Tests
- No special environment setup required
- Tests run offline using mocked APIs
- Fast execution, suitable for TDD workflow

### For Integration Tests
- `ATTIO_API_KEY`: Required for API authentication
- `ATTIO_WORKSPACE_ID`: Recommended for consistent test data
- Internet connection for API calls
- Scripts will validate environment before running

### For E2E Tests
- Same as integration tests
- Additional test data may be set up automatically
- Longer execution time due to full workflow testing

## Tips for Effective Testing

1. **Development Workflow**: Use `test-watch.sh` during active development for immediate feedback
2. **Quick Checks**: Use `test-quick.sh` for fast validation of specific changes
3. **Comprehensive Testing**: Use `test-runner.sh` before commits or releases
4. **Coverage Analysis**: Add `--coverage` to any script to understand test coverage
5. **CI Integration**: Use non-interactive mode in automation pipelines

## Integration with Package.json Scripts

These utilities complement the existing npm scripts:
- `npm test`: Basic test run (equivalent to `./scripts/test-quick.sh`)
- `npm run test:offline`: Unit tests only
- `npm run test:integration`: Integration tests only
- `npm run test:watch`: Basic watch mode

The utility scripts provide enhanced functionality, better output, and more options for targeted testing.

## Troubleshooting

### Common Issues

1. **"vitest not found"**: Run `npm install` to ensure dependencies are installed
2. **Integration test failures**: Check `ATTIO_API_KEY` environment variable
3. **Permission denied**: Make sure scripts are executable (`chmod +x scripts/*.sh`)
4. **API connectivity**: Scripts will test API connectivity before integration tests

### Getting Help

All scripts support `--help` flag for detailed usage information:
```bash
./scripts/test-quick.sh --help
./scripts/test-watch.sh --help
./scripts/test-runner.sh --help
```