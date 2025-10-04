# Development Guide

This directory contains comprehensive development documentation for the Attio MCP Server.

## Available Guides

- **[Contributing](contributing.md)** - How to contribute to the project
- **[Testing](testing.md)** - Testing framework and best practices
- **[TDD Guide](tdd-guide.md)** - Test-driven development approach
- **[Extending MCP](extending-mcp.md)** - How to extend MCP functionality
- **[Refactoring Guidelines](refactoring-guidelines.md)** - Best practices for refactoring
- **[Phone Validation Helpers](phone-validation.md)** - Canonical normalization + error handling patterns

## Quick Start for Developers

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/attio-mcp-server.git
   cd attio-mcp-server
   ```

2. **Setup Development Environment**

   ```bash
   ./scripts/setup-dev-env.sh
   ```

3. **Run Tests**

   ```bash
   npm test
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Development Workflow

1. Create feature branch
2. Make changes following our coding standards
3. Write/update tests
4. Run full test suite
5. Create pull request

## Getting Help

- Review individual guides for specific topics
- Check the main [README](../../README.md) for project overview
- Join our community discussions for questions
