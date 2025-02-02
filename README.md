# attio-mcp-server

This is an MCP server for [Attio](https://attio.com/), the AI-native CRM. It allows mcp clients (like Claude) to connect to the Attio API.

#### Current Capabilities

- [x] reading company records
- [x] reading company notes
- [x] writing company notes
- [ ] other activities

## Usage

You will need:

- `ATTIO_API_KEY` 

This is expected to be a *bearer token* which means you can get one through the [API Explorer](https://developers.attio.com/reference/get_v2-objects) on the right hand side or configure OAuth and retrieve one throught the Attio API.


### Claude Desktop Configuration

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
## Development

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (recommended v22 or higher)
- npm
- git
- dotenv

### Setting up Development Environment

To set up the development environment, follow these steps:

1. Fork the repository

   - Click the "Fork" button in the top-right corner of this repository
   - This creates your own copy of the repository under your Github acocunt

1. Clone Your Fork:

   ```sh
   git clone https://github.com/YOUR_USERNAME/attio-mcp-server.git
   cd attio-mcp-server
   ```

1. Add Upstream Remote
   ```sh
   git remote add upstream https://github.com/hmk/attio-mcp-server.git
   ```

1. Copy the dotenv file
    ```sh
    cp .env.template .env
    ```

1. Install dependencies:

   ```sh
   npm install
   ```

1. Run watch to keep index.js updated:

   ```sh
   npm run build:watch
   ```

1. Start the model context protocol development server:

   ```sh
   dotenv npx @modelcontextprotocol/inspector node PATH_TO_YOUR_CLONED_REPO/dist/index.js
   ```

1. If the development server did not load the environment variable correctly, set the `ATTIO_API_KEY` on the left-hand side of the mcp inspector.