# E2E Test Suite for Attio MCP Server

Comprehensive end-to-end testing framework for all MCP tools with configurable workspace support.

## 🎯 Overview

This E2E test suite provides comprehensive testing for:
- **13 Universal Tools**: Complete coverage of all universal MCP operations
- **Legacy Tools**: List management, notes, tasks, and other specific operations
- **Error Scenarios**: Comprehensive error handling validation
- **Real API Integration**: Tests against actual Attio workspace
- **Data Isolation**: Safe testing without polluting workspace data

## 🚀 Quick Start

### 1. Setup Configuration

```bash
# Copy the template configuration
cp test/e2e/config.template.json test/e2e/config.local.json

# Edit the local configuration with your workspace details
# config.local.json is gitignored for security
```

### 2. Configure Your Workspace

Edit `test/e2e/config.local.json`:

```json
{
  "testData": {
    "testDataPrefix": "E2E_TEST_",
    "testEmailDomain": "@your-test-domain.com",
    "testCompanyDomain": "test.your-company.com"
  },
  "workspace": {
    "currency": "USD",
    "dealStages": ["Prospecting", "Qualified", "Closed Won"],
    "customFields": {
      "companies": ["industry", "size"],
      "people": ["department", "seniority"]
    }
  },
  "features": {
    "skipDealTests": false,
    "skipTaskTests": false,
    "skipCustomObjectTests": true
  }
}
```

### 3. Set Environment Variables

```bash
# Required: Your Attio API key
export ATTIO_API_KEY="your_api_key_here"

# Optional: Skip E2E tests entirely
export SKIP_E2E_TESTS=true
```

### 4. Run Tests

```bash
# Validate configuration
npm run e2e:validate

# Run all E2E tests
npm run e2e

# Run specific test suites
npm run e2e:universal    # Test all 13 universal tools
npm run e2e:lists        # Test list management
npm run e2e:notes        # Test note operations
npm run e2e:tasks        # Test task operations
npm run e2e:errors       # Test error handling

# Watch mode for development
npm run e2e:watch

# Debug mode with verbose output
npm run e2e:debug
```

### 5. Cleanup Test Data

```bash
# Cleanup all test data
npm run e2e:cleanup

# Dry run to see what would be cleaned
npm run e2e:cleanup:dry

# Force cleanup even if disabled in config
npm run e2e:cleanup:force
```

## 📋 Test Coverage

### Universal Tools (13 tools)
- ✅ `search-records` - Search across all resource types
- ✅ `get-record-details` - Get detailed record information
- ✅ `create-record` - Create new records
- ✅ `update-record` - Update existing records
- ✅ `delete-record` - Delete records
- ✅ `get-attributes` - Get record attributes
- ✅ `discover-attributes` - Discover available attributes
- ✅ `get-detailed-info` - Get specific info types (contact, business, etc.)
- ✅ `advanced-search` - Advanced search with complex filters
- ✅ `search-by-relationship` - Search by relationships
- ✅ `search-by-content` - Search by content (notes, activity)
- ✅ `search-by-timeframe` - Search by time-based criteria
- ✅ `batch-operations` - Batch CRUD operations

### Legacy Tools
- ✅ List management operations
- ✅ Note creation and management
- ✅ Task operations
- ✅ Resource-specific tools (if not deprecated)

### Test Scenarios
Each tool is tested with:
- **Happy Path**: Standard successful operations
- **Edge Cases**: Boundary conditions, special characters, empty data
- **Error Cases**: Invalid inputs, non-existent resources, permission errors
- **Integration**: Cross-tool workflows (create → update → delete)
- **Performance**: Response time validation

## 🏗️ Architecture

### Directory Structure
```
test/e2e/
├── config.template.json     # Configuration template (committed)
├── config.local.json       # Local config (gitignored)
├── setup.ts                # Test setup utilities
├── cleanup.ts              # Cleanup utilities
├── README.md               # This documentation
├── fixtures/               # Test data fixtures
│   ├── companies.ts        # Company test data
│   ├── people.ts          # Person test data
│   ├── lists.ts           # List test data
│   └── tasks.ts           # Task test data
├── suites/                 # Test suites
│   ├── universal-tools.e2e.test.ts
│   ├── list-management.e2e.test.ts
│   ├── notes.e2e.test.ts
│   ├── tasks.e2e.test.ts
│   └── error-handling.e2e.test.ts
└── utils/                  # E2E utilities
    ├── config-loader.ts    # Configuration management
    ├── test-data.ts       # Test data generation
    └── assertions.ts      # Custom assertions
```

### Configuration System
- **Template Config**: Version-controlled template with all options documented
- **Local Config**: Gitignored file with workspace-specific settings
- **Environment Overrides**: CI/CD support via environment variables
- **Validation**: Comprehensive config validation on startup

### Test Data Management
- **Prefixed Data**: All test data prefixed with `E2E_TEST_` for easy identification
- **Automatic Cleanup**: Test objects automatically tracked and cleaned up
- **Data Isolation**: Separate test domains to avoid workspace pollution
- **Fixtures**: Pre-configured test scenarios for consistent testing

## 🔧 Configuration Options

### Test Data Settings
```json
{
  "testData": {
    "testDataPrefix": "E2E_TEST_",          // Prefix for all test data
    "testEmailDomain": "@test.example.com", // Domain for test emails
    "testCompanyDomain": "test.example.com", // Domain for test companies
    "existingCompanyId": null,               // Optional: Use existing company for read tests
    "existingPersonId": null,                // Optional: Use existing person for read tests
    "existingListId": null                   // Optional: Use existing list for read tests
  }
}
```

### Workspace Configuration
```json
{
  "workspace": {
    "currency": "USD",                       // Workspace currency
    "dealStages": ["Stage1", "Stage2"],      // Available deal stages
    "customFields": {
      "companies": ["field1", "field2"],    // Custom company fields
      "people": ["field1", "field2"]        // Custom people fields
    }
  }
}
```

### Feature Flags
```json
{
  "features": {
    "skipDealTests": false,          // Skip deal-related tests
    "skipTaskTests": false,          // Skip task tests
    "skipCustomObjectTests": true,   // Skip custom object tests
    "skipNoteTests": false,          // Skip note tests
    "skipListTests": false           // Skip list tests
  }
}
```

### Test Settings
```json
{
  "testSettings": {
    "cleanupAfterTests": true,       // Auto-cleanup test data
    "maxRetries": 3,                 // Retry failed operations
    "retryDelay": 1000,              // Delay between retries (ms)
    "testTimeout": 60000,            // Test timeout (ms)
    "hookTimeout": 10000,            // Setup/cleanup timeout (ms)
    "sequentialExecution": true,     // Run tests sequentially
    "verboseLogging": false          // Enable verbose logging
  }
}
```

## 🌍 Environment Variables

### Required
- `ATTIO_API_KEY` - Your Attio API key for workspace access

### Optional Test Control
- `SKIP_E2E_TESTS=true` - Skip all E2E tests
- `E2E_CLEANUP_AFTER_TESTS=false` - Disable automatic cleanup
- `E2E_VERBOSE_LOGGING=true` - Enable verbose logging
- `E2E_TEST_TIMEOUT=120000` - Override test timeout (ms)

### Optional Data Overrides
- `E2E_TEST_PREFIX` - Override test data prefix
- `E2E_TEST_EMAIL_DOMAIN` - Override test email domain
- `E2E_TEST_COMPANY_DOMAIN` - Override test company domain
- `E2E_EXISTING_COMPANY_ID` - Use existing company for read tests
- `E2E_EXISTING_PERSON_ID` - Use existing person for read tests

### Optional Feature Flags
- `E2E_SKIP_DEAL_TESTS=true` - Skip deal tests
- `E2E_SKIP_TASK_TESTS=true` - Skip task tests
- `E2E_SKIP_CUSTOM_OBJECT_TESTS=true` - Skip custom object tests

## 🧪 Writing E2E Tests

### Basic Test Structure
```typescript
import { describe, it, beforeAll, afterAll } from 'vitest';
import { E2ETestBase } from '../setup.js';
import { E2EAssertions } from '../utils/assertions.js';
import { CompanyFactory } from '../utils/test-data.js';

describe('Universal Tools E2E', () => {
  beforeAll(async () => {
    await E2ETestBase.setup({
      requiresRealApi: true,
      cleanupAfterTests: true
    });
  });

  afterAll(async () => {
    // Cleanup handled automatically
  });

  it('should create company record', async () => {
    const companyData = CompanyFactory.create();
    
    // Your test implementation here
    const response = await callMcpTool('create-record', {
      resource_type: 'companies',
      record_data: companyData
    });

    // Use custom E2E assertions
    E2EAssertions.expectMcpSuccess(response);
    E2EAssertions.expectAttioRecord(response.data, 'companies');
    E2EAssertions.expectTestDataPrefix(response.data);
  });
});
```

### Using Test Fixtures
```typescript
import companyFixtures from '../fixtures/companies.js';
import personFixtures from '../fixtures/people.js';

// Use pre-configured fixtures
const techStartup = companyFixtures.technology.startup();
const salesRep = personFixtures.sales.rep();

// Use scenarios for complex testing
const salesTeam = personFixtures.scenarios.salesOrganization();
```

### Custom Assertions
```typescript
import { E2EAssertions, expectE2E } from '../utils/assertions.js';

// Traditional assertions
E2EAssertions.expectMcpSuccess(response);
E2EAssertions.expectAttioRecord(record, 'companies');
E2EAssertions.expectTestDataPrefix(data);

// Fluent assertions
expectE2E(response).toBeValidMcpResponse();
expectE2E(record).toBeValidAttioRecord('companies');
expectE2E(email).toBeTestEmail();
```

## 🔍 Debugging

### Verbose Logging
```bash
# Enable verbose logging for all operations
npm run e2e:debug

# Or set environment variable
E2E_VERBOSE_LOGGING=true npm run e2e
```

### Individual Test Debugging
```bash
# Run specific test file with debugging
vitest --config vitest.config.e2e.ts --reporter=verbose test/e2e/suites/universal-tools.e2e.test.ts

# Run single test with name pattern
vitest --config vitest.config.e2e.ts -t "should create company"
```

### Configuration Debugging
```bash
# Validate configuration
npm run e2e:validate

# Check what test data would be created
npm run e2e:cleanup:dry
```

## 🚨 Troubleshooting

### Common Issues

#### Configuration Errors
```bash
# Error: Configuration file not found
# Solution: Copy template and configure
cp test/e2e/config.template.json test/e2e/config.local.json
```

#### API Key Issues
```bash
# Error: ATTIO_API_KEY required
# Solution: Set environment variable
export ATTIO_API_KEY="your_key_here"
```

#### Test Data Pollution
```bash
# Clean up orphaned test data
npm run e2e:cleanup:force

# Check what would be cleaned
npm run e2e:cleanup:dry
```

#### Workspace Permission Issues
- Ensure API key has required permissions for all object types
- Check that custom fields exist in your workspace
- Verify deal stages match your workspace configuration

### Rate Limiting
The E2E tests include automatic rate limiting to prevent API throttling:
- Sequential test execution (no parallel requests)
- Configurable request delays
- Automatic retry with exponential backoff

## 📊 CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
      
      - name: Run E2E Tests
        env:
          ATTIO_API_KEY: ${{ secrets.ATTIO_API_KEY }}
          E2E_CLEANUP_AFTER_TESTS: true
        run: npm run e2e
```

### Environment-Specific Configuration
For CI/CD, you can use environment variables instead of config files:
```bash
export ATTIO_API_KEY="ci_api_key"
export E2E_TEST_PREFIX="CI_TEST_"
export E2E_SKIP_DEAL_TESTS=true
export E2E_CLEANUP_AFTER_TESTS=true
```

## 🤝 Contributing

### Adding New Tests
1. Create test files in `test/e2e/suites/`
2. Use `.e2e.test.ts` extension
3. Follow existing patterns and use fixtures
4. Include happy path, edge cases, and error scenarios
5. Add cleanup tracking for any created objects

### Adding New Fixtures
1. Add fixtures to appropriate files in `test/e2e/fixtures/`
2. Follow naming conventions and include variety
3. Create both individual fixtures and scenarios
4. Include edge cases and performance test data

### Documentation Updates
- Update this README for new features
- Document configuration options
- Include troubleshooting info for common issues
- Add examples for new testing patterns

## 📚 References

- [Vitest Documentation](https://vitest.dev/)
- [Attio API Documentation](https://docs.attio.com/api)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Issue #370: E2E Test Suite Requirements](https://github.com/kesslerio/attio-mcp-server/issues/370)

---

## 📝 License

This E2E test suite is part of the Attio MCP Server project and follows the same license terms.