# Attio MCP Server - Quick Start Guide

Get up and running with the Attio MCP Server in under 5 minutes. This guide will walk you through installation, setup, and your first API call with expected outputs.

## Prerequisites

- **Node.js**: Version 20 or higher ([Download here](https://nodejs.org/))
- **Attio Account**: Active Attio workspace ([Sign up here](https://attio.com/))
- **Attio API Key**: Generate from [Attio Settings → API](https://app.attio.com/settings/api)
- **Claude Desktop**: Latest version ([Download here](https://claude.ai/desktop))

## Step 1: Installation

Choose your preferred installation method:

### Option A: NPM (Recommended)
```bash
npm install -g attio-mcp
```

### Option B: Smithery (Auto-configuration)
```bash
npx -y @smithery/cli install @kesslerio/attio-mcp --client claude
```

### Option C: Manual Installation
```bash
git clone https://github.com/kesslerio/attio-mcp-server.git
cd attio-mcp-server
npm install
npm run build
```

## Step 2: Get Your API Credentials

### Find Your API Key
1. Go to [Attio Settings → API](https://app.attio.com/settings/api)
2. Click "Generate New API Key"
3. Copy the 64-character API key (starts with `at_`)
4. **Keep this safe** - you won't be able to see it again

### Find Your Workspace ID
Your workspace ID is in your Attio URL:
- URL: `https://app.attio.com/workspaces/YOUR_WORKSPACE_ID/dashboard`
- Look for the string between `/workspaces/` and `/dashboard`

## Step 3: Test Installation

Verify the server is installed correctly:

```bash
# Test the command exists
attio-mcp --help

# Expected output:
# Attio MCP Server v0.1.x
# Usage: attio-mcp [options]
# Options:
#   --help     Show help
#   --version  Show version
```

## Step 4: Configure Environment

Create a `.env` file for testing (or set environment variables):

```bash
# Create .env file in your project directory
cat > .env << EOF
ATTIO_API_KEY=your_64_character_api_key_here
ATTIO_WORKSPACE_ID=your_workspace_id_here
EOF
```

**For Windows users:**
```powershell
# Create .env file
echo "ATTIO_API_KEY=your_64_character_api_key_here" > .env
echo "ATTIO_WORKSPACE_ID=your_workspace_id_here" >> .env
```

## Step 5: Test MCP Server

Test that the MCP server starts correctly:

```bash
# Set environment variables (Linux/Mac)
export ATTIO_API_KEY="your_api_key_here"
export ATTIO_WORKSPACE_ID="your_workspace_id_here"

# Test MCP server starts
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}}' | attio-mcp
```

**Expected Output (should include):**
```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},...}}
```

**Alternative: Quick API Connection Test**
```bash
# Quick test - discover your workspace attributes using the CLI tool
attio-discover attributes --limit 3

# Expected output:
# ✅ Found 3 company attributes:
# 1. Name (text)
# 2. Website (url) 
# 3. Industry (select)
```

## Step 6: Configure Claude Desktop

Add the Attio MCP Server to your Claude Desktop configuration:

### Find Claude Desktop Config
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

### Add Configuration
Edit the file to include the Attio MCP server:

```json
{
  "mcpServers": {
    "attio-mcp": {
      "command": "attio-mcp",
      "env": {
        "ATTIO_API_KEY": "your_64_character_api_key_here",
        "ATTIO_WORKSPACE_ID": "your_workspace_id_here"
      }
    }
  }
}
```

## Step 7: Test with Claude Desktop

1. **Restart Claude Desktop** completely (quit and reopen)
2. **Start a new conversation**
3. **Test the connection** with this message:

```
"Show me the available Attio MCP tools and search for any company with 'tech' in the name"
```

**Expected Behavior:**
- Claude should list available Attio MCP tools (search-records, get-record-details, etc.)
- Claude should perform a search and return company results
- You should see companies with "tech", "technology" or similar in their names

**⚠️ Troubleshooting**: If Claude doesn't see the tools:
1. Check Claude Desktop → Settings → Features → Model Context Protocol is enabled
2. Completely restart Claude Desktop (quit and reopen)
3. Verify config file syntax with: `python -m json.tool ~/Library/Application\ Support/Claude/claude_desktop_config.json`

## Step 8: Your First Real Query

Try this practical example:

```
"Find all companies created in the last 30 days and show me their names, websites, and industries. Limit to 5 results."
```

**Expected Output Format:**
```
Found 3 companies created in the last 30 days:

1. **Acme Tech Solutions**
   - Website: https://acmetech.com  
   - Industry: Software Development
   - Created: August 15, 2024

2. **DataFlow Inc**
   - Website: https://dataflow.io
   - Industry: Data Analytics
   - Created: August 22, 2024

3. **CloudSync Corp**
   - Website: https://cloudsync.net
   - Industry: Cloud Services  
   - Created: August 28, 2024
```

## Common Setup Issues & Solutions

### Issue: "Command not found: attio-mcp"
**Solution**: NPM global install path issue or wrong package
```bash
# Verify correct package is installed
npm list -g attio-mcp
# Should show: attio-mcp@0.1.x

# If not installed or wrong package:
npm uninstall -g attio-mcp-server  # Remove wrong package
npm install -g attio-mcp           # Install correct package

# Check npm global path
npm config get prefix

# If path is not in your PATH, add it:
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Issue: "Invalid API Key" 
**Solution**: Check API key format
- Must be exactly 64 characters
- Must start with `at_`
- No spaces or extra characters

```bash
# Check your API key length
echo -n "$ATTIO_API_KEY" | wc -c
# Should output: 64
```

### Issue: "Workspace not found"
**Solution**: Verify workspace ID
```bash
# Test workspace access directly
curl -H "Authorization: Bearer $ATTIO_API_KEY" \
  "https://api.attio.com/v2/workspace-members" | jq '.data[0].workspace.id'
```

### Issue: Claude Desktop doesn't see the server
**Solution**: Configuration path and restart
1. Verify config file location is correct for your OS
2. **Enable MCP in Claude**: Settings → Features → Model Context Protocol (toggle on)
3. Completely quit Claude Desktop (not just close window)  
4. Check for JSON syntax errors in config file:
```bash
# Validate JSON syntax (Linux/Mac)
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python -m json.tool
```
5. Test MCP server starts manually:
```bash
attio-mcp --version
# Should output version number
```

### Issue: "Rate limit exceeded"
**Solution**: Built-in rate limiting protection
The server automatically handles Attio's rate limits (300 requests per minute). If you hit limits:
- Wait 60 seconds before retrying
- Use the `limit` parameter to reduce data volume
- Consider using batch operations for bulk updates

## Performance Tips

For optimal performance:

1. **Use specific searches**: Instead of broad queries, be specific
   ```
   ❌ "Show me all companies"
   ✅ "Show me tech companies with 10-50 employees"
   ```

2. **Limit results**: Always specify reasonable limits
   ```json
   {"limit": 20}  // Good default
   ```

3. **Use field selection**: Only fetch needed fields
   ```json
   {"fields": ["name", "website", "industry"]}
   ```

## What's Next?

Now that you're set up, explore these guides:

- **[Sales Playbook](usage/playbooks/sales-playbook.md)**: Copy-paste prompts for sales workflows
- **[Customer Success Playbook](usage/playbooks/customer-success-playbook.md)**: Customer health monitoring prompts
- **[Operations Playbook](usage/playbooks/operations-playbook.md)**: Bulk operations and data management
- **[Universal Tools Reference](usage/universal-tools-quick-reference.md)**: Complete tool guide with examples
- **[Troubleshooting Guide](usage/troubleshooting.md)**: Common issues and solutions

## Quick Reference Card

Keep this handy for daily use:

| Need to... | Claude Command Example |
|------------|------------------------|
| **Search companies** | "Find companies with 'AI' in the name" |
| **Get company details** | "Show me details for company ID comp_12345" |
| **Create a company** | "Create a new company called 'Acme Corp' with website acme.com" |
| **Update a company** | "Update company comp_12345 to set industry to 'Technology'" |
| **Find recent activity** | "Show me all companies created this week" |
| **Complex search** | "Find tech companies with 50+ employees that we haven't contacted in 30 days" |

## Support

If you encounter issues:

1. **Check the logs**: Look at Claude Desktop's developer console
2. **Validate setup**: Run the test commands above  
3. **Review docs**: Check the [troubleshooting guide](error-handling-guide.md)
4. **Report issues**: [GitHub Issues](https://github.com/kesslerio/attio-mcp-server/issues)

---

**🎉 Congratulations!** You now have the Attio MCP Server running and can control your CRM with natural language through Claude.