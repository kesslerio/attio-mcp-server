# E2E Environment Variables

This file documents all environment variables used by the E2E test suite.

## Required Variables

```bash
# Attio API Key for testing
ATTIO_API_KEY=your_api_key_here
```

## E2E Mode Control

```bash
# Enable E2E testing mode
E2E_MODE=true

# Skip E2E tests entirely
SKIP_E2E_TESTS=false
```

## Test Data Configuration

```bash
# Prefix for all test data to avoid conflicts
E2E_TEST_PREFIX=E2E_TEST_

# Domain for test email addresses
E2E_TEST_EMAIL_DOMAIN=example.com

# Domain for test company data
E2E_TEST_COMPANY_DOMAIN=example.com

# Clean up test data after tests complete
E2E_CLEANUP_AFTER_TESTS=true
```

## API Contract Modes

```bash
# API contract strictness mode (default: true)
# When true: Tests fail immediately on API contract violations
# When false: Allow fallback behavior for malformed API responses
E2E_API_CONTRACT_STRICT=true

# API contract debug mode (default: false)  
# When true: Enable fallback behavior even in strict mode for debugging
# Use for troubleshooting API issues without failing tests
E2E_API_CONTRACT_DEBUG=false
```

## Usage Examples

### Normal Test Run (Strict Mode)
```bash
export ATTIO_API_KEY=your_key_here
export E2E_MODE=true
npm run test:e2e
```

### Debug Mode for Troubleshooting  
```bash
# Method 1: Use diagnostic script with --debug flag (recommended)
export ATTIO_API_KEY=your_key_here
./scripts/e2e-diagnostics.sh --debug --json

# Method 2: Set environment variable directly
export ATTIO_API_KEY=your_key_here  
export E2E_MODE=true
export E2E_API_CONTRACT_DEBUG=true
npm run test:e2e
```

### Skip Contract Violations (Not Recommended)
```bash
export ATTIO_API_KEY=your_key_here
export E2E_MODE=true
export E2E_API_CONTRACT_STRICT=false
npm run test:e2e
```