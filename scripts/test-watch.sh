#!/bin/bash

# test-watch.sh - Continuous test runner for development workflow
# Usage: ./scripts/test-watch.sh [pattern] [options]
# Examples:
#   ./scripts/test-watch.sh                    # Watch all tests
#   ./scripts/test-watch.sh companies         # Watch tests matching "companies"
#   ./scripts/test-watch.sh --handlers         # Watch handler tests only
#   ./scripts/test-watch.sh --failed-only     # Show only failed tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${MAGENTA}================================${NC}"
    echo -e "${MAGENTA} Attio MCP Test Watch Runner${NC}"
    echo -e "${MAGENTA}================================${NC}"
    echo
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

print_feature() {
    echo -e "${BLUE}→ $1${NC}"
}

show_help() {
    echo "Usage: $0 [pattern] [options]"
    echo
    echo "Options:"
    echo "  --handlers         Watch handler tests only"
    echo "  --api              Watch API tests only"
    echo "  --utils            Watch utility tests only"
    echo "  --objects          Watch object tests only"
    echo "  --validators       Watch validator tests only"
    echo "  --errors           Watch error handling tests only"
    echo "  --integration      Watch integration tests (requires API key)"
    echo "  --failed-only      Show only failed tests (default: all)"
    echo "  --show-all         Show all test output"
    echo "  --ui               Launch Vitest UI"
    echo "  --changed          Only watch changed files"
    echo "  --coverage         Include coverage in watch mode"
    echo "  --verbose          Verbose output"
    echo "  --help             Show this help"
    echo
    echo "Test Areas:"
    echo "  companies          Watch tests for company operations"
    echo "  people             Watch tests for people operations"
    echo "  lists              Watch tests for list operations"
    echo "  notes              Watch tests for notes operations"
    echo "  tasks              Watch tests for task operations"
    echo "  deals              Watch tests for deal operations"
    echo "  records            Watch tests for record operations"
    echo
    echo "Examples:"
    echo "  $0                                # Watch all tests"
    echo "  $0 companies                      # Watch tests matching 'companies'"
    echo "  $0 --handlers --failed-only       # Watch handlers, show failures only"
    echo "  $0 --ui                           # Launch Vitest UI"
    echo "  $0 --changed                      # Watch only changed files"
    echo "  $0 test/utils/domain-utils.test.ts # Watch specific file"
}

# Parse arguments
PATTERN=""
TEST_TYPE="unit"
FAILED_ONLY=true  # Default to showing only failures for better focus
SHOW_ALL=false
USE_UI=false
CHANGED_ONLY=false
WITH_COVERAGE=false
VERBOSE=false
SPECIFIC_AREAS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --handlers)
            SPECIFIC_AREAS+=("test/handlers/")
            shift
            ;;
        --api)
            SPECIFIC_AREAS+=("test/api/")
            shift
            ;;
        --utils)
            SPECIFIC_AREAS+=("test/utils/")
            shift
            ;;
        --objects)
            SPECIFIC_AREAS+=("test/objects/")
            shift
            ;;
        --validators)
            SPECIFIC_AREAS+=("test/validators/")
            shift
            ;;
        --errors)
            SPECIFIC_AREAS+=("test/errors/")
            shift
            ;;
        --integration)
            TEST_TYPE="integration"
            shift
            ;;
        --failed-only)
            FAILED_ONLY=true
            SHOW_ALL=false
            shift
            ;;
        --show-all)
            SHOW_ALL=true
            FAILED_ONLY=false
            shift
            ;;
        --ui)
            USE_UI=true
            shift
            ;;
        --changed)
            CHANGED_ONLY=true
            shift
            ;;
        --coverage)
            WITH_COVERAGE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --*)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
        *)
            if [[ -z "$PATTERN" ]]; then
                PATTERN="$1"
            else
                print_error "Multiple patterns not supported: $1"
                exit 1
            fi
            shift
            ;;
    esac
done

print_header

# Environment validation for integration tests
if [[ "$TEST_TYPE" == "integration" ]]; then
    if [[ -z "$ATTIO_API_KEY" ]]; then
        print_warning "ATTIO_API_KEY not set. Integration tests may fail."
        print_info "Set ATTIO_API_KEY environment variable or create .env file"
    fi
    
    if [[ -z "$ATTIO_WORKSPACE_ID" ]]; then
        print_warning "ATTIO_WORKSPACE_ID not set. Some tests may fail."
    fi
fi

# Check if we should launch UI
if [[ "$USE_UI" == true ]]; then
    print_info "Launching Vitest UI..."
    print_feature "Web interface will open in your browser"
    print_feature "Great for debugging and interactive testing"
    
    CMD="npx vitest --ui"
    
    # Configure test type for UI
    case "$TEST_TYPE" in
        "unit")
            CMD="$CMD --config vitest.config.offline.ts"
            print_info "UI configured for unit tests (offline)"
            ;;
        "integration")
            CMD="$CMD --config vitest.config.integration.ts"
            print_info "UI configured for integration tests (with API calls)"
            ;;
    esac
    
    echo
    print_info "Command: $CMD"
    echo
    
    exec $CMD
fi

# Build watch command
CMD="npx vitest --watch"

# Configure test type
case "$TEST_TYPE" in
    "unit")
        CMD="$CMD --config vitest.config.offline.ts"
        print_info "Watching unit tests (offline)"
        ;;
    "integration")
        CMD="$CMD --config vitest.config.integration.ts"
        print_info "Watching integration tests (with API calls)"
        ;;
esac

# Add output options
if [[ "$FAILED_ONLY" == true ]]; then
    print_info "Showing failed tests only (use --show-all to see all output)"
    print_feature "Cleaner output for focused debugging"
elif [[ "$SHOW_ALL" == true ]]; then
    print_info "Showing all test output"
    CMD="$CMD --reporter=verbose"
fi

# Add changed files only
if [[ "$CHANGED_ONLY" == true ]]; then
    CMD="$CMD --changed"
    print_info "Watching changed files only"
    print_feature "Faster feedback on your current work"
fi

# Add coverage
if [[ "$WITH_COVERAGE" == true ]]; then
    CMD="$CMD --coverage"
    print_info "Including coverage in watch mode"
    print_feature "Real-time coverage feedback"
fi

# Add verbose output
if [[ "$VERBOSE" == true ]]; then
    CMD="$CMD --reporter=verbose"
fi

# Handle specific test areas
if [[ ${#SPECIFIC_AREAS[@]} -gt 0 ]]; then
    for area in "${SPECIFIC_AREAS[@]}"; do
        CMD="$CMD $area"
    done
    print_info "Watching tests in: ${SPECIFIC_AREAS[*]}"
elif [[ -n "$PATTERN" ]]; then
    # Check if pattern is a file path
    if [[ -f "$PATTERN" ]]; then
        CMD="$CMD $PATTERN"
        print_info "Watching specific test file: $PATTERN"
    else
        # Use pattern as test name filter
        CMD="$CMD --grep=\"$PATTERN\""
        print_info "Watching tests matching pattern: $PATTERN"
    fi
else
    print_info "Watching all tests in selected configuration"
fi

echo
print_feature "Auto-clear console on each run"
print_feature "Tests re-run automatically on file changes"
print_feature "Press 'q' to quit, 'a' to run all tests, 'f' to run failed tests"

if [[ "$WITH_COVERAGE" == true ]]; then
    print_feature "Coverage report updates in real-time"
fi

echo
print_info "Command: $CMD"
echo

print_success "Starting watch mode..."
echo -e "${YELLOW}Tip: Save any file to trigger test re-run${NC}"
echo

# Execute the command with proper terminal handling
exec $CMD