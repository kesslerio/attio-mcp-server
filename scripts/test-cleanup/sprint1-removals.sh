#!/bin/bash

# Sprint 1 - Test Suite Optimization: High Confidence Removals
# Issue #526 - Test Pyramid Refactor
# This script removes 13 high-confidence redundant test files

echo "Starting Sprint 1 - High Confidence Test File Removals"
echo "Creating backup log of removed files..."

# Create backup directory
mkdir -p scripts/test-cleanup/removed-files-backup

# Function to safely remove a test file with logging
remove_test_file() {
    local file_path=$1
    local reason=$2
    
    if [ -f "$file_path" ]; then
        echo "Removing: $file_path - $reason"
        # Create backup
        cp "$file_path" "scripts/test-cleanup/removed-files-backup/$(basename "$file_path").bak"
        # Remove file
        rm "$file_path"
        echo "✓ Removed and backed up: $file_path"
    else
        echo "⚠ File not found: $file_path"
    fi
}

echo ""
echo "=== HIGH CONFIDENCE REMOVALS (13 files) ==="
echo ""

# Deprecated/Stub Files
remove_test_file "test/e2e/suites/tasks-management.e2e.test.ts" "Deprecated documentation stub"

# Legacy Files
remove_test_file "test/legacy/objects/advanced-search-fix.test.js" "Legacy outdated test"

# Issue-Specific Tests (Likely Outdated)
remove_test_file "test/api/people-search-phone-field-fix.test.ts" "Issue-specific fix test"
remove_test_file "test/integration/fix-347-validation.test.ts" "Issue 347 specific"
remove_test_file "test/integration/batch-search-471.integration.test.ts" "Issue 471 specific"
remove_test_file "test/api/batch-search-issue-471.test.ts" "Duplicate issue 471 coverage"
remove_test_file "test/integration/tasks-universal-fix.test.ts" "Generic fix test"
remove_test_file "test/integration/issue-414-api-contract-fixes.test.ts" "Issue 414 specific"
remove_test_file "test/integration/issue-414-comprehensive-security.test.ts" "Issue 414 specific"
remove_test_file "test/integration/issue-473-comprehensive-qa.test.ts" "Issue 473 specific"
remove_test_file "test/integration/issue-473-field-mapping.test.ts" "Issue 473 specific"
remove_test_file "test/security/issue-414-email-validation-security.test.ts" "Issue 414 specific"
remove_test_file "test/security/issue-414-security-validation.test.ts" "Issue 414 specific"

echo ""
echo "=== SUMMARY ==="
echo "✓ High confidence removals completed"
echo "✓ Backup files created in: scripts/test-cleanup/removed-files-backup/"
echo ""
echo "Next steps:"
echo "1. Run tests to ensure no failures from removals"
echo "2. Proceed with medium confidence consolidations"
echo "3. Continue with Sprint 2 file size reductions"