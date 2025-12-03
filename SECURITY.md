# Security

This document describes the security model, best practices, and vulnerability reporting process for the Attio MCP Server.

## Reporting Vulnerabilities

We take security seriously. If you discover a security vulnerability, please report it through **GitHub Security Advisories**:

1. Go to [Security Advisories](https://github.com/kesslerio/attio-mcp-server/security/advisories/new)
2. Click "Report a vulnerability"
3. Provide a detailed description of the issue

**Response Timeline:**

- **48 hours**: Initial acknowledgment
- **7 days**: Preliminary assessment
- **90 days**: Target fix timeline for confirmed vulnerabilities

Please do not disclose vulnerabilities publicly until we've had a chance to address them.

## Authentication & Authorization

The MCP server supports two authentication methods:

### API Key Authentication

```bash
export ATTIO_API_KEY=your_api_key_here
```

Get your API key from [Attio Settings → API](https://app.attio.com/settings/api).

### OAuth 2.1 Access Token

```bash
export ATTIO_ACCESS_TOKEN=your_oauth_token_here
```

Used for delegated authentication via Smithery or Cloudflare Worker deployments.

**Resolution Order:**

1. `ATTIO_API_KEY` (from MCP config)
2. `ATTIO_ACCESS_TOKEN` (from MCP config)
3. `ATTIO_API_KEY` (from environment)
4. `ATTIO_ACCESS_TOKEN` (from environment)

## Token Scope Requirements

When creating an Attio API key or OAuth application, ensure it has the appropriate scopes:

| Attio API Scope  | Required For                                                     |
| ---------------- | ---------------------------------------------------------------- |
| `record:read`    | search-records, get-record-details, list-notes, get-list-entries |
| `record:write`   | create-record, update-record, create-note, create-task           |
| `record:delete`  | delete-record                                                    |
| `object:read`    | get-attributes, discover-attributes, get-lists                   |
| `list:read`      | get-list-details, filter-list-entries                            |
| `list:write`     | add-record-to-list, update-list-entry, remove-record-from-list   |
| `workspace:read` | list-workspace-members, get-workspace-member                     |

**Principle of Least Privilege:** Only grant the scopes your use case requires.

## Secrets Storage

### Local Development

- Store credentials in `.env` file (automatically gitignored)
- Set file permissions: `chmod 600 .env`
- Never commit credentials to version control

### Docker Deployment

- Use Docker secrets or environment variables
- Avoid baking credentials into images
- Use `--env-file` for local testing only

### Cloudflare Workers

- Secrets stored in Workers KV with AES-256-GCM encryption
- Use `wrangler secret put` for sensitive values
- Never expose secrets in `wrangler.toml`

### Production Recommendations

- Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, 1Password, etc.)
- Rotate credentials regularly
- Implement secret versioning for rollback capability
- Monitor for credential exposure (GitHub secret scanning, etc.)

## Rate Limiting

The server implements configurable rate limiting to prevent abuse:

| Setting              | Default | Environment Variable          |
| -------------------- | ------- | ----------------------------- |
| Requests per minute  | 60      | `ATTIO_RATE_LIMIT_RPM`        |
| Concurrent requests  | 5       | `ATTIO_RATE_LIMIT_CONCURRENT` |
| Batch size (records) | 100     | `ATTIO_BATCH_SIZE_LIMIT`      |
| Batch size (tasks)   | 50      | `ATTIO_TASK_BATCH_SIZE_LIMIT` |
| Max payload size     | 1 MB    | `ATTIO_MAX_PAYLOAD_SIZE`      |

See [`src/config/security-limits.ts`](src/config/security-limits.ts) for full configuration options.

## Data Protection

### PII Redaction

All logs automatically redact sensitive information:

- Email addresses
- Phone numbers
- API keys and tokens
- Credit card numbers
- UUIDs and identifiers (masked)

### Request/Response Sanitization

- Credentials are never logged
- Error messages are sanitized before returning to clients
- Binary data is redacted from logs

### Implementation

See [`src/utils/log-sanitizer.ts`](src/utils/log-sanitizer.ts) for the redaction implementation.

## Network Security

### TLS Requirements

- **Production deployments MUST use TLS**
- The Cloudflare Worker example enforces HTTPS
- Local development may use HTTP for testing only

### CORS Configuration

- Cloudflare Worker includes CORS headers for Claude.ai and ChatGPT
- Configure allowed origins for your deployment

### Query Parameter Safety

- Sensitive data should never be passed in query parameters
- Use request bodies for credentials and PII

## Container Security

When running in Docker:

```yaml
# docker-compose.yml security settings
services:
  attio-mcp:
    user: '1001:1001' # Non-root user
    read_only: true # Read-only filesystem
    security_opt:
      - no-new-privileges:true # Prevent privilege escalation
    tmpfs:
      - /tmp # Writable temp directory
```

See the [Dockerfile](Dockerfile) for the hardened container image.

## Known Limitations

### No Field-Level Access Control

All authenticated users can access all fields. Attio's API does not currently support field-level permissions through API keys.

### No Request Signing

The server relies on TLS for transport security. There is no request signing or HMAC verification.

### No Built-in Audit Logging

For audit trails, use external observability tools:

- Structured JSON logs (`LOG_FORMAT=json`)
- Forward to your SIEM or log aggregator
- Monitor the `/health` endpoint

### Rate Limiting is Client-Side

Rate limits are enforced by this server, not by Attio. A malicious actor with valid credentials could bypass these limits by calling Attio directly.

## Security Checklist

Before deploying to production:

- [ ] Credentials stored in secrets manager (not env files)
- [ ] TLS enabled and enforced
- [ ] Rate limits tuned for expected load
- [ ] Health monitoring configured
- [ ] Log aggregation set up
- [ ] Incident response plan documented
- [ ] Regular credential rotation scheduled

## Additional Resources

- [Attio API Documentation](https://developers.attio.com/)
- [OAuth Authentication Guide](docs/guides/oauth-authentication.md)
- [Remote Deployment Guide](docs/guides/remote-deployment.md)
- [Cloudflare Worker Example](examples/cloudflare-mcp-server/README.md)
