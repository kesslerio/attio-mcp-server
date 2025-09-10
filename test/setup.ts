/**
 * Global test setup for Vitest
 * Handles API client mocking and common test configuration
 */
import { vi, beforeEach } from 'vitest';

// Force predictable test environment semantics for sanitization logic
process.env.NODE_ENV = 'test';
import { createMockApiClient } from './types/test-types';
import {
  validateTestEnvironment,
  getDetailedErrorMessage,
} from './utils/test-cleanup';
import { clearMockCompanies } from '../src/utils/mock-state';
import { clearAttributeCache } from '../src/api/attribute-types';

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

// Global test-specific client override mechanism
let testSpecificClient: any = null;

// Utility function for tests to override the API client
(globalThis as any).setTestApiClient = (client: any) => {
  testSpecificClient = client;
};

// Utility function for tests to clear overrides
(globalThis as any).clearTestApiClient = () => {
  testSpecificClient = null;
};

// ⬇️ keep this mock unconditionally; branch *inside* the factory
vi.mock('../src/api/attio-client', async () => {
  // In E2E we want the *real* implementation
  if (process.env.E2E_MODE === 'true') {
    // Return the actual module (no stubbing)
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
    // New API
    buildAttioClient: vi.fn(() => getClientInstance()),

    // Legacy APIs kept for compatibility (return the same instance)
    getAttioClient: vi.fn(() => getClientInstance()),
    initializeAttioClient: vi.fn(() => {}),
    isAttioClientInitialized: vi.fn(() => true),
  };
});

// Global mock for people search functions to fix PersonValidator tests (skip for E2E)
if (process.env.E2E_MODE !== 'true') {
  vi.mock('../src/objects/people/search', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...(actual as any),
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
      ...(actual as any),
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
      ...(actual as any),
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
          return (actual as any).advancedSearchCompanies(...args);
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
          return (actual as any).getCompanyDetails(...args);
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
          return (actual as any).createCompany(...args);
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
          return (actual as any).updateCompany(...args);
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
    const actual = await importOriginal<any>();
    return {
      ...(actual as any),
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
      ...(actual as any),
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
  (globalThis as any).clearTestApiClient?.();

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
