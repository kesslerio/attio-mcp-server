# Attio MCP Server

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![npm version](https://badge.fury.io/js/attio-mcp.svg)](https://badge.fury.io/js/attio-mcp)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub Release](https://img.shields.io/github/v/release/kesslerio/attio-mcp-server)](https://github.com/kesslerio/attio-mcp-server/releases)
[![smithery badge](https://smithery.ai/badge/@kesslerio/attio-mcp-server)](https://smithery.ai/server/@kesslerio/attio-mcp-server) **← Start using with ChatGPT or Claude (no installation)**
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/kesslerio/attio-mcp-server)

Connect ChatGPT and Claude directly to your Attio CRM. Manage deals, enrich leads with web research, update records, create tasks, and build targeted lists—all through natural conversation. Complete coverage of Companies, People, Deals, Tasks, Lists, Notes, and Records with full CRUD operations.

## 🚀 Transform Your CRM Workflow with AI

Stop clicking through screens. Stop manual data entry. **Work with your CRM through natural conversation.**

### What You Can Do

**After Every Sales Call:**

```
"Add notes from my Acme demo: discussed pricing for Enterprise plan,
concerns about implementation timeline. Move deal to Proposal stage.
Create follow-up task for tomorrow to send custom pricing deck."
```

→ **Done in 10 seconds** (vs 20 minutes of clicking and typing)

**Instant Lead Enrichment:**

```
"Research and score these 10 new signups. Find their company info,
employee count, and industry. Add the qualified B2B companies
with 50+ employees to my Q1 Outreach list."
```

→ **Done in minutes** (vs hours of manual Google/LinkedIn research)

**Pre-Meeting Prep:**

```
"I have a call with Acme Corp in 5 minutes. Give me the full context:
past conversations, deal history, open tasks, and key contacts."
```

→ **Instant brief** (vs hunting through notes and deal records)

**Complex Searches Made Simple:**

```
"Find all AI companies with 50+ employees in our pipeline that we
haven't contacted in 30 days, then add them to my Re-engagement list."
```

→ **Natural language** replaces complex filter building

### How to Access

- **🌐 Smithery (Recommended)**: Use remotely via ChatGPT or Claude - [one-click setup](https://smithery.ai/server/@kesslerio/attio-mcp-server), zero deployment
- **💻 Local Installation**: Run on your machine with Claude Desktop - see [Installation](#-installation)

**Why Smithery?** No software to install. Works with your existing ChatGPT Pro/Plus or Claude subscription. Start using it today.

## 🌐 **Remote Access via Smithery**

**No installation required.** Connect Attio to ChatGPT or Claude through Smithery's hosted service:

- **✅ Works with ChatGPT Pro/Plus** - Access your entire Attio workspace through natural language
- **✅ Works with Claude** - Use with Claude Desktop or Claude.ai
- **✅ Zero Setup** - One-click connection at [smithery.ai/server/@kesslerio/attio-mcp-server](https://smithery.ai/server/@kesslerio/attio-mcp-server)
- **🔐 Built-in Approval Flows** - MCP safety annotations auto-approve reads, request approval for writes
- **📖 Setup Guide** - See [ChatGPT Developer Mode docs](./docs/chatgpt-developer-mode.md) for OAuth configuration

**Or install locally** for use with Claude Desktop (see [Installation](#-installation) below).

## ✨ Core Features & Implementation Status

### 🎯 **Universal Tools Architecture** (33 Tools)

Consolidated 70+ resource-specific tools into 33 streamlined operations (19 universal + specialized tools for lists, notes, tasks) for consistent, powerful CRM management.

- **Token-Efficient**: Lightweight MCP footprint (~3.2K tokens baseline) means more context available for your actual work
- **Clean Architecture**: Complete production-test separation with mock factory pattern

### 📊 **Feature Implementation Status**

#### ✅ **Complete CRM Surface Coverage**

Full CRUD operations across all Attio resources:

- **Companies & People**: Search, Create, Update, Delete, Advanced Search, Relationship Navigation
- **Deals**: Pipeline management with intelligent field mapping and stage validation
- **Tasks**: Multi-assignee support with record linking
- **Lists**: Advanced filtering, entry management, smart segmentation
- **Notes**: Create and list across all record types
- **Records**: Universal operations across any resource type
- **Batch Operations**: Process hundreds of records with chunking and error handling
- **Advanced Filtering**: Sophisticated query capabilities with intelligent field mapping

### 📊 **Company Management**

- **Universal Search**: Find companies with `search-records` and `advanced-search`
- **Full CRUD**: Create, read, update, and delete with universal record operations
- **Relationship Discovery**: Find companies through `search-by-relationship`
- **Batch Operations**: Process hundreds of companies with `batch-operations`
- **Detailed Information**: Get contact, business, and social info with `get-detailed-info`

### 👥 **People Management**

- **Universal Contact Search**: Find people by any criteria using universal search tools
- **Relationship Tracking**: Link people to companies with `search-by-relationship`
- **Activity Timeline**: Track interactions with `search-by-content` and `search-by-timeframe`
- **Advanced Filtering**: Multi-attribute search with universal filtering
- **Bulk Operations**: Efficiently manage contacts with universal batch operations

### 📋 **Lists & Pipeline Management** (11 Tools)

- **Pipeline Operations**: Move deals through sales stages
- **Smart Segmentation**: Create and manage targeted contact lists
- **Advanced Filtering**: Complex multi-condition filtering with AND/OR logic
- **Entry Management**: Add, remove, and update list memberships
- **Deal Tracking**: Monitor opportunities and revenue pipeline
- **Deal Defaults**: Configurable default stage, owner, and currency for streamlined deal creation

### ✅ **Task Management**

- **Universal Task Operations**: Create, update, and manage tasks with universal tools
- **Record Linking**: Associate tasks with any record type using `resource_type` parameter
- **Progress Tracking**: Monitor completion with universal search and filtering
- **Team Coordination**: Streamline follow-ups with consistent universal operations

### 🔧 **Advanced Capabilities**

- **Batch Processing**: Handle bulk operations with error tracking
- **Enhanced Filtering**: Text, numeric, date, boolean, and relationship filters with timeframe search (Issue #475)
- **Data Export**: JSON serialization for integrations
- **Real-time Updates**: Live data synchronization with Attio

### 💬 **Pre-Built Prompts** (10 Prompts)

Intelligent shortcuts that help Claude work faster with your CRM data:

- **Search & Find** (5): people_search, company_search, deal_search, meeting_prep, pipeline_health
- **Take Actions** (4): log_activity, create_task, advance_deal, add_to_list with dry-run safety
- **Research & Qualify** (1): qualify_lead with automated web research and BANT/CHAMP frameworks
- **Token-efficient**: 300-700 tokens per prompt with consistent formatting
- **Discoverable**: Claude automatically suggests relevant prompts for your tasks

See [Using Out-of-the-Box Prompts](#-using-out-of-the-box-prompts) for detailed documentation and examples.

## 🎯 **Using Out-of-the-Box Prompts**

**NEW**: 10 pre-built MCP prompts for common Sales workflows. No setup required—just use them!

### Available Prompts

| Prompt               | Description                                     | Key Arguments                                    | Example                            |
| -------------------- | ----------------------------------------------- | ------------------------------------------------ | ---------------------------------- |
| `people_search.v1`   | Find people by title, company, territory        | `query`, `limit`, `format`                       | Find AE in fintech, SF             |
| `company_search.v1`  | Query companies by domain, segment, plan        | `query`, `limit`, `format`                       | Find SaaS companies >100 employees |
| `deal_search.v1`     | Filter deals by owner, stage, value, close date | `query`, `limit`, `format`                       | Find deals >$50k closing Q1        |
| `log_activity.v1`    | Log calls/meetings/emails to records            | `target`, `type`, `summary`, `dry_run`           | Log call with Nina at Acme         |
| `create_task.v1`     | Create tasks with natural language due dates    | `title`, `content`, `due_date`, `dry_run`        | Create task: Follow up tomorrow    |
| `advance_deal.v1`    | Move deal to target stage with next action      | `deal`, `target_stage`, `create_task`, `dry_run` | Advance deal to "Proposal Sent"    |
| `add_to_list.v1`     | Add records to a List by name or ID             | `records`, `list`, `dry_run`                     | Add 5 companies to Q1 Outreach     |
| `qualify_lead.v1`    | Research lead with web + BANT/CHAMP scoring     | `target`, `framework`, `limit_web`, `dry_run`    | Qualify Acme Corp with BANT        |
| `meeting_prep.v1`    | 360° prep: notes, tasks, deals, agenda          | `target`, `format`, `verbosity`                  | Prep for meeting with Acme CEO     |
| `pipeline_health.v1` | Weekly snapshot: created/won/slipped + risks    | `owner`, `timeframe`, `segment`                  | Pipeline health for @me last 30d   |

### Quick Examples

```bash
# Search for prospects
"Use people_search.v1: Find Account Executives in San Francisco at fintech companies, limit 25"

# Log activity
"Use log_activity.v1: Log a call with Nina at Acme Corp, discussed Q1 pricing, create follow-up task"

# Qualify a lead (with web research)
"Use qualify_lead.v1: Qualify Acme Corp using BANT framework, dry run mode"

# Meeting prep
"Use meeting_prep.v1: Prepare for meeting with contact at Acme Corp"
```

### Universal Arguments

**All read prompts** support:

- `format`: `table` | `json` | `ids` (default: `table`)
- `fields_preset`: `sales_short` | `full` (default: `sales_short`)
- `verbosity`: `brief` | `normal` (default: `brief`)

**All write prompts** support:

- `dry_run`: `true` | `false` (default: `false`) - Preview changes without executing

### Token Awareness Features

Prompts include built-in token optimization:

- **Budget Guards**: Prompts stay within token limits (people_search <500, qualify_lead <400)
- **Dev Metadata**: Set `MCP_DEV_META=true` for token counts in responses
- **Telemetry**: Set `PROMPT_TELEMETRY_ENABLED=true` for usage logging
- **Configurable Limits**: Override with `MAX_PROMPT_TOKENS` environment variable

For complete prompt documentation, see [docs/prompts/v1-catalog.md](./docs/prompts/v1-catalog.md).

## ⚠️ **Known Limitations & Important Notes**

### **Current Limitations**

- **Field Parameter Filtering**: Tasks endpoint `/objects/tasks/attributes` has limitations, handled with fallback patterns
- **Pagination**: Tasks pagination uses in-memory handling due to API constraints

### **API Compatibility**

- **Universal Tools**: Primary interface (33 tools: 19 universal + 14 specialized) - recommended for all integrations
- **Legacy Tools**: Available via `DISABLE_UNIVERSAL_TOOLS=true` environment variable (deprecated)

### 🤝 **ChatGPT Integration with Configurable Tool Mode**

**NEW in v1.1.1**: Configurable tool exposure via `ATTIO_MCP_TOOL_MODE` for optimal ChatGPT integration.

#### **Full Mode (Default)** - For ChatGPT Developer Mode Users

- **Configuration**: `ATTIO_MCP_TOOL_MODE: 'full'` (or unset)
- **Requirements**: ChatGPT Pro/Team/Enterprise/Edu with Developer Mode enabled
- **Features**: All 33 universal tools with MCP safety annotations
  - Auto-approval for read operations (`records_search`, `get-list-details`, etc.)
  - Approval prompts for write operations (`create-record`, `update-record`, etc.)
  - Full CRM management through natural conversation

#### **Search-Only Mode** - For ChatGPT Non-Developer Mode Users

- **Configuration**: `ATTIO_MCP_TOOL_MODE: 'search'`
- **Requirements**: Any ChatGPT account (no Developer Mode needed)
- **Features**: Limited to 3 tools (`search`, `fetch`, `aaa-health-check`)
- **Why**: Prevents misleading UX where ChatGPT shows all tools but only executes search/fetch
- **Use Case**: Read-only Attio access for basic contact/company lookups

#### **Quick Setup**

```yaml
# Smithery configuration (smithery.yaml)
exampleConfig:
  ATTIO_API_KEY: 'your-key'
  ATTIO_WORKSPACE_ID: 'your-workspace-id'
  ATTIO_MCP_TOOL_MODE: 'full' # or 'search'
```

**Need Help?** See [ChatGPT Developer Mode Integration Guide](./docs/chatgpt-developer-mode.md) for complete setup instructions, troubleshooting, and OAuth configuration.

### **Performance Considerations**

- **Batch Operations**: Optimized with chunking, rate limiting, and error recovery
- **Large Datasets**: Automatic pagination and field filtering for optimal performance
- **Rate Limiting**: Built-in protection against API rate limits with exponential backoff

For detailed troubleshooting and solutions, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) and [GitHub Issues](https://github.com/kesslerio/attio-mcp-server/issues).

## 🎯 **Mastering Advanced Search Filters**

**The Power Behind Precise CRM Queries** - Stop wrestling with complex data searches. Our advanced filtering system lets you find exactly what you need with surgical precision.

> _"Find all AI companies with 50+ employees that we haven't contacted in 30 days and add them to our Q1 outreach list"_ - This kind of complex query is exactly what advanced search filters excel at.

### 🏗️ **Filter Architecture**

Every advanced search follows this proven pattern that's been battle-tested across thousands of CRM queries:

```json
{
  "resource_type": "companies",
  "filters": {
    "filters": [
      {
        "attribute": { "slug": "field_name" },
        "condition": "operator",
        "value": "search_value"
      }
    ]
  }
}
```

### ⚡ **Real-World Examples**

**🔍 Single Criteria Search**

```json
{
  "resource_type": "companies",
  "filters": {
    "filters": [
      {
        "attribute": { "slug": "name" },
        "condition": "contains",
        "value": "Tech"
      }
    ]
  }
}
```

**🎯 Multi-Criteria Power Search (AND Logic)**

```json
{
  "resource_type": "companies",
  "filters": {
    "filters": [
      {
        "attribute": { "slug": "name" },
        "condition": "contains",
        "value": "Tech"
      },
      {
        "attribute": { "slug": "employee_count" },
        "condition": "greater_than",
        "value": 50
      },
      {
        "attribute": { "slug": "industry" },
        "condition": "equals",
        "value": "AI/Machine Learning"
      }
    ]
  }
}
```

**🚀 Flexible OR Logic**

```json
{
  "resource_type": "companies",
  "filters": {
    "filters": [
      {
        "attribute": { "slug": "name" },
        "condition": "contains",
        "value": "Tech"
      },
      {
        "attribute": { "slug": "name" },
        "condition": "contains",
        "value": "AI"
      }
    ],
    "matchAny": true
  }
}
```

### 🧠 **Smart Filter Operators**

| Operator       | Perfect For         | Example Use Case                      |
| -------------- | ------------------- | ------------------------------------- |
| `contains`     | Text searches       | Finding companies with "Tech" in name |
| `equals`       | Exact matches       | Specific industry classification      |
| `starts_with`  | Prefix searches     | Companies beginning with "Acme"       |
| `ends_with`    | Suffix searches     | Companies ending with "Inc"           |
| `greater_than` | Numerical analysis  | Companies with 100+ employees         |
| `less_than`    | Size filtering      | Startups under 50 people              |
| `is_empty`     | Data cleanup        | Find records missing key information  |
| `is_not_empty` | Completeness checks | Records with populated fields         |

### 💡 **Pro Tips for Different Teams**

**🎯 Sales Teams** - Use these field combinations:

- **Companies**: `name`, `industry`, `employee_count`, `website`, `location`
- **People**: `full_name`, `job_title`, `email`, `company`

**📈 Marketing Teams** - Focus on engagement fields:

- **Activity tracking**: `last_interaction`, `email_status`, `campaign_response`
- **Segmentation**: `industry`, `company_size`, `location`, `engagement_score`

**✅ Customer Success** - Monitor health metrics:

- **Account health**: `renewal_date`, `support_tickets`, `usage_metrics`
- **Risk indicators**: `last_contact`, `satisfaction_score`, `contract_value`

### 🚨 **Avoid These Common Mistakes**

❌ **Wrong** (Flat object structure):

```json
{
  "filters": {
    "name": { "operator": "contains", "value": "Test" }
  }
}
```

✅ **Correct** (Nested array structure):

```json
{
  "filters": {
    "filters": [
      {
        "attribute": { "slug": "name" },
        "condition": "contains",
        "value": "Test"
      }
    ]
  }
}
```

### 🔧 **Quick Troubleshooting**

**Getting "Filters must include a 'filters' array property"?**

1. ✅ Ensure your filters object contains a `filters` array
2. ✅ Each array item needs `attribute`, `condition`, and `value`
3. ✅ The `attribute` must be an object with a `slug` property
4. ✅ Double-check your JSON structure matches the examples above

**💬 Pro Tip**: Start with simple single-filter searches, then build complexity once you're comfortable with the structure.

## 📋 **Field Mapping Quick Reference**

**Need to work with custom fields?** The MCP server uses intelligent field mapping to translate between natural language and Attio's API field names.

### **Key Concepts**

- **Synonym Handling**: Use `company_id` or `associated_company` interchangeably for deals
- **Special Characters**: Fields with spaces/special chars are automatically normalized (e.g., `"Lead Score"` → `lead_score`)
- **Category Validation**: Domain/category fields validate against your workspace configuration
- **Phone Normalization**: User-friendly `phone_number` auto-converts to Attio's `original_phone_number` format

### **Common Field Mappings**

| User-Friendly Name | Attio API Field         | Resource Type      |
| ------------------ | ----------------------- | ------------------ |
| `company_id`       | `associated_company`    | Deals              |
| `deal_value`       | `value`                 | Deals              |
| `deal_stage`       | `stage`                 | Deals              |
| `phone_number`     | `original_phone_number` | People             |
| `Lead Score`       | `lead_score`            | Companies (custom) |

### **Documentation Resources**

- 📖 **[Field Mapping Improvements Guide](./docs/api/field-mapping-improvements.md)** - Comprehensive 550+ line reference covering:
  - Field mapping categories (company, person, deal, task)
  - Synonym handling and special character processing
  - Response normalization and category validation
- 📖 **[Field Validation Rules](./docs/api/field-validation-rules.md)** - Type mappings and validation constraints
- 📖 **[Field Verification Configuration](./docs/configuration/field-verification.md)** - Environment variables and strict mode settings
- 📖 **[Installation Field Configuration](https://github.com/kesslerio/attio-mcp-server#3--critical-configure-field-mappings)** - Quick setup guide for workspace-specific fields

### **Quick Example: Custom Field Configuration**

```json
{
  "mappings": {
    "attributes": {
      "objects": {
        "companies": {
          "Lead Score": "lead_score",
          "B2B Segment": "b2b_segment"
        }
      }
    }
  }
}
```

**See Also**: [Common Update Patterns](./docs/examples/common-update-patterns.md) for phone number handling and other field update examples.

## 🏆 Latest Updates - Critical Issues Resolved

✅ **100% Integration Test Pass Rate Achieved** - All critical API contract violations and build issues have been resolved:

### Recently Fixed Issues (August 2025)

- **P0 Critical API Failures**: Fixed response data structure handling for robust fallback patterns
- **Build Compilation Errors**: Created missing enhanced-validation module and resolved TypeScript compilation
- **E2E Test Implementation**: Fixed JSON truncation, resource mappings, and email validation consistency
- **Field Parameter Filtering**: Resolved tasks attribute handling with special case for missing `/objects/tasks/attributes` endpoint
- **Email Validation Consistency**: Fixed batch validation and create/update operation alignment
- **Pagination System**: Documented tasks pagination limitation with in-memory handling workaround

### Test Status

- **Integration Tests**: 15/15 passing (100% pass rate)
- **Build Status**: All TypeScript compilation successful
- **API Contract**: All violations resolved with robust error handling

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions to these resolved issues.

## 🚀 Installation

### Installing via Smithery

To install Attio CRM Integration Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@kesslerio/attio-mcp-server):

```bash
npx -y @smithery/cli install @kesslerio/attio-mcp-server --client claude
```

### Option 1: NPM (Recommended)

```bash
# Global installation for CLI usage
npm install -g attio-mcp-server

# Or local installation for project integration
npm install attio-mcp-server
```

### Option 2: One-Command Script Installation

```bash
curl -fsSL https://raw.githubusercontent.com/kesslerio/attio-mcp-server/main/install.sh | bash
```

### Option 3: Manual Installation

```bash
git clone https://github.com/kesslerio/attio-mcp-server.git
cd attio-mcp-server
npm install
npm run build
```

## ⚡ Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Attio API Key ([Get one here](https://app.attio.com/settings/api))
- Attio Workspace ID

### 1. Set Environment Variables

```bash
export ATTIO_API_KEY="your_api_key_here"
export ATTIO_WORKSPACE_ID="your_workspace_id_here"

# Optional: Deal defaults configuration
export ATTIO_DEFAULT_DEAL_STAGE="Interested"           # Default stage for new deals
export ATTIO_DEFAULT_DEAL_OWNER="user@company.com"     # Default owner email address (see below)
export ATTIO_DEFAULT_CURRENCY="USD"                    # Default currency for deal values
```

### 2. Test the Installation

```bash
# Test the MCP server
attio-mcp-server --help

# Discover your Attio workspace attributes
attio-mcp-server discover attributes
```

### 3. 🎯 **CRITICAL: Configure Field Mappings**

The MCP server uses **field mapping files** to translate between natural language and Attio's API field names. **This configuration is essential for proper operation.**

#### **Quick Setup**

```bash
# 1. Copy the sample configuration to create your user config
cp configs/runtime/mappings/sample.json configs/runtime/mappings/user.json

# 2. Edit user.json to match your workspace's custom fields
# Focus on the "objects.companies" and "objects.people" sections
```

#### **Configuration Files** (in `configs/runtime/mappings/`)

- **`default.json`** - Standard Attio CRM fields (loaded first, don't edit)
- **`sample.json`** - Examples with custom field templates (copy from this, not used at runtime)
- **`user.json`** - **YOUR workspace-specific overrides** (merged on top of default.json)

> 💡 **Key Insight**: `user.json` is merged on top of `default.json`, so only include **overrides and additions**. Don't duplicate mappings that already exist in `default.json`.

#### **How Configuration Merging Works**

The MCP server loads configuration in this order:

1. **`default.json`** - Contains all standard Attio fields (Name, Description, Team, etc.)
2. **`user.json`** - Your custom additions/overrides are **merged on top**

**Example**: If `default.json` has `"Name": "name"` and your `user.json` also has `"Name": "name"`, that's wasted tokens. Only include fields that are:

- **New custom fields** (not in default.json)
- **Different mappings** (overriding default behavior)

#### **Optimized user.json Example**

```json
{
  "mappings": {
    "attributes": {
      "objects": {
        "companies": {
          "// Only your custom fields - defaults are inherited": "",
          "Lead Score": "lead_score",
          "B2B Segment": "b2b_segment",
          "Industry Vertical": "custom_industry_field"
        }
      }
    },
    "lists": {
      "// Only your specific lists": "",
      "Sales Pipeline": "your-pipeline-list-id"
    }
  }
}
```

**✅ Good**: Only custom/override fields  
**❌ Wasteful**: Duplicating standard fields from default.json

> ⚠️ **Without proper mapping configuration, the MCP server may not work correctly with your custom fields and lists.**

**Next:** Verify your field mappings work by testing with Claude:

```
"Find companies in our pipeline with lead score > 80"
```

### 4. Configure Claude Desktop

Add to your Claude Desktop MCP configuration:

#### Finding Required IDs

**Deal Owner Email** (for deal owner defaults):
The `ATTIO_DEFAULT_DEAL_OWNER` should be set to the email address of the workspace member who should own new deals by default. This is typically your own email address or the email address of your sales team lead.

```bash
# Example:
export ATTIO_DEFAULT_DEAL_OWNER="john.smith@company.com"
```

**Note**: The system will automatically resolve email addresses to workspace member references when creating deals.

**Deal Stages**:
Deal stages are specific to your workspace. Check your Attio workspace settings or use the `discover-attributes` command to find available stages for deals.

```json
{
  "mcpServers": {
    "attio-mcp": {
      "command": "attio-mcp-server",
      "env": {
        "ATTIO_API_KEY": "your_api_key_here",
        "ATTIO_WORKSPACE_ID": "your_workspace_id_here",
        "ATTIO_DEFAULT_DEAL_STAGE": "Interested",
        "ATTIO_DEFAULT_DEAL_OWNER": "user@company.com",
        "ATTIO_DEFAULT_CURRENCY": "USD"
      }
    }
  }
}
```

## 🌟 Real-World Use Cases

### **Automated Post-Call Workflow**

Instead of spending 20 minutes after every call updating your CRM:

```
"I just finished a demo with Acme Corp. Contact was Sarah Chen, VP of Sales.
They're interested in our Enterprise plan for their 200-person team. Main concern
is data migration from Salesforce. Timeline: want to decide by end of Q1.
Next step: I'll send a custom migration plan by Friday.

Please: add these notes to the Acme deal, move it to 'Proposal' stage, create
a follow-up task for Thursday to send migration plan, and add Sarah as a contact."
```

→ Your CRM is updated instantly while you move to your next call.

### **AI-Powered Lead Scoring**

10 signups came in overnight. Instead of spending your morning researching each one:

```
"Score these 10 new leads from last night's signups. For each: look up company info,
employee count, industry, and recent funding. Prioritize B2B SaaS companies with
50+ employees. Add the top 3 to my 'Hot Leads - March' list and create
outreach tasks for Monday."
```

→ Wake up to a prioritized, researched list ready for outreach.

### **Intelligent Meeting Prep**

5 minutes before an important call:

```
"I have a meeting with Acme Corp in 5 minutes. Give me the full context:
What's our relationship history? What deals are open? What did we discuss
last time? Any open tasks or concerns?"
```

→ Walk into every meeting fully prepared, every time.

### **For Sales Teams**

```
"Find all companies in the AI space with 50+ employees that we haven't contacted in 30 days"
"Show me all prospects added yesterday"
"Find companies created in the last 7 days with revenue over $10M"
"Create a task to follow up with Microsoft about the enterprise deal"
"Add John Smith from Google to our Q1 prospect list"
```

### **For Marketing Teams**

```
"Create a list of all SaaS companies who opened our last 3 emails but haven't responded"
"Show me engagement metrics for our outbound campaign this month"
"Add all attendees from the conference to our nurture sequence"
```

### **For Customer Success**

```
"Show me all enterprise customers with upcoming renewal dates in Q1"
"Create tasks for check-ins with accounts that haven't been contacted in 60 days"
"Find all customers who mentioned pricing concerns in recent notes"
```

## 🔐 Security & Privacy

- **Secure API Authentication**: Industry-standard API key authentication
- **No Data Storage**: Direct API passthrough with no local data retention
- **Open Source**: Full transparency with Apache 2.0 license
- **Optional On-Premises**: Deploy in your own infrastructure

## 📚 Documentation

Comprehensive documentation is available in the [docs directory](./docs):

### **Universal Tools (Recommended)**

⚠️ **Note**: Universal tools documentation is currently being updated to match the latest implementation. Use the API directly or check the source code for the most accurate interface definitions.

- [API Overview](./docs/api/api-overview.md) - High-level API concepts and patterns
- [Universal Tools Source](./src/handlers/tool-configs/universal/) - Current implementation reference
- [Tool Schemas](./src/handlers/tool-configs/universal/schemas.ts) - Parameter definitions and validation

### **Getting Started**

- [Installation & Setup](./docs/getting-started.md)
- [Claude Desktop Configuration](./docs/claude-desktop-config.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### **Configuration**

- [Warning Filter Configuration](./docs/configuration/warning-filters.md) - Understanding cosmetic vs semantic mismatches, ESLint budgets, and suppression strategies
- [Field Verification Configuration](./docs/configuration/field-verification.md) - Field persistence verification and validation settings

### **API Reference**

📋 **Implementation Status**: These docs describe the Attio API endpoints. For MCP tool usage, refer to universal tools documentation above.

- [API Overview](./docs/api/api-overview.md) - General Attio API concepts
- [Companies API](./docs/api/companies-api.md) - Company record endpoints ✅ Fully Implemented via Universal Tools
- [People API](./docs/api/people-api.md) - Person record endpoints ✅ Fully Implemented via Universal Tools
- [Lists API](./docs/api/lists-api.md) - List management endpoints ✅ Fully Implemented
- [Notes API](./docs/api/notes-api.md) - Notes endpoints ✅ Basic Implementation
- [Tasks API](./docs/api/tasks-api.md) - Task endpoints ✅ Implemented via Universal Tools

### **Advanced Topics**

- [Batch Operations](./docs/api/batch-operations.md) - Bulk operations ✅ Implemented with chunking
- [Advanced Filtering](./docs/api/advanced-filtering.md) - Complex queries ✅ Implemented
- [Error Handling](./docs/api/error-handling.md) - Error patterns ✅ Enhanced error handling
- [Extending MCP](./docs/api/extending-mcp.md) - Customization guide

### **Deployment**

- [Docker Guide](./docs/docker/docker-guide.md)
- [Security Best Practices](./docs/docker/security-guide.md)

## 🛠 Development

### **Setup Development Environment**

```bash
git clone https://github.com/kesslerio/attio-mcp-server.git
cd attio-mcp-server
npm install
npm run build
npm run test:offline
```

### **Smithery CLI Development**

For local development and testing with Smithery Playground:

```bash
npm run dev  # Opens Smithery Playground with local server
```

See [docs/deployment/smithery-cli-setup.md](./docs/deployment/smithery-cli-setup.md) for detailed Smithery CLI development setup.

### **Testing**

The project includes comprehensive testing at multiple levels with **100% E2E test pass rate**:

#### **🚀 E2E Test Framework (100% Pass Rate)**

Our comprehensive E2E test framework validates all universal tools with real Attio API integration:

```bash
# E2E Tests (requires ATTIO_API_KEY in .env file)
npm run e2e                 # Run complete E2E test suite (51 tests, 100% pass rate)
npm test -- test/e2e/suites/universal-tools.e2e.test.ts  # Universal tools E2E tests

# Set up E2E environment
echo "ATTIO_API_KEY=your_api_key_here" > .env
npm run e2e                 # Should show 51/51 tests passing
```

**✅ Comprehensive Coverage:**

- **Pagination Testing**: Validates `offset` parameter across all universal tools
- **Field Filtering**: Tests `fields` parameter for selective data retrieval
- **Tasks Integration**: Complete lifecycle testing for tasks resource type
- **Cross-Resource Validation**: Ensures consistent behavior across companies, people, lists, tasks
- **Error Handling**: Validates graceful error responses and edge cases
- **Performance Monitoring**: Tracks execution times and API response sizes

**🛠️ Enhanced Assertions (7 New Methods):**

```typescript
// Available in test/e2e/utils/assertions.ts
expectValidPagination(result, params); // Validates pagination behavior
expectFieldFiltering(result, fields); // Validates field selection
expectValidTasksIntegration(result); // Tasks-specific validation
expectSpecificError(result, errorType); // Typed error validation
expectOptimalPerformance(result, budget); // Performance validation
expectValidUniversalToolParams(params); // Parameter validation
expectValidBatchOperation(result, records); // Batch operation validation
```

**📊 Performance Benchmarks:**

- **Search Operations**: < 1000ms per API call
- **CRUD Operations**: < 1500ms per operation
- **Batch Operations**: < 3000ms for 10 records
- **Field Filtering**: < 500ms additional overhead
- **Pagination**: < 200ms additional per offset

#### **Unit & Integration Tests**

```bash
# Unit Tests (no API required)
npm test                    # Run all tests
npm run test:offline        # Run only offline tests (206 tests)
npm run test:watch          # Watch mode for development

# Integration Tests (requires API key and test data)
npm run test:integration    # Run all integration tests (15 tests, 100% pass rate)
npm run setup:test-data     # Create test data in your workspace
```

#### **Test Environment Setup**

For E2E and integration tests, you need:

1. **Create `.env` file** in project root:

```bash
# Required for E2E/Integration tests
ATTIO_API_KEY=your_64_character_api_key_here
PORT=3000
LOG_LEVEL=debug
NODE_ENV=development
```

2. **Verify API key** format (must be exactly 64 characters)
3. **Run tests** to validate setup:

```bash
npm run build && npm run test:integration
```

See the [Testing Guide](./docs/testing.md) and [E2E Troubleshooting Guide](./docs/testing/e2e-troubleshooting.md) for detailed setup instructions.

### **Available Scripts**

```bash
npm run build          # Build TypeScript
npm run test           # Run all tests
npm run test:offline   # Run tests without API calls
npm run analyze:token-footprint # Generate baseline MCP token footprint report
npm run lint           # Check code style
npm run check          # Full quality check
npm run setup:test-data # Create test data for integration tests
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIB.md) for details on:

- Adding new tools and features
- Improving documentation
- Reporting bugs and requesting features
- Testing and quality assurance

## 📈 What's Next?

This initial release provides a solid foundation for CRM automation.

## 🔗 Links

- **NPM Package**: https://www.npmjs.com/package/attio-mcp
- **GitHub Repository**: https://github.com/kesslerio/attio-mcp-server
- **Issues & Support**: https://github.com/kesslerio/attio-mcp-server/issues
- **Releases**: https://github.com/kesslerio/attio-mcp-server/releases
- **Attio Documentation**: https://developers.attio.com/

## 📄 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

**Original Work Attribution**: This project is based on initial work by @hmk under BSD-3-Clause license, with substantial modifications and enhancements by @kesslerio. The original BSD license notice is preserved in the LICENSE file as required.

---

**Ready to transform your CRM workflow?** Install Attio MCP Server today and experience the future of CRM automation with AI!

```bash
npm install -g attio-mcp-server
```
