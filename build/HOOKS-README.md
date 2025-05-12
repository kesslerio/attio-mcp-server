# Git Hooks for Attio MCP

This directory contains git hooks to enforce code quality standards and prevent unwanted AI attribution in the codebase.

## Available Hooks

- **pre-commit**: Validates branch naming conventions and commit message format
- **prepare-commit-msg**: Scans commit messages for AI attribution patterns and blocks commits that contain them

## Installation

The hooks are automatically installed via the `postinstall` script in package.json when you run `npm install`.

If you need to install them manually, run:

```bash
npm run setup-hooks
```

Or run the install script directly:

```bash
./build/install-hooks.sh
```

### Installation Options

The install script supports different installation methods:

```bash
# Install using symlinks (default) - keeps hooks in sync with repository changes
./build/install-hooks.sh --symlink

# Install by copying hooks directly to .git/hooks
./build/install-hooks.sh --copy
```

## What The Hooks Do

### Pre-commit Hook

- Validates branch naming follows the pattern: `feature/*`, `fix/*`, `docs/*`, etc.
- Ensures commit messages start with a valid prefix (Feature, Fix, Docs, etc.)
- Recommends including issue references in commit messages

### Prepare-commit-msg Hook

Prevents commits that contain AI attribution patterns such as:
- "Generated with Claude Code"
- "Co-Authored-By: Claude"
- Other AI assistant attributions

## Manual Testing

To manually test the hooks, use:

```bash
./build/test-hooks.sh
```

## Troubleshooting

If you encounter issues with the hooks:

1. Ensure the hook scripts are executable:
   ```bash
   chmod +x build/hooks/pre-commit build/hooks/prepare-commit-msg
   ```

2. Verify the hook installation:
   ```bash
   ls -la .git/hooks/
   ```

3. Test the pattern detection:
   ```bash
   echo "Generated with [Claude Code]" | grep -q "Generated with \[Claude Code\]" && echo "Pattern detected"
   ```