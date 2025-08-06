#!/bin/bash

# test-runner.sh - Comprehensive test runner with menu interface
# Usage: ./scripts/test-runner.sh [options]
# Interactive menu-driven test runner for the Attio MCP Server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    clear
    echo -e "${BOLD}${BLUE}================================================${NC}"
    echo -e "${BOLD}${BLUE}     Attio MCP Server Test Runner${NC}"
    echo -e "${BOLD}${BLUE}================================================${NC}"
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

print_menu_item() {
    echo -e "${YELLOW}$1)${NC} $2"
}

validate_environment() {
    local test_type="$1"
    
    if [[ "$test_type" == "integration" || "$test_type" == "e2e" ]]; then
        print_info "Validating environment for $test_type tests..."
        
        if [[ -z "$ATTIO_API_KEY" ]]; then
            print_error "ATTIO_API_KEY is not set!"
            print_info "Integration and E2E tests require a valid API key."
            echo
            read -p "Do you want to continue anyway? Tests may fail. (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "Aborting test run. Please set ATTIO_API_KEY and try again."
                exit 1
            fi
        else
            print_success "ATTIO_API_KEY is set"
        fi
        
        if [[ -z "$ATTIO_WORKSPACE_ID" ]]; then
            print_warning "ATTIO_WORKSPACE_ID is not set. Some tests may fail."
        else
            print_success "ATTIO_WORKSPACE_ID is set"
        fi
        
        # Check if we can reach the API
        if command -v curl &> /dev/null; then
            print_info "Testing API connectivity..."
            if curl -s --fail -H "Authorization: Bearer $ATTIO_API_KEY" "https://api.attio.com/v2/workspaces" &>/dev/null; then
                print_success "API connectivity verified"
            else
                print_warning "Could not verify API connectivity"
            fi
        fi
        
        echo
    fi
}

run_test_setup() {
    print_info "Setting up test environment..."
    
    # Ensure build is up to date for integration tests
    print_info "Building project..."
    if npm run build > /dev/null 2>&1; then
        print_success "Build completed"
    else
        print_error "Build failed!"
        exit 1
    fi
    
    # Check if test data setup is needed
    if [[ -f "scripts/setup-test-data.ts" ]]; then
        print_info "Setting up test data..."
        if npm run setup:test-data > /dev/null 2>&1; then
            print_success "Test data setup completed"
        else
            print_warning "Test data setup had issues (continuing anyway)"
        fi
    fi
    
    echo
}

show_test_menu() {
    print_header
    
    echo -e "${BOLD}Select Test Suite:${NC}"
    echo
    
    print_menu_item "1" "All Tests (Unit + Integration + E2E)"
    print_menu_item "2" "Unit Tests Only (Fast, No API)"
    print_menu_item "3" "Integration Tests Only (With API)"
    print_menu_item "4" "End-to-End Tests Only"
    echo
    
    print_menu_item "5" "Handler Tests"
    print_menu_item "6" "API Tests"
    print_menu_item "7" "Utility Tests"
    print_menu_item "8" "Object Tests"
    print_menu_item "9" "Validator Tests"
    print_menu_item "10" "Error Handling Tests"
    echo
    
    echo -e "${BOLD}Resource-Specific Tests:${NC}"
    print_menu_item "11" "Companies Tests"
    print_menu_item "12" "People Tests"
    print_menu_item "13" "Lists Tests"
    print_menu_item "14" "Notes Tests"
    print_menu_item "15" "Tasks Tests"
    print_menu_item "16" "Records Tests"
    echo
    
    echo -e "${BOLD}Special Test Modes:${NC}"
    print_menu_item "17" "Performance Tests"
    print_menu_item "18" "Coverage Report (All Tests)"
    print_menu_item "19" "Coverage Report (Unit Only)"
    print_menu_item "20" "Watch Mode (Interactive)"
    print_menu_item "21" "Debug Mode (Verbose)"
    echo
    
    print_menu_item "q" "Quit"
    echo
}

run_tests() {
    local test_type="$1"
    local test_path="$2"
    local additional_flags="$3"
    local description="$4"
    
    print_header
    print_info "Running: $description"
    echo
    
    # Validate environment if needed
    if [[ "$test_type" == "integration" || "$test_type" == "e2e" ]]; then
        validate_environment "$test_type"
        run_test_setup
    fi
    
    # Build the command
    local cmd="npx vitest --run"
    
    case "$test_type" in
        "unit")
            cmd="$cmd --config vitest.config.offline.ts"
            ;;
        "integration")
            cmd="$cmd --config vitest.config.integration.ts"
            ;;
        "e2e")
            cmd="$cmd --config vitest.config.e2e.ts"
            ;;
        "all")
            # Run multiple test suites
            print_info "This will run unit tests first, then integration tests"
            echo
            
            print_info "Step 1/2: Running unit tests..."
            if npx vitest --run --config vitest.config.offline.ts; then
                print_success "Unit tests passed!"
            else
                print_error "Unit tests failed!"
                read -p "Continue with integration tests anyway? (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    return 1
                fi
            fi
            
            echo
            print_info "Step 2/2: Running integration tests..."
            validate_environment "integration"
            run_test_setup
            cmd="npx vitest --run --config vitest.config.integration.ts"
            ;;
    esac
    
    # Add test path if specified
    if [[ -n "$test_path" ]]; then
        cmd="$cmd $test_path"
    fi
    
    # Add additional flags
    if [[ -n "$additional_flags" ]]; then
        cmd="$cmd $additional_flags"
    fi
    
    print_info "Command: $cmd"
    echo
    
    # Execute the command
    local start_time=$(date +%s)
    
    if eval "$cmd"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo
        print_success "Tests completed successfully in ${duration}s!"
        
        # Show coverage info if applicable
        if [[ "$additional_flags" == *"--coverage"* ]]; then
            echo
            print_info "Coverage report available in ./coverage/"
            if command -v open &> /dev/null && [[ -f "coverage/index.html" ]]; then
                read -p "Open coverage report in browser? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    open coverage/index.html
                fi
            fi
        fi
        
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo
        print_error "Tests failed after ${duration}s!"
        return 1
    fi
}

main() {
    # Check for non-interactive mode
    if [[ "$1" == "--help" || "$1" == "-h" ]]; then
        print_header
        echo "Usage: $0 [--non-interactive] [test_number]"
        echo
        echo "Interactive menu-driven test runner for comprehensive testing."
        echo "Supports environment validation, test data setup, and coverage reporting."
        echo
        echo "Options:"
        echo "  --non-interactive  Run without menu (specify test number)"
        echo "  --help            Show this help"
        echo
        echo "Examples:"
        echo "  $0                # Interactive menu"
        echo "  $0 --non-interactive 2  # Run unit tests directly"
        echo "  $0 --non-interactive 18 # Run coverage report directly"
        exit 0
    fi
    
    if [[ "$1" == "--non-interactive" ]]; then
        if [[ -z "$2" ]]; then
            print_error "Test number required in non-interactive mode"
            exit 1
        fi
        choice="$2"
    else
        while true; do
            show_test_menu
            read -p "Enter your choice: " choice
            break
        done
    fi
    
    case $choice in
        1)
            run_tests "all" "" "" "All Tests (Unit + Integration + E2E)"
            ;;
        2)
            run_tests "unit" "" "" "Unit Tests Only"
            ;;
        3)
            run_tests "integration" "" "" "Integration Tests Only"
            ;;
        4)
            run_tests "e2e" "" "" "End-to-End Tests"
            ;;
        5)
            run_tests "unit" "test/handlers/" "" "Handler Tests"
            ;;
        6)
            run_tests "unit" "test/api/" "" "API Tests"
            ;;
        7)
            run_tests "unit" "test/utils/" "" "Utility Tests"
            ;;
        8)
            run_tests "unit" "test/objects/" "" "Object Tests"
            ;;
        9)
            run_tests "unit" "test/validators/" "" "Validator Tests"
            ;;
        10)
            run_tests "unit" "test/errors/" "" "Error Handling Tests"
            ;;
        11)
            run_tests "unit" "" "--grep=\"compan\"" "Companies Tests"
            ;;
        12)
            run_tests "unit" "" "--grep=\"people\"" "People Tests"
            ;;
        13)
            run_tests "unit" "" "--grep=\"list\"" "Lists Tests"
            ;;
        14)
            run_tests "unit" "" "--grep=\"note\"" "Notes Tests"
            ;;
        15)
            run_tests "unit" "" "--grep=\"task\"" "Tasks Tests"
            ;;
        16)
            run_tests "unit" "" "--grep=\"record\"" "Records Tests"
            ;;
        17)
            run_tests "unit" "test/performance/" "" "Performance Tests"
            ;;
        18)
            run_tests "all" "" "--coverage" "Coverage Report (All Tests)"
            ;;
        19)
            run_tests "unit" "" "--coverage" "Coverage Report (Unit Only)"
            ;;
        20)
            print_header
            print_info "Launching watch mode..."
            print_feature "This will open an interactive test watcher"
            echo
            exec ./scripts/test-watch.sh
            ;;
        21)
            run_tests "unit" "" "--reporter=verbose" "Debug Mode (Verbose Output)"
            ;;
        q|Q)
            print_info "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid choice: $choice"
            read -p "Press Enter to continue..." -r
            ;;
    esac
    
    # In interactive mode, ask if they want to run more tests
    if [[ "$1" != "--non-interactive" ]]; then
        echo
        read -p "Run another test suite? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            main
        else
            print_info "Goodbye!"
            exit 0
        fi
    fi
}

# Make sure we're in the right directory
if [[ ! -f "package.json" ]]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Check if vitest is available
if ! command -v npx &> /dev/null || ! npx vitest --version &> /dev/null; then
    print_error "Vitest is not available. Please run 'npm install' first."
    exit 1
fi

# Run main function
main "$@"