#!/bin/bash
set -e

# Attio MCP Server - One-Command Installation Script
# Usage: curl -fsSL https://raw.githubusercontent.com/kesslerio/attio-mcp-server/main/install.sh | bash

echo "🎯 Attio MCP Server Installation Script"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/kesslerio/attio-mcp-server.git"
INSTALL_DIR="$HOME/.attio-mcp-server"
NODE_MIN_VERSION="18"

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

# Check Node.js version
check_node() {
    if command_exists node; then
        local node_version=$(node --version | cut -d'v' -f2)
        local major_version=$(echo "$node_version" | cut -d'.' -f1)
        
        if [ "$major_version" -ge "$NODE_MIN_VERSION" ]; then
            log_success "Node.js $node_version found"
            return 0
        else
            log_error "Node.js $node_version found, but $NODE_MIN_VERSION+ required"
            exit 1
        fi
    else
        log_error "Node.js not found. Please install Node.js $NODE_MIN_VERSION+ first."
        log_info "Visit: https://nodejs.org/"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    check_node
    
    # Check npm
    if ! command_exists npm; then
        log_error "npm not found. Please install npm first."
        exit 1
    fi
    log_success "npm found"
    
    # Check git
    if ! command_exists git; then
        log_error "git not found. Please install git first."
        exit 1
    fi
    log_success "git found"
    
    # Check Claude CLI (optional)
    if command_exists claude; then
        log_success "Claude CLI found - enhanced MCP integration will be available"
    else
        log_warning "Claude CLI not found - install later for enhanced MCP integration"
        log_info "Claude CLI installation: https://docs.anthropic.com/en/docs/claude-cli"
    fi
}

# Install Attio MCP Server
install_attio_mcp() {
    log_info "Installing Attio MCP Server..."
    
    # Remove existing installation
    if [ -d "$INSTALL_DIR" ]; then
        log_info "Removing existing installation..."
        rm -rf "$INSTALL_DIR"
    fi
    
    # Clone repository
    log_info "Cloning repository..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # Install dependencies
    log_info "Installing Node.js dependencies..."
    npm install
    
    # Build the project
    log_info "Building project..."
    npm run build
    
    log_success "Attio MCP Server installed successfully"
}

# Setup Claude CLI integration
setup_claude_cli() {
    log_info "Setting up Claude CLI integration..."
    
    if ! command_exists claude; then
        log_warning "Claude CLI not found - skipping Claude CLI integration"
        log_info "Install Claude CLI later and run: $INSTALL_DIR/scripts/setup-claude-cli.sh"
        return
    fi
    
    # Create MCP server configuration
    local config_json=$(cat <<EOF
{
  "command": "node",
  "args": ["$INSTALL_DIR/dist/index.js"],
  "env": {
    "ATTIO_API_KEY": "\${ATTIO_API_KEY}",
    "ATTIO_WORKSPACE_ID": "\${ATTIO_WORKSPACE_ID}"
  }
}
EOF
)
    
    log_info "Adding Attio MCP server to Claude CLI..."
    echo "$config_json" | claude mcp add-json attio-mcp-server --stdin -s user
    
    if [ $? -eq 0 ]; then
        log_success "Claude CLI integration configured"
        log_info "Set environment variables:"
        log_info "  export ATTIO_API_KEY=your_api_key"
        log_info "  export ATTIO_WORKSPACE_ID=your_workspace_id"
    else
        log_warning "Claude CLI integration failed - you can set it up manually later"
    fi
}

# Create convenience scripts
create_scripts() {
    log_info "Creating convenience scripts..."
    
    # Create CLI wrapper script
    local cli_script="$HOME/.local/bin/attio-mcp-server"
    mkdir -p "$(dirname "$cli_script")"
    
    cat > "$cli_script" << EOF
#!/bin/bash
# Attio MCP Server CLI Wrapper
cd "$INSTALL_DIR"
node dist/index.js "\$@"
EOF
    chmod +x "$cli_script"
    
    # Create discovery CLI wrapper
    local discover_script="$HOME/.local/bin/attio-discover"
    cat > "$discover_script" << EOF
#!/bin/bash
# Attio MCP Server Discovery CLI Wrapper
cd "$INSTALL_DIR"
node dist/cli/discover.js "\$@"
EOF
    chmod +x "$discover_script"
    
    # Create environment template
    if [ ! -f ".env.template" ]; then
        log_info "Creating environment template..."
        cat > ".env.template" << EOF
# Attio MCP Server Configuration
ATTIO_API_KEY=your_attio_api_key_here
ATTIO_WORKSPACE_ID=your_workspace_id_here

# Optional: Debug settings
DEBUG=false
LOG_LEVEL=info
EOF
    fi
    
    log_success "Convenience scripts created"
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."
    
    cd "$INSTALL_DIR"
    if node dist/index.js --help >/dev/null 2>&1; then
        log_success "Installation verification successful"
    else
        log_error "Installation verification failed"
        exit 1
    fi
}

# Show next steps
show_next_steps() {
    echo ""
    echo "🎉 Installation Complete!"
    echo "========================"
    echo ""
    echo "📋 Next Steps:"
    echo ""
    echo "1. 🔑 Set up your Attio API credentials:"
    echo "   export ATTIO_API_KEY=your_api_key"
    echo "   export ATTIO_WORKSPACE_ID=your_workspace_id"
    echo "   Get your API key from: https://app.attio.com/settings/api"
    echo ""
    
    echo "2. 🧪 Test the installation:"
    echo "   cd $INSTALL_DIR"
    echo "   node dist/index.js --help"
    echo "   node dist/cli/discover.js --help"
    echo ""
    
    if command_exists claude; then
        echo "3. ✅ Claude CLI integration is ready!"
        echo "   Try: claude \"get company details for Anthropic\""
        echo "   Or:  claude \"search for people in AI companies\""
        echo ""
    else
        echo "3. 📥 Install Claude CLI for enhanced MCP integration:"
        echo "   https://docs.anthropic.com/en/docs/claude-cli"
        echo "   Then run this script again for automatic setup"
        echo ""
    fi
    
    echo "4. 🔍 Discover your Attio workspace:"
    echo "   attio-discover attributes"
    echo "   # This will help you understand available fields"
    echo ""
    
    echo "5. 🚀 Start using Attio MCP tools:"
    echo "   # Company management: create, search, update companies"
    echo "   # People management: create, search, update people"
    echo "   # Lists management: manage your Attio lists"
    echo "   # Notes and tasks: create and manage CRM activities"
    echo ""
    
    echo "📖 Documentation:"
    echo "   Main docs: $INSTALL_DIR/docs/"
    echo "   API guide: $INSTALL_DIR/docs/api/"
    echo "   Examples: $INSTALL_DIR/docs/examples/"
    echo ""
    
    echo "🐛 Issues: https://github.com/kesslerio/attio-mcp-server/issues"
    echo ""
    echo "✨ Happy CRM managing with Attio MCP!"
}

# Main installation flow
main() {
    echo ""
    log_info "Starting Attio MCP Server installation..."
    echo ""
    
    check_prerequisites
    echo ""
    
    install_attio_mcp
    echo ""
    
    setup_claude_cli
    echo ""
    
    create_scripts
    echo ""
    
    verify_installation
    echo ""
    
    show_next_steps
}

# Run main function
main "$@"