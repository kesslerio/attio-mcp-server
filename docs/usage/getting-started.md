# Getting Started: 5 Minutes to Your First AI-Powered CRM Query

_Get up and running with Attio MCP Server in 5 minutes. From installation to your first successful AI-powered CRM interaction._

## ⏱️ 5-Minute Quick Start

### ✅ Step 1: Prerequisites Check (30 seconds)

**Before you begin, verify you have:**

- [ ] **Attio Account** with API access
- [ ] **Claude Desktop** installed on your computer
- [ ] **Node.js** (v18+) - Check with: `node --version`

_Don't have these? See [Full Setup Guide](#full-setup-guide) below._

---

### 🔑 Step 2: Get Your Attio API Credentials (60 seconds)

1. **Go to Attio API Settings**: [app.attio.com/settings/api](https://app.attio.com/settings/api)
2. **Create New API Key**: Click "Generate API Key"
3. **Copy Your Key**: It looks like: `att_1a2b3c4d5e6f...` (64 characters)
4. **Save It Safely**: You'll need this in the next step

---

### ⚡ Step 3: One-Command Installation (60 seconds)

**Choose your preferred installation method:**

**Option A: NPM Global Install (Recommended)**

```bash
npm install -g attio-mcp-server
```

**Option B: One-Line Script Install**

```bash
curl -fsSL https://raw.githubusercontent.com/kesslerio/attio-mcp-server/main/install.sh | bash
```

**Option C: Smithery Auto-Install**

```bash
npx -y @smithery/cli install @kesslerio/attio-mcp-server --client claude
```

_With Smithery, skip to Step 5 - it handles Claude configuration automatically!_

---

### 🔧 Step 4: Configure Claude Desktop (90 seconds)

1. **Find Claude Config File**:
   - **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Add Attio MCP Server** (copy and paste this, replacing YOUR_API_KEY):

```json
{
  "mcpServers": {
    "attio-mcp": {
      "command": "attio-mcp-server",
      "env": {
        "ATTIO_API_KEY": "YOUR_API_KEY_HERE",
        "ATTIO_DEFAULT_DEAL_OWNER": "user@company.com",
        "ATTIO_DEFAULT_DEAL_STAGE": "Interested",
        "ATTIO_DEFAULT_CURRENCY": "USD"
      }
    }
  }
}
```

3. **Optional: Configure Deal Defaults**

   The additional environment variables shown above configure default values for deal creation:
   - `ATTIO_DEFAULT_DEAL_OWNER`: Email address of the default deal owner (typically your email)
   - `ATTIO_DEFAULT_DEAL_STAGE`: Default stage for new deals (check your Attio workspace for available stages)
   - `ATTIO_DEFAULT_CURRENCY`: Default currency code (e.g., USD, EUR, GBP)

   These are optional but recommended if you plan to create deals via Claude.

4. **Save and Restart Claude Desktop**

---

### 🎯 Step 5: Test Your First Query (60 seconds)

**Restart Claude Desktop, then copy and paste this exact prompt:**

```
Test my Attio CRM connection using universal tools:
1. Use records.search with resource_type="companies" to count total companies
2. Use records.search with resource_type="people" to count total contacts
3. Use records.search_by_timeframe to find companies added in last 5 days
4. Use get-lists to show available lists and pipelines

Limit each result to 10 items and format as dashboard for setup verification.
```

**Alternative Simple Test:**

```
Show me a CRM overview using universal tools: company count, contact count, and recent activity. Verify my Attio connection is working properly.
```

**🎉 Success!** If you see your CRM data, you're ready to go!

**❌ Having issues?** Jump to [Quick Troubleshooting](#quick-troubleshooting) below.

---

## 📋 Your Next 5 Minutes: Essential Prompts to Try

Once your test query works, try these essential prompts to explore capabilities:

### 🔍 **Data Exploration**

```
Show me my CRM health status:
- Companies missing key information (industry, website, employee count)
- People without email addresses
- Any duplicate records you can identify
- Data completeness overview
```

### 👥 **People & Contacts**

```
Find all people added to my CRM in the last 30 days. Show me their names, companies, job titles, and how they were added to the system.
```

### 🏢 **Company Intelligence**

```
Show me all technology companies in my CRM with more than 50 employees. Include their industry, location, and any recent activity or notes.
```

### 📊 **Quick Analytics**

```
Give me a business intelligence summary:
- Distribution of companies by industry
- Geographic distribution of my contacts
- Recent activity trends (last 30 days)
- Top opportunities or deals in my pipeline
```

### ✅ **Task Management**

```
Show me all open tasks in my CRM. Group them by priority and due date so I can see what needs immediate attention.
```

---

## 🚨 Quick Troubleshooting

### ❌ "Attio MCP Server not found"

**Likely cause**: Installation issue or Claude can't find the command

**Quick fixes**:

1. **Reinstall globally**: `npm install -g attio-mcp-server`
2. **Use full path**: Change `"command": "attio-mcp-server"` to `"command": "npx attio-mcp-server"`
3. **Check installation**: Run `attio-mcp-server --help` in terminal

### ❌ "Authentication failed"

**Likely cause**: Incorrect API key or formatting

**Quick fixes**:

1. **Check API key**: Ensure it's exactly 64 characters starting with `att_`
2. **No extra spaces**: Remove any spaces before/after the key
3. **Regenerate key**: Create a new API key in Attio settings

### ❌ "No data returned" or empty results

**Likely cause**: Empty CRM or permission issues

**Quick fixes**:

1. **Check Attio data**: Log into Attio web app to verify you have data
2. **API permissions**: Ensure your API key has read access to companies/people
3. **Try simple query**: `"Show me anything in my Attio CRM"`

### ❌ Claude doesn't recognize the server

**Likely cause**: Configuration or restart issue

**Quick fixes**:

1. **Restart Claude completely**: Quit and reopen Claude Desktop
2. **Check JSON syntax**: Validate your `claude_desktop_config.json` is valid JSON
3. **File location**: Double-check you're editing the correct config file location

---

## 📚 What's Next?

### 🎯 **Immediate Next Steps** (Next 15 minutes)

1. **Try the playbooks**: Check out ready-to-use prompts in [Sales Playbook](playbooks/sales-playbook.md)
2. **Learn key workflows**: See [Daily Sales Workflows](workflows/daily-sales-workflows.md) for systematic processes
3. **Explore advanced features**: Try [Customer Success Playbook](playbooks/customer-success-playbook.md) for account management

### 🚀 **Power User Development** (Next hour)

1. **Master advanced search**: Learn complex filtering in [Operations Playbook](playbooks/operations-playbook.md)
2. **Optimize your routine**: Build systematic workflows with [Weekly Operations](workflows/weekly-operations.md)
3. **Customer journey mapping**: Implement [Customer Lifecycle Workflows](workflows/customer-lifecycle.md)

### 🏆 **Team Implementation** (This week)

1. **Share success patterns**: Document what works best for your use cases
2. **Train team members**: Use this guide to onboard colleagues
3. **Customize for your business**: Adapt playbook prompts to your specific industry and processes

---

## 📖 Full Setup Guide (For New Users)

### 🎯 Prerequisites Setup

**Get Attio Account & API Access**:

1. Sign up at [attio.com](https://attio.com) if you don't have an account
2. Add some sample data (companies, contacts) for testing
3. Navigate to Settings > API to generate your API key

**Install Node.js**:

- Download from [nodejs.org](https://nodejs.org) (LTS version recommended)
- Verify installation: `node --version` (should show v18+)

**Install Claude Desktop**:

- Download from [claude.ai](https://claude.ai)
- Complete setup and sign in to your account

### ⚙️ Advanced Configuration Options

**Environment Variables** (optional):

```bash
# Optional: Set deal defaults for streamlined deal creation
export ATTIO_DEFAULT_DEAL_STAGE="Interested"
export ATTIO_DEFAULT_DEAL_OWNER="your_member_id"
export ATTIO_DEFAULT_CURRENCY="USD"
```

**Development Setup** (for advanced users):

```bash
# Clone repository for customization
git clone https://github.com/kesslerio/attio-mcp-server.git
cd attio-mcp-server
npm install
npm run build

# Use local development version
# In Claude config, use: "command": "node /path/to/attio-mcp-server/dist/index.js"
```

**Docker Deployment** (for teams):

```bash
# Pull and run via Docker
docker run -e ATTIO_API_KEY=your_key -p 3000:3000 kesslerio/attio-mcp-server

# Or use docker-compose for production
# See docs/deployment/ for full Docker guide
```

---

## 🎯 Success Metrics: Know You're Ready

**✅ You're successfully set up when you can:**

- [ ] Get a data summary of your Attio CRM through Claude
- [ ] Search for specific companies or contacts using natural language
- [ ] Create new records (companies, people, tasks) through Claude
- [ ] Get meaningful insights about your CRM data quality and trends

**🏆 You're a power user when you can:**

- [ ] Use complex filtering to find exactly what you need
- [ ] Execute systematic daily workflows using AI prompts
- [ ] Generate business intelligence reports and insights
- [ ] Manage your entire sales or customer success process through AI

**📈 You're driving business value when you can:**

- [ ] Save 2+ hours per day on CRM tasks through AI automation
- [ ] Identify opportunities and risks faster than manual processes
- [ ] Make data-driven decisions based on AI-generated insights
- [ ] Scale your CRM processes without proportional time investment

---

## 💡 Pro Tips for Maximum Success

### 1. **Start Simple, Scale Complexity**

Begin with basic data queries, then gradually add filters, automation, and advanced workflows.

### 2. **Be Specific in Your Requests**

Instead of: "Show me companies"  
Try: "Show me technology companies with 50+ employees added in the last 30 days"

### 3. **Use the Playbooks**

The playbooks contain battle-tested prompts that solve real business problems - don't reinvent the wheel.

### 4. **Build Daily Habits**

Consistency beats perfection. Use AI for 2-3 CRM tasks daily rather than trying to do everything at once.

### 5. **Share and Learn**

Document what works best for your team and industry. Share successful prompts with colleagues.

---

## 🤝 Getting Help & Community

**📞 Need Support?**

- [Troubleshooting Guide](troubleshooting.md) - Scenario-based problem solving with known issue workarounds
- [Universal Tools Quick Reference](universal-tools-quick-reference.md) - Validated copy-paste prompts for all 14 universal tools
- [GitHub Issues](https://github.com/kesslerio/attio-mcp-server/issues) - Bug reports and feature requests
- [Documentation](../README.md) - Complete reference guide

**🚀 Ready to Go Deeper?**

- [Sales Playbook](playbooks/sales-playbook.md) - 25+ optimized prompts with universal tools syntax
- [Customer Success Playbook](playbooks/customer-success-playbook.md) - Account management automation
- [Operations Playbook](playbooks/operations-playbook.md) - Data excellence and bulk operations

**💪 Power User Resources**

- [Daily Workflows](workflows/daily-sales-workflows.md) - Systematic AI-powered routines
- [Customer Lifecycle Management](workflows/customer-lifecycle.md) - End-to-end journey automation
- [Universal Tools Quick Reference](universal-tools-quick-reference.md) - Master all 14 universal tools with validated examples

---

**🎉 Congratulations!** You're now ready to transform your CRM workflow with AI-powered automation. Start with simple queries, build confidence with the playbooks, and scale to systematic workflows that save hours every day.

_Ready to level up? Try your first workflow from the [Daily Sales Workflows](workflows/daily-sales-workflows.md) guide!_
