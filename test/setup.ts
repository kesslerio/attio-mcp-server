/**
 * Global test setup for Vitest
 * Handles API client mocking and common test configuration
 */
import { beforeEach, vi } from 'vitest';
import type { ListEntryFilters } from '../src/api/operations/index.js';
import type { ActivityFilter } from '../src/types/attio.js';
import { createMockApiClient } from './types/test-types.js';

// Global mock for attio-client
vi.mock('../src/api/attio-client.js', async () => {
  const mockAxiosInstance = createMockApiClient();

  // Store initialized state
  let isInitialized = false;

  return {
    getAttioClient: vi.fn(() => {
      // Auto-initialize if not already done
      if (!isInitialized) {
        isInitialized = true;
      }
      return mockAxiosInstance;
    }),
    initializeAttioClient: vi.fn((apiKey?: string) => {
      // Mock implementation that doesn't require real API key
      isInitialized = true;
      return Promise.resolve(mockAxiosInstance);
    }),
    isAttioClientInitialized: vi.fn(() => isInitialized),
    createAttioClient: vi.fn(() => mockAxiosInstance),
  };
});

// Global mock for people search functions to fix PersonValidator tests
vi.mock('../src/objects/people/search.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/objects/people/search.js')>();
  return {
    ...actual,
    searchPeopleByEmail: vi.fn(async (email: string) => {
      // Mock behavior  based on email for testing
      if (email === 'dup@example.com') {
        return [{ id: { record_id: 'existing-person-id' } }];
      }
      return [];
    }),
    searchPeopleByCreationDate: vi.fn(async () => []),
    searchPeopleByModificationDate: vi.fn(async () => []),
    searchPeopleByLastInteraction: vi.fn(async () => []),
    searchPeopleByActivity: vi.fn(async (_activityFilter: ActivityFilter) => {
      // Mock implementation that bypasses filter validation
      return [];
    }),
    advancedSearchPeople: vi.fn(
      async (
        _filters: ListEntryFilters,
        _options?: {
          limit?: number;
          offset?: number;
          sorts?: { attribute: string; direction: 'asc' | 'desc' }[];
        }
      ) => {
        // Mock that bypasses filter validation
        return { results: [] };
      }
    ),
  };
});

// Mock the entire people-write module to avoid API initialization issues
vi.mock('../src/objects/people-write.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/objects/people-write.js')>();
  return {
    ...actual,
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
vi.mock('../src/objects/companies/index.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/objects/companies/index.js')>();
  return {
    ...actual,
    searchCompanies: vi.fn(async () => []),
    searchCompaniesByName: vi.fn(async (name: string) => {
      // Mock behavior based on company name for testing
      if (name === 'Test Company' || name === 'Existing Company') {
        return [{ id: { record_id: 'existing-company-id' } }];
      }
      return [];
    }),
    searchCompaniesByDomain: vi.fn(async () => []),
    advancedSearchCompanies: vi.fn(async () => []),
    listCompanies: vi.fn(async () => []),
    getCompanyDetails: vi.fn(async () => ({})),
    createCompany: vi.fn(async () => ({})),
    updateCompany: vi.fn(async () => ({})),
    deleteCompany: vi.fn(async () => true),
    smartSearchCompanies: vi.fn(async () => []),
  };
});

// Global mock for companies search module
vi.mock('../src/objects/companies/search.js', () => ({
  searchCompaniesByName: vi.fn(async (name: string) => {
    // Mock behavior based on company name for testing
    if (name === 'Test Company' || name === 'Existing Company') {
      return [{ id: { record_id: 'existing-company-id' } }];
    }
    return [];
  }),
  companyCache: {
    clear: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
}));

// Global mock for people module
vi.mock('../src/objects/people/index.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/objects/people/index.js')>();
  return {
    ...actual,
    searchPeople: vi.fn(async () => []),
    advancedSearchPeople: vi.fn(
      async (
        _filters: ListEntryFilters,
        _options?: {
          limit?: number;
          offset?: number;
          sorts?: { attribute: string; direction: 'asc' | 'desc' }[];
        }
      ) => {
        // Mock that bypasses filter validation
        return { results: [] };
      }
    ),
    listPeople: vi.fn(async () => []),
    getPersonDetails: vi.fn(async () => ({})),
    createPerson: vi.fn(async () => ({})),
    updatePerson: vi.fn(async () => ({})),
    deletePerson: vi.fn(async () => true),
    searchPeopleByCompany: vi.fn(async () => []),
  };
});

// Mock console methods globally to prevent issues with logging tests
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug,
};

// Set up environment variables for testing
beforeEach(() => {
  // Mock environment variables for API initialization
  vi.stubEnv('ATTIO_API_KEY', 'test-api-key');
  vi.stubEnv('ATTIO_WORKSPACE_ID', 'test-workspace-id');

  // Clear all mocks before each test for isolation
  vi.clearAllMocks();
  // Reset console methods to original implementation to avoid interference
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.debug = originalConsole.debug;
});
