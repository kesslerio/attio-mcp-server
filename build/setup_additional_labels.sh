#!/usr/bin/env bash
set -euo pipefail
# Attio MCP Additional GitHub Labels Setup Script
# This script creates additional area labels based on the project structure

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

echo "Setting up additional GitHub area labels for Attio MCP workflow system..."
echo "Repository: $REPO"
[ "$DRY_RUN" = "true" ] && echo "🔍 DRY RUN MODE - no changes will be made"

# API-specific area labels based on docs directory
echo "Creating API-specific area labels..."
upsert_label "area:api:people" "0366d6" "People API related issues"
upsert_label "area:api:lists" "0366d6" "Lists API related issues"
upsert_label "area:api:notes" "0366d6" "Notes API related issues"
upsert_label "area:api:objects" "0366d6" "Objects API related issues"
upsert_label "area:api:records" "0366d6" "Records API related issues"
upsert_label "area:api:tasks" "0366d6" "Tasks API related issues"

# Additional functional area labels
echo "Creating functional area labels..."
upsert_label "area:extension" "0366d6" "MCP extension related issues"
upsert_label "area:integration" "0366d6" "Integration related issues"
upsert_label "area:security" "d93f0b" "Security related issues"
upsert_label "area:rate-limiting" "d93f0b" "Rate limiting related issues"
upsert_label "area:error-handling" "d93f0b" "Error handling related issues"
upsert_label "area:logging" "0366d6" "Logging related issues"
upsert_label "area:cli" "0366d6" "Command line interface related issues"
upsert_label "area:e2e" "0366d6" "End-to-end testing related issues"
upsert_label "area:devex" "0366d6" "Developer experience improvements"

# Community and release labels
echo "Creating community and release labels..."
upsert_label "good first issue" "7057ff" "Good for newcomers"
upsert_label "help wanted" "008672" "Extra attention is needed"
upsert_label "breaking-change" "d73a4a" "Changes that break backward compatibility"
upsert_label "semver:major" "d73a4a" "Major version bump required"
upsert_label "semver:minor" "fbca04" "Minor version bump required"
upsert_label "semver:patch" "0e8a16" "Patch version bump required"

echo "✅ Additional GitHub labels setup complete!"
