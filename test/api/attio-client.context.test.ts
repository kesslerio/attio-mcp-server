import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalApiKey = process.env.ATTIO_API_KEY;
const originalLogLevel = process.env.MCP_LOG_LEVEL;

// Mock the logger to avoid noise in tests
vi.mock('../../src/utils/logger.js', () => ({
  debug: vi.fn(),
  error: vi.fn(),
  OperationType: {
    API_CALL: 'API_CALL',
    SYSTEM: 'SYSTEM',
  },
}));

describe('Attio client context fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    delete process.env.ATTIO_API_KEY;
    process.env.MCP_LOG_LEVEL = 'ERROR';
    vi.doMock('../../src/api/attio-client.js', async () => {
      const actual = await vi.importActual<
        typeof import('../../src/api/attio-client.js')
      >('../../src/api/attio-client.js');
      return actual;
    });
  });

  afterEach(async () => {
    vi.resetModules();
    vi.restoreAllMocks();

    if (originalApiKey) {
      process.env.ATTIO_API_KEY = originalApiKey;
    } else {
      delete process.env.ATTIO_API_KEY;
    }

    if (originalLogLevel) {
      process.env.MCP_LOG_LEVEL = originalLogLevel;
    } else {
      delete process.env.MCP_LOG_LEVEL;
    }

    const { clearClientCache } = await import('../../src/api/lazy-client.js');
    clearClientCache();
  });

  it('uses context getApiKey when environment variable is missing', async () => {
    const { setGlobalContext } = await import('../../src/api/lazy-client.js');
    setGlobalContext({
      getApiKey: () => 'context-key-12345',
    });

    const { getAttioClient } = await import('../../src/api/attio-client.js');
    const client = getAttioClient();

    expect(client.defaults.headers.Authorization).toBe(
      'Bearer context-key-12345'
    );
  });

  it('falls back to ATTIO_API_KEY property in context when getter absent', async () => {
    const { setGlobalContext } = await import('../../src/api/lazy-client.js');
    setGlobalContext({
      ATTIO_API_KEY: 'context-prop-key-12345',
    });

    const { getAttioClient } = await import('../../src/api/attio-client.js');
    const client = getAttioClient();

    expect(client.defaults.headers.Authorization).toBe(
      'Bearer context-prop-key-12345'
    );
  });

  it('prefers environment variable over context when both are provided', async () => {
    process.env.ATTIO_API_KEY = 'env-key-12345';

    const { setGlobalContext } = await import('../../src/api/lazy-client.js');
    setGlobalContext({
      getApiKey: () => 'context-key-ignored-12345',
    });

    const { getAttioClient } = await import('../../src/api/attio-client.js');
    const client = getAttioClient();

    expect(client.defaults.headers.Authorization).toBe('Bearer env-key-12345');
  });

  describe('Context getter exception handling', () => {
    it('should handle context getter exceptions gracefully', async () => {
      const { setGlobalContext } = await import('../../src/api/lazy-client.js');
      setGlobalContext({
        getApiKey: () => {
          throw new Error('Context getter failed');
        },
        ATTIO_API_KEY: 'fallback-key-12345',
      });

      const { getAttioClient } = await import('../../src/api/attio-client.js');
      const client = getAttioClient();

      // Should fall back to direct property access
      expect(client.defaults.headers.Authorization).toBe(
        'Bearer fallback-key-12345'
      );
    });

    it('should cache failed context getter attempts', async () => {
      const mockGetApiKey = vi.fn().mockImplementation(() => {
        throw new Error('Persistent failure');
      });

      const { setGlobalContext } = await import('../../src/api/lazy-client.js');
      setGlobalContext({
        getApiKey: mockGetApiKey,
        ATTIO_API_KEY: 'fallback-key-12345',
      });

      const { getContextApiKey } = await import(
        '../../src/api/client-context.js'
      );

      // First call should attempt getApiKey
      getContextApiKey();
      expect(mockGetApiKey).toHaveBeenCalledTimes(1);

      // Second call should be cached and not call getApiKey again immediately
      getContextApiKey();
      expect(mockGetApiKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('Enhanced context functionality', () => {
    it('should provide context statistics for debugging', async () => {
      const { setGlobalContext } = await import('../../src/api/lazy-client.js');
      const { getContextStats } = await import(
        '../../src/api/client-context.js'
      );

      setGlobalContext({
        getApiKey: () => 'test-key-12345',
        ATTIO_API_KEY: 'direct-key-12345',
      });

      const stats = getContextStats();

      expect(stats.hasContext).toBe(true);
      expect(stats.hasWeakMapStorage).toBe(true);
      expect(stats.hasFallbackStorage).toBe(true);
      expect(stats.hasApiKeyGetter).toBe(true);
      expect(stats.hasDirectApiKey).toBe(true);
      expect(stats.failedContextCacheSize).toBe(0);
    });

    it('should validate API keys properly', async () => {
      const { validateApiKey } = await import(
        '../../src/api/client-context.js'
      );

      expect(validateApiKey('valid-api-key-123')).toBe(true);
      expect(validateApiKey('')).toBe(false);
      expect(validateApiKey('   ')).toBe(false);
      expect(validateApiKey('invalid key with spaces')).toBe(false);
      expect(validateApiKey(' leading-space')).toBe(false);
      expect(validateApiKey('trailing-space ')).toBe(false);
    });

    it('should clear all context storage properly', async () => {
      const { setGlobalContext, clearClientCache } = await import(
        '../../src/api/lazy-client.js'
      );
      const { getContextStats } = await import(
        '../../src/api/client-context.js'
      );

      // Set context
      setGlobalContext({
        getApiKey: () => 'test-key-12345',
      });

      let stats = getContextStats();
      expect(stats.hasContext).toBe(true);

      // Clear context
      clearClientCache();

      stats = getContextStats();
      expect(stats.hasContext).toBe(false);
      expect(stats.hasWeakMapStorage).toBe(false);
      expect(stats.hasFallbackStorage).toBe(false);
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle malformed context objects', async () => {
      const { setGlobalContext } = await import('../../src/api/lazy-client.js');
      const { getContextApiKey } = await import(
        '../../src/api/client-context.js'
      );

      // Set malformed context
      setGlobalContext({
        getApiKey: 'not-a-function',
        ATTIO_API_KEY: 123 as any, // Wrong type
      });

      const apiKey = getContextApiKey();
      expect(apiKey).toBeUndefined();
    });

    it('should handle context with empty string API key', async () => {
      const { setGlobalContext } = await import('../../src/api/lazy-client.js');
      const { getContextApiKey } = await import(
        '../../src/api/client-context.js'
      );

      setGlobalContext({
        ATTIO_API_KEY: '',
      });

      const apiKey = getContextApiKey();
      expect(apiKey).toBeUndefined();
    });

    it('should handle context with whitespace-only API key', async () => {
      const { setGlobalContext } = await import('../../src/api/lazy-client.js');
      const { getContextApiKey } = await import(
        '../../src/api/client-context.js'
      );

      setGlobalContext({
        ATTIO_API_KEY: '   \n\t   ',
      });

      const apiKey = getContextApiKey();
      expect(apiKey).toBeUndefined();
    });

    it('should handle null context gracefully', async () => {
      const { clearClientCache } = await import('../../src/api/lazy-client.js');
      const { getContextApiKey } = await import(
        '../../src/api/client-context.js'
      );

      clearClientCache();

      const apiKey = getContextApiKey();
      expect(apiKey).toBeUndefined();
    });
  });
});
