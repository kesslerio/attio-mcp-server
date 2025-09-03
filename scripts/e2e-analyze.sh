#!/usr/bin/env bash
set -euo pipefail

# Require bash 4+ for associative arrays
if [[ "${BASH_VERSION%%.*}" -lt 4 ]]; then
  echo "❌ This script requires Bash 4.0 or higher"
  echo "Current version: $BASH_VERSION"
  echo "On macOS, install with: brew install bash"
  exit 1
fi

# E2E Test Analysis Script
# Analyzes test results and generates comprehensive failure reports

show_help() {
  cat << EOF
E2E Test Analysis Script

Usage: $0 [OPTIONS] [LOG_DIR]

Options:
  -h, --help                Show this help message
  -r, --recent              Analyze only recent logs (last 24h)
  -f, --failures-only       Show only failed tests
  -s, --summary             Generate summary report
  -p, --patterns            Extract common error patterns
  -t, --timing              Include timing analysis
  -j, --json                Output JSON format
  --flaky                   Identify potentially flaky tests
  --export FILE             Export analysis to file

Examples:
  $0                        # Analyze all logs in test-results/
  $0 -r -f                  # Recent failures only
  $0 --patterns --export analysis.json  # Pattern analysis to file
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

echo "📊 E2E Test Analysis"
echo "===================="
echo "Analyzing logs in: $LOG_DIR"

# Find log files
if [[ "$RECENT_ONLY" == true ]]; then
  LOG_FILES=$(find "$LOG_DIR" -name "e2e-*.log" -mtime -1 2>/dev/null | sort)
else
  LOG_FILES=$(find "$LOG_DIR" -name "e2e-*.log" 2>/dev/null | sort)
fi

if [[ -z "$LOG_FILES" ]]; then
  echo "❌ No E2E log files found"
  exit 1
fi

LOG_COUNT=$(echo "$LOG_FILES" | wc -l)
echo "Found $LOG_COUNT log files to analyze"
echo "===================="

# Initialize analysis data
declare -A TEST_RESULTS
declare -A ERROR_PATTERNS
declare -A TIMING_DATA
declare -A FLAKY_TESTS

# Analysis functions
analyze_log_file() {
  local log_file="$1"
  local basename=$(basename "$log_file")
  
  echo "Analyzing: $basename"
  
  # Extract test results
  local passed=$(grep -c "✓" "$log_file" 2>/dev/null || echo "0")
  local failed=$(grep -c "✗" "$log_file" 2>/dev/null || echo "0")
  local skipped=$(grep -c "↷" "$log_file" 2>/dev/null || echo "0")
  
  TEST_RESULTS["$basename"]="$passed,$failed,$skipped"
  
  # Extract timing if available
  if [[ "$TIMING_ANALYSIS" == true ]]; then
    local duration=$(grep -o "Duration: [0-9]*s" "$log_file" 2>/dev/null | head -1 | grep -o "[0-9]*" || echo "0")
    TIMING_DATA["$basename"]="$duration"
  fi
  
  # Extract error patterns
  if [[ "$EXTRACT_PATTERNS" == true && "$failed" -gt 0 ]]; then
    # Common error patterns
    local api_errors=$(grep -c "API.*error\|HTTP.*error\|Request failed" "$log_file" 2>/dev/null || echo "0")
    local timeout_errors=$(grep -c "timeout\|Timeout" "$log_file" 2>/dev/null || echo "0")
    local assertion_errors=$(grep -c "AssertionError\|Expected.*but got" "$log_file" 2>/dev/null || echo "0")
    local connection_errors=$(grep -c "ECONNREFUSED\|Connection.*refused\|Network error" "$log_file" 2>/dev/null || echo "0")
    
    ERROR_PATTERNS["$basename"]="api:$api_errors,timeout:$timeout_errors,assertion:$assertion_errors,connection:$connection_errors"
  fi
}

# Analyze all log files
while IFS= read -r log_file; do
  [[ -n "$log_file" ]] && analyze_log_file "$log_file"
done <<< "$LOG_FILES"

# Generate report
generate_summary() {
  echo ""
  echo "📈 Summary Report"
  echo "================="
  
  local total_passed=0
  local total_failed=0
  local total_skipped=0
  local total_files=0
  
  for file in "${!TEST_RESULTS[@]}"; do
    IFS=',' read -r passed failed skipped <<< "${TEST_RESULTS[$file]}"
    total_passed=$((total_passed + passed))
    total_failed=$((total_failed + failed))
    total_skipped=$((total_skipped + skipped))
    total_files=$((total_files + 1))
  done
  
  local total_tests=$((total_passed + total_failed + total_skipped))
  local success_rate=0
  if [[ "$total_tests" -gt 0 ]]; then
    success_rate=$(echo "scale=2; $total_passed * 100 / $total_tests" | bc -l 2>/dev/null || echo "0")
  fi
  
  echo "Files analyzed: $total_files"
  echo "Total tests: $total_tests"
  echo "✅ Passed: $total_passed"
  echo "❌ Failed: $total_failed"
  echo "⏸ Skipped: $total_skipped"
  echo "🎯 Success rate: ${success_rate}%"
}

generate_failures_report() {
  echo ""
  echo "❌ Failed Tests Analysis"
  echo "========================"
  
  local has_failures=false
  for file in "${!TEST_RESULTS[@]}"; do
    IFS=',' read -r passed failed skipped <<< "${TEST_RESULTS[$file]}"
    if [[ "$failed" -gt 0 ]]; then
      has_failures=true
      echo ""
      echo "📁 $file: $failed failed tests"
      
      # Extract specific test names that failed
      local log_path="$LOG_DIR/$file"
      if [[ -f "$log_path" ]]; then
        echo "   Failed test cases:"
        grep -A 2 "✗" "$log_path" 2>/dev/null | grep -E "✗|expected|actual" | head -10 | sed 's/^/     /'
      fi
    fi
  done
  
  if [[ "$has_failures" == false ]]; then
    echo "🎉 No failed tests found!"
  fi
}

generate_patterns_report() {
  if [[ "$EXTRACT_PATTERNS" == true ]]; then
    echo ""
    echo "🔍 Error Patterns Analysis"
    echo "=========================="
    
    local total_api=0
    local total_timeout=0
    local total_assertion=0
    local total_connection=0
    
    for file in "${!ERROR_PATTERNS[@]}"; do
      IFS=',' read -r api timeout assertion connection <<< "${ERROR_PATTERNS[$file]}"
      
      # Extract numbers
      api=$(echo "$api" | grep -o "[0-9]*" || echo "0")
      timeout=$(echo "$timeout" | grep -o "[0-9]*" || echo "0")
      assertion=$(echo "$assertion" | grep -o "[0-9]*" || echo "0")
      connection=$(echo "$connection" | grep -o "[0-9]*" || echo "0")
      
      total_api=$((total_api + api))
      total_timeout=$((total_timeout + timeout))
      total_assertion=$((total_assertion + assertion))
      total_connection=$((total_connection + connection))
    done
    
    echo "🌐 API errors: $total_api"
    echo "⏱ Timeout errors: $total_timeout"
    echo "🔍 Assertion errors: $total_assertion"
    echo "🔌 Connection errors: $total_connection"
    
    # Suggest actions based on patterns
    echo ""
    echo "💡 Recommendations:"
    if [[ "$total_api" -gt 0 ]]; then
      echo "   - Check API key validity and rate limits"
    fi
    if [[ "$total_timeout" -gt 0 ]]; then
      echo "   - Consider increasing timeout values or optimizing slow operations"
    fi
    if [[ "$total_assertion" -gt 0 ]]; then
      echo "   - Review test assertions and expected values"
    fi
    if [[ "$total_connection" -gt 0 ]]; then
      echo "   - Check network connectivity and service availability"
    fi
  fi
}

generate_timing_report() {
  if [[ "$TIMING_ANALYSIS" == true ]]; then
    echo ""
    echo "⏱ Timing Analysis"
    echo "================="
    
    local total_time=0
    local file_count=0
    local slowest_file=""
    local slowest_time=0
    
    for file in "${!TIMING_DATA[@]}"; do
      local duration="${TIMING_DATA[$file]}"
      if [[ "$duration" =~ ^[0-9]+$ ]]; then
        total_time=$((total_time + duration))
        file_count=$((file_count + 1))
        
        if [[ "$duration" -gt "$slowest_time" ]]; then
          slowest_time="$duration"
          slowest_file="$file"
        fi
      fi
    done
    
    if [[ "$file_count" -gt 0 ]]; then
      local avg_time=$((total_time / file_count))
      echo "Average execution time: ${avg_time}s"
      echo "Total execution time: ${total_time}s"
      if [[ -n "$slowest_file" ]]; then
        echo "Slowest test suite: $slowest_file (${slowest_time}s)"
      fi
    fi
  fi
}

generate_json_output() {
  if [[ "$JSON_OUTPUT" == true ]]; then
    local json_file="${EXPORT_FILE:-analysis-$(date +%Y%m%d-%H%M%S).json}"
    
    echo ""
    echo "📄 Generating JSON report: $json_file"
    
    cat > "$json_file" << EOF
{
  "analysis_timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "log_directory": "$LOG_DIR",
  "files_analyzed": $(echo "${!TEST_RESULTS[@]}" | wc -w),
  "test_results": {
EOF
    
    local first=true
    for file in "${!TEST_RESULTS[@]}"; do
      if [[ "$first" == false ]]; then
        echo "," >> "$json_file"
      fi
      first=false
      
      IFS=',' read -r passed failed skipped <<< "${TEST_RESULTS[$file]}"
      cat >> "$json_file" << EOF
    "$file": {
      "passed": $passed,
      "failed": $failed,
      "skipped": $skipped
    }
EOF
    done
    
    echo "" >> "$json_file"
    echo "  }" >> "$json_file"
    echo "}" >> "$json_file"
    
    echo "✅ JSON report saved to: $json_file"
  fi
}

# Generate requested reports
if [[ "$SUMMARY_ONLY" == false ]] || [[ "$SUMMARY_ONLY" == true ]]; then
  generate_summary
fi

if [[ "$FAILURES_ONLY" == true ]] || [[ "$SUMMARY_ONLY" == false ]]; then
  generate_failures_report
fi

generate_patterns_report
generate_timing_report
generate_json_output

echo ""
echo "✅ Analysis complete!"