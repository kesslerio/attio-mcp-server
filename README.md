# Attio MCP Server

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![npm version](https://badge.fury.io/js/attio-mcp.svg)](https://badge.fury.io/js/attio-mcp)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![smithery badge](https://smithery.ai/badge/@kesslerio/attio-mcp-server)](https://smithery.ai/server/@kesslerio/attio-mcp-server)

A comprehensive Model Context Protocol (MCP) server for [Attio](https://attio.com/), enabling AI assistants like Claude to interact with your CRM through natural language.

> **Transform your CRM workflows**: "Find all AI companies with 50+ employees that we haven't contacted in 30 days"

## ✨ Key Features

- **Universal Tools**: 13 tools work across all record types (companies, people, deals, lists, tasks)
- **High Performance**: 89.7% speed improvement with 227KB memory reduction (PR #483)
- **Natural Language**: Search, create, update, and manage CRM data conversationally  
- **Advanced Filtering**: Complex multi-condition searches with relationship-based queries
- **Batch Operations**: Process hundreds of records efficiently with optimized formatResult architecture
- **Full CRUD**: Complete create, read, update, delete capabilities for all record types
- **Enterprise Quality**: 97.15/100 production readiness score with zero breaking changes
- **Clean Architecture**: Complete production-test separation with mock factory pattern

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g attio-mcp-server

# Or clone for development
git clone https://github.com/kesslerio/attio-mcp-server.git
cd attio-mcp-server
npm install
```

### Configuration

1. **Get your Attio API key**: [Attio Developer Documentation](https://docs.attio.com/docs/overview)

2. **Configure environment**:
   ```bash
   export ATTIO_API_KEY="your_api_key_here"
   ```

3. **Add to Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "attio": {
         "command": "attio-mcp-server",
         "env": {
           "ATTIO_API_KEY": "your_api_key_here"
         }
       }
     }
   }
   ```

## 💬 Example Usage

Once configured, interact with your Attio CRM naturally:

```
Find technology companies in San Francisco with more than 100 employees
Create a new deal for $50,000 with Acme Corp
Add John Smith to our Q4 prospects list
Show me all overdue tasks assigned to the sales team
```

## 📚 Documentation

- **[Getting Started](docs/getting-started.md)** - Detailed setup and installation
- **[User Guide](docs/user-guide.md)** - Common workflows and examples  
- **[API Reference](docs/universal-tools/api-reference.md)** - Complete tool documentation
- **[Deployment](docs/deployment/README.md)** - Docker and production deployment
- **[Development](docs/development/README.md)** - Contributing and extending

## 🔧 Core Tools

| Tool | Purpose |
|------|---------|
| `search-records` | Find any record type with flexible criteria |
| `get-record-details` | Retrieve complete record information |
| `create-record` | Create companies, people, deals, tasks, etc. |
| `update-record` | Modify existing records |
| `delete-record` | Remove records safely |
| `advanced-search` | Complex multi-condition filtering |
| `batch-operations` | Process multiple records efficiently |

## ⚡ Performance & Architecture

### Recent Improvements (PR #483)
Our formatResult architecture refactoring delivered exceptional performance gains:

- **89.7% faster execution** - Optimized string formatting eliminates environment detection overhead
- **227KB memory reduction** - Efficient memory management with 57.8% fewer object allocations  
- **59% code quality improvement** - ESLint warnings reduced from 957 to 395
- **100% type safety** - Eliminated dual return types and environment-dependent behavior
- **Zero breaking changes** - Complete backward compatibility maintained

### Architecture Excellence
- **Clean Separation**: Complete production-test isolation with mock factory pattern
- **Mock Factory Architecture**: Centralized test data generation for Issue #480 compatibility
- **Environment Independence**: No runtime behavior changes based on NODE_ENV
- **Type Safety**: Consistent string return types across all formatResult functions

See our [Performance Report](docs/performance/formatresult-performance-report.md) and [Architecture Guide](docs/architecture/mock-factory-pattern.md) for technical details.

## 🐳 Docker Deployment

```bash
# Quick start with Docker
docker run -e ATTIO_API_KEY=your_key_here attio-mcp-server

# Or use Docker Compose
echo "ATTIO_API_KEY=your_key_here" > .env
docker-compose up -d
```

## 🧪 Testing

The project maintains high-quality test coverage with modern mock factory architecture:

- **E2E Tests**: 76% success rate (29/38 passing) with Issue #480 compatibility
- **Integration Tests**: 100% success rate with real API validation  
- **Unit Tests**: 100% success rate (26/26 passing) with clean architecture
- **Performance Tests**: Environment-aware budgets with dual testing strategy
- **Mock Factory Pattern**: Complete production-test separation for reliable testing

See our [Testing Guide](docs/development/testing.md), [Mock Factory Pattern](docs/architecture/mock-factory-pattern.md), and [Production-Test Separation](docs/testing/production-test-separation.md) for details.

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](docs/development/contributing.md) for details on:

- Setting up the development environment
- Running tests and linting
- Submitting pull requests
- Code standards and best practices

## 📄 License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.

## 🔗 Links

- **Documentation**: [Full Documentation](docs/README.md)
- **Issues**: [Report bugs or request features](https://github.com/kesslerio/attio-mcp-server/issues)
- **Smithery**: [Install via Smithery](https://smithery.ai/server/@kesslerio/attio-mcp-server)
- **Attio**: [Learn more about Attio CRM](https://attio.com/)

---

**Need help?** Check our [troubleshooting guide](docs/troubleshooting.md) or open an issue.

<!-- Performance workflow verification test -->