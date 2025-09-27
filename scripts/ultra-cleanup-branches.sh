#!/bin/bash

# Ultra-Aggressive Git Branch Cleanup
# Targets old AI-generated and experimental branches

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DRY_RUN=false
CUTOFF_DAYS=30
CLEAN_REMOTE=false

usage() {
    cat << EOF
Ultra-aggressive branch cleanup targeting AI-generated and experimental branches.

Usage: $0 [OPTIONS]

OPTIONS:
    -d, --dry-run       Preview what would be deleted
    --days DAYS         Only delete branches older than DAYS (default: 30)
    -r, --remote        Also clean remote branches (DESTRUCTIVE!)
    -h, --help          Show help

TARGETS FOR DELETION:
    - claude/* branches (AI-generated)
    - codex/* branches (AI-generated)
    - Old feature/* branches (>30 days)
    - Old fix/* branches (>30 days)
    - Experimental patterns

PROTECTED:
    - Current branch
    - Open PR branches
    - backup/* branches
    - Main/develop branches
    - Recently active branches (<30 days)

EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dry-run) DRY_RUN=true; shift ;;
        --days) CUTOFF_DAYS="$2"; shift 2 ;;
        -r|--remote) CLEAN_REMOTE=true; shift ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown option: $1"; usage; exit 1 ;;
    esac
done

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Get open PR branches
get_open_pr_branches() {
    if command -v gh &> /dev/null; then
        gh pr list --state open --json headRefName --jq '.[].headRefName' 2>/dev/null || true
    fi
}

# Check if branch should be protected
is_protected() {
    local branch=$1
    local current_branch=$(git branch --show-current)

    # Current branch
    [[ "$branch" == "$current_branch" ]] && return 0

    # Protected patterns
    [[ "$branch" =~ ^(main|develop|master|staging|production)$ ]] && return 0
    [[ "$branch" =~ ^backup/ ]] && return 0
    [[ "$branch" =~ ^hotfix/ ]] && return 0
    [[ "$branch" =~ ^release/ ]] && return 0

    # Open PR branches
    while IFS= read -r pr_branch; do
        [[ "$branch" == "$pr_branch" ]] && return 0
    done < <(get_open_pr_branches)

    return 1
}

# Get branch age in days
get_branch_age() {
    local branch=$1
    local last_commit=$(git log -1 --format=%ct "$branch" 2>/dev/null || echo "0")
    local now=$(date +%s)
    echo $(( (now - last_commit) / 86400 ))
}

# Check if branch matches aggressive cleanup criteria
should_delete_aggressively() {
    local branch=$1
    local age=$(get_branch_age "$branch")

    # Always target AI-generated branches
    if [[ "$branch" =~ ^claude/ ]] || [[ "$branch" =~ ^codex/ ]]; then
        return 0
    fi

    # Target old experimental branches
    if [[ "$age" -gt "$CUTOFF_DAYS" ]]; then
        if [[ "$branch" =~ ^(feature/|fix/|chore/|refactor/|test/) ]]; then
            return 0
        fi
    fi

    # Target very old branches regardless of pattern
    if [[ "$age" -gt 90 ]]; then
        return 0
    fi

    return 1
}

# Main cleanup
ultra_cleanup() {
    log "🚀 Starting ULTRA-AGGRESSIVE branch cleanup..."
    [[ "$DRY_RUN" == true ]] && warning "DRY RUN MODE - No branches will actually be deleted"

    git fetch --prune origin >/dev/null 2>&1

    # Clean local branches
    cleanup_local_branches

    # Clean remote branches if requested
    if [[ "$CLEAN_REMOTE" == true ]]; then
        cleanup_remote_branches
    fi

    success "Ultra cleanup completed!"
}

cleanup_local_branches() {
    local total_branches=$(git branch | wc -l | tr -d ' ')
    local deleted=0
    local protected=0
    local skipped=0

    log "Analyzing $total_branches local branches (cutoff: ${CUTOFF_DAYS} days)..."

    # Process each branch
    while IFS= read -r branch; do
        branch=$(echo "$branch" | sed 's/^[* ] *//')
        [[ -z "$branch" ]] && continue

        if is_protected "$branch"; then
            ((protected++))
            continue
        fi

        if should_delete_aggressively "$branch"; then
            local age=$(get_branch_age "$branch")

            if [[ "$DRY_RUN" == true ]]; then
                log "Would delete local: $branch (${age} days old)"
            else
                if git branch -D "$branch" >/dev/null 2>&1; then
                    success "Deleted local: $branch (${age} days old)"
                    ((deleted++))
                else
                    error "Failed to delete local: $branch"
                fi
            fi
        else
            ((skipped++))
        fi
    done < <(git branch)

    log "Local cleanup results:"
    log "  🗑️  Deleted: $deleted branches"
    log "  🛡️  Protected: $protected branches"
    log "  ⏭️  Skipped: $skipped branches"
    log "  📊 Remaining: $(git branch | wc -l | tr -d ' ') branches"
}

cleanup_remote_branches() {
    warning "🌐 REMOTE BRANCH CLEANUP - This affects ALL developers!"

    if [[ "$DRY_RUN" != true ]]; then
        read -p "Are you sure you want to delete remote branches? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Remote cleanup cancelled"
            return
        fi
    fi

    local remote_deleted=0
    local remote_protected=0
    local remote_skipped=0

    log "Processing remote branches..."

    # Process remote branches (strip origin/ prefix)
    while IFS= read -r remote_branch; do
        remote_branch=$(echo "$remote_branch" | sed 's/origin\///' | sed 's/^[* ] *//')
        [[ -z "$remote_branch" ]] && continue
        [[ "$remote_branch" == "HEAD" ]] && continue

        if is_protected "$remote_branch"; then
            ((remote_protected++))
            continue
        fi

        if should_delete_aggressively "$remote_branch"; then
            local age=$(get_branch_age "origin/$remote_branch")

            if [[ "$DRY_RUN" == true ]]; then
                log "Would delete remote: $remote_branch (${age} days old)"
            else
                if git push origin --delete "$remote_branch" >/dev/null 2>&1; then
                    success "Deleted remote: $remote_branch (${age} days old)"
                    ((remote_deleted++))
                else
                    error "Failed to delete remote: $remote_branch"
                fi
            fi
        else
            ((remote_skipped++))
        fi
    done < <(git branch -r | grep -v "HEAD")

    log "Remote cleanup results:"
    log "  🗑️  Deleted: $remote_deleted branches"
    log "  🛡️  Protected: $remote_protected branches"
    log "  ⏭️  Skipped: $remote_skipped branches"
    log "  📊 Remaining remote: $(git branch -r | wc -l | tr -d ' ') branches"
}

# Safety checks
if ! git rev-parse --git-dir >/dev/null 2>&1; then
    error "Not in a git repository"
    exit 1
fi

current_branch=$(git branch --show-current)
if [[ "$current_branch" != "main" && "$current_branch" != "fix/issue-743-smithery-api-key" ]]; then
    warning "On branch '$current_branch' - consider switching to main first"
fi

# Run it
ultra_cleanup