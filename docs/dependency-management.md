# Dependency Management Strategy

## Syncpack Choice Rationale

### Why Syncpack?

We chose `syncpack` over alternatives like npm workspaces or lerna for the following reasons:

**1. Version Consistency Focus**
- Primary goal: Ensure consistent dependency versions across all package.json files
- Prevents version conflicts between devDependencies and dependencies
- Lightweight approach focused specifically on version alignment

**2. Integration with Existing Workflow**
- Works with existing npm structure without requiring workspace migration
- Minimal configuration overhead
- Integrates cleanly with wireit build system

**3. Comparison with Alternatives**

| Tool | Purpose | Complexity | Our Need |
|------|---------|------------|----------|
| **syncpack** | Version consistency | Low | ✅ Perfect fit |
| npm workspaces | Full monorepo management | High | ❌ Overkill |
| lerna | Full monorepo tooling | High | ❌ Too complex |
| rush | Enterprise monorepo | Very High | ❌ Excessive |

**4. Dependency Footprint Analysis**
While syncpack adds ~220 transitive dependencies, most are shared:
- `commander` - CLI framework (needed for syncpack CLI)
- `fast-check` - Property testing (syncpack's internal testing)
- `effect` - Functional programming (syncpack's internal architecture)

These are development-only dependencies that don't affect runtime bundle size.

### Usage Guidelines

**Check for version mismatches:**
```bash
npm run syncpack:check
```

**Fix version mismatches:**
```bash
npm run syncpack:fix
```

**Integrate into CI:**
The `npm run check` command now includes syncpack validation via wireit dependency.

## Version-Coupled Dependency Groups

Some dependency families pin their peers to one exact version, so every member has to move in the
same change. Syncpack cannot catch a break in this class: it compares version ranges across
`package.json` files, not the peer pins published inside a package.

**The vitest family.** `@vitest/coverage-v8`, `@vitest/ui`, and `@vitest/browser` each declare a peer
on the exact vitest version they were released with, so bumping one alone leaves an unmet peer that
resolves and installs anyway:

```bash
npm view @vitest/coverage-v8@5.0.2 peerDependencies
# { vitest: '5.0.2', '@vitest/browser': '5.0.2' }
npm view @vitest/ui@5.0.2 peerDependencies
# { vitest: '5.0.2' }
```

Bumping the coverage provider alone is the dangerous case, because it fails silently rather than
loudly. With `@vitest/coverage-v8` 5.0.2 against vitest 4.1.11, a coverage run completes, writes
`./coverage`, and reports **0% on every metric with no covered statements in any of the 454 tracked
files**, while the matched 4.1.11 provider reports 17% statements for the same subset. The
thresholds in `configs/vitest/` then fail the run, so the symptom looks like a test regression
instead of a provider mismatch. All three move in one change, along with whatever the vitest major
itself asks of the config and reporters.

**Check a coverage-provider bump before merging it:**

```bash
bun install --frozen-lockfile
SKIP_INTEGRATION_TESTS=true bunx vitest --config configs/vitest/vitest.config.offline.ts \
  --coverage --run test/utils/ --reporter=dot
```

Compare the summary against the same command on the provider currently in `main`. If the numbers
collapse to zero, the provider does not match the installed vitest and the whole family has to be
bumped at once.

### Future Considerations

If the project evolves into a true monorepo with multiple packages:
- Consider migrating to npm workspaces
- Evaluate lerna for more complex inter-package dependency management
- Keep syncpack for version consistency validation

For now, syncpack provides the exact functionality we need without unnecessary complexity.