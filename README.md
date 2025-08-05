# Attio MCP Server

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![npm version](https://badge.fury.io/js/attio-mcp.svg)](https://badge.fury.io/js/attio-mcp)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub Release](https://img.shields.io/github/v/release/kesslerio/attio-mcp-server)](https://github.com/kesslerio/attio-mcp-server/releases)

A comprehensive Model Context Protocol (MCP) server for [Attio](https://attio.com/), the AI-native CRM. This server enables AI assistants like Claude to interact directly with your Attio data through natural language, providing seamless integration between conversational AI and your CRM workflows.

## 🎯 What is Attio MCP Server?

Transform your CRM workflows with AI-powered automation. Instead of clicking through multiple screens, simply ask Claude to find prospects, update records, manage pipelines, and analyze your data using natural language commands.

> "Find all AI companies with 50+ employees that we haven't contacted in 30 days and add them to our Q1 outreach list"

## ✨ Core Features

### 🎯 **Universal Tools Architecture** (13 Tools)
**68% Tool Reduction**: Consolidated 40+ resource-specific tools into 13 universal operations for consistent, powerful CRM management.

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
- **Flexible Filtering**: Text, numeric, date, boolean, and relationship filters
- **Data Export**: JSON serialization for integrations
- **Real-time Updates**: Live data synchronization with Attio

## 🚀 Installation

### Option 1: NPM (Recommended)
```bash
# Global installation for CLI usage
npm install -g attio-mcp

# Or local installation for project integration
npm install attio-mcp
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
export ATTIO_DEFAULT_DEAL_STAGE="Interested"      # Default stage for new deals
export ATTIO_DEFAULT_DEAL_OWNER="member_id_here"  # Default owner workspace member ID (see below)
export ATTIO_DEFAULT_CURRENCY="USD"               # Default currency for deal values
```

### 2. Test the Installation
```bash
# Test the MCP server
attio-mcp --help

# Discover your Attio workspace attributes
attio-discover attributes
```

### 3. Configure Claude Desktop

Add to your Claude Desktop MCP configuration:

#### Finding Required IDs

**Workspace Member ID** (for deal owner defaults):
```bash
# Use the Attio API to list workspace members
curl -H "Authorization: Bearer $ATTIO_API_KEY" \
  https://api.attio.com/v2/workspace-members

# Look for your name in the response to find your member ID
```

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
        "ATTIO_DEFAULT_DEAL_OWNER": "member_id_here",
        "ATTIO_DEFAULT_CURRENCY": "USD"
      }
    }
  }
}
```

## 🔌 Integration Features

### **ChatGPT Connector (New!)**
- **OpenAI-Compatible Tools**: Search and fetch Attio data using ChatGPT's native tool interface
- **SSE Transport Layer**: Real-time communication with Server-Sent Events support
- **Universal Tool Integration**: Leverages the same powerful universal tools through OpenAI API format
- **Cross-Platform**: Works with ChatGPT, OpenAI API, and any OpenAI-compatible client

## 🌟 Example Use Cases

### **For Sales Teams**
```
"Find all companies in the AI space with 50+ employees that we haven't contacted in 30 days"
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
- [Universal Tools Overview](./docs/universal-tools/README.md) - Start here for the new universal tools system
- [Migration Guide](./docs/universal-tools/migration-guide.md) - Migrate from deprecated individual tools
- [API Reference](./docs/universal-tools/api-reference.md) - Complete reference for all 13 universal tools
- [User Guide](./docs/universal-tools/user-guide.md) - Best practices and common use cases
- [Developer Guide](./docs/universal-tools/developer-guide.md) - Extending and customizing universal tools
- [Troubleshooting](./docs/universal-tools/troubleshooting.md) - Common issues and solutions

### **Getting Started**
- [Installation & Setup](./docs/getting-started.md)
- [Claude Desktop Configuration](./docs/claude-desktop-config.md)
- [ChatGPT Connector Setup](./docs/chatgpt-connector.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### **API Reference**
- [API Overview](./docs/api/api-overview.md)
- [Companies API](./docs/api/companies-api.md)
- [People API](./docs/api/people-api.md)
- [Lists API](./docs/api/lists-api.md)
- [Notes API](./docs/api/notes-api.md)
- [Tasks API](./docs/api/tasks-api.md)

### **Advanced Topics**
- [Batch Operations](./docs/api/batch-operations.md)
- [Advanced Filtering](./docs/api/advanced-filtering.md)
- [Error Handling](./docs/api/error-handling.md)
- [Extending MCP](./docs/api/extending-mcp.md)

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

### **Testing**

The project includes comprehensive unit and integration tests:

```bash
# Unit Tests (no API required)
npm test                    # Run all tests
npm run test:offline        # Run only offline tests
npm run test:watch          # Watch mode for development

# Integration Tests (requires API key and test data)
npm run test:integration    # Run all integration tests
npm run setup:test-data     # Create test data in your workspace
```

See the [Testing Guide](./docs/testing.md) for detailed instructions on setting up and running integration tests.

### **Available Scripts**
```bash
npm run build          # Build TypeScript
npm run test           # Run all tests
npm run test:offline   # Run tests without API calls
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

This initial release provides a solid foundation for CRM automation. Future versions will include:

- ✅ **ChatGPT Integration**: OpenAI-compatible search and fetch tools (Phase 2 Complete)
- **OAuth Authentication**: Secure authentication flow for ChatGPT (Phase 3 In Progress)
- **Enhanced AI Insights**: AI-powered data analysis and recommendations
- **Custom Workflow Builders**: Visual workflow creation for complex automations
- **Advanced Reporting**: Comprehensive analytics and dashboard integrations
- **Third-Party Integrations**: HubSpot, Salesforce, and other CRM sync capabilities

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