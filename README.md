# attio-mcp-server

This is an MCP server for [Attio](https://attio.com/), the AI-native CRM. It allows mcp clients (like Claude) to connect to the Attio API.

#### Current Capabilities

- [x] Company API
  - [x] searching companies
  - [x] reading company details
  - [x] reading company notes
  - [x] creating company notes
- [x] People API
  - [x] searching people
  - [x] reading person details
  - [x] reading person notes
  - [x] creating person notes
- [x] Lists API
  - [x] getting all lists
  - [x] getting list details
  - [x] getting list entries
  - [x] adding records to lists
  - [x] removing records from lists
- [ ] Tasks API
- [ ] Records API

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

- Node.js (recommended v18 or higher)
- npm
- git
- dotenv
- Docker and Docker Compose (optional, for containerized development)

### Setting up Development Environment

To set up the development environment, follow these steps:

1. Fork the repository

   - Click the "Fork" button in the top-right corner of this repository
   - This creates your own copy of the repository under your Github account

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

## Docker Support

You can also run the Attio MCP Server in a Docker container, which simplifies deployment and ensures consistency across different environments.

### Building the Docker Image

```sh
# Build using the provided script
./scripts/docker-build.sh

# Or build with custom name and tag
./scripts/docker-build.sh --name my-attio-mcp --tag v1.0.0
```

### Running with Docker Compose

1. Set up your environment variables in a `.env` file:

   ```sh
   ATTIO_API_KEY=your_api_key_here
   ATTIO_WORKSPACE_ID=your_workspace_id_here
   ```

2. Start the container using Docker Compose:

   ```sh
   docker-compose up -d
   ```

3. Check logs:

   ```sh
   docker-compose logs -f
   ```

4. Stop the container:

   ```sh
   docker-compose down
   ```

### Running with Docker Directly

```sh
docker run -p 3000:3000 \
  -e ATTIO_API_KEY=your_api_key_here \
  -e ATTIO_WORKSPACE_ID=your_workspace_id_here \
  attio-mcp-server:latest
```

### Docker Configuration for Claude

To use the dockerized Attio MCP Server with Claude:

```json
{
  "mcpServers": {
    "attio": {
      "url": "http://localhost:3000"
    }
  }
}
```

### Docker Health Check

The Docker container includes a health check that monitors the server's status. You can view the health status with:

```sh
docker ps -a
```