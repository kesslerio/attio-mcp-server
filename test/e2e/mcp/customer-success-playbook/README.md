# Customer Success Playbook Test Suite (Modular)

This directory contains the refactored, modular version of the Customer Success Playbook validation test suite. The original monolithic test file has been broken down into focused, reusable modules.

## Directory Structure

```
test/e2e/mcp/customer-success-playbook/
├── index.test.ts                        # Main test orchestrator (150 lines)
├── shared/
│   ├── types.ts                         # Shared interfaces/enums (40 lines)
│   ├── test-validator.ts                # TestValidator class (160 lines)
│   ├── test-executor.ts                 # executePlaybookTest function (120 lines)
│   └── reporting.ts                     # Report generation functions (150 lines)
├── suites/
│   ├── quick-start.test.ts              # Quick Start Examples tests (200 lines)
│   └── customer-journey.test.ts         # Customer Journey tests (250 lines)
└── README.md                            # This documentation
```

## Components

### Main Orchestrator (`index.test.ts`)

The main entry point that:
- Imports and runs all test suites
- Consolidates results from all suites
- Generates comprehensive reports
- Provides quality gate assessment
- Handles GitHub issue creation for failures

### Shared Utilities

#### `shared/types.ts`
- `PlaybookTestResult`: Interface for test results
- `ValidationLevel`: Enum for test validation levels
- `ValidationResult`: Interface for validation details

#### `shared/test-validator.ts`
- `TestValidator`: Class for multi-level test validation
- Tool-specific schema validation
- Error pattern detection
- HTTP status code analysis

#### `shared/test-executor.ts`
- `executePlaybookTest()`: Function for running individual test cases
- Handles MCP client interactions
- Provides detailed logging and validation

#### `shared/reporting.ts`
- `createFailureAnalysisReport()`: Generates failure analysis
- `createSingleGitHubIssue()`: Creates consolidated GitHub issues
- `createEnhancedValidationReport()`: Multi-level validation reports
- `getValidationLevelEmoji()`: Visual status indicators

### Test Suites

#### `suites/quick-start.test.ts`
Tests basic customer success operations:
- Customer portfolio overview
- Daily management routines
- Strategic account organization
- Follow-up task creation

#### `suites/customer-journey.test.ts`
Tests advanced customer success scenarios:
- Relationship mapping and stakeholder analysis
- Strategic communication planning
- Performance metrics and feedback collection
- Customer journey optimization
- Retention risk identification

## Usage

### Running the Full Suite

```bash
# Run the complete modular test suite
npm test -- test/e2e/mcp/customer-success-playbook/index.test.ts

# With verbose output
npx vitest run test/e2e/mcp/customer-success-playbook/index.test.ts --reporter=verbose
```

### Running Individual Suites

```bash
# Run only Quick Start tests
npm test -- test/e2e/mcp/customer-success-playbook/suites/quick-start.test.ts

# Run only Customer Journey tests  
npm test -- test/e2e/mcp/customer-success-playbook/suites/customer-journey.test.ts
```

### Environment Requirements

- `ATTIO_API_KEY`: Required for API integration tests
- Built MCP server: `npm run build` before running tests
- Network connectivity to Attio API

## Benefits of Modular Structure

### Maintainability
- Each module under 250 lines (vs. 962-line monolith)
- Clear separation of concerns
- Easy to locate and fix specific functionality

### Reusability
- Shared utilities can be used by other test suites
- TestValidator can validate other playbook types
- Reporting functions work across different test scenarios

### Scalability
- Easy to add new test suites without code duplication
- Can parallelize different test suites
- Simple to extend with new validation types

### Developer Experience
- Faster development cycles (smaller files to navigate)
- Multiple developers can work on different suites
- Clear boundaries reduce merge conflicts

## Validation Framework

The test suite uses a multi-level validation framework:

1. **Framework Level**: MCP tool execution success/failure
2. **API Level**: HTTP status codes and error patterns
3. **Data Level**: Expected response field validation
4. **Business Logic Level**: Contextual correctness

### Validation Levels

- 🟢 **FULL_SUCCESS**: All validation levels pass
- 🟡 **PARTIAL_SUCCESS**: Core functionality works with warnings
- 🔴 **API_ERROR**: HTTP errors or service issues
- 🟠 **DATA_ERROR**: Missing expected fields or malformed responses
- ⚫ **FRAMEWORK_ERROR**: Tool execution failures

## Migration from Original File

The original `customer-success-playbook-eval.test.ts` remains untouched during the transition period. Both versions can run in parallel:

### Original (Monolithic)
```bash
npm test -- test/e2e/mcp/customer-success-playbook-eval.test.ts
```

### New (Modular)
```bash
npm test -- test/e2e/mcp/customer-success-playbook/index.test.ts
```

## Quality Gates

The test suite enforces a 75% success rate quality gate:
- ✅ **PASSED**: ≥75% of tests successful
- ❌ **FAILED**: <75% success rate

Failures trigger:
- Detailed failure analysis reports
- GitHub issue creation with consolidated failures
- Specific recommendations for remediation

## Contributing

When adding new tests:

1. **Small Changes**: Add to existing suites
2. **New Categories**: Create new suite files in `suites/`
3. **Shared Logic**: Add to appropriate `shared/` modules
4. **Large Changes**: Update the main orchestrator

### Testing Guidelines

- Keep individual test files under 300 lines
- Use shared utilities for common operations
- Include proper error handling and validation
- Add descriptive test names and expected outcomes

## Troubleshooting

### Common Issues

1. **Missing test results**: Check that suites export results to global
2. **Import errors**: Ensure all shared modules use proper exports
3. **API failures**: Verify `ATTIO_API_KEY` and network connectivity
4. **Timeout issues**: Some tests may need longer timeouts for API calls

### Debug Mode

Run with debug logging:
```bash
MCP_LOG_LEVEL=DEBUG npm test -- test/e2e/mcp/customer-success-playbook/index.test.ts
```
Important: These playbook tests assume your Attio workspace contains relevant Customer Success data (companies, notes with specific keywords, recent activity). If you only use Attio for sales, these will often return empty results, which are treated as Partial Success where possible.

Activation flags
- Skip by default. Set `CS_E2E_ENABLE=true` to run this suite.
- Optional deterministic seeding: `CS_E2E_SEED=true` creates a demo company and notes for stable results; cleanup runs automatically.

Data prerequisites
- Content searches pass only if notes include the target phrases.
- Timeframe queries require records in the requested date range.
- Segmentation/retention probes require matching companies; otherwise the suite reports empty findings with guidance.
