#!/bin/bash

# Quick setup script for immediate Codex usage
# Run with: ./scripts/quick-setup.sh

# Note: Don't use 'set -e' to allow graceful handling of optional failures

echo "⚡ Quick Setup: Codex CLI"
echo "========================"

# Install OpenAI Codex CLI
echo "📦 Installing Codex CLI..."
npm install -g @openai/codex

# Install Python MCP requirements (optional, for custom servers)
echo "🐍 Installing Python MCP dependencies (optional)..."
if pip install -r requirements-mcp.txt; then
    echo "✅ Python MCP dependencies installed successfully"
else
    echo "⚠️ Python MCP dependencies installation failed (this is optional)"
fi

# Skip MCP server verification (removed Brave Search dependency)

# Create basic config
echo "⚙️  Creating basic configuration..."
mkdir -p ~/.codex

cat > ~/.codex/config.json << EOF
{
  "model": "o4-mini",
  "approvalMode": "suggest",
  "notify": true
}
EOF

# Create environment template
cat > .env.example << EOF
# OpenAI API Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Attio API Configuration (for this project)
ATTIO_API_KEY=your-attio-api-key-here
ATTIO_WORKSPACE_ID=your-workspace-id-here
EOF

echo ""
echo "✅ Quick setup completed!"
echo ""
echo "Required actions:"
echo "1. Copy .env.example to .env and fill in your API keys"
echo "2. Run: source .env"
echo "3. Test: codex --version"
echo ""
echo "Get API keys from:"
echo "- OpenAI: https://platform.openai.com/api-keys"
echo ""