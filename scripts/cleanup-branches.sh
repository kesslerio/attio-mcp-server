#!/bin/bash

# Git Branch Cleanup Script
# Cleans up merged branches following git best practices

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
CLEAN_REMOTE=false
FORCE=false

# Protected branches (never delete these)
PROTECTED_BRANCHES=(
    "main"
    "develop"
    "master"
    "staging"
    "production"
)

# Protected patterns (never delete branches matching these patterns)
PROTECTED_PATTERNS=(
    "backup/"
    "hotfix/"
    "release/"
)

# Open PR branches (fetched dynamically)
OPEN_PR_BRANCHES=()

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

OPTIONS:
    -d, --dry-run       Show what would be deleted without actually deleting
    -r, --remote        Also clean up remote branches (dangerous!)
    -f, --force         Force deletion of unmerged branches
    -h, --help          Show this help message

EXAMPLES:
    $0 --dry-run                    # Preview what would be deleted
    $0                              # Delete local merged branches only
    $0 --remote --dry-run           # Preview local + remote cleanup
    $0 --remote                     # Delete local + remote merged branches

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -r|--remote)
            CLEAN_REMOTE=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get open PR branches to avoid deleting them
get_open_pr_branches() {
    log "Fetching open PR branches..."

    if command -v gh &> /dev/null; then
        while IFS= read -r branch; do
            OPEN_PR_BRANCHES+=("$branch")
        done < <(gh pr list --state open --json headRefName --jq '.[].headRefName' 2>/dev/null || true)

        if [[ ${#OPEN_PR_BRANCHES[@]} -gt 0 ]]; then
            log "Found ${#OPEN_PR_BRANCHES[@]} open PR branches: ${OPEN_PR_BRANCHES[*]}"
        fi
    else
        warning "GitHub CLI (gh) not found. Cannot check for open PRs automatically."
        warning "Please verify no important branches are deleted."
    fi
}

# Check if branch is protected
is_protected_branch() {
    local branch=$1

    # Check against protected branch names
    for protected in "${PROTECTED_BRANCHES[@]}"; do
        if [[ "$branch" == "$protected" ]]; then
            return 0
        fi
    done

    # Check against protected patterns
    for pattern in "${PROTECTED_PATTERNS[@]}"; do
        if [[ "$branch" == $pattern* ]]; then
            return 0
        fi
    done

    # Check against open PR branches
    for pr_branch in "${OPEN_PR_BRANCHES[@]}"; do
        if [[ "$branch" == "$pr_branch" ]]; then
            return 0
        fi
    done

    return 1
}

# Get merged branches
get_merged_branches() {
    local target_branch=${1:-"main"}
    local branch_type=${2:-"local"}  # local or remote

    if [[ "$branch_type" == "remote" ]]; then
        git branch -r --merged "origin/$target_branch" | \
            grep -v -E "(origin/$target_branch$|origin/HEAD)" | \
            sed 's/origin\///' | \
            sed 's/^[[:space:]]*//'
    else
        git branch --merged "$target_branch" | \
            grep -v -E "(^\*|^[[:space:]]*$target_branch$)" | \
            sed 's/^[[:space:]]*//'
    fi
}

# Delete branches
delete_branches() {
    local branch_type=$1
    shift
    local branches=("$@")

    local deleted_count=0
    local skipped_count=0

    for branch in "${branches[@]}"; do
        if is_protected_branch "$branch"; then
            warning "Skipping protected branch: $branch"
            ((skipped_count++))
            continue
        fi

        if [[ "$DRY_RUN" == true ]]; then
            log "Would delete $branch_type branch: $branch"
        else
            if [[ "$branch_type" == "remote" ]]; then
                if git push origin --delete "$branch" 2>/dev/null; then
                    success "Deleted remote branch: $branch"
                    ((deleted_count++))
                else
                    error "Failed to delete remote branch: $branch"
                fi
            else
                local delete_flag="-d"
                if [[ "$FORCE" == true ]]; then
                    delete_flag="-D"
                fi

                if git branch $delete_flag "$branch" 2>/dev/null; then
                    success "Deleted local branch: $branch"
                    ((deleted_count++))
                else
                    error "Failed to delete local branch: $branch"
                    if [[ "$FORCE" != true ]]; then
                        warning "Use --force to delete unmerged branches"
                    fi
                fi
            fi
        fi
    done

    log "Processed $branch_type branches: $deleted_count deleted, $skipped_count skipped"
}

# Main cleanup function
cleanup_branches() {
    log "Starting git branch cleanup..."

    if [[ "$DRY_RUN" == true ]]; then
        warning "DRY RUN MODE - No branches will actually be deleted"
    fi

    # Fetch latest from remote
    log "Fetching latest changes..."
    git fetch --prune origin

    # Get open PR branches
    get_open_pr_branches

    # Clean up local merged branches
    log "Processing local merged branches..."
    local_merged=()
    while IFS= read -r branch; do
        [[ -n "$branch" ]] && local_merged+=("$branch")
    done < <(get_merged_branches "main" "local")

    if [[ ${#local_merged[@]} -gt 0 ]]; then
        log "Found ${#local_merged[@]} local merged branches"
        delete_branches "local" "${local_merged[@]}"
    else
        log "No local merged branches found"
    fi

    # Clean up remote merged branches (if requested)
    if [[ "$CLEAN_REMOTE" == true ]]; then
        log "Processing remote merged branches..."
        remote_merged=()
        while IFS= read -r branch; do
            [[ -n "$branch" ]] && remote_merged+=("$branch")
        done < <(get_merged_branches "main" "remote")

        if [[ ${#remote_merged[@]} -gt 0 ]]; then
            log "Found ${#remote_merged[@]} remote merged branches"
            warning "About to delete remote branches - this affects all developers!"
            if [[ "$DRY_RUN" != true ]]; then
                read -p "Are you sure? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    delete_branches "remote" "${remote_merged[@]}"
                else
                    log "Remote branch cleanup cancelled"
                fi
            else
                delete_branches "remote" "${remote_merged[@]}"
            fi
        else
            log "No remote merged branches found"
        fi
    fi

    success "Branch cleanup completed!"

    # Show final stats
    log "Final branch counts:"
    log "  Local branches: $(git branch | wc -l | tr -d ' ')"
    log "  Remote branches: $(git branch -r | wc -l | tr -d ' ')"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error "Not in a git repository"
    exit 1
fi

# Check if we're on main branch (recommended)
current_branch=$(git branch --show-current)
if [[ "$current_branch" != "main" ]]; then
    warning "Currently on branch '$current_branch', not 'main'"
    warning "Some branches might not be detected as merged"
fi

# Run the cleanup
cleanup_branches