#!/usr/bin/env bash
set -euo pipefail

# E2E Test Analysis Script (Compatible with macOS default bash)
# Analyzes test results and generates comprehensive failure reports.

show_help() {
  cat << EOF
E2E Test Analysis Script (macOS Compatible)

Usage: $0 [OPTIONS] [LOG_PATH]

Analyzes E2E test logs from a specified directory or a single log file.

Options:
  -h, --help                Show this help message
  -r, --recent              Analyze only recent logs (last 24h) from a directory
  -f, --failures-only       Show only failed tests
  -s, --summary             Generate summary report
  -p, --patterns            Extract common error patterns
  -t, --timing              Include timing analysis
  -j, --json                Output analysis in JSON format
  --flaky                   Identify potentially flaky tests (Not yet implemented)
  --export FILE             Export text report to a file

Examples:
  $0                        # Analyze all logs in test-results/
  $0 test-results/e2e-*.log # Analyze a specific log file
  $0 -r -f                  # Recent failures only from test-results/
  $0 --patterns --json      # Pattern analysis in JSON format

EOF
}

# Default values
LOG_PATH="test-results"
RECENT_ONLY=false
FAILURES_ONLY=false
SUMMARY_ONLY=false
EXTRACT_PATTERNS=false
TIMING_ANALYSIS=false
JSON_OUTPUT=false
FLAKY_DETECTION=false
EXPORT_FILE=""

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
    -j|--json)
      JSON_OUTPUT=true
      shift
      ;;
    --flaky)
      FLAKY_DETECTION=true
      shift
      ;;
    --export)
      EXPORT_FILE="$2"
      shift 2
      ;;
    -*)
      echo "Unknown option $1"
      show_help
      exit 1
      ;;
    *)
      LOG_PATH="$1"
      shift
      ;;
  esac
done

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)
cd "$ROOT_DIR"

# --- Main Logic ---

# Find log files based on whether LOG_PATH is a file or directory
if [[ -d "$LOG_PATH" ]]; then
  if [[ "$RECENT_ONLY" == true ]]; then
    LOG_FILES=$(find "$LOG_PATH" -name "e2e-*.log" -mtime -1 2>/dev/null | sort)
  else
    LOG_FILES=$(find "$LOG_PATH" -name "e2e-*.log" 2>/dev/null | sort)
  fi
elif [[ -f "$LOG_PATH" ]]; then
  LOG_FILES="$LOG_PATH"
else
  echo "❌ Log path '$LOG_PATH' not found"
  exit 1
fi

if [[ -z "$LOG_FILES" ]]; then
  echo "❌ No E2E log files found"
  exit 1
fi

LOG_COUNT=$(echo "$LOG_FILES" | wc -l | tr -d ' ')

# --- Analysis Data Collection ---
# Using temporary files to simulate associative arrays for macOS compatibility
SUMMARY_DATA=$(mktemp)
ERROR_DATA=$(mktemp)
TIMING_DATA=$(mktemp)
trap 'rm -f "$SUMMARY_DATA" "$ERROR_DATA" "$TIMING_DATA"' EXIT

# Process each log file
while IFS= read -r log_file; do
  if [[ -n "$log_file" && -f "$log_file" ]]; then
    basename_file=$(basename "$log_file")
    
    passed=$(grep "✓ test/" "$log_file" | wc -l | tr -d ' ' || echo "0")
    failed=$(grep "✗ test/" "$log_file" | wc -l | tr -d ' ' || echo "0")
    skipped=$(grep "skipped (" "$log_file" | wc -l | tr -d ' ' || echo "0")
    
    echo "$basename_file:$passed,$failed,$skipped" >> "$SUMMARY_DATA"
    
    if [[ "$TIMING_ANALYSIS" == true || "$JSON_OUTPUT" == true ]]; then
      duration=$(grep -o "Duration: [0-9]*s" "$log_file" | head -1 | grep -o "[0-9]*" || echo "0")
      echo "$basename_file:$duration" >> "$TIMING_DATA"
    fi
    
    if [[ "$EXTRACT_PATTERNS" == true || "$JSON_OUTPUT" == true ]]; then
      api_errors=$(grep -c "API.*error\|HTTP.*error\|Request failed" "$log_file" 2>/dev/null || echo "0")
      timeout_errors=$(grep -c "timeout\|Timeout" "$log_file" 2>/dev/null || echo "0")
      assertion_errors=$(grep -c "AssertionError\|Expected.*but got" "$log_file" 2>/dev/null || echo "0")
      connection_errors=$(grep -c "ECONNREFUSED\|Connection.*refused\|Network error" "$log_file" 2>/dev/null || echo "0")
      echo "$basename_file:$api_errors,$timeout_errors,$assertion_errors,$connection_errors" >> "$ERROR_DATA"
    fi
  fi
done <<< "$LOG_FILES"

# --- Report Generation ---

generate_text_report() {
    echo "📊 E2E Test Analysis"
    echo "===================="
    echo "Found $LOG_COUNT log files to analyze"
    echo "===================="

    total_passed=0
    total_failed=0
    total_skipped=0
    
    while IFS=: read -r file data; do
        IFS=',' read -r passed failed skipped <<< "$data"
        total_passed=$((total_passed + passed))
        total_failed=$((total_failed + failed))
        total_skipped=$((total_skipped + skipped))
    done < "$SUMMARY_DATA"

    total_tests=$((total_passed + total_failed + total_skipped))
    success_rate="0.00"
    if [[ "$total_tests" -gt 0 ]]; then
      success_rate=$(echo "scale=2; $total_passed * 100 / $total_tests" | bc -l 2>/dev/null || echo "0.00")
    fi

    echo ""
    echo "📈 Summary Report"
    echo "================="
    echo "Files analyzed: $LOG_COUNT"
    echo "Total tests: $total_tests"
    echo "✅ Passed: $total_passed"
    echo "❌ Failed: $total_failed"
    echo "⏸ Skipped: $total_skipped"
    echo "🎯 Success rate: ${success_rate}%"

    if [[ "$TIMING_ANALYSIS" == true ]]; then
        total_duration=0
        slowest_file=""
        slowest_time=0
        while IFS=: read -r file duration; do
            total_duration=$((total_duration + duration))
            if [[ "$duration" -gt "$slowest_time" ]]; then
                slowest_time=$duration
                slowest_file=$file
            fi
        done < "$TIMING_DATA"
        
        avg_duration=0
        if [[ "$LOG_COUNT" -gt 0 ]]; then
            avg_duration=$((total_duration / LOG_COUNT))
        fi

        echo ""
        echo "⏱ Timing Analysis"
        echo "================="
        echo "Average execution time: ${avg_duration}s"
        echo "Total execution time: ${total_duration}s"
        echo "Slowest test file: $slowest_file (${slowest_time}s)"
    fi

    if [[ "$EXTRACT_PATTERNS" == true ]]; then
        total_api=0
        total_timeout=0
        total_assertion=0
        total_connection=0
        while IFS=: read -r file data; do
            IFS=',' read -r api timeout assertion connection <<< "$data"
            total_api=$((total_api + api))
            total_timeout=$((total_timeout + timeout))
            total_assertion=$((total_assertion + assertion))
            total_connection=$((total_connection + connection))
        done < "$ERROR_DATA"

        echo ""
        echo "🔍 Error Patterns Analysis"
        echo "=========================="
        echo "🌐 API errors: $total_api"
        echo "⏱ Timeout errors: $total_timeout"
        echo "🔍 Assertion errors: $total_assertion"
        echo "🔌 Connection errors: $total_connection"
    fi
    
    if [[ "$FLAKY_DETECTION" == true ]]; then
        echo ""
        echo "🤔 Flaky Test Detection"
        echo "======================"
        echo "(Not yet implemented)"
    fi
}

generate_json_report() {
    echo "{"
    echo "  \"analysis_timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ%z)\","
    echo "  \"files_analyzed\": $LOG_COUNT,"
    
    # Summary
    total_passed=0
    total_failed=0
    total_skipped=0
    while IFS=: read -r file data; do
        IFS=',' read -r passed failed skipped <<< "$data"
        total_passed=$((total_passed + passed))
        total_failed=$((total_failed + failed))
        total_skipped=$((total_skipped + skipped))
    done < "$SUMMARY_DATA"
    total_tests=$((total_passed + total_failed + total_skipped))
    success_rate=$(echo "scale=2; $total_passed * 100 / $total_tests" | bc -l 2>/dev/null || echo "0.00")
    
    echo "  \"summary\": {"
    echo "    \"total_tests\": $total_tests,"
    echo "    \"passed\": $total_passed,"
    echo "    \"failed\": $total_failed,"
    echo "    \"skipped\": $total_skipped,"
    echo "    \"success_rate\": \"${success_rate}%\""
    echo "  },"

    # Error Patterns
    total_api=0
    total_timeout=0
    total_assertion=0
    total_connection=0
    while IFS=: read -r file data; do
        IFS=',' read -r api timeout assertion connection <<< "$data"
        total_api=$((total_api + api))
        total_timeout=$((total_timeout + timeout))
        total_assertion=$((total_assertion + assertion))
        total_connection=$((total_connection + connection))
    done < "$ERROR_DATA"
    echo "  \"error_patterns\": {"
    echo "    \"api_errors\": $total_api,"
    echo "    \"timeout_errors\": $total_timeout,"
    echo "    \"assertion_errors\": $total_assertion,"
    echo "    \"connection_errors\": $total_connection"
    echo "  },"

    # File Details
    echo "  \"file_details\": ["
    first=true
    for log_file in $LOG_FILES; do
        if [[ -n "$log_file" && -f "$log_file" ]]; then
            if [[ "$first" == false ]]; then echo ","; fi
            first=false
            basename_file=$(basename "$log_file")
            
            IFS=',' read -r passed failed skipped <<< "$(grep \"^$basename_file:\" \"$SUMMARY_DATA\" | cut -d: -f2)"
            duration=$(grep \"^$basename_file:\" \"$TIMING_DATA\" | cut -d: -f2)
            
            echo "    {"
            echo "      \"file\": \"$basename_file\","
            echo "      \"passed\": $passed,"
            echo "      \"failed\": $failed,"
            echo "      \"skipped\": $skipped,"
            echo "      \"duration_seconds\": $duration"
            echo -n "    }"
        fi
    done
    echo ""
    echo "  ]"
    echo "}"
}


# --- Output ---
if [[ -n "$EXPORT_FILE" ]]; then
    if [[ "$JSON_OUTPUT" == true ]]; then
        generate_json_report > "$EXPORT_FILE"
        echo "✅ JSON report saved to: $EXPORT_FILE"
    else
        generate_text_report > "$EXPORT_FILE"
        echo "✅ Text report saved to: $EXPORT_FILE"
    fi
else
    if [[ "$JSON_OUTPUT" == true ]]; then
        generate_json_report
    else
        generate_text_report
    fi
fi

# Exit with error code if there are failures
if grep -q "FAIL\|✗" "$SUMMARY_DATA" 2>/dev/null; then
  # A failure was found if grep returns a 0 exit code
  if [[ $(grep -c "FAIL\|✗" "$SUMMARY_DATA" 2>/dev/null) -gt 0 ]]; then
    exit 1
  fi
fi

exit 0
