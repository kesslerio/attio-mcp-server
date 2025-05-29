/**
 * Global test setup for Vitest
 * Handles API client mocking and common test configuration
 */
import { vi, beforeEach } from 'vitest';
import { createMockApiClient } from './types/test-types';

// Global mock for attio-client
vi.mock('../src/api/attio-client', async () => {
  const mockAxiosInstance = createMockApiClient();
  
  return {
    getAttioClient: vi.fn(() => mockAxiosInstance),
    initializeAttioClient: vi.fn(() => {
      // Mock implementation that doesn't require real API key
      return Promise.resolve(mockAxiosInstance);
    }),
    isAttioClientInitialized: vi.fn(() => true),
    createAttioClient: vi.fn(() => mockAxiosInstance),
  };
});

// Global mock for people search functions to fix PersonValidator tests
vi.mock('../src/objects/people/search', () => ({
  searchPeopleByEmail: vi.fn(async (email: string) => {
    // Mock behavior based on email for testing
    if (email === 'dup@example.com') {
      return [{ id: { record_id: 'existing-person-id' } }];
    }
    return [];
  }),
}));

// Mock the entire people-write module to avoid API initialization issues
vi.mock('../src/objects/people-write', async () => {
  const actual = await vi.importActual('../src/objects/people-write');
  return {
    ...actual,
    searchPeopleByEmails: vi.fn(async (emails: string[]) => {
      // Mock batch email search for PersonValidator tests
      return emails.map(email => ({
        email,
        exists: email === 'dup@example.com',
        personId: email === 'dup@example.com' ? 'existing-person-id' : undefined,
      }));
    }),
  };
});

// Global mock for companies module
vi.mock('../src/objects/companies/index', () => ({
  searchCompanies: vi.fn(async () => []),
  searchCompaniesByName: vi.fn(async (name: string) => {
    // Mock behavior based on company name for testing
    if (name === 'Test Company' || name === 'Existing Company') {
      return [{ id: { record_id: 'existing-company-id' } }];
    }
    return [];
  }),
  advancedSearchCompanies: vi.fn(async () => []),
  listCompanies: vi.fn(async () => []),
  getCompanyDetails: vi.fn(async () => ({})),
  createCompany: vi.fn(async () => ({})),
  updateCompany: vi.fn(async () => ({})),
  deleteCompany: vi.fn(async () => true),
}));

// Global mock for companies search module
vi.mock('../src/objects/companies/search', () => ({
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
vi.mock('../src/objects/people/index', () => ({
  searchPeople: vi.fn(async () => []),
  advancedSearchPeople: vi.fn(async () => []),
  listPeople: vi.fn(async () => []),
  getPersonDetails: vi.fn(async () => ({})),
  createPerson: vi.fn(async () => ({})),
  updatePerson: vi.fn(async () => ({})),
  deletePerson: vi.fn(async () => true),
}));

// Set up environment variables for testing
beforeEach(() => {
  // Mock environment variables for API initialization
  vi.stubEnv('ATTIO_API_KEY', 'test-api-key');
  vi.stubEnv('ATTIO_WORKSPACE_ID', 'test-workspace-id');
  
  // Clear all mocks before each test for isolation
  vi.clearAllMocks();
});