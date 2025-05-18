IMPORTANT ATTRIBUTION RULES
- NEVER include "Generated with Claude Code" or similar messages in any code, commits, or PRs
- NEVER add "Co-Authored-By: Claude" or other AI assistant attributions to commits
- ALL work should appear as if done directly by the human developer
- Remove ALL AI assistant signatures from any generated text
- NO automated footers, signatures, or attribution messages of any kind

BUILD/TEST COMMANDS
- Build: `npm run build`
- Watch mode: `npm run build:watch`
- Type check: `npm run check`
- Clean build: `npm run clean`
- Run tests: `npm test`
- Run single test: `npm test -- -t "test name pattern"`

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
  * Use Jest for TypeScript tests (*.test.ts)
  * Manual test scripts should be named with `-test.js` suffix
  * Test files should mirror the structure of the source code they test
- Integration Tests:
  * Set up API key: export ATTIO_API_KEY=your_key_here
  * Run integration tests: npm test -- integration/real-api-integration.test.ts
  * Tests use real API calls with 30s timeout
  * Tests clean up test data automatically
  * Skip tests if no API key: SKIP_INTEGRATION_TESTS=true

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
   - Keep each PR centered around a specific enhancement
2. Keep PRs small and focused
   - Smaller PRs are easier to review and more likely to be merged
3. Use meaningful commit messages
   - Format: `Feature:`, `Fix:`, `Docs:`, `Refactor:`, etc. followed by a clear description
4. Only include relevant files
   - Don't include unrelated changes, .env files, or personal configuration files
   - Avoid modifying .gitignore unless specifically necessary
5. Test thoroughly before submitting
   - Make sure your changes work with the current upstream code
6. Update documentation
   - Add or update documentation to reflect your changes
7. For refactoring work
   - Follow guidelines in @docs/refactoring-guidelines.md
   - Use checklists in issues to track progress
   - Reference related commits in PR descriptions

Troubleshooting:
git rm --cached <path> && git commit --amend && git push -f origin <branch>
git fetch upstream && git rebase upstream/main && git push -f origin <branch>

ISSUE MANAGEMENT
1. Issue Creation
- Create issues before starting work
- Use descriptive titles: type: Description (clear, concise)
- Search first: gh issue list --repo kesslerio/attio-mcp-server --search "keyword" to avoid duplication
- For refactoring issues: Follow template in @docs/refactoring-guidelines.md using checklists

Required Labels:
- Priority Labels:
  * P0 - Critical (service down, security issue)
  * P1 - High (blocking functionality)
  * P2 - Medium (important but not blocking)
  * P3 - Low (minor improvements)
  * P4/P5 - Trivial (cosmetic, nice-to-have)

- Type Labels:
  * bug - Incorrect functionality
  * feature - New capability
  * enhancement - Improvement to existing feature
  * documentation - Documentation updates
  * test - Test improvements

- Status Labels: (Required)
  * status:blocked - Work cannot proceed due to dependencies or blockers
  * status:in-progress - Work is currently being actively worked on
  * status:ready - Ready for implementation or review
  * status:review - Ready for or currently under review
  * status:needs-info - Requires additional information to proceed
  * status:untriaged - Not yet assessed or categorized

- Area Labels:
  * Module: area:core, area:api, area:build, area:dist
  * Content: area:documentation, area:testing, area:performance, area:refactor
  * API-specific: area:api:people, area:api:lists, area:api:notes, area:api:objects, area:api:records, area:api:tasks
  * Functional: area:extension, area:integration, area:security, area:rate-limiting, area:error-handling, area:logging

2. Branch Strategy
- NEVER work directly on main except for critical hotfixes
- Create feature branches: git checkout -b feature/your-feature-name
- Use consistent prefixes: feature/, fix/, docs/, etc.

3. Commit Message Format
- ALWAYS start commit messages with one of these exact prefixes:
  Feature: <description>     # New functionality
  Fix: <description>         # Bug fixes
  Docs: <description>        # Documentation changes
  Refactor: <description>    # Code restructuring
  Test: <description>        # Test additions/modifications
  Chore: <description>       # Routine maintenance tasks
- Include issue references when applicable: #123
- For hotfixes, include [HOTFIX] in the commit message
- Case is important: use exactly as shown above

4. Pull Requests
- ALWAYS get explicit approval from repository owner before committing or pushing to git upstream
- Reference issues with Closes #XX or Relates to #XX
- Include complete testing details
- Wait for review approval before merging
- Use squash merging when possible

5. Issue Closure Requirements
When closing issues, always include:
- All acceptance criteria checked off
- Implementation comment with:
  - Implementation details
  - Key elements (3+ points)
  - Lessons learned (3+ insights)
  - Challenges/solutions
  - Future considerations
- Verification statement: "✅ VERIFICATION: I have completed all GitHub documentation requirements including: [list requirements]"

AVAILABLE DOCUMENTATION SOURCES
Indexed: docs.cognee.ai (Cognee.ai official documentation)
Indexed: docs.falkordb.com (FalkorDB graph database documentation)
Indexed: modelcontextprotocol.io (MCP protocol documentation)
Indexed: github.com (MCP Python SDK, Brave Search, Tavily MCP)
Indexed: yourls.org (YOURLS URL shortener documentation)
Indexed: docs.attio.com (Attio's official API documentation)
Namespace mcp__crawl4ai-rag__:
- get_available_sources()
- crawl_single_page(url)
- smart_crawl_url(url)
- perform_rag_query(q, source?, match_count?)
Examples:
perform_rag_query("authentication bearer token","docs.attio.com")
perform_rag_query("webhooks configuration",null,10)