#!/bin/bash
# Attio MCP Workflow Setup Script
# This script installs the Git hooks and sets up the workflow enforcement tools

set -e

echo "Setting up Attio MCP workflow enforcement tools..."

# Project root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Install Git hooks
echo "Installing Git hooks..."
if [ -d "$ROOT_DIR/.git/hooks" ]; then
  # Copy pre-commit hook to .git/hooks directory
  cp "$ROOT_DIR/.github/hooks/pre-commit" "$ROOT_DIR/.git/hooks/"
  chmod +x "$ROOT_DIR/.git/hooks/pre-commit"
  echo "✅ Git hooks installed successfully"
else
  echo "❌ No .git directory found. Is this a Git repository?"
  exit 1
fi

# Create convenient aliases for workflow validation
echo "Creating workflow validation aliases..."

# Add aliases to .gitconfig if not already present
if ! grep -q "workflow-validate" "$HOME/.gitconfig" 2>/dev/null; then
  cat >> "$HOME/.gitconfig" << EOF
[alias]
    workflow-validate = !$ROOT_DIR/build/validate_workflow.py --pre-commit
    issue-validate = !$ROOT_DIR/build/validate_workflow.py --issue-close
EOF
  echo "✅ Git aliases added to ~/.gitconfig"
else
  echo "ℹ️ Git aliases already exist in ~/.gitconfig"
fi

echo "✅ Attio MCP workflow enforcement tools setup complete!"
echo ""
echo "You can now use the following commands:"
echo "  • git workflow-validate - Validate workflow requirements"
echo "  • git issue-validate <ID> - Validate issue closure requirements"
echo ""
echo "The pre-commit hook will automatically run workflow validations before each commit."
