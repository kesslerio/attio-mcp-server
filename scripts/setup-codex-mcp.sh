#!/bin/bash

# Setup script for OpenAI Codex CLI with MCP Brave Search integration
# This script sets up the complete environment for using Codex with MCP servers

set -e

echo "🚀 Setting up OpenAI Codex CLI with MCP Brave Search integration..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 22+ from https://nodejs.org/"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_warning "Node.js version is $node_version. Recommended version is 22+."
    else
        print_success "Node.js version: $(node --version)"
    fi
    
    # Check Python version
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed. Please install Python 3.12+."
        exit 1
    fi
    
    local python_version=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
    print_success "Python version: $(python3 --version)"
    
    # Check if uv is installed
    if ! command -v uv &> /dev/null; then
        print_status "Installing uv (Python package manager)..."
        curl -LsSf https://astral.sh/uv/install.sh | sh
        source $HOME/.cargo/env
    fi
    
    print_success "System requirements check completed."
}

# Install OpenAI Codex CLI
install_codex_cli() {
    print_status "Installing OpenAI Codex CLI..."
    
    if command -v codex &> /dev/null; then
        print_success "OpenAI Codex CLI is already installed: $(codex --version)"
    else
        npm install -g @openai/codex
        print_success "OpenAI Codex CLI installed successfully."
    fi
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    # Check for OpenAI API key
    if [ -z "$OPENAI_API_KEY" ]; then
        echo ""
        echo "⚠️  OpenAI API key is required for Codex CLI."
        echo "Please set your OpenAI API key:"
        echo "export OPENAI_API_KEY='your-api-key-here'"
        echo ""
        echo "You can get your API key from: https://platform.openai.com/api-keys"
        echo ""
        read -p "Enter your OpenAI API key (or press Enter to skip): " api_key
        
        if [ -n "$api_key" ]; then
            export OPENAI_API_KEY="$api_key"
            echo "export OPENAI_API_KEY='$api_key'" >> ~/.bashrc
            echo "export OPENAI_API_KEY='$api_key'" >> ~/.zshrc
            print_success "OpenAI API key configured."
        else
            print_warning "Skipped API key setup. Remember to set OPENAI_API_KEY before using Codex."
        fi
    else
        print_success "OpenAI API key is already configured."
    fi
    
    # Check for Brave Search API key
    if [ -z "$BRAVE_API_KEY" ]; then
        echo ""
        echo "⚠️  Brave Search API key is required for MCP Brave Search integration."
        echo "You can get your API key from: https://api.search.brave.com/app/keys"
        echo ""
        read -p "Enter your Brave Search API key (or press Enter to skip): " brave_key
        
        if [ -n "$brave_key" ]; then
            export BRAVE_API_KEY="$brave_key"
            echo "export BRAVE_API_KEY='$brave_key'" >> ~/.bashrc
            echo "export BRAVE_API_KEY='$brave_key'" >> ~/.zshrc
            print_success "Brave Search API key configured."
        else
            print_warning "Skipped Brave API key setup. Remember to set BRAVE_API_KEY for search functionality."
        fi
    else
        print_success "Brave Search API key is already configured."
    fi
}

# Setup MCP Brave Search server
setup_mcp_brave_search() {
    print_status "Setting up MCP Brave Search server..."
    
    # Install MCP Brave Search server via NPX (recommended method)
    print_status "Installing MCP Brave Search server via NPX..."
    
    # Test if the server is available
    if npx -y @modelcontextprotocol/server-brave-search --help > /dev/null 2>&1; then
        print_success "MCP Brave Search server is available via NPX."
    else
        print_warning "Could not verify MCP Brave Search server via NPX."
    fi
    
    # Alternative: Docker installation check
    if command -v docker &> /dev/null; then
        print_status "Docker is available for alternative installation method."
        
        # Pull the Docker image
        if docker pull mcp/brave-search > /dev/null 2>&1; then
            print_success "MCP Brave Search Docker image is available."
        else
            print_warning "Could not pull MCP Brave Search Docker image."
        fi
    else
        print_warning "Docker not available. NPX method will be used."
    fi
    
    print_success "MCP Brave Search server setup completed."
}

# Configure Codex CLI
configure_codex() {
    print_status "Configuring Codex CLI..."
    
    # Create Codex config directory
    mkdir -p ~/.codex
    
    # Create default config if it doesn't exist
    if [ ! -f ~/.codex/config.json ]; then
        cat > ~/.codex/config.json << EOF
{
  "model": "o4-mini",
  "approvalMode": "suggest",
  "notify": true,
  "maxTokens": 4096,
  "temperature": 0.1
}
EOF
        print_success "Codex configuration created at ~/.codex/config.json"
    else
        print_success "Codex configuration already exists."
    fi
}

# Setup Claude Desktop integration (if available)
setup_claude_integration() {
    print_status "Setting up Claude Desktop MCP integration..."
    
    local claude_config_dir=""
    
    # Detect Claude Desktop config directory based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        claude_config_dir="$HOME/Library/Application Support/Claude"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        claude_config_dir="$HOME/.config/Claude"
    else
        print_warning "Unsupported OS for Claude Desktop integration."
        return
    fi
    
    if [ ! -d "$claude_config_dir" ]; then
        print_warning "Claude Desktop not found. Skipping integration setup."
        return
    fi
    
    # Create or update Claude Desktop config
    local config_file="$claude_config_dir/claude_desktop_config.json"
    
    if [ ! -f "$config_file" ]; then
        mkdir -p "$claude_config_dir"
        cat > "$config_file" << EOF
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "$BRAVE_API_KEY"
      }
    },
    "attio": {
      "command": "node",
      "args": ["$(pwd)/dist/index.js"],
      "env": {
        "ATTIO_API_KEY": "$ATTIO_API_KEY",
        "ATTIO_WORKSPACE_ID": "$ATTIO_WORKSPACE_ID"
      }
    }
  }
}
EOF
        print_success "Claude Desktop MCP configuration created."
    else
        print_success "Claude Desktop configuration already exists."
    fi
}

# Create usage examples
create_examples() {
    print_status "Creating usage examples..."
    
    mkdir -p ~/codex-examples
    
    cat > ~/codex-examples/README.md << 'EOF'
# OpenAI Codex CLI with MCP Integration Examples

## Basic Codex Usage

```bash
# Start interactive session
codex

# Run specific tasks
codex "Create a Python function to calculate fibonacci numbers"
codex "Explain this JavaScript code" --file script.js
codex "Debug this error" --file error.log
```

## MCP Brave Search Integration

```bash
# Search for recent information
codex "Search for latest TypeScript features and create examples"

# Research and code generation
codex "Find information about React 18 and create a component example"
```

## Configuration

### Codex Config (~/.codex/config.json)
```json
{
  "model": "o4-mini",
  "approvalMode": "suggest",
  "notify": true,
  "maxTokens": 4096,
  "temperature": 0.1
}
```

### Environment Variables
```bash
export OPENAI_API_KEY="your-openai-api-key"
export BRAVE_API_KEY="your-brave-search-api-key"
```

## Tips
- Use `codex --help` for all available options
- Set `approvalMode` to "auto-edit" for automatic code modifications
- Use `--provider` flag to use different AI providers
- Combine with MCP servers for enhanced capabilities
EOF

    print_success "Usage examples created in ~/codex-examples/"
}

# Main setup function
main() {
    echo "🎯 OpenAI Codex CLI + MCP Brave Search Setup"
    echo "============================================="
    echo ""
    
    check_requirements
    echo ""
    
    install_codex_cli
    echo ""
    
    setup_environment
    echo ""
    
    setup_mcp_brave_search
    echo ""
    
    configure_codex
    echo ""
    
    setup_claude_integration
    echo ""
    
    create_examples
    echo ""
    
    print_success "🎉 Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Restart your terminal or run: source ~/.bashrc (or ~/.zshrc)"
    echo "2. Verify installation: codex --version"
    echo "3. Test basic functionality: codex 'Hello, world!'"
    echo "4. Check examples in ~/codex-examples/"
    echo ""
    echo "For more information:"
    echo "- Codex CLI: https://github.com/openai/codex"
    echo "- MCP Documentation: https://modelcontextprotocol.io/"
    echo "- Brave Search API: https://api.search.brave.com/"
    echo ""
}

# Run main function
main "$@"