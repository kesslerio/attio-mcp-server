/**
 * Global test setup for Vitest
 * Handles API client mocking and common test configuration
 */
import { vi, beforeEach } from 'vitest';

// Force predictable test environment semantics for sanitization logic
process.env.NODE_ENV = 'test';
import { createMockApiClient } from '@test/types/test-types.js';
import {
  validateTestEnvironment,
  getDetailedErrorMessage,
} from '@test/utils/test-cleanup.js';
import {
  sanitizeLogMessage,
  sanitizeLogPayload,
} from '@/utils/log-sanitizer.js';
import { clearMockCompanies } from '@/utils/mock-state.js';
import { clearAttributeCache } from '@/api/attribute-types.js';

// Validate environment for integration tests
if (process.env.NODE_ENV === 'test' && process.env.E2E_MODE === 'true') {
  try {
    validateTestEnvironment();
  } catch (error) {
    console.error(
      'Test environment validation failed:',
      getDetailedErrorMessage(error)
    );
    console.error(
      'Integration tests will fail without proper environment setup.'
    );
  }
}

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug';

const consoleMethods: ConsoleMethod[] = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
];

for (const method of consoleMethods) {
  const original = console[method];
  console[method] = ((...args: unknown[]) => {
    const sanitizedArgs = args.map((arg) => {
      if (typeof arg === 'string') {
        return sanitizeLogMessage(arg);
      }
      if (typeof arg === 'object' && arg !== null) {
        return sanitizeLogPayload(arg);
      }
      return arg;
    });
    return original.apply(console, sanitizedArgs as []);
  }) as (typeof console)[typeof method];
}

// Define types for test globals
interface TestGlobal {
  setTestApiClient?: (client: unknown) => void;
  clearTestApiClient?: () => void;
}

// Global test-specific client override mechanism
let testSpecificClient: unknown = null;

// Utility function for tests to override the API client
(globalThis as TestGlobal).setTestApiClient = (client: unknown) => {
  testSpecificClient = client;
};

// Utility function for tests to clear overrides
(globalThis as TestGlobal).clearTestApiClient = () => {
  testSpecificClient = null;
};

// Mock for static imports (path without .js extension)
// ⬇️ keep this mock unconditionally; branch *inside* the factory
vi.mock('../src/api/attio-client', async () => {
  // In E2E we want the *real* implementation
  if (process.env.E2E_MODE === 'true') {
    const actual = await vi.importActual<
      typeof import('../src/api/attio-client')
    >('../src/api/attio-client');
    return actual;
  }

  // Non-E2E: Use test-specific client if provided, otherwise default mock
  const getClientInstance = () => {
    if (testSpecificClient) {
      return testSpecificClient;
    }
    // Use the rich mock API client that simulates Attio endpoints
    return createMockApiClient();
  };

  return {
    // Unified API
    createAttioClient: vi.fn(() => getClientInstance()),
    // Legacy APIs kept for compatibility (return the same instance)
    buildAttioClient: vi.fn(() => getClientInstance()),
    getAttioClient: vi.fn(() => getClientInstance()),
    initializeAttioClient: vi.fn(() => {}),
    isAttioClientInitialized: vi.fn(() => true),
    createLegacyAttioClient: vi.fn(() => getClientInstance()),
    // API utility functions
    getAttributeSchema: vi.fn().mockResolvedValue([]),
    getSelectOptions: vi.fn().mockResolvedValue([]),
    getStatusOptions: vi.fn().mockResolvedValue([
      {
        title: 'Interested',
        id: 'interested-id',
        value: 'interested',
        is_archived: false,
      },
      {
        title: 'Qualified',
        id: 'qualified-id',
        value: 'qualified',
        is_archived: false,
      },
      { title: 'Demo', id: 'demo-id', value: 'demo', is_archived: false },
      {
        title: 'Negotiation',
        id: 'negotiation-id',
        value: 'negotiation',
        is_archived: false,
      },
      { title: 'Won', id: 'won-id', value: 'won', is_archived: false },
      { title: 'Lost', id: 'lost-id', value: 'lost', is_archived: false },
    ]),
    // Module metadata
    __MODULE_PATH__: 'mocked-attio-client',
  };
});

// Mock for dynamic imports (path WITH .js extension)
// This catches `await import('../api/attio-client.js')` in deal-defaults.ts
vi.mock('../src/api/attio-client.js', async () => {
  // In E2E we want the *real* implementation
  if (process.env.E2E_MODE === 'true') {
    const actual = await vi.importActual<
      typeof import('../src/api/attio-client')
    >('../src/api/attio-client');
    return actual;
  }

  // Non-E2E: Use test-specific client if provided, otherwise default mock
  const getClientInstance = () => {
    if (testSpecificClient) {
      return testSpecificClient;
    }
    // Use the rich mock API client that simulates Attio endpoints
    return createMockApiClient();
  };

  return {
    // Unified API
    createAttioClient: vi.fn(() => getClientInstance()),
    // Legacy APIs kept for compatibility (return the same instance)
    buildAttioClient: vi.fn(() => getClientInstance()),
    getAttioClient: vi.fn(() => getClientInstance()),
    initializeAttioClient: vi.fn(() => {}),
    isAttioClientInitialized: vi.fn(() => true),
    createLegacyAttioClient: vi.fn(() => getClientInstance()),
    // API utility functions
    getAttributeSchema: vi.fn().mockResolvedValue([]),
    getSelectOptions: vi.fn().mockResolvedValue([]),
    getStatusOptions: vi.fn().mockResolvedValue([
      {
        title: 'Interested',
        id: 'interested-id',
        value: 'interested',
        is_archived: false,
      },
      {
        title: 'Qualified',
        id: 'qualified-id',
        value: 'qualified',
        is_archived: false,
      },
      { title: 'Demo', id: 'demo-id', value: 'demo', is_archived: false },
      {
        title: 'Negotiation',
        id: 'negotiation-id',
        value: 'negotiation',
        is_archived: false,
      },
      { title: 'Won', id: 'won-id', value: 'won', is_archived: false },
      { title: 'Lost', id: 'lost-id', value: 'lost', is_archived: false },
    ]),
    // Module metadata
    __MODULE_PATH__: 'mocked-attio-client.js',
  };
});

// Global mock for people search functions to fix PersonValidator tests (skip for E2E)
if (process.env.E2E_MODE !== 'true') {
  vi.mock('../src/objects/people/search', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...(actual as Record<string, unknown>),
      searchPeopleByEmail: vi.fn(async (email: string) => {
        // Mock behavior based on email for testing
        if (email === 'dup@example.com') {
          return [{ id: { record_id: 'existing-person-id' } }];
        }
        return [];
      }),
      searchPeopleByCreationDate: vi.fn(async () => []),
      searchPeopleByModificationDate: vi.fn(async () => []),
      searchPeopleByLastInteraction: vi.fn(async () => []),
      searchPeopleByActivity: vi.fn(async (activityFilter) => {
        // Mock implementation that bypasses filter validation
        return [];
      }),
      advancedSearchPeople: vi.fn(async (filters, options) => {
        // Mock that bypasses filter validation
        return { results: [] };
      }),
    };
  });
}

// Mock the entire people-write module to avoid API initialization issues (skip for E2E)
if (process.env.E2E_MODE !== 'true') {
  vi.mock('../src/objects/people-write', async () => {
    const actual = await vi.importActual('../src/objects/people-write');
    return {
      ...(actual as Record<string, unknown>),
      searchPeopleByEmails: vi.fn(async (emails: string[]) => {
        // Mock batch email search for PersonValidator tests
        return emails.map((email) => ({
          email,
          exists: email === 'dup@example.com',
          personId:
            email === 'dup@example.com' ? 'existing-person-id' : undefined,
        }));
      }),
    };
  });

  // Global mock for companies module
  vi.mock('../src/objects/companies/index', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...(actual as Record<string, unknown>),
      searchCompanies: vi.fn(async () => []),
      searchCompaniesByName: vi.fn(async (name: string) => {
        // Mock behavior based on company name for testing
        if (name === 'Test Company' || name === 'Existing Company') {
          return [{ id: { record_id: 'existing-company-id' } }];
        }
        return [];
      }),
      searchCompaniesByDomain: vi.fn(async () => []),
      advancedSearchCompanies: vi.fn(async (...args) => {
        // In E2E mode, use the actual implementation
        if (process.env.E2E_MODE === 'true') {
          const actual = await vi.importActual(
            '../src/objects/companies/search'
          );
          return (actual as Record<string, unknown>).advancedSearchCompanies(
            ...args
          );
        }
        // Otherwise return mock
        return [];
      }),
      listCompanies: vi.fn(async () => []),
      getCompanyDetails: vi.fn(async (...args) => {
        // In E2E mode, use the actual implementation
        if (process.env.E2E_MODE === 'true') {
          const actual = await vi.importActual(
            '../src/objects/companies/index'
          );
          return (actual as Record<string, unknown>).getCompanyDetails(...args);
        }
        // Otherwise return mock
        return {};
      }),
      createCompany: vi.fn(async (...args) => {
        // In E2E mode, use the actual implementation
        if (process.env.E2E_MODE === 'true') {
          const actual = await vi.importActual(
            '../src/objects/companies/index'
          );
          return (actual as Record<string, unknown>).createCompany(...args);
        }
        // Otherwise return mock
        return {};
      }),
      updateCompany: vi.fn(async (...args) => {
        // In E2E mode, use the actual implementation
        if (process.env.E2E_MODE === 'true') {
          const actual = await vi.importActual(
            '../src/objects/companies/index'
          );
          return (actual as Record<string, unknown>).updateCompany(...args);
        }
        // Otherwise return mock
        return {};
      }),
      deleteCompany: vi.fn(async () => true),
      smartSearchCompanies: vi.fn(async () => []),
    };
  });

  // Global mock for companies search module - pass-through for validation
  vi.mock('../src/objects/companies/search', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
      ...(actual as Record<string, unknown>),
      searchCompaniesByName: vi.fn(async (name: string) => {
        // Mock behavior based on company name for testing
        if (name === 'Test Company' || name === 'Existing Company') {
          return [{ id: { record_id: 'existing-company-id' } }];
        }
        return [];
      }),
      // Pass-through for validation - let real validation run in offline tests
      advancedSearchCompanies: actual.advancedSearchCompanies,
      companyCache: {
        clear: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
      },
    };
  });

  // Global mock for people module
  vi.mock('../src/objects/people/index', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...(actual as Record<string, unknown>),
      searchPeople: vi.fn(async () => []),
      advancedSearchPeople: vi.fn(async (filters, options) => {
        // Mock that bypasses filter validation
        return { results: [] };
      }),
      listPeople: vi.fn(async () => []),
      getPersonDetails: vi.fn(async () => ({})),
      createPerson: vi.fn(async () => ({})),
      updatePerson: vi.fn(async () => ({})),
      deletePerson: vi.fn(async () => true),
      searchPeopleByCompany: vi.fn(async () => []),
    };
  });
}

// Mock console methods globally to prevent issues with logging tests
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug,
};

// Set up environment variables for testing (skip for E2E tests)
beforeEach(() => {
  // Mock environment variables for API initialization (skip for E2E tests)
  if (process.env.E2E_MODE !== 'true') {
    vi.stubEnv('ATTIO_API_KEY', 'test-api-key');
    vi.stubEnv('ATTIO_WORKSPACE_ID', 'test-workspace-id');
  }

  // Clear all mocks before each test for isolation
  vi.clearAllMocks();

  // Clear test-specific client override for clean test isolation
  (globalThis as TestGlobal).clearTestApiClient?.();

  // Clear mock company state for clean test isolation
  clearMockCompanies();

  // Clear attribute cache to ensure fresh metadata fetching in each test
  clearAttributeCache();

  // Reset console methods to original implementation to avoid interference
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.debug = originalConsole.debug;
});
