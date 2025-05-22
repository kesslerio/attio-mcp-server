# Codex Environment Setup Guide

This guide addresses the specific requirements for running this project in Codex CLI environments, particularly those with network restrictions after initial setup.

## Quick Setup for Codex

Run this **during the setup phase** when network access is available:

```bash
# Run the Codex environment setup
npm run codex:setup
```

This script will:
- ✅ Install all project dependencies
- ✅ Build the project 
- ✅ Create offline configurations
- ✅ Cache command outputs
- ✅ Set up verification tools

## Testing the Setup

After setup, verify everything works:

```bash
# Verify the environment
npm run codex:verify
```

## Offline Commands

Use these commands in network-restricted environments:

### Testing
```bash
# Run tests with offline configuration
npm run test:offline

# Or directly with npx
npx jest --config=jest.config.offline.js
```

### Type Checking
```bash
# Run TypeScript checks with offline configuration
npm run check:offline

# Or directly with npx
npx tsc --project tsconfig.offline.json --noEmit
```

### Building
```bash
# Build the project (should work offline after initial setup)
npm run build
```

## Common Issues & Solutions

### ❌ "jest not found"
**Cause**: Dev dependencies not installed
**Solution**: Run `npm run codex:setup` during setup phase

### ❌ "missing type definitions"  
**Cause**: TypeScript or dependencies not properly installed
**Solution**: Use offline config: `npm run check:offline`

### ❌ Network timeouts during tests
**Cause**: Tests trying to access external APIs
**Solution**: Use offline test config that skips integration tests

## What the Offline Configs Do

### `jest.config.offline.js`
- Skips integration tests that require network
- Excludes manual test files
- Uses shorter timeouts
- Focuses on unit tests only

### `tsconfig.offline.json` 
- Extends main TypeScript config
- Skips library type checking for speed
- Excludes network-dependent test files
- Optimized for offline validation

## Environment Verification Checklist

✅ Node.js available  
✅ NPM available  
✅ Codex CLI available  
✅ Project dependencies installed  
✅ TypeScript compilation works  
✅ Jest testing works  
✅ Build process works  

## Manual Verification Commands

If automated verification fails, try these:

```bash
# Check basic tools
node --version
npm --version
codex --version

# Check project structure
ls -la dist/
ls -la node_modules/.bin/

# Test TypeScript compilation
npx tsc --noEmit

# Test Jest
npx jest --version
npx jest --passWithNoTests

# Test project build
npm run build
```

## Integration with Main Setup Scripts

The main setup scripts now include Codex environment preparation:

```bash
# Full setup (includes Codex environment setup)
./scripts/setup-codex.sh

# Quick setup
./scripts/quick-setup.sh  

# Minimal setup
./scripts/minimal-setup.sh
```

## Troubleshooting Network Issues

If you encounter network issues after setup:

1. **Use offline configs**: All commands have offline alternatives
2. **Check cached data**: Look in `.codex-cache/` for cached outputs
3. **Skip integration tests**: Use `test:offline` instead of `test`
4. **Use local builds**: Avoid commands that fetch external resources

## Best Practices for Codex Environments

1. **Run full setup during network-available phase**
2. **Use offline commands in restricted environments** 
3. **Cache important outputs during setup**
4. **Test the verification script after setup**
5. **Keep offline configs updated with main configs**

---

For more information, see the main [README.md](./README.md) and [docs/codex-mcp-setup.md](./docs/codex-mcp-setup.md).