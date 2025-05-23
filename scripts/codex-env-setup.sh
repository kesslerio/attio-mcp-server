#!/bin/bash

# Codex Environment Setup Script
# This script ensures all dependencies are available for Codex CLI in restricted environments
# Run this during setup phase when network access is available

echo "🔧 Setting up Codex environment dependencies..."

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Install project dependencies
install_project_deps() {
    echo "📦 Installing project dependencies..."
    
    if [ -f "package.json" ]; then
        # Install all dependencies (including dev dependencies)
        if npm install; then
            print_success "Project dependencies installed"
        else
            print_error "Failed to install project dependencies"
            return 1
        fi
    else
        print_warning "No package.json found, skipping npm install"
    fi
}

# Build the project
build_project() {
    echo "🔨 Building project..."
    
    if npm run build; then
        print_success "Project built successfully"
    else
        print_warning "Project build failed (may be expected in some environments)"
    fi
}

# Verify test setup
verify_test_setup() {
    echo "🧪 Verifying test setup..."
    
    # Check if vitest is available
    if npx vitest --version > /dev/null 2>&1; then
        print_success "Vitest is available"
    else
        print_warning "Vitest not found - tests may not work"
    fi
    
    # Check TypeScript
    if npx tsc --version > /dev/null 2>&1; then
        print_success "TypeScript is available"
    else
        print_warning "TypeScript not found - type checking may not work"
    fi
}

# Create offline fallback configurations
create_offline_configs() {
    echo "⚙️ Creating offline configurations..."
    
    # Create simplified vitest config for offline environments
    cat > vitest.config.offline.ts << 'EOF'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.js'],
    exclude: [
      'node_modules/**',
      'test/integration/real-api/**',
      'test/manual/**',
      'test/**/*.manual.*',
    ],
    globals: true,
    testTimeout: 10000,
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: '50%',
      },
    },
    silent: false,
    reporter: 'verbose',
  },
  resolve: {
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
EOF

    # Create offline TypeScript config
    cat > tsconfig.offline.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "test/integration/real-api*",
    "test/manual"
  ]
}
EOF

    print_success "Offline configurations created"
}

# Cache common commands
cache_commands() {
    echo "💾 Caching command outputs..."
    
    # Cache help outputs for offline use
    mkdir -p .codex-cache
    
    if command -v codex &> /dev/null; then
        codex --help > .codex-cache/codex-help.txt 2>/dev/null || true
        print_success "Codex help cached"
    fi
    
    if command -v npm &> /dev/null; then
        npm --help > .codex-cache/npm-help.txt 2>/dev/null || true
    fi
}

# Create environment verification script
create_verification_script() {
    echo "✅ Creating environment verification script..."
    
    cat > scripts/verify-codex-env.sh << 'EOF'
#!/bin/bash

# Codex Environment Verification Script
# Run this to check if the environment is properly set up for Codex

echo "🔍 Verifying Codex environment..."

SUCCESS=0
WARNINGS=0

check_command() {
    if command -v "$1" &> /dev/null; then
        echo "✅ $1 is available"
    else
        echo "❌ $1 is NOT available"
        SUCCESS=$((SUCCESS + 1))
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1 exists"
    else
        echo "⚠️  $1 missing"
        WARNINGS=$((WARNINGS + 1))
    fi
}

check_npm_script() {
    if npm run "$1" --silent 2>/dev/null; then
        echo "✅ npm run $1 works"
    else
        echo "❌ npm run $1 failed"
        SUCCESS=$((SUCCESS + 1))
    fi
}

# Check basic commands
echo "Checking basic commands:"
check_command "node"
check_command "npm"
check_command "codex"

# Check project files
echo -e "\nChecking project files:"
check_file "package.json"
check_file "tsconfig.json"
check_file "dist/index.js"

# Check npm scripts (with timeout)
echo -e "\nChecking npm scripts:"
timeout 10s npm run check || echo "❌ npm run check failed or timed out"
timeout 10s npm test -- --passWithNoTests || echo "❌ npm test failed or timed out"

echo -e "\nSummary:"
if [ $SUCCESS -eq 0 ]; then
    echo "🎉 Environment verification passed!"
else
    echo "⚠️  Found $SUCCESS issues and $WARNINGS warnings"
fi
EOF

    chmod +x scripts/verify-codex-env.sh
    print_success "Verification script created"
}

# Main setup function
main() {
    echo "🎯 Codex Environment Setup"
    echo "=========================="
    echo ""
    
    # Run setup steps
    install_project_deps
    echo ""
    
    build_project
    echo ""
    
    verify_test_setup
    echo ""
    
    create_offline_configs
    echo ""
    
    cache_commands
    echo ""
    
    create_verification_script
    echo ""
    
    print_success "🎉 Codex environment setup completed!"
    echo ""
    echo "To verify the setup later, run:"
    echo "  ./scripts/verify-codex-env.sh"
    echo ""
    echo "For offline testing, use:"
    echo "  npx vitest --config vitest.config.offline.ts"
    echo "  npx tsc --project tsconfig.offline.json --noEmit"
    echo ""
}

# Run main function
main "$@"