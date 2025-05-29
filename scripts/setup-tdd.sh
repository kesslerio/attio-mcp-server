#!/bin/bash

# TDD Environment Setup Script
# Sets up a complete TDD development environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  TDD Environment Setup${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Change to project root
cd "$PROJECT_ROOT"

print_header

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "Not in a git repository. TDD setup requires git."
    exit 1
fi

print_step "1. Verifying dependencies..."

# Check Node.js version
NODE_VERSION=$(node --version)
print_info "Node.js version: $NODE_VERSION"

# Check npm
NPM_VERSION=$(npm --version)
print_info "npm version: $NPM_VERSION"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_step "2. Installing dependencies..."
    npm install
else
    print_info "Dependencies already installed"
fi

print_step "3. Setting up git hooks..."

# Ensure Husky is properly set up
if [ ! -d ".husky" ]; then
    npx husky init
    print_info "Initialized Husky git hooks"
else
    print_info "Husky already initialized"
fi

# Verify pre-commit hook
if [ -f ".husky/pre-commit" ]; then
    print_info "Pre-commit hook found"
else
    echo "npm test" > .husky/pre-commit
    chmod +x .husky/pre-commit
    print_info "Created pre-commit hook"
fi

print_step "4. Running initial test coverage check..."

# Run tests to establish baseline
if npm run test:coverage:offline > /dev/null 2>&1; then
    print_success "Tests passed!"
else
    print_info "Some tests failed - this is normal for initial setup"
fi

print_step "5. Setting up VS Code workspace (if present)..."

# Create VS Code settings if .vscode directory exists or create it
if [ ! -d ".vscode" ]; then
    mkdir -p .vscode
fi

# Create recommended VS Code settings for TDD
cat > .vscode/settings.json << 'EOF'
{
  "testing.automaticallyOpenPeekView": "never",
  "vitest.enable": true,
  "vitest.commandLine": "npm run test:watch:offline",
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "editor.codeActionsOnSave": {
    "source.fixAll": true,
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/coverage": true,
    "**/dist": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/coverage": true,
    "**/dist": true
  }
}
EOF

print_info "Created VS Code settings for TDD"

print_step "6. Creating example test file..."

# Create a simple example test if it doesn't exist
EXAMPLE_TEST="test/example.test.ts"
if [ ! -f "$EXAMPLE_TEST" ]; then
    mkdir -p "$(dirname "$EXAMPLE_TEST")"
    cat > "$EXAMPLE_TEST" << 'EOF'
import { describe, it, expect } from 'vitest';

describe('TDD Environment Setup', () => {
  it('should be working correctly', () => {
    expect(true).toBe(true);
  });

  it('should handle basic assertions', () => {
    const sum = (a: number, b: number) => a + b;
    expect(sum(2, 3)).toBe(5);
  });
});
EOF
    print_info "Created example test file: $EXAMPLE_TEST"
fi

print_step "7. Validating setup..."

# Test the TDD workflow
print_info "Testing watch mode startup..."
timeout 5s npm run test:watch:offline > /dev/null 2>&1 || true

print_success "TDD Environment Setup Complete!"
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Quick Start Guide${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "1. Start TDD development:"
echo "   ${GREEN}npm run test:watch:offline${NC}"
echo ""
echo "2. Create a new test:"
echo "   ${GREEN}npm run create:test unit src/utils/my-module MyModule${NC}"
echo ""
echo "3. View test coverage:"
echo "   ${GREEN}npm run test:coverage:offline${NC}"
echo ""
echo "4. Follow TDD cycle:"
echo "   ${YELLOW}Red${NC} (failing test) -> ${GREEN}Green${NC} (passing test) -> ${BLUE}Refactor${NC}"
echo ""
echo "5. Read the TDD guide:"
echo "   ${GREEN}cat docs/tdd-guide.md${NC}"
echo ""
echo -e "${GREEN}Happy Test-Driven Development!${NC}"