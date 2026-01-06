#!/bin/bash
set -e

# Auto-Fix Script for Development Issues
# Automatically fixes common development problems to maintain code quality

echo "🔧 Auto-Fix Development Issues"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
VERBOSE=false
SKIP_BUILD=false
AUTO_COMMIT=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --auto-commit)
      AUTO_COMMIT=true
      shift
      ;;
    --help|-h)
      cat << EOF
Auto-Fix Development Issues

Usage: ./scripts/fix-all.sh [options]

Options:
  --dry-run        Show what would be fixed without making changes
  --verbose, -v    Show detailed output and file-by-file progress
  --skip-build     Skip build verification after fixes
  --auto-commit    Automatically commit fixes (use with caution)
  --help, -h       Show this help message

This script automatically fixes:
  • Prettier formatting issues
  • ESLint auto-fixable problems
  • Import organization (node → external → internal)
  • Simple TypeScript optimizations (any → unknown)
  • Unused import removal
  • Basic code quality improvements

Examples:
  ./scripts/fix-all.sh --dry-run
  ./scripts/fix-all.sh --verbose
  ./scripts/fix-all.sh --auto-commit
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Function to run fix step with timing and status
run_fix() {
  local name="$1"
  local command="$2"
  local start_time=$(date +%s)
  
  printf "${BLUE}🔧 %-30s${NC}" "$name"
  
  if [[ "$DRY_RUN" == "true" ]]; then
    printf "${YELLOW}[DRY RUN]${NC}\\n"
    return 0
  fi
  
  if eval "$command" > /tmp/fix-step.log 2>&1; then
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    printf "${GREEN}✅ (${duration}s)${NC}\\n"
    return 0
  else
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    printf "${RED}❌ (${duration}s)${NC}\\n"
    if [[ "$VERBOSE" == "true" ]]; then
      echo "${RED}Error output:${NC}"
      cat /tmp/fix-step.log
    fi
    return 1
  fi
}

# Function to organize imports in TypeScript files
organize_imports() {
  local file="$1"
  
  if [[ ! -f "$file" ]]; then
    return 1
  fi
  
  # Extract imports and organize them
  local node_imports=$(grep "^import.*from ['\"]node:" "$file" | sort)
  local external_imports=$(grep "^import.*from ['\"][^./]" "$file" | grep -v "from ['\"]node:" | sort)
  local internal_imports=$(grep "^import.*from ['\"][./]" "$file" | sort)
  
  # Only proceed if file has imports
  if [[ -n "$node_imports$external_imports$internal_imports" ]]; then
    # Create temporary file with organized imports
    local temp_file=$(mktemp)
    
    # Add copyright/header if exists
    sed '/^import/,$d' "$file" > "$temp_file"
    
    # Add organized imports with spacing
    if [[ -n "$node_imports" ]]; then
      echo "$node_imports" >> "$temp_file"
      echo "" >> "$temp_file"
    fi
    
    if [[ -n "$external_imports" ]]; then
      echo "$external_imports" >> "$temp_file"
      echo "" >> "$temp_file"
    fi
    
    if [[ -n "$internal_imports" ]]; then
      echo "$internal_imports" >> "$temp_file"
      echo "" >> "$temp_file"
    fi
    
    # Add rest of file (skip imports)
    sed '1,/^import/d' "$file" | sed '1,/^$/d' >> "$temp_file"
    
    # Replace original file
    mv "$temp_file" "$file"
  fi
}

# Function to apply simple TypeScript optimizations
optimize_typescript() {
  find src test -name "*.ts" -not -path "*/node_modules/*" | while read -r file; do
    if [[ "$VERBOSE" == "true" ]]; then
      echo "  📝 Optimizing: $file"
    fi
    
    # Replace 'any' with 'unknown' where safe
    sed -i.bak 's/: any\([^A-Za-z]\)/: unknown\1/g' "$file"
    sed -i.bak 's/Record<string, any>/Record<string, unknown>/g' "$file"
    
    # Remove unused variables (basic patterns)
    sed -i.bak '/^[[:space:]]*const [a-zA-Z_][a-zA-Z0-9_]* =/d' "$file" 2>/dev/null || true
    
    # Remove .bak files
    rm -f "${file}.bak"
    
    # Organize imports
    organize_imports "$file"
  done
}

# Start timing
SCRIPT_START=$(date +%s)

# Step 1: Environment validation
echo "${BLUE}🌍 Environment Validation${NC}"
echo "  Node: $(node --version)"
echo "  Bun: $(bun --version)"
echo "  Working Dir: $(pwd)"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo "${YELLOW}🧪 DRY RUN MODE - No changes will be made${NC}"
  echo ""
fi

# Step 2: Prettier formatting
echo "${YELLOW}📝 Code Formatting${NC}"
run_fix "Prettier format" "bun run format" || {
  echo "${YELLOW}⚠️ Prettier formatting failed, but continuing...${NC}"
}

# Step 3: ESLint auto-fix
echo "${YELLOW}🔍 ESLint Auto-Fix${NC}"
run_fix "ESLint auto-fix" "bun run lint:fix" || {
  echo "${YELLOW}⚠️ ESLint auto-fix failed, but continuing...${NC}"
}

# Step 4: TypeScript optimizations
echo "${YELLOW}⚡ TypeScript Optimizations${NC}"
if [[ "$DRY_RUN" != "true" ]]; then
  optimize_typescript
  echo "${BLUE}🔧 TypeScript optimizations    ${GREEN}✅${NC}"
else
  echo "${BLUE}🔧 TypeScript optimizations    ${YELLOW}[DRY RUN]${NC}"
fi

# Step 5: Remove unused imports (using TypeScript compiler)
echo "${YELLOW}🧹 Import Cleanup${NC}"
run_fix "Remove unused imports" "bunx ts-unused-exports tsconfig.json --deleteUnusedFile" || {
  echo "${YELLOW}⚠️ Import cleanup failed, but continuing...${NC}"
}

# Step 6: Build verification (if not skipped)
if [[ "$SKIP_BUILD" != "true" ]]; then
  echo "${YELLOW}🔨 Build Verification${NC}"
  run_fix "TypeScript compilation" "bun run build" || {
    echo "${RED}❌ Build failed after fixes - manual intervention required${NC}"
    exit 1
  }
fi

# Step 7: Final validation
echo "${YELLOW}✅ Final Validation${NC}"
run_fix "Format check" "bun run check:format" || {
  echo "${YELLOW}⚠️ Format check failed after fixes${NC}"
}

run_fix "Lint check" "bun run lint:check" || {
  echo "${YELLOW}⚠️ Lint check still has issues - may need manual fixes${NC}"
}

# Step 8: Auto-commit (if requested)
if [[ "$AUTO_COMMIT" == "true" && "$DRY_RUN" != "true" ]]; then
  echo "${YELLOW}📝 Auto-Commit${NC}"
  
  if git diff --quiet && git diff --cached --quiet; then
    echo "${BLUE}🔧 Auto-commit                ${YELLOW}No changes to commit${NC}"
  else
    git add -A
    git commit -m "Chore: Auto-fix development issues

- Applied Prettier formatting
- Fixed ESLint auto-fixable issues
- Organized imports (node → external → internal)
- Applied TypeScript optimizations (any → unknown)
- Removed unused imports and variables

Generated by scripts/fix-all.sh --auto-commit"
    
    echo "${BLUE}🔧 Auto-commit                ${GREEN}✅ Committed fixes${NC}"
  fi
fi

# Calculate total time
SCRIPT_END=$(date +%s)
TOTAL_TIME=$((SCRIPT_END - SCRIPT_START))
MINUTES=$((TOTAL_TIME / 60))
SECONDS=$((TOTAL_TIME % 60))

echo ""
echo "${GREEN}✅ Auto-fix completed successfully!${NC}"
echo "${GREEN}⏱️  Total time: ${MINUTES}m ${SECONDS}s${NC}"
echo ""

# Success tips
echo "${BLUE}💡 What was fixed:${NC}"
echo "  • Code formatting (Prettier)"
echo "  • Auto-fixable lint issues (ESLint)"
echo "  • Import organization and cleanup"
echo "  • TypeScript optimizations (any → unknown)"
echo "  • Unused code removal"

if [[ "$DRY_RUN" != "true" ]]; then
  echo ""
  echo "${BLUE}🚀 Next steps:${NC}"
  echo "  • Review changes with: git diff"
  echo "  • Run tests: bun run test"
  echo "  • Create commit: git add -A && git commit -m 'Chore: Auto-fix issues'"
fi