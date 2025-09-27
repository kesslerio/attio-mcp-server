import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalApiKey = process.env.ATTIO_API_KEY;
const originalLogLevel = process.env.MCP_LOG_LEVEL;

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
});
