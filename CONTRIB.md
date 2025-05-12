# Internal Contribution Guide

This document outlines the repository setup and workflow for maintaining our fork and submitting PRs to the original repository.

## Repository Setup

Our setup has the following remotes:
- `origin`: Your primary development repository (https://github.com/kesslerio/attio-mcp.git)
- `fork`: Your fork of the original repository (https://github.com/kesslerio/attio-mcp-server.git)
- `upstream`: The original repository (https://github.com/hmk/attio-mcp-server.git)

You can verify this with:
```bash
git remote -v
```

## Workflow for Keeping Repositories in Sync

### 1. Fetch updates from the original repository

```bash
# Fetch the latest changes from upstream
git fetch upstream
```

### 2. Update your local main branch

```bash
# Switch to your local main branch
git checkout main

# Merge upstream changes into your local main
git merge upstream/main

# Push the updated main to your primary repo
git push origin main

# Also update your fork of the original repo
git push fork main
```

## Workflow for Creating a PR to the Original Repository

### 1. Create a feature branch from the updated main

```bash
# Make sure your main is up to date with upstream first
git fetch upstream
git checkout main
git merge upstream/main
git push origin main

# Create a new branch for your feature
git checkout -b feature/your-feature-name
```

### 2. Develop your feature

Make your changes, commit often with clear commit messages:

```bash
git add .
git commit -m "Feature: Clear description of changes"
```

### 3. Push your feature branch to your repositories

```bash
# Push to your primary development repo
git push origin feature/your-feature-name

# Push to your fork of the original repo (for PR creation)
git push fork feature/your-feature-name
```

### 4. Create a pull request to the original repository

Using GitHub CLI:
```bash
gh pr create \
  --repo hmk/attio-mcp-server \
  --head kesslerio:feature/your-feature-name \
  --title "Feature: Your Feature Title" \
  --body "Detailed description of your changes"
```

Or create the PR through the GitHub web interface:
1. Go to https://github.com/hmk/attio-mcp-server
2. Click "Pull requests"
3. Click "New pull request"
4. Click "compare across forks"
5. Set base repository to "hmk/attio-mcp-server" and base to "main"
6. Set head repository to "kesslerio/attio-mcp-server" and head to your feature branch
7. Fill in title and description
8. Submit the PR

## Best Practices for Clean PRs

1. **Focus on a single feature or fix per PR**
   - Keep each PR centered around a specific enhancement

2. **Keep PRs small and focused**
   - Smaller PRs are easier to review and more likely to be merged

3. **Use meaningful commit messages**
   - Format: `Feature:`, `Fix:`, `Docs:`, `Refactor:`, etc. followed by a clear description

4. **Only include relevant files**
   - Don't include unrelated changes, .env files, or personal configuration files
   - Avoid modifying .gitignore unless specifically necessary

5. **Test thoroughly before submitting**
   - Make sure your changes work with the current upstream code

6. **Update documentation**
   - Add or update documentation to reflect your changes

## Troubleshooting

### If your PR has unwanted files

If you accidentally included unwanted files in your PR:

```bash
# Remove the file from git tracking without deleting it
git rm --cached path/to/file

# Amend the commit
git commit --amend

# Force push to both repositories
git push -f origin feature/your-feature-name
git push -f fork feature/your-feature-name
```

### If upstream has changed since you created your branch

```bash
# Fetch latest changes from upstream
git fetch upstream

# Rebase your branch on the latest upstream main
git rebase upstream/main

# Force push to both repositories
git push -f origin feature/your-feature-name
git push -f fork feature/your-feature-name
```