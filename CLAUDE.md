ATTIO MCP SERVER GUIDELINES

🚨 DOCUMENTATION-FIRST RULE (MANDATORY):
Before building ANY custom solution around third-party libraries:
1. [ ] Check official documentation for standard approach
2. [ ] Research online for existing solutions/libraries that solve the problem
3. [ ] Test the documented standard approach first
4. [ ] Only build custom if standard approach demonstrably fails
5. [ ] Document WHY standard approach is insufficient

🔍 RESEARCH HIERARCHY (Follow this order):
1. Official documentation of existing libraries
2. Online search for existing solutions (GitHub, Stack Overflow, community forums)
3. Evaluate proven third-party alternatives
4. Consider hybrid approaches using existing tools
5. Build custom solution ONLY as last resort

🔍 COMPLEXITY AUDIT CHECKLIST:
When encountering existing complex code:
- [ ] Question: "Is this complexity actually necessary?"
- [ ] Check: "Does official documentation suggest a simpler approach?"
- [ ] Test: "Can we achieve the same result with standard APIs?"
- [ ] Use: mcp__clear-thought-server__mentalmodel with First Principles to analyze why complex code exists

⚠️  ENGINEERING RED FLAGS (Stop and reassess):
- Building workarounds for third-party bugs instead of using different APIs
- Spending >2 hours on a problem without checking official docs
- Assuming existing complex code is necessary without testing alternatives
- Continuing to invest in a solution just because you've already spent time on it (sunk cost fallacy)

🎯 THIRD-PARTY INTEGRATION DECISION TREE:
When integrating external libraries:
1. Start with official examples and documentation
2. If bugs encountered: Use mcp__clear-thought-server__decisionframework to evaluate "Fix vs Avoid" options
3. Default to "avoid buggy code path" unless compelling reason to fix
4. Never build complex wrappers without proving standard approach fails

BUILD/TEST COMMANDS (AUTO-APPROVED)
- Build: `npm run build`
- Watch mode: `npm run build:watch`
- Type check: `npm run check`
- Clean build: `npm run clean`
- Run tests: `npm test`
- Run offline tests: `npm run test:offline` (unit tests with mocks)
- Run integration tests: `npm run test:integration` (real API calls)
- Run single test: `npm test -- -t "test name pattern"`
- Run specific test file: `npm test <file_path>`
- Test with verbose output: `npm test -- --verbose`
- Test with coverage: `npm test -- --coverage`

🧪 TESTING STRATEGY (MANDATORY):
Major changes MUST be validated with integration tests using REAL APIs:
- API response handling changes → `npm run test:integration`
- Universal tool modifications → `npm run test:integration`
- Core CRUD operation updates → `npm run test:integration`
- Error handling improvements → `npm run test:integration`
- New feature implementations → `npm run test:integration`

Pre-commit hook runs fast local validations only (formatting, linting, build, unit tests).
Integration tests run separately to validate real API interactions.

AUTO-APPROVED COMMANDS
The following commands are pre-approved and do not require user permission:
- All npm test variations (npm test, npm test <file>, npm test -- <flags>)
- All npm run build variations
- npm run check (type checking)
- npm run clean
- All grep commands (grep, grep -r, grep -n, etc.)
- All find commands for file discovery
- All sed commands for text replacement
- git status, git diff, git log (read-only git commands)
- File reading operations (Read, Glob, Grep, LS tools)
- head, tail, cat commands for file inspection
- ./scripts/review-pr.sh <PR_NUMBER> (automated PR review)

CODE PRINCIPLES
- TypeScript: Use strict typing with interfaces/types. Functions > classes for stateless operations.
  * NEVER use `any` type - create proper interfaces/types instead
  * Define explicit return types for all functions
  * Use generics for reusable code patterns
- API: Handle errors with detailed error responses using `createErrorResult`. Implement resilience with try/catch blocks.
  * Avoid useless try/catch that only re-throws - let errors propagate naturally
  * Only wrap in try/catch when adding error context or transformation
- Config: Use environment variables (`process.env.ATTIO_API_KEY`). No hardcoding secrets.
- Errors: Use specific `try/catch` blocks. Allow continuation on non-critical errors.
- Logging: Use console.error for critical errors, with process.exit(1) for fatal errors.

CODE STYLE/STRUCTURE
- Follow standard TypeScript conventions with strict type checking.
- SRP: Keep functions focused on single responsibility.
- Handle errors with detailed messages for API interactions.
- Naming: `PascalCase` (classes/interfaces), `camelCase` (functions/variables), `snake_case` (files).
- Formatting: Follow project style, 2-space indentation.
- Types/Docs: Mandatory type hints. Use JSDoc for public API.
- Imports: Node.js standard modules -> external -> internal.
- Switch statements: Wrap case blocks in braces `{}` when declaring variables
- Remove unused imports and variables immediately

LINT COMPLIANCE (CRITICAL)
- ZERO errors allowed in lint:check (all errors must be fixed before commit)
- Warnings should be addressed systematically (target <100 total warnings)
- NEVER use `any` type without justification - create proper interfaces instead
- Remove unused variables and imports immediately
- Use `@ts-expect-error` instead of `@ts-ignore` with explanatory comments
- Replace useless try/catch blocks that only re-throw errors
- Run `npm run lint:fix` to auto-fix simple issues before manual review

AUTOMATIC AGENT DELEGATION (MANDATORY - Use Task tool):

## Quick Decision Matrix
| USER INTENT | PRIMARY AGENT | CHAIN TO |
|------------|---------------|----------|
| "implement/build/create feature" | project-delegator-orchestrator | docs-architect |
| "fix/debug/error/crash" | debug-specialist | test-coverage-specialist |
| "refactor/clean up" | code-refactoring-architect | code-review-specialist |
| "review my code" | code-review-specialist | test-coverage-specialist |
| "organize/plan tasks" | issue-plan-author | project-delegator-orchestrator |

## Trigger Priority Levels
- **P0-CRITICAL**: MUST use immediately (blocks progress)
- **P1-REQUIRED**: Use before proceeding (quality gate)
- **P2-RECOMMENDED**: Should use (best practice)

## Context-Based Auto-Triggers
- FILE >500 lines → P0: code-refactoring-architect
- FUNCTION >30 lines → P1: code-refactoring-architect
- ERROR in logs → P0: debug-specialist
- TEST failure → P0: debug-specialist
- Before PR/commit → P1: code-review-specialist
- SECURITY keywords → P0: security-vulnerability-scanner
- AFTER code changes → P1: docs-architect
- TypeScript `any` types → P2: code-refactoring-architect

## SPECIALIZED AGENTS

### Planning & Orchestration
**project-delegator-orchestrator** [P0]
TRIGGERS: Multi-step task, feature request, "how should I", complex change
KEYWORDS: implement, build, feature, plan, coordinate, migrate
CHAINS-TO: All specialist agents → docs-architect

**issue-plan-author** [P2]
TRIGGERS: Feature specs, bug reports needing structure
KEYWORDS: issue, ticket, plan, spec, requirements
CHAINS-TO: project-delegator-orchestrator

**backlog-triage-specialist** [P2]
TRIGGERS: Raw bug reports, duplicate issues, priority unclear
KEYWORDS: triage, prioritize, duplicate, organize
CHAINS-TO: issue-plan-author

### Implementation & Refactoring
**code-refactoring-architect** [P0]
TRIGGERS: File >500 lines, function >30 lines, duplicate code, `any` types
KEYWORDS: refactor, split, modularize, clean, organize, any-type
AUTO-INVOKE: When SRP violations or `any` types detected
CHAINS-TO: code-review-specialist → test-coverage-specialist

**api-design-architect** [P1]
TRIGGERS: New endpoint, API changes, service boundaries, MCP tools
KEYWORDS: API, endpoint, REST, GraphQL, contract, service, MCP, schema
CHAINS-TO: code-review-specialist → docs-architect

**ui-implementation-specialist** [P2]
TRIGGERS: UI components, responsive design, accessibility requirements
KEYWORDS: UI, component, responsive, accessibility, frontend
CHAINS-TO: code-review-specialist → test-coverage-specialist

**architecture-optimizer** [P2]
TRIGGERS: Build time issues, code duplication, tight coupling
KEYWORDS: optimize, redundancy, dependencies, modernize
CHAINS-TO: code-refactoring-architect

### Validation & Quality
**code-review-specialist** [P1]
TRIGGERS: Before commit/PR, critical code paths, API handlers
KEYWORDS: review, check, validate, commit, PR
AUTO-INVOKE: Pre-commit on critical paths
CHAINS-TO: test-coverage-specialist → security-vulnerability-scanner

**test-coverage-specialist** [P1]
TRIGGERS: New feature, bug fix, <80% coverage, integration tests needed
KEYWORDS: test, coverage, unit, integration, vitest, mock
CHAINS-TO: debug-specialist (if failures)

**debug-specialist** [P0]
TRIGGERS: Error, test failure, regression, unexpected behavior
KEYWORDS: error, fail, crash, timeout, regression, debug
AUTO-INVOKE: On CI/test failures
CHAINS-TO: test-coverage-specialist → docs-architect

**security-vulnerability-scanner** [P0]
TRIGGERS: Before release, dependency updates, auth/API key code
KEYWORDS: security, vulnerability, CVE, auth, token, password, API-key
AUTO-INVOKE: On security-sensitive changes

**performance-engineer** [P1]
TRIGGERS: Performance degradation, hot paths, critical sections, optimization needs
KEYWORDS: performance, slow, optimize, benchmark, profile, bottleneck
AUTO-INVOKE: When performance requirements specified or degradation detected
CHAINS-TO: code-review-specialist → test-coverage-specialist

### Documentation
**docs-architect** [P1]
TRIGGERS: ALWAYS after significant code changes, API modifications
AUTO-INVOKE: End of every code change session
CHAINS-TO: None (final step)

## WORKFLOW PATTERNS
1. **Sequential Chain**: project-delegator → implementation → review → test → docs
2. **Debug Chain**: debug-specialist → test-coverage → code-review → docs
3. **Refactor Chain**: code-refactoring → code-review → test-coverage → docs
4. **TypeScript Chain**: code-refactoring (any-types) → code-review → test → docs

SYSTEMATIC ANY TYPE REDUCTION PLAN:
Current status: ~778 warnings (mostly `any` types)
Priority order for fixing `any` types:
1. **API Response Types** (src/api/operations/*.ts) - Create proper response interfaces
2. **Error Handling** (src/errors/*.ts) - Define specific error parameter types  
3. **Handler Parameters** (src/handlers/*.ts) - Create typed parameter interfaces
4. **Universal Tool Types** (src/handlers/tool-configs/universal/*.ts) - Enhance existing types
5. **Test Files** (test/**/*.ts) - Use proper mock types instead of any

Strategy: Create reusable interfaces in types/ directory, then systematically replace any types
Target: Reduce from 778 to <100 warnings over time (not blocking for commits)
- Testing:
  * ALWAYS place ALL tests in the `/test` directory - never in project root
  * Use Vitest (NOT Jest) for TypeScript tests (*.test.ts)
  * Import testing functions: `import { describe, it, expect, beforeEach, vi } from 'vitest'`
  * Use `vi.mock()` for mocking, `vi.fn()` for mock functions, `vi.mocked()` for typed mocks
  * Use `vi.clearAllMocks()` in beforeEach for test isolation
  * Manual test scripts should be named with `-test.js` suffix
  * Test files should mirror the structure of the source code they test
- Integration Tests:
  * Set up API key: export ATTIO_API_KEY=your_key_here
  * Run integration tests: npm test -- integration/real-api-integration.test.ts
  * Tests use real API calls with 30s timeout
  * Tests clean up test data automatically
  * Skip tests if no API key: SKIP_INTEGRATION_TESTS=true

MCP TOOL SCHEMA GUIDELINES
- NEVER use oneOf, allOf, or anyOf at the top level of tool input schemas
- The MCP protocol does NOT support these JSON Schema features at the root level
- Using them will cause connection errors: "input_schema does not support oneOf, allOf, or anyOf at the top level"
- See docs/mcp-schema-guidelines.md for detailed guidelines and examples
- Handle either/or parameter validation in runtime code, not in schemas

GITHUB WORKFLOW

⚠️ CRITICAL: PR TARGETING
ALWAYS create PRs to kesslerio/attio-mcp-server unless EXPLICITLY told to target hmk/attio-mcp-server.
NEVER create PRs to hmk/attio-mcp-server without explicit instructions.
NEVER assume PR should go to upstream repository.
ALWAYS check all config files and templates use kesslerio URLs, not hmk URLs.

🚨 ENHANCED GIT ACP PROCESS (MANDATORY)
Before any commit, ALWAYS run this validation pipeline:
```bash
# Full validation pipeline (recommended) 
npm run lint:check && npm run check:format && npm run build && npm run test:offline && git add . && git commit -m "message" && git push

# Quick validation (for minor changes)  
npm run build && npm run test:offline && git add . && git commit -m "message" && git push

# Emergency bypass (critical fixes only, requires justification in commit message)
git add . && git commit --no-verify -m "EMERGENCY: description of critical issue" && git push
```

⚠️ VALIDATION PIPELINE RULES:
- `npm run lint:check` - MUST pass (ESLint/TypeScript errors/warnings)
- `npm run check:format` - MUST pass (Prettier code formatting)
- `npm run build` - MUST pass (TypeScript compilation)
- `npm run test:offline` - MUST pass (offline tests, no API required)
- Commit only proceeds if ALL validations pass
- Use `--no-verify` ONLY for critical production fixes with justification

🔍 CRITICAL DISTINCTION:
- `npm run lint:check` = ESLint and TypeScript checks
- `npm run check:format` = Prettier formatting validation
- `npm run build` = TypeScript compilation  
- `npm run test:offline` = Test execution (catches logic/assertion failures)
- `npm run check` = ALL above + full test suite (not suitable for git workflow due to API tests)

Standard Commands:
git checkout -b feature/<name> && git add . && git commit -m "Feature: <desc>" && git push -u origin HEAD && gh pr create -R kesslerio/attio-mcp-server -t "Feature: <desc>" -b "<details>"
git fetch upstream && git checkout main && git merge upstream/main && git push origin main

Best Practices for Clean PRs
1. Focus on a single feature or fix per PR
2. Keep PRs small and focused
3. Use meaningful commit messages (Format: `Feature:`, `Fix:`, `Docs:`, `Refactor:`, etc.)
4. Only include relevant files
5. Test thoroughly before submitting
6. Run **docs-architect** agent for documentation updates
7. For refactoring work, follow guidelines in @docs/refactoring-guidelines.md

Troubleshooting:
git rm --cached <path> && git commit --amend && git push -f origin <branch>
git fetch upstream && git rebase upstream/main && git push -f origin <branch>

RELEASE PROCESS (AUTO-APPROVED)

Automated Release Workflow:
1. Use scripts/release.sh for automated releases:
   ./scripts/release.sh
   - Validates clean branch state
   - Prompts for version bump (major.minor.patch)
   - Updates package.json version
   - Builds and tests project
   - Updates CHANGELOG.md with release notes
   - Creates git tag and GitHub release
   - Publishes to npm registry

2. Manual Release Commands:
   npm version patch|minor|major     # Bump version
   npm run build && npm test         # Validate
   git add . && git commit -m "Release: vX.X.X"
   git tag vX.X.X && git push origin vX.X.X
   gh release create vX.X.X --notes "Release notes"
   npm publish                       # Publish to npm

3. CHANGELOG.md Management:
   - Follow Keep a Changelog format (https://keepachangelog.com/)
   - Update [Unreleased] section during development
   - Move to versioned section during release
   - Include: Added, Changed, Deprecated, Removed, Fixed, Security sections

ISSUE MANAGEMENT (ENHANCED WITH CLEAR THOUGHT)

⚠️ CRITICAL WORKFLOW: Issue Work Checklist
BEFORE starting ANY GitHub issue work, ALWAYS follow this checklist:
1. [ ] Check current branch: `git branch --show-current`
2. [ ] If not on main or appropriate feature branch, checkout main: `git checkout main`
3. [ ] Pull latest changes: `git pull origin main`
4. [ ] Create issue branch: `git checkout -b feature/issue-{number}-{description}`
5. [ ] Verify clean state: `git status` (should show "nothing to commit, working tree clean")
6. [ ] Begin work implementation
7. [ ] Commit with issue reference: `git commit -m "Type: Description #issue-number"`
8. [ ] Push branch: `git push -u origin HEAD`
9. [ ] Create PR: `gh pr create -R kesslerio/attio-mcp-server`

1. Issue Creation
- Create issues before starting work.
- Use descriptive titles: type: Description (clear, concise).
- Search first: `gh issue list --repo kesslerio/attio-mcp-server --search "keyword"`.
- Create Command: `gh issue create --title "type: Description" --body "Detailed description or use --body-file /path/to/template.md" --label "P2,type:bug,area:core"` (Verify labels with `gh label list --repo kesslerio/attio-mcp-server`).
- Problem Analysis: Use Clear Thought tools like `mcp_clear-thought_mentalmodel` (e.g., First Principles) or `mcp_mcp-sequentialthinking-tools_sequentialthinking_tools` for complex issues.
- Refactoring: Follow template in @docs/refactoring-guidelines.md.

Required Labels:
- Priority: P0(Critical), P1(High), P2(Medium), P3(Low), P4/P5(Trivial)
- Type: bug, feature, enhancement, documentation, test
- Status (Required): status:blocked, status:in-progress, status:ready, status:review, status:needs-info, status:untriaged
- Area: area:core, area:api, area:build, area:dist, area:documentation, area:testing, area:performance, area:refactor, area:api:people, area:api:lists, area:api:notes, area:api:objects, area:api:records, area:api:tasks, area:extension, area:integration, area:security, area:rate-limiting, area:error-handling, area:logging

2. Branch Strategy
- NEVER work directly on main (except critical hotfixes).
- ALWAYS create a new branch before starting ANY work on GitHub issues.
- MANDATORY: Check current branch with `git branch --show-current` BEFORE starting work.
- If not on a clean feature branch, IMMEDIATELY create one: `git checkout -b feature/issue-{issue-number}-{short-description}` or `git checkout -b fix/issue-{issue-number}-{short-description}`.
- Branch naming convention: `feature/issue-319-test-cleanup`, `fix/issue-123-domain-utils`, `docs/issue-456-api-guide`.
- NEVER continue work on unrelated branches unless explicitly approved.
- Use Clear Thought tools for planning (e.g., `mcp__clear-thought-server__mentalmodel` for analysis, `mcp__clear-thought-server__decisionframework` for architectural choices).

3. Commit Message Format
- Prefixes: Feature:, Fix:, Docs:, Refactor:, Test:, Chore:
- Include issue references: #123. [HOTFIX] for hotfixes.

4. Pull Requests
- Get approval before pushing to upstream.
- Reference issues: Closes #XX or Relates to #XX.
- Include testing details. Wait for review. Use squash merging.

5. Issue Closure Requirements
- Verify acceptance criteria.
- Add implementation comment (details, lessons, challenges, future considerations).
- Verification statement: "✅ VERIFICATION: All GitHub documentation requirements completed."

DOCUMENTATION SEARCH WORKFLOW (ALWAYS FOLLOW THIS ORDER)

⚠️ CRITICAL: Documentation Search Priority
NEVER use web search as the first option. ALWAYS follow this sequence:

1. **PRIMARY: Check Existing Crawled Documentation**
   - FIRST: Use `mcp_crawl4ai-rag_perform_rag_query(query="search terms", match_count=5)` to search ALL indexed sources
   - Check available sources: `mcp_crawl4ai-rag_get_available_sources()`
   - Try domain-specific searches: `mcp_crawl4ai-rag_perform_rag_query(query="search terms", source="docs.attio.com", match_count=5)`
   - Examples:
     * `mcp_crawl4ai-rag_perform_rag_query(query="bearer token authentication", source="docs.attio.com")`
     * `mcp_crawl4ai-rag_perform_rag_query(query="MCP protocol schema validation", source="modelcontextprotocol.io")`
     * `mcp_crawl4ai-rag_perform_rag_query(query="webhook configuration", match_count=8)`

2. **SECONDARY: Crawl Additional Documentation (If Needed)**
   - If existing docs don't contain the information, crawl new sources:
   - Single page: `mcp_crawl4ai-rag_crawl_single_page(url="https://specific-doc-page.com")`
   - Smart crawling: `mcp_crawl4ai-rag_smart_crawl_url(url="https://docs.example.com", max_depth=2, max_concurrent=5)`
   - Target relevant documentation sites, GitHub repos, or API references
   - After crawling, retry the search: `mcp_crawl4ai-rag_perform_rag_query(query="same search terms")`

3. **TERTIARY: Web Search (Last Resort)**
   - Only use web search tools if crawled documentation is insufficient
   - Use for real-time information, recent updates, or community discussions
   - Consider crawling any valuable sources found via web search for future use

**Currently Indexed Sources:**
- docs.cognee.ai, docs.falkordb.com, modelcontextprotocol.io, github.com (MCP SDKs), yourls.org, docs.attio.com
- Verify current sources: `mcp_crawl4ai-rag_get_available_sources()`

**Examples of Crawl Targets When Extending Documentation:**
- API documentation: `https://docs.attio.com/api/`, `https://docs.github.com/en/rest`
- Framework docs: `https://vitest.dev/guide/`, `https://nodejs.org/docs/`
- MCP examples: GitHub repositories with MCP implementations
- TypeScript references: `https://www.typescriptlang.org/docs/`

CLEAR THOUGHT MCP INTEGRATION (Systematic Problem-Solving)
- Purpose: Enhance problem analysis, design, implementation, and debugging.
- Documentation: See @docs/tools/clear-thought-tools.md for comprehensive tool reference.
- Integration: Use Clear Thought MCP tools (e.g., `mcp__clear-thought-server__mentalmodel`, `mcp__clear-thought-server__sequentialthinking`, `mcp__clear-thought-server__debuggingapproach`) via their respective MCP tool names and schemas.
- Problem-Solving Workflow:
  1. Problem Analysis (e.g., First Principles via `mcp__clear-thought-server__mentalmodel`)
  2. Architecture Planning (e.g., Design Patterns via `mcp__clear-thought-server__designpattern`)
  3. Implementation Strategy (e.g., Programming Paradigms via `mcp__clear-thought-server__programmingparadigm`)
  4. Debugging (e.g., Systematic approaches via `mcp__clear-thought-server__debuggingapproach`)
  5. Documentation/Synthesis (e.g., `mcp__clear-thought-server__sequentialthinking`)

- Contextual Tool Application:
  * Performance Issues: `mcp__clear-thought-server__programmingparadigm` + `mcp__clear-thought-server__debuggingapproach`.
  * New Features: `mcp__clear-thought-server__mentalmodel` + `mcp__clear-thought-server__designpattern`.
  * Integration Problems: `mcp__clear-thought-server__debuggingapproach` + `mcp__clear-thought-server__designpattern`.
  * Refactoring: `mcp__clear-thought-server__mentalmodel` (e.g., Opportunity Cost) + `mcp__clear-thought-server__programmingparadigm`.

- Enhanced Testing with Clear Thought:
  1. Pre-Test Analysis: `mcp__clear-thought-server__mentalmodel` (e.g., Error Propagation).
  2. Test Strategy: `mcp__clear-thought-server__debuggingapproach` (e.g., Program Slicing).
  3. Failure Analysis: `mcp__clear-thought-server__sequentialthinking`.

EXTERNAL MCP SERVERS (Runtime Dependencies)
- Note: External services, not npm dependencies.
- Namespace `mcp__crawl4ai-rag__`:
  * Server: Crawl4AI RAG MCP Server (https://github.com/coleam00/mcp-crawl4ai-rag)
  * Purpose: Web crawling and RAG.
  * Tools: get_available_sources(), crawl_single_page(url), smart_crawl_url(url), perform_rag_query(q, source?, match_count?)
  * Setup: Install external server, configure in MCP client.