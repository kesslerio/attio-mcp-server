#!/bin/bash
# cleanup-test-data.sh - Shell wrapper for test data cleanup utility
# 
# This script provides a convenient shell interface to the TypeScript cleanup utility.
# It validates the environment and executes the cleanup with proper error handling.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLEANUP_SCRIPT="$SCRIPT_DIR/cleanup-test-data.ts"

# Print colored output
print_color() {
    local color=$1
    shift
    echo -e "${color}$*${NC}"
}

# Print help
print_help() {
    print_color $BLUE "🧹 Attio Test Data Cleanup - Shell Wrapper"
    echo ""
    echo "USAGE:"
    echo "  ./cleanup-test-data.sh [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  --dry-run             Preview what would be deleted (default)"
    echo "  --live                Perform actual deletion"
    echo "  --prefix=PREFIX,...   Comma-separated test prefixes (default: TEST_,QA_,E2E_)"
    echo "  --resource-type=TYPE  Resource types: companies,people,tasks,lists,notes,all"
    echo "  --parallel=N          Number of parallel operations (default: 5)"
    echo "  --verbose, -v         Verbose output"
    echo "  --help, -h            Show this help"
    echo ""
    echo "EXAMPLES:"
    echo "  ./cleanup-test-data.sh                                    # Dry run all resources"
    echo "  ./cleanup-test-data.sh --live                             # Live deletion"
    echo "  ./cleanup-test-data.sh --prefix=DEMO_,TEMP_               # Custom prefixes"
    echo "  ./cleanup-test-data.sh --resource-type=companies --live   # Only companies"
    echo ""
    echo "SAFETY FEATURES:"
    echo "  ✅ Dry run mode by default"
    echo "  ✅ Environment validation"
    echo "  ✅ Confirmation prompts"
    echo "  ✅ Rate limiting and error handling"
}

# Validate environment
validate_environment() {
    print_color $BLUE "🔍 Validating environment..."
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]]; then
        print_color $RED "❌ Error: package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # Check if cleanup script exists
    if [[ ! -f "$CLEANUP_SCRIPT" ]]; then
        print_color $RED "❌ Error: Cleanup script not found at $CLEANUP_SCRIPT"
        exit 1
    fi
    
    # Check for .env file
    if [[ ! -f ".env" ]] && [[ -z "${ATTIO_API_KEY:-}" ]]; then
        print_color $YELLOW "⚠️  Warning: No .env file found and ATTIO_API_KEY not set"
        print_color $YELLOW "   Please ensure ATTIO_API_KEY is available in your environment"
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_color $YELLOW "Cancelled by user"
            exit 0
        fi
    fi
    
    # Check Node.js and npm
    if ! command -v node &> /dev/null; then
        print_color $RED "❌ Error: Node.js is required but not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_color $RED "❌ Error: npm is required but not installed"
        exit 1
    fi
    
    # Check for tsx (TypeScript execution)
    if ! npm list tsx &> /dev/null && ! npm list -g tsx &> /dev/null; then
        print_color $YELLOW "⚠️  tsx not found. Installing tsx..."
        npm install --save-dev tsx || {
            print_color $RED "❌ Error: Failed to install tsx"
            exit 1
        }
    fi
    
    print_color $GREEN "✅ Environment validation passed"
    echo ""
}

# Main execution
main() {
    # Parse help flag early
    for arg in "$@"; do
        if [[ "$arg" == "--help" ]] || [[ "$arg" == "-h" ]]; then
            print_help
            exit 0
        fi
    done
    
    print_color $BLUE "🧹 Attio Test Data Cleanup"
    print_color $BLUE "=========================="
    echo ""
    
    # Validate environment
    validate_environment
    
    # Determine if this is a live run
    local is_live=false
    for arg in "$@"; do
        if [[ "$arg" == "--live" ]] || [[ "$arg" == "--dry-run=false" ]]; then
            is_live=true
            break
        fi
    done
    
    # Show warning for live runs
    if [[ "$is_live" == true ]]; then
        print_color $RED "⚠️  WARNING: LIVE DELETION MODE"
        print_color $RED "   This will permanently delete test data from your Attio workspace!"
        echo ""
        print_color $YELLOW "💡 Use --dry-run to preview what would be deleted first"
        echo ""
        
        read -p "Are you sure you want to proceed with live deletion? (yes/no): " -r
        echo ""
        if [[ ! $REPLY == "yes" ]]; then
            print_color $YELLOW "Cancelled by user"
            exit 0
        fi
    else
        print_color $GREEN "🔍 Running in dry-run mode (safe preview)"
        echo ""
    fi
    
    # Execute the TypeScript cleanup script
    print_color $BLUE "🚀 Executing cleanup script..."
    echo ""
    
    if command -v npx &> /dev/null; then
        npx tsx "$CLEANUP_SCRIPT" "$@"
    else
        # Fallback to npm script
        npm_args=""
        if [[ $# -gt 0 ]]; then
            npm_args="-- $*"
        fi
        npm run tsx "$CLEANUP_SCRIPT" $npm_args
    fi
    
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        echo ""
        print_color $GREEN "✅ Cleanup script completed successfully!"
        
        if [[ "$is_live" == false ]]; then
            echo ""
            print_color $BLUE "💡 To perform actual cleanup, run with --live flag:"
            print_color $BLUE "   ./cleanup-test-data.sh --live"
        fi
    else
        echo ""
        print_color $RED "❌ Cleanup script failed with exit code $exit_code"
        exit $exit_code
    fi
}

# Execute main function with all arguments
main "$@"