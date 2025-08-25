# ATTIO MCP SERVER INSTRUCTIONS [LLM-OPTIMIZED]

## STYLE & TOKEN BUDGET (for CLAUDE.md)

- Keep this file concise; it loads into every Claude Code session.
- Use `##`/`###` headings and short checklists.
- Use **bold** for must‑do rules only; avoid ALL‑CAPS sentences.
- Prefer lists/tables over prose; put commands in fenced code blocks.

## CORE PRINCIPLES

RULE: Documentation-first development | WHEN: Building any feature | DO: Check official docs (use Context 7, fallback: web search) → existing solutions → ONLY then custom | ELSE: Technical debt accumulation
RULE: Complexity audit required | WHEN: Encountering complex code | DO: Use mcp**clear-thought-server**mentalmodel First Principles | ELSE: Perpetuating unnecessary complexity
RULE: Avoid buggy paths | WHEN: Third-party bugs found | DO: mcp**clear-thought-server**decisionframework → find alternative | ELSE: Wasted time on workarounds

## BUILD & TEST GOTCHAS

⚠️ CRITICAL: DO NOT use `npm test -- test/integration/` as it uses wrong config. Use `npm run test:integration` or `npm run test:integration:only` instead.
NOTE: `npm run check` no longer runs tests (40% faster CI). Use `npm test` separately when needed.

## TEST DATA CLEANUP

RULE: Always cleanup test data | WHEN: After testing | DO: Use automated cleanup utilities | ELSE: Attio workspace pollution
`npm run cleanup:test-data` - Dry run preview (safe) | `npm run cleanup:test-data:live` - Live deletion
⚠️ CRITICAL: Use `--dry-run` first to preview deletions | Supports custom prefixes: `--prefix=TEST_,QA_,E2E_,DEMO_`

## TESTING REQUIREMENTS [ISSUE #480 ENHANCED]

RULE: Integration tests required | WHEN: API changes, universal tools, CRUD ops, error handling, new features | DO: `npm run test:integration` | ELSE: PR blocked
RULE: Pre-commit fast only | WHEN: Git commit | DO: Unit tests only | ELSE: Developer friction
RULE: Post-commit full suite | WHEN: PR created | DO: Full test suite in CI | ELSE: Potential production issues
RULE: Mock factory architecture | WHEN: Creating test mocks | DO: Use `/test/utils/mock-factories/` pattern | ELSE: Production-test coupling violations
RULE: Issue #480 compatibility | WHEN: Task mocks needed | DO: Include both content and title fields, preserve task_id | ELSE: E2E test failures
SUCCESS METRICS: E2E success rate >75% (29/38 tests passing) | Mock data validation 100% | Production safety verified

### PERFORMANCE TESTING

RULE: Environment-aware budgets | WHEN: Performance tests | DO: Auto CI multiplier (2.5x) | ELSE: CI failures
COMMANDS: `npm test test/performance/regression.test.ts` | `CI=true npm test test/performance/regression.test.ts`
FILES: `test/performance/regression.test.ts` (CI) | `test/handlers/tool-configs/universal/performance.test.ts` (benchmarking)

## DEBUG UTILITIES

RULE: Use debug scripts for targeted testing | WHEN: Developing/debugging | DO: Check `scripts/debug/README.md` | ELSE: Slower debugging cycles
KEY SCRIPTS: `debug-field-mapping.js` (field transforms), `debug-formatresult.js` (Issue #483 compliance), `debug-tools.js` (tool registration), `debug-tool-lookup.js` (dispatcher routing)
USAGE: `node scripts/debug/[script-name].js` (requires `npm run build` first)

## CODE STANDARDS [PR #483 ENHANCED]

RULE: Production-test separation | WHEN: Writing any code | DO: Use clean architecture patterns | ELSE: Production contamination violations
RULE: formatResult consistency | WHEN: Creating format functions | DO: Always return string, never environment-dependent | ELSE: Type safety violations  
RULE: Mock factory pattern | WHEN: Creating test data | DO: Use `/test/utils/mock-factories/` | ELSE: Production coupling violations
RULE: Progressive `any` reduction | WHEN: Writing TypeScript | DO: Use Record<string, unknown> over any | ELSE: Warning count increases
CURRENT: 395 warnings (improved from 957) | TARGET: <350 this sprint | GOAL: <200 in 3 months
RULE: Explicit error handling | WHEN: API calls | DO: Use `createErrorResult` | ELSE: Silent failures in production
RULE: Remove unused code | WHEN: Any unused import/variable | DO: Remove immediately | ELSE: Lint warnings accumulate
STYLE: PascalCase (classes/interfaces) | camelCase (functions/variables) | snake_case (files) | 2-space indentation
IMPORTS: Order as node → external → internal | Remove unused immediately

## AGENT AUTOMATION [Use `/agents` command]

**CORE RULE**: Use native Claude Code subagents for specialized tasks → Separate context windows → Parallel development

### SUBAGENT CREATION & USAGE

COMMAND: `/agents` → Create New Agent → Define role, tools, system prompt
INVOKE: "Use the [agent-name] subagent to [specific task]" or auto-delegation when appropriate
CONTEXT: Each subagent operates in separate context window for focused expertise

### RECOMMENDED AGENT PATTERNS

| **Role Type** | **Purpose**                | **Tools**                 | **Use When**     |
| ------------- | -------------------------- | ------------------------- | ---------------- |
| Architect     | Research, planning, design | File ops, system commands | Complex features |
| Builder       | Core implementation        | Full toolset              | Main development |
| Validator     | Testing, quality assurance | Testing frameworks        | QA, debugging    |
| Scribe        | Documentation, refinement  | Documentation tools       | Docs, examples   |

### ORCHESTRATION PRINCIPLES

RULE: Context separation | WHEN: Complex multi-file work | DO: Use separate subagents | ELSE: Context pollution
RULE: Parallel development | WHEN: Independent tasks | DO: Multi-terminal coordination | ELSE: Sequential bottlenecks
RULE: Shared coordination | WHEN: Multi-agent work | DO: Use planning documents | ELSE: Agent conflicts

### MULTI-TERMINAL COORDINATION

PATTERN: 4-agent parallel development (inspired by community best practices)
SETUP: Open VSCode with 4 terminals → Launch agents with specific roles → Shared planning document
COMMUNICATION: Agents coordinate via `MULTI_AGENT_PLAN.md` with task assignments and status updates
BENEFITS: 4x faster development, built-in quality checks, clear separation of concerns

**Best Practices**:

- Regular sync points: Agents check planning document every 30 minutes
- Clear boundaries: Define what each agent owns to avoid conflicts
- Version control: Include `MULTI_AGENT_PLAN.md` in commits
- Branch organization: Use agent-specific branches when appropriate

### TASK PARALLELIZATION GUIDE

**Safe to Parallelize**:

- `eslint`/`prettier` checks, test shards (`vitest -t` patterns), docs generation, read-only analysis
- Lint + type check: `npm run lint:check` and `npm run typecheck`
- Matrix tests: split by directories (`vitest -t api`, `-t handlers`)

**Never Parallelize**:

- Two writers modifying same modules/files
- Migrations changing shared configs/schemas/codegen

**Concurrency Guidelines**:

- Sweet spot: **4-6 concurrent tasks** for CI/laptop
- Beyond 6: prefer queueing or branch isolation
- Multiple writers: use short-lived feature branches per task
- Approved PR, minor cleanup → **code-refactoring-architect** → **code-review-specialist** (optional)

## ARCHITECTURE PATTERNS

### formatResult Pattern [MANDATORY]

RULE: String return consistency | WHEN: Any format function | DO: Always return string, never conditional | ELSE: Type safety violations
RULE: No environment coupling | WHEN: Production code | DO: Never check NODE_ENV for behavior | ELSE: Dual-mode anti-patterns
RULE: Error handling | WHEN: Format functions | DO: Implement try-catch blocks | ELSE: Unhandled errors

### Mock Factory Pattern [MANDATORY]

RULE: Test data isolation | WHEN: Creating test data | DO: Use `/test/utils/mock-factories/` pattern | ELSE: Production contamination
RULE: Issue #480 compatibility | WHEN: Task mocks | DO: Include both content and title, preserve task_id | ELSE: E2E failures

## ANY TYPE REDUCTION STRATEGY [PR #483 PROGRESS]

PRIORITY: 1) API responses (src/api/operations/_) 2) Error handling (src/errors/_) 3) Handler params (src/handlers/\*) 4) Universal tools 5) Tests
RULE: Progressive improvement | WHEN: Writing new code | DO: Use Record<string, unknown> not any | ELSE: Warning count increases
MILESTONES:

- ACHIEVED: 395 warnings (reduced from 957, 59% improvement) ✅
- Current Goal: 350 warnings (reduce by 45 more)
- Month 1: 300 warnings
- Month 2: 250 warnings
- Month 3: <200 warnings (updated target)
  STRATEGY: PR #483 proved high-impact refactoring works - focus on formatResult pattern success
  RECOMMENDED: Use `Record<string, unknown>` instead of `Record<string, any>` for better type safety
  COMMON PATTERNS:
- API responses: `Record<string, unknown>` or specific interface
- Format functions: Always return string (never conditional types)
- Configuration objects: Define specific interfaces
- Legacy integration: Gradually migrate `any` → `unknown` → specific types

## TESTING CONFIGURATION [PR #483 ARCHITECTURE]

RULE: Clean separation | WHEN: Writing tests | DO: Never import test code in src/ | ELSE: Production bundle contamination
RULE: Mock factory pattern | WHEN: Creating mock data | DO: Use `/test/utils/mock-factories/` architecture | ELSE: Production coupling violations
RULE: formatResult testing | WHEN: Testing format functions | DO: Verify string return type consistency | ELSE: Type safety regressions
RULE: Use Vitest | WHEN: Writing tests | DO: Import from 'vitest' not 'jest' | ELSE: Type errors
MOCKING: `vi.mock()` for modules | `vi.fn()` for functions | `vi.clearAllMocks()` in beforeEach
MOCK DATA: TaskMockFactory, CompanyMockFactory, PersonMockFactory, ListMockFactory | UniversalMockFactory for multi-resource
COMPATIBILITY: Issue #480 resolved - dual field support (content/title), preserve task_id, proper ID structures
INTEGRATION: Export ATTIO_API_KEY for real tests | 30s timeout | Auto cleanup | Skip with SKIP_INTEGRATION_TESTS=true
ENVIRONMENT: TestEnvironment.useMocks() for reliable detection | Multi-strategy environment validation
SUCCESS METRICS: Unit tests 100% (26/26) | E2E 76% (29/38) | Production readiness 97.15/100

## MCP SCHEMA CONSTRAINTS

RULE: No complex schemas at root | WHEN: Defining MCP tool schemas | DO: Avoid oneOf/allOf/anyOf at top level | ELSE: Connection error: "input_schema does not support oneOf, allOf, or anyOf"
RULE: Runtime validation only | WHEN: Either/or parameters needed | DO: Validate in handler code | ELSE: Schema rejection

## GITHUB WORKFLOW

RULE: PR target enforcement | WHEN: Creating any PR | DO: Target kesslerio/attio-mcp-server | ELSE: Wrong repository targeting
RULE: Never target hmk repo | WHEN: PR creation | DO: Verify target is kesslerio | ELSE: Upstream pollution
RULE: Never mention @hmk | WHEN: Creating issues/PRs/comments | DO: NEVER include "cc @hmk" or any @hmk mention | ELSE: Unwanted notifications
RULE: Config consistency | WHEN: Any config file | DO: Use kesslerio URLs only | ELSE: Fork misconfiguration

## GIT COMMIT PIPELINE [ENFORCED] ⚠️ CRITICAL

**PRE-COMMIT HOOK IS MANDATORY**: The git pre-commit hook at `build/hooks/pre-commit` MUST enforce this pipeline
RULE: All commits must pass validation | WHEN: Any git commit | DO: Pre-commit hook runs `npm run lint:check && npm run check:format && npm run build && npm run test:offline` | ELSE: Commit blocked at hook level
RULE: Pipeline stages mandatory | GATES: lint:check [BLOCK if errors], check:format [BLOCK if issues], build [BLOCK if fails], test:offline [BLOCK if fails]
RULE: Hook enforcement | WHEN: Any commit attempt | DO: Pre-commit hook validates ALL stages before allowing commit | ELSE: Lint issues reach CI (violates standards)
RULE: Bypass requires justification | WHEN: Using --no-verify | DO: Include "EMERGENCY: [issue-link] [justification]" in commit msg | ELSE: Rejection in code review
**🚨 NEVER BYPASS RULE**: NEVER use `--no-verify` to bypass pre-commit hooks except for genuine emergencies | WHEN: TypeScript/lint errors occur | DO: Fix the errors, not bypass the check | ELSE: CI FAILURE and broken builds

**CRITICAL**: If lint issues reach CI, it means the pre-commit hook is not working correctly. Check:

1. `ls -la .git/hooks/pre-commit` - Hook exists and is executable
2. `npm run setup-hooks` - Reinstall hooks if missing
3. Commit was made with `--no-verify` (emergency bypass)

COMMAND: `git add . && git commit -m "Type: Description #issue" && git push` (hook handles validation automatically)

## GIT WORKFLOW COMMANDS

BRANCH: `git checkout -b feature/issue-{number}-{description}` or `fix/issue-{number}-{description}`
COMMIT: Format as `Type: Description #issue-number` where Type = Feature|Fix|Docs|Refactor|Test|Chore
PR: `gh pr create -R kesslerio/attio-mcp-server -t "Type: Description" -b "Details"`
RULE: One feature per PR | WHEN: Creating PR | DO: Keep focused and small | ELSE: Review rejection
RULE: Docs update required | WHEN: Significant changes | DO: Run docs-architect agent | ELSE: Outdated documentation

## CI/CD PIPELINE [OPTIMIZED - 40% FASTER]

RULE: Efficient CI execution | WHEN: PR created | DO: Run optimized pipeline | ELSE: Wasted CI minutes
PIPELINE STAGES:

1. **Lint & Type Check**: ESLint (max 1030 warnings) + TypeScript validation
2. **Unit Tests**: Coverage tests only (no duplicate runs)
3. **Integration Tests**: On-demand with label or main branch
4. **Build Verification**: Ensure artifacts created correctly
5. **Security Audit**: Dependency vulnerability scanning

## MOCK FACTORY PATTERN [MANDATORY]

RULE: Test data isolation | WHEN: Creating test data | DO: Use `/test/utils/mock-factories/` pattern | ELSE: Production contamination
RULE: Issue #480 compatibility | WHEN: Task mocks | DO: Include both content and title, preserve task_id | ELSE: E2E failures
RULE: Production isolation | WHEN: Writing production code | DO: NEVER import from test directories | ELSE: Bundle contamination

See `/test/utils/mock-factories/` for implementation patterns and `TaskMockFactory` for Issue #480 compatibility example.

## RELEASE PROCESS

RULE: Use automated release | WHEN: Creating release | DO: Run `./scripts/release.sh` | ELSE: Manual error-prone process
MANUAL FALLBACK: `npm version` → `npm run build` → `npm test` → commit → tag → `gh release create` → `npm publish`
CHANGELOG: Follow Keep a Changelog format | Move Unreleased → versioned | Include: Added/Changed/Deprecated/Removed/Fixed/Security

## ISSUE WORKFLOW [MANDATORY CHECKLIST]

RULE: Branch per issue | WHEN: Starting issue work | DO: Follow checklist | ELSE: Merge conflicts and lost work
CHECKLIST:

1. `git branch --show-current` - Verify location
2. `git checkout main` - Start from main
3. `git pull origin main` - Get latest
4. `git checkout -b feature/issue-{num}-{desc}` - Create issue branch
5. `git status` - Verify clean state
6. [Do work]
7. `git commit -m "Type: Description #issue-num"` - Reference issue
8. `git push -u origin HEAD` - Push branch
9. `gh pr create -R kesslerio/attio-mcp-server` - Create PR

## ISSUE CREATION

RULE: Create before coding | WHEN: Starting new work | DO: Create issue first | ELSE: Lack of tracking
RULE: No @hmk mentions | WHEN: Issue/PR body or comments | DO: NEVER write "cc @hmk" or mention @hmk | ELSE: Unwanted notifications - CRITICAL VIOLATION
SEARCH FIRST: `gh issue list --repo kesslerio/attio-mcp-server --search "keyword"`
CREATE: `gh issue create --title "Type: Description" --body "Details" --label "P2,type:bug,area:core"`
RULE: Use Clear Thought | WHEN: Complex problems | DO: mcp**clear-thought-server**mentalmodel | ELSE: Incomplete analysis
REFACTORING: Follow @docs/refactoring-guidelines.md template

1. **Required Labels**:
   - Priority: P0(Critical), P1(High), P2(Medium), P3(Low), P4/P5(Trivial)
   - Type: bug, feature, enhancement, documentation, test
   - Status (Required): status:blocked, status:in-progress, status:ready, status:review, status:needs-info, status:untriaged
   - Area: area:core, area:api, area:build, area:dist, area:documentation, area:testing, area:performance, area:refactor, area:api:people, area:api:lists, area:api:notes, area:api:objects, area:api:records, area:api:tasks, area:extension, area:integration, area:security, area:rate-limiting, area:error-handling, area:logging

2. **Branch Strategy**
   - NEVER work directly on main (except critical hotfixes).
   - ALWAYS create a new branch before starting ANY work on GitHub issues.
   - MANDATORY: Check current branch with `git branch --show-current` BEFORE starting work.
   - If not on a clean feature branch, IMMEDIATELY create one: `git checkout -b feature/issue-{issue-number}-{short-description}` or `git checkout -b fix/issue-{issue-number}-{short-description}`.
   - Branch naming convention: `feature/issue-319-test-cleanup`, `fix/issue-123-domain-utils`, `docs/issue-456-api-guide`.
   - NEVER continue work on unrelated branches unless explicitly approved.
   - Use Clear Thought tools for planning (e.g., `mcp__clear-thought-server__mentalmodel` for analysis, `mcp__clear-thought-server__decisionframework` for architectural choices).

3. **Commit Message Format**
   - Prefixes: Feature:, Fix:, Docs:, Refactor:, Test:, Chore:
   - Include issue references: #123. [HOTFIX] for hotfixes.

4. **Pull Requests**
   - Get approval before pushing to upstream.
   - Reference issues: Closes #XX or Relates to #XX.
   - Include testing details. Wait for review. Use squash merging.

5. **Issue Closure Requirements**
   - Verify acceptance criteria.
   - Add implementation comment (details, lessons, challenges, future considerations).
   - Verification statement: "✅ VERIFICATION: All GitHub documentation requirements completed."

## DOCUMENTATION SEARCH WORKFLOW (ALWAYS FOLLOW THIS ORDER)

⚠️ CRITICAL: Documentation Search Priority
NEVER use web search as the first option. ALWAYS follow this sequence:

1. **PRIMARY: Get Library Documentation Using Context 7**
   - FIRST: Resolve library name to Context7-compatible ID: `mcp4_resolve-library-id(libraryName="library-name")`
   - THEN: Get documentation: `mcp4_get-library-docs(context7CompatibleLibraryID="/org/project", topic="specific-topic", tokens=10000)`
   - Examples:
     - `mcp4_resolve-library-id(libraryName="Attio API")` → `mcp4_get-library-docs(context7CompatibleLibraryID="/attio/docs", topic="authentication")`
     - `mcp4_resolve-library-id(libraryName="GitHub API")` → `mcp4_get-library-docs(context7CompatibleLibraryID="/github/rest-api", topic="webhooks")`
     - `mcp4_resolve-library-id(libraryName="vitest")` → `mcp4_get-library-docs(context7CompatibleLibraryID="/vitest/guide", topic="testing")`
     - `mcp4_resolve-library-id(libraryName="Node.js")` → `mcp4_get-library-docs(context7CompatibleLibraryID="/nodejs/docs")`

2. **SECONDARY: Direct Library ID Usage (If Known)**
   - If you already know the exact Context7-compatible library ID, use it directly:
   - `mcp4_get-library-docs(context7CompatibleLibraryID="/mongodb/docs", topic="authentication")`
   - `mcp4_get-library-docs(context7CompatibleLibraryID="/vercel/next.js", topic="routing")`
   - Common patterns: `/org/project` or `/org/project/version`

3. **TERTIARY: Web Search (Last Resort)**
   - Only use web search tools if Context 7 doesn't have the library documentation
   - Use for real-time information, recent updates, or community discussions
   - Focus on official documentation sites and authoritative sources

**Available Sources**: Attio API, GitHub API, Vitest, Node.js, TypeScript, React, Next.js, MongoDB, and many others

CLEAR THOUGHT MCP INTEGRATION

RULE: Use systematic problem-solving | WHEN: Complex problems | DO: See @docs/tools/clear-thought-tools.md for comprehensive tool reference | ELSE: Incomplete analysis

EXTERNAL MCP SERVERS (Runtime Dependencies)

- Note: External services, not npm dependencies.
- Namespace `mcp4_`:
  - Server: Context 7 MCP Server (https://github.com/upstash/context7)
  - Purpose: Up-to-date library and framework documentation retrieval.
  - Tools: resolve-library-id(libraryName), get-library-docs(context7CompatibleLibraryID, topic?, tokens?)
  - Setup: Install with `npx -y @upstash/context7-mcp` or configure in MCP client.
  - Features: Official documentation, code examples, topic filtering, intelligent project ranking.
