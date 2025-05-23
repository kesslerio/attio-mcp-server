#!/bin/bash

# Setup script for OpenAI Codex CLI
# This script sets up the complete environment for using Codex CLI
# Based on OpenAI Codex CLI v0.1+ (April 2025)

set -e

echo "🚀 Setting up OpenAI Codex CLI..."

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
    
    # Check Node.js version - Updated requirement: Node.js 22+
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
    
    # Check Git (recommended for safety)
    if ! command -v git &> /dev/null; then
        print_warning "Git is not installed. Codex CLI is safer when used in Git repositories."
        echo "Consider installing Git for version control safety features."
    else
        print_success "Git version: $(git --version)"
    fi
    
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
    
    # Check if OpenAI codex is already installed by looking for the npm global package
    if npm list -g @openai/codex &> /dev/null; then
        local current_version=$(npm list -g @openai/codex --depth=0 2>/dev/null | grep @openai/codex | cut -d'@' -f3)
        print_success "OpenAI Codex CLI is already installed: $current_version"
        
        read -p "Update to latest version? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm install -g @openai/codex@latest
            print_success "Codex CLI updated to latest version."
        fi
    else
        npm install -g @openai/codex
        print_success "OpenAI Codex CLI installed successfully."
    fi
    
    # Verify installation by checking npm package
    if npm list -g @openai/codex &> /dev/null; then
        local installed_version=$(npm list -g @openai/codex --depth=0 2>/dev/null | grep @openai/codex | cut -d'@' -f3)
        print_success "Installation verified: @openai/codex@$installed_version"
        
        # Find the actual binary path
        local codex_path=$(npm bin -g)/codex
        if [ -f "$codex_path" ]; then
            print_success "Codex CLI binary located at: $codex_path"
        else
            print_warning "Binary not found at expected location. You may need to adjust your PATH."
        fi
    else
        print_error "Installation failed. Please check npm permissions and try again."
        exit 1
    fi
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    # Check for OpenAI API key
    if [ -z "$OPENAI_API_KEY" ]; then
        echo ""
        echo "⚠️  OpenAI API key is required for Codex CLI."
        echo ""
        echo "💰 Pricing Information (as of April 2025):"
        echo "   - Input tokens: \$1.50 per 1M tokens"
        echo "   - Output tokens: \$6.00 per 1M tokens"
        echo "   - Model: o4-mini (default)"
        echo ""
        echo "You can get your API key from: https://platform.openai.com/api-keys"
        echo "Note: API account verification may be required for o3/o4-mini models"
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
    
    print_success "Environment setup completed."
}

# Setup MCP servers (placeholder for future MCP integrations)
setup_mcp_servers() {
    print_status "MCP server setup..."
    print_success "MCP server setup completed (placeholder for future integrations)."
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
  "provider": "openai",
  "approvalMode": "suggest",
  "fullAutoErrorMode": "ask-user",
  "notify": true,
  "maxTokens": 4096,
  "temperature": 0.1,
  "providers": {
    "openai": {
      "name": "OpenAI",
      "baseURL": "https://api.openai.com/v1",
      "envKey": "OPENAI_API_KEY"
    }
  },
  "history": {
    "maxSize": 1000,
    "saveHistory": true,
    "sensitivePatterns": []
  }
}
EOF
        print_success "Codex configuration created at ~/.codex/config.json"
    else
        print_success "Codex configuration already exists."
    fi
    
    # Create global AGENTS.md file for project instructions
    if [ ! -f ~/.codex/AGENTS.md ]; then
        cat > ~/.codex/AGENTS.md << 'EOF'
# Global Codex Instructions

## General Guidelines
- Always ask for confirmation before making significant changes
- Prioritize code readability and maintainability
- Include appropriate error handling
- Follow language-specific best practices

## Project-Specific Instructions
- Add your global coding preferences here
- Specify any coding standards or conventions
- Define any constraints or requirements

## Safety Reminders
- Always review changes before approval
- Use suggest mode for unfamiliar codebases
- Keep backups when working on important files
EOF
        print_success "Global AGENTS.md created at ~/.codex/AGENTS.md"
    else
        print_success "Global AGENTS.md already exists."
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
# OpenAI Codex CLI Usage Examples

## Basic Commands

```bash
# Interactive mode (recommended for beginners)
codex

# Direct command with natural language
codex "create a simple calculator in Python"
codex "fix the bug in src/utils.js"
codex "explain what this regex does: ^(?=.*[A-Z]).{8,}$"
```

## Approval Modes

```bash
# Suggest mode (default) - shows changes, asks for approval
codex --approval-mode suggest "refactor this function"

# Auto-edit mode - automatically applies approved changes
codex --approval-mode auto-edit "add error handling"

# Full-auto mode - executes without asking (use with caution!)
codex --approval-mode full-auto "write unit tests"
```

## Model Selection

```bash
# Use specific model
codex --model gpt-4.1 "complex refactoring task"
codex --model o4-mini "simple code generation"

# List available models
codex /model
```

## Project Documentation (AGENTS.md)

Create an `AGENTS.md` file in your project root:

```markdown
# Project-Specific Instructions

## Coding Standards
- Use TypeScript for all new files
- Follow ESLint configuration
- Include JSDoc comments for public APIs

## Architecture
- Follow MVC pattern
- Use dependency injection
- Prefer composition over inheritance

## Testing
- Write unit tests for all new functions
- Use Jest testing framework
- Aim for >90% test coverage
```

## Interactive Commands

Once in interactive mode, use these commands:
- `/suggest` - Switch to suggest approval mode
- `/autoedit` - Switch to auto-edit mode  
- `/fullauto` - Switch to full-auto mode
- `/model` - Change AI model
- `/help` - Show all available commands
- `/exit` - Exit Codex CLI

## Advanced Examples

```bash
# Multi-file refactoring
codex "refactor the authentication module to use async/await"

# Documentation generation
codex "generate comprehensive API documentation for this codebase"

# Security audit
codex "review this code for security vulnerabilities"

# Performance optimization
codex "optimize this function for better performance"

# Test generation
codex "write comprehensive unit tests for the user service"
```

## Safety Tips

1. **Always use suggest mode first** in new projects
2. **Work in Git repositories** for easy rollback
3. **Review all changes** before approval
4. **Start with small tasks** to understand behavior
5. **Use full-auto mode sparingly** and only in safe environments

## Pricing Awareness

- Input tokens: $1.50 per 1M tokens
- Output tokens: $6.00 per 1M tokens
- Monitor usage via OpenAI dashboard
- Consider using shorter prompts for cost efficiency

## Troubleshooting

### Common Issues

1. **"Command not found"**
   - Ensure Node.js 22+ is installed
   - Check if codex is in PATH: `which codex`

2. **API Key errors**
   - Verify OPENAI_API_KEY is set: `echo $OPENAI_API_KEY`
   - Check API key permissions on OpenAI platform

3. **Model access issues**
   - Some models require API account verification
   - Try switching to gpt-3.5-turbo if o4-mini fails

4. **Network/sandbox issues**
   - Codex runs in sandbox on macOS (normal behavior)
   - On Linux, consider Docker for additional security

For more help: https://github.com/openai/codex
EOF

    # Create project-specific AGENTS.md template
    if [ ! -f "./AGENTS.md" ]; then
        cat > ./AGENTS.md << 'EOF'
# Attio MCP Server - Codex Instructions

## Project Overview
This is an MCP (Model Context Protocol) server for Attio CRM integration.

## Coding Standards
- Use TypeScript for all code
- Follow ESLint and Prettier configurations
- Include comprehensive JSDoc comments
- Write unit tests for all new functionality

## Architecture Guidelines
- Follow the existing handler/tool pattern
- Use proper error handling with custom error types
- Implement proper logging and monitoring
- Follow SOLID principles

## MCP-Specific Guidelines
- Tools should have clear descriptions and parameter schemas
- Validate all inputs thoroughly
- Handle Attio API rate limiting gracefully
- Use proper TypeScript types for all MCP interfaces

## Testing Requirements
- Unit tests for all handlers and utilities
- Integration tests for API interactions
- Mock external dependencies appropriately
- Maintain >90% test coverage

## Security Considerations
- Validate all user inputs
- Handle API keys securely
- Implement proper error messages without exposing internals
- Follow principle of least privilege
EOF
        print_success "Project-specific AGENTS.md created"
    fi

    print_success "Usage examples created in ~/codex-examples/"
}

# Show disclaimer function
show_disclaimer() {
    echo "⚠️  EXPERIMENTAL TECHNOLOGY DISCLAIMER"
    echo "======================================"
    echo "OpenAI Codex CLI is an experimental project under active development."
    echo "It may contain bugs, incomplete features, or undergo breaking changes."
    echo "Always review changes before approval and work in Git repositories for safety."
    echo ""
}

# Main setup function
main() {
    echo "🎯 OpenAI Codex CLI Setup (April 2025)"
    echo "======================================"
    echo ""
    
    show_disclaimer
    echo ""
    
    check_requirements
    echo ""
    
    install_codex_cli
    echo ""
    
    setup_environment
    echo ""
    
    setup_mcp_servers
    echo ""
    
    configure_codex
    echo ""
    
    setup_claude_integration
    echo ""
    
    # Setup Codex environment (for restricted environments)
    if [ -f "./scripts/codex-env-setup.sh" ]; then
        print_status "Setting up Codex environment for offline use..."
        ./scripts/codex-env-setup.sh
        echo ""
    fi
    
    create_examples
    echo ""
    
    print_success "🎉 Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Restart your terminal or run: source ~/.bashrc (or ~/.zshrc)"
    echo "2. Verify installation: codex --version"
    echo "3. Test basic functionality: codex 'Hello, world!'"
    echo "4. Check examples in ~/codex-examples/"
    echo "5. Review AGENTS.md files for project-specific instructions"
    echo ""
    echo "⚡ Quick start:"
    echo "   codex --approval-mode suggest 'create a simple hello world script'"
    echo ""
    echo "📚 For more information:"
    echo "   - Codex CLI: https://github.com/openai/codex"
    echo "   - Documentation: https://www.npmjs.com/package/@openai/codex"
    echo "   - MCP Documentation: https://modelcontextprotocol.io/"
    echo ""
    echo "⚠️  Remember: Codex CLI is experimental software. Always review changes!"
    echo ""
}

# Run main function
main "$@"