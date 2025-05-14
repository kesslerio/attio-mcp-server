# Docker Security Best Practices for Attio MCP Server

This guide provides security best practices for deploying the Attio MCP Server using Docker in production environments.

## Secure API Key Management

The Attio MCP Server requires API credentials to function. Secure management of these credentials is critical:

### Best Practices

1. **Never hardcode API keys** in Dockerfiles or source code
2. **Use environment variables** to pass credentials to containers
3. **Restrict environment file permissions**:
   ```bash
   chmod 600 .env
   ```
4. **Use Docker secrets** for orchestrated deployments:
   ```bash
   # Create a secret
   echo "your-api-key" | docker secret create attio_api_key -
   
   # Use the secret in docker-compose.yml
   services:
     attio-mcp:
       secrets:
         - attio_api_key
       environment:
         - ATTIO_API_KEY_FILE=/run/secrets/attio_api_key
   ```
5. **Consider dedicated secrets management solutions** like HashiCorp Vault or AWS Secrets Manager for production environments

## Container Hardening

Securing the Docker container itself is essential for production deployments:

### Non-Root User

Run the container as a non-root user to minimize potential damage from container breakouts:

```bash
# In Dockerfile
USER node

# Or when running the container
docker run --user node attio-mcp-server
```

### Read-Only Filesystem

Make the container filesystem read-only where possible:

```bash
docker run --read-only --tmpfs /tmp attio-mcp-server
```

### Resource Limits

Set appropriate CPU and memory limits to prevent resource exhaustion:

```bash
docker run --memory=512m --memory-swap=512m --cpus=1 attio-mcp-server
```

### Disable Privileged Mode

Never run the container in privileged mode:

```bash
# Do NOT do this
docker run --privileged attio-mcp-server
```

### Drop Capabilities

Drop all capabilities and only add back those specifically required:

```bash
docker run --cap-drop=ALL attio-mcp-server
```

## Network Security

Protect the network interfaces of your containerized application:

### Private Networks

Use Docker's network features to isolate containers:

```bash
# Create a private network
docker network create --internal attio-network

# Run container on private network
docker run --network attio-network attio-mcp-server
```

### Reverse Proxy

Use a reverse proxy with TLS termination for production deployments:

```yaml
# Example docker-compose.yml with Nginx proxy
services:
  attio-mcp:
    image: attio-mcp-server
    networks:
      - internal
    
  nginx:
    image: nginx
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./certs:/etc/nginx/certs
    networks:
      - internal
      - external

networks:
  internal:
    internal: true
  external:
```

### Restrict Exposed Ports

Only expose the ports that are absolutely necessary:

```bash
# Only expose the required port
docker run -p 127.0.0.1:3000:3000 attio-mcp-server
```

## Image Security

Ensure the security of the Docker images used:

### Image Scanning

Regularly scan Docker images for vulnerabilities:

```bash
# Using Docker Scout
docker scout quickview attio-mcp-server

# Or a third-party tool like Trivy
trivy image attio-mcp-server
```

### Minimal Base Images

Use minimal base images to reduce attack surface:

```dockerfile
# Use slim variant
FROM node:18-slim
```

### Multi-Stage Builds

Use multi-stage builds to minimize final image size:

```dockerfile
# Build stage
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
USER node
CMD ["node", "dist/index.js"]
```

## Runtime Monitoring

Implement monitoring to detect security issues:

### Health Checks

Configure health checks to detect application issues:

```bash
docker run --health-cmd "curl -f http://localhost:3000/health || exit 1" \
           --health-interval=30s \
           --health-timeout=10s \
           --health-retries=3 \
           attio-mcp-server
```

### Logging

Configure proper logging for security monitoring:

```bash
docker run --log-driver=json-file \
           --log-opt max-size=10m \
           --log-opt max-file=3 \
           attio-mcp-server
```

## Secure Deployments

For production deployments, consider these additional security measures:

### Container Orchestration

Use orchestration platforms like Kubernetes or Docker Swarm with security features enabled:

- Network policies
- Pod security contexts
- Secret management
- Role-based access control

### Regular Updates

Keep images and containers updated:

```bash
# Pull latest base images
docker pull node:18-slim

# Rebuild application images
./scripts/docker/docker-build.sh

# Update running containers
docker-compose up -d --force-recreate
```

### Vulnerability Management

Establish a process for handling security vulnerabilities:

1. Regular scanning of images
2. Security patch process
3. Container recreation strategy
4. Incident response plan

## Security Checklist

Use this checklist before deploying to production:

- [ ] API keys stored securely (no hardcoding)
- [ ] Environment files have restricted permissions
- [ ] Container runs as non-root user
- [ ] Resource limits configured appropriately
- [ ] Read-only filesystem used where possible
- [ ] Unnecessary capabilities dropped
- [ ] Network exposure limited to necessary ports
- [ ] Images scanned for vulnerabilities
- [ ] Logging configured for security monitoring
- [ ] Health checks implemented
- [ ] Update and patch process established

## Example Secure Deployment

Here's a complete example of a secure Docker deployment:

```bash
# Build with security best practices
docker build -t attio-mcp-server:secure .

# Run with security features enabled
docker run -d \
  --name attio-mcp-secure \
  -p 127.0.0.1:3000:3000 \
  --env-file .env \
  --user node \
  --read-only \
  --tmpfs /tmp \
  --memory 512m \
  --cpus 1 \
  --cap-drop=ALL \
  --security-opt no-new-privileges \
  --health-cmd "curl -f http://localhost:3000/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --log-driver=json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  attio-mcp-server:secure
```