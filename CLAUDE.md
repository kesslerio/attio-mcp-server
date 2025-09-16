# CLAUDE.md — Attio MCP Server (Shared for Claude Code & Codex CLI)

## STYLE & TOKEN BUDGET

- Keep this file concise; it loads into every Claude Code / Codex CLI session.
- Use `##`/`###` headings and short checklists.
- Use **bold** for must‑do rules only; avoid ALL‑CAPS sentences.
- Prefer lists/tables over prose; put commands in fenced code blocks.
- Use `rg` (not `grep`), `fd` (not `find`); `tree` is installed.

## TL;DR / Quick Start

- **Pre‑commit must pass**: lint → format → build → `test:offline` → TS check (tests). No `--no-verify` unless justified.
- **Run the right tests**: see the Test Matrix below (unit, integration, e2e, smoke, performance, affected, offline, ci-json).
- **Logging**: structured `logger.*` only in `src/`; include `toolName,userId,requestId`; **no secrets/PII**.
- **`formatResult`**: returns **string**; no env branching; wrap in `try/catch` + `createErrorResult`.
- **Mocks**: use `/test/utils/mock-factories/`; for tasks (Issue #480) include `content` + `title`, preserve `task_id`.
- **Schema**: avoid top‑level `oneOf/allOf/anyOf`; validate either/or in code.
- **Attio tests**: real API tests require `ATTIO_API_KEY`.

## Precedence & Compatibility (with System‑Wide CLAUDE.md)

- **This repo doc overrides** system rules when they conflict.
- Overrides here: commit format (`Type: Description #issue`), research funnel, platform scope (this file is **shared**; deep platform notes live in system docs).

## CORE PRINCIPLES

RULE: Documentation-first development | WHEN: Building any feature | DO: Check official docs (use Context 7, fallback: web search) → existing solutions → ONLY then custom | ELSE: Technical debt accumulation
RULE: Complexity audit required | WHEN: Encountering complex code | DO: Use Clear Thought MCP (`clear_thought` → e.g., `mental_model`) after introspecting tool names | ELSE: Unnecessary complexity
RULE: Avoid buggy paths | WHEN: Third-party bugs found | DO: Use Clear Thought `decision_framework` to choose alternatives | ELSE: Wasted time on workarounds

## PR SIZE TARGETS

- **Aim for medium or large**: keep changes within 150–799 LOC and 6–20 files whenever possible.
- Split work if a branch drifts past ~400 LOC or touches more than ~10 files; reviewers stay effective in the M/L range.
- Avoid XXL (>1500 LOC or 41+ files) unless absolutely necessary.

## Quality Gates — Pre‑commit & CI Thresholds

**PRE-COMMIT HOOK IS MANDATORY**: The git pre-commit hook at `build/hooks/pre-commit` MUST enforce this pipeline
RULE: All commits must pass validation | WHEN: Any git commit | DO: Pre-commit hook runs `npm run lint:check && npm run check:format && npm run build && npm run test:offline && npx tsc --noEmit --skipLibCheck test/**/*.ts` | ELSE: Commit blocked at hook level
RULE: Pipeline stages mandatory | GATES: lint:check [BLOCK if errors], check:format [BLOCK if issues], build [BLOCK if fails], test:offline [BLOCK if fails], test:typecheck [BLOCK if TS errors in tests]
RULE: Bypass requires justification | WHEN: Using --no-verify | DO: Include "EMERGENCY: [issue-link] [justification]" in commit msg | ELSE: Rejection in code review
**🚨 NEVER BYPASS RULE**: NEVER use `--no-verify` to bypass pre-commit hooks except for genuine emergencies | WHEN: TypeScript/lint errors occur | DO: Fix the errors, not bypass the check | ELSE: CI FAILURE and broken builds

**CI threshold**: ESLint warnings ≤ **1030** (block PRs if exceeded).

## Test Matrix & Commands

RULE: Use the right scope for the task.

| **Type** | **Command** | **Notes** |
|---|---|---|
| Unit | `npm test` | Fast, offline with mocks |
| Integration | `npm run test:integration` | Real Attio API (`ATTIO_API_KEY`) |
| E2E | `npm run test:e2e` | End‑to‑end workflows |
| Smoke | `npm run test:smoke` | <30s critical paths |
| Performance | `npm run test:performance` / `:all` / `:tools` | CI budgets auto‑adjust |
| Affected | `npm run test:affected` | Git‑based selection |
| Offline | `npm run test:offline` | No API calls |
| CI JSON | `npm run test:ci -- --reporter=json > vitest-report.json \|\| true` | For quality gates |

### CI vs OFFLINE TESTING (scope)

- **`test:offline`**: Validates code logic correctness (10s timeout, mocks only, excludes E2E/integration)
- **`test:ci`**: Validates production readiness (30s timeout, real APIs, E2E workflows, JSON output for quality gates)
- **Key insight**: Code can pass offline but fail in production due to API changes, performance regressions, E2E workflow breaks

### PERFORMANCE TESTING (commands)

- `npm run test:performance` - Regression tests only
- `npm run test:performance:all` - All performance tests (regression + tools)
- `npm run test:performance:tools` - Tool-specific performance tests

## Logging & `formatResult` (PR #483 enforcement)

RULE: `formatResult` consistency | WHEN: Creating format functions | DO: Always return **string**, never environment‑dependent | ELSE: Type safety violations
RULE: No environment coupling | WHEN: Production code | DO: Never check NODE_ENV for behavior | ELSE: Dual-mode anti-patterns
RULE: Error handling | WHEN: Format functions | DO: Implement try-catch blocks + `createErrorResult` | ELSE: Unhandled errors
RULE: Structured logging in `src/` | WHEN: Logging | DO: `logger.info/debug/warn/error` with `toolName,userId,requestId`; **no secrets/PII** | ELSE: noisy/unsafe logs
ALLOW: `console.*` in `tests/`, `scripts/` only.

## Mock Factory (Issue #480)

RULE: Test data isolation | WHEN: Creating test data | DO: Use `/test/utils/mock-factories/` | ELSE: Production contamination
RULE: Task mocks | WHEN: Tasks | DO: Include `content` + `title`, preserve `task_id` | ELSE: E2E failures
RULE: Clean separation | WHEN: Writing tests | DO: Never import test code in src/ | ELSE: Production bundle contamination
MOCKING: `vi.mock()` for modules | `vi.fn()` for functions | `vi.clearAllMocks()` in beforeEach
MOCK DATA: TaskMockFactory, CompanyMockFactory, PersonMockFactory, ListMockFactory | UniversalMockFactory for multi-resource

## MCP Schema Constraints (Project Policy)

Avoid top‑level `oneOf`/`allOf`/`anyOf` in tool `inputSchema` due to client/Inspector limitations. Validate "either/or" in handlers.

## E2E Diagnostics (#545 & #568)

**Use after failures for deep‑dive debugging; not during passing cycles.**

- `npm run e2e:diagnose` — Enhanced test runner with standardized env
- `npm run e2e:diagnose:core` — Core‑workflows focus
- `npm run e2e:analyze` — Enhanced analysis with anomaly detection
- `npm run e2e:analyze:trends` — 14‑day trend analysis
- `npm run e2e:analyze -- --latest --stdout` — Latest only
- `npm run e2e:analyze -- --basic --stdout` — Simple mode
- `npm run e2e:health` — Env health (0–100), `--fix` to attempt auto‑fix

**Quick path**
```bash
./scripts/e2e-diagnostics.sh --suite core-workflows --json --verbose
npm run e2e:analyze -- --latest --stdout
```

**Manual fallback** (no bail, capture logs)
```bash
TASKS_DEBUG=true MCP_LOG_LEVEL=DEBUG LOG_FORMAT=json E2E_MODE=true USE_MOCK_DATA=false \
  npx vitest run test/e2e/suites/core-workflows.e2e.test.ts --reporter=verbose --reporter=json --bail=0 \
  |& tee test-results/e2e-console.core-workflows.realapi.full.log
```

Grep examples (when needed)
```bash
rg -n "tasks\.createTask|tasks\.updateTask|Prepared (create|update) payload|response shape|assignees|referenced*actor" \
  test-results/e2e-*-$(date +%Y%m%d)_*.log
```

### Policy: E2E ≠ Mocks

- E2E runs always use the real Attio API. Mock injection is disabled by default in E2E.
- Use `npm run test:offline` for mock‑only smoke/iteration. Don't mix mocks into E2E.

## TEST DATA CLEANUP

RULE: Always use API token filtering | WHEN: Cleaning test data | DO: Use WORKSPACE_API_UUID | ELSE: Risk deleting other users' data
RULE: Verify before deletion | WHEN: Running cleanup | DO: Always dry-run first | ELSE: Accidental data loss

`npm run cleanup:test-data` - Dry run preview (safe) | `npm run cleanup:test-data:live` - Live deletion
⚠️ CRITICAL: Set `WORKSPACE_API_UUID` in .env | Only deletes MCP server data via API token filtering

## CI/CD (Quality Gates & Pipeline)

RULE: Local CI validation | WHEN: Before pushing | DO: `npm run ci:local` | ELSE: CI failures after push
RULE: Auto-fix issues | WHEN: Lint/format errors | DO: `npm run fix:all` | ELSE: Manual fixes take longer

KEY COMMANDS:
- `ci:local`: Simulate GitHub Actions locally (40% faster than remote)
- `fix:all`: Auto-fix formatting, lint, imports (saves 5-10 min/day)
- `perf:budgets`: Check performance against thresholds
- `report:generate`: Development metrics dashboard
- `emergency:rollback`: Quick recovery from bad commits

PIPELINE STAGES:
1. **Lint & Type Check**: ESLint (max 1030 warnings) + TypeScript validation
2. **Unit Tests**: Coverage tests only (no duplicate runs)
3. **Integration Tests**: On-demand with label or main branch
4. **Build Verification**: Ensure artifacts created correctly
5. **Security Audit**: Dependency vulnerability scanning

## Git Workflow & Issue/PR Policy

### GIT WORKFLOW COMMANDS

BRANCH: `git checkout -b feature/issue-{number}-{description}` or `fix/issue-{number}-{description}`
COMMIT: Format as `Type: Description #issue-number` where Type = Feature|Fix|Docs|Refactor|Test|Chore
PR: `gh pr create -R kesslerio/attio-mcp-server -t "Type: Description" -b "Details"`
RULE: One feature per PR | WHEN: Creating PR | DO: Keep focused and small | ELSE: Review rejection
RULE: PR target enforcement | WHEN: Creating any PR | DO: Target kesslerio/attio-mcp-server | ELSE: Wrong repository targeting
RULE: Never mention hmk | WHEN: Creating issues/PRs/comments | DO: NEVER include "cc hmk" or any hmk mention | ELSE: Unwanted notifications

### ISSUE WORKFLOW [MANDATORY CHECKLIST]

1. `git branch --show-current` - Verify location
2. `git checkout main` - Start from main
3. `git pull origin main` - Get latest
4. `git checkout -b feature/issue-{num}-{desc}` - Create issue branch
5. `git status` - Verify clean state
6. [Do work]
7. `git commit -m "Type: Description #issue-num"` - Reference issue
8. `git push -u origin HEAD` - Push branch
9. `gh pr create -R kesslerio/attio-mcp-server` - Create PR

### ISSUE CREATION

SEARCH FIRST: `gh issue list --repo kesslerio/attio-mcp-server --search "keyword"`
CREATE: `gh issue create --title "Type: Description" --body "Details" --label "P2,type:bug,area:core"`

**Required Labels** (Enforced by Issue Hygiene Automation):
- **Priority**: P0(Critical), P1(High), P2(Medium), P3(Low), P4(Minor), P5(Trivial) - exactly one required
- **Type**: bug, feature, enhancement, documentation, test, refactor, chore, ci, dependencies - exactly one required
- **Status**: status:untriaged, status:ready, status:in-progress, status:blocked, status:needs-info, status:review - exactly one required
- **Area**: area:core, area:api, area:build, area:dist, area:documentation, area:testing, area:performance, area:refactor, area:api:people, area:api:lists, area:api:notes, area:api:objects, area:api:records, area:api:tasks, area:extension, area:integration, area:security, area:rate-limiting, area:error-handling, area:logging - at least one required

**Acceptance Criteria**: Required for P0-P2, optional for P3-P5. Format: `### Acceptance Criteria` with `- [ ]` checklist items.

## Documentation Search Workflow

1) **Context7**: install & run via MCP (`npx -y @upstash/context7-mcp@latest`), then **introspect tools** and use the server's advertised names.
2) **Official docs** (vendor sites).
3) **Web search** last (only if 1–2 fail).
**Do not invent tool IDs.**

## Clear Thought Integration (Shared)

Use Clear Thought MCP. **Introspect tools** first. Typical pattern: call `clear_thought` with operations like `sequential_thinking`, `mental_model`, `decision_framework`. (Variants exist across forks.)

## Attio API Cheatsheet

- Objects: `GET /v2/objects`
- Attributes: `GET /v2/objects/{object}/attributes`
- Records: `GET/POST/PATCH /v2/objects/{object}/records[/{id}]`
- Lists: `GET /v2/lists`

**Verify attributes**
```bash
curl -H "Authorization: Bearer $ATTIO_API_KEY" https://api.attio.com/v2/objects/companies/attributes \
| jq -r '.data[] | "\(.api_slug) - \(.title)"'
```

### KEY IDS
- Prospecting List: `88709359-01f6-478b-ba66-c07347891b6f`
- Prospecting Stage: `f78ef71e-9306-4c37-90d6-e83550326228`
- Deal Stage: `28439dc6-e8b1-41e5-9819-cca5f18d2de2`

## ANY TYPE REDUCTION STRATEGY (PR #483 Progress)

RULE: Progressive `any` reduction | WHEN: Writing TypeScript | DO: Use Record<string, unknown> over any | ELSE: Warning count increases
CURRENT: 395 warnings (improved from 957) | TARGET: <350 this sprint | GOAL: <200 in 3 months
RECOMMENDED: Use `Record<string, unknown>` instead of `Record<string, any>` for better type safety
COMMON PATTERNS:
- API responses: `Record<string, unknown>` or specific interface
- Format functions: Always return string (never conditional types)
- Configuration objects: Define specific interfaces
- Legacy integration: Gradually migrate `any` → `unknown` → specific types

## DEBUG UTILITIES

RULE: Use debug scripts for targeted testing | WHEN: Developing/debugging | DO: Check `scripts/debug/README.md` | ELSE: Slower debugging cycles
KEY SCRIPTS: `debug-field-mapping.js` (field transforms), `debug-formatresult.js` (Issue #483 compliance), `debug-tools.js` (tool registration), `debug-tool-lookup.js` (dispatcher routing)
USAGE: `node scripts/debug/[script-name].js` (requires `npm run build` first)

## RELEASE PROCESS

RULE: Use automated release | WHEN: Creating release | DO: Run `./scripts/release.sh` | ELSE: Manual error-prone process
MANUAL FALLBACK: `npm version` → `npm run build` → `npm test` → commit → tag → `gh release create` → `npm publish`
CHANGELOG: Follow Keep a Changelog format | Move Unreleased → versioned | Include: Added/Changed/Deprecated/Removed/Fixed/Security

## MCP TOOL TESTING

RULE: Validate MCP tools with real API calls | WHEN: MCP tool changes | DO: Use mcp-test-client for end-to-end validation | ELSE: Production failures
SETUP: `npm install --save-dev mcp-test-client` (already installed)
USAGE: Create test in `test/mcp/` directory:

```typescript
import { MCPTestClient } from 'mcp-test-client';

const client = new MCPTestClient({
  serverCommand: 'node',
  serverArgs: ['./dist/index.js'],
});
await client.init();

await client.assertToolCall('search-records', params, (result) => {
  expect(result.isError).toBeFalsy();
  // Validate real API responses
});

await client.cleanup();
```

## Safety & Data Hygiene

- **Never** paste secrets or live tokens; rotate if exposed.
- Strip credentials/PII from logs; respect log levels; rate‑limit noisy logs.
- Use approval/plan modes for destructive actions.

## Paste‑Context Guidance

- Prefer **diffs** + file paths + failing output over whole files.
- Include env key **names** only (no values).

## GITHUB CLI ADVANCED USAGE

**Workflow Operations**: `gh workflow run workflow.yml` | `gh run list` | `gh run watch <run-id>` | `gh run rerun <run-id>`
**API Direct Access**: `gh api repos/:owner/:repo/issues -F title="Bug" -F body="Details"` (POST) | `gh api repos/:owner/:repo/pulls/123 --method PATCH -F state=closed`
**JSON Output**: `gh pr list --json number,title,state --jq '.[] | select(.state=="OPEN")'` | `gh issue list --json number,title --template '{{range .}}#{{.number}} {{.title}}{{"\n"}}{{end}}'`
**Secret Management**: `gh secret set SECRET_NAME` | `gh secret list` | `gh variable set VAR_NAME --body "value"`
**Useful Aliases**: `gh alias set prc 'pr create --title "$1" --body "$2" -R kesslerio/attio-mcp-server'` | `gh alias set iv 'issue view --json body --jq .body'`
**Batch Operations**: `gh issue list --state open --json number | jq -r '.[].number' | xargs -I {} gh issue close {}`