# Attio MCP Server - Production Dockerfile
# Multi-stage build with security hardening

# =============================================================================
# Build Stage
# =============================================================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Prune devDependencies for production
RUN npm prune --production

# =============================================================================
# Production Stage
# =============================================================================
FROM node:20-slim AS production

# OCI Image Labels (https://github.com/opencontainers/image-spec/blob/main/annotations.md)
LABEL org.opencontainers.image.title="attio-mcp-server"
LABEL org.opencontainers.image.description="MCP server for Attio CRM - enables AI assistants to interact with your Attio workspace"
LABEL org.opencontainers.image.url="https://github.com/kesslerio/attio-mcp-server"
LABEL org.opencontainers.image.source="https://github.com/kesslerio/attio-mcp-server"
LABEL org.opencontainers.image.documentation="https://github.com/kesslerio/attio-mcp-server/blob/main/README.md"
LABEL org.opencontainers.image.vendor="kesslerio"
LABEL org.opencontainers.image.licenses="MIT"

# MCP-specific labels for tooling discovery
LABEL mcp.server.name="attio-mcp"
LABEL mcp.server.scope="remote"
LABEL mcp.server.transport="http"

# Create non-root user for security
# Using fixed UID/GID for consistency across environments
RUN groupadd -r -g 1001 mcp && \
    useradd -r -u 1001 -g mcp -s /sbin/nologin mcp

WORKDIR /app

# Copy only production artifacts from builder
COPY --from=builder --chown=mcp:mcp /app/dist ./dist
COPY --from=builder --chown=mcp:mcp /app/node_modules ./node_modules
COPY --from=builder --chown=mcp:mcp /app/package.json ./

# Switch to non-root user
USER mcp

# Health check using Node.js (no curl dependency)
# Checks the /health endpoint every 30 seconds
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
        const req = http.get('http://localhost:3000/health', (res) => { \
            process.exit(res.statusCode === 200 ? 0 : 1); \
        }); \
        req.on('error', () => process.exit(1)); \
        req.setTimeout(5000, () => { req.destroy(); process.exit(1); });"

# Expose the HTTP server port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start the MCP server
CMD ["node", "dist/cli.js"]
