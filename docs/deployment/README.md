# Deployment Guide

This directory contains comprehensive deployment documentation for the Attio MCP Server.

## Available Guides

- **[Docker Guide](docker-guide.md)** - Containerized deployment options
- **[Security Guide](security.md)** - Security configuration and best practices  
- **[Changes](CHANGES.md)** - Deployment-related changes and updates

## Quick Start

For most users, the Docker deployment provides the easiest setup.

## Prerequisites

- Docker Engine installed (version 20.10.0 or later recommended)
- Docker Compose installed (version 2.0.0 or later recommended)
- Attio API key

## Quick Start

The fastest way to get started is using Docker Compose:

1. Create a `.env` file with your Attio API key:

```bash
echo "ATTIO_API_KEY=your_api_key_here" > .env
```

2. Start the container:

```bash
docker-compose up -d
```

3. Check that it's running:

```bash
docker ps
```

## Build Options

### Using the Build Script

The repository includes a convenient build script:

```bash
# Make the script executable
chmod +x ./scripts/docker-build.sh

# Build with default options
./scripts/docker-build.sh

# Build with custom options
./scripts/docker-build.sh --name my-attio-mcp --tag v1.0.0
```

### Build Arguments

The build script supports the following options:

| Option | Description | Default |
|--------|-------------|---------|
| `--name` | Image name | `attio-mcp-server` |
| `--tag` | Image tag | `latest` |
| `--dockerfile` | Custom Dockerfile path | `Dockerfile` |
| `--context` | Build context path | `.` (current directory) |
| `--help` | Display help message | - |

### Manual Build

You can also build the image manually:

```bash
docker build -t attio-mcp-server:latest .
```

## Running the Container

### Using the Run Script

The repository includes a convenient run script:

```bash
# Make the script executable
chmod +x ./scripts/docker-run.sh

# Run with default options
./scripts/docker-run.sh

# Run with custom options
./scripts/docker-run.sh --name my-server --port 8080 --detach
```

### Run Arguments

The run script supports the following options:

| Option | Description | Default |
|--------|-------------|---------|
| `--name` | Container name | `attio-mcp-server` |
| `--image` | Image name | `attio-mcp-server` |
| `--tag` | Image tag | `latest` |
| `--port` | Host port to expose | `3000` |
| `--env-file` | Environment file path | `.env` |
| `--detach` | Run in detached mode | (not detached by default) |
| `--help` | Display help message | - |

### Using Docker Compose

The repository includes a `docker-compose.yml` file for easy deployment:

```bash
# Start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### Manual Run

You can also run the container manually:

```bash
docker run -d \
  --name attio-mcp-server \
  -p 3000:3000 \
  -e ATTIO_API_KEY=your_api_key_here \
  --restart unless-stopped \
  attio-mcp-server:latest
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ATTIO_API_KEY` | Your Attio API key | Yes |
| `ATTIO_WORKSPACE_ID` | Your Attio workspace ID | No |
| `NODE_ENV` | Node environment (development/production) | No |

## Server Status

You can check if the container is running with:

```bash
docker ps
```

The simplified MCP server uses stdio transport and doesn't require HTTP health checks.

## Integrating with Claude

To use the Attio MCP Server with Claude, add the following to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "attio": {
      "command": "node",
      "args": ["/path/to/attio-mcp-server/dist/index.js"],
      "env": {
        "ATTIO_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

For Docker deployment, the container should run the MCP server process directly rather than exposing HTTP endpoints.

## Docker Compose Reference

The included `docker-compose.yml` file sets up:

- Image building from the local Dockerfile
- Environment variables from .env file
- Automatic restart unless stopped

## Troubleshooting

### Container Fails to Start

Check the logs:

```bash
docker logs attio-mcp-server
```

Common issues:
- Invalid API key: Check your ATTIO_API_KEY environment variable
- Missing environment variables: Ensure all required variables are set in .env

### MCP Server Issues

If the MCP server isn't working:

1. Check the logs: `docker logs attio-mcp-server`
2. Verify the server process is running:
   ```
   docker exec -it attio-mcp-server sh -c "ps aux | grep node"
   ```
3. Test the server can start manually:
   ```
   docker exec -it attio-mcp-server node dist/index.js
   ```

## Advanced Configuration

### Custom Dockerfile

You can create a custom Dockerfile to extend the base image:

```dockerfile
FROM attio-mcp-server:latest

# Add custom configuration
COPY custom-config.json /app/config.json

# Override environment variables
ENV NODE_ENV=production

# Custom startup command
CMD ["node", "dist/index.js", "--config", "config.json"]
```

### Persistent Storage

If you need to persist data, you can mount volumes:

```yaml
services:
  attio-mcp-server:
    # ... other configuration ...
    volumes:
      - ./data:/app/data
```

### Network Configuration

To place the container in a custom network:

```yaml
services:
  attio-mcp-server:
    # ... other configuration ...
    networks:
      - my-network

networks:
  my-network:
    external: true
```