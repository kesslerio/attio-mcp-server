#!/bin/bash
set -e

# Local CI Simulation Script
# Mimics GitHub Actions pipeline exactly for local development

echo "🏠 Local CI Simulation Starting..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODE_VERSION=${NODE_VERSION:-"22.x"}
RUN_INTEGRATION=${RUN_INTEGRATION:-false}
RUN_PERFORMANCE=${RUN_PERFORMANCE:-false}
SKIP_BUILD=${SKIP_BUILD:-false}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --integration)
      RUN_INTEGRATION=true
      shift
      ;;
    --performance)
      RUN_PERFORMANCE=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --node-version)
      NODE_VERSION="$2"
      shift 2
      ;;
    --help|-h)
      cat << EOF
Local CI Simulation

Usage: ./scripts/ci-local.sh [options]

Options:
  --integration     Run integration tests (requires ATTIO_API_KEY)
  --performance     Run performance tests and budget checks
  --skip-build      Skip build verification step
  --node-version    Specify Node.js version (default: 22.x)
  --help, -h        Show this help message

Examples:
  ./scripts/ci-local.sh
  ./scripts/ci-local.sh --integration --performance
  ./scripts/ci-local.sh --skip-build --node-version 20.x

This script simulates the GitHub Actions CI pipeline locally,
allowing you to catch issues before pushing to remote.
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Function to run step with timing and status
run_step() {
  local name="$1"
  local command="$2"
  local start_time=$(date +%s)
  
  printf "${BLUE}🔍 %-30s${NC}" "$name"
  
  if eval "$command" > /tmp/ci-step.log 2>&1; then
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    printf "${GREEN}✅ (${duration}s)${NC}\n"
    return 0
  else
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    printf "${RED}❌ (${duration}s)${NC}\n"
    echo "${RED}Error output:${NC}"
    cat /tmp/ci-step.log
    return 1
  fi
}

# Function to analyze changes for smart testing
analyze_changes() {
  echo "${BLUE}📊 Analyzing changes for smart test execution...${NC}"
  
  # Check if we're in a git repository
  if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "${YELLOW}⚠️ Not in a git repository, running full test suite${NC}"
    export TEST_STRATEGY="full"
    return
  fi
  
  # Get changed files (compared to main branch)
  local changed_files=""
  if git rev-parse --verify main > /dev/null 2>&1; then
    changed_files=$(git diff --name-only main...HEAD 2>/dev/null || echo "")
  fi
  
  # If no changes detected, check uncommitted changes
  if [[ -z "$changed_files" ]]; then
    changed_files=$(git diff --name-only HEAD 2>/dev/null || echo "")
    if [[ -z "$changed_files" ]]; then
      changed_files=$(git diff --name-only --cached 2>/dev/null || echo "")
    fi
  fi
  
  # Analyze file types
  local docs_only=true
  local tests_only=true
  local needs_integration=false
  
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    
    case "$file" in
      *.md|docs/*|README*|CHANGELOG*|LICENSE)
        # Documentation files don't affect other flags
        ;;
      test/*|*.test.*)
        docs_only=false
        ;;
      src/api/*|src/services/*|src/handlers/*)
        docs_only=false
        tests_only=false
        needs_integration=true
        ;;
      src/*)
        docs_only=false
        tests_only=false
        ;;
      *)
        docs_only=false
        tests_only=false
        ;;
    esac
  done <<< "$changed_files"
  
  # Determine test strategy
  if [[ "$docs_only" == "true" ]]; then
    export TEST_STRATEGY="smoke"
  elif [[ "$tests_only" == "true" ]]; then
    export TEST_STRATEGY="affected"
  elif [[ "$needs_integration" == "true" ]]; then
    export TEST_STRATEGY="full"
  else
    export TEST_STRATEGY="core"
  fi
  
  echo "${BLUE}  Strategy: ${TEST_STRATEGY}${NC}"
  if [[ -n "$changed_files" ]]; then
    echo "${BLUE}  Changed files: $(echo "$changed_files" | wc -l)${NC}"
  fi
}

# Start timing
SCRIPT_START=$(date +%s)

# Step 1: Environment validation
echo "${BLUE}🌍 Environment Information${NC}"
echo "  Node: $(node --version)"
echo "  NPM: $(npm --version)"
echo "  Platform: $(uname -s)"
echo "  Working Dir: $(pwd)"
echo ""

# Step 2: Change analysis
analyze_changes

# Step 3: Dependency installation (skip lifecycle scripts to avoid prepare/husky issues)
# Ensure devDependencies are installed regardless of NODE_ENV in user env
export npm_config_production=false
export NODE_ENV=development
run_step "Installing dependencies" "npm ci --ignore-scripts" || exit 1

# Explicitly install git hooks using our repo script (husky not required here)
run_step "Install git hooks" "npm run setup-hooks" || echo "${YELLOW}⚠️ Hook setup optional; continuing...${NC}"

# Ensure ESLint parser is available even if lockfile lags
run_step "Install ESLint TS parser" "npm i --no-save @typescript-eslint/parser@^8.39.0" || echo "${YELLOW}⚠️ Parser install optional; continuing...${NC}"

# Step 4: Lint and Type Check
echo "${YELLOW}📝 Code Quality Checks${NC}"
run_step "ESLint check" "npm run lint:check" || exit 1
run_step "TypeScript check" "npm run typecheck" || exit 1
run_step "Format check" "npm run check:format" || exit 1

# Step 5: Build
if [[ "$SKIP_BUILD" != "true" && "$TEST_STRATEGY" != "smoke" ]]; then
  echo "${YELLOW}🔨 Build Process${NC}"
  run_step "TypeScript compilation" "npm run build" || exit 1
  
  # Verify build artifacts
  run_step "Build verification" "test -d dist && test -f dist/index.js" || exit 1
fi

# Step 6: Smart Test Execution
echo "${YELLOW}🧪 Smart Test Execution (Strategy: ${TEST_STRATEGY})${NC}"

case "$TEST_STRATEGY" in
  smoke)
    echo "${BLUE}📚 Documentation changes detected - running smoke tests${NC}"
    run_step "Smoke tests" "npm run test:smoke" || exit 1
    ;;
  affected)
    echo "${BLUE}🎯 Test-only changes detected - running affected tests${NC}"
    run_step "Affected tests" "npm run test:affected" || exit 1
    ;;
  core)
    echo "${BLUE}🔧 Source changes detected - running core tests${NC}"
    run_step "Core tests" "npm run test:core" || exit 1
    ;;
  full)
    echo "${BLUE}🚀 API/Service changes detected - running extended tests${NC}"
    run_step "Extended tests" "npm run test:extended" || exit 1
    ;;
esac

# Step 7: Performance Budget Check
if [[ "$TEST_STRATEGY" != "smoke" ]]; then
  echo "${YELLOW}⚡ Performance Validation${NC}"
  run_step "Performance budgets" "npm run perf:budgets -- --tests-only" || {
    echo "${YELLOW}⚠️ Performance budget check failed, but continuing...${NC}"
  }
fi

# Step 8: Integration Tests (if requested)
if [[ "$RUN_INTEGRATION" == "true" ]]; then
  echo "${YELLOW}🔗 Integration Tests${NC}"
  
  if [[ -z "$ATTIO_API_KEY" ]]; then
    echo "${YELLOW}⚠️ ATTIO_API_KEY not set, skipping integration tests${NC}"
  else
    run_step "Integration tests" "npm run test:integration" || exit 1
  fi
fi

# Step 9: Performance Tests (if requested)
if [[ "$RUN_PERFORMANCE" == "true" ]]; then
  echo "${YELLOW}🏃 Performance Tests${NC}"
  run_step "Performance regression" "npm run perf:budgets -- --regression" || {
    echo "${YELLOW}⚠️ Performance regression check failed, but continuing...${NC}"
  }
fi

# Calculate total time
SCRIPT_END=$(date +%s)
TOTAL_TIME=$((SCRIPT_END - SCRIPT_START))
MINUTES=$((TOTAL_TIME / 60))
SECONDS=$((TOTAL_TIME % 60))

echo ""
echo "${GREEN}✅ Local CI simulation completed successfully!${NC}"
echo "${GREEN}⏱️  Total time: ${MINUTES}m ${SECONDS}s${NC}"
echo ""

# Success tips
echo "${BLUE}💡 Tips:${NC}"
echo "  • Your changes are ready for push to remote"
echo "  • Consider running integration tests before merging: --integration"
echo "  • For performance-critical changes, run: --performance"
echo "  • Use --skip-build for faster iterations during development"
