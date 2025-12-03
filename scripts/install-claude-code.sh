#!/bin/bash
set -e

# Attio MCP Server - Claude Code (CLI) Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/kesslerio/attio-mcp-server/main/scripts/install-claude-code.sh | bash

echo "======================================="
echo "  Attio MCP Server - Claude Code"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Node.js
    if ! command_exists node; then
        log_error "Node.js not found. Please install Node.js 18+ first."
        log_info "Visit: https://nodejs.org/"
        exit 1
    fi
    log_success "Node.js found"

    # Check npm
    if ! command_exists npm; then
        log_error "npm not found. Please install npm first."
        exit 1
    fi
    log_success "npm found"

    # Check Claude CLI - REQUIRED for this installer
    if ! command_exists claude; then
        log_error "Claude CLI not found."
        echo ""
        log_info "Install Claude CLI first:"
        echo "  npm install -g @anthropic-ai/claude-code"
        echo ""
        log_info "Or visit: https://docs.anthropic.com/en/docs/claude-code"
        exit 1
    fi
    log_success "Claude CLI found"
}

# Install attio-mcp npm package
install_attio_mcp() {
    log_info "Checking if attio-mcp is installed..."

    if npm list -g attio-mcp >/dev/null 2>&1; then
        log_success "attio-mcp is already installed globally"
    else
        log_info "Installing attio-mcp globally..."
        npm install -g attio-mcp
        if [ $? -eq 0 ]; then
            log_success "attio-mcp installed successfully"
        else
            log_error "Failed to install attio-mcp. Try: sudo npm install -g attio-mcp"
            exit 1
        fi
    fi

    # Verify installation
    if ! command_exists attio-mcp; then
        log_warning "attio-mcp command not found in PATH"
        log_info "You may need to add npm global bin to your PATH"
    fi
}

# Get API key from user
get_api_key() {
    if [ -n "$ATTIO_API_KEY" ]; then
        log_success "ATTIO_API_KEY found in environment"
        return
    fi

    echo ""
    log_info "ATTIO_API_KEY not found in environment."
    echo -e "${YELLOW}Get your API key from: https://app.attio.com/settings/api${NC}"
    echo ""
    read -p "Enter your Attio API key (or press Enter to skip): " user_api_key

    if [ -n "$user_api_key" ]; then
        ATTIO_API_KEY="$user_api_key"
        log_success "API key saved for this session"
    else
        log_warning "No API key provided. You'll need to set ATTIO_API_KEY later."
        ATTIO_API_KEY="YOUR_ATTIO_API_KEY_HERE"
    fi
}

# Configure Claude Code using claude mcp add-json
configure_claude_code() {
    log_info "Configuring Claude Code..."

    # Create the MCP server configuration JSON
    local config_json=$(cat <<EOF
{
    "command": "attio-mcp",
    "env": {
        "ATTIO_API_KEY": "$ATTIO_API_KEY"
    }
}
EOF
)

    # Check if attio-mcp is already configured
    if claude mcp list 2>/dev/null | grep -q "attio-mcp"; then
        log_info "attio-mcp already configured. Updating..."
        # Remove existing config first
        claude mcp remove attio-mcp -s user 2>/dev/null || true
    fi

    # Add the MCP server configuration
    log_info "Adding attio-mcp to Claude Code..."
    echo "$config_json" | claude mcp add-json attio-mcp --stdin -s user

    if [ $? -eq 0 ]; then
        log_success "Claude Code configured successfully"
    else
        log_error "Failed to configure Claude Code"
        log_info "Try manually: claude mcp add attio-mcp --command attio-mcp"
        exit 1
    fi

    # Verify configuration
    echo ""
    log_info "Current MCP servers:"
    claude mcp list 2>/dev/null || true
}

# Show next steps
show_next_steps() {
    echo ""
    echo "======================================="
    echo "  Installation Complete!"
    echo "======================================="
    echo ""
    echo "Next steps:"
    echo ""

    if [ "$ATTIO_API_KEY" == "YOUR_ATTIO_API_KEY_HERE" ]; then
        echo "1. Set your API key in your shell profile:"
        echo "   export ATTIO_API_KEY=your_api_key_here"
        echo ""
        echo "   Get your API key from: https://app.attio.com/settings/api"
        echo ""
        echo "2. Or update the MCP server config:"
        echo "   claude mcp remove attio-mcp -s user"
        echo "   Then run this script again with ATTIO_API_KEY set"
        echo ""
    fi

    echo "Start using Attio tools in Claude Code!"
    echo "  Try: claude \"Search for companies in my Attio workspace\""
    echo ""
    echo "Documentation: https://github.com/kesslerio/attio-mcp-server"
    echo ""
}

# Main installation flow
main() {
    echo ""

    check_prerequisites
    echo ""

    install_attio_mcp
    echo ""

    get_api_key
    echo ""

    configure_claude_code
    echo ""

    show_next_steps
}

# Run main function
main "$@"
