export interface Env {
  // Attio OAuth credentials
  ATTIO_CLIENT_ID: string;
  ATTIO_CLIENT_SECRET: string;

  // Worker configuration
  WORKER_URL: string; // e.g., https://your-worker.your-subdomain.workers.dev

  // Token encryption key (32-byte hex string)
  TOKEN_ENCRYPTION_KEY: string;

  // KV namespace for token storage
  TOKEN_STORE: KVNamespace;

  // Optional: Legacy session storage
  OAUTH_SESSIONS?: KVNamespace;

  // Optional: Additional allowed redirect URIs (comma-separated)
  // Known MCP clients (Claude.ai, ChatGPT) and localhost are pre-approved
  ALLOWED_REDIRECT_URIS?: string;
}
