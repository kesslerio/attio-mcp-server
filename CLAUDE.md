ATTIO MCP SERVER GUIDELINES

BUILD/TEST COMMANDS (AUTO-APPROVED)
- Build: `npm run build`
- Watch mode: `npm run build:watch`
- Type check: `npm run check`
- Clean build: `npm run clean`
- Run tests: `npm test`
- Run single test: `npm test -- -t "test name pattern"`
- Run specific test file: `npm test <file_path>`
- Test with verbose output: `npm test -- --verbose`
- Test with coverage: `npm test -- --coverage`

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
- API: Handle errors with detailed error responses using `createErrorResult`. Implement resilience with try/catch blocks.
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

git checkout -b feature/<name> && git add . && git commit -m "Feature: <desc>" && git push -u origin HEAD && gh pr create -R kesslerio/attio-mcp-server -t "Feature: <desc>" -b "<details>"
git fetch upstream && git checkout main && git merge upstream/main && git push origin main

Best Practices for Clean PRs
1. Focus on a single feature or fix per PR
2. Keep PRs small and focused
3. Use meaningful commit messages (Format: `Feature:`, `Fix:`, `Docs:`, `Refactor:`, etc.)
4. Only include relevant files
5. Test thoroughly before submitting
6. Update documentation
7. For refactoring work, follow guidelines in @docs/refactoring-guidelines.md

Troubleshooting:
git rm --cached <path> && git commit --amend && git push -f origin <branch>
git fetch upstream && git rebase upstream/main && git push -f origin <branch>

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

AVAILABLE DOCUMENTATION SOURCES
Indexed: docs.cognee.ai, docs.falkordb.com, modelcontextprotocol.io, github.com (MCP SDKs, etc.), yourls.org, docs.attio.com.
Querying: Use `mcp_crawl4ai-rag_perform_rag_query(query="search query", source="optional_domain", match_count=N)`.
  Examples: `mcp_crawl4ai-rag_perform_rag_query(query="bearer token", source="docs.attio.com")`, `mcp_crawl4ai-rag_perform_rag_query(query="webhook config", match_count=5)`.

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