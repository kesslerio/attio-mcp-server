# Test Environment Setup

This document provides guidance for setting up the test environment for the Attio MCP Server.

## Environment Variables

### Required for Integration Tests

- `ATTIO_API_KEY`: Your Attio API key for real API integration tests
- `ATTIO_WORKSPACE_ID`: Your Attio workspace ID (optional, but recommended)

### Test Control Variables

- `SKIP_INTEGRATION_TESTS=true`: Skip integration tests that require API access
- `NODE_ENV=development`: Enable debug logging in manual tests

## Setting Up API Keys

1. **Get your API key from Attio**:
   - Log into your Attio workspace
   - Go to Settings > API
   - Generate a new API key

2. **Set environment variables**:
   ```bash
   export ATTIO_API_KEY=your_api_key_here
   export ATTIO_WORKSPACE_ID=your_workspace_id_here
   ```

3. **Using .env file**:
   Create a `.env` file in the project root:
   ```
   ATTIO_API_KEY=your_api_key_here
   ATTIO_WORKSPACE_ID=your_workspace_id_here
   ```

## Running Different Test Types

### Unit Tests
```bash
npm test                    # Run all tests
npm run test:offline        # Run offline tests only
npm run test:watch          # Watch mode
```

### Integration Tests
```bash
npm test -- integration/real-api-integration.test.ts
```

### Manual Tests
```bash
node test/manual/test-create-person.js
node test/manual/test-add-record-to-list.js
```

## Test Data Cleanup

Integration tests automatically clean up test data they create. However, manual tests may leave test data in your workspace. You can:

1. Use unique identifiers in test names (timestamp, random ID)
2. Manually delete test records after running manual tests
3. Use a dedicated test workspace

## Common Issues

### Missing API Key
```
ERROR: ATTIO_API_KEY environment variable is required
```
Solution: Set the `ATTIO_API_KEY` environment variable as described above.

### Network/API Errors
```
Error: Request failed with status code 401
```
Solution: Verify your API key is correct and has proper permissions.

### TypeScript Compilation
```
error TS2307: Cannot find module
```
Solution: Run `npm run build` to compile TypeScript files before running manual tests.

## Manual Test Guidelines

When creating manual tests:

1. Use ES modules syntax (`import`/`export`)
2. Include `.js` extensions in import paths
3. Check for `ATTIO_API_KEY` before running
4. Use unique identifiers to avoid conflicts
5. Add error handling and cleanup
6. Document what the test does in comments

Example:
```javascript
import { executeToolRequest } from '../../dist/handlers/tools/dispatcher.js';

if (!process.env.ATTIO_API_KEY) {
  console.error('ERROR: ATTIO_API_KEY environment variable is required');
  process.exit(1);
}

// Your test code here
```