#!/bin/bash

# Comprehensive Development Environment Setup Script for Attio MCP Server
# This script orchestrates all setup tasks for a complete development environment
# 
# Usage: ./scripts/setup-dev-env.sh [options]
# Options:
#   --skip-tdd        Skip TDD setup
#   --skip-ide        Skip IDE configuration  
#   --skip-hooks      Skip git hooks setup
#   --force           Re-run all setup even if already configured
#   --help            Show this help message

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration flags
SKIP_TDD=false
SKIP_IDE=false
SKIP_HOOKS=false
FORCE_SETUP=false
VERBOSE=false

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Summary tracking
declare -a SUCCESS_ITEMS=()
declare -a WARNING_ITEMS=()
declare -a ERROR_ITEMS=()
SETUP_START_TIME=$(date +%s)

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "\n${BLUE}${BOLD}================================================${NC}"
    echo -e "${BLUE}${BOLD}  $1${NC}"
    echo -e "${BLUE}${BOLD}================================================${NC}"
}

print_step() {
    echo -e "\n${CYAN}[STEP]${NC} ${BOLD}$1${NC}"
}

print_substep() {
    echo -e "  ${MAGENTA}→${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    SUCCESS_ITEMS+=("$1")
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    WARNING_ITEMS+=("$1")
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    ERROR_ITEMS+=("$1")
}

spinner() {
    local pid=$1
    local message=$2
    local spin='⣾⣽⣻⢿⡿⣟⣯⣷'
    local i=0
    
    while kill -0 $pid 2>/dev/null; do
        i=$(( (i+1) %8 ))
        printf "\r  ${CYAN}${spin:$i:1}${NC} ${message}"
        sleep 0.1
    done
    printf "\r"
}

check_command() {
    local cmd=$1
    local name=${2:-$1}
    
    if command -v "$cmd" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

version_compare() {
    # Compare two version strings (e.g., "18.0.0" vs "16.14.0")
    # Returns 0 if $1 >= $2, 1 otherwise
    local version1=$1
    local version2=$2
    
    if [[ "$(printf '%s\n' "$version2" "$version1" | sort -V | head -n1)" == "$version2" ]]; then
        return 0
    else
        return 1
    fi
}

create_env_from_template() {
    local env_file="$PROJECT_ROOT/.env"
    local template_file="$PROJECT_ROOT/.env.example"
    
    if [[ -f "$env_file" ]] && [[ "$FORCE_SETUP" != "true" ]]; then
        print_info ".env file already exists"
        return 0
    fi
    
    if [[ ! -f "$template_file" ]]; then
        print_substep "Creating .env.example template..."
        cat > "$template_file" << 'EOF'
# Attio API Configuration (Required)
ATTIO_API_KEY=your-attio-api-key-here

# Optional: Workspace configuration
# ATTIO_WORKSPACE_ID=your-workspace-id-here

# Server Configuration (Optional)
PORT=3000
LOG_LEVEL=info
NODE_ENV=development

# Test Configuration (Optional)
SKIP_INTEGRATION_TESTS=false
TEST_TIMEOUT=30000

# Performance Monitoring (Optional)
ENABLE_PERFORMANCE_MONITORING=false
PERFORMANCE_LOG_LEVEL=warn
EOF
        print_success "Created .env.example template"
    fi
    
    if [[ ! -f "$env_file" ]]; then
        cp "$template_file" "$env_file"
        print_success "Created .env file from template"
        print_warning "Remember to add your ATTIO_API_KEY to .env"
    else
        print_info ".env file created/updated"
    fi
}

# ============================================================================
# Setup Functions
# ============================================================================

check_node_version() {
    print_step "Checking Node.js version..."
    
    if ! check_command node "Node.js"; then
        print_error "Node.js is not installed"
        print_info "Please install Node.js 18.0.0 or higher from https://nodejs.org/"
        return 1
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local required_version="18.0.0"
    
    if version_compare "$node_version" "$required_version"; then
        print_success "Node.js version $node_version meets requirements (>= $required_version)"
    else
        print_error "Node.js version $node_version is below required version $required_version"
        print_info "Please upgrade Node.js from https://nodejs.org/"
        return 1
    fi
    
    # Check npm
    if check_command npm "npm"; then
        local npm_version=$(npm --version)
        print_success "npm version $npm_version is installed"
    else
        print_error "npm is not installed"
        return 1
    fi
}

install_dependencies() {
    print_step "Installing npm dependencies..."
    
    if [[ -d "$PROJECT_ROOT/node_modules" ]] && [[ "$FORCE_SETUP" != "true" ]]; then
        print_info "Dependencies already installed (use --force to reinstall)"
        
        # Quick check for missing dependencies
        print_substep "Verifying dependencies..."
        (cd "$PROJECT_ROOT" && npm ls --depth=0 &>/dev/null) &
        spinner $! "Checking installed packages"
        
        if [[ $? -eq 0 ]]; then
            print_success "All dependencies are properly installed"
        else
            print_warning "Some dependencies might be missing, running npm install..."
            (cd "$PROJECT_ROOT" && npm install) &
            spinner $! "Installing missing dependencies"
            wait $!
            print_success "Dependencies updated"
        fi
    else
        print_substep "Running npm install..."
        (cd "$PROJECT_ROOT" && npm install) &
        spinner $! "Installing dependencies"
        wait $!
        
        if [[ $? -eq 0 ]]; then
            print_success "Dependencies installed successfully"
        else
            print_error "Failed to install dependencies"
            return 1
        fi
    fi
}

setup_git_hooks() {
    print_step "Setting up Git hooks..."
    
    if [[ "$SKIP_HOOKS" == "true" ]]; then
        print_info "Skipping git hooks setup (--skip-hooks flag)"
        return 0
    fi
    
    if [[ ! -d "$PROJECT_ROOT/.git" ]]; then
        print_warning "Not in a git repository, skipping git hooks"
        return 0
    fi
    
    # Check if Husky is installed and set up
    if [[ -d "$PROJECT_ROOT/.husky" ]] && [[ "$FORCE_SETUP" != "true" ]]; then
        print_info "Husky hooks already configured"
    else
        print_substep "Initializing Husky..."
        (cd "$PROJECT_ROOT" && npx husky init 2>/dev/null || true)
        print_success "Husky initialized"
    fi
    
    # Use the existing install-hooks.sh script if available
    if [[ -f "$PROJECT_ROOT/build/install-hooks.sh" ]]; then
        print_substep "Installing project-specific git hooks..."
        (cd "$PROJECT_ROOT" && bash build/install-hooks.sh --symlink)
        print_success "Project git hooks installed"
    fi
    
    # Set up pre-commit hook for tests
    local precommit_hook="$PROJECT_ROOT/.husky/pre-commit"
    if [[ ! -f "$precommit_hook" ]] || [[ "$FORCE_SETUP" == "true" ]]; then
        print_substep "Creating pre-commit hook..."
        cat > "$precommit_hook" << 'EOF'
#!/bin/bash

# Pre-commit hook for Attio MCP Server
echo "Running pre-commit checks..."

# Run linting
echo "→ Checking lint..."
npm run lint:check || {
    echo "❌ Lint check failed. Run 'npm run lint:fix' to fix issues."
    exit 1
}

# Check formatting
echo "→ Checking formatting..."
npm run check:format || {
    echo "❌ Format check failed. Run 'npm run format' to fix formatting."
    exit 1
}

# Run build
echo "→ Building project..."
npm run build || {
    echo "❌ Build failed. Please fix TypeScript errors."
    exit 1
}

# Run offline tests (fast)
echo "→ Running tests..."
npm run test:offline || {
    echo "❌ Tests failed. Please fix failing tests."
    exit 1
}

echo "✅ All pre-commit checks passed!"
EOF
        chmod +x "$precommit_hook"
        print_success "Pre-commit hook created"
    fi
}

setup_environment() {
    print_step "Setting up environment configuration..."
    
    # Create .env from template
    create_env_from_template
    
    # Validate environment if .env exists
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        print_substep "Validating environment variables..."
        
        # Check for ATTIO_API_KEY
        if grep -q "^ATTIO_API_KEY=your-attio-api-key-here" "$PROJECT_ROOT/.env" 2>/dev/null || \
           ! grep -q "^ATTIO_API_KEY=." "$PROJECT_ROOT/.env" 2>/dev/null; then
            print_warning "ATTIO_API_KEY is not configured in .env"
            print_info "Get your API key from: https://app.attio.com/settings/api"
        else
            print_success "ATTIO_API_KEY is configured"
        fi
    fi
}

run_initial_build() {
    print_step "Running initial build..."
    
    print_substep "Compiling TypeScript..."
    (cd "$PROJECT_ROOT" && npm run build) &
    spinner $! "Building project"
    wait $!
    
    if [[ $? -eq 0 ]]; then
        print_success "Build completed successfully"
    else
        print_error "Build failed - there might be TypeScript errors"
        print_info "Run 'npm run build' to see detailed error messages"
        return 1
    fi
}

setup_ide_config() {
    print_step "Setting up IDE configuration..."
    
    if [[ "$SKIP_IDE" == "true" ]]; then
        print_info "Skipping IDE setup (--skip-ide flag)"
        return 0
    fi
    
    # VS Code configuration
    if [[ ! -d "$PROJECT_ROOT/.vscode" ]]; then
        mkdir -p "$PROJECT_ROOT/.vscode"
    fi
    
    # VS Code settings
    local vscode_settings="$PROJECT_ROOT/.vscode/settings.json"
    if [[ ! -f "$vscode_settings" ]] || [[ "$FORCE_SETUP" == "true" ]]; then
        print_substep "Creating VS Code settings..."
        cat > "$vscode_settings" << 'EOF'
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll": true,
    "source.organizeImports": true
  },
  "testing.automaticallyOpenPeekView": "never",
  "vitest.enable": true,
  "vitest.commandLine": "npm run test:watch:offline",
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "files.exclude": {
    "**/node_modules": true,
    "**/coverage": true,
    "**/dist": true,
    "**/.git": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/coverage": true,
    "**/dist": true,
    "**/package-lock.json": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "eslint.validate": [
    "javascript",
    "typescript"
  ],
  "terminal.integrated.env.osx": {
    "NODE_ENV": "development"
  },
  "terminal.integrated.env.linux": {
    "NODE_ENV": "development"
  },
  "terminal.integrated.env.windows": {
    "NODE_ENV": "development"
  }
}
EOF
        print_success "VS Code settings created"
    else
        print_info "VS Code settings already exist"
    fi
    
    # VS Code extensions recommendations
    local vscode_extensions="$PROJECT_ROOT/.vscode/extensions.json"
    if [[ ! -f "$vscode_extensions" ]] || [[ "$FORCE_SETUP" == "true" ]]; then
        print_substep "Creating VS Code extension recommendations..."
        cat > "$vscode_extensions" << 'EOF'
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "vitest.explorer",
    "ms-vscode.vscode-typescript-next",
    "christian-kohler.path-intellisense",
    "aaron-bond.better-comments",
    "wayou.vscode-todo-highlight",
    "streetsidesoftware.code-spell-checker"
  ]
}
EOF
        print_success "VS Code extension recommendations created"
    else
        print_info "VS Code extension recommendations already exist"
    fi
}

setup_tdd_environment() {
    print_step "Setting up TDD environment..."
    
    if [[ "$SKIP_TDD" == "true" ]]; then
        print_info "Skipping TDD setup (--skip-tdd flag)"
        return 0
    fi
    
    # Use existing TDD setup script
    if [[ -f "$SCRIPT_DIR/setup-tdd.sh" ]]; then
        print_substep "Running TDD setup script..."
        bash "$SCRIPT_DIR/setup-tdd.sh"
        print_success "TDD environment configured"
    else
        print_warning "TDD setup script not found, skipping TDD-specific configuration"
    fi
}

run_health_checks() {
    print_step "Running health checks..."
    
    local health_status=0
    
    # Check TypeScript compilation
    print_substep "Checking TypeScript compilation..."
    if (cd "$PROJECT_ROOT" && npx tsc --noEmit) &>/dev/null; then
        print_success "TypeScript compilation check passed"
    else
        print_warning "TypeScript has compilation warnings/errors"
        health_status=1
    fi
    
    # Check linting
    print_substep "Checking linting..."
    if (cd "$PROJECT_ROOT" && npm run lint:check) &>/dev/null; then
        print_success "Linting check passed"
    else
        print_warning "Linting issues found (run 'npm run lint:fix' to fix)"
        health_status=1
    fi
    
    # Check formatting
    print_substep "Checking code formatting..."
    if (cd "$PROJECT_ROOT" && npm run check:format) &>/dev/null; then
        print_success "Code formatting check passed"
    else
        print_warning "Formatting issues found (run 'npm run format' to fix)"
        health_status=1
    fi
    
    # Run offline tests
    print_substep "Running offline tests..."
    if (cd "$PROJECT_ROOT" && npm run test:offline -- --run) &>/dev/null; then
        print_success "Offline tests passed"
    else
        print_warning "Some tests are failing"
        health_status=1
    fi
    
    # Check for API key configuration
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        if grep -q "^ATTIO_API_KEY=.*[a-zA-Z0-9]" "$PROJECT_ROOT/.env" 2>/dev/null && \
           ! grep -q "^ATTIO_API_KEY=your-attio-api-key-here" "$PROJECT_ROOT/.env" 2>/dev/null; then
            print_substep "Testing Attio API connection..."
            
            # Use the validate-env.sh script if available
            if [[ -f "$PROJECT_ROOT/scripts/docker/validate-env.sh" ]]; then
                if (cd "$PROJECT_ROOT" && bash scripts/docker/validate-env.sh --test-api) &>/dev/null; then
                    print_success "Attio API connection successful"
                else
                    print_warning "Could not verify Attio API connection"
                    health_status=1
                fi
            else
                print_info "API validation script not available"
            fi
        else
            print_info "Attio API key not configured (optional for offline development)"
        fi
    fi
    
    return $health_status
}

print_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - SETUP_START_TIME))
    
    print_header "Setup Summary"
    
    echo -e "\n${BOLD}Setup completed in ${duration} seconds${NC}\n"
    
    # Success items
    if [[ ${#SUCCESS_ITEMS[@]} -gt 0 ]]; then
        echo -e "${GREEN}${BOLD}✓ Successful (${#SUCCESS_ITEMS[@]})${NC}"
        for item in "${SUCCESS_ITEMS[@]}"; do
            echo -e "  ${GREEN}✓${NC} $item"
        done
    fi
    
    # Warnings
    if [[ ${#WARNING_ITEMS[@]} -gt 0 ]]; then
        echo -e "\n${YELLOW}${BOLD}⚠ Warnings (${#WARNING_ITEMS[@]})${NC}"
        for item in "${WARNING_ITEMS[@]}"; do
            echo -e "  ${YELLOW}⚠${NC} $item"
        done
    fi
    
    # Errors
    if [[ ${#ERROR_ITEMS[@]} -gt 0 ]]; then
        echo -e "\n${RED}${BOLD}✗ Errors (${#ERROR_ITEMS[@]})${NC}"
        for item in "${ERROR_ITEMS[@]}"; do
            echo -e "  ${RED}✗${NC} $item"
        done
    fi
    
    # Next steps
    echo -e "\n${BLUE}${BOLD}Next Steps:${NC}"
    echo "1. Add your ATTIO_API_KEY to .env file"
    echo "   Get it from: https://app.attio.com/settings/api"
    echo ""
    echo "2. Start development:"
    echo "   ${GREEN}npm run test:watch:offline${NC} - Run tests in watch mode"
    echo "   ${GREEN}npm run build:watch${NC} - Build in watch mode"
    echo "   ${GREEN}npm run dev${NC} - Start development server"
    echo ""
    echo "3. Before committing:"
    echo "   ${GREEN}npm run check${NC} - Run all validation checks"
    echo "   ${GREEN}npm test${NC} - Run all tests"
    echo ""
    echo "4. View documentation:"
    echo "   ${GREEN}cat docs/README.md${NC} - Main documentation"
    echo "   ${GREEN}cat docs/tdd-guide.md${NC} - TDD guide"
    echo ""
    
    # Exit status
    if [[ ${#ERROR_ITEMS[@]} -gt 0 ]]; then
        echo -e "\n${RED}${BOLD}⚠ Setup completed with errors. Please review and fix the issues above.${NC}"
        return 1
    elif [[ ${#WARNING_ITEMS[@]} -gt 0 ]]; then
        echo -e "\n${YELLOW}${BOLD}✓ Setup completed with warnings. The environment is functional but some optional features may not work.${NC}"
        return 0
    else
        echo -e "\n${GREEN}${BOLD}✅ Setup completed successfully! Your development environment is ready.${NC}"
        return 0
    fi
}

show_help() {
    cat << EOF
Attio MCP Server - Development Environment Setup

Usage: $0 [options]

This script sets up a complete development environment for the Attio MCP Server project.

Options:
    --skip-tdd        Skip TDD environment setup
    --skip-ide        Skip IDE configuration setup
    --skip-hooks      Skip git hooks setup
    --force           Force re-run all setup steps
    --verbose         Show detailed output
    --help            Show this help message

Examples:
    # Full setup (recommended for new developers)
    $0

    # Quick setup without IDE config
    $0 --skip-ide

    # Re-run all setup steps
    $0 --force

    # Minimal setup for CI/CD
    $0 --skip-tdd --skip-ide --skip-hooks

Requirements:
    - Node.js >= 18.0.0
    - npm >= 8.0.0
    - Git (for hooks setup)
    - Attio API key (for integration tests)

For more information, see docs/README.md
EOF
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    # Parse command line arguments
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --skip-tdd)
                SKIP_TDD=true
                shift
                ;;
            --skip-ide)
                SKIP_IDE=true
                shift
                ;;
            --skip-hooks)
                SKIP_HOOKS=true
                shift
                ;;
            --force)
                FORCE_SETUP=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                set -x  # Enable bash debug output
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    print_header "Attio MCP Server - Development Environment Setup"
    echo -e "${CYAN}Setting up your development environment...${NC}\n"
    
    # Track overall success
    local setup_failed=false
    
    # Step 1: Check Node.js version
    if ! check_node_version; then
        setup_failed=true
        print_error "Node.js version check failed"
    fi
    
    # Step 2: Install dependencies
    if ! install_dependencies; then
        setup_failed=true
        print_error "Dependency installation failed"
    fi
    
    # Step 3: Setup environment
    if ! setup_environment; then
        setup_failed=true
        print_error "Environment setup failed"
    fi
    
    # Step 4: Setup git hooks
    if ! setup_git_hooks; then
        setup_failed=true
        print_error "Git hooks setup failed"
    fi
    
    # Step 5: Run initial build
    if ! run_initial_build; then
        setup_failed=true
        print_error "Initial build failed"
    fi
    
    # Step 6: Setup IDE configuration
    if ! setup_ide_config; then
        setup_failed=true
        print_error "IDE configuration failed"
    fi
    
    # Step 7: Setup TDD environment
    if ! setup_tdd_environment; then
        setup_failed=true
        print_error "TDD environment setup failed"
    fi
    
    # Step 8: Run health checks
    if ! run_health_checks; then
        print_warning "Some health checks failed"
    fi
    
    # Print summary
    print_summary
    
    # Exit with appropriate code
    if [[ "$setup_failed" == "true" ]]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main "$@"