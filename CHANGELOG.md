# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.3] - 2025-02-04

### Fixed
- Fixed deal currency format errors by accepting simple numeric values (#352)
- Fixed "Format Error: An invalid value was passed to attribute with slug 'value'" issue
- Enhanced error messages for invalid deal fields with specific guidance

### Added
- Comprehensive deal field error messages for common mistakes (description, probability, source, etc.)
- Deal field documentation showing available vs non-existent fields
- Currency handling guidance - Attio automatically formats currency based on workspace settings
- Field name conversions for backwards compatibility (company_id → associated_company, etc.)

### Changed
- Simplified currency value handling - now accepts plain numbers instead of complex objects
- Improved deal creation workflow with better field validation and suggestions
- Enhanced error messages to guide users toward correct field usage

## [0.1.2] - 2025-01-23

### Fixed
- Fixed MCP tool calls failing with missing arguments wrapper (#344, #345)
- Fixed list filtering for list-specific attributes (#341)
- Fixed MCP stdio communication for Smithery deployment
- Fixed TypeScript type issues and improved type safety
- Fixed unnecessary try/catch warnings
- Fixed lexical declaration in case block
- Fixed flaky date test for Node v22.x

### Changed
- Updated form-data dependency from 4.0.1 to 4.0.4 for security
- Improved error handling and logging for tool dispatch
- Enhanced list filtering with proper attribute type handling
- Better CI/CD with prettier formatting and type checking

### Added
- Claude PR Assistant workflow for automated PR reviews (#342)
- Enhanced MCP tool argument handling with automatic wrapper
- Improved documentation for list filtering and attribute types

## [0.1.1] - 2025-01-06

### Fixed
- Fixed npm installation failing due to postinstall script trying to setup git hooks in non-git environments
- Postinstall script now only runs git hooks setup when .git directory exists

### Changed
- Updated LICENSE from BSD-3-Clause to Apache-2.0 while preserving original BSD license attribution
- Updated package.json author field to @kesslerio

## [0.1.0] - 2025-01-06

### Added
- Initial release of Attio MCP Server
- Model Context Protocol integration for Attio CRM platform
- Company management tools (create, read, update, search, batch operations)
- People management tools (create, read, update, search, relationships)
- Lists management (get details, add/remove records)
- Notes management (create, read for companies and people)
- Tasks management (create, read, update, complete)
- Records management (read operations)
- Advanced search and filtering capabilities
- Batch operations support for companies and people
- Relationship management between entities
- Comprehensive error handling and validation
- Rate limiting and API resilience
- TypeScript implementation with strict typing
- Comprehensive test suite with Vitest
- Docker support for containerized deployment
- CLI tools for attribute discovery and development
- Structured logging and debugging utilities
- Configuration management with environment variables
- Auto-discovery of Attio workspace attributes

### Features
- **MCP Integration**: Fully compatible with Model Context Protocol v1.4.1
- **CRM Operations**: Complete CRUD operations for all major Attio entities
- **Advanced Search**: Complex filtering with date ranges, numeric comparisons, and text matching
- **Batch Processing**: Efficient bulk operations for high-volume data management
- **Relationship Mapping**: Handle complex relationships between companies and people
- **Error Recovery**: Robust error handling with detailed error messages
- **Development Tools**: CLI utilities for workspace exploration and debugging
- **Container Ready**: Docker support for easy deployment and scaling

### Dependencies
- @modelcontextprotocol/sdk: ^1.4.1 (MCP protocol support)
- TypeScript: ^5.8.3 (Type safety and modern JavaScript features)
- Vitest: ^3.1.4 (Testing framework)
- And other quality assurance and utility tools

### Documentation
- Comprehensive API documentation
- Setup and configuration guides
- Integration examples and workflows
- Troubleshooting guides
- Development and contribution guidelines

[Unreleased]: https://github.com/kesslerio/attio-mcp-server/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/kesslerio/attio-mcp-server/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/kesslerio/attio-mcp-server/releases/tag/v0.1.0