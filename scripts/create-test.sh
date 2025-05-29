#!/bin/bash

# TDD Test File Generator
# Usage: ./scripts/create-test.sh <test-type> <module-path> [test-name]
# Example: ./scripts/create-test.sh unit src/utils/date-utils DateUtils
# Example: ./scripts/create-test.sh integration src/api/client ApiClient

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$SCRIPT_DIR/tdd-templates"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <test-type> <module-path> [test-name]"
    echo ""
    echo "Test types:"
    echo "  unit         - Create a unit test file"
    echo "  integration  - Create an integration test file"
    echo "  mock         - Create a mock factory file"
    echo ""
    echo "Examples:"
    echo "  $0 unit src/utils/date-utils DateUtils"
    echo "  $0 integration src/api/client ApiClient"
    echo "  $0 mock src/models/company CompanyMock"
    echo ""
}

# Check arguments
if [ $# -lt 2 ]; then
    print_error "Missing required arguments"
    show_usage
    exit 1
fi

TEST_TYPE="$1"
MODULE_PATH="$2"
TEST_NAME="${3:-$(basename "$MODULE_PATH")}"

# Validate test type
case "$TEST_TYPE" in
    unit|integration|mock)
        ;;
    *)
        print_error "Invalid test type: $TEST_TYPE"
        show_usage
        exit 1
        ;;
esac

# Determine template file
case "$TEST_TYPE" in
    unit)
        TEMPLATE_FILE="$TEMPLATES_DIR/unit-test.template.ts"
        TEST_DIR="test/$(dirname "$MODULE_PATH")"
        TEST_FILE="$TEST_DIR/$(basename "$MODULE_PATH").test.ts"
        ;;
    integration)
        TEMPLATE_FILE="$TEMPLATES_DIR/integration-test.template.ts"
        TEST_DIR="test/integration"
        TEST_FILE="$TEST_DIR/$(basename "$MODULE_PATH").integration.test.ts"
        ;;
    mock)
        TEMPLATE_FILE="$TEMPLATES_DIR/mock-factory.template.ts"
        TEST_DIR="test/mocks"
        TEST_FILE="$TEST_DIR/$(basename "$MODULE_PATH").mock.ts"
        ;;
esac

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    print_error "Template file not found: $TEMPLATE_FILE"
    exit 1
fi

# Create test directory if it doesn't exist
mkdir -p "$TEST_DIR"

# Check if test file already exists
if [ -f "$TEST_FILE" ]; then
    print_warning "Test file already exists: $TEST_FILE"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cancelled."
        exit 0
    fi
fi

# Copy template to test file
cp "$TEMPLATE_FILE" "$TEST_FILE"

# Replace placeholders in the test file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/Module Name/$TEST_NAME/g" "$TEST_FILE"
    sed -i '' "s|../src/path/to/module|../../$MODULE_PATH|g" "$TEST_FILE"
else
    # Linux
    sed -i "s/Module Name/$TEST_NAME/g" "$TEST_FILE"
    sed -i "s|../src/path/to/module|../../$MODULE_PATH|g" "$TEST_FILE"
fi

print_info "Created $TEST_TYPE test file: $TEST_FILE"
print_info "Next steps:"
echo "  1. Edit the test file to add your actual tests"
echo "  2. Run tests with: npm run test:watch"
echo "  3. Follow TDD: Red -> Green -> Refactor"