# ATTIO MCP SERVER INSTRUCTIONS [LLM-OPTIMIZED]

```
## STYLE & TOKEN BUDGET (for CLAUDE.md)
- Keep this file concise; it loads into every Claude Code session.
- Use `##`/`###` headings and short checklists.
- Use **bold** for must‑do rules only; avoid ALL‑CAPS sentences.
- Prefer lists/tables over prose; put commands in fenced code blocks.
```

## CORE PRINCIPLES

RULE: Documentation-first development | WHEN: Building any feature | DO: Check official docs → existing solutions → ONLY then custom | ELSE: Technical debt accumulation
RULE: Complexity audit required | WHEN: Encountering complex code | DO: Use mcp**clear-thought-server**mentalmodel First Principles | ELSE: Perpetuating unnecessary complexity
RULE: Avoid buggy paths | WHEN: Third-party bugs found | DO: mcp**clear-thought-server**decisionframework → find alternative | ELSE: Wasted time on workarounds

## BUILD & TEST COMMANDS [UPDATED CI/CD]

`npm run build` - TypeScript compilation | `npm run build:watch` - Watch mode
`npm run typecheck` - Type checking only (fast) | `npm run typecheck:watch` - Watch mode
`npm run check` - Validation suite (lint, format, typecheck) | `npm run clean` - Clean build artifacts
`npm test` - Run all tests | `npm run test:offline` - Unit tests only (no API)
`npm run test:integration` - Real API tests | `npm test -- -t "pattern"` - Single test
`npm test <filepath>` - Specific file | `npm test -- --coverage` - With coverage

NOTE: `npm run check` no longer runs tests (40% faster CI). Use `npm test` separately when needed.

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

## AUTO-APPROVED OPERATIONS

Testing: `npm test*` all variations | Building: `npm run build*` all variations
Inspection: `grep`, `find`, `sed`, `head`, `tail`, `cat` | Git read-only: `git status`, `git diff`, `git log`
MCP tools: Read, Glob, Grep, LS | Scripts: `./scripts/review-pr.sh`

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

## AGENT AUTOMATION [Use Task tool]

**CORE RULE**: Auto-delegate work when user intent matches patterns → Launch specialist agent → Chain to completion

### TRIGGER MATRIX [P0=Critical, P1=Required, P2=Recommended]

| **Intent Pattern**      | **Primary Agent**              | **Chain**                        | **Priority** |
| ----------------------- | ------------------------------ | -------------------------------- | ------------ |
| implement/build/feature | project-delegator-orchestrator | → docs-architect                 | P0           |
| fix/debug/error/crash   | debug-specialist               | → test-coverage-specialist       | P0           |
| refactor/clean up       | code-refactoring-architect     | → code-review-specialist         | P0           |
| review my code          | code-review-specialist         | → test-coverage-specialist       | P1           |
| organize/plan tasks     | issue-plan-author              | → project-delegator-orchestrator | P2           |

| **Auto-Trigger Condition**             | **Agent**                      | **Priority** |
| -------------------------------------- | ------------------------------ | ------------ |
| File >500 lines                        | code-refactoring-architect     | P0           |
| Function >30 lines                     | code-refactoring-architect     | P1           |
| Error/test failure                     | debug-specialist               | P0           |
| Before commit/PR                       | code-review-specialist         | P1           |
| Security keywords (auth/token/API-key) | security-vulnerability-scanner | P0           |
| After code changes                     | docs-architect                 | P1           |
| `any` types found                      | code-refactoring-architect     | P2           |
| Performance degradation                | performance-engineer           | P1           |

### AGENT ORCHESTRATION

**Default Posture**: Single Claude Code session. Spawn sub-agents only when improving quality/speed.

**Spawn Conditions** (any apply):

- Cross-domain work in one PR (refactor + typing + tests)
- Touches >3 files or >100 LOC
- Long-running/shardable work (tests/linters/docs)
- Strict context separation needed (implementer vs. reviewer)

**Constraints**:

- Max **2 active sub-agents** per PR (burst to 3-4 for independent work on disjoint files)
- Preferred sequence: **code-refactoring-architect → test-coverage-specialist → code-review-specialist**
- Call **debug-specialist** only on CI/test failures
- **Never rename agent IDs** - use exact names from this file

**Output Standards**:

- Scope: current diff + nearest context (no repo-wide rewrites)
- Deliver: concise notes + exact diffs + one commit message per agent

### PARALLELIZATION GUIDE [Task Tool]

**Safe to Parallelize**:

- `eslint`/`prettier` checks, test shards (`vitest -t` patterns), docs generation, read-only analysis
- Lint + type check: `npm run lint:check` and `npm run typecheck`
- Matrix tests: split by directories (`vitest -t api`, `-t handlers`)

**Never Parallelize**:

- Two writers modifying same modules/files
- Migrations changing shared configs/schemas/codegen

**Concurrency Best Practices**:

- Request explicitly: _"Use Task tool, run independent jobs in parallel (max 4 concurrent)"_
- Sweet spot: **4-6 concurrent tasks** for CI/laptop
- Beyond 6: prefer queueing or branch isolation
- Multiple writers: use short-lived feature branches per task

## AGENT CATALOG

### Planning & Orchestration

- **project-delegator-orchestrator** [P0] → Multi-step tasks, complex changes → All specialists → docs-architect
- **issue-plan-author** [P2] → Feature specs, structured bug reports → project-delegator-orchestrator
- **backlog-triage-specialist** [P2] → Raw reports, duplicates, priorities → issue-plan-author

### Implementation & Refactoring

- **code-refactoring-architect** [P0] → Files >500 lines, functions >30 lines, `any` types, SRP violations → code-review-specialist → test-coverage-specialist
- **api-design-architect** [P1] → New endpoints, API changes, MCP tools, service boundaries → code-review-specialist → docs-architect
- **ui-implementation-specialist** [P2] → UI components, responsive design, accessibility → code-review-specialist → test-coverage-specialist
- **architecture-optimizer** [P2] → Build issues, duplication, tight coupling → code-refactoring-architect

### Validation & Quality

- **code-review-specialist** [P1] → Pre-commit, critical paths, API handlers → test-coverage-specialist → security-vulnerability-scanner
- **test-coverage-specialist** [P1] → New features, <80% coverage, integration tests → debug-specialist (if failures)
- **debug-specialist** [P0] → Errors, test failures, regressions → test-coverage-specialist → docs-architect
- **security-vulnerability-scanner** [P0] → Pre-release, dependency updates, auth/token code → AUTO-INVOKE
- **performance-engineer** [P1] → Hot paths, bottlenecks, optimization needs → code-review-specialist → test-coverage-specialist

### Documentation

- **docs-architect** [P1] → ALWAYS after code changes → None (final step)

## WORKFLOW PATTERNS

**Standard Chains**:

1. **Feature**: project-delegator → implementation → review → test → docs
2. **Debug**: debug-specialist → test-coverage → code-review → docs
3. **Refactor**: code-refactoring → code-review → test-coverage → docs
4. **TypeScript**: code-refactoring (any-types) → code-review → test → docs

**Exit Criteria** (diff-scoped):

- **code-refactoring-architect** → minimal diff, no behavior change, compiles
- **test-coverage-specialist** → lints clean; tests pass or smallest viable test updates applied
- **code-review-specialist** → checklist satisfied; zero new issues

### DECISION CHEATSHEET (no renames)

- Only constants/type hints/init → **code-refactoring-architect** → **test-coverage-specialist**
- Tests fail → **debug-specialist** → **test-coverage-specialist**
- Approved PR, minor cleanup → **code-refactoring-architect** → **code-review-specialist** (optional)

````

## ARCHITECTURE PATTERNS [PR #483 SUCCESS]

### formatResult Pattern [MANDATORY]
RULE: String return consistency | WHEN: Any format function | DO: Always return string, never conditional | ELSE: Type safety violations
RULE: No environment coupling | WHEN: Production code | DO: Never check NODE_ENV for behavior | ELSE: Dual-mode anti-patterns
TEMPLATE:
```typescript
// ✅ CORRECT: Consistent string return
function formatSearchResults(records: AttioRecord[]): string {
  return records.map((r, i) => `${i + 1}. ${r.values?.name?.[0]?.value || 'Unknown'}`).join('\n');
}

// ❌ WRONG: Environment-dependent behavior  
function formatResult(data: any): string | object {
  if (process.env.NODE_ENV === 'test') return data;
  return formatString(data);
}
```

### Mock Factory Pattern [MANDATORY]
RULE: Test data isolation | WHEN: Creating test data | DO: Use mock factories only in test/ | ELSE: Production contamination
RULE: Issue #480 compatibility | WHEN: Task mocks | DO: Include both content and title, preserve task_id | ELSE: E2E failures
TEMPLATE:
```typescript
// test/utils/mock-factories/TaskMockFactory.ts
export class TaskMockFactory {
  static create(overrides = {}): AttioTask {
    const content = overrides.content || overrides.title || 'Mock Task';
    return {
      id: { record_id: generateId(), task_id: generateId() },
      content,
      title: content,  // Issue #480 compatibility
      ...overrides
    };
  }
}
```

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

PERFORMANCE IMPROVEMENTS (Issue #429):

- Eliminated duplicate test execution (40% time savings)
- Separated typecheck from full check command
- Progressive ESLint warning reduction (1030 → 927 → 500)
- Pre-commit runs fast checks only (lint, format, build, test:offline)
- Full test suite runs in CI only (not blocking local development)

E2E TEST IMPROVEMENTS (Issue #480):

- Mock factory architecture: Clean separation of test and production concerns
- Success rate: 76% E2E tests passing (29/38) with architectural compliance
- Compatibility layer: Dual field support for legacy and new test patterns
- Environment detection: Multi-strategy test environment validation
- Production safety: Zero test code contamination in production bundles

## ISSUE #480 ARCHITECTURAL COMPLIANCE [CRITICAL PATTERNS]

### Mock Factory Architecture Requirements

RULE: Clean separation principle | WHEN: Creating test mocks | DO: Use `/test/utils/mock-factories/` pattern | ELSE: Architectural violation
RULE: Production isolation | WHEN: Writing production code | DO: NEVER import from test directories | ELSE: Bundle contamination
RULE: Interface compliance | WHEN: Creating mock factories | DO: Implement `MockFactory<T>` interface | ELSE: Inconsistent patterns

### Issue #480 Compatibility Pattern

PROBLEM: E2E tests expect different field structures than production API responses
SOLUTION: Dual field support in mock factories for backward compatibility
IMPLEMENTATION:

```typescript
// Issue #480 compatible task mock
static create(overrides = {}) {
  const content = overrides.content || overrides.title || 'Mock Task Content';
  return {
    id: {
      record_id: this.generateMockId(),
      task_id: this.generateMockId()     // Issue #480: Required field
    },
    content,                             // Primary API field
    title: content                       // Issue #480: Compatibility field
  };
}
````

### Environment Detection Standards

RULE: Multi-strategy detection | WHEN: Detecting test environment | DO: Use TestEnvironment.useMocks() | ELSE: Unreliable detection
STRATEGIES: NODE_ENV check → VITEST flag → Global detection → Process args → Stack analysis
FALLBACK: Graceful degradation to production behavior when detection fails
VALIDATION: Pre-test health checks ensure proper environment setup

### Production Safety Guidelines

RULE: Dynamic imports only | WHEN: Production code needs test support | DO: Use dynamic import() for test utilities | ELSE: Production bundle pollution
RULE: Error boundaries | WHEN: Mock injection fails | DO: Graceful fallback to real implementation | ELSE: Production system failure
RULE: Zero runtime impact | WHEN: Test code integrated | DO: Ensure zero performance impact in production | ELSE: Performance degradation

### Compatibility Field Implementation Rules

WHEN: API field structure changes (similar to Issue #480)
DO:

1. Maintain backward compatibility with dual field support
2. Document field mapping in mock factory comments
3. Add validation tests for both field formats
4. Implement gradual migration path
   ELSE: Breaking changes cause widespread E2E test failures

### Testing Infrastructure Extensions

RULE: Consistent factory pattern | WHEN: Adding new resource mocks | DO: Follow TaskMockFactory pattern | ELSE: Inconsistent architecture
TEMPLATE:

1. Create factory class implementing MockFactory<T>
2. Add to UniversalMockFactory switch statement
3. Include specialized creation methods for common scenarios
4. Add validation tests for mock data structure
5. Document compatibility requirements

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
     - `mcp_crawl4ai-rag_perform_rag_query(query="bearer token authentication", source="docs.attio.com")`
     - `mcp_crawl4ai-rag_perform_rag_query(query="MCP protocol schema validation", source="modelcontextprotocol.io")`
     - `mcp_crawl4ai-rag_perform_rag_query(query="webhook configuration", match_count=8)`

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
  - Performance Issues: `mcp__clear-thought-server__programmingparadigm` + `mcp__clear-thought-server__debuggingapproach`.
  - New Features: `mcp__clear-thought-server__mentalmodel` + `mcp__clear-thought-server__designpattern`.
  - Integration Problems: `mcp__clear-thought-server__debuggingapproach` + `mcp__clear-thought-server__designpattern`.
  - Refactoring: `mcp__clear-thought-server__mentalmodel` (e.g., Opportunity Cost) + `mcp__clear-thought-server__programmingparadigm`.

- Enhanced Testing with Clear Thought:
  1. Pre-Test Analysis: `mcp__clear-thought-server__mentalmodel` (e.g., Error Propagation).
  2. Test Strategy: `mcp__clear-thought-server__debuggingapproach` (e.g., Program Slicing).
  3. Failure Analysis: `mcp__clear-thought-server__sequentialthinking`.

EXTERNAL MCP SERVERS (Runtime Dependencies)

- Note: External services, not npm dependencies.
- Namespace `mcp__crawl4ai-rag__`:
  - Server: Crawl4AI RAG MCP Server (https://github.com/coleam00/mcp-crawl4ai-rag)
  - Purpose: Web crawling and RAG.
  - Tools: get_available_sources(), crawl_single_page(url), smart_crawl_url(url), perform_rag_query(q, source?, match_count?)
  - Setup: Install external server, configure in MCP client.
