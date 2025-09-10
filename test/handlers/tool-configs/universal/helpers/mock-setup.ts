/**
 * Standardized mock configurations for universal tool tests
 *
 * This file provides reusable mock setup functions that can be used across
 * different universal test files to ensure consistent mocking behavior.
 *
 * Follows the mock factory pattern and maintains clean separation from
 * production code.
 */

import { vi } from 'vitest';
import { DATE_PATTERNS, MOCK_SCHEMAS } from './test-constants.js';
import { MockResponseFactory, MockErrorFactory } from './mock-data.js';

/**
 * Mock setup for shared handlers
 * Used by: advanced-operations.test.ts, core-operations.test.ts
 */
export const mockSharedHandlers = () => {
  vi.mock(
    '../../../../../src/handlers/tool-configs/universal/shared-handlers.js',
    () => ({
      handleUniversalSearch: vi.fn(),
      handleUniversalGetDetails: vi.fn(),
      handleUniversalCreate: vi.fn(),
      handleUniversalUpdate: vi.fn(),
      handleUniversalDelete: vi.fn(),
      handleUniversalGetAttributes: vi.fn(),
      handleUniversalDiscoverAttributes: vi.fn(),
      handleUniversalGetDetailedInfo: vi.fn(),
      formatResourceType: vi.fn((type: string) => {
        switch (type) {
          case 'companies':
            return 'company';
          case 'people':
            return 'person';
          case 'records':
            return 'record';
          case 'tasks':
            return 'task';
          default:
            return type;
        }
      }),
      getSingularResourceType: vi.fn((type: string) => type.slice(0, -1)),
      createUniversalError: vi.fn(
        (operation: string, resourceType: string, error: any) =>
          new Error(
            `${operation} failed for ${resourceType}: ${error.message || error}`
          )
      ),
    })
  );
};

/**
 * Mock setup for ErrorService
 * Used by: core-operations.test.ts
 */
export const mockErrorService = () => {
  vi.mock('../../../../../src/services/ErrorService.js', () => ({
    ErrorService: {
      createUniversalError: vi.fn(
        (operation: string, resourceType: string, error: any) =>
          new Error(
            `Universal ${operation} failed for resource type ${resourceType}: ${error.message || error}`
          )
      ),
    },
  }));
};

/**
 * Mock setup for schemas and validation
 * Used by: advanced-operations.test.ts, core-operations.test.ts
 */
export const mockSchemasAndValidation = () => {
  vi.mock(
    '../../../../../src/handlers/tool-configs/universal/schemas.js',
    async (importOriginal) => {
      const actual = (await importOriginal()) as any;
      return {
        ...actual,
        validateUniversalToolParams: vi.fn((operation: string, params: any) => {
          // Just return the params as-is (simulating successful validation)
          // This matches the expected behavior in tests
          return params || {};
        }),
        // Core operation schemas
        searchRecordsSchema: MOCK_SCHEMAS.empty,
        getRecordDetailsSchema: MOCK_SCHEMAS.empty,
        createRecordSchema: MOCK_SCHEMAS.empty,
        updateRecordSchema: MOCK_SCHEMAS.empty,
        deleteRecordSchema: MOCK_SCHEMAS.empty,
        getAttributesSchema: MOCK_SCHEMAS.empty,
        discoverAttributesSchema: MOCK_SCHEMAS.empty,
        getDetailedInfoSchema: MOCK_SCHEMAS.empty,
        // Advanced operation schemas
        advancedSearchSchema: MOCK_SCHEMAS.advancedSearch,
        searchByRelationshipSchema: MOCK_SCHEMAS.searchByRelationship,
        searchByContentSchema: MOCK_SCHEMAS.searchByContent,
        searchByTimeframeSchema: MOCK_SCHEMAS.searchByTimeframe,
        batchOperationsSchema: MOCK_SCHEMAS.batchOperations,
      };
    }
  );
};

/**
 * Mock setup for UniversalSearchService (new strategy pattern)
 * Used by: advanced-operations.test.ts
 */
export const mockUniversalSearchService = () => {
  vi.mock('../../../../../src/services/UniversalSearchService.js', () => ({
    UniversalSearchService: {
      searchRecords: vi.fn().mockResolvedValue([]),
    },
  }));
};

/**
 * Mock setup for specialized handlers (companies, people)
 * Used by: advanced-operations.test.ts
 */
export const mockSpecializedHandlers = () => {
  // Mock companies handlers
  vi.mock(
    '../../../../../src/objects/companies/index.js',
    async (importOriginal) => {
      const actual: any = await importOriginal();
      return {
        ...actual,
        searchCompaniesByNotes: vi.fn(),
        searchCompaniesByPeople: vi.fn(),
        advancedSearchCompanies: vi.fn(),
      };
    }
  );

  // Mock people handlers
  vi.mock(
    '../../../../../src/objects/people/index.js',
    async (importOriginal) => {
      const actual: any = await importOriginal();
      return {
        ...actual,
        searchPeopleByCompany: vi.fn(),
        searchPeopleByActivity: vi.fn(),
        searchPeopleByNotes: vi.fn(),
        advancedSearchPeople: vi.fn(),
        searchPeopleByCreationDate: vi.fn(),
        searchPeopleByModificationDate: vi.fn(),
        searchPeopleByLastInteraction: vi.fn(),
      };
    }
  );

  // Mock people search module specifically
  vi.mock(
    '../../../../../src/objects/people/search.js',
    async (importOriginal) => {
      const actual: any = await importOriginal();
      return {
        ...actual,
        searchPeopleByActivity: vi.fn(),
        searchPeopleByCreationDate: vi.fn(),
        searchPeopleByModificationDate: vi.fn(),
        searchPeopleByLastInteraction: vi.fn(),
      };
    }
  );
};

/**
 * Mock notes module used by search-by-content
 * Ensures listNotes returns a proper { data: AttioNote[] } shape
 */
const mockNotesModule = () => {
  vi.mock('../../../../../src/objects/notes.js', () => ({
    listNotes: vi.fn().mockResolvedValue({
      data: [
        {
          id: { note_id: 'note_1' },
          parent_object: 'companies',
          parent_record_id: 'comp-1',
          title: 'Important Meeting',
          content_plaintext:
            'We discussed an important meeting and follow-ups.',
          content_markdown: '# Important meeting notes',
          format: 'markdown',
          created_at: '2024-01-01T00:00:00Z',
          tags: ['meeting'],
        },
        {
          id: { note_id: 'note_2' },
          parent_object: 'people',
          parent_record_id: 'person-1',
          title: 'Weekly sync',
          content_plaintext: 'general updates',
          content_markdown: 'general updates',
          format: 'markdown',
          created_at: '2024-01-02T00:00:00Z',
          tags: [],
        },
      ],
    }),
  }));
};

/**
 * Mock setup for date utilities
 * Used by: advanced-operations.test.ts
 */
export const mockDateUtils = () => {
  vi.mock('../../../../../src/utils/date-utils.js', async (importOriginal) => {
    const actual: any = await importOriginal();
    return {
      ...actual,
      validateAndCreateDateRange: vi.fn((start?: string, end?: string) => {
        // Return a valid date range object for testing
        return MockResponseFactory.createDateRangeResponse(start, end);
      }),
      isValidISODateString: vi.fn((dateString: string) => {
        // Simple validation for testing
        return (
          dateString &&
          typeof dateString === 'string' &&
          DATE_PATTERNS.isoDateRegex.test(dateString)
        );
      }),
    };
  });
};

/**
 * Standard beforeEach setup for unit tests
 * Used by: advanced-operations.test.ts, core-operations.test.ts
 */
export const setupMockHandlers = async () => {
  vi.clearAllMocks();

  // Reset shared handlers to default successful behaviors
  const shared: any = await import(
    '../../../../../src/handlers/tool-configs/universal/shared-handlers.js'
  );
  const {
    handleUniversalSearch,
    handleUniversalGetDetails,
    handleUniversalCreate,
    handleUniversalUpdate,
    handleUniversalDelete,
    formatResourceType,
  } = shared as any;

  // Set up default mock implementations
  // Provide a smarter default for handleUniversalSearch to support timeframe tests
  vi.mocked(handleUniversalSearch).mockImplementation(async (args: any) => {
    // If timeframe-specific params are present for people, route to specialized mock
    if (
      args?.resource_type === 'people' &&
      (args?.timeframe_attribute || args?.start_date || args?.end_date)
    ) {
      // Creation date heuristic: created_at attribute
      if (String(args.timeframe_attribute || '').includes('created')) {
        const res = await (
          mockInstances.mockSpecialized.searchPeopleByCreationDate as any
        )({
          start: args.start_date,
          end: args.end_date,
        });
        return res;
      }
      // Otherwise, fall back to generic search mock
      return await (mockInstances.mockSearchService.searchRecords as any)();
    }
    // Companies timeframe search should use searchRecords mock as tests expect
    if (
      args?.resource_type === 'companies' &&
      (args?.timeframe_attribute || args?.start_date || args?.end_date)
    ) {
      return await (mockInstances.mockSearchService.searchRecords as any)();
    }
    return [];
  });
  vi.mocked(handleUniversalGetDetails).mockResolvedValue({} as any);
  vi.mocked(handleUniversalCreate).mockResolvedValue({} as any);
  vi.mocked(handleUniversalUpdate).mockResolvedValue({} as any);
  vi.mocked(handleUniversalDelete).mockResolvedValue({
    success: true,
    record_id: 'test',
  });

  // Set up formatResourceType with proper mapping
  (vi.mocked as any)(formatResourceType).mockImplementation((type: string) => {
    switch (type) {
      case 'companies':
        return 'company';
      case 'people':
        return 'person';
      case 'records':
        return 'record';
      case 'tasks':
        return 'task';
      default:
        return type;
    }
  });

  // Set up error creation
  if (shared.createUniversalError) {
    (vi.mocked as any)(shared.createUniversalError).mockImplementation(
      (operation: string, resourceType: string, error: any) =>
        new Error(
          `${operation} failed for ${resourceType}: ${error.message || error}`
        )
    );
  }
};

/**
 * Standard beforeEach setup for error service tests
 * Used by: core-operations.test.ts
 */
export const setupMockErrorService = async () => {
  const { ErrorService } = await import(
    '../../../../../src/services/ErrorService.js'
  );

  // Set up default error creation behavior
  (vi.mocked as any)(ErrorService.createUniversalError).mockImplementation(
    (operation: string, resourceType: string, error: any) =>
      new Error(
        `Universal ${operation} failed for resource type ${resourceType}: ${error.message || error}`
      )
  );
};

/**
 * Clean mock setup function
 * Used by: All test files in afterEach
 */
export const cleanupMocks = () => {
  vi.clearAllMocks();
};

/**
 * Complete mock setup for unit tests
 * Combines all necessary mocks for unit testing
 */
export const setupUnitTestMocks = async () => {
  mockSharedHandlers();
  mockSchemasAndValidation();
  mockUniversalSearchService();
  mockSpecializedHandlers();
  mockNotesModule();
  mockDateUtils();
  await initializeMockInstances();
  await setupMockHandlers();
};

/**
 * Complete mock setup for error handling tests
 * Focuses on error service mocks
 */
export const setupErrorTestMocks = () => {
  mockSharedHandlers();
  mockErrorService();
  mockSchemasAndValidation();
};

/**
 * Mock setup configuration object
 * Allows for easy configuration of different mock types
 */
export interface MockSetupConfig {
  sharedHandlers?: boolean;
  errorService?: boolean;
  schemas?: boolean;
  specializedHandlers?: boolean;
  dateUtils?: boolean;
}

/**
 * Configurable mock setup
 * Allows selective mocking based on configuration
 */
export const setupMocksWithConfig = (config: MockSetupConfig) => {
  if (config.sharedHandlers !== false) {
    mockSharedHandlers();
  }

  if (config.errorService) {
    mockErrorService();
  }

  if (config.schemas !== false) {
    mockSchemasAndValidation();
  }

  if (config.specializedHandlers) {
    mockSpecializedHandlers();
  }

  if (config.dateUtils) {
    mockDateUtils();
  }
};

/**
 * Global mock instances to be accessed by tests
 * These are populated during mock setup
 */
let mockInstances: any = {};

/**
 * Initialize mock instances (called by setupUnitTestMocks)
 */
export const initializeMockInstances = async () => {
  const sharedHandlers = await import(
    '../../../../../src/handlers/tool-configs/universal/shared-handlers.js'
  );

  const schemas = await import(
    '../../../../../src/handlers/tool-configs/universal/schemas.js'
  );

  const dateUtils = await import('../../../../../src/utils/date-utils.js');
  const universalSearchService = await import(
    '../../../../../src/services/UniversalSearchService.js'
  );

  const companiesHandlers = await import(
    '../../../../../src/objects/companies/index.js'
  );

  const peopleHandlers = await import(
    '../../../../../src/objects/people/index.js'
  );

  const peopleSearchHandlers = await import(
    '../../../../../src/objects/people/search.js'
  );

  mockInstances = {
    mockHandlers: {
      handleUniversalSearch: sharedHandlers.handleUniversalSearch,
      handleUniversalGetDetails: sharedHandlers.handleUniversalGetDetails,
      handleUniversalCreate: sharedHandlers.handleUniversalCreate,
      handleUniversalUpdate: sharedHandlers.handleUniversalUpdate,
      handleUniversalDelete: sharedHandlers.handleUniversalDelete,
      handleUniversalGetAttributes: sharedHandlers.handleUniversalGetAttributes,
      handleUniversalDiscoverAttributes:
        sharedHandlers.handleUniversalDiscoverAttributes,
      handleUniversalGetDetailedInfo:
        sharedHandlers.handleUniversalGetDetailedInfo,
      formatResourceType: sharedHandlers.formatResourceType,
      getSingularResourceType: sharedHandlers.getSingularResourceType,
      createUniversalError: (sharedHandlers as any).createUniversalError,
    },
    mockSchemas: {
      validateUniversalToolParams: schemas.validateUniversalToolParams,
    },
    mockUtils: {
      validateAndCreateDateRange: dateUtils.validateAndCreateDateRange,
      isValidISODateString: dateUtils.isValidISODateString,
    },
    mockSearchService: {
      searchRecords:
        universalSearchService.UniversalSearchService.searchRecords,
    },
    mockSpecialized: {
      // Companies
      searchCompaniesByNotes: companiesHandlers.searchCompaniesByNotes,
      searchCompaniesByPeople: companiesHandlers.searchCompaniesByPeople,
      advancedSearchCompanies: companiesHandlers.advancedSearchCompanies,
      // People
      searchPeopleByCompany: peopleHandlers.searchPeopleByCompany,
      searchPeopleByActivity: peopleSearchHandlers.searchPeopleByActivity,
      searchPeopleByNotes: peopleHandlers.searchPeopleByNotes,
      advancedSearchPeople: peopleHandlers.advancedSearchPeople,
      searchPeopleByCreationDate:
        peopleSearchHandlers.searchPeopleByCreationDate,
      searchPeopleByModificationDate:
        peopleSearchHandlers.searchPeopleByModificationDate,
      searchPeopleByLastInteraction:
        peopleSearchHandlers.searchPeopleByLastInteraction,
    },
  };
};

/**
 * Utility to get mock instances
 * Provides typed access to mocked functions
 */
export const getMockInstances = () => {
  return mockInstances;
};
