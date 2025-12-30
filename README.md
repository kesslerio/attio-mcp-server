# Attio MCP Server

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![npm version](https://badge.fury.io/js/attio-mcp.svg)](https://badge.fury.io/js/attio-mcp)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub Release](https://img.shields.io/github/v/release/kesslerio/attio-mcp-server)](https://github.com/kesslerio/attio-mcp-server/releases)
[![smithery badge](https://smithery.ai/badge/@kesslerio/attio-mcp-server)](https://smithery.ai/server/@kesslerio/attio-mcp-server)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/kesslerio/attio-mcp-server)

A comprehensive Model Context Protocol (MCP) server for [Attio](https://attio.com/), providing **complete CRM surface coverage**. This server enables AI assistants like Claude and ChatGPT to interact directly with your entire Attio workspace through natural language—manage Deals, Tasks, Lists, People, Companies, Records, and Notes without falling back to raw API calls.

## 🎯 What is Attio MCP Server?

Transform your CRM workflows with AI-powered automation. Instead of clicking through multiple screens, simply ask Claude or ChatGPT to find prospects, update records, manage pipelines, and analyze your data using natural language commands.

**🎉 v1.0.0 Milestone**: Complete Attio CRM surface coverage with full ChatGPT Developer Mode integration.

> "Find all AI companies with 50+ employees that we haven't contacted in 30 days and add them to our Q1 outreach list"

## 🚀 **NEW: ChatGPT Developer Mode Integration**

**v1.0.0 introduces full ChatGPT compatibility!** ChatGPT Pro/Plus users can now access the entire Attio toolset through natural language via [Smithery marketplace](https://smithery.ai/server/@kesslerio/attio-mcp-server).

- **🔐 Built-in Approval Flows**: MCP safety annotations auto-approve read operations, request approval for writes
- **🌐 OAuth Integration**: Seamless authentication via `https://server.smithery.ai/@kesslerio/attio-mcp-server/mcp`
- **💬 Natural Language CRM**: Manage your entire Attio workspace through conversational AI
- **📖 Setup Guide**: See [ChatGPT Developer Mode docs](./docs/chatgpt-developer-mode.md) for complete configuration

## ✨ Core Features & Implementation Status

### 🎯 **Universal Tools Architecture** (14 Tools)

**68% Tool Reduction**: Consolidated 40+ resource-specific tools into 14 universal operations for consistent, powerful CRM management.

- **High Performance**: 89.7% speed improvement with 227KB memory reduction (PR #483)
- **Enterprise Quality**: 97.15/100 production readiness score with zero breaking changes
- **Clean Architecture**: Complete production-test separation with mock factory pattern

### 📊 **Feature Implementation Status**

#### ✅ **Complete CRM Surface Coverage**

- **Companies**: Search, Create, Update, Delete, Advanced Search, Relationship Search
- **People**: Search, Create, Update, Delete, Advanced Search, Relationship Search
- **Deals**: Full CRUD operations with intelligent field mapping and stage validation
- **Tasks**: Create, Update, Delete, Search with multi-assignee support
- **Lists**: Full CRUD operations, filtering, advanced filtering, entry management
- **Notes**: Create and list operations for all record types
- **Records**: Universal CRUD operations across all resource types
- **Batch Operations**: Create, Update, Delete with chunking and error handling
- **Content Search**: Universal search capabilities across notes, tasks, and lists
- **Relationship Navigation**: Bidirectional company↔person↔deal relationships
- **Advanced Filtering**: Sophisticated query capabilities with intelligent field mapping

### 📊 **Company Management**

- **Universal Search**: Find companies with `search_records` and `search_records_advanced`
- **Full CRUD**: Create, read, update, and delete with universal record operations
- **Relationship Discovery**: Find companies through `search_records_by_relationship`
- **Batch Operations**: Process hundreds of companies with `batch_records`
- **Detailed Information**: Get contact, business, and social info with `get_record_info`

### 👥 **People Management**

- **Universal Contact Search**: Find people by any criteria using universal search tools
- **Relationship Tracking**: Link people to companies with `search_records_by_relationship`
- **Activity Timeline**: Track interactions with `search_records_by_content` and `search_records_by_timeframe`
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

### 🧠 **Claude Skills**

Supercharge Claude's Attio knowledge with pre-built skills that prevent common errors and teach best practices.

| Skill                      | Purpose                                        | Setup                                           |
| -------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| **attio-mcp-usage**        | Error prevention + universal workflow patterns | Bundled - just use it                           |
| **attio-workspace-schema** | YOUR workspace's exact field names and options | `npx attio-discover generate-skill --all --zip` |
| **attio-skill-generator**  | Create custom workflow skills (advanced)       | Python + prompting                              |

**Quick Start** (solves "wrong field name" errors):

```bash
npx attio-discover generate-skill --all --zip
# Import ZIP into Claude Desktop: Settings > Skills > Install Skill
```

See [Skills Documentation](./docs/usage/skills/README.md) for complete setup and usage guides.

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

- **Universal Tools**: Primary interface (14 tools) - recommended for all new integrations
- **Legacy Tools**: Available via `DISABLE_UNIVERSAL_TOOLS=true` environment variable (deprecated)
- **Lists API**: Fully functional with complete CRUD operations (contrary to some outdated documentation)

### 🤝 **OpenAI MCP Compatibility**

- **Developer Mode Ready**: Every tool now publishes MCP safety annotations (`readOnlyHint`, `destructiveHint`) so OpenAI Developer Mode can auto-approve reads and request confirmation for writes.
- **Full Tool Access (Default)**: All 35 tools are exposed by default (21 universal + 11 list + 3 workspace member). Do NOT set `ATTIO_MCP_TOOL_MODE` in Smithery configuration for full access.
- **Search-Only Mode**: To restrict to read-only tools (`search`, `fetch`, `aaa-health-check`), explicitly configure `ATTIO_MCP_TOOL_MODE: 'search'` in Smithery dashboard when Developer Mode is unavailable.
- **Detailed Guide**: See [docs/chatgpt-developer-mode.md](./docs/chatgpt-developer-mode.md) for environment variables, approval flows, and validation tips.
- **User Documentation**: See the [ChatGPT Developer Mode docs](./docs/chatgpt-developer-mode.md) for a complete walkthrough of approval flows and setup instructions.

### **Performance Considerations**

- **Batch Operations**: Optimized with chunking, rate limiting, and error recovery
- **Large Datasets**: Automatic pagination and field filtering for optimal performance
- **Rate Limiting**: Built-in protection against API rate limits with exponential backoff

For detailed troubleshooting and solutions, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) and [GitHub Issues](https://github.com/kesslerio/attio-mcp-server/issues).

## 🎯 **Advanced Search Filters**

Build powerful CRM queries with multi-criteria AND/OR filtering. See the [Advanced Search Guide](./docs/usage/advanced-search.md) for complete examples and operator reference.

## 🚀 Installation

> ⚠️ **IMPORTANT: Correct Package Name**
>
> The npm package name is **`attio-mcp`** (not `attio-mcp-server`).
> The GitHub repository is named `attio-mcp-server`, but the npm package was renamed to `attio-mcp` in June 2025.
> Installing `attio-mcp-server` will give you an outdated v0.0.2 release with only 4 legacy tools.

### Client Compatibility

| Client             | Smithery (Tier 1) | Local Install (Tier 2-3) | Cloudflare Worker (Tier 4) |
| ------------------ | ----------------- | ------------------------ | -------------------------- |
| Claude Desktop     | ✅ Recommended    | ✅ Full support          | ✅ Full support            |
| Claude Web         | ✅ Recommended    | N/A                      | ✅ Full support            |
| ChatGPT (Pro/Plus) | ✅ Required       | N/A                      | ✅ Full support            |
| Cursor IDE         | ✅ Supported      | ✅ Full support          | ✅ Full support            |
| Claude Code (CLI)  | Partial           | ✅ Recommended           | Partial                    |

**Choose your installation method:**

- **Most users**: Use [Tier 1 (Smithery)](#tier-1-smithery-one-click---recommended) - zero local config required
- **Local control**: Use [Tier 2 (Shell Installers)](#tier-2-shell-installers) - one command, automatic setup
- **Power users**: Use [Tier 3 (Manual)](#tier-3-manual-configuration) - full control over configuration
- **Teams/Enterprise**: Use [Tier 4 (Cloudflare Worker)](#tier-4-cloudflare-worker-remote-deployment) - self-hosted, multi-user OAuth

---

### Tier 1: Smithery (One-Click) - Recommended

> **Best for**: Claude Desktop, Claude Web, ChatGPT, Cursor - zero local installation required.

[Smithery](https://smithery.ai/server/@kesslerio/attio-mcp-server) handles OAuth, hosting, and configuration automatically.

#### Claude Desktop via Smithery

```bash
npx -y @smithery/cli install @kesslerio/attio-mcp-server --client claude
```

#### Cursor IDE via Smithery

```bash
npx -y @smithery/cli install @kesslerio/attio-mcp-server --client cursor
```

#### ChatGPT Developer Mode

ChatGPT requires Smithery for OAuth authentication. Direct server URLs are not supported.

1. Enable Developer Mode: **Settings → Connectors → Advanced → Developer Mode**
2. Add MCP Server URL: `https://server.smithery.ai/@kesslerio/attio-mcp-server/mcp`
3. Complete OAuth authorization when prompted

See [ChatGPT Developer Mode Guide](./docs/chatgpt-developer-mode.md) for detailed setup instructions.

#### Claude Web

1. Go to [Claude.ai](https://claude.ai) Settings → Connectors
2. Add new MCP connector
3. Select "Attio CRM" from Smithery marketplace
4. Authorize with your Attio account

---

### Tier 2: Shell Installers

> **Best for**: Developers who prefer local installations with automatic configuration.

One-command scripts that install `attio-mcp` and configure your client automatically.

#### Claude Desktop

```bash
curl -fsSL https://raw.githubusercontent.com/kesslerio/attio-mcp-server/main/scripts/install-claude-desktop.sh | bash
```

#### Cursor IDE

```bash
curl -fsSL https://raw.githubusercontent.com/kesslerio/attio-mcp-server/main/scripts/install-cursor.sh | bash
```

#### Claude Code (CLI)

```bash
curl -fsSL https://raw.githubusercontent.com/kesslerio/attio-mcp-server/main/scripts/install-claude-code.sh | bash
```

These scripts will:

- Install `attio-mcp` npm package globally (if needed)
- Backup existing configuration files
- Prompt for your Attio API key
- Configure the MCP server for your client
- Print next steps and restart instructions

---

### Tier 3: Manual Configuration

> **Best for**: Power users who prefer full control or use unsupported clients.

<details>
<summary><strong>Claude Desktop Manual Setup</strong></summary>

#### Step 1: Install attio-mcp

```bash
npm install -g attio-mcp
```

#### Step 2: Find your config file

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

#### Step 3: Add configuration

```json
{
  "mcpServers": {
    "attio-mcp": {
      "command": "attio-mcp",
      "env": {
        "ATTIO_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Step 4: Restart Claude Desktop completely (quit and reopen)

</details>

<details>
<summary><strong>Cursor IDE Manual Setup</strong></summary>

#### Step 1: Install attio-mcp

```bash
npm install -g attio-mcp
```

#### Step 2: Edit config file

Location: `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "attio-mcp": {
      "command": "attio-mcp",
      "env": {
        "ATTIO_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Step 3: Restart Cursor

</details>

<details>
<summary><strong>Claude Code (CLI) Manual Setup</strong></summary>

#### Option A: Using Claude CLI command (recommended)

```bash
echo '{"command":"attio-mcp","env":{"ATTIO_API_KEY":"your_key_here"}}' | claude mcp add-json attio-mcp --stdin -s user
```

#### Option B: Manual config edit

Edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "attio-mcp": {
      "command": "attio-mcp",
      "env": {
        "ATTIO_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Building from Source</strong></summary>

For development or custom deployments:

```bash
git clone https://github.com/kesslerio/attio-mcp-server.git
cd attio-mcp-server
npm install
npm run build
```

Run directly:

```bash
ATTIO_API_KEY=your_key node dist/index.js
```

</details>

<details>
<summary><strong>NPM Global Install</strong></summary>

```bash
# Global installation for CLI usage
npm install -g attio-mcp

# Or local installation for project integration
npm install attio-mcp
```

</details>

---

### Tier 4: Cloudflare Worker (Remote Deployment)

> **Best for**: Teams needing centralized OAuth, multi-user access, mobile access, or running MCP without local installation.

Deploy your own Attio MCP server on Cloudflare Workers with full OAuth 2.1 support.

**Mobile Access**: With a remote MCP server, you can use Attio tools from:

- ChatGPT mobile app (iOS/Android)
- Claude mobile app (iOS/Android)
- Any browser on any device

#### Smithery vs. Cloudflare Worker

| Feature           | Smithery  | Cloudflare Worker |
| ----------------- | --------- | ----------------- |
| Setup complexity  | Very Low  | Medium            |
| OAuth built-in    | ✅        | ✅                |
| Mobile app access | ✅        | ✅                |
| Multi-user access | ❌        | ✅                |
| Custom domain     | ❌        | ✅                |
| Self-hosted       | ❌        | ✅                |
| Team deployments  | Limited   | ✅ Full           |
| Cost              | Free tier | Free tier         |

#### Quick Deploy

```bash
cd examples/cloudflare-mcp-server
npm install
wrangler kv:namespace create "TOKEN_STORE"
# Update wrangler.toml with the KV namespace ID
wrangler secret put ATTIO_CLIENT_ID
wrangler secret put ATTIO_CLIENT_SECRET
wrangler secret put TOKEN_ENCRYPTION_KEY
wrangler deploy
```

#### Client Configuration

After deployment, configure your client with your Worker URL:

- **Claude.ai**: Settings → Connectors → Add your Worker URL
- **ChatGPT**: Settings → Connectors → Developer Mode → Add Worker URL

See [Cloudflare Worker Deployment Guide](./examples/cloudflare-mcp-server/README.md) for:

- Complete OAuth 2.1 setup with Attio
- Token encryption configuration
- Production deployment checklist
- Troubleshooting guide

---

## 🆕 What's New in v1.4.0

### Major Features

- **🎯 Workspace Schema Skill Generator** (#983) - Auto-generate Claude Skills from your Attio workspace schema for error-free field names and options
- **🔍 Select-field Transformer** (#1019) - Case-insensitive matching, partial matching, and UUID pass-through for select/status fields
- **🛠️ Attio Skill Generator Meta-skill** (#1020) - Meta-skill for automatic workspace documentation
- **📚 Universal Usage Guide Skill** (#1018) - Hand-crafted workflow patterns and error prevention
- **⚙️ `get_record_attribute_options` tool** (#975) - Get valid options for select/status fields with enhanced error messages
- **📞 Phone validation** (#951) - Built-in phone number validation support
- **⏱️ Configurable option fetch delay** - Rate limiting control via `--option-fetch-delay` flag

### Major Enhancements

- **🏷️ MCP-compliant tool naming** (#1039) - All tools now use `snake_case`, verb-first naming (old names work via aliases until v2.0.0)
- **🎨 Custom object display names** (#1017) - Fetch display names directly from Attio API
- **📖 Split integration patterns** (#1023) - Progressive discovery patterns by use case
- **💡 Enhanced attribute error messages** (#975) - Levenshtein distance suggestions for typos

### Critical Fixes

- 📝 Note content line breaks preserved (#1052)
- 👤 People search "Unnamed" display fixed (#1051)
- ✅ Select field persistence (#1045)
- 🔗 Record-reference auto-transformation (#997)
- 📊 Multi-select array auto-transformation (#992)
- 🛡️ Complex attribute validation (#991)
- ⚠️ Field persistence false warnings (#995)
- 📦 SDK dependency pinning (#1025)
- 💼 Deal stage/UTM validation (#1043)
- 📍 Location field auto-normalization (#987)

### Internal Improvements

- Tool alias system refactoring (#1041) - Type-safe constants with pattern-based generation
- Strategy Pattern for CRUD error handlers (#1001)
- Consolidated metadata fetching (#984)
- UniversalUpdateService modularization (#984)
- Select transformation type rename (#1055) - `select_title_to_array` for clarity

## 🔄 Migration Guide

**Upgrading from v1.3.x or earlier?** Tool names have changed to follow MCP naming conventions.

**Old names still work** via backward-compatible aliases, but will be removed in **v2.0.0 (Q1 2026)**.

### Tool Name Changes

| Old Name (Deprecated)            | New Name (MCP-compliant)         | Notes              |
| -------------------------------- | -------------------------------- | ------------------ |
| `records_search`                 | `search_records`                 | Verb-first pattern |
| `records_get_details`            | `get_record_details`             | Verb-first pattern |
| `records_get_attributes`         | `get_record_attributes`          | Verb-first pattern |
| `records_discover_attributes`    | `discover_record_attributes`     | Verb-first pattern |
| `records_search_advanced`        | `search_records_advanced`        | Verb-first pattern |
| `records_search_by_relationship` | `search_records_by_relationship` | Verb-first pattern |
| `records_search_by_content`      | `search_records_by_content`      | Verb-first pattern |
| `records_search_by_timeframe`    | `search_records_by_timeframe`    | Verb-first pattern |
| `records_batch`                  | `batch_records`                  | Verb-first pattern |
| `search-records`                 | `search_records`                 | snake_case format  |
| `get-record-details`             | `get_record_details`             | snake_case format  |
| `create-record`                  | `create_record`                  | snake_case format  |
| `update-record`                  | `update_record`                  | snake_case format  |
| `delete-record`                  | `delete_record`                  | snake_case format  |
| `create-note`                    | `create_note`                    | snake_case format  |
| `list-notes`                     | `list_notes`                     | snake_case format  |
| `smithery-debug-config`          | `smithery_debug_config`          | snake_case format  |

**Action Required:** Update your integrations to use new tool names before Q1 2026. See [MIGRATION-GUIDE.md](docs/MIGRATION-GUIDE.md) for the complete migration table.

---

## ⚡ Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Attio API Key ([Get one here](https://app.attio.com/settings/api)) **or** OAuth access token
- Attio Workspace ID

### 🔐 Authentication Options

The server supports two authentication methods—both use the same Bearer token scheme:

| Method                    | Environment Variable | Best For                             |
| ------------------------- | -------------------- | ------------------------------------ |
| **API Key** (recommended) | `ATTIO_API_KEY`      | Long-term integrations, personal use |
| **OAuth Access Token**    | `ATTIO_ACCESS_TOKEN` | OAuth integrations, third-party apps |

> **Note:** If both are set, `ATTIO_API_KEY` takes precedence.
>
> **OAuth Users:** For detailed setup including PKCE flow and token refresh, see [OAuth Authentication Guide](./docs/guides/oauth-authentication.md).

### 1. Set Environment Variables

```bash
# Option 1: API Key (recommended for most users)
export ATTIO_API_KEY="your_api_key_here"

# Option 2: OAuth Access Token (for OAuth integrations)
# export ATTIO_ACCESS_TOKEN="your_oauth_access_token_here"

export ATTIO_WORKSPACE_ID="your_workspace_id_here"

# Optional: Deal defaults configuration
export ATTIO_DEFAULT_DEAL_STAGE="Interested"           # Default stage for new deals
export ATTIO_DEFAULT_DEAL_OWNER="user@company.com"     # Default owner email address (see below)
export ATTIO_DEFAULT_CURRENCY="USD"                    # Default currency for deal values
```

### 2. Test the Installation

```bash
# Test the MCP server
attio-mcp --help

# Discover your Attio workspace attributes
attio-discover attributes
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
      "command": "attio-mcp",
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

## 🌟 Example Use Cases

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

### **For Data Operations**

```
"Update all companies with missing industry data based on their domains"
"Export all contacts added this quarter to CSV"
"Merge duplicate company records for Acme Corporation"
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
- [Search Scoring Configuration](./docs/configuration/search-scoring.md) - Environment variables for relevance scoring, caching, and operator validation

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

```bash
npm test                    # Run all tests
npm run test:offline        # Run only offline tests (no API required)
npm run test:integration    # Integration tests (requires ATTIO_API_KEY)
npm run e2e                 # E2E tests (requires ATTIO_API_KEY)
```

For E2E/integration tests, create `.env` with your `ATTIO_API_KEY`. See the [Testing Guide](./docs/testing.md) for detailed setup.

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
npm install -g attio-mcp
```
