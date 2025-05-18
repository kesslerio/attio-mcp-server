# /project:setup-worktrees

This command helps set up git worktrees for parallel development across multiple issues and provides startup prompts for separate Claude instances, including full GitHub issue lifecycle management.

## Usage 
```
/project:setup-worktrees [ISSUE_IDS]
```

Where:
- `[ISSUE_IDS]` is an optional comma-separated list of GitHub issue IDs to work on in parallel (e.g., "290,298,342")
- If no issues are specified, the command will automatically select the highest priority open issues (P0-P5) that can be worked on independently

## Examples
```
/project:setup-worktrees                # Automatically selects high-priority independent issues
/project:setup-worktrees 290,298,342    # Works on the specified issues
```

## Behavior

1. If no issues are specified, query GitHub for open issues with priority labels (P0-P5)
2. Select up to 3 independent issues with the highest priority that don't have overlapping files
3. Create a separate git worktree for each selected issue
4. Set up appropriate branch names for each worktree
5. Generate detailed instructions for working with the worktrees
6. Generate customized Claude prompts for each issue
7. Provide guidance on issue updates, PR creation, and issue closure
8. Suggest strategies for parallel development

## Parameters

### ISSUE_IDS (optional)
A comma-separated list of GitHub issue IDs to create worktrees for. If omitted, the command will automatically select high-priority independent issues.

## Implementation

1. If no issue IDs are provided:
   - Query open issues sorted by priority using `gh issue list --label "P0,P1,P2,P3,P4,P5" --state open --json number,title,labels`
   - Filter issues by priority (P0 > P1 > P2 > P3 > P4 > P5)
   - Analyze issue dependencies using `gh issue view` to identify independent issues
   - Select up to 3 highest priority independent issues

2. For each selected/specified issue:
   - Fetch issue details using `gh issue view <ID> --json number,title,body,labels`
   - Determine issue type (bug, feature, etc.) from labels or title
   - Create branch name following convention: `<type>/<issue-description>-<id>`
   - Create worktree: `git worktree add ../<branch-name> -b <branch-name>`
   - Verify worktree creation success

3. Generate shell commands for navigating between worktrees

4. Create tailored Claude prompts for each issue based on issue details

5. Provide instructions for launching parallel Claude sessions

6. Include GitHub issue lifecycle management commands (updates, PRs, closure)

## Expected Output

- Shell commands to set up each worktree
- Branch naming suggestions based on issue type and description
- Custom Claude prompts for each issue
- **Explicit commands for each worktree**:
  ```bash
  # For issue #123
  cd /Users/kesslerio/GDrive/Projects/cursor/python/sales/project-issue-123
  claude -p @/Users/kesslerio/GDrive/Projects/cursor/python/sales/tmp/issue-123-prompt.md --verbose
  
  # For issue #456
  cd /Users/kesslerio/GDrive/Projects/cursor/python/sales/project-issue-456
  claude -p @/Users/kesslerio/GDrive/Projects/cursor/python/sales/tmp/issue-456-prompt.md --verbose
  
  # For issue #789
  cd /Users/kesslerio/GDrive/Projects/cursor/python/sales/project-issue-789
  claude -p @/Users/kesslerio/GDrive/Projects/cursor/python/sales/tmp/issue-789-prompt.md --verbose
  ```
- Instructions for managing multiple parallel Claude sessions
- Commands for updating GitHub issues with progress and creating PRs
- Tips for preventing merge conflicts during parallel development

## Claude Prompts

For each issue, the command will generate a specialized Claude prompt that:

1. Summarizes the issue's key details
2. Outlines a structured approach to the problem 
3. Provides context about the branch to use
4. Suggests specific tasks to complete
5. Sets expectations for testing and validation
6. Includes guidance on issue updates and PR creation

Example generated prompt:
```markdown
Please help me implement a fix for GitHub issue #123 "Example issue title".

The issue involves [summary of issue details].

You are currently working inside the git worktree located at `/Users/kesslerio/GDrive/Projects/cursor/python/project-issue-123` on the branch `[branch-name]`. 
**IMPORTANT:** Ensure all git commands (`add`, `commit`, `push`) and `gh pr create` are run from this specific worktree root directory and target the `[branch-name]` branch, NOT `main`.

Please:
1.  Analyze issue #123 using `gh issue view 123`.
2.  [Task specific to this issue type]
3.  [Task specific to this issue type]
4.  Implement the necessary code changes.
5.  Create appropriate tests to verify the fix.
6.  **Before committing**, verify you are on the correct branch: `git branch --show-current` (should be `[branch-name]`).
7.  Stage changes using paths relative to the worktree root (e.g., `git add src/core/some_file.py tests/test_some_file.py`).
8.  Commit the changes to the `[branch-name]` branch: `git commit -m "[type]: Fix [issue description] (#123)"`.
9.  Update the GitHub issue with progress:
    *   Write progress to a unique file: `echo "Progress update..." > /tmp/update-issue-123.md`
    *   Post the comment: `gh issue comment 123 --body-file /tmp/update-issue-123.md`
    *   Update labels: `gh issue edit 123 --add-label "status:in-progress"` (or `status:ready` when done).
10. When ready, push the changes to the remote feature branch: `git push origin [branch-name]`.
11. Create the Pull Request targeting `main` from your feature branch:
    *   Write PR body to a unique file: `echo "Fixes #123. [Detailed PR description]" > /tmp/pr-body-123.md`
    *   Create the PR: `gh pr create --base main --head [branch-name] --title "[type]: Fix [issue description] (#123)" --body-file /tmp/pr-body-123.md`
12. **After the PR is approved and merged**, the worktree can be cleaned up (usually done manually by the user): `git worktree remove ../[branch-name]`

Work in the branch `[branch-name]`, which is already created and checked out in this worktree.
```