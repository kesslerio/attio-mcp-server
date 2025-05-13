# Attio MCP Server

[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](LICENSE)

A Model Context Protocol (MCP) server for [Attio](https://attio.com/), the AI-native CRM. This server enables AI assistants like Claude to interact directly with your Attio data, providing a seamless integration between conversational AI and your CRM.

## 🚀 Key Features

- **Comprehensive Attio API Support**
  - Companies: Search, view details, manage notes
  - People: Search (with email/phone support), view details, manage notes
  - Lists: View, manage entries, add/remove records
  - Records: Create, read, update, delete (coming soon)
  - Tasks: View and manage (coming soon)

- **Enhanced Capabilities**
  - Robust error handling with helpful messages
  - Automatic retry logic with exponential backoff
  - Input validation to prevent common errors
  - Standardized response formatting

## 🔍 Example: Using with Claude

Ask Claude natural questions about your Attio data:

```
"Find all technology companies in our CRM"
"Add a note to Acme Corporation about our recent product demo"
"Show me all contacts from Microsoft who were added this month"
"Add Sarah Johnson's new phone number: +1-555-123-4567"
```

## ⚡ Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Attio API Key ([Get one here](https://developers.attio.com/reference/get_v2-objects))

### Installation

```bash
npm install attio-mcp-server
```

### Configuration for Claude Desktop

```json
{
  "mcpServers": {
    "attio": {
      "command": "npx",
      "args": ["attio-mcp-server"],
      "env": {
        "ATTIO_API_KEY": "YOUR_ATTIO_API_KEY"
      }
    }
  }
}
```

## 🌐 Deployment Options

- **Local Development**: [Development Guide](./docs/development-guide.md)
- **Docker**: [Docker Guide](./docs/docker/docker-guide.md)
  - Easy setup with Docker Compose
  - Health checks included
  - Configurable through environment variables

## 📚 Documentation

Full documentation is available in the [docs directory](./docs):

- **Getting Started**
  - [Installation & Setup](./docs/getting-started.md)
  - [Claude Desktop Config](./docs/claude-desktop-config.md)

- **API Reference**
  - [API Overview](./docs/api/api-overview.md)
  - [People API](./docs/api/people-api.md)
  - [Companies API](./docs/api/objects-api.md)
  - [Lists API](./docs/api/lists-api.md)
  - [Notes API](./docs/api/notes-api.md)

- **Deployment**
  - [Docker Guide](./docs/docker/docker-guide.md)
  - [Security Best Practices](./docs/docker/security-guide.md)

- **Development**
  - [Contributing Guidelines](./CONTRIB.md)
  - [Error Handling](./docs/api/error-handling.md)
  - [Extending MCP](./docs/api/extending-mcp.md)

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guidelines](./CONTRIB.md) for details on how to submit pull requests, report issues, and suggest improvements.

## 📄 License

This project is licensed under the BSD 3-Clause License - see the [LICENSE](LICENSE) file for details.