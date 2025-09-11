#!/usr/bin/env bash
set -euo pipefail
# Attio MCP GitHub Labels Setup Script
# This script creates the required labels for the GitHub workflow system

# Environment validation
command -v gh >/dev/null || { echo "❌ gh CLI not found. Install GitHub CLI first."; exit 1; }
gh auth status >/dev/null || { echo "❌ gh CLI not authenticated. Run 'gh auth login' first."; exit 1; }

REPO="${REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
export GH_REPO="$REPO"  # gh respects this when set
DRY_RUN="${DRY_RUN:-false}"

run() { 
  echo "+ $*"
  [ "$DRY_RUN" = "true" ] || "$@"
}

upsert_label() {
  local name="$1" color="$2" desc="$3"
  run gh label create "$name" --color "$color" --description "$desc" \
    || run gh label edit "$name" --color "$color" --description "$desc"
}

echo "Setting up GitHub labels for Attio MCP workflow system..."
echo "Repository: $REPO"
[ "$DRY_RUN" = "true" ] && echo "🔍 DRY RUN MODE - no changes will be made"

# Priority labels
echo "Creating priority labels..."
upsert_label "P0" "FF0000" "Critical priority"
upsert_label "P1" "FF9900" "High priority"
upsert_label "P2" "FFCC00" "Medium priority"
upsert_label "P3" "FFFF00" "Low priority"
upsert_label "P4" "CCFFCC" "Trivial priority"

# Type labels
echo "Creating type labels..."
upsert_label "bug" "d73a4a" "Something isn't working"
upsert_label "feature" "a2eeef" "New feature or request"
upsert_label "enhancement" "a2eeef" "Improvement to existing functionality"
upsert_label "documentation" "0075ca" "Documentation improvements"
upsert_label "test" "0075ca" "Test improvements"

# Status labels
echo "Creating status labels..."
upsert_label "status:ready" "0E8A16" "Ready for implementation"
upsert_label "status:in-progress" "1D76DB" "Currently being worked on"
upsert_label "status:blocked" "B60205" "Cannot proceed due to dependencies"
upsert_label "status:needs-info" "FEF2C0" "Requires additional information"
upsert_label "status:review" "5319E7" "Ready for or in review"
upsert_label "status:untriaged" "FBCA04" "Not yet assessed"

# Area labels
echo "Creating area labels..."
upsert_label "area:core" "0366d6" "Core module related issues"
upsert_label "area:api" "0366d6" "API related issues"
upsert_label "area:build" "0366d6" "Build system related issues"
upsert_label "area:dist" "0366d6" "Distribution related issues"
upsert_label "area:documentation" "0366d6" "Documentation related issues"
upsert_label "area:testing" "0366d6" "Testing related issues"
upsert_label "area:performance" "0366d6" "Performance related issues"
upsert_label "area:refactor" "0366d6" "Refactoring related issues"

echo "✅ GitHub labels setup complete!"
