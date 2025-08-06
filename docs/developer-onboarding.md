# Developer Onboarding Guide

Welcome to the Attio MCP Server project! This guide will get you from zero to your first contribution in under 10 minutes.

> **Important**: This document covers the procedural "how to get started" steps. For development workflows, coding standards, and policies, refer to [CLAUDE.md](/CLAUDE.md).

## Prerequisites Check

Before starting, ensure you have the following installed:

```bash
# Check Node.js version (requires Node.js 18+ for ES modules)
node --version
# Expected: v18.x.x or higher

# Check npm version
npm --version
# Expected: 8.x.x or higher

# Check git
git --version
# Expected: git version 2.x.x or higher
```

If any prerequisites are missing:
- **Node.js**: Install from [nodejs.org](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm)
- **Git**: Install from [git-scm.com](https://git-scm.com/)

## Step 1: Clone and Initial Setup

### Quick Start (Recommended)
```bash
# Clone the repository
git clone https://github.com/kesslerio/attio-mcp-server.git
cd attio-mcp-server

# Run quick setup script (installs dependencies and builds)
./scripts/quick-setup.sh
```

### Manual Setup (Alternative)
```bash
# Clone the repository
git clone https://github.com/kesslerio/attio-mcp-server.git
cd attio-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

### Verification
```bash
# Verify installation
npm run check
# Expected: All checks pass with green checkmarks

# Verify build
ls dist/
# Expected: index.js and other compiled files present
```

## Step 2: Environment Configuration

### Attio API Key Setup

1. **Get your Attio API key**:
   - Log into [Attio](https://attio.com)
   - Navigate to Settings → API
   - Create or copy your API key

2. **Configure environment**:
   ```bash
   # Create .env file from template
   cp .env.template .env
   
   # Edit .env file
   echo "ATTIO_API_KEY=your_api_key_here" > .env
   ```

3. **Verify API connection**:
   ```bash
   # Run offline tests first (no API required)
   npm run test:offline
   # Expected: All offline tests pass
   
   # Test API connection (requires valid API key)
   npm run test:integration -- --run test/integration/real-api-integration.test.ts
   # Expected: Connection successful
   ```

## Step 3: Understanding the Codebase

### Project Structure
```
attio-mcp-server/
├── src/                    # Source code
│   ├── api/               # API operations and clients
│   ├── handlers/          # MCP tool handlers
│   ├── utils/             # Utility functions
│   └── index.ts           # Main entry point
├── test/                   # Test files
│   ├── integration/       # Integration tests (require API)
│   └── unit/             # Unit tests (offline)
├── docs/                   # Documentation
├── scripts/               # Utility scripts
└── CLAUDE.md              # Developer workflows & standards
```

### Key Concepts
- **MCP Tools**: Handlers that expose Attio functionality to LLMs
- **Universal Tools**: Generic CRUD operations for any Attio object type
- **Filters**: Advanced querying capabilities for Attio data

For detailed architecture, see [API Overview](api/api-overview.md).

## Step 4: Running Your First Test

### TDD Setup (Recommended for Development)
```bash
# Set up Test-Driven Development environment
./scripts/setup-tdd.sh

# This creates:
# - Watch mode for tests
# - Automatic test discovery
# - Fast feedback loop
```

### Running Tests Manually
```bash
# Run all offline tests (fast, no API)
npm run test:offline

# Run specific test file
npm test test/handlers/universal-tools.test.ts

# Run tests matching pattern
npm test -- -t "search-records"

# Run with coverage
npm run test:coverage:offline
```

### Test Categories
- **Offline Tests**: Unit tests that don't require API access (fast)
- **Integration Tests**: Tests that interact with real Attio API (slower)
- **Performance Tests**: Benchmark and regression tests

See [Testing Guide](testing.md) for comprehensive testing documentation.

## Step 5: Making Your First Contribution

### 1. Create an Issue
Before starting work, create or find an issue:
```bash
# Search existing issues
gh issue list --repo kesslerio/attio-mcp-server --search "your topic"

# Create new issue
gh issue create --title "Type: Description" --body "Details"
```

See [Issue Templates](examples/) for proper formatting.

### 2. Create a Feature Branch
```bash
# Always start from main
git checkout main
git pull origin main

# Create feature branch (follow naming convention)
git checkout -b feature/issue-123-brief-description
# or for fixes:
git checkout -b fix/issue-123-brief-description
```

### 3. Make Your Changes
Follow these guidelines:
- **Code Standards**: See [CLAUDE.md#code-standards](/CLAUDE.md#code-standards)
- **TypeScript**: No `any` types, explicit error handling
- **Testing**: Write tests for new functionality
- **Formatting**: Use `npm run format` before committing

### 4. Validate Your Changes
```bash
# Run the full validation pipeline (required before commit)
npm run lint:check && npm run check:format && npm run build && npm run test:offline

# Or use the convenience command
npm run check
```

### 5. Commit and Push
```bash
# Stage your changes
git add .

# Commit with proper message format
git commit -m "Type: Brief description #123"
# Types: Feature, Fix, Docs, Refactor, Test, Chore

# Push to your branch
git push -u origin HEAD
```

### 6. Create Pull Request
```bash
# Create PR using GitHub CLI
gh pr create -R kesslerio/attio-mcp-server \
  -t "Type: Description" \
  -b "Closes #123\n\nDescription of changes"

# Or create via GitHub web interface
```

See [PR Creation Guide](PR_CREATION_GUIDE.md) for detailed PR guidelines.

## Common Pitfalls and Troubleshooting

### Issue: Tests Failing Locally
```bash
# Solution 1: Clear build artifacts
npm run clean && npm run build

# Solution 2: Ensure dependencies are up to date
npm install

# Solution 3: Check Node version
node --version  # Must be 18+
```

### Issue: API Key Not Working
```bash
# Verify environment variable is set
echo $ATTIO_API_KEY

# Test with minimal integration test
npm run test:integration:real-api
```

### Issue: TypeScript Compilation Errors
```bash
# Check for type errors
npm run build

# Auto-fix formatting issues
npm run format

# Fix linting issues
npm run lint:fix
```

### Issue: Git Hooks Not Running
```bash
# Reinstall git hooks
npm run setup-hooks

# Or manually
chmod +x build/install-hooks.sh && ./build/install-hooks.sh
```

## Next Steps

Now that you're set up, explore these resources:

1. **Development Workflows**: Read [CLAUDE.md](/CLAUDE.md) for comprehensive workflows
2. **API Documentation**: Review [Attio API Reference](api/ATTIO_API_REFERENCE.md)
3. **Tool Development**: See [Universal Tools Guide](universal-tools/developer-guide.md)
4. **Testing Strategy**: Study [TDD Guide](tdd-guide.md)
5. **Refactoring**: Follow [Refactoring Guidelines](refactoring-guidelines.md)

## Quick Reference

### Essential Commands
```bash
npm run build              # Compile TypeScript
npm run test:offline       # Run unit tests (fast)
npm run test:integration   # Run integration tests (requires API)
npm run check             # Full validation suite
npm run format            # Auto-format code
npm run lint:fix          # Fix linting issues
```

### Development Scripts
```bash
./scripts/quick-setup.sh   # Initial project setup
./scripts/setup-tdd.sh     # Set up TDD environment
./scripts/review-pr.sh     # Review PR locally
./scripts/create-test.sh   # Generate test template
```

## Getting Help

- **Documentation Issues**: Check [docs/](.) directory
- **Code Questions**: Review [CLAUDE.md](/CLAUDE.md) for standards
- **API Questions**: See [API documentation](api/)
- **Bug Reports**: Create an [issue](https://github.com/kesslerio/attio-mcp-server/issues)
- **Discussions**: Join project discussions on GitHub

## Verification Checklist

Before considering yourself "onboarded", ensure you can:

- [ ] Run `npm run build` successfully
- [ ] Run `npm run test:offline` with all tests passing
- [ ] Create and checkout a feature branch
- [ ] Make a small code change
- [ ] Run the validation pipeline successfully
- [ ] Understand where to find documentation

Congratulations! You're now ready to contribute to the Attio MCP Server project. 🎉

---
*For development workflows, coding standards, and detailed policies, always refer to [CLAUDE.md](/CLAUDE.md) as the source of truth.*