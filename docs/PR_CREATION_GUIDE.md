# Pull Request Creation Guide

This document explains how to create Pull Requests in our project while ensuring compliance with our attribution guidelines.

## Why We Need a Special Process

GitHub PRs are created after commits are made, which means our pre-commit hooks cannot prevent certain attribution patterns from appearing in PR descriptions. To solve this issue, we've implemented a special script that automatically cleans PR descriptions.

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
- Automatically ensures PR descriptions follow our guidelines
- Streamlines PR creation process
- Provides clear feedback during PR creation

### Option 2: Manual Creation

If you prefer to create PRs manually:

1. Create your PR through GitHub's web interface or CLI
2. Before submitting, review your PR description carefully:
   - Ensure it focuses on the technical changes made
   - Avoid mentioning development tools that may have assisted
   - Focus on what the code does, not how it was created
3. Make sure your PR description follows our guidelines:
   - Clear summary of changes
   - Detailed test plan
   - Any relevant issue references

## What Our PR Script Does

1. Checks if GitHub CLI (`gh`) is installed
2. Parses your PR title, body, and target branch
3. Processes the PR description according to our guidelines
4. Creates the PR with the properly formatted description
5. Returns the PR URL on success

## Installation Requirements

- GitHub CLI (`gh`) must be installed and authenticated
- You must have permission to create PRs in the repository

## Technical Implementation Details

Our system uses a sophisticated pattern detection mechanism that:

- Utilizes a configuration-based approach for flexibility
- Supports exempting specific files from checks
- Processes patterns dynamically for improved detection
- Works consistently across various OS platforms

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