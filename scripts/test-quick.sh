#!/bin/bash

# test-quick.sh - Quick test runner for Attio MCP Server
# Usage: ./scripts/test-quick.sh [pattern] [options]
# Examples:
#   ./scripts/test-quick.sh                    # Run all offline tests
#   ./scripts/test-quick.sh companies         # Run tests matching "companies"
#   ./scripts/test-quick.sh --handlers         # Run handler tests only
#   ./scripts/test-quick.sh --api              # Run API tests only
#   ./scripts/test-quick.sh --utils            # Run util tests only
#   ./scripts/test-quick.sh --integration      # Run integration tests (requires API key)
#   ./scripts/test-quick.sh --e2e              # Run E2E tests
#   ./scripts/test-quick.sh --coverage         # Run with coverage
#   ./scripts/test-quick.sh path/to/file.test.ts # Run specific file

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} Attio MCP Test Quick Runner${NC}"
    echo -e "${BLUE}================================${NC}"
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

show_help() {
    echo "Usage: $0 [pattern] [options]"
    echo
    echo "Options:"
    echo "  --handlers         Run handler tests only"
    echo "  --api              Run API tests only"
    echo "  --utils            Run utility tests only"
    echo "  --objects          Run object tests only"
    echo "  --validators       Run validator tests only"
    echo "  --errors           Run error handling tests only"
    echo "  --integration      Run integration tests (requires API key)"
    echo "  --e2e              Run end-to-end tests"
    echo "  --unit             Run unit tests only (default)"
    echo "  --coverage         Include coverage report"
    echo "  --watch            Run in watch mode"
    echo "  --verbose          Verbose output"
    echo "  --help             Show this help"
    echo
    echo "Test Areas:"
    echo "  companies          Tests for company operations"
    echo "  people             Tests for people operations"
    echo "  lists              Tests for list operations"
    echo "  notes              Tests for notes operations"
    echo "  tasks              Tests for task operations"
    echo "  deals              Tests for deal operations"
    echo "  records            Tests for record operations"
    echo
    echo "Examples:"
    echo "  $0                                # Run all offline tests"
    echo "  $0 companies                      # Run tests matching 'companies'"
    echo "  $0 --handlers                     # Run handler tests"
    echo "  $0 --integration                  # Run integration tests"
    echo "  $0 test/utils/domain-utils.test.ts # Run specific file"
    echo "  $0 --coverage --handlers          # Run handlers with coverage"
    echo "  $0 companies --watch              # Watch companies tests"
}

# Parse arguments
PATTERN=""
TEST_TYPE="unit"
WITH_COVERAGE=false
WATCH_MODE=false
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
        --e2e)
            TEST_TYPE="e2e"
            shift
            ;;
        --unit)
            TEST_TYPE="unit"
            shift
            ;;
        --coverage)
            WITH_COVERAGE=true
            shift
            ;;
        --watch)
            WATCH_MODE=true
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
if [[ "$TEST_TYPE" == "integration" || "$TEST_TYPE" == "e2e" ]]; then
    if [[ -z "$ATTIO_API_KEY" ]]; then
        print_warning "ATTIO_API_KEY not set. Integration/E2E tests may fail."
        print_info "Set ATTIO_API_KEY environment variable or create .env file"
    fi
    
    if [[ -z "$ATTIO_WORKSPACE_ID" ]]; then
        print_warning "ATTIO_WORKSPACE_ID not set. Some tests may fail."
    fi
fi

# Build test command
CMD="npx vitest"

# Configure test type
case "$TEST_TYPE" in
    "unit")
        CMD="$CMD --config vitest.config.offline.ts"
        print_info "Running unit tests (offline)"
        ;;
    "integration")
        CMD="$CMD --config vitest.config.integration.ts"
        print_info "Running integration tests (with API calls)"
        ;;
    "e2e")
        CMD="$CMD --config vitest.config.e2e.ts"
        print_info "Running end-to-end tests"
        ;;
esac

# Add run flag unless in watch mode
if [[ "$WATCH_MODE" != true ]]; then
    CMD="$CMD --run"
fi

# Add coverage
if [[ "$WITH_COVERAGE" == true ]]; then
    CMD="$CMD --coverage"
    print_info "Including coverage report"
fi

# Add watch mode
if [[ "$WATCH_MODE" == true ]]; then
    CMD="$CMD --watch"
    print_info "Running in watch mode"
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
    print_info "Running tests in: ${SPECIFIC_AREAS[*]}"
elif [[ -n "$PATTERN" ]]; then
    # Check if pattern is a file path
    if [[ -f "$PATTERN" ]]; then
        CMD="$CMD $PATTERN"
        print_info "Running specific test file: $PATTERN"
    else
        # Use pattern as test name filter
        CMD="$CMD --grep=\"$PATTERN\""
        print_info "Running tests matching pattern: $PATTERN"
    fi
else
    print_info "Running all tests in selected configuration"
fi

echo
print_info "Command: $CMD"
echo

# Execute the command
if eval "$CMD"; then
    echo
    print_success "Tests completed successfully!"
    
    # Show coverage summary if enabled
    if [[ "$WITH_COVERAGE" == true ]]; then
        echo
        print_info "Coverage report available in ./coverage/"
        if command -v open &> /dev/null && [[ -f "coverage/index.html" ]]; then
            print_info "Run 'open coverage/index.html' to view detailed coverage report"
        fi
    fi
    
    exit 0
else
    echo
    print_error "Tests failed!"
    exit 1
fi