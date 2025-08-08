# Docker Deployment Guide for Attio MCP Server

This guide provides detailed instructions for deploying the Attio MCP Server using Docker.

## Prerequisites

- Docker installed on your system (version 20.10.0 or later recommended)
- Docker Compose installed (optional, for multi-container deployments)
- Valid Attio API credentials

## Quick Start

1. **Build the Docker image**:
   ```bash
   ./scripts/docker/docker-build.sh
   ```

2. **Create an environment file**:
   Create a `.env` file in the project root with your Attio API credentials:
   ```
   ATTIO_API_KEY=your_api_key_here
   ```

3. **Run the container**:
   ```bash
   ./scripts/docker/docker-run.sh
   ```

4. **Verify deployment**:
   ```bash
   curl http://localhost:3000/health
   ```

## Environment Configuration

The following environment variables can be configured:

| Variable | Description | Default |
|----------|-------------|---------|
| `ATTIO_API_KEY` | **Required** Attio API key | None |
| `PORT` | Server port | 3000 |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | info |
| `NODE_ENV` | Node environment | production |

## Docker Scripts

The `scripts/docker` directory contains helper scripts for common Docker operations:

### docker-build.sh

Builds the Docker image with configurable options.

**Usage**:
```bash
./scripts/docker/docker-build.sh [options]
```

**Options**:
- `-t, --tag`: Image tag (default: latest)
- `-n, --name`: Image name (default: attio-mcp-server)
- `--timeout`: Docker operation timeout in seconds (default: 600)
- `-h, --help`: Show help message

### docker-run.sh

Runs the Docker container with configurable options.

**Usage**:
```bash
./scripts/docker/docker-run.sh [options]
```

**Options**:
- `-t, --tag`: Image tag (default: latest)
- `-n, --name`: Container name (default: attio-mcp-server)
- `-p, --port`: Port to expose (default: 3000)
- `-e, --env-file`: Environment file (default: .env)
- `-h, --help`: Show help message

### docker-cleanup.sh

Cleans up Docker resources.

**Usage**:
```bash
./scripts/docker/docker-cleanup.sh [options]
```

**Options**:
- `-a, --all`: Remove all images in addition to containers
- `-n, --name`: Container name (default: attio-mcp-server)
- `-i, --image`: Image name (default: attio-mcp-server)
- `-h, --help`: Show help message

## Docker Compose

For more advanced deployments, you can use Docker Compose:

```bash
docker-compose up -d
```

This will use the `docker-compose.yml` file in the project root.

## Health Checks

The Docker container is configured with health checks that:
- Run every 30 seconds
- Check the `/health` endpoint
- Timeout after 10 seconds
- Retry 3 times before marking the container as unhealthy

You can check container health with:
```bash
docker inspect --format='{{.State.Health.Status}}' attio-mcp-server
```

## Security Considerations

### Production Deployment

For production deployments, consider the following security measures:

1. **API Key Management**:
   - Never store API keys directly in Docker images
   - Use environment variables or secrets management solutions
   - Consider using Docker secrets for sensitive data

2. **Network Security**:
   - Run the container on an internal network when possible
   - Use a reverse proxy (like Nginx) with SSL termination
   - Configure appropriate firewall rules

3. **Container Hardening**:
   - Run the container as a non-root user
   - Use read-only file systems when possible
   - Set appropriate resource limits

### Example Secure Docker Run

```bash
docker run -d \
  --name attio-mcp-server \
  -p 3000:3000 \
  --env-file .env \
  --user node \
  --read-only \
  --tmpfs /tmp \
  --memory 512m \
  --cpus 1 \
  --health-cmd "curl -f http://localhost:3000/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  attio-mcp-server:latest
```

## Troubleshooting

### Common Issues

1. **Container fails to start**:
   - Check if the API key is properly set in the environment file
   - Verify port availability with `netstat -tuln | grep 3000`
   - Check logs with `docker logs attio-mcp-server`

2. **Health check failures**:
   - Verify the server is running inside the container
   - Check logs for server startup errors
   - Ensure the port is correctly mapped

3. **Performance issues**:
   - Increase container resources (memory, CPU)
   - Check for resource contention with `docker stats`
   - Consider configuring Node.js memory limits

### Debug Mode

For more detailed logs, set the LOG_LEVEL environment variable to debug:

```bash
docker run -d \
  --name attio-mcp-server \
  -p 3000:3000 \
  -e ATTIO_API_KEY=your_api_key_here \
  -e LOG_LEVEL=debug \
  attio-mcp-server:latest
```

## Advanced Configuration

### Custom Dockerfile

If you need to customize the Docker image, you can create a custom Dockerfile:

```dockerfile
FROM attio-mcp-server:latest

# Add custom configuration
COPY custom-config.json /app/config/

# Install additional packages
RUN npm install some-package
```

Build with:
```bash
docker build -t custom-attio-mcp -f CustomDockerfile .
```

### Multi-Stage Builds

The project uses multi-stage builds to minimize image size:

1. **Build stage**: Compiles TypeScript to JavaScript
2. **Runtime stage**: Contains only production dependencies and compiled code

This approach results in smaller, more secure Docker images.

## Continuous Integration

For CI/CD pipelines, you can use the provided scripts:

```bash
# Build the image
./scripts/docker/docker-build.sh -t ci-build

# Run tests
docker run --rm ci-build npm test

# If tests pass, tag and push the image
docker tag ci-build registry.example.com/attio-mcp:latest
docker push registry.example.com/attio-mcp:latest
```