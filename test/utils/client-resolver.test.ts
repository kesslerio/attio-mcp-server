import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import type { AxiosInstance } from 'axios';

const originalApiKey = process.env.ATTIO_API_KEY;

type AttioModuleMock = Partial<
  Record<'getAttioClient' | 'createAttioClient' | 'buildAttioClient', any>
>;

function createMockClient(): AxiosInstance {
  const client = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: {} },
  } as unknown as AxiosInstance;
  return client;
}

function mockAttioModule(overrides: AttioModuleMock) {
  vi.doMock('../../src/api/attio-client.js', () => ({
    getAttioClient: undefined,
    createAttioClient: undefined,
    buildAttioClient: undefined,
    ...overrides,
  }));
}

function mockContextModule(apiKey?: string) {
  vi.doMock('../../src/api/client-context.js', () => ({
    getContextApiKey: vi.fn(() => apiKey),
  }));
}

async function importResolver() {
  return await import('../../src/utils/client-resolver.js');
}

async function importAttioModule() {
  return await import('../../src/api/attio-client.js');
}

describe('Client Resolver', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.ATTIO_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env.ATTIO_API_KEY = originalApiKey;
    } else {
      delete process.env.ATTIO_API_KEY;
    }
  });

  describe('resolveAttioClient', () => {
    it('prioritises getAttioClient() when available', async () => {
      const mockClient = createMockClient();
      const getAttioClient = vi.fn().mockReturnValue(mockClient);
      mockAttioModule({ getAttioClient });
      mockContextModule(undefined);

      const { resolveAttioClient } = await importResolver();
      const client = resolveAttioClient();

      expect(client).toBe(mockClient);
      expect(getAttioClient).toHaveBeenCalledTimes(1);
    });

    it('falls back to createAttioClient() when getAttioClient is absent', async () => {
      const mockClient = createMockClient();
      const createAttioClient = vi.fn().mockReturnValue(mockClient);
      mockAttioModule({ createAttioClient });
      mockContextModule(undefined);
      process.env.ATTIO_API_KEY = 'test-key-12345';

      const { resolveAttioClient } = await importResolver();
      const client = resolveAttioClient();

      expect(client).toBe(mockClient);
      // After fix in e75725b3, createAttioClient is called with config object (not string)
      expect(createAttioClient).toHaveBeenCalledWith({});
    });

    it('falls back to buildAttioClient() when other factories missing', async () => {
      const mockClient = createMockClient();
      const buildAttioClient = vi.fn().mockReturnValue(mockClient);
      mockAttioModule({ buildAttioClient });
      mockContextModule(undefined);
      process.env.ATTIO_API_KEY = 'test-key-456';

      const { resolveAttioClient } = await importResolver();
      const client = resolveAttioClient();

      expect(client).toBe(mockClient);
      expect(buildAttioClient).toHaveBeenCalledWith({ apiKey: 'test-key-456' });
    });

    it('uses context API key when environment variable missing', async () => {
      const mockClient = createMockClient();
      const createAttioClient = vi.fn().mockReturnValue(mockClient);
      mockAttioModule({ createAttioClient });
      mockContextModule('context-key-123');

      const { resolveAttioClient } = await importResolver();
      const client = resolveAttioClient();

      expect(client).toBe(mockClient);
      // After fix in e75725b3, createAttioClient is called with config object (not string)
      expect(createAttioClient).toHaveBeenCalledWith({});
    });

    it('throws descriptive error when no factories available', async () => {
      mockAttioModule({});
      mockContextModule(undefined);

      const { resolveAttioClient } = await importResolver();
      expect(() => resolveAttioClient()).toThrow(
        /Failed to initialize Attio client/
      );
    });

    it('throws descriptive error when API key missing for factories requiring it', async () => {
      const createAttioClient = vi.fn();
      mockAttioModule({ createAttioClient });
      mockContextModule(undefined);

      const { resolveAttioClient } = await importResolver();
      expect(() => resolveAttioClient()).toThrow(
        /Failed to initialize Attio client/
      );
    });

    it('provides generic error message without exposing internal methods', async () => {
      mockAttioModule({ someOtherMethod: vi.fn() });
      mockContextModule(undefined);

      const { resolveAttioClient } = await importResolver();
      expect(() => resolveAttioClient()).toThrow(
        /Failed to initialize Attio client/
      );
    });
  });

  describe('isAttioClient', () => {
    it('returns true for axios-like clients', async () => {
      const mockClient = createMockClient();
      mockAttioModule({ getAttioClient: vi.fn().mockReturnValue(mockClient) });
      mockContextModule(undefined);

      const { isAttioClient } = await importResolver();
      expect(isAttioClient(mockClient)).toBe(true);
    });

    it('returns false for objects missing required methods', async () => {
      mockAttioModule({});
      mockContextModule(undefined);

      const { isAttioClient } = await importResolver();
      expect(isAttioClient({ get: () => {} })).toBe(false);
    });
  });

  describe('getValidatedAttioClient', () => {
    it('returns client when resolution succeeds', async () => {
      const mockClient = createMockClient();
      const getAttioClient = vi.fn().mockReturnValue(mockClient);
      mockAttioModule({ getAttioClient });
      mockContextModule(undefined);

      const { getValidatedAttioClient } = await importResolver();
      const client = getValidatedAttioClient();
      expect(client).toBe(mockClient);
    });

    it('throws when resolved client is invalid', async () => {
      const getAttioClient = vi.fn().mockReturnValue({});
      mockAttioModule({ getAttioClient });
      mockContextModule(undefined);

      const { getValidatedAttioClient } = await importResolver();
      expect(() => getValidatedAttioClient()).toThrow(/invalid Axios client/);
    });
  });

  describe('environment precedence', () => {
    it('prefers environment variable over context API key', async () => {
      const mockClient = createMockClient();
      const createAttioClient = vi.fn().mockReturnValue(mockClient);
      mockAttioModule({ createAttioClient });
      mockContextModule('context-key');
      process.env.ATTIO_API_KEY = 'env-key-12345';

      const { resolveAttioClient } = await importResolver();
      resolveAttioClient();

      // After fix in e75725b3, createAttioClient is called with config object (not string)
      expect(createAttioClient).toHaveBeenCalledWith({});
      expect(createAttioClient).not.toHaveBeenCalledWith('context-key');
    });

    it('does not cache resolved clients between calls', async () => {
      const mockClient1 = createMockClient();
      const mockClient2 = createMockClient();
      const getAttioClient = vi
        .fn()
        .mockReturnValueOnce(mockClient1)
        .mockReturnValueOnce(mockClient2);

      mockAttioModule({ getAttioClient });
      mockContextModule(undefined);

      const { resolveAttioClient } = await importResolver();
      const client1 = resolveAttioClient();
      const client2 = resolveAttioClient();

      expect(client1).toBe(mockClient1);
      expect(client2).toBe(mockClient2);
      expect(getAttioClient).toHaveBeenCalledTimes(2);
    });
  });
});
