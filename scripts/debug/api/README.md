# API Debug Scripts

Scripts for testing API interactions, response handling, and data processing.

## Scripts

### `debug-companies-import.js`

Tests company data import and processing:

- Validates company record creation
- Tests bulk import operations
- Checks data transformation accuracy
- Monitors import performance

### `debug-company-test.js`

Focused company-specific API testing:

- Individual company CRUD operations
- Company-specific field validation
- Relationship handling (people, deals, etc.)
- Domain and email validation

### `debug-successful-response.js`

Analyzes successful API responses:

- Response structure validation
- Data completeness checks
- Performance metrics collection
- Success pattern analysis

### `test-create-response.js`

Tests record creation response handling:

- Validates creation response format
- Checks ID assignment and structure
- Tests error response handling
- Verifies data persistence

### `test-create-response.mjs`

ES Module version of create response testing:

- Modern JavaScript module syntax
- Compatible with latest Node.js versions
- Enhanced error handling
- Better async/await support

### `test-response.js`

General API response testing framework:

- Generic response validation
- Cross-resource response patterns
- Error response standardization
- Response time measurement

## API Testing Patterns

### Response Validation

- Verify response structure matches expected schema
- Check for required fields and data types
- Validate error responses contain proper codes
- Ensure response times meet performance targets

### Data Integrity

- Confirm data round-trip accuracy
- Validate field transformations
- Check relationship integrity
- Ensure proper encoding/decoding

### Error Handling

- Test various error scenarios
- Validate error message clarity
- Check error recovery mechanisms
- Ensure graceful degradation

## Usage Examples

### Basic API Testing

```bash
npm run build
node scripts/debug/api/test-response.js
```

### Company-Specific Testing

```bash
npm run build
node scripts/debug/api/debug-company-test.js
```

### Performance Analysis

```bash
npm run build
node scripts/debug/api/debug-successful-response.js
```

## Related Components

- Attio API Client (`src/api/attio-client.js`)
- Universal Handlers (`src/handlers/tool-configs/universal/`)
- Error Mapping (`src/utils/axios-error-mapper.js`)
- Response Processing (`src/services/`)
