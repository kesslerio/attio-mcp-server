/**
 * Token storage with encryption for Cloudflare Workers KV
 *
 * Uses Web Crypto API for AES-256-GCM encryption of OAuth tokens
 */

/**
 * Token data structure stored in KV
 */
export interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp
  scope?: string;
  tokenType: string;
}

/**
 * Token retrieval result with explicit error reasons
 */
export type TokenResult =
  | { ok: true; token: StoredToken }
  | {
      ok: false;
      reason: 'not_found' | 'expired' | 'decrypt_failed' | 'corrupted';
    };

/**
 * Encrypted token envelope
 */
interface EncryptedEnvelope {
  iv: string; // Base64-encoded initialization vector
  ciphertext: string; // Base64-encoded encrypted data
  version: number; // Encryption version for future upgrades
}

/**
 * Token storage configuration
 */
interface TokenStorageConfig {
  kv: KVNamespace;
  encryptionKey: string; // 32-byte hex string for AES-256
}

/**
 * Derive an AES-256 key from a hex string
 */
async function deriveKey(hexKey: string): Promise<CryptoKey> {
  // Convert hex string to Uint8Array
  const keyBytes = new Uint8Array(
    hexKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  if (keyBytes.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex characters)');
  }

  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt token data
 */
async function encryptToken(
  token: StoredToken,
  encryptionKey: string
): Promise<EncryptedEnvelope> {
  const key = await deriveKey(encryptionKey);

  // Generate random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encode token as JSON
  const plaintext = new TextEncoder().encode(JSON.stringify(token));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  // Base64 encode for storage
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    version: 1,
  };
}

/**
 * Decrypt token data
 */
async function decryptToken(
  envelope: EncryptedEnvelope,
  encryptionKey: string
): Promise<StoredToken> {
  if (envelope.version !== 1) {
    throw new Error(`Unsupported encryption version: ${envelope.version}`);
  }

  const key = await deriveKey(encryptionKey);

  // Decode from Base64
  const iv = Uint8Array.from(atob(envelope.iv), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(envelope.ciphertext), (c) =>
    c.charCodeAt(0)
  );

  // Decrypt
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  // Parse JSON
  const text = new TextDecoder().decode(plaintext);
  return JSON.parse(text) as StoredToken;
}

/**
 * Create a token storage instance
 */
export function createTokenStorage(config: TokenStorageConfig) {
  const { kv, encryptionKey } = config;

  return {
    /**
     * Store a token for a user
     */
    async storeToken(userId: string, token: StoredToken): Promise<void> {
      const encrypted = await encryptToken(token, encryptionKey);

      // Calculate TTL based on token expiry (with 5 minute buffer)
      const ttl = Math.max(
        60, // Minimum 1 minute
        Math.floor(token.expiresAt - Date.now() / 1000 + 300)
      );

      await kv.put(`token:${userId}`, JSON.stringify(encrypted), {
        expirationTtl: ttl,
      });
    },

    /**
     * Retrieve a token for a user with explicit error reasons
     */
    async getTokenResult(userId: string): Promise<TokenResult> {
      const data = await kv.get(`token:${userId}`);
      if (!data) {
        return { ok: false, reason: 'not_found' };
      }

      let envelope: EncryptedEnvelope;
      try {
        envelope = JSON.parse(data) as EncryptedEnvelope;
      } catch {
        console.error(
          'Failed to parse token envelope for:',
          userId.substring(0, 8) + '...'
        );
        await kv.delete(`token:${userId}`);
        return { ok: false, reason: 'corrupted' };
      }

      try {
        const token = await decryptToken(envelope, encryptionKey);

        // Check if token is expired
        if (token.expiresAt < Date.now() / 1000) {
          await kv.delete(`token:${userId}`);
          return { ok: false, reason: 'expired' };
        }

        return { ok: true, token };
      } catch (error) {
        console.error('Failed to decrypt token:', error);
        await kv.delete(`token:${userId}`);
        return { ok: false, reason: 'decrypt_failed' };
      }
    },

    /**
     * Retrieve a token for a user (convenience method, returns null on any error)
     */
    async getToken(userId: string): Promise<StoredToken | null> {
      const result = await this.getTokenResult(userId);
      return result.ok ? result.token : null;
    },

    /**
     * Delete a token for a user
     */
    async deleteToken(userId: string): Promise<void> {
      await kv.delete(`token:${userId}`);
    },

    /**
     * Check if a token exists and is valid
     */
    async hasValidToken(userId: string): Promise<boolean> {
      const token = await this.getToken(userId);
      return token !== null;
    },

    /**
     * Update token with refreshed values
     */
    async refreshToken(
      userId: string,
      newAccessToken: string,
      newExpiresIn: number,
      newRefreshToken?: string
    ): Promise<void> {
      const existing = await this.getToken(userId);
      if (!existing) {
        throw new Error('No existing token to refresh');
      }

      const updated: StoredToken = {
        ...existing,
        accessToken: newAccessToken,
        expiresAt: Math.floor(Date.now() / 1000) + newExpiresIn,
        ...(newRefreshToken && { refreshToken: newRefreshToken }),
      };

      await this.storeToken(userId, updated);
    },
  };
}

/**
 * Generate a random encryption key (for setup)
 */
export function generateEncryptionKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
