# Contributing

## How to contribute

- Bugs and focused fixes: open a PR.
- New features or architecture changes: open an issue or discussion first.
- Questions: open an issue or discussion.

## Before you open a PR

- Search existing issues and PRs first.
- Keep PRs focused; do not mix unrelated concerns.
- Use the issue forms in `.github/ISSUE_TEMPLATE/` for new reports and requests.

## Branches and commits

- Branch names should be short and descriptive.
- Commit format in this repository follows: `Type: Description #issue-number`.

## Validation expectations

Include exact commands and outcomes in every PR.

Run the repository validation flow:

```bash
bun run typecheck
bun run test
bun run lint
```

Run narrower commands for targeted updates when appropriate:

```bash
bun run test:file -- "glob"
bun run lint:file -- "file1.ts"
```

## AI-assisted contributions

AI-assisted PRs are welcome. Be explicit:

- Mark AI assistance in the PR.
- State testing level (untested/lightly tested/fully tested).
- Include prompt/session notes when feasible.
- Confirm you understand the final code and behavior.

## PR requirements

Complete all sections in `.github/pull_request_template.md`, especially:

- Security impact
- Repro and verification
- Human verification
- Compatibility/migration
- Failure recovery
