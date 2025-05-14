# Attribution Handling System

This directory contains a comprehensive system for managing code attribution in Git workflows.

## Purpose

This system prevents AI attribution in commit messages and PR descriptions while maintaining the core content of the commit messages.

## Overview

The Attribution Handling System is designed to enforce project-specific attribution guidelines by:

1. Automatically detecting attribution patterns in commit messages and files
2. Removing attribution statements from commit messages
3. Preventing commits with attribution in non-exempted files
4. Cleaning PR descriptions of attribution statements

## Components

### Core Components

1. **Pre-commit Hook** (`hooks/pre-commit`)
   - Scans commit messages and staged files for attribution patterns
   - Automatically cleans commit messages
   - Blocks commits with attribution in non-exempted files
   - Uses configurable exemption lists to skip certain files

2. **Pattern Builder** (`hooks/pattern_builder.sh`)
   - Dynamically constructs attribution patterns at runtime
   - Uses a configuration-based approach for flexibility
   - Avoids hard-coding attribution patterns that could trigger detection

3. **PR Creation Script** (`scripts/create_pr.sh`)
   - Wraps GitHub CLI PR creation with attribution cleaning
   - Removes attribution patterns from PR descriptions
   - Ensures compliant PRs even when commits are already made

### Configuration Files

1. **Attribution Patterns** (`hooks/config/attribution_patterns.conf`)
   - Stores pattern components that are combined at runtime
   - Uses a modular approach to avoid triggering detection
   - Separates prefixes, names, domains, and special symbols

2. **Exempted Files** (`hooks/config/exempted_files.conf`)
   - Lists files that should be exempt from attribution checks
   - Includes the hooks and scripts themselves (necessary since they contain pattern references)
   - Supports wildcard patterns for directories

## Installation

1. **Install Hooks**
   ```bash
   # Copy pre-commit hook to Git hooks directory
   cp build/hooks/pre-commit .git/hooks/pre-commit
   chmod +x .git/hooks/pre-commit
   
   # Ensure pattern builder is executable
   chmod +x build/hooks/pattern_builder.sh
   ```

2. **Install PR Script**
   ```bash
   # Make the PR creation script executable
   chmod +x scripts/create_pr.sh
   ```

## Usage

### For Commits

Normal Git commits will automatically be processed through the pre-commit hook:

```bash
git add .
git commit -m "Your commit message"
```

The hook will:
1. Remove any attribution statements from the commit message
2. Check staged files for attribution (except exempted files)
3. Block the commit if non-exempted files contain attribution

### For Pull Requests

Use the provided PR script instead of GitHub CLI directly:

```bash
./scripts/create_pr.sh "Your PR Title" "
## Summary
- Feature details here

## Test plan
- How to test this PR
" main
```

The script will:
1. Clean the PR description of any attribution statements
2. Create the PR using GitHub CLI
3. Return the PR URL on success

## Configuration

### Adding Exempted Files

Edit `build/hooks/config/exempted_files.conf` to add paths that should be skipped during attribution checks:

```
# Format: One file path per line, can use wildcards
path/to/exempt/file.txt
path/to/exempt/directory/*
```

### Modifying Attribution Patterns

Edit `build/hooks/config/attribution_patterns.conf` to adjust what patterns are detected:

```
# Add new prefixes
new_prefix_

# Add new names
n_e_w_n_a_m_e
```

## Maintenance

- **Updating Patterns**: When new attribution patterns emerge, add them to the configuration files rather than directly to the scripts
- **Testing**: After any changes, test with sample commits containing known attribution patterns
- **Performance**: The system is designed to be efficient, but large repositories might experience slight commit delays

## Limitations

1. Cannot detect highly obfuscated attribution patterns
2. Required GitHub CLI for PR creation script
3. Must be installed on each developer's machine for full effectiveness