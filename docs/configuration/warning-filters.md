# Warning Filter Configuration

## Overview

The warning filter system balances transparency about risky updates with a finite ESLint warning budget. Runtime validation in `UniversalUpdateService` classifies API responses and suppresses cosmetic mismatches, while the build pipeline caps lint noise at the shared 1,030-warning ceiling. Use this guide to configure warning behavior, stay within the budget, and document any necessary suppressions.

## Universal Update Warning Flow

1. **Field validation** – Incoming `record_data` (or legacy `data`) is normalized, validated, and any warnings are collected before Attio is called. These warnings are logged and added to the response payload so client tools can surface them without failing the update.【F:src/services/UniversalUpdateService.ts†L252-L284】
2. **Deal-specific checks** – When updating deals, additional defaults and validations run. Any warnings from this pass are appended to the shared validation result for downstream tooling.【F:src/services/UniversalUpdateService.ts†L286-L317】
3. **Post-update verification** – Unless `ENABLE_FIELD_VERIFICATION` is explicitly set to `false`, the service re-fetches the record and compares Attio’s persisted values against the user’s payload.【F:src/services/UniversalUpdateService.ts†L329-L353】
4. **Warning suppression** – Cosmetic mismatches (e.g., Attio expanding `{stage: "Demo"}` into `{stage: {title: "Demo"}}`) are suppressed unless `STRICT_FIELD_VALIDATION=true`. Semantic differences continue to surface as warnings, ensuring real regressions are caught without overwhelming operators.【F:src/services/UniversalUpdateService.ts†L355-L399】
5. **Fallback warnings** – Any verification errors are downgraded to warnings so the operation can succeed while still signaling unexpected behavior.【F:src/services/UniversalUpdateService.ts†L400-L405】

## Configuration Matrix

| Setting                     | Default | Effect                                                                             | When to Change                                                                                                                                                                                 |
| --------------------------- | ------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ENABLE_FIELD_VERIFICATION` | `true`  | Runs post-update verification and feeds warnings through the filter pipeline.      | Disable temporarily when bulk backfills would generate excessive cosmetic mismatches.【F:src/services/UniversalUpdateService.ts†L7-L25】【F:src/services/UniversalUpdateService.ts†L329-L353】 |
| `STRICT_FIELD_VALIDATION`   | `false` | Emits every discrepancy as a warning (and allows downstream callers to fail-fast). | Enable in staging while diagnosing schema drift or value truncation.【F:src/services/UniversalUpdateService.ts†L7-L25】【F:src/services/UniversalUpdateService.ts†L355-L399】                  |
| `SKIP_FIELD_VERIFICATION`   | `false` | Skips verification entirely inside `UpdateValidation.verifyFieldPersistence`.      | Use in integration tests that rely on mock data to avoid misleading warnings.【F:src/services/update/UpdateValidation.ts†L51-L118】                                                            |

> ℹ️ `ENABLE_ENHANCED_VALIDATION` controls pre-update checks but does not change the warning filters directly. Review [Field Verification Configuration](./field-verification.md) for deeper examples.

## ESLint Warning Budget

- **Global ceiling:** CI fails any pipeline that ends with more than 1,030 ESLint warnings across source and test suites.【F:AGENTS.md†L41-L54】
- **Source baseline:** `npm run lint:src` enforces `--max-warnings=1000`, while `lint:guard` compares current warning counts against `.github/lint-baseline.json` so no new source warnings land in `main`. Optional slack can raise the limit for short-term migrations.【F:package.json†L21-L35】【F:scripts/ci/lint-warning-guard.cjs†L1-L40】【F:.github/lint-baseline.json†L1-L3】
- **Test budget:** `npm run lint:test` applies an 800-warning cap to test files, allowing test refactors without affecting the stricter source baseline.【F:package.json†L21-L38】【F:package.json†L244-L284】

Keep the combined warning count well below 1,030 to preserve review velocity and avoid red CI runs.

## CI/CD Integration

- **Pre-commit hooks** (`lint-staged`) auto-run Prettier and ESLint with a 50-warning guard on staged files, blocking low-signal suppressions from entering the history.【F:package.json†L244-L252】
- **Smart CI pipeline** always executes `lint:src`, `lint:guard`, and `typecheck` on pull requests. Any warning regression beyond the baseline causes the `Lint & Type Check` job to fail before tests run.【F:.github/workflows/smart-ci.yml†L1-L105】
- **Local parity** – Run `npm run ci:local` before pushing to mirror GitHub Actions and catch warning spikes early.【F:package.json†L107-L114】

## When to Suppress Warnings

Only suppress warnings after verifying that:

- The warning is **cosmetic** and repeatedly triggered by Attio responses (e.g., structural wrappers that add metadata without changing values).【F:src/services/UniversalUpdateService.ts†L355-L399】
- A regression ticket exists to track the underlying debt, and suppression is documented in code comments or follow-up issues.
- You have confirmed the warning does **not** hide semantic data loss or authorization problems by reviewing the API response and re-running validation in `STRICT_FIELD_VALIDATION=true` mode.【F:src/services/UniversalUpdateService.ts†L355-L399】

If any of these checks fail, fix the root cause instead of suppressing the warning. Use `ENABLE_FIELD_VERIFICATION=false` only as a temporary escape hatch for controlled workloads, and re-enable it immediately afterward.【F:src/services/UniversalUpdateService.ts†L7-L25】【F:src/services/UniversalUpdateService.ts†L329-L353】

## ESLint Suppression Patterns

Use inline disables sparingly and always explain the rationale:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Attio SDK returns loosely typed JSON blobs
const payload: any = await legacyClient.fetchRaw();
```

```ts
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Validated in UniversalUpdateService warning filter
const normalized = sanitizeResponse(raw);
```

Document the follow-up work (issue link, TODO, or refactoring plan) next to the suppression, and prefer fixing types outright whenever practical.

## Operational Playbook

1. Run `npm run lint:src` locally before committing to monitor the shared warning budget.【F:package.json†L21-L38】
2. Investigate any new warnings surfaced by `UniversalUpdateService` before deciding to suppress them. Re-run with `STRICT_FIELD_VALIDATION=true` to confirm they are purely cosmetic.【F:src/services/UniversalUpdateService.ts†L355-L399】
3. If suppressing, annotate the code with a precise reason and add the warning to a tracking issue.
4. Watch the Smart CI `Lint & Type Check` job; if it fails, either reduce warnings or negotiate temporary slack via `LINT_SRC_SLACK` in coordination with the release manager.【F:scripts/ci/lint-warning-guard.cjs†L24-L33】
5. Keep documentation updated so other teams understand why suppressions exist and when they can be removed.
