# Remote Deployment Guide

This guide covers deploying the Attio MCP Server for remote access from Claude.ai, ChatGPT, mobile apps, and other MCP clients.

## Deployment Options

| Option                                    | Best For                 | Complexity | Cost                |
| ----------------------------------------- | ------------------------ | ---------- | ------------------- |
| [Smithery](#smithery)                     | Quick setup, individuals | Very Low   | Free tier           |
| [Cloudflare Workers](#cloudflare-workers) | Self-hosted, teams       | Medium     | Free tier           |
| [Docker](#docker-production)              | On-premise, enterprise   | Medium     | Your infrastructure |

---

## Smithery

The easiest way to deploy remotely. Smithery handles OAuth, hosting, and client configuration.

```bash
# Claude Desktop
npx -y @smithery/cli install @kesslerio/attio-mcp-server --client claude

# ChatGPT
npx -y @smithery/cli install @kesslerio/attio-mcp-server --client chatgpt
```

See the [README installation section](../../README.md#tier-1-smithery-one-click---recommended) for details.

---

## Cloudflare Workers

Self-hosted remote MCP with OAuth 2.1 support. Deploy once, use from anywhere.

### Prerequisites

- Cloudflare account (free tier works)
- Attio OAuth application ([create one here](https://build.attio.com))
- Node.js 18+

### Quick Deploy

```bash
cd examples/cloudflare-mcp-server
npm install

# Create KV namespace for token storage
wrangler kv:namespace create "TOKEN_STORE"
# Copy the ID to wrangler.toml

# Set secrets
wrangler secret put ATTIO_CLIENT_ID
wrangler secret put ATTIO_CLIENT_SECRET
wrangler secret put TOKEN_ENCRYPTION_KEY  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Deploy
wrangler deploy
```

### Client Configuration

After deployment, configure your clients:

- **Claude.ai**: Settings → Connectors → Add your Worker URL
- **ChatGPT**: Settings → Connectors → Developer Mode → Add Worker URL
- **Mobile apps**: Same Worker URL works on iOS/Android

See [examples/cloudflare-mcp-server/README.md](../../examples/cloudflare-mcp-server/README.md) for complete setup.

---

## Docker Production

For on-premise or self-managed infrastructure deployments.

### Build the Image

```bash
docker build -t attio-mcp:latest .
```

### Run with Security Hardening

```bash
docker run -d \
  --name attio-mcp \
  --user 1001:1001 \
  --read-only \
  --tmpfs /tmp \
  --security-opt no-new-privileges:true \
  --memory 512m \
  --cpus 1 \
  -p 3000:3000 \
  -e ATTIO_API_KEY=your_api_key \
  -e NODE_ENV=production \
  attio-mcp:latest
```

### Using Docker Compose

```bash
# Set your API key
export ATTIO_API_KEY=your_api_key

# Start the server
docker-compose up -d

# Check health
docker-compose ps
curl http://localhost:3000/health
```

### Docker Secrets (Recommended)

For production, use Docker secrets instead of environment variables:

```bash
# Create secret
echo "your_api_key" | docker secret create attio_api_key -

# Use in docker-compose.yml
services:
  attio-mcp-server:
    secrets:
      - attio_api_key
    environment:
      - ATTIO_API_KEY_FILE=/run/secrets/attio_api_key

secrets:
  attio_api_key:
    external: true
```

---

## Pre-Deployment Checklist

Before going to production:

### Security

- [ ] TLS certificate configured (required for remote access)
- [ ] Credentials stored in secrets manager (not env files or git)
- [ ] Rate limits configured for expected load
- [ ] Non-root user running the container
- [ ] Read-only filesystem enabled

### Monitoring

- [ ] Health endpoint monitored (`GET /health`)
- [ ] Log aggregation configured
- [ ] Alerting set up for failures
- [ ] Resource usage tracked

### Operations

- [ ] Backup/recovery plan documented
- [ ] Credential rotation procedure defined
- [ ] Incident response plan ready
- [ ] Rollback strategy tested

---

## Health Endpoints

| Endpoint      | Purpose           | Expected Response         |
| ------------- | ----------------- | ------------------------- |
| `GET /health` | Full health check | `200 OK` with status JSON |
| `GET /ping`   | Liveness probe    | `200 OK` with `pong`      |

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /ping
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
```

---

## Monitoring & Observability

### Structured Logging

Enable JSON logs for log aggregation:

```bash
export LOG_FORMAT=json
export LOG_LEVEL=info
```

### Recommended Stack

- **Log aggregation**: Datadog, Grafana Loki, AWS CloudWatch
- **Metrics**: Prometheus + Grafana
- **Alerting**: PagerDuty, Opsgenie, or cloud-native options
- **Uptime monitoring**: Pingdom, UptimeRobot, or cloud-native

---

## Security Hardening

### Container Security

The Dockerfile and docker-compose.yml implement:

| Control                 | Implementation           |
| ----------------------- | ------------------------ |
| Non-root user           | `USER mcp` (UID 1001)    |
| Read-only filesystem    | `read_only: true`        |
| No privilege escalation | `no-new-privileges:true` |
| Resource limits         | CPU and memory caps      |
| Minimal base image      | `node:20-slim`           |

### Network Security

- Always use TLS in production
- Consider a reverse proxy (nginx, Traefik, Caddy) for TLS termination
- Use network policies to restrict egress to Attio API only

### Secrets Management

| Environment | Recommendation                                           |
| ----------- | -------------------------------------------------------- |
| Development | `.env` file (gitignored)                                 |
| Docker      | Docker secrets                                           |
| Kubernetes  | Kubernetes secrets or external secrets operator          |
| Cloud       | AWS Secrets Manager, GCP Secret Manager, Azure Key Vault |

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs attio-mcp

# Common issues:
# - Missing ATTIO_API_KEY
# - Port 3000 already in use
# - Insufficient permissions for non-root user
```

### Health Check Failing

```bash
# Test manually
curl -v http://localhost:3000/health

# Check if API key is valid
curl -H "Authorization: Bearer $ATTIO_API_KEY" https://api.attio.com/v2/self
```

### OAuth Errors (Cloudflare)

- Verify redirect URI matches exactly in Attio OAuth settings
- Check that secrets are set correctly: `wrangler secret list`
- Look at worker logs: `wrangler tail`

---

## Additional Resources

- [SECURITY.md](../../SECURITY.md) - Security model and best practices
- [Cloudflare Worker Example](../../examples/cloudflare-mcp-server/README.md)
- [OAuth Authentication Guide](./oauth-authentication.md)
- [Attio API Documentation](https://developers.attio.com/)
