#!/bin/bash
set -e

# Attio MCP Server - Claude Desktop Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/kesslerio/attio-mcp-server/main/scripts/install-claude-desktop.sh | bash

echo "======================================="
echo "  Attio MCP Server - Claude Desktop"
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

# Detect Claude Desktop config directory
get_claude_config_dir() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "$HOME/Library/Application Support/Claude"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "$HOME/.config/Claude"
    else
        echo ""
    fi
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

    # Check Claude Desktop
    local config_dir=$(get_claude_config_dir)
    if [ -z "$config_dir" ]; then
        log_error "Unsupported OS. This script supports macOS and Linux."
        log_info "For Windows, please use WSL or follow manual setup instructions."
        exit 1
    fi

    if [ ! -d "$config_dir" ]; then
        log_warning "Claude Desktop config directory not found at: $config_dir"
        log_info "Creating directory... (Claude Desktop may not be installed yet)"
        mkdir -p "$config_dir"
    fi
    log_success "Claude Desktop config directory: $config_dir"
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

# Backup existing config
backup_config() {
    local config_file="$1"

    if [ -f "$config_file" ]; then
        local backup_file="${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$config_file" "$backup_file"
        log_success "Backed up existing config to: $backup_file"
    fi
}

# Configure Claude Desktop
configure_claude_desktop() {
    local config_dir=$(get_claude_config_dir)
    local config_file="$config_dir/claude_desktop_config.json"

    log_info "Configuring Claude Desktop..."

    # Backup existing config
    backup_config "$config_file"

    # Prepare the attio-mcp server entry
    local attio_server_json=$(cat <<EOF
{
    "command": "attio-mcp",
    "env": {
        "ATTIO_API_KEY": "$ATTIO_API_KEY"
    }
}
EOF
)

    if [ -f "$config_file" ]; then
        # Config exists - need to merge
        log_info "Existing config found. Merging attio-mcp server..."

        # Check if jq is available for proper JSON merging
        if command_exists jq; then
            # Use jq for proper JSON merging
            local temp_file=$(mktemp)

            # Check if mcpServers exists
            if jq -e '.mcpServers' "$config_file" >/dev/null 2>&1; then
                # mcpServers exists, add/update attio-mcp entry
                jq --argjson attio "$attio_server_json" '.mcpServers["attio-mcp"] = $attio' "$config_file" > "$temp_file"
            else
                # mcpServers doesn't exist, create it
                jq --argjson attio "$attio_server_json" '. + {"mcpServers": {"attio-mcp": $attio}}' "$config_file" > "$temp_file"
            fi

            mv "$temp_file" "$config_file"
            log_success "Configuration merged successfully (using jq)"
        else
            # No jq - warn user and create new config
            log_warning "jq not installed. Creating new config (your existing config was backed up)."
            log_info "Install jq for better config merging: brew install jq (macOS) or apt install jq (Linux)"

            cat > "$config_file" << EOF
{
  "mcpServers": {
    "attio-mcp": {
      "command": "attio-mcp",
      "env": {
        "ATTIO_API_KEY": "$ATTIO_API_KEY"
      }
    }
  }
}
EOF
        fi
    else
        # No existing config - create new one
        log_info "Creating new Claude Desktop config..."

        cat > "$config_file" << EOF
{
  "mcpServers": {
    "attio-mcp": {
      "command": "attio-mcp",
      "env": {
        "ATTIO_API_KEY": "$ATTIO_API_KEY"
      }
    }
  }
}
EOF
        log_success "Configuration created"
    fi

    log_success "Claude Desktop configured at: $config_file"
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
    echo "1. Restart Claude Desktop completely (quit and reopen)"
    echo ""

    if [ "$ATTIO_API_KEY" == "YOUR_ATTIO_API_KEY_HERE" ]; then
        echo "2. Edit your config file and replace YOUR_ATTIO_API_KEY_HERE:"
        echo "   $(get_claude_config_dir)/claude_desktop_config.json"
        echo ""
        echo "   Get your API key from: https://app.attio.com/settings/api"
        echo ""
    fi

    echo "3. Start using Attio tools in Claude Desktop!"
    echo "   Try: \"Search for companies in my Attio workspace\""
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

    configure_claude_desktop
    echo ""

    show_next_steps
}

# Run main function
main "$@"
