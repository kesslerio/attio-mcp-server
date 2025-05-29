# TDD (Test-Driven Development) Guide

This guide provides instructions for using the TDD environment set up in this project.

## Quick Start

### 1. Create a New Test
```bash
# Create a unit test
./scripts/create-test.sh unit src/utils/new-feature NewFeature

# Create an integration test
./scripts/create-test.sh integration src/api/new-endpoint NewEndpoint

# Create a mock factory
./scripts/create-test.sh mock src/models/new-model NewModel
```

### 2. Start TDD Workflow
```bash
# Start test watch mode (recommended for TDD)
npm run test:watch:offline

# Start with UI (visual feedback)
npm run test:watch:ui

# Watch only changed files
npm run test:watch:changed
```

### 3. TDD Cycle: Red -> Green -> Refactor

1. **Red**: Write a failing test
2. **Green**: Write the minimum code to make it pass
3. **Refactor**: Improve the code while keeping tests green

## Available Test Commands

### Basic Testing
- `npm test` - Run all tests (used in pre-commit hooks)
- `npm run test:offline` - Run tests excluding real API calls
- `npm run test:single` - Run tests once (no watch mode)

### TDD Development
- `npm run test:watch` - Watch mode for all tests
- `npm run test:watch:offline` - Watch mode for offline tests only
- `npm run test:watch:ui` - Visual test interface
- `npm run test:watch:changed` - Watch only changed files
- `npm run test:debug` - Verbose output for debugging

### Coverage Testing
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:coverage:offline` - Coverage for offline tests
- `npm run test:coverage:watch` - Watch mode with coverage

## Test File Organization

```
test/
├── api/                    # API layer tests
├── handlers/               # MCP handler tests  
├── integration/            # Integration tests
├── mocks/                  # Mock factories
├── objects/                # Business object tests
├── utils/                  # Utility function tests
└── validators/             # Validation tests
```

## Test Templates

### Unit Test Template
- Located: `scripts/tdd-templates/unit-test.template.ts`
- Use for: Testing individual functions/modules
- Features: Arrange-Act-Assert pattern, mocking setup

### Integration Test Template  
- Located: `scripts/tdd-templates/integration-test.template.ts`
- Use for: Testing component interactions
- Features: Longer timeouts, setup/teardown

### Mock Factory Template
- Located: `scripts/tdd-templates/mock-factory.template.ts`
- Use for: Creating reusable test data
- Features: Factory functions, mock API clients

## Git Hooks

### Pre-commit Hook
- Automatically runs tests before commits
- Prevents commits if tests fail
- Located: `.husky/pre-commit`

To bypass (use sparingly):
```bash
git commit --no-verify -m "commit message"
```

## Best Practices

### 1. Write Tests First
Always write the test before the implementation:
```typescript
// 1. Write failing test
it('should calculate total price with tax', () => {
  const result = calculateTotalWithTax(100, 0.1);
  expect(result).toBe(110);
});

// 2. Write minimal implementation
export function calculateTotalWithTax(price: number, taxRate: number): number {
  return price + (price * taxRate);
}
```

### 2. Keep Tests Simple
- One assertion per test when possible
- Use descriptive test names
- Follow Arrange-Act-Assert pattern

### 3. Use Mocks Appropriately
```typescript
// Mock external dependencies
vi.mock('../api/client', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' })
}));
```

### 4. Test Edge Cases
- Null/undefined inputs
- Empty arrays/objects
- Error conditions
- Boundary values

## Coverage Thresholds

Current thresholds:
- Statements: 5%
- Branches: 5% 
- Functions: 10%
- Lines: 5%

These are starting thresholds and should be increased as coverage improves.

## Troubleshooting

### Tests Not Running
1. Check if Vitest is installed: `npm list vitest`
2. Verify test file naming: `*.test.ts` or `*.test.js`
3. Check test file location: Must be in `test/` directory

### Git Hooks Not Working
1. Reinstall Husky: `npm run prepare`
2. Check hook permissions: `chmod +x .husky/pre-commit`

### Coverage Issues
1. Clear coverage cache: `rm -rf coverage/`
2. Run clean coverage: `npm run test:coverage:offline`

## VS Code Integration

Add these settings to your VS Code workspace:

```json
{
  "testing.automaticallyOpenPeekView": "never",
  "vitest.enable": true,
  "vitest.commandLine": "npm run test:watch:offline"
}
```

## Example TDD Session

1. Start watch mode:
   ```bash
   npm run test:watch:offline
   ```

2. Create a test:
   ```bash
   ./scripts/create-test.sh unit src/utils/formatter StringFormatter
   ```

3. Edit `test/utils/formatter.test.ts`:
   ```typescript
   it('should format currency', () => {
     const result = formatCurrency(1234.56);
     expect(result).toBe('$1,234.56');
   });
   ```

4. Watch the test fail (Red)

5. Create `src/utils/formatter.ts`:
   ```typescript
   export function formatCurrency(amount: number): string {
     return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
   }
   ```

6. Watch the test pass (Green)

7. Refactor if needed while keeping tests green

This workflow encourages better design, catches bugs early, and builds confidence in your code.