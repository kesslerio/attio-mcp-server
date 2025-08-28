#!/bin/bash
set -e

# Emergency Rollback System
# Quick recovery from problematic commits or CI failures

echo "🚨 Emergency Rollback System"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
FORCE=false
BACKUP_BRANCH=""
TARGET_COMMIT=""
AUTO_PUSH=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --to-commit)
      TARGET_COMMIT="$2"
      shift 2
      ;;
    --backup-branch)
      BACKUP_BRANCH="$2"
      shift 2
      ;;
    --auto-push)
      AUTO_PUSH=true
      shift
      ;;
    --help|-h)
      cat << EOF
Emergency Rollback System

Usage: ./scripts/emergency-rollback.sh [options]

Options:
  --to-commit <hash>    Rollback to specific commit (default: HEAD~1)
  --backup-branch <name> Create backup branch before rollback (recommended)
  --dry-run            Show what would be done without making changes
  --force              Force rollback even with uncommitted changes
  --auto-push          Automatically push rollback (use with extreme caution)
  --help, -h           Show this help message

Emergency Scenarios:
  1. Bad commit pushed to main:
     ./scripts/emergency-rollback.sh --to-commit abc1234 --backup-branch emergency-backup

  2. CI failure needs immediate revert:
     ./scripts/emergency-rollback.sh --backup-branch pre-rollback --auto-push

  3. Test rollback (safe):
     ./scripts/emergency-rollback.sh --dry-run --to-commit HEAD~2

IMPORTANT: This script performs destructive operations. Always use --backup-branch
in production scenarios. Consider using --dry-run first to preview actions.

Examples:
  # Safe rollback with backup
  ./scripts/emergency-rollback.sh --backup-branch emergency-$(date +%Y%m%d-%H%M%S)
  
  # Rollback to specific commit
  ./scripts/emergency-rollback.sh --to-commit HEAD~3 --backup-branch before-rollback
  
  # Quick test (no changes)
  ./scripts/emergency-rollback.sh --dry-run
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Set default target if not specified
if [[ -z "$TARGET_COMMIT" ]]; then
  TARGET_COMMIT="HEAD~1"
fi

# Function to run command with dry-run support
run_command() {
  local description="$1"
  local command="$2"
  local critical="${3:-false}"
  
  echo "${BLUE}🔄 $description${NC}"
  
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "${YELLOW}[DRY RUN] Would execute: $command${NC}"
    return 0
  fi
  
  if eval "$command"; then
    echo "${GREEN}✅ $description completed${NC}"
    return 0
  else
    echo "${RED}❌ $description failed${NC}"
    if [[ "$critical" == "true" ]]; then
      echo "${RED}Critical operation failed. Aborting rollback.${NC}"
      exit 1
    fi
    return 1
  fi
}

# Function to validate git state
validate_git_state() {
  echo "${BLUE}🔍 Validating git repository state...${NC}"
  
  # Check if we're in a git repository
  if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "${RED}❌ Not in a git repository${NC}"
    exit 1
  fi
  
  # Check for uncommitted changes
  if ! git diff --quiet || ! git diff --cached --quiet; then
    if [[ "$FORCE" != "true" ]]; then
      echo "${RED}❌ Uncommitted changes detected${NC}"
      echo "${YELLOW}Use --force to override or commit/stash changes first${NC}"
      echo ""
      echo "Uncommitted changes:"
      git status --porcelain
      exit 1
    else
      echo "${YELLOW}⚠️ Uncommitted changes detected but --force specified${NC}"
    fi
  fi
  
  # Validate target commit exists
  if ! git rev-parse --verify "$TARGET_COMMIT" > /dev/null 2>&1; then
    echo "${RED}❌ Target commit '$TARGET_COMMIT' does not exist${NC}"
    exit 1
  fi
  
  # Get current branch
  CURRENT_BRANCH=$(git branch --show-current)
  if [[ -z "$CURRENT_BRANCH" ]]; then
    echo "${RED}❌ Not on any branch (detached HEAD)${NC}"
    exit 1
  fi
  
  echo "${GREEN}✅ Git repository state valid${NC}"
  echo "  Current branch: $CURRENT_BRANCH"
  echo "  Target commit: $(git rev-parse --short $TARGET_COMMIT)"
  echo "  Current commit: $(git rev-parse --short HEAD)"
}

# Function to create backup
create_backup() {
  if [[ -n "$BACKUP_BRANCH" ]]; then
    echo "${BLUE}💾 Creating backup branch...${NC}"
    run_command "Create backup branch '$BACKUP_BRANCH'" \
      "git branch $BACKUP_BRANCH" true
    
    echo "${GREEN}✅ Backup created at branch: $BACKUP_BRANCH${NC}"
    echo "${BLUE}💡 To restore later: git checkout $BACKUP_BRANCH${NC}"
  else
    echo "${YELLOW}⚠️ No backup branch specified${NC}"
    echo "${YELLOW}   Consider using --backup-branch for safety${NC}"
    
    if [[ "$FORCE" != "true" ]]; then
      echo "${RED}❌ Backup recommended for safety. Use --force to override${NC}"
      exit 1
    fi
  fi
}

# Function to perform rollback
perform_rollback() {
  echo "${BLUE}🔄 Performing rollback...${NC}"
  
  # Reset to target commit
  run_command "Reset to target commit" \
    "git reset --hard $TARGET_COMMIT" true
  
  # Clean untracked files
  run_command "Clean untracked files" \
    "git clean -fd" false
  
  echo "${GREEN}✅ Rollback completed${NC}"
  echo "  Rolled back from: $(git rev-parse --short $BACKUP_BRANCH 2>/dev/null || echo 'previous HEAD')"
  echo "  Current commit: $(git rev-parse --short HEAD)"
}

# Function to validate post-rollback state
validate_post_rollback() {
  echo "${BLUE}🔍 Validating post-rollback state...${NC}"
  
  # Check if rollback was successful
  local current_commit=$(git rev-parse HEAD)
  local target_commit_full=$(git rev-parse $TARGET_COMMIT)
  
  if [[ "$current_commit" != "$target_commit_full" ]]; then
    echo "${RED}❌ Rollback failed - not at target commit${NC}"
    return 1
  fi
  
  # Quick build test
  echo "${BLUE}🔨 Testing build after rollback...${NC}"
  if npm run build > /dev/null 2>&1; then
    echo "${GREEN}✅ Build successful after rollback${NC}"
  else
    echo "${YELLOW}⚠️ Build failed after rollback - may need manual fixes${NC}"
    return 1
  fi
  
  # Quick lint check
  echo "${BLUE}🔍 Testing lint after rollback...${NC}"
  if npm run lint:check > /dev/null 2>&1; then
    echo "${GREEN}✅ Lint check passed after rollback${NC}"
  else
    echo "${YELLOW}⚠️ Lint issues after rollback - may need manual fixes${NC}"
  fi
  
  return 0
}

# Function to push changes
push_changes() {
  if [[ "$AUTO_PUSH" == "true" ]]; then
    echo "${BLUE}🚀 Pushing rollback changes...${NC}"
    
    # Warning for force push
    echo "${RED}⚠️ WARNING: About to force push rollback changes${NC}"
    echo "${RED}   This will overwrite remote history${NC}"
    
    if [[ "$DRY_RUN" != "true" ]]; then
      sleep 3  # Give time to cancel
    fi
    
    run_command "Force push rollback" \
      "git push --force-with-lease origin $CURRENT_BRANCH" true
      
    echo "${GREEN}✅ Rollback pushed to remote${NC}"
  else
    echo "${YELLOW}📌 Rollback completed locally${NC}"
    echo "${YELLOW}   Use 'git push --force-with-lease' to push to remote${NC}"
    echo "${YELLOW}   Or add --auto-push flag (use with caution)${NC}"
  fi
}

# Function to generate rollback report
generate_report() {
  local report_file="rollback-report-$(date +%Y%m%d-%H%M%S).md"
  
  cat > "$report_file" << EOF
# Emergency Rollback Report

**Date**: $(date)
**Executed by**: $(whoami)
**Branch**: $CURRENT_BRANCH
**Target Commit**: $TARGET_COMMIT ($(git log --oneline -1 $TARGET_COMMIT))

## Rollback Details

- **Backup Branch**: ${BACKUP_BRANCH:-"None created"}
- **Dry Run**: $DRY_RUN
- **Force Used**: $FORCE
- **Auto Push**: $AUTO_PUSH

## Commit History

### Before Rollback
\`\`\`
$(git log --oneline -5 $BACKUP_BRANCH 2>/dev/null || echo "No backup branch")
\`\`\`

### After Rollback
\`\`\`
$(git log --oneline -5 HEAD)
\`\`\`

## Validation Results

- Build Test: $(npm run build > /dev/null 2>&1 && echo "✅ Passed" || echo "❌ Failed")
- Lint Check: $(npm run lint:check > /dev/null 2>&1 && echo "✅ Passed" || echo "❌ Failed")

## Recovery Instructions

To undo this rollback (if needed):
\`\`\`bash
# If backup branch was created
git checkout $CURRENT_BRANCH
git reset --hard ${BACKUP_BRANCH:-"origin/$CURRENT_BRANCH"}

# Alternative: use reflog
git reflog
git reset --hard HEAD@{N}  # where N is the desired state
\`\`\`

---
Generated by Emergency Rollback System
EOF

  echo "${GREEN}📄 Rollback report saved: $report_file${NC}"
}

# Main execution flow
main() {
  echo "${BLUE}🚨 Starting emergency rollback process...${NC}"
  echo ""
  
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "${YELLOW}🧪 DRY RUN MODE - No actual changes will be made${NC}"
    echo ""
  fi
  
  # Step 1: Validate git state
  validate_git_state
  echo ""
  
  # Step 2: Create backup
  create_backup
  echo ""
  
  # Step 3: Perform rollback
  perform_rollback
  echo ""
  
  # Step 4: Validate post-rollback
  if validate_post_rollback; then
    echo "${GREEN}✅ Post-rollback validation passed${NC}"
  else
    echo "${YELLOW}⚠️ Post-rollback validation had issues${NC}"
  fi
  echo ""
  
  # Step 5: Push changes (if requested)
  push_changes
  echo ""
  
  # Step 6: Generate report
  if [[ "$DRY_RUN" != "true" ]]; then
    generate_report
  fi
  
  # Summary
  echo "${GREEN}✅ Emergency rollback completed!${NC}"
  echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "${BLUE}📋 Summary:${NC}"
  echo "  Current commit: $(git rev-parse --short HEAD)"
  echo "  Backup branch: ${BACKUP_BRANCH:-"None"}"
  echo "  Report file: ${report_file:-"None (dry run)"}"
  echo ""
  echo "${BLUE}🔧 Next steps:${NC}"
  echo "  1. Verify application works correctly"
  echo "  2. Run full test suite: npm test"
  echo "  3. Deploy if needed"
  if [[ "$AUTO_PUSH" != "true" && "$DRY_RUN" != "true" ]]; then
    echo "  4. Push changes: git push --force-with-lease"
  fi
}

# Execute main function
main