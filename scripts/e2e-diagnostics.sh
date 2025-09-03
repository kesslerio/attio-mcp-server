#!/usr/bin/env bash
set -euo pipefail

# Enhanced E2E Diagnostics Script
# Supports multiple execution modes and comprehensive test analysis

show_help() {
  cat << EOF
Enhanced E2E Diagnostics Script

Usage: $0 [OPTIONS] [TEST_PATTERN]

Options:
  -h, --help                 Show this help message
  -d, --dir DIR             Log directory (default: test-results)
  -s, --suite SUITE         Run specific test suite (error-handling, record-management, etc.)
  -f, --file FILE           Run tests from specific file pattern
  -p, --parallel            Run tests in parallel mode
  -j, --json                Output JSON results for analysis
  -v, --verbose             Extra verbose output
  -w, --watch               Run in watch mode for development
  -c, --cleanup             Clean old logs before running
  --analyze                 Generate failure analysis report
  --timeout SECONDS         Test timeout in seconds (default: 30)

Examples:
  $0                                    # Run all tests
  $0 --suite error-handling            # Run all error-handling tests
  $0 --file core-workflows             # Run core-workflows test file
  $0 -p "should create"                # Run tests matching pattern in parallel
  $0 --analyze                         # Generate analysis report from existing logs

Test Suites:
  - core-workflows          Core functionality tests
  - error-handling          Error scenarios and recovery
  - record-management       CRUD operations and relationships
  - notes-management        Notes creation and management
  - infrastructure          System validation and health
  - regression-prevention   Stability and performance tests
EOF
}

# Parse command line arguments
LOG_DIR=""
TEST_PATTERN=""
SUITE=""
FILE=""
PARALLEL=false
JSON_OUTPUT=false
VERBOSE=false
WATCH=false
CLEANUP=false
ANALYZE=false
TIMEOUT=30

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -d|--dir)
      LOG_DIR="$2"
      shift 2
      ;;
    -s|--suite)
      SUITE="$2"
      shift 2
      ;;
    -f|--file)
      FILE="$2"
      shift 2
      ;;
    -p|--parallel)
      PARALLEL=true
      shift
      ;;
    -j|--json)
      JSON_OUTPUT=true
      shift
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -w|--watch)
      WATCH=true
      shift
      ;;
    -c|--cleanup)
      CLEANUP=true
      shift
      ;;
    --analyze)
      ANALYZE=true
      shift
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    -*)
      echo "Unknown option $1"
      show_help
      exit 1
      ;;
    *)
      TEST_PATTERN="$1"
      shift
      ;;
  esac
done

# Set default log directory to test-results
LOG_DIR=${LOG_DIR:-"test-results"}
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)
cd "$ROOT_DIR"

# Create log directory
mkdir -p "$LOG_DIR"

# Load .env so vitest and curl-compatible tools get keys
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env"
  set +a
fi

# Cleanup old logs if requested
if [[ "$CLEANUP" == true ]]; then
  echo "🧹 Cleaning old logs..."
  find "$LOG_DIR" -name "e2e-*.log" -mtime +7 -delete 2>/dev/null || true
fi

echo "🔎 Enhanced E2E Diagnostics"
echo "=========================="
echo "Log directory: $LOG_DIR"
echo "Timestamp: $TIMESTAMP"

# Build vitest command
VITEST_CMD="node --env-file=.env ./node_modules/vitest/vitest.mjs run --config vitest.config.e2e.ts"

# Add reporters
if [[ "$JSON_OUTPUT" == true ]]; then
  VITEST_CMD="$VITEST_CMD --reporter=json --reporter=verbose"
else
  VITEST_CMD="$VITEST_CMD --reporter=verbose"
fi

# Add bail option
VITEST_CMD="$VITEST_CMD --bail=0"

# Add timeout
VITEST_CMD="$VITEST_CMD --testTimeout=$((TIMEOUT * 1000))"

# Add watch mode if requested
if [[ "$WATCH" == true ]]; then
  VITEST_CMD="$VITEST_CMD --watch"
fi

# Add parallel execution
if [[ "$PARALLEL" == true ]]; then
  VITEST_CMD="$VITEST_CMD --reporter=verbose --reporter=json"
fi

# Determine test target
TARGET_DESCRIPTION=""
LOG_FILE_PREFIX="e2e"

if [[ "$ANALYZE" == true ]]; then
  echo "📊 Generating analysis report..."
  exec "$ROOT_DIR/scripts/e2e-analyze.sh" "$LOG_DIR"
  exit 0
fi

if [[ -n "$SUITE" ]]; then
  case "$SUITE" in
    error-handling)
      TEST_PATTERN="error-handling"
      TARGET_DESCRIPTION="error handling tests"
      LOG_FILE_PREFIX="e2e-error-handling"
      ;;
    record-management)
      TEST_PATTERN="record-management"
      TARGET_DESCRIPTION="record management tests"
      LOG_FILE_PREFIX="e2e-record-management"
      ;;
    core-workflows)
      TEST_PATTERN="core-workflows"
      TARGET_DESCRIPTION="core workflow tests"
      LOG_FILE_PREFIX="e2e-core-workflows"
      ;;
    notes-management)
      TEST_PATTERN="notes-management"
      TARGET_DESCRIPTION="notes management tests"
      LOG_FILE_PREFIX="e2e-notes"
      ;;
    infrastructure)
      TEST_PATTERN="infrastructure"
      TARGET_DESCRIPTION="infrastructure tests"
      LOG_FILE_PREFIX="e2e-infrastructure"
      ;;
    regression-prevention)
      TEST_PATTERN="regression-prevention"
      TARGET_DESCRIPTION="regression prevention tests"
      LOG_FILE_PREFIX="e2e-regression"
      ;;
    *)
      echo "❌ Unknown suite: $SUITE"
      show_help
      exit 1
      ;;
  esac
elif [[ -n "$FILE" ]]; then
  TEST_PATTERN="$FILE"
  TARGET_DESCRIPTION="file pattern: $FILE"
  LOG_FILE_PREFIX="e2e-$(echo "$FILE" | tr ' ' '-' | tr -cd '[:alnum:]-')"
elif [[ -n "$TEST_PATTERN" ]]; then
  TARGET_DESCRIPTION="pattern: $TEST_PATTERN"
  LOG_FILE_PREFIX="e2e-$(echo "$TEST_PATTERN" | tr ' ' '-' | tr -cd '[:alnum:]-')"
else
  TARGET_DESCRIPTION="all E2E tests"
  LOG_FILE_PREFIX="e2e-all"
fi

LOG_FILE="$LOG_DIR/${LOG_FILE_PREFIX}-${TIMESTAMP}.log"

echo "Target: $TARGET_DESCRIPTION"
echo "Log file: $LOG_FILE"
echo "=========================="

# Set environment variables for enhanced debugging
export TASKS_DEBUG=true
export MCP_LOG_LEVEL=DEBUG
export LOG_FORMAT=json
export E2E_MODE=true
export USE_MOCK_DATA=false

if [[ "$VERBOSE" == true ]]; then
  export DEBUG="*"
fi

# Execute tests
echo "▶ Starting test execution..."
START_TIME=$(date +%s)

if [[ -n "$FILE" ]]; then
  # If --file is used, find matching files in subdirectories
  MATCHING_FILES=$(find test/e2e/suites -name "*${FILE}*.e2e.test.ts" -type f)
  
  if [[ -z "$MATCHING_FILES" ]]; then
    echo "❌ No test files found matching pattern: $FILE"
    echo "Available test files:"
    find test/e2e/suites -name "*.e2e.test.ts" -type f | sort
    exit 1
  fi
  
  echo "📁 Found matching files:"
  echo "$MATCHING_FILES"
  echo ""
  
  # shellcheck disable=SC2086
  $VITEST_CMD $MATCHING_FILES 2>&1 | tee "$LOG_FILE" || true
elif [[ -n "$TEST_PATTERN" ]]; then
  # If --suite or a general pattern is used, filter by test name with -t
  # shellcheck disable=SC2086
  $VITEST_CMD -t "$TEST_PATTERN" 2>&1 | tee "$LOG_FILE" || true
else
  # Otherwise, run all E2E tests
  # shellcheck disable=SC2086
  $VITEST_CMD 2>&1 | tee "$LOG_FILE" || true
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "=========================="
echo "⏱ Duration: ${DURATION}s"
echo "📄 Log file: $LOG_FILE"

# Generate quick summary
if [[ -f "$LOG_FILE" ]]; then
  # Extract from vitest summary line: "Tests  11 failed | 114 passed | 4 skipped (129)"
  SUMMARY_LINE=$(grep "Tests  .* failed .* passed" "$LOG_FILE" | tail -1 || true)
  if [[ -n "$SUMMARY_LINE" ]]; then
    FAILED_COUNT=$(echo "$SUMMARY_LINE" | grep -o '[0-9]\+ failed' | grep -o '[0-9]\+' || echo "0")
    PASSED_COUNT=$(echo "$SUMMARY_LINE" | grep -o '[0-9]\+ passed' | grep -o '[0-9]\+' || echo "0")
  else
    # Fallback to individual test counting
    PASSED_COUNT=$(grep -c "✓ test/" "$LOG_FILE" || true)
    FAILED_COUNT=$(grep -c "^[ ]*FAIL[ ]" "$LOG_FILE" | head -1 || true)
  fi

  # Ensure they are numbers
  PASSED=${PASSED_COUNT:-0}
  FAILED=${FAILED_COUNT:-0}

  echo "📊 Quick summary: $PASSED passed, $FAILED failed"
  
  if [[ "$FAILED" -gt 0 ]]; then
    echo "❌ Failed tests detected. Run with --analyze for detailed analysis."
  else
    echo "✅ All tests passed!"
  fi
fi

echo "✅ Diagnostics complete"