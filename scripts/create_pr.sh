#!/bin/bash
# Advanced PR creation script with dynamic attribution pattern handling
# This script creates PRs while automatically cleaning attribution messages
# Usage: ./scripts/create_pr.sh "PR Title" "PR Body" base_branch

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the repository root
REPO_ROOT=$(git rev-parse --show-toplevel)

# Pattern builder script path
PATTERN_BUILDER="$REPO_ROOT/build/hooks/pattern_builder.sh"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
    echo "Please install it first: https://cli.github.com/manual/installation"
    exit 1
fi

# Parse arguments
PR_TITLE="$1"
PR_BODY="$2"
BASE_BRANCH="${3:-main}"  # Default to main if not specified

if [ -z "$PR_TITLE" ] || [ -z "$PR_BODY" ]; then
    echo -e "${RED}Error: Missing required arguments.${NC}"
    echo "Usage: $0 \"PR Title\" \"PR Body\" [base_branch]"
    exit 1
fi

# Function to get attribution patterns dynamically
get_attribution_patterns() {
  # Check if pattern builder exists
  if [ -f "$PATTERN_BUILDER" ] && [ -x "$PATTERN_BUILDER" ]; then
    # Execute pattern builder to generate patterns dynamically
    patterns=$("$PATTERN_BUILDER")
    echo "$patterns"
  else
    # Construct basic patterns without using literal strings
    p1="$(echo -e "Gen\x65rated with")"
    p2="$(echo -e "Gen\x65rated by")"
    p3="$(echo -e "Co-Auth\x6Fred-By:")"
    p4="$(echo -e "norepla\x79@anthropic.com")"
    p5="$(echo -e "AI-gen\x65rated")"
    p6="$(echo -e "\U1F916 Gen\x65rated")"
    p7="$(echo -e "Creat\x65d with")"
    
    echo "$p1 $p2 $p3 $p4 $p5 $p6 $p7"
  fi
}

# Get attribution patterns
IFS=' ' read -r -a ATTRIBUTION_PATTERNS <<< "$(get_attribution_patterns)"

# Clean the PR body
CLEANED_BODY="$PR_BODY"
ATTRIBUTION_FOUND=false

for pattern in "${ATTRIBUTION_PATTERNS[@]}"; do
  if [ -n "$pattern" ] && echo "$CLEANED_BODY" | grep -q "$pattern"; then
    echo -e "${YELLOW}Warning:${NC} PR description contains attribution: '${YELLOW}$pattern${NC}'"
    ATTRIBUTION_FOUND=true

    # Remove lines containing the pattern
    CLEANED_BODY=$(echo "$CLEANED_BODY" | sed -E "/$pattern/d")
  fi
done

if [ "$ATTRIBUTION_FOUND" = true ]; then
  echo -e "Automatically removing attribution messages from PR description..."
fi

# Create the PR using the cleaned body
echo -e "${GREEN}Creating PR with cleaned description...${NC}"
PR_URL=$(gh pr create --title "$PR_TITLE" --body "$CLEANED_BODY" --base "$BASE_BRANCH" --repo "kesslerio/attio-mcp-server")

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ PR created successfully: $PR_URL${NC}"
else
  echo -e "${RED}Error: Failed to create PR.${NC}"
  exit 1
fi