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

### 📊 **Company Management** (27 Tools)
- **Smart Search**: Find companies by domain, text, or complex filters
- **Full CRUD**: Create, read, update, and delete company records
- **Relationship Discovery**: Find companies through their people's attributes
- **Batch Operations**: Process hundreds of companies efficiently
- **Notes & Activities**: Track all company interactions

### 👥 **People Management** (15 Tools)  
- **Contact Search**: Find people by email, phone, name, or activity history
- **Relationship Tracking**: Link people to companies with role management
- **Activity Timeline**: Track all interactions and touchpoints
- **Advanced Filtering**: Multi-attribute search with date ranges
- **Bulk Operations**: Efficiently manage large contact databases

### 📋 **Lists & Pipeline Management** (11 Tools)
- **Pipeline Operations**: Move deals through sales stages
- **Smart Segmentation**: Create and manage targeted contact lists
- **Advanced Filtering**: Complex multi-condition filtering with AND/OR logic
- **Entry Management**: Add, remove, and update list memberships
- **Deal Tracking**: Monitor opportunities and revenue pipeline

### ✅ **Task Management** (5 Tools)
- **Assignment System**: Create and assign tasks to team members
- **Record Linking**: Associate tasks with CRM records
- **Progress Tracking**: Monitor completion and deadlines
- **Team Coordination**: Streamline follow-ups and activities

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

```json
{
  "mcpServers": {
    "attio-mcp": {
      "command": "attio-mcp",
      "env": {
        "ATTIO_API_KEY": "your_api_key_here",
        "ATTIO_WORKSPACE_ID": "your_workspace_id_here"
      }
    }
  }
}
```

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

### **Getting Started**
- [Installation & Setup](./docs/getting-started.md)
- [Claude Desktop Configuration](./docs/claude-desktop-config.md)
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

### **Available Scripts**
```bash
npm run build          # Build TypeScript
npm run test           # Run all tests
npm run test:offline   # Run tests without API calls
npm run lint           # Check code style
npm run check          # Full quality check
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIB.md) for details on:

- Adding new tools and features
- Improving documentation
- Reporting bugs and requesting features
- Testing and quality assurance

## 📈 What's Next?

This initial release provides a solid foundation for CRM automation. Future versions will include:

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