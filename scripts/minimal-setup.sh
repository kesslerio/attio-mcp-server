#!/bin/bash

# Minimal setup script - just Codex CLI and NPX verification
# Run with: ./scripts/minimal-setup.sh

echo "⚡ Minimal Setup: Codex CLI Only"
echo "================================"

# Install OpenAI Codex CLI
echo "📦 Installing Codex CLI..."
if npm install -g @openai/codex; then
    echo "✅ Codex CLI installed successfully"
else
    echo "❌ Failed to install Codex CLI"
    exit 1
fi

# Skip MCP server setup (removed Brave Search dependency)

# Create basic config
echo "⚙️  Creating basic Codex configuration..."
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
echo "✅ Minimal setup completed!"
echo ""
echo "Required actions:"
echo "1. Copy .env.example to .env and fill in your API keys"
echo "2. Run: source .env"
echo "3. Test: codex --version"
echo ""
echo "Get API keys from:"
echo "- OpenAI: https://platform.openai.com/api-keys"
echo ""
echo "For MCP integration with Claude Desktop, see docs/codex-mcp-setup.md"
echo ""