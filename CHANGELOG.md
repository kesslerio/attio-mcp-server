# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking Changes

### Added

### Changed

### Fixed

### Security

### Deprecated

## [1.3.0] - 2025-12-02

OAuth access token support - enables delegated authentication for third-party integrations and Claude Desktop users who prefer OAuth over API keys.

### Added

- **OAuth access token support** (#928) - New `ATTIO_ACCESS_TOKEN` environment variable as alternative to `ATTIO_API_KEY`
  - Both authentication methods use identical Bearer token auth under the hood
  - Resolution order: `ATTIO_API_KEY` (config) → `ATTIO_ACCESS_TOKEN` (config) → `ATTIO_API_KEY` (env) → `ATTIO_ACCESS_TOKEN` (env)

- **Local OAuth helper script** (#928) - Interactive PKCE flow for obtaining tokens without hosted infrastructure
  - Run `npm run oauth:setup` to complete OAuth authorization flow
  - Run `npm run oauth:refresh` to refresh expired tokens
  - Tokens saved to `.env.local` for easy configuration

- **Cloudflare Worker OAuth template** (#928) - Self-hostable OAuth broker for teams
  - Full OAuth 2.1 + PKCE implementation at `examples/cloudflare-oauth-worker/`
  - OAuth discovery endpoint, CORS support for Claude.ai
  - Deploy with `wrangler deploy`

- **OAuth documentation** (#928) - Comprehensive guide at `docs/guides/oauth-authentication.md`
  - Step-by-step OAuth app creation at build.attio.com
  - Token lifecycle and refresh guidance
  - Claude Desktop and Smithery configuration examples

### Changed

- **Improved 401 error messages** (#928) - Now includes OAuth-specific guidance for token expiration

## [1.2.2] - 2025-12-01

### Fixed

- **Critical: Added axios to production dependencies** (#917, #919) - Package failed on startup with `ERR_MODULE_NOT_FOUND` because axios was incorrectly placed in devDependencies instead of dependencies. This caused 100% failure rate for all users installing via npm.

- **CLI binary symlink resolution** (#916, #920) - `attio-mcp --help` and `--version` now work correctly when installed via npm global. The `isMain` check now resolves symlinks before path comparison, handling npm's symlink-based binary wrappers.

## [1.2.1] - 2025-11-28

### Changed

- **Clarified npm package name confusion** (#903) - Updated all documentation to clearly indicate correct package name
  - **Problem**: GitHub repository is named `attio-mcp-server`, but npm package is named `attio-mcp` (renamed in June 2025)
  - **Old package**: `attio-mcp-server@0.0.2` (abandoned, February 2025) - only 4 legacy tools
  - **Current package**: `attio-mcp@1.2.0` (actively maintained) - 34 universal tools
  - **Impact**: Users installing `npm install attio-mcp-server` got outdated v0.0.2 instead of current v1.2.0
  - **Solution**: Added prominent warnings in README and documentation about correct package name
  - **Note**: Old package owned by different npm user, cannot be deprecated by maintainers
  - **Result**: Clear installation instructions prevent users from installing wrong package

### Fixed

### Security

### Deprecated

## [1.2.0] - 2025-11-03

This release introduces intelligent workspace member auto-resolution for actor-reference filtering, enabling natural filtering syntax with emails and names instead of requiring manual UUID lookups. The update includes critical fixes for filter transformation, client initialization, and exact matching behavior.

### Breaking Changes

- **Array equals operator rejected for reference attributes** (#904 Phase 2) - Arrays with `equals` operator (e.g., `{owner: {$eq: ["uuid1", "uuid2"]}}`) now throw `FilterValidationError`. This addresses PR feedback [HIGH] issue where translator allowed arrays to pass through generating invalid `$eq: [...]` structure. Use 'in' operator instead (coming soon) or filter by single value.

- **Mixed-type arrays rejected in reference filters** (#904) - Arrays combining UUIDs and names (e.g., `["uuid-123", "John Doe"]`) now throw `FilterValidationError`. This prevents silent failures where UUIDs would never match when using the `name` field. Use separate filters or ensure all array elements are the same type.

### Added

- **Auto-resolution of workspace member emails/names to UUIDs** (#904 Phase 2) - Owner/assignee filters now transparently convert email addresses and names to workspace member UUIDs
  - **Problem**: Attio API requires workspace member UUIDs for actor-reference filters, but users naturally want to filter by email or name
  - **Solution**: Automatically resolve email/name values to UUIDs via workspace members search API before building filter structure
  - **User Experience**:
    - **BEFORE**: User must manually search workspace members by email, extract UUID, then use UUID in filter
    - **AFTER**: User filters by email/name directly (e.g., `owner="martin@shapescale.com"` or `owner="Martin Kessler"`), auto-resolved to UUID transparently
  - **Input Flexibility**:
    - **User Input**: Accepts UUID, email address, or full name
    - **API Payload**: Always uses `referenced_actor_id` (workspace member UUID) after resolution
    - **Examples**: `owner="uuid-123"` OR `owner="martin@shapescale.com"` OR `owner="Martin Kessler"` all work
  - **Features**:
    - Per-request caching prevents duplicate API calls for same email/name within single filter transformation
    - Exact matching: Post-filters Attio's fuzzy search results to ensure exact email/name matches only
    - Clear error messages when member not found or multiple matches (with member list)
    - Works in both AND and OR filter logic, and with/without resourceType (slug-based fallback)
    - Comprehensive unit test coverage (14 resolver tests + 7 integration tests)
  - **Result**: Natural filtering syntax like `owner="martin@shapescale.com"` or `owner="Martin Kessler"` just works, no manual UUID lookup required

- **Deal filtering documentation** (#904) - Enhanced `records_search` tool discoverability with deal-specific examples
  - Added "deals" to `records_search` tool description (was missing from capability list)
  - Documented `filters` parameter structure with format examples and deal-specific use cases
  - Added schema examples for filtering deals by stage, owner, and value (single and multi-condition)
  - Improves LLM's ability to discover and correctly use deal filtering capabilities

### Changed

### Fixed

- **Auto-resolution: Exact email and name matching** (#904 Phase 2) - Fixed auto-resolver returning "ambiguous match" errors for exact email/name searches
  - **Problem**: Attio `/workspace_members?search=` API does fuzzy matching, returning all members from same domain or with similar names
    - Email search: `martin@shapescale.com` returned all 5 `@shapescale.com` members
    - Name search: `Martin Kessler` returned all 5 workspace members (extreme fuzzy matching)
  - **Impact**: Auto-resolution threw "Ambiguous workspace member" errors even for exact email addresses and unique names
  - **Solution**: Added post-filtering logic to extract exact matches from fuzzy search results
    - Email filtering: Exact case-insensitive email match (e.g., `martin@shapescale.com`)
    - Name filtering: Exact case-insensitive full name match constructed from `first_name + last_name` (e.g., `Martin Kessler`)
  - **Result**: `owner="martin@shapescale.com"` and `owner="Martin Kessler"` now correctly resolve to single member, not ambiguous match error
  - Added unit tests covering both email and name fuzzy result filtering scenarios

- **Client initialization validation failures** (#904 Phase 2) - Eliminated repeated client validation errors in logs
  - **Problem**: `resolveAttioClient()` attempted `createAttioClient(apiKey)` first, which failed `assertAxiosInstance` validation, then fell back to `getAttioClient()` which succeeded
  - **Impact**: Repeated errors in logs (`createAttioClient failed: returned invalid Axios client instance`) despite API calls working correctly via cached client fallback
  - **Solution**: Reordered resolution priority to use `getAttioClient()` first (proven code path handling caching, environment detection, and strategy pattern)
  - **Result**: Clean logs with no validation failures, immediate success on first attempt, uses battle-tested code path from rest of codebase

- **Critical: Filter transformation bug** (#904) - Fixed `condition: "equals"` incorrectly mapping to `$equals` instead of Attio's required `$eq` operator
  - **Problem**: Filter transformer converted `equals` condition to `$equals` operator, but Attio API requires `$eq` (verified in search.ts:189-191)
  - **Impact**: ALL resource types affected (companies, people, deals, tasks, records) - filtering with `equals` condition failed with "Invalid operator: $equals" error
  - **Solution**: Updated 3 locations in `src/utils/filters/translators.ts` (lines 382, 400, 499) to generate `$eq` instead of `$equals`
  - **Result**: Filtering now works correctly for all resource types with `equals` condition
  - Updated test suites to expect correct `$eq` operator
- **CRITICAL FIX: Actor-reference filtering** (#904 Phase 2) - Fixed actor-reference attributes to use correct Attio API filter structure
  - **Production Issue**: API rejected all filters for actor-reference attributes (owner, assignee, created_by, modified_by):
    - `{"owner": {"name": {"$eq": "..."}}}` → "Invalid field 'name' for attribute of type 'actor-reference'"
    - `{"owner": {"email": {"$eq": "..."}}}` → "Invalid field 'email' for attribute of type 'actor-reference'"
    - `{"owner": {"record_id": {"$eq": "..."}}}` → "Invalid field 'record_id' for attribute of type 'actor-reference'"
  - **Root Cause**: Actor-reference attributes require a completely different filter structure per Attio API documentation
  - **Impact**: ALL filtering by owner, assignee, created_by, modified_by was completely broken
  - **Solution** (discovered via Context7 API documentation search):
    - Actor-reference attributes use direct property matching, not operator nesting
    - **API Payload Structure**: `{owner: {referenced_actor_type: "workspace-member", referenced_actor_id: "uuid"}}`
    - **NOT**: `{owner: {name: {$eq: "..."}}}` or `{owner: {email: {$eq: "..."}}}` or `{owner: {record_id: {$eq: "..."}}}`
    - Updated filter translator to detect actor-reference types and build special structure (3 locations in translators.ts)
    - Applied to both AND and OR logic, and list-entry contexts
    - **User Input Flexibility** (with auto-resolution): Users can provide UUID, email address, or full name - all are automatically resolved to workspace member UUID before building API payload
    - Added `assignee_id` to KNOWN_REFERENCE_SLUGS for proper detection without resourceType
    - Updated 22 unit tests to expect correct actor-reference structure
  - **Slug-based Fallback Behavior** (when resourceType unavailable):
    - `assignee_id` and `workspace_member` slugs always require email field (workspace-member type)
    - Other reference slugs (owner, assignee, company, person) use heuristic detection: UUID → record_id, otherwise → name
    - Cannot detect actor-reference type without resourceType, so uses standard nested structure
  - **Result**:
    - **User Input**: `owner="Martin Kessler"` OR `owner="martin@shapescale.com"` OR `owner="uuid-123"`
    - **API Payload**: `{"owner": {"referenced_actor_type": "workspace-member", "referenced_actor_id": "d28a35f1-..."}}` → ✅ SUCCESS
    - E2E test passed 100% (TC-AO03)
    - All 147 filter tests passing (no regressions)
  - Enhanced error messages to guide users when invalid value types provided

### Security

### Deprecated

## [1.1.10] - 2025-10-23

### Fixed

- **Release pipeline wireit configuration** (#898) - Fixed build configuration blocking NPM releases
  - **Problem**: `lint:tools` script used direct command instead of wireit, causing Release Pipeline validation failures
  - **Solution**: Updated package.json to use `"lint:tools": "wireit"` as required by wireit configuration
  - **Result**: Release Pipeline can now complete successfully and publish to NPM
- **Person creation now supports optional email addresses** (#895) - Removed unnecessary validation requiring `email_addresses` for person records
  - **Problem**: MCP server enforced `email_addresses` as required when Attio API only requires `name`
  - **Solution**: Updated `PersonCreator` to validate only `name` field (actual API requirement)
  - **Result**: Users can now create person records without email addresses (e.g., contacts without digital presence)
  - Updated data normalizer to handle cases where neither name nor email is provided
  - Added comprehensive unit tests for person creation without email
  - Updated E2E fixtures to include truly minimal person (name only)
  - Modified `PersonMockFactory` to support optional email addresses

## [1.1.2] - 2025-10-08

### Fixed

- **Multi-token search query logic** - Fixed fallback search to require ALL tokens in multi-word queries instead of ANY token
  - **Problem**: Multi-word searches (e.g., "Alpha Beta Company") returned 100+ records matching ANY token ("Alpha" OR "Beta" OR "Company"), pushing exact matches out of results
  - **Solution**: Multi-token queries now use AND-of-OR structure - each token must match somewhere (in name OR domains), but all tokens must match (cross-field flexibility with precision)
  - **Result**: Multi-word name searches now return exact matches in top results instead of being buried at position #101+
  - Single-token queries unchanged (still use simple `$contains`)
  - This improves precision for company/people searches with multi-word names
- **records_search relevance** (#885) - Added client-side scoring with uFuzzy and LRU caching so exact domain/name/email matches rank first while repeated queries stay within the 3 s budget
- **Deal search fast path optimization** (#885) - Extended fast path optimization to deals with 72-80% performance improvement
  - Sequential candidate execution: exact match ($eq) → substring match ($contains)
  - LRU caching with 5-minute TTL delivers 8ms cached responses (99.9% faster than ~2.8s cold searches)
  - Created `DealSearchStrategy` following same pattern as companies/people
  - Removed obsolete `searchDeals()` and `queryDealRecords()` methods (100+ lines)
  - Fixed original bug where deals only supported exact name matches
- **Notes search functionality - Partial fix with API limitation** (#888)
  - Created `NoteSearchStrategy` following established search strategy pattern
  - **API Limitation Discovered**: Attio Notes API `/v2/notes` endpoint returns empty array when called without filters
    - Confirmed via direct API testing: `GET /v2/notes` returns `{"data": []}`
    - API requires `parent_object` and/or `parent_record_id` filters to return notes
    - This prevents searching across all notes in a workspace
  - **What Works**: `list-notes` tool with parent record filtering (e.g., list all notes on a specific company)
  - **What Doesn't Work**: Global note search without parent filters (e.g., "find all notes containing 'demo'")
  - **Workaround**: Use `list-notes` with explicit parent filters to search within a specific record's notes
  - Implemented client-side filtering for title/content when parent filters are provided
  - Added smart caching (30s TTL) with parent-aware cache keys to prevent cross-contamination
  - Removed obsolete `searchNotes()` fallback method (85 lines)
  - **Recommendation**: Request Attio to add workspace-wide notes endpoint or search capability

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

[Unreleased]: https://github.com/kesslerio/attio-mcp-server/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/kesslerio/attio-mcp-server/compare/v1.1.10...v1.2.0
[1.1.10]: https://github.com/kesslerio/attio-mcp-server/compare/v1.1.0...v1.1.10
[1.1.0]: https://github.com/kesslerio/attio-mcp-server/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/kesslerio/attio-mcp-server/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/kesslerio/attio-mcp-server/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/kesslerio/attio-mcp-server/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/kesslerio/attio-mcp-server/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/kesslerio/attio-mcp-server/releases/tag/v0.1.0
