# Enhanced E2E Testing Scripts

This directory contains enhanced E2E testing and diagnostic scripts for the Attio MCP Server project.

## 🚀 Quick Start

```bash
# Basic usage - run all E2E tests and save logs to test-results/
./scripts/e2e-diagnostics.sh

# Run specific test suite
./scripts/e2e-diagnostics.sh --suite error-handling

# Analyze existing test results
./scripts/e2e-analyze-simple.sh -s -p

# Check environment health
./scripts/e2e-health-check.sh -v
```

## 📋 Available Scripts

### 1. `e2e-diagnostics.sh` - Enhanced E2E Test Runner

Comprehensive test execution with multiple modes and enhanced logging.

**Key Features:**
- Default output to `test-results/` directory
- Test suite categories (error-handling, record-management, etc.)
- Parallel execution support
- JSON output for analysis
- Watch mode for development
- Automatic log cleanup

**Usage Examples:**
```bash
# Run all tests
./scripts/e2e-diagnostics.sh

# Run specific test suite
./scripts/e2e-diagnostics.sh --suite core-workflows

# Run tests matching a pattern in parallel
./scripts/e2e-diagnostics.sh -p "should create"

# Run with custom timeout and JSON output
./scripts/e2e-diagnostics.sh --timeout 60 --json

# Clean old logs and run tests
./scripts/e2e-diagnostics.sh --cleanup

# Generate analysis report from existing logs
./scripts/e2e-diagnostics.sh --analyze
```

**Test Suites:**
- `core-workflows` - Core functionality tests
- `error-handling` - Error scenarios and recovery
- `record-management` - CRUD operations and relationships
- `notes-management` - Notes creation and management
- `infrastructure` - System validation and health
- `regression-prevention` - Stability and performance tests

### 2. `e2e-analyze-simple.sh` - Test Results Analysis

Analyzes test logs and generates comprehensive reports (macOS compatible).

**Features:**
- Test pass/fail/skip statistics
- Error pattern detection
- Timing analysis
- Failure summaries
- Success rate calculations

**Usage Examples:**
```bash
# Analyze all logs with summary and patterns
./scripts/e2e-analyze-simple.sh -s -p

# Analyze only recent failures
./scripts/e2e-analyze-simple.sh -r -f

# Full analysis with timing
./scripts/e2e-analyze-simple.sh -s -p -t

# Analyze logs in custom directory
./scripts/e2e-analyze-simple.sh /tmp
```

**Sample Output:**
```
📈 Summary Report
=================
Files analyzed: 15
Total tests: 100
✅ Passed: 63
❌ Failed: 30
⏸ Skipped: 7
🎯 Success rate: 63.00%

🔍 Error Patterns Analysis
==========================
🌐 API errors: 82
⏱ Timeout errors: 7
🔍 Assertion errors: 17
🔌 Connection errors: 0
```

### 3. `e2e-analyze.sh` - Advanced Analysis (Bash 4+)

Enhanced analysis script with associative arrays (requires `brew install bash`).

### 4. `e2e-health-check.sh` - Environment Health Check

Comprehensive validation of the E2E test environment.

**Features:**
- System dependency checks
- Environment variable validation
- API connectivity testing
- Test data analysis
- Performance baseline checks
- Health scoring (0-100)

**Usage Examples:**
```bash
# Basic health check
./scripts/e2e-health-check.sh

# Verbose output with detailed report
./scripts/e2e-health-check.sh -v -r

# Quiet mode (summary only)
./scripts/e2e-health-check.sh -q

# Fix common issues and cleanup
./scripts/e2e-health-check.sh --fix --cleanup

# Include performance checks
./scripts/e2e-health-check.sh --performance
```

**Health Score Interpretation:**
- **90-100**: ✅ Excellent - Environment is healthy
- **75-89**: ⚠️ Good - Minor issues detected
- **50-74**: ⚠️ Fair - Several issues need attention
- **0-49**: ❌ Poor - Critical issues must be resolved

## 🔧 Configuration

### Environment Variables

Required:
- `ATTIO_API_KEY` - Your Attio API key for real API tests

Optional:
- `E2E_MODE=true` - Enable E2E test mode
- `USE_MOCK_DATA=false` - Use real API instead of mocks
- `TASKS_DEBUG=true` - Enable debug logging
- `MCP_LOG_LEVEL=DEBUG` - Set log level
- `LOG_FORMAT=json` - JSON log format

### Log Directory

By default, all logs are saved to `test-results/` directory. You can customize this:

```bash
# Custom log directory
./scripts/e2e-diagnostics.sh --dir /custom/path

# Use environment variable
LOG_DIR=/custom/path ./scripts/e2e-diagnostics.sh
```

## 📊 Log Analysis

### Log File Naming Convention

```
test-results/
├── e2e-all-20250902-210815.log              # All tests
├── e2e-core-workflows-20250902-210816.log   # Core workflows suite
├── e2e-error-handling-20250902-210817.log   # Error handling suite
└── health-report-20250902-210818.json       # Health check report
```

### Supported Test Result Formats

The analysis scripts detect multiple log formats:
- Vitest: `PASS`, `FAIL`, `SKIP`
- Jest: `✓`, `✗`, `↷`
- Custom formats with pattern matching

### Error Pattern Detection

The scripts automatically detect common error patterns:
- **API Errors**: `API.*error`, `HTTP.*error`, `Request failed`
- **Timeouts**: `timeout`, `Timeout`
- **Assertions**: `AssertionError`, `Expected.*but got`
- **Connections**: `ECONNREFUSED`, `Connection.*refused`, `Network error`

## 🚨 Troubleshooting

### Common Issues

1. **"No log files found"**
   ```bash
   # Check if test-results directory exists
   ls -la test-results/
   
   # Run a test first to generate logs
   ./scripts/e2e-diagnostics.sh --suite infrastructure
   ```

2. **"Bash 4+ required" (for e2e-analyze.sh)**
   ```bash
   # Install newer bash on macOS
   brew install bash
   
   # Or use the simple version
   ./scripts/e2e-analyze-simple.sh
   ```

3. **"ATTIO_API_KEY not set"**
   ```bash
   # Check if .env file exists
   ls -la .env
   
   # Load environment manually
   source .env
   ```

4. **Tests timing out**
   ```bash
   # Increase timeout
   ./scripts/e2e-diagnostics.sh --timeout 120
   
   # Check API connectivity
   ./scripts/e2e-health-check.sh -v
   ```

### Performance Optimization

For faster test execution:
```bash
# Run tests in parallel (where safe)
./scripts/e2e-diagnostics.sh --parallel

# Run only affected tests
./scripts/e2e-diagnostics.sh --file core-workflows

# Skip slow integration tests
npm run test:offline
```

## 📈 Integration with CI/CD

### GitHub Actions Integration

```yaml
- name: Run E2E Health Check
  run: ./scripts/e2e-health-check.sh --quiet
  
- name: Run E2E Tests
  run: ./scripts/e2e-diagnostics.sh --json --timeout 180
  
- name: Analyze Results
  if: always()
  run: ./scripts/e2e-analyze-simple.sh --summary --patterns
```

### Local Development Workflow

```bash
# Daily development cycle
./scripts/e2e-health-check.sh        # Start with health check
./scripts/e2e-diagnostics.sh --suite core-workflows  # Run core tests
./scripts/e2e-analyze-simple.sh -f  # Check for failures

# Before committing
./scripts/e2e-diagnostics.sh --cleanup  # Clean old logs
./scripts/e2e-health-check.sh -r        # Generate health report
```

## 🔄 Migration from Old Scripts

The enhanced scripts are backward compatible. You can migrate gradually:

```bash
# Old way
./scripts/e2e-diagnostics.sh /tmp "should create"

# New way (equivalent)
./scripts/e2e-diagnostics.sh --dir /tmp "should create"
```

## 💡 Tips and Best Practices

1. **Use suite-specific testing** for faster feedback:
   ```bash
   ./scripts/e2e-diagnostics.sh --suite error-handling
   ```

2. **Analyze patterns regularly** to identify systemic issues:
   ```bash
   ./scripts/e2e-analyze-simple.sh --patterns
   ```

3. **Monitor health scores** to maintain environment quality:
   ```bash
   ./scripts/e2e-health-check.sh --performance --report
   ```

4. **Clean logs regularly** to avoid disk space issues:
   ```bash
   ./scripts/e2e-diagnostics.sh --cleanup
   ```

5. **Use watch mode** during active development:
   ```bash
   ./scripts/e2e-diagnostics.sh --watch --file core-workflows
   ```

## 📝 Contributing

When adding new E2E tests:

1. Follow the existing test suite structure
2. Add appropriate categories to the diagnostics script
3. Ensure tests work with both real API and mocks
4. Update the documentation if needed

For script improvements:
1. Maintain backward compatibility
2. Add help text for new options
3. Test with both macOS default bash and bash 4+
4. Update this README with new features