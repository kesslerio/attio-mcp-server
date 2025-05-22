# AGENTS.md - OpenAI Codex CLI Instructions

This file provides guidance for AI agents working on the Attio MCP Server project.

## Project Overview
This is a Model Context Protocol (MCP) server that connects Attio CRM to Large Language Models, built with TypeScript and Node.js.

## Project Structure
```
attio-mcp-server/
├── src/                    # Source code
│   ├── api/               # Attio API client and operations
│   ├── handlers/          # MCP tool handlers and configurations
│   ├── objects/           # Business logic for companies, people, lists
│   ├── prompts/           # MCP prompt templates
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions and helpers
│   └── validators/        # Input validation logic
├── test/                  # Test files (Jest)
├── docs/                  # Documentation
├── scripts/               # Setup and utility scripts
└── dist/                  # Compiled JavaScript output
```

## Key Technologies
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 18+
- **Framework**: Model Context Protocol SDK
- **Testing**: Jest with ts-jest
- **Build**: TypeScript compiler (tsc)
- **Package Manager**: npm

## Coding Conventions

### TypeScript Standards
- Use strict TypeScript configuration
- Prefer interfaces over types for object definitions
- Use explicit return types for functions
- Follow existing naming conventions:
  - `PascalCase` for classes and interfaces
  - `camelCase` for functions and variables
  - `snake_case` for file names

### Code Organization
- Keep functions focused on single responsibility
- Use proper error handling with try/catch blocks
- Import order: Node.js modules → external packages → internal modules
- Export functions and types explicitly

### Error Handling
- Use detailed error messages for API interactions
- Implement `createErrorResult` for consistent error responses
- Allow continuation on non-critical errors when appropriate
- Log critical errors with `console.error`

## Testing Requirements
- **Test Framework**: Jest with TypeScript support
- **Test Location**: All tests must be in `/test` directory
- **Test Naming**: Use `.test.ts` suffix for TypeScript tests
- **Coverage**: Focus on unit tests for core business logic

### Test Commands
```bash
npm test                    # Run all tests
npm run test:offline        # Run tests without network dependencies
npm test -- -t "pattern"    # Run specific test pattern
```

## Build and Development

### Essential Commands
```bash
npm run build              # Compile TypeScript to JavaScript
npm run check              # Type checking without emit
npm run build:watch        # Watch mode compilation
npm run clean              # Remove dist directory
```

### Environment Setup
- Set `ATTIO_API_KEY` and `ATTIO_WORKSPACE_ID` environment variables
- Use `.env` files for local development
- Never commit API keys or secrets

## MCP Integration
- Follow MCP protocol specifications strictly
- Use JSON-RPC 2.0 for tool definitions
- Avoid `oneOf`, `allOf`, `anyOf` at top level of tool schemas
- Handle tool parameter validation in runtime code

## Documentation Standards
- Update tool documentation when adding new handlers
- Include usage examples in JSDoc comments
- Keep README.md current with setup instructions
- Document breaking changes in commit messages

## Commit Message Format
Use these exact prefixes:
- `Feature:` - New functionality
- `Fix:` - Bug fixes  
- `Docs:` - Documentation changes
- `Refactor:` - Code restructuring
- `Test:` - Test additions/modifications
- `Chore:` - Routine maintenance

## File Modification Guidelines
- Always verify file structure matches current project layout
- Check imports and dependencies before modifying files
- Use existing utility functions rather than creating duplicates
- Follow established patterns in similar files

## Security Considerations
- Validate all external inputs
- Use environment variables for API keys
- Never log sensitive information
- Implement proper rate limiting for API calls

## Performance Guidelines
- Use efficient data structures for large datasets
- Implement pagination for list operations
- Cache responses when appropriate
- Minimize API calls through batching

## Integration Testing
- Set up API key: `export ATTIO_API_KEY=your_key_here`
- Run integration tests: `npm test -- integration/real-api-integration.test.ts`
- Tests use real API calls with 30s timeout
- Tests clean up test data automatically

## Troubleshooting
- Check `TROUBLESHOOTING.md` for common issues
- Verify API key configuration for authentication errors
- Use offline configurations for network-restricted environments
- Run `npm run codex:verify` to check environment setup

## Important Notes
- This project uses ES modules (type: "module" in package.json)
- All file paths should use `.js` extensions in imports (TypeScript requirement)
- The server runs as an MCP server, not a web server
- Main entry point is `dist/index.js` after compilation