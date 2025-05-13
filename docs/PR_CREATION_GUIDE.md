# Pull Request Creation Guide

This document explains the proper way to create Pull Requests in our project while automatically handling attribution removal.

## Why We Need a Special Process

GitHub PRs are created after commits are made. This means that a standard pre-commit hook cannot prevent attributions from appearing in PR descriptions. To solve this issue, we've implemented a special script that automatically removes attributions from PR descriptions.

## Creating Pull Requests

### Option 1: Using Our Custom Script (Recommended)

Instead of creating PRs directly with the GitHub CLI or web interface, use our custom script:

```bash
./scripts/create_pr.sh "Your PR Title" "
## Summary
- Feature details here
- Another bullet point

## Test plan
- How to test this PR
" main
```

**Parameters:**
1. PR Title (required): The title of the pull request
2. PR Body (required): The description of the pull request
3. Base Branch (optional): The branch to merge into (defaults to `main`)

**Benefits:**
- Automatically removes attribution messages from PR descriptions
- Ensures compliance with our project guidelines
- Provides clear feedback about what was removed

### Option 2: Manual Creation

If you prefer to create PRs manually:

1. Create your PR through GitHub's web interface or CLI
2. Before submitting, manually review for and remove any attribution messages
3. Make sure your PR description follows our guidelines

## What Our PR Script Does

1. Checks if GitHub CLI (`gh`) is installed
2. Parses your PR title, body, and target branch
3. Scans the PR description for attribution patterns
4. Automatically removes any lines containing these patterns
5. Creates the PR with the cleaned description
6. Returns the PR URL on success

## Installation Requirements

- GitHub CLI (`gh`) must be installed and authenticated
- You must have permission to create PRs in the repository

## Best Practices

1. Always use the PR script for creating pull requests
2. Provide a detailed PR description that includes:
   - A clear summary of the changes
   - How to test the changes
   - Any related issues
3. Keep PR titles concise and descriptive
4. Create focused PRs that address a single concern

## Troubleshooting

If you encounter issues with the PR script:

1. Ensure GitHub CLI is properly installed and authenticated
2. Check that you have the necessary permissions
3. Verify the script is executable (`chmod +x scripts/create_pr.sh`)
4. Try running the script with verbose output for debugging

For additional help, please contact the repository maintainers.