# Claude Command Workflow

This workflow handles maintainer-triggered `@claude` commands on issues and PR threads when the request is **not** a review. It gives Claude the ability to edit files, run tests, and commit changes directly to the branch when asked.

## Triggers

- Issue comments and PR review comments containing `@claude`
- Issue bodies or titles containing `@claude`

If the command contains `review`, `ultra`, or `re-review`, the request is handed off to the review label workflow instead.

## Maintainer Guard

Only maintainers (`OWNER`, `MEMBER`, `COLLABORATOR`) or explicitly allow‑listed users can trigger automation. Others receive a notice and the workflow exits before invoking Claude.

## Capabilities

- Runs the `anthropics/claude-code-action@v1` with Sonnet
- Allow list covers `Read`, `Edit`, `Write`, and the git/gh commands needed for `git add/commit/push` and PR creation
- Uses `track_progress: true` so the action updates a single comment
- Prompts Claude to follow the repository’s commit/test standards and report which checks ran

## Usage Tips

1. Comment on the PR or issue, e.g.
   ```
   @claude please add missing null checks and push the fix
   ```
2. Claude replies in the same thread with its plan, executes changes, and pushes commits/opens PRs as needed.
3. Manual follow-up commands (`@claude rerun tests`) are supported; Claude will skip pushes if no changes were required.

For deep reviews, continue using `@claude review` or `@claude ultra`, which go through the comment gate and the label-based review workflow.
