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

Complete ALL sections before going to production.

### Security (Required)

- [ ] TLS certificate configured (required for remote access)
- [ ] Credentials stored in secrets manager (not env files or git)
- [ ] Rate limits configured for expected load
- [ ] Non-root user running the container
- [ ] Read-only filesystem enabled
- [ ] Token encryption key generated (32-byte hex)
- [ ] OAuth redirect URIs verified exact match
- [ ] CORS origins explicitly configured (no wildcards in production)
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)

### Monitoring (Required)

- [ ] Health endpoint monitored (`GET /health`)
- [ ] Log aggregation configured
- [ ] Alerting set up for failures
- [ ] Resource usage tracked
- [ ] Error rate alerting configured (threshold: <1% 5xx errors)
- [ ] Latency monitoring (p50, p95, p99 percentiles)
- [ ] OAuth token refresh monitoring
- [ ] KV storage capacity monitoring (Cloudflare Workers)

### Operations (Required)

- [ ] Backup/recovery plan documented
- [ ] Credential rotation procedure defined
- [ ] Incident response plan ready
- [ ] Rollback strategy tested
- [ ] Runbook for common failures documented
- [ ] On-call escalation path defined
- [ ] Change management process documented

### Cloudflare Worker Checklist

If deploying to Cloudflare Workers:

- [ ] KV namespace created and ID verified in `wrangler.toml`
- [ ] All secrets set via `wrangler secret put`:
  - [ ] `ATTIO_CLIENT_ID`
  - [ ] `ATTIO_CLIENT_SECRET`
  - [ ] `TOKEN_ENCRYPTION_KEY` (32-byte hex)
  - [ ] `WORKER_URL` (your deployed worker URL)
- [ ] Production environment configured in `wrangler.toml`
- [ ] Attio OAuth app redirect URI updated to match worker URL
- [ ] Health endpoint returns all `true` values

**Validation Commands:**

```bash
# Verify secrets are set
wrangler secret list

# Check KV namespace
wrangler kv:namespace list

# Test health endpoint
curl https://your-worker.workers.dev/health | jq .

# Expected output - all true:
{
  "status": "healthy",
  "has_client_id": true,
  "has_client_secret": true,
  "has_encryption_key": true,
  "has_worker_url": true,
  "kv_connected": true
}
```

### Smithery Checklist

If deploying via Smithery:

- [ ] `smithery.yaml` validated with `npx @smithery/cli build --dry-run`
- [ ] `configSchema` exported correctly from `src/smithery.ts`
- [ ] Discovery scan passes without errors
- [ ] Tool count matches expected (40+ tools)
- [ ] All required environment variables documented

**Validation Commands:**

```bash
# Validate Smithery configuration
npx @smithery/cli build --dry-run

# Check exports
node -e "import('./dist/smithery.js').then(m => console.log(Object.keys(m)))"

# Expected: ['configSchema', 'default'] or ['configSchema', 'createServer']
```

### Rollback Procedure

Document and test your rollback strategy:

1. **Cloudflare Workers:**

   ```bash
   # List previous deployments
   wrangler deployments list

   # Rollback to previous version
   wrangler rollback
   ```

2. **Docker:**

   ```bash
   # Stop current container
   docker stop attio-mcp

   # Start previous version
   docker run -d --name attio-mcp attio-mcp:previous-tag
   ```

3. **Smithery:**
   - Use Smithery dashboard to revert to previous deployment
   - Or redeploy previous npm version

### Health Check Monitoring Setup

Example monitoring configurations:

**Datadog:**

```yaml
# datadog-monitors.yaml
- type: http
  name: Attio MCP Health
  url: https://your-endpoint/health
  check_interval: 60
  alert_threshold: 3
  escalation: 'pagerduty-oncall'
```

**UptimeRobot:**

- Monitor Type: HTTP(s)
- URL: `https://your-endpoint/health`
- Monitoring Interval: 1 minute
- Alert Contacts: Your team

**Prometheus + Alertmanager:**

```yaml
# alerting-rules.yaml
groups:
  - name: attio-mcp
    rules:
      - alert: AttioMCPDown
        expr: up{job="attio-mcp"} == 0
        for: 5m
        labels:
          severity: critical
```

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
