#!/usr/bin/env bash
set -euo pipefail

# Simple E2E Test Analysis Script (Compatible with macOS default bash)
# Analyzes test results without requiring bash 4+ features

show_help() {
  cat << EOF
Simple E2E Test Analysis Script (macOS Compatible)

Usage: $0 [OPTIONS] [LOG_DIR]

Options:
  -h, --help                Show this help message
  -r, --recent              Analyze only recent logs (last 24h)
  -f, --failures-only       Show only failed tests
  -s, --summary             Generate summary report
  -p, --patterns            Extract common error patterns
  -t, --timing              Include timing analysis

Examples:
  $0                        # Analyze all logs in test-results/
  $0 -r -f                  # Recent failures only
  $0 --patterns             # Pattern analysis
  $0 /tmp                   # Analyze logs in /tmp directory

EOF
}

# Default values
LOG_DIR="test-results"
RECENT_ONLY=false
FAILURES_ONLY=false
SUMMARY_ONLY=false
EXTRACT_PATTERNS=false
TIMING_ANALYSIS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -r|--recent)
      RECENT_ONLY=true
      shift
      ;;
    -f|--failures-only)
      FAILURES_ONLY=true
      shift
      ;;
    -s|--summary)
      SUMMARY_ONLY=true
      shift
      ;;
    -p|--patterns)
      EXTRACT_PATTERNS=true
      shift
      ;;
    -t|--timing)
      TIMING_ANALYSIS=true
      shift
      ;;
    -*)
      echo "Unknown option $1"
      show_help
      exit 1
      ;;
    *)
      LOG_DIR="$1"
      shift
      ;;
  esac
done

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)
cd "$ROOT_DIR"

if [[ ! -d "$LOG_DIR" ]]; then
  echo "❌ Log directory '$LOG_DIR' not found"
  exit 1
fi

echo "📊 Simple E2E Test Analysis"
echo "=========================="
echo "Analyzing logs in: $LOG_DIR"

# Find log files
if [[ "$RECENT_ONLY" == true ]]; then
  LOG_FILES=$(find "$LOG_DIR" -name "e2e-*.log" -mtime -1 2>/dev/null | sort || echo "")
else
  LOG_FILES=$(find "$LOG_DIR" -name "e2e-*.log" 2>/dev/null | sort || echo "")
fi

if [[ -z "$LOG_FILES" ]]; then
  echo "❌ No E2E log files found"
  exit 1
fi

LOG_COUNT=$(echo "$LOG_FILES" | wc -l | tr -d ' ')
echo "Found $LOG_COUNT log files to analyze"
echo "=========================="

# Analysis variables
total_passed=0
total_failed=0
total_skipped=0
total_files=0
total_duration=0
total_api_errors=0
total_timeout_errors=0
total_assertion_errors=0
total_connection_errors=0

# Process each log file
for log_file in $LOG_FILES; do
  if [[ -n "$log_file" && -f "$log_file" ]]; then
    basename_file=$(basename "$log_file")
    echo "Analyzing: $basename_file"
    
    # Count test results (check multiple formats)
    passed=$(grep -c "PASS\|✓" "$log_file" 2>/dev/null || echo "0")
    failed=$(grep -c "FAIL\|✗" "$log_file" 2>/dev/null || echo "0")
    skipped=$(grep -c "SKIP\|↷" "$log_file" 2>/dev/null || echo "0")
    
    # Ensure numeric values
    [[ "$passed" =~ ^[0-9]+$ ]] || passed=0
    [[ "$failed" =~ ^[0-9]+$ ]] || failed=0
    [[ "$skipped" =~ ^[0-9]+$ ]] || skipped=0
    
    total_passed=$((total_passed + passed))
    total_failed=$((total_failed + failed))
    total_skipped=$((total_skipped + skipped))
    total_files=$((total_files + 1))
    
    # Extract timing if enabled
    if [[ "$TIMING_ANALYSIS" == true ]]; then
      duration=$(grep -o "Duration: [0-9]*s" "$log_file" 2>/dev/null | head -1 | grep -o "[0-9]*" || echo "0")
      if [[ "$duration" =~ ^[0-9]+$ ]]; then
        total_duration=$((total_duration + duration))
      fi
    fi
    
    # Extract error patterns if enabled
    if [[ "$EXTRACT_PATTERNS" == true && "$failed" -gt 0 ]]; then
      api_errors=$(grep -c "API.*error\|HTTP.*error\|Request failed" "$log_file" 2>/dev/null || echo "0")
      timeout_errors=$(grep -c "timeout\|Timeout" "$log_file" 2>/dev/null || echo "0")
      assertion_errors=$(grep -c "AssertionError\|Expected.*but got" "$log_file" 2>/dev/null || echo "0")
      connection_errors=$(grep -c "ECONNREFUSED\|Connection.*refused\|Network error" "$log_file" 2>/dev/null || echo "0")
      
      # Ensure numeric values for error counts
      [[ "$api_errors" =~ ^[0-9]+$ ]] || api_errors=0
      [[ "$timeout_errors" =~ ^[0-9]+$ ]] || timeout_errors=0
      [[ "$assertion_errors" =~ ^[0-9]+$ ]] || assertion_errors=0
      [[ "$connection_errors" =~ ^[0-9]+$ ]] || connection_errors=0
      
      total_api_errors=$((total_api_errors + api_errors))
      total_timeout_errors=$((total_timeout_errors + timeout_errors))
      total_assertion_errors=$((total_assertion_errors + assertion_errors))
      total_connection_errors=$((total_connection_errors + connection_errors))
    fi
    
    # Show failures if requested
    if [[ "$FAILURES_ONLY" == true && "$failed" -gt 0 ]]; then
      echo "  ❌ $failed failed tests in $basename_file"
      # Show first few failed test names
      grep -A 1 "FAIL\|✗" "$log_file" 2>/dev/null | head -6 | sed 's/^/    /'
      echo ""
    fi
  fi
done

# Generate summary report
echo ""
echo "📈 Summary Report"
echo "================="

total_tests=$((total_passed + total_failed + total_skipped))
success_rate="0.00"
if [[ "$total_tests" -gt 0 ]]; then
  success_rate=$(echo "scale=2; $total_passed * 100 / $total_tests" | bc -l 2>/dev/null || echo "0.00")
fi

echo "Files analyzed: $total_files"
echo "Total tests: $total_tests"
echo "✅ Passed: $total_passed"
echo "❌ Failed: $total_failed"
echo "⏸ Skipped: $total_skipped"
echo "🎯 Success rate: ${success_rate}%"

# Timing analysis
if [[ "$TIMING_ANALYSIS" == true && "$total_files" -gt 0 ]]; then
  echo ""
  echo "⏱ Timing Analysis"
  echo "================="
  
  avg_duration=0
  if [[ "$total_files" -gt 0 && "$total_duration" -gt 0 ]]; then
    avg_duration=$((total_duration / total_files))
  fi
  
  echo "Average execution time: ${avg_duration}s"
  echo "Total execution time: ${total_duration}s"
fi

# Pattern analysis
if [[ "$EXTRACT_PATTERNS" == true ]]; then
  echo ""
  echo "🔍 Error Patterns Analysis"
  echo "=========================="
  
  echo "🌐 API errors: $total_api_errors"
  echo "⏱ Timeout errors: $total_timeout_errors"
  echo "🔍 Assertion errors: $total_assertion_errors"
  echo "🔌 Connection errors: $total_connection_errors"
  
  # Suggest actions based on patterns
  echo ""
  echo "💡 Recommendations:"
  if [[ "$total_api_errors" -gt 0 ]]; then
    echo "   - Check API key validity and rate limits"
  fi
  if [[ "$total_timeout_errors" -gt 0 ]]; then
    echo "   - Consider increasing timeout values or optimizing slow operations"
  fi
  if [[ "$total_assertion_errors" -gt 0 ]]; then
    echo "   - Review test assertions and expected values"
  fi
  if [[ "$total_connection_errors" -gt 0 ]]; then
    echo "   - Check network connectivity and service availability"
  fi
fi

echo ""
echo "✅ Analysis complete!"

# Exit with error code if there are failures
if [[ "$total_failed" -gt 0 ]]; then
  exit 1
else
  exit 0
fi