# Troubleshooting Guide: Scenario-Based Problem Solving

*Quick solutions to common issues when using Attio MCP Server with Claude Desktop. Find your specific scenario and get back to productive CRM automation.*

## 🚨 Emergency Quick Fixes

### ❌ "Nothing works" - Complete Setup Failure

**Scenario**: Just installed, Claude doesn't recognize Attio server, no data shows up

**5-Minute Fix**:
1. **Restart Claude Desktop completely** (Quit → Reopen)
2. **Check your config file location**:
   - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`  
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3. **Test this exact config** (replace YOUR_API_KEY):
```json
{
  "mcpServers": {
    "attio": {
      "command": "npx",
      "args": ["attio-mcp-server"],
      "env": {
        "ATTIO_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```
4. **Verify API key**: Should be 64+ characters starting with `att_`
5. **Test with this prompt**: `"Show me a quick summary of my Attio CRM data"`

**Still broken?** → Jump to [Installation Issues](#installation-issues)

---

## 🎯 Scenario-Based Solutions

### 📊 Data Display Issues


#### **Scenario**: Long JSON responses getting cut off (Known Issue #469)

**What you see**: Claude responses end with "..." or incomplete data for large queries

**Immediate Workarounds**:
```
Large Dataset Query - Use Pagination:
"Show me companies 1-25 first, then I'll ask for the next batch"

Or use filters:
"Show me only the top 10 companies by employee count"
```

**Advanced Workaround**:
```
"Export the first 50 companies to a summary format with just: company name, industry, employee count, and website. Skip detailed descriptions and notes."
```

#### **Scenario**: "No data found" but data exists in Attio

**Common Causes & Fixes**:

1. **Empty workspace**: 
   - Check Attio web app first
   - Ensure you have actual data in your workspace

2. **Wrong workspace**: 
   ```
   "Show me which Attio workspace I'm connected to and confirm it has data"
   ```

3. **Permission issues**:
   - Regenerate API key with full permissions
   - Check API key scopes in Attio settings

4. **Typos in search**:
   ```
   Instead of: "Find company Tesla"
   Try: "Find companies with 'tesla' in the name" 
   ```

### 🔍 Search & Query Issues

#### **Scenario**: Complex searches returning wrong results

**Problem**: Multi-criteria searches not working as expected

**Solution Pattern - Build Incrementally**:
```
Step 1: "Find all technology companies"
Step 2: "From those results, filter for companies with 50+ employees"  
Step 3: "From that list, show me ones added in the last 30 days"
```

**Advanced Filter Template**:
```
Search for companies where:
- Industry contains "Technology" OR "Software"  
- Employee count is greater than 50
- Added to CRM in the last 30 days

Format as a table with: Company Name, Industry, Employee Count, Date Added
```

#### **Scenario**: Relationship searches not finding connections

**Example Problem**: "Find people at Google" returns empty

**Diagnostic Steps**:
```
Step 1: "Show me a company record for Google to confirm it exists"
Step 2: "List all people in our CRM to see the data format"  
Step 3: "Find people where company name contains 'Google' or 'google'"
```

**Universal Relationship Search**:
```
Instead of: "Find people at Google"
Use: "Search for people linked to any company with 'Google' in the name"
```

### 📋 List & Pipeline Issues

#### **Scenario**: Can't find or move deals in sales pipeline

**Diagnostic Query**:
```
"Show me all available lists and pipelines in our CRM. For each list, show me the name, type, and any entries it contains."
```

**Pipeline Movement Template**:
```
"Move the deal for [Company Name] from 'Qualified' stage to 'Proposal' stage in our sales pipeline. Confirm the update was successful."
```

**Troubleshooting Lists**:
```
"Get list details for [list_id] and show me:
- List configuration and stages
- Current entries with their status
- Available actions I can perform"
```

### ⚡ Performance Issues

#### **Scenario**: Slow responses or timeouts

**Optimization Strategies**:

1. **Limit results**:
   ```
   "Show me the first 20 companies by name instead of all companies"
   ```

2. **Use specific filters**:
   ```
   Instead of: "Show me all data"
   Use: "Show me companies added this week with incomplete contact information"  
   ```

3. **Batch operations**:
   ```
   "Process companies in batches of 10 - start with the first 10 technology companies"
   ```

---

## 🛠️ Installation Issues

### NPM Installation Problems

#### **Issue**: Command not found after global install

```bash
# Fix 1: Reinstall globally
npm uninstall -g attio-mcp-server
npm install -g attio-mcp-server

# Fix 2: Use npx instead (recommended)
# In Claude config, change:
"command": "npx",
"args": ["attio-mcp-server"]
```

#### **Issue**: Permission denied during install

```bash
# Mac/Linux - Fix npm permissions
sudo npm install -g attio-mcp-server

# Or use npx (no global install needed)
# Use the config with "npx" shown above
```

### Claude Desktop Configuration

#### **Issue**: Invalid JSON syntax

**Check your JSON with this validator**:
```json
{
  "mcpServers": {
    "attio": {
      "command": "npx",
      "args": ["attio-mcp-server"],
      "env": {
        "ATTIO_API_KEY": "att_your_key_here"
      }
    }
  }
}
```

**Common JSON errors**:
- Missing commas between sections
- Extra commas before closing braces  
- Quotes around key names
- Backslashes in file paths (Windows)

#### **Issue**: Config file location confusion

**Find your file**:
```bash
# Mac
ls -la ~/Library/Application\ Support/Claude/

# Windows Command Prompt  
dir "%APPDATA%\Claude"

# Windows PowerShell
ls $env:APPDATA\Claude
```

---

## 🔑 API Key & Authentication

### API Key Problems

#### **Issue**: Authentication failed

**Diagnostic Steps**:
1. **Check key format**: Must start with `att_` and be 60+ characters
2. **No extra characters**: Remove spaces, quotes, or line breaks
3. **Regenerate if needed**: Create fresh key in Attio settings

#### **Issue**: Permissions denied

**Fix Process**:
1. **Check API key scopes** in Attio → Settings → API
2. **Ensure workspace access** (if multiple workspaces)
3. **Test in Attio API explorer** first: [developers.attio.com](https://developers.attio.com)

**Test your key**:
```bash
curl -H "Authorization: Bearer att_your_key_here" \
     https://api.attio.com/v2/objects
```

---

## 🐛 Known Limitations & Workarounds

### Current Known Issues

| Issue | Impact | Workaround | Status |
|-------|---------|------------|---------|
| **JSON truncation** | Large responses cut off | Use pagination and filtering | Tracking #469 |
| **Lists API edge cases** | Some list operations inconsistent | Use universal tools with explicit resource_type | Resolved in latest |

### Working Around Limitations

#### **For Task Management**:
```
❌ Avoid: "Show me all my tasks" (may show "Unnamed")
✅ Use: "Get details for tasks created in the last week, showing content and title"
```

#### **For Large Data Sets**:
```
❌ Avoid: "Export all companies with full details"  
✅ Use: "Show me companies 1-25 with key fields: name, industry, employee count"
```

#### **For Complex Searches**:
```
❌ Avoid: Single complex query with many conditions
✅ Use: Build results step by step, filter incrementally
```

---

## 💡 Pro Tips for Reliable Operation

### 1. **Start Simple, Build Complexity**
```
Step 1: "Show me 5 companies from our CRM"
Step 2: "From those companies, which ones are in technology?"  
Step 3: "For the tech companies, show me their contact information"
```

### 2. **Use Explicit Resource Types**
```
✅ Good: "Search for companies where resource_type='companies' and industry contains 'AI'"
❌ Vague: "Find AI stuff in our CRM"
```

### 3. **Test API Key Regularly**
```
Monthly check: "Show me a quick summary of CRM data to confirm connection"
```

### 4. **Diagnostic Queries**
Keep these handy for troubleshooting:
```
"Show me connection status and workspace information"
"List available resource types and their counts"  
"Test a simple company search to verify functionality"
```

---

## 🆘 Still Need Help?

### **Escalation Path**

1. **Try the diagnostic queries** in Pro Tips section above
2. **Check recent issues**: [GitHub Issues](https://github.com/kesslerio/attio-mcp-server/issues)  
3. **Review your setup**: Follow [Getting Started](getting-started.md) from scratch
4. **Community support**: Search existing issues for similar problems

### **When Reporting Issues**

**Include this information**:
- Operating system and version
- Node.js version (`node --version`)
- Installation method (npm/npx/Docker)  
- Claude Desktop version
- Complete error messages
- Your configuration (with API key removed)
- Steps to reproduce

**Use this template**:
```
**Issue Summary**: Brief description

**Environment**:
- OS: [Windows/Mac/Linux version]
- Node.js: [version]  
- Install method: [npm global/npx/Docker]
- Claude Desktop: [version]

**Configuration** (API key removed):
[paste your claude_desktop_config.json]

**Steps to Reproduce**:
1. [step 1]
2. [step 2] 

**Expected**: What should happen
**Actual**: What actually happens  
**Error**: Complete error message
```

---

**🎯 Success Metrics**: You know troubleshooting is working when you can quickly diagnose issues, apply the right workaround, and get back to productive CRM automation within 5 minutes.

*Back to smooth CRM automation? Continue with [Daily Sales Workflows](workflows/daily-sales-workflows.md) or [Customer Success Playbook](playbooks/customer-success-playbook.md).*