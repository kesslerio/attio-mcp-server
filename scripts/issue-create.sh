#!/usr/bin/env bash
set -euo pipefail

# Issue Creation Script with Label Hygiene
# Usage: scripts/issue-create.sh "Title" "Body" P2 type:bug area:core status:untriaged

command -v gh >/dev/null || { echo "gh CLI not found"; exit 1; }
gh auth status >/dev/null || { echo "gh not authenticated. Run: gh auth login"; exit 1; }

REPO="${REPO:-kesslerio/attio-mcp-server}"

# Show usage if no arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 \"Issue Title\" \"Issue Body\" [labels...]"
    echo ""
    echo "Example:"
    echo "  $0 \"Bug: API timeout\" \"Description...\" P2 type:bug area:api status:untriaged"
    echo ""
    echo "Required label categories:"
    echo "  Priority: P0, P1, P2, P3, P4, P5"
    echo "  Type: type:bug, type:feature, type:enhancement, type:documentation, type:test, type:refactor, type:chore, type:ci, type:dependencies"
    echo "  Status: status:untriaged, status:ready, status:in-progress, status:blocked, status:needs-info, status:review"
    echo "  Area: area:core, area:api, area:build, area:documentation, area:testing, area:performance, etc."
    exit 1
fi

TITLE="${1:?Title required}"; shift
BODY="${1:-}"; shift || true

# Collect labels
LABELS=()
for arg in "$@"; do LABELS+=("$arg"); done

# Normalize: ensure one P*, one type:*, one status:*, at least one area:*
has_p=false; has_type=false; has_status=false; has_area=false
norm=()

for l in "${LABELS[@]}"; do
  low="$(echo "$l" | tr '[:upper:]' '[:lower:]')"
  case "$low" in
    p[0-5])   
      if ! $has_p; then 
        norm+=("$low"); 
        has_p=true; 
      fi ;;
    type:*)   
      if ! $has_type; then 
        norm+=("$low"); 
        has_type=true; 
      fi ;;
    status:*) 
      if ! $has_status; then 
        norm+=("$low"); 
        has_status=true; 
      fi ;;
    area:*)   
      has_area=true; 
      norm+=("$low") ;;
    *)        
      norm+=("$low") ;;
  esac
done

# Add defaults for missing required categories
if ! $has_status; then 
  norm+=("status:untriaged")
  echo "⚠️  No status specified, defaulting to status:untriaged"
fi

# Validate required categories
missing=()
if ! $has_p; then missing+=("Priority (P0-P5)"); fi
if ! $has_type; then missing+=("Type (type:bug|feature|...)"); fi
if ! $has_area; then missing+=("Area (area:core|api|...)"); fi

if [ ${#missing[@]} -gt 0 ]; then
  echo "❌ Missing required label categories: ${missing[*]}"
  echo ""
  echo "Please provide all required labels:"
  echo "  Priority: P0 (Critical), P1 (High), P2 (Medium), P3 (Low), P4 (Minor), P5 (Trivial)"
  echo "  Type: type:bug, type:feature, type:enhancement, type:documentation, type:test, type:refactor, type:chore, type:ci, type:dependencies"
  echo "  Area: area:core, area:api, area:build, area:documentation, area:testing, area:performance, area:security, etc."
  exit 1
fi

# Create issue with normalized labels
echo "Creating issue with labels: ${norm[*]}"
issue_url=$(gh issue create -R "$REPO" --title "$TITLE" --body "$BODY" --label "$(IFS=,; echo "${norm[*]}")")

echo "✅ Issue created: $issue_url"
echo "📋 Applied labels: ${norm[*]}"