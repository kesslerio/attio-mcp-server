# OpenAI Codex CLI Setup Guide

This guide provides comprehensive setup instructions for OpenAI Codex CLI with optional MCP (Model Context Protocol) server integration.

## Quick Start

```bash
# Run the automated setup script
./scripts/setup-codex.sh

# Or use the quick setup for immediate usage
./scripts/quick-setup.sh

# Or use the minimal setup (Node.js only)
./scripts/minimal-setup.sh
```

## Manual Setup

### 1. System Requirements

**Operating Systems:**
- macOS 12+
- Ubuntu 20.04+/Debian 10+
- Windows 11 (via WSL2)

**Dependencies:**
- Node.js 22+ (LTS recommended)
- Python 3.12+
- 4-8 GB RAM recommended

### 2. Install OpenAI Codex CLI

```bash
npm install -g @openai/codex
```

### 3. Install MCP Dependencies

```bash
# Install Python MCP requirements (optional, for custom servers only)
pip install -r requirements-mcp.txt

# Or install individually
pip install mcp httpx pydantic uvicorn fastapi python-dotenv
```

### 4. Environment Configuration

Create a `.env` file in your project root:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Attio API Configuration (for this project)
ATTIO_API_KEY=your-attio-api-key-here
ATTIO_WORKSPACE_ID=your-workspace-id-here
```

Set environment variables:

```bash
# Add to ~/.bashrc or ~/.zshrc
export OPENAI_API_KEY="your-openai-api-key"
```

### 5. Configure Codex CLI

Create `~/.codex/config.json`:

```json
{
  "model": "o4-mini",
  "approvalMode": "suggest",
  "notify": true,
  "maxTokens": 4096,
  "temperature": 0.1
}
```

## MCP Server Setup (Optional)

MCP server integration is optional and can be added later if needed. The main Codex CLI works independently.

### External MCP Servers
This project can work with external MCP servers that provide additional capabilities. These are separate services, not npm dependencies.

**Crawl4AI RAG MCP Server** (Optional):
- Repository: https://github.com/coleam00/mcp-crawl4ai-rag
- Purpose: Web crawling and RAG capabilities
- Tools: crawl_single_page, smart_crawl_url, perform_rag_query
- Setup: Follow the repository's installation guide

**Other MCP Servers**:
- YOURLS URL shortener: mcp__yourls__ namespace
- Brave Search: mcp__brave-search__ namespace  
- Tavily Search: mcp__tavily-mcp__ namespace
- Attio CRM: This project's main functionality

### Claude Desktop Integration

For Claude Desktop integration, update `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "attio": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "ATTIO_API_KEY": "${ATTIO_API_KEY}",
        "ATTIO_WORKSPACE_ID": "${ATTIO_WORKSPACE_ID}"
      }
    }
  }
}
```

## Usage Examples

### Basic Codex Commands

```bash
# Interactive session
codex

# Generate code
codex "Create a Python function to calculate fibonacci numbers"

# Code explanation
codex "Explain this JavaScript code" --file script.js

# Debugging
codex "Debug this error" --file error.log
```

### With MCP Integration (Optional)

```bash
# When MCP servers are configured, you can use them for enhanced functionality
codex "Create a React component with current best practices"

# API integration with available MCP servers  
codex "Create an Attio API client using the available documentation"
```

### Configuration Options

**Approval Modes:**
- `suggest` (default) - Shows suggestions for approval
- `auto-edit` - Automatically applies code changes
- `full-auto` - Fully automated execution

**Model Options:**
- `o4-mini` (default) - Fast and efficient
- `o4` - More capable for complex tasks
- `gpt-4o` - Alternative provider option

## API Keys Setup

### OpenAI API Key
1. Visit https://platform.openai.com/api-keys
2. Create a new API key
3. Set as environment variable or in config

# Brave Search API key setup removed (no longer needed)

### Attio API Keys (for this project)
1. Log into your Attio workspace
2. Go to Settings → Developers → API Keys  
3. Create new API key with required permissions

## Troubleshooting

### Common Issues

**"Command not found: codex"**
```bash
# Reinstall Codex CLI
npm uninstall -g @openai/codex
npm install -g @openai/codex

# Check PATH
echo $PATH
```

**"API key not found"**
```bash
# Verify environment variables
echo $OPENAI_API_KEY

# Reload shell configuration
source ~/.bashrc  # or ~/.zshrc
```

**"MCP server not responding"**
```bash
# Check if MCP servers are configured properly in Claude Desktop
# Restart Claude Desktop application if needed
```

### Debug Mode

Enable verbose logging:

```bash
# Set debug environment variable
export CODEX_DEBUG=true

# Run with verbose output
codex --verbose "your command here"
```

## Advanced Configuration

### Custom MCP Server

Create your own MCP server configuration:

```json
{
  "name": "custom-server",
  "command": "python",
  "args": ["-m", "your_mcp_server"],
  "env": {
    "API_KEY": "${YOUR_API_KEY}"
  }
}
```

### Multiple Providers

Configure alternative AI providers:

```bash
codex --provider anthropic "your command"
codex --provider azure "your command"
```

## Performance Tips

1. **Use appropriate models**: `o4-mini` for speed, `o4` for complexity
2. **Optimize approval mode**: Use `auto-edit` for repetitive tasks
3. **Cache MCP responses**: Enable caching for repeated queries
4. **Batch operations**: Group related tasks together

## Security Considerations

- Store API keys in environment variables, not in code
- Use project-specific `.env` files
- Regularly rotate API keys
- Monitor API usage and costs
- Enable approval mode for production environments

## Support and Resources

- **Codex CLI Documentation**: https://github.com/openai/codex
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Attio API**: https://docs.attio.com/

For issues with this setup, check the troubleshooting section or create an issue in the repository.