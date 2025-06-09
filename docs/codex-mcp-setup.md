# OpenAI Codex CLI Environment Setup Guide

**⚠️ EXPERIMENTAL TECHNOLOGY DISCLAIMER**  
OpenAI Codex CLI is an experimental project under active development. It may contain bugs, incomplete features, or undergo breaking changes. Always review changes before approval and work in Git repositories for safety.

This guide addresses the specific requirements for running this project with OpenAI Codex CLI, particularly for network-restricted environments after initial setup.

## Quick Setup for Codex CLI

Run this **during the setup phase** when network access is available:

```bash
# Run the comprehensive Codex environment setup
./scripts/setup-codex.sh
```

This script will:
- ✅ Check system requirements (Node.js 22+, Python 3.12+)
- ✅ Install OpenAI Codex CLI (`@openai/codex`)
- ✅ Configure environment variables and pricing awareness
- ✅ Set up project-specific AGENTS.md files
- ✅ Create comprehensive usage examples
- ✅ Configure sandboxing and security features

## System Requirements (Updated April 2025)

| Requirement | Details |
|------------|---------|
| **Node.js** | **22 or newer** (LTS recommended) |
| **Operating System** | macOS 12+, Ubuntu 20.04+/Debian 10+, or Windows 11 via WSL2 |
| **Git** | 2.23+ (recommended for safety features) |
| **RAM** | 4GB minimum (8GB recommended) |
| **Python** | 3.12+ (for MCP server components) |

## Installation & Configuration

### Manual Installation
```bash
# Install globally (requires Node.js 22+)
npm install -g @openai/codex

# Set up API key
export OPENAI_API_KEY="your-api-key-here"

# Verify installation
codex --version
```

### Configuration Files

Codex CLI uses configuration in `~/.codex/`:

**~/.codex/config.json**
```json
{
  "model": "o4-mini",
  "provider": "openai", 
  "approvalMode": "suggest",
  "fullAutoErrorMode": "ask-user",
  "notify": true,
  "maxTokens": 4096,
  "temperature": 0.1,
  "providers": {
    "openai": {
      "name": "OpenAI",
      "baseURL": "https://api.openai.com/v1",
      "envKey": "OPENAI_API_KEY"
    }
  },
  "history": {
    "maxSize": 1000,
    "saveHistory": true,
    "sensitivePatterns": []
  }
}
```

## Project Documentation with AGENTS.md

Codex CLI uses `AGENTS.md` files for project-specific instructions:

1. **`~/.codex/AGENTS.md`** - Global personal preferences
2. **`AGENTS.md`** (project root) - Shared project guidelines  
3. **`AGENTS.md`** (current directory) - Feature-specific instructions

**Example Project AGENTS.md:**
```markdown
# Project-Specific Codex Instructions

## Coding Standards
- Use TypeScript for all new files
- Follow ESLint and Prettier configurations
- Include comprehensive JSDoc comments
- Write unit tests for all new functionality

## Architecture Guidelines  
- Follow existing handler/tool patterns
- Use proper error handling with custom error types
- Implement proper logging and monitoring
- Follow SOLID principles

## Testing Requirements
- Unit tests for all handlers and utilities
- Integration tests for API interactions  
- Mock external dependencies appropriately
- Maintain >90% test coverage
```

## Usage Modes & Safety

### Approval Modes
- **`suggest`** (default): Shows proposed changes, asks for confirmation
- **`auto-edit`**: Automatically applies approved file changes
- **`full-auto`**: Executes without asking (use with extreme caution)

### Security Features
- **macOS**: Commands wrapped with Apple Seatbelt sandbox
- **Linux**: No default sandboxing (Docker recommended)
- **Windows**: Requires WSL2

### Safety Best Practices
1. Always start with `suggest` mode in new projects
2. Work in Git repositories for easy rollback
3. Review all changes before approval
4. Use `full-auto` mode sparingly and only in safe environments
5. Keep backups of important files

## Testing the Setup

After setup, verify everything works:

```bash
# Verify installation
codex --version

# Test basic functionality (suggest mode)
codex --approval-mode suggest "create a simple hello world script"

# Run our project-specific verification
npm run codex:verify
```

## Offline Commands for Network-Restricted Environments

Use these commands when network access is limited:

### Testing
```bash
# Run tests with offline configuration
npm run test:offline

# Or directly with npx
npx vitest --config vitest.config.offline.ts
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

## Pricing Information (April 2025)

**OpenAI Codex CLI Pricing:**
- Input tokens: $1.50 per 1M tokens (~750k words)
- Output tokens: $6.00 per 1M tokens
- Default model: o4-mini

**Cost Management Tips:**
- Monitor usage via OpenAI dashboard
- Use shorter, focused prompts
- Consider using `suggest` mode to review before execution
- Set up usage alerts in OpenAI account

## Common Issues & Solutions

### ❌ "codex: command not found"
**Cause**: Node.js version too old or npm installation failed
**Solution**: 
1. Upgrade to Node.js 22+: https://nodejs.org/
2. Reinstall: `npm install -g @openai/codex@latest`
3. Check PATH: `which codex`

### ❌ "Node.js version is X. Codex CLI requires Node.js 22 or newer"
**Cause**: Outdated Node.js version
**Solution**: Upgrade Node.js from https://nodejs.org/

### ❌ API Key or model access errors
**Cause**: Missing/invalid API key or unverified account
**Solution**: 
1. Set API key: `export OPENAI_API_KEY="your-key"`
2. Verify account on OpenAI platform for o3/o4-mini access
3. Try alternative model: `codex --model gpt-3.5-turbo`

### ❌ "missing type definitions" or build errors
**Cause**: Dependencies not properly installed
**Solution**: Run full setup: `./scripts/setup-codex.sh`

### ❌ Network timeouts during tests
**Cause**: Tests trying to access external APIs
**Solution**: Use offline config: `npm run test:offline`

## What the Offline Configs Do

### `vitest.config.offline.ts`
- Skips integration tests requiring network
- Excludes manual test files
- Uses shorter timeouts
- Focuses on unit tests only

### `tsconfig.offline.json` 
- Extends main TypeScript config
- Skips library type checking for speed
- Excludes network-dependent test files
- Optimized for offline validation

## Interactive Commands

Once in Codex CLI interactive mode:
- `/suggest` - Switch to suggest approval mode
- `/autoedit` - Switch to auto-edit mode  
- `/fullauto` - Switch to full-auto mode (careful!)
- `/model` - Change AI model
- `/help` - Show all commands
- `/exit` - Exit Codex CLI

## Environment Verification Checklist

✅ Node.js 22+ available  
✅ NPM available  
✅ Codex CLI installed and accessible  
✅ OpenAI API key configured  
✅ Project dependencies installed  
✅ TypeScript compilation works  
✅ Testing framework works  
✅ Build process works  
✅ AGENTS.md files configured

## Manual Verification Commands

If automated verification fails:

```bash
# Check versions
node --version  # Should be 22+
npm --version
codex --version

# Check API key
echo $OPENAI_API_KEY

# Test basic functionality
codex --approval-mode suggest "explain what Node.js is"

# Check project structure
ls -la dist/
ls -la node_modules/.bin/

# Test builds and types
npm run build
npx tsc --noEmit
```

## Integration with Main Setup Scripts

The main setup scripts now include comprehensive Codex environment preparation:

```bash
# Full setup (includes Codex environment setup)
./scripts/setup-codex.sh

# Quick setup
./scripts/quick-setup.sh  

# Minimal setup
./scripts/minimal-setup.sh
```

## Advanced Usage Examples

```bash
# Multi-file refactoring
codex "refactor the authentication module to use async/await"

# Documentation generation
codex "generate comprehensive API documentation for this codebase"

# Security audit
codex "review this code for security vulnerabilities"

# Test generation with project context
codex "write unit tests for the user service following our testing guidelines"
```

## Best Practices for Codex Environments

1. **Run full setup during network-available phase**
2. **Use offline commands in restricted environments** 
3. **Always work in Git repositories for safety**
4. **Start with `suggest` mode, graduate to `auto-edit` carefully**
5. **Never use `full-auto` on production code without review**
6. **Create comprehensive AGENTS.md files for consistent behavior**
7. **Monitor API usage and costs regularly**
8. **Keep Codex CLI updated**: `npm install -g @openai/codex@latest`

## Troubleshooting Network Issues

If you encounter network issues after setup:

1. **Use offline configs**: All commands have offline alternatives
2. **Check cached data**: Look in `.codex-cache/` for cached outputs  
3. **Skip integration tests**: Use `test:offline` instead of `test`
4. **Use local builds**: Avoid commands fetching external resources
5. **Review sandbox settings**: Codex runs network-disabled on macOS by default

---

**Additional Resources:**
- [OpenAI Codex CLI GitHub](https://github.com/openai/codex)
- [NPM Package Documentation](https://www.npmjs.com/package/@openai/codex)
- [Main Project README](./README.md)
- [MCP Documentation](https://modelcontextprotocol.io/)

**Remember**: Codex CLI is experimental software. Always review changes and maintain backups!