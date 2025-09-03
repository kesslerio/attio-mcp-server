#!/usr/bin/env bash
set -euo pipefail

# Enhanced E2E Health Check Script
# Comprehensive validation of E2E test environment and dependencies

show_help() {
  cat << EOF
Enhanced E2E Health Check Script

Usage: $0 [OPTIONS]

Options:
  -h, --help                Show this help message
  -v, --verbose             Verbose output with detailed checks
  -q, --quiet               Quiet mode, only show summary
  -f, --fix                 Attempt to fix common issues
  -r, --report              Generate detailed health report
  --cleanup                 Clean up test data and old logs
  --performance             Include performance baseline checks

Examples:
  $0                        # Basic health check
  $0 -v -r                  # Verbose with detailed report
  $0 --cleanup --fix        # Clean up and fix issues

EOF
}

# Default options
VERBOSE=false
QUIET=false
FIX_ISSUES=false
GENERATE_REPORT=false
CLEANUP=false
PERFORMANCE_CHECK=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -q|--quiet)
      QUIET=true
      shift
      ;;
    -f|--fix)
      FIX_ISSUES=true
      shift
      ;;
    -r|--report)
      GENERATE_REPORT=true
      shift
      ;;
    --cleanup)
      CLEANUP=true
      shift
      ;;
    --performance)
      PERFORMANCE_CHECK=true
      shift
      ;;
    -*)
      echo "Unknown option $1"
      show_help
      exit 1
      ;;
    *)
      echo "Unexpected argument $1"
      show_help
      exit 1
      ;;
  esac
done

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)
cd "$ROOT_DIR"

# Load .env if present so ATTIO_API_KEY is available for curl
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env"
  set +a
fi

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
HEALTH_SCORE=100
ISSUES=()

log() {
  if [[ "$QUIET" == false ]]; then
    echo "$@"
  fi
}

log_verbose() {
  if [[ "$VERBOSE" == true ]]; then
    echo "$@"
  fi
}

add_issue() {
  local severity="$1"
  local message="$2"
  local points="$3"
  
  ISSUES+=("[$severity] $message")
  HEALTH_SCORE=$((HEALTH_SCORE - points))
  
  if [[ "$severity" == "CRITICAL" ]]; then
    log "❌ CRITICAL: $message"
  elif [[ "$severity" == "WARNING" ]]; then
    log "⚠️  WARNING: $message"
  else
    log "ℹ️  INFO: $message"
  fi
}

check_dependencies() {
  log_verbose "🔍 Checking system dependencies..."
  
  # Check jq
  if ! command -v jq >/dev/null 2>&1; then
    add_issue "WARNING" "jq not found. Install with: brew install jq" 5
    if [[ "$FIX_ISSUES" == true ]]; then
      log "🔧 Attempting to install jq..."
      brew install jq 2>/dev/null && log "✅ jq installed" || log "❌ Failed to install jq"
    fi
  else
    log_verbose "✅ jq found"
  fi
  
  # Check curl
  if ! command -v curl >/dev/null 2>&1; then
    add_issue "CRITICAL" "curl not found" 20
  else
    log_verbose "✅ curl found"
  fi
  
  # Check node
  if ! command -v node >/dev/null 2>&1; then
    add_issue "CRITICAL" "Node.js not found" 30
  else
    local node_version=$(node --version)
    log_verbose "✅ Node.js: $node_version"
  fi
  
  # Check npm
  if ! command -v npm >/dev/null 2>&1; then
    add_issue "CRITICAL" "npm not found" 30
  else
    local npm_version=$(npm --version)
    log_verbose "✅ npm: $npm_version"
  fi
}

check_environment() {
  log_verbose "🌍 Checking environment configuration..."
  
  if [[ -z "${ATTIO_API_KEY:-}" ]]; then
    add_issue "CRITICAL" "ATTIO_API_KEY not set in environment" 30
  else
    log_verbose "✅ ATTIO_API_KEY is set"
  fi
  
  if [[ ! -f ".env" ]]; then
    add_issue "WARNING" ".env file not found" 10
  else
    log_verbose "✅ .env file exists"
  fi
  
  if [[ ! -f "package.json" ]]; then
    add_issue "CRITICAL" "package.json not found" 30
  else
    log_verbose "✅ package.json exists"
  fi
  
  if [[ ! -f "vitest.config.e2e.ts" ]]; then
    add_issue "WARNING" "vitest.config.e2e.ts not found" 10
  else
    log_verbose "✅ E2E vitest config exists"
  fi
}

check_api_connectivity() {
  log_verbose "🌐 Checking API connectivity..."
  
  if [[ -z "${ATTIO_API_KEY:-}" ]]; then
    log_verbose "⏸  Skipping API checks (no API key)"
    return
  fi
  
  # Test basic API connectivity
  local api_response
  api_response=$(curl -s --max-time 10 -w "%{http_code}" -o /dev/null \
    -H "Authorization: Bearer $ATTIO_API_KEY" \
    https://api.attio.com/v2/self 2>/dev/null || echo "000")
  
  if [[ "$api_response" == "200" ]]; then
    log_verbose "✅ API connectivity successful"
    
    # Get workspace info
    local workspace_name
    workspace_name=$(curl -s --max-time 10 -H "Authorization: Bearer $ATTIO_API_KEY" \
      https://api.attio.com/v2/self 2>/dev/null | jq -r '.workspace_name // "unknown"' 2>/dev/null || echo "unknown")
    log_verbose "   Workspace: $workspace_name"
    
  elif [[ "$api_response" == "401" ]]; then
    add_issue "CRITICAL" "API authentication failed (invalid key)" 25
  elif [[ "$api_response" == "000" ]]; then
    add_issue "WARNING" "API connection failed (network/timeout)" 15
  else
    add_issue "WARNING" "API returned HTTP $api_response" 10
  fi
}

check_test_data() {
  log_verbose "📊 Checking test data..."
  
  if [[ -z "${ATTIO_API_KEY:-}" ]]; then
    log_verbose "⏸  Skipping test data checks (no API key)"
    return
  fi
  
  # Count test companies
  local test_companies
  test_companies=$(curl -s --max-time 10 -H "Authorization: Bearer $ATTIO_API_KEY" \
    "https://api.attio.com/v2/objects/companies/records/query" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"filter":{"name":{"contains":"E2E_"}}}' 2>/dev/null \
    | jq '.data | length' 2>/dev/null || echo "0")
  
  log_verbose "   Test companies (E2E_*): $test_companies"
  
  if [[ "$test_companies" -gt 100 ]]; then
    add_issue "WARNING" "High number of test companies ($test_companies) - consider cleanup" 5
    if [[ "$CLEANUP" == true ]]; then
      log "🧹 Test data cleanup would be implemented here"
    fi
  fi
  
  # Check test people
  local test_people
  test_people=$(curl -s --max-time 10 -H "Authorization: Bearer $ATTIO_API_KEY" \
    "https://api.attio.com/v2/objects/people/records/query" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"filter":{"first_name":{"contains":"E2E_"}}}' 2>/dev/null \
    | jq '.data | length' 2>/dev/null || echo "0")
  
  log_verbose "   Test people (E2E_*): $test_people"
}

check_file_system() {
  log_verbose "📁 Checking file system..."
  
  # Check test-results directory
  if [[ ! -d "test-results" ]]; then
    add_issue "INFO" "test-results directory missing" 0
    if [[ "$FIX_ISSUES" == true ]]; then
      mkdir -p test-results
      log "✅ Created test-results directory"
    fi
  else
    local log_count=$(find test-results -name "*.log" | wc -l)
    log_verbose "   Found $log_count log files in test-results/"
    
    if [[ "$log_count" -gt 50 ]]; then
      add_issue "WARNING" "Many log files ($log_count) - consider cleanup" 2
      if [[ "$CLEANUP" == true ]]; then
        find test-results -name "*.log" -mtime +7 -delete
        log "🧹 Cleaned old log files"
      fi
    fi
  fi
  
  # Check node_modules
  if [[ ! -d "node_modules" ]]; then
    add_issue "WARNING" "node_modules directory missing - run npm install" 15
  else
    log_verbose "✅ node_modules directory exists"
  fi
  
  # Check scripts directory
  if [[ ! -d "scripts" ]]; then
    add_issue "WARNING" "scripts directory missing" 5
  else
    local script_count=$(find scripts -name "*.sh" | wc -l)
    log_verbose "   Found $script_count shell scripts"
  fi
}

run_smoke_tests() {
  log_verbose "🔥 Running smoke tests..."
  
  local smoke_result
  smoke_result=$(E2E_MODE=true npm run test:offline --silent 2>&1 | grep -E "(passed|failed)" | tail -1 || echo "failed")
  
  if echo "$smoke_result" | grep -q "passed"; then
    log_verbose "✅ Smoke tests passed"
  else
    add_issue "WARNING" "Smoke tests failed or didn't complete" 15
    log_verbose "   Output: $smoke_result"
  fi
}

check_performance() {
  if [[ "$PERFORMANCE_CHECK" == true ]]; then
    log_verbose "⚡ Checking performance baselines..."
    
    # Check if recent performance data exists
    local perf_logs=$(find test-results -name "*.log" -mtime -1 | head -3)
    if [[ -n "$perf_logs" ]]; then
      local avg_duration=0
      local count=0
      
      while IFS= read -r log_file; do
        if [[ -n "$log_file" ]]; then
          local duration=$(grep -o "Duration: [0-9]*s" "$log_file" 2>/dev/null | head -1 | grep -o "[0-9]*" || echo "0")
          if [[ "$duration" =~ ^[0-9]+$ ]] && [[ "$duration" -gt 0 ]]; then
            avg_duration=$((avg_duration + duration))
            count=$((count + 1))
          fi
        fi
      done <<< "$perf_logs"
      
      if [[ "$count" -gt 0 ]]; then
        avg_duration=$((avg_duration / count))
        log_verbose "   Average test duration: ${avg_duration}s"
        
        if [[ "$avg_duration" -gt 300 ]]; then
          add_issue "WARNING" "Tests taking longer than 5 minutes on average" 5
        fi
      fi
    else
      log_verbose "   No recent performance data available"
    fi
  fi
}

generate_health_report() {
  if [[ "$GENERATE_REPORT" == true ]]; then
    local report_file="test-results/health-report-$(date +%Y%m%d-%H%M%S).json"
    
    log "📄 Generating detailed health report: $report_file"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$TIMESTAMP",
  "health_score": $HEALTH_SCORE,
  "total_issues": ${#ISSUES[@]},
  "issues": [
EOF
    
    local first=true
    for issue in "${ISSUES[@]}"; do
      if [[ "$first" == false ]]; then
        echo "," >> "$report_file"
      fi
      first=false
      echo "    \"$issue\"" >> "$report_file"
    done
    
    cat >> "$report_file" << EOF

  ],
  "environment": {
    "attio_api_key_set": $([ -n "${ATTIO_API_KEY:-}" ] && echo "true" || echo "false"),
    "env_file_exists": $([ -f ".env" ] && echo "true" || echo "false"),
    "node_modules_exists": $([ -d "node_modules" ] && echo "true" || echo "false"),
    "test_results_exists": $([ -d "test-results" ] && echo "true" || echo "false")
  }
}
EOF
    
    log "✅ Health report saved"
  fi
}

# Main execution
log "🏥 Enhanced E2E Health Check"
log "============================"
log "Timestamp: $TIMESTAMP"
log ""

check_dependencies
check_environment
check_api_connectivity
check_test_data
check_file_system
run_smoke_tests
check_performance

# Summary
log ""
log "📊 Health Check Summary"
log "======================"
log "Overall Health Score: $HEALTH_SCORE/100"

if [[ "$HEALTH_SCORE" -ge 90 ]]; then
  log "✅ Excellent - E2E environment is healthy"
elif [[ "$HEALTH_SCORE" -ge 75 ]]; then
  log "⚠️  Good - Minor issues detected"
elif [[ "$HEALTH_SCORE" -ge 50 ]]; then
  log "⚠️  Fair - Several issues need attention"
else
  log "❌ Poor - Critical issues must be resolved"
fi

if [[ "${#ISSUES[@]}" -gt 0 ]]; then
  log ""
  log "🔍 Issues Found:"
  for issue in "${ISSUES[@]}"; do
    log "   $issue"
  done
fi

generate_health_report

log ""
log "✅ Health check complete!"

# Exit with appropriate code
if [[ "$HEALTH_SCORE" -ge 75 ]]; then
  exit 0
else
  exit 1
fi
