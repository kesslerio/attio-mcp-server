# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Security

### Deprecated

## [1.1.0] - 2025-10-06

This release enhances developer experience with intelligent prompts, comprehensive tool standardization, and strengthens enterprise readiness with security hardening and validation improvements.

### Added

- **10 Pre-Built MCP Prompts for Common CRM Tasks** (#774) - Intelligent shortcuts that help Claude work faster and more efficiently with your Attio data
  - **Search & Find** (5 prompts): `people_search.v1`, `company_search.v1`, `deal_search.v1`, `meeting_prep.v1`, `pipeline_health.v1`
    - Natural language search with automatic formatting (table, JSON, or IDs)
    - Meeting preparation summaries with recent activity context
    - Pipeline analysis with bottleneck detection and conversion metrics
  - **Take Actions** (4 prompts): `log_activity.v1`, `create_task.v1`, `advance_deal.v1`, `add_to_list.v1`
    - Dry-run mode for safe preview before executing changes
    - Consistent formatting across all write operations
  - **Research & Qualify** (1 prompt): `qualify_lead.v1`
    - Automated web research with BANT/CHAMP qualification frameworks
    - Lead scoring and actionable recommendations
  - **Key Features**:
    - Token-efficient design (300-700 tokens per prompt)
    - Server-side validation with helpful error messages
    - Discoverable by Claude for smart suggestions
    - Universal arguments for consistent behavior (format, fields_preset, verbosity)
    - Optional telemetry and dev metadata modes for monitoring
- **Comprehensive Tool Standardization** (#776) - Complete audit and optimization of all 33 MCP tools
  - **Phase 0+1** (PR #785): Infrastructure and core universal tools
    - Fixed critical MCP naming compliance (`records.search` → `records_search`) across 89 files
    - Created `formatToolDescription` template for consistent tool documentation
    - Built schema linter with 300-character description limit and quality checks
    - Token baseline established: 188 tokens/tool (60% better than industry average)
    - Standardized 19 universal tools (search, create, update, delete, get-details, etc.)
  - **Phase 2** (PR #792): List and note tools
    - Standardized 11 list management tools with consistent patterns
    - Standardized 2 note operation tools (create-note, list-notes)
    - Added `additionalProperties: false` to all schemas for strict validation
    - Enhanced with property-level examples throughout
  - **Phase 3** (PR #796): Workspace member tools
    - Standardized final 3 tools (list/search/get workspace members)
    - Completed tool discovery snapshot baseline for regression prevention
  - **Quality Improvements**:
    - All tools follow verb-first naming with clear boundaries
    - Enhanced JSON schemas with proper validation and examples
    - Token-efficient descriptions optimized for LLM routing
    - Automated quality gates prevent future regressions
- **Markdown Note Support** (#854, #862) - `create-note` tool now supports markdown formatting via optional `format` parameter ('plaintext' | 'markdown')
  - Rich formatted notes with headers, lists, and emphasis
  - Backward compatible with default plaintext format
  - Full E2E test coverage for markdown creation
- **Enhanced Phone Validation** (#837, #863) - Structured validation with libphonenumber-js integration
  - Central validation helpers (`validatePhoneNumber`, `isValidPhoneNumber`, `isPossiblePhoneNumber`)
  - Actionable `PhoneValidationError` metadata with length/country/format guidance
  - CLI auto-configures `libphonenumber-js` to use `min` metadata bundle
  - Server runtime exposes `PHONE_METADATA_SOURCE` for diagnostics
  - Phone normalization failures include aggregated issue counts and newline-delimited details
- **Intelligent Search Query Parsing** (#781) - Enhanced search capabilities for people and company resources
  - International phone format support with multi-level domain extraction
  - Consistent empty-filter handling across search strategies
  - Stopword filtering and large query input protection
- **Phone Number UX Improvements** (#798) - Comprehensive enhancements for phone number handling
  - Inline tool help with phone format examples and E.164 normalization guidance
  - Common update patterns documentation (`docs/examples/common-update-patterns.md`)
  - Field verification configuration guide (`docs/configuration/field-verification.md`)
  - Enhanced error messages for phone number validation with format examples
  - Pre-update field validation with automatic normalization
- Debug documentation for anonymized production placeholders used in diagnostic suites

### Changed

- **Phone Number Normalization** (#798, #837) - Automatic transformation from user-friendly `phone_number` to Attio's `original_phone_number` format
  - Additional fields (label, type, extension, is_primary) preserved during normalization
  - `AttributeAwareNormalizer` now rejects invalid phone inputs with `UniversalValidationError`
  - Precise length/country/format guidance instead of silent pass-through
- **Warning Suppression** (#798) - Update verification now filters out cosmetic formatting differences (e.g., `"Demo"` vs `Demo`)
- **Search Query Parsing** (#781) - Updated `parseQuery` to support international phone formats and robust multi-level domain extraction
  - Enhanced people/company search strategies leverage parsed tokens and phone variants
  - Swapped unit test fixtures/docs to anonymized examples (Alex Rivera / Example Medical Group / +1 555 010 4477)

### Fixed

- **Query Builder Issues** (#781) - Eliminated redundant `$or` filters and US-only phone assumptions in query filter builders
- **Token Processing** (#781) - Hardened token processing to ignore stopwords and guard against large query inputs
- **Phone Number Field Confusion** (#798) - Users can now use `phone_number` (user-friendly) which auto-converts to `original_phone_number` (Attio API format)

### Security

- **XSS Prevention** (#840, #841, #845) - Comprehensive protection against reflected XSS attacks
  - Replaced regex-based HTML sanitization with `sanitize-html` library (CodeQL alert #121)
  - URL scheme filtering (javascript:, data:, vbscript:, file:)
  - Hardened prompt handlers against XSS injection
  - Security test suite with 11 test cases covering XSS, protocol injection, double-encoding, and edge cases
- **Stack Trace Protection** (#841, #844) - Enhanced error handling to prevent sensitive information exposure
  - Stack traces no longer exposed in client-facing errors
  - File paths and system information sanitized
  - Correlation IDs for debugging without exposing internals
- **Enhanced Error Context** (#844) - Safe metadata enrichment without information leakage
  - Field type metadata preserved in error responses
  - Network information (localhost, ports, connection strings) sanitized
  - Error type consistency across all response formats

## [1.0.0] - 2025-09-27

🎉 **MAJOR RELEASE** - Complete Attio CRM Coverage + ChatGPT Integration

This milestone release transforms the MCP server from partial Attio coverage to **complete CRM surface spanning**. Users can now manage their entire Attio workspace—Deals, Tasks, Lists, People, Companies, Records, and Notes—through natural language, without falling back to raw API calls.

### Added

- **Complete CRM Resource Coverage** - Full support for all Attio resource types including deals, lists, people, companies, tasks and notes (previously limited to companies/people/lists)
- **Advanced Relationship Navigation** - Walk complete pipeline hierarchies with bidirectional company↔person↔deal relationships (#747)
- **Intelligent Field Mapping** - Smart field validation with synonym handling (value/value_in_cents, company_id/associated_company) and typo suggestions
- **Multi-Assignee Task Support** (#684) - Enhanced task operations with richer metadata and assignment handling
- **Content Search Across Resources** (#474, #507, #573) - Universal search capabilities across notes, tasks, and lists
- **ChatGPT Developer Mode Integration** (#766) - Full Attio toolset access for ChatGPT Pro/Plus users via Smithery marketplace
  - MCP safety annotations with built-in approval flows
  - OAuth authentication via `https://server.smithery.ai/@kesslerio/attio-mcp-server/mcp`
  - Natural language CRM management through conversational AI
- **Advanced Search & Filtering** (#475, #578) - Sophisticated query capabilities with pagination and timeframe support
- **List Management Parity** (#470, #499) - Lists now have feature parity with other Attio resources

### Changed

- **Services Architecture** - Complete rebuild with dedicated create/update/search/delete/metadata services for improved maintainability
- **Field Mapping System** (#529, #732, #483) - Rebuilt with deterministic normalization and intelligent field suggestions
- **Error Handling** (#413, #728, #732) - Context-aware error messages with field-specific guidance and typo suggestions
- **Test Infrastructure** - Comprehensive test pyramid with P0/P1/P2 suites covering all universal tool pathways
- **Performance** - 68% tool reduction (40+ → 14 universal tools) with 89.7% speed improvement in response handling
- **FormatResult Functions** - Guaranteed stable string output with zero environment branching for predictable behavior

### Fixed

- **Data Integrity** - Bidirectional relationship consistency validation with automatic repair
- **Field Validation** - Real-time detection of invalid field names with intelligent suggestions
- **Test Data Contamination** (#581, #587) - Enhanced test data filters preventing production workspace pollution
- **Cleanup Operations** - Automated scripts ensuring Attio workspaces stay clean after bulk operations

### Security

- **Prototype Pollution** (#751) - Fixed config loader vulnerability
- **Input Validation** (#752, #753) - Tightened LinkedIn and URL validation for secure data handling
- **Credential Protection** (#42 series) - CodeQL-driven log scrubbing to protect Attio API credentials
- **Injection Prevention** (#752, #753) - Enhanced input validation across all Attio operations

## [0.2.0] - 2025-08-04

This is a major release featuring the Universal Tool Consolidation, which dramatically simplifies the MCP interface by replacing 50+ resource-specific tools with a unified set of universal tools that work across all resource types.

### Added

#### Universal Tool System (#352, #358)

- **Universal Tools**: New consolidated tools that work across all resource types (companies, people, deals, tasks, records)
  - `search-records`: Search any resource type with consistent interface
  - `get-record-details`: Get details for any record type
  - `create-record`: Create records of any type
  - `update-record`: Update records of any type
  - `delete-record`: Delete records of any type
  - `discover-attributes`: Discover attributes for any resource type
  - `get-detailed-info`: Get categorized information (basic, contact, business, social)
- **Advanced Operations**: New tools for complex operations
  - `advanced-search`: Multi-attribute search with complex filters
  - `search-by-relationship`: Find records by their relationships
  - `search-by-content`: Search by notes or interaction content
  - `search-by-timeframe`: Search by creation/update dates
  - `batch-operations`: Perform bulk operations efficiently
- **Resource Type Support**: Full support for companies, people, deals, tasks, and generic records
- **Backwards Compatibility**: All existing tool names continue to work via intelligent routing

#### Enhanced Error Handling System (#362)

- Comprehensive error categorization (USER_ERROR, SYSTEM_ERROR, API_ERROR)
- Detailed error messages with examples and suggestions
- Field-specific guidance for common mistakes
- HTTP status code mapping for better API integration
- Structured error responses with actionable feedback

#### Deal Management Improvements

- Comprehensive deal field error messages for common mistakes (description, probability, source, close_date, tags, etc.)
- Deal field documentation showing available vs non-existent fields
- Currency handling guidance - Attio automatically formats currency based on workspace settings
- Field name conversions for backwards compatibility:
  - `company_id` → `associated_company`
  - `deal_stage` → `stage`
  - `deal_value` → `value`
  - `deal_name` → `name`

#### Documentation & Testing (#360, #359)

- Complete universal tools documentation with examples
- Comprehensive integration test suite for all universal operations
- Performance benchmarks for batch operations
- Migration guide from resource-specific to universal tools

#### Developer Experience

- Config migration tool for postal code mapping fix (#330)
- Enhanced validation pipeline with mandatory pre-commit checks
- Systematic lint reduction plan (targeting <100 warnings from ~800)
- Improved environment setup for API integration testing

### Changed

#### API & Tool Behavior

- **Simplified Currency Handling**: Deal values now accept plain numbers (e.g., `value: 9780`) instead of complex objects
- **Consistent Search Interface**: All search operations now use the same filter structure
- **Unified Response Format**: All tools return consistent response structures
- **Better Field Validation**: Proactive validation with helpful suggestions before API calls
- **Improved Error Messages**: Context-aware error messages that guide users to solutions

#### Infrastructure & Performance

- Consolidated 50+ individual tool handlers into modular universal handlers
- Reduced code duplication by ~70% through shared implementations
- Improved response times through optimized routing
- Better memory usage with streamlined tool definitions
- Enhanced TypeScript type safety throughout the codebase

### Fixed

#### Critical Fixes

- Fixed deal currency format errors by accepting simple numeric values (#352)
- Fixed company domain search regression - now correctly uses `domains` field instead of `website` (#334, #353)
- Fixed "Format Error: An invalid value was passed to attribute with slug 'value'" issue
- Fixed missing generic record operation handlers (#343, #349)
- Fixed people search phone field regression (P0 hotfix)
- Fixed list filtering for list-specific attributes (#341)

#### Search & Filter Fixes

- Fixed date filter operators to match Attio API requirements
- Fixed domain search implementation by removing over-engineering
- Fixed company search validation and enhanced error handling
- Fixed filter condition type enum values for API compatibility

#### API Integration Fixes

- Fixed MCP tool calls failing with missing arguments wrapper (#344, #345)
- Fixed relationship helper tools and type conversion issues (#347)
- Fixed note formatting and content extraction (#338, #347)
- Fixed schema alignment for add-record-to-list tool (#332)

#### Testing & CI/CD Fixes

- Fixed integration test failures with proper mock management
- Fixed CI test compatibility with simplified mocks
- Fixed flaky date tests for Node v22.x
- Fixed TypeScript type issues and unnecessary try/catch warnings

### Security

- Updated form-data dependency from 4.0.1 to 4.0.4 for security patches (#346)

### Deprecated

- Resource-specific tool names (e.g., `search-companies`, `create-person`) are deprecated but still functional
- Legacy field names for deals are deprecated but automatically converted
- Individual resource type handlers are deprecated in favor of universal handlers

### Migration Guide

Users upgrading from v0.1.x should note:

1. All existing tools continue to work - no breaking changes
2. Consider migrating to universal tools for new implementations
3. Deal currency values should now be simple numbers
4. Use `associated_company` instead of `company_id` for deals
5. Check error messages for field name guidance when creating records

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

[Unreleased]: https://github.com/kesslerio/attio-mcp-server/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/kesslerio/attio-mcp-server/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/kesslerio/attio-mcp-server/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/kesslerio/attio-mcp-server/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/kesslerio/attio-mcp-server/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/kesslerio/attio-mcp-server/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/kesslerio/attio-mcp-server/releases/tag/v0.1.0
