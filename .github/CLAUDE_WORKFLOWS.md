# Claude AI Workflow System

Enhanced fork-safe Claude Code integration for automated PR analysis with security focus.

## 🎯 Overview

This system provides intelligent, secure, and cost-effective PR analysis using Claude AI with the following features:

- **Fork-safe architecture** - Separate read/write permissions for security
- **Smart size gating** - Automatic analysis mode selection based on PR size
- **Slash command re-runs** - On-demand re-analysis with `/claude review`
- **Sticky comments** - Updates in place, no comment spam
- **Security hardening** - StepSecurity, tool restrictions, egress policies

## 🔄 Workflow Architecture

### 1. PR Analysis (Read-Only)

**File**: `.github/workflows/pr-analysis.yml`  
**Trigger**: `pull_request` [opened, reopened]  
**Permissions**: `contents: read, pull-requests: read`

- Analyzes PR size and applies intelligent gating
- Runs Claude analysis in appropriate mode (skip/summary/focused/full)
- Creates Check Run with analysis status
- Uploads results as artifact for comment workflow
- **Never runs on subsequent pushes** - only initial PR creation

### 2. PR Comment (Write Permissions)

**File**: `.github/workflows/pr-comment.yml`  
**Trigger**: `workflow_run` completion + `issue_comment` slash commands  
**Permissions**: `contents: read, pull-requests: write, issues: write, checks: write`

- Downloads analysis artifacts and posts sticky review comments
- Handles `/claude review` and `/claude triage` slash commands
- Re-runs analysis only when explicitly requested
- Updates comments in place with reaction feedback

### 3. PR Size Labeler

**File**: `.github/workflows/pr-size-labeler.yml`  
**Trigger**: `pull_request` [opened, synchronize, reopened]  
**Permissions**: `contents: read, pull-requests: write`

- Automatically labels PRs with size/XS, size/S, size/M, size/L, size/XL
- Provides warnings for XL PRs (50+ files)
- Helps Claude choose appropriate analysis depth

## 📊 Analysis Modes

| Mode        | Files Changed | Analysis Depth                        | Token Limit |
| ----------- | ------------- | ------------------------------------- | ----------- |
| **Skip**    | ≤2 files      | No analysis                           | -           |
| **Full**    | 3-20 files    | Comprehensive security + code quality | 2000        |
| **Focused** | 21-50 files   | Security + critical paths only        | 2000        |
| **Summary** | 51-150 files  | High-level architecture + security    | 2000        |
| **Summary** | 150+ files    | Security vulnerabilities only         | 2000        |

## 🔧 Setup Requirements

### 1. Repository Secrets

Add to Settings → Secrets and variables → Actions:

```
CLAUDE_CODE_OAUTH_TOKEN - Your Claude Code OAuth token
```

### 2. Workflow Files

The following files are automatically created in `.github/workflows/`:

- `pr-analysis.yml` - Fork-safe PR analysis
- `pr-comment.yml` - Comment posting and slash commands
- `pr-size-labeler.yml` - Automatic size labeling
- `issue-hygiene.yml` - Issue closure validation

### 3. Supporting Files

- `.github/claude-review-prompt.md` - Consistent review guidelines for Claude
- `.github/workflows/` - Enhanced label setup scripts

## 🎮 Usage

### Automatic Analysis

- Opens new PR → Triggers automatic analysis
- Size labeling happens immediately
- Claude analysis runs based on PR size
- Check Run appears in PR status
- Sticky comment posted with results

### Manual Re-runs

```bash
# Re-analyze the entire PR
/claude review

# Basic triage (no detailed analysis)
/claude triage
```

**Permission Requirements**: Only members, collaborators, and owners can trigger slash commands.

## 🔒 Security Features

### StepSecurity Hardening

- `disable-sudo: true`
- `egress-policy: audit` - Monitor outbound network calls
- Restricted endpoints for Claude API and GitHub only

### Tool Restrictions

```yaml
allowed_tools: |
  mcp__github__*
```

- Only GitHub MCP tools allowed
- No shell access, no unrestricted network
- Prevents privilege escalation

### Fork Safety

- Analysis workflow has read-only permissions
- Comment workflow never checks out untrusted PR code
- Separate artifact transfer prevents code injection

### Path Filtering

```yaml
paths-ignore:
  - '**.md'
  - '**.txt'
  - '.gitignore'
  - 'LICENSE'
  - 'docs/**'
  - '**.yml'
  - '**.yaml'
```

## 📋 File Exclusions

**Always Skipped:**

- Documentation files (`*.md`, `docs/**`)
- Lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)
- Configuration metadata (`.gitignore`, `LICENSE`)
- Build artifacts and generated files

**Focus Areas:**

- `src/` - Core application code
- `test/` - Test coverage and quality
- `.github/workflows/` - CI/CD security
- Configuration files with potential credentials

## 🏷️ Size Labels

| Label     | Files | Color          | Description |
| --------- | ----- | -------------- | ----------- |
| `size/XS` | 1-3   | 🟢 Green       | Extra Small |
| `size/S`  | 4-8   | 🟡 Light Green | Small       |
| `size/M`  | 9-20  | 🟡 Yellow      | Medium      |
| `size/L`  | 21-50 | 🟠 Orange      | Large       |
| `size/XL` | 50+   | 🔴 Red         | Extra Large |

XL PRs automatically receive guidance about breaking them down.

## 🎯 Review Focus Areas

### Security (Critical Priority)

- Credential exposure and API key leakage
- Input validation and injection vulnerabilities
- Authentication/authorization issues
- Information disclosure in errors

### Architecture (High Priority)

- Breaking API changes
- Error handling patterns
- Performance impact

### Testing (Medium Priority)

- Test coverage for new functionality
- Security-critical path testing

### Code Quality (Low Priority)

- TypeScript best practices
- Code organization
- Gradual `any` type reduction

## 🚀 Performance Optimizations

### Cost Controls

- Smart size gating skips trivial PRs
- Token limits prevent runaway costs
- Timeout controls (5-10 minutes max)
- Concurrency limits with cancellation

### Network Efficiency

- Artifact-based result transfer
- Minimal GitHub API calls
- Hardened egress policies
- Background processing

### User Experience

- Sub-5 second size labeling
- Sticky comments (no spam)
- Real-time reactions to commands
- Clear Check Run status

## 🔧 Customization

### Adjust Size Thresholds

Edit thresholds in `pr-size-labeler.yml`:

```yaml
if [ "$files_count" -le 3 ]; then
sizeLabel='size/XS'
elif [ "$files_count" -le 8 ]; then
sizeLabel='size/S'
# ... etc
```

### Modify Analysis Prompts

Update prompts in workflow files or reference the shared `.github/claude-review-prompt.md`.

### Add Custom Tools

Extend `allowed_tools` for specific MCP tools:

```yaml
allowed_tools: |
  mcp__github__*
  mcp__custom_tool__*
```

## 🐛 Troubleshooting

### Common Issues

**Claude Analysis Not Running**

- Check `CLAUDE_CODE_OAUTH_TOKEN` secret is set
- Verify PR size meets analysis threshold (>2 files)
- Check paths-ignore filters aren't excluding your changes

**Slash Commands Not Working**

- Ensure user has member/collaborator/owner permissions
- Check comment format: `/claude review` (not `@claude review`)
- Verify comment workflow has proper permissions

**Size Labels Not Applied**

- Check pr-size-labeler workflow ran successfully
- Verify workflow has `pull-requests: write` permission
- Check for network/API errors in workflow logs

### Debug Information

Check workflow run logs for:

- File count and size calculations
- Analysis mode selection logic
- Claude API response status
- Artifact upload/download success

## 📚 Additional Resources

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code/github-actions)
- [StepSecurity Hardening Guide](https://www.stepsecurity.io/blog/anthropics-claude-code-action-security-how-to-secure-claude-code-in-github-actions-with-harden-runner)
- [GitHub Actions Security Guide](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/)
- [Fork-Safe Workflow Patterns](https://markbind.org/devdocs/devGuide/githubActions/workflowSecurity.html)

## 🤝 Contributing

When modifying these workflows:

1. Test changes in fork first
2. Use dry-run modes where possible
3. Monitor token usage and costs
4. Update documentation for any threshold changes
5. Maintain fork-safety patterns

The system is designed to be conservative with analysis triggers - it's better to skip marginal cases than waste tokens on low-value reviews.
