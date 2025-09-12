#!/bin/bash

# Test script for debugging the daily changelog workflow locally
# Usage: ./scripts/test-changelog.sh

set -e

echo "=== Daily Changelog Test Script ==="
echo "Testing changelog generation locally..."

# Check prerequisites
echo "Checking prerequisites..."
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed"
    exit 1
fi

if ! command -v gh &> /dev/null; then
    echo "⚠️ GitHub CLI not installed - PR creation will be skipped"
    CREATE_PR=false
else
    CREATE_PR=true
fi

# Check git status
echo "Current git status:"
git status --short

# Get recent commits
echo ""
echo "Recent commits (last 24 hours):"
COMMITS=$(git log --since="1 day ago" --oneline --no-merges | grep -E "(Fix|Feature|Add|Update|Improve|Remove|Refactor)" || true)

if [ -z "$COMMITS" ]; then
    echo "No meaningful changes in the last 24 hours"
    echo "For testing, showing commits from last 7 days:"
    COMMITS=$(git log --since="7 days ago" --oneline --no-merges | head -10)
fi

echo "$COMMITS"

# Categorize commits
echo ""
echo "Categorizing commits..."
FEATURES=$(echo "$COMMITS" | grep -E "(Feature|Add)" || true)
FIXES=$(echo "$COMMITS" | grep -E "(Fix|Improve)" || true)  
CHANGES=$(echo "$COMMITS" | grep -E "(Update|Refactor|Change)" || true)

# Generate changelog content
TODAY=$(date +%Y-%m-%d)
BRANCH_NAME="test/changelog-${TODAY}-$(date +%H%M%S)"

echo ""
echo "Generated changelog content:"
echo "## [$TODAY] - Daily Update"
echo ""

if [ ! -z "$FEATURES" ]; then
    echo "### Added"
    echo "$FEATURES" | while read line; do
        if [ ! -z "$line" ]; then
            echo "- ${line#* }"
        fi
    done
    echo ""
fi

if [ ! -z "$FIXES" ]; then
    echo "### Fixed"
    echo "$FIXES" | while read line; do
        if [ ! -z "$line" ]; then
            echo "- ${line#* }"
        fi
    done
    echo ""
fi

if [ ! -z "$CHANGES" ]; then
    echo "### Changed"
    echo "$CHANGES" | while read line; do  
        if [ ! -z "$line" ]; then
            echo "- ${line#* }"
        fi
    done
    echo ""
fi

# Ask for confirmation before making changes
echo ""
read -p "Do you want to create a test branch and update CHANGELOG.md? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating test branch: $BRANCH_NAME"
    git checkout -b "$BRANCH_NAME"
    
    # Create a backup
    cp CHANGELOG.md CHANGELOG.md.backup
    echo "Created backup: CHANGELOG.md.backup"
    
    # Update changelog (simplified version for testing)
    echo "Updating CHANGELOG.md..."
    
    # For testing, just add a comment
    sed -i.tmp "s/## \[Unreleased\]/## [Unreleased]\n\n<!-- TEST CHANGELOG ENTRY - $(date) -->\n## [$TODAY] - Daily Update (TEST)\n\n### Test\n- Test changelog generation/" CHANGELOG.md
    rm CHANGELOG.md.tmp 2>/dev/null || true
    
    echo "✅ CHANGELOG.md updated (test entry added)"
    
    # Show diff
    echo ""
    echo "Changes made:"
    git diff CHANGELOG.md
    
    echo ""
    read -p "Commit changes? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add CHANGELOG.md
        git commit -m "test: Daily changelog generation test - $TODAY"
        echo "✅ Changes committed"
        
        echo ""
        read -p "Push to remote? (y/N): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git push -u origin HEAD
            echo "✅ Branch pushed to remote"
            
            if [ "$CREATE_PR" = true ]; then
                echo ""
                read -p "Create test PR? (y/N): " -n 1 -r
                echo ""
                
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    gh pr create --title "test: Daily changelog for $TODAY" --body "Test PR for changelog automation workflow"
                    echo "✅ Test PR created"
                fi
            fi
        fi
    fi
    
    echo ""
    echo "To clean up test changes:"
    echo "  git checkout main"
    echo "  git branch -D $BRANCH_NAME"
    echo "  mv CHANGELOG.md.backup CHANGELOG.md  # if you want to restore backup"
    
else
    echo "Test cancelled - no changes made"
fi

echo ""
echo "=== Test Complete ==="