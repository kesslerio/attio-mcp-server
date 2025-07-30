# Attio MCP Server Documentation

Welcome to the Attio MCP Server documentation. This documentation provides comprehensive information about installation, configuration, usage, and development of the Attio MCP Server.

## What is Attio MCP Server?

Attio MCP Server is a Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with your [Attio](https://attio.com/) CRM data. It acts as a bridge between conversational AI and your customer relationship management system, allowing natural language interactions with your CRM data.

## Documentation Structure

This documentation is organized into the following sections:

### Universal Tools (Recommended) ⭐
- [Universal Tools Overview](./universal-tools/README.md) - **Start here** for the new universal tools system
- [Migration Guide](./universal-tools/migration-guide.md) - Migrate from deprecated individual tools
- [API Reference](./universal-tools/api-reference.md) - Complete reference for all 13 universal tools
- [User Guide](./universal-tools/user-guide.md) - Best practices and common use cases
- [Developer Guide](./universal-tools/developer-guide.md) - Extending and customizing universal tools
- [Troubleshooting](./universal-tools/troubleshooting.md) - Common issues and solutions

### Getting Started
- [Installation & Setup](./getting-started.md)
- [Claude Desktop Configuration](./claude-desktop-config.md)
- [Troubleshooting Common Issues](./troubleshooting.md)

### API Reference (Legacy)
- [API Overview](./api/api-overview.md) - Introduction to the API
- [Error Handling](./api/error-handling.md) - How errors are handled and reported
- [People API](./api/people-api.md) - Working with people records
- [Companies API](./api/objects-api.md) - Working with company records
- [Lists API](./api/lists-api.md) - Working with lists and list entries
- [Notes API](./api/notes-api.md) - Working with notes on records
- [Records API](./api/records-api.md) - Creating and managing records
- [Tasks API](./api/tasks-api.md) - Working with tasks (coming soon)
- [Prompts API](./api/prompts-api.md) - Pre-built prompts for common operations

### Deployment
- [Docker Guide](./docker/docker-guide.md) - Deploying with Docker
- [Docker Security](./docker/security-guide.md) - Security considerations for Docker deployment
- [Docker Changes Log](./docker/CHANGES.md) - Recent changes to Docker configuration

### Development
- [Architecture Overview](./architecture.md)
- [Contributing](../CONTRIB.md)
- [Extending MCP](./api/extending-mcp.md) - How to extend the server with new functionality
- [Documentation Guide](./documentation-guide.md) - How to maintain and improve this documentation

### Tools and Resources
- [GitHub CLI](./tools/github-cli.md) - Using GitHub CLI with this project
- [Example Templates](./examples/) - Example templates and configurations

## Usage Examples

Here are some examples of how to use the Attio MCP Server with Claude:

### Finding Companies
```
Find all technology companies in the CRM
```

### Managing Contacts
```
Add a note to John Smith that we discussed the proposal on May 15th
```

### Working with Lists
```
Add ABC Corp to our "Hot Leads" list with priority high and stage set to "Discovery Call"
```

### Complex Queries
```
Find all healthcare companies in San Francisco that have more than 100 employees and were added to CRM in the last 3 months
```

## Reporting Issues

If you encounter any issues with the documentation or the server itself, please report them on our [GitHub Issues](https://github.com/kesslerio/attio-mcp-server/issues) page.

## Contributing to Documentation

We welcome contributions to improve the documentation. Please see the [Documentation Guide](./documentation-guide.md) for information on how to contribute.

---

[Return to Main README](../README.md)
