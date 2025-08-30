/**
 * Centralized mock data patterns for universal tool tests
 *
 * This file follows the mock factory pattern from /test/utils/mock-factories/
 * and provides consistent test data structures across universal test files.
 *
 * IMPORTANT: This file contains ONLY test data and should never be imported
 * by production code. It follows the clean architecture separation enforced
 * in the project.
 */

import { TEST_DATA_PATTERNS } from './test-constants.js';

// Base mock error structure
export interface MockError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Mock Record Factories
 * These follow the mock factory pattern and create consistent test data
 */

export const MockRecordFactory = {
  /**
   * Create a mock company record
   */
  createCompany: (
    overrides: Partial<{
      id: string;
      name: string;
      website: string;
      industry: string;
      location: string;
    }> = {}
  ): MockRecord => {

    return {
      id: { record_id: id },
      values: {
        name: [{ value: overrides.name || `Test Company ${timestamp}` }],
        website: [
          { value: overrides.website || `https://test-${timestamp}.com` },
        ],
        industry: [{ value: overrides.industry || 'Technology' }],
        ...(overrides.location && {
          location: [{ value: overrides.location }],
        }),
      },
    };
  },

  /**
   * Create a mock person record
   */
  createPerson: (
    overrides: Partial<{
      id: string;
      name: string;
      email: string;
      company?: string;
    }> = {}
  ): MockRecord => {

    return {
      id: { record_id: id },
      values: {
        name: [{ value: overrides.name || `Test Person ${timestamp}` }],
        email_addresses: [
          {
            email_address: overrides.email || `test-${timestamp}@example.com`,
          },
        ],
        ...(overrides.company && {
          company: [{ value: overrides.company }],
        }),
      },
    };
  },

  /**
   * Create a mock task record
   */
  createTask: (
    overrides: Partial<{
      id: string;
      title: string;
      content: string;
      status?: string;
    }> = {}
  ): MockRecord => {

    return {
      id: { record_id: id },
      values: {
        title: [{ value: overrides.title || `Test Task ${timestamp}` }],
        content: [
          { value: overrides.content || `Test task content ${timestamp}` },
        ],
        status: [{ value: overrides.status || 'open' }],
      },
    };
  },

  /**
   * Create multiple mock records of the same type
   */
  createMultiple: <T extends MockRecord>(
    factory: () => T,
    count: number
  ): T[] => {
    return Array(count)
      .fill(0)
      .map(() => factory());
  },

  /**
   * Create advanced company record with more fields
   */
  createAdvancedCompany: (
    overrides: Partial<{
      id: string;
      name: string;
      website: string;
      industry: string;
      location: string;
      employees?: number;
      founded?: string;
    }> = {}
  ): MockRecord => {

    if (overrides.employees !== undefined) {
      base.values.employees = [{ value: overrides.employees }];
    }
    if (overrides.founded) {
      base.values.founded = [{ value: overrides.founded }];
    }

    return base;
  },
};

/**
 * Mock Parameter Factories
 * These create consistent parameter objects for different operations
 */

export const MockParamsFactory = {
  /**
   * Create mock search parameters
   */
  createSearchParams: (
    overrides: Partial<UniversalSearchParams> = {}
  ): UniversalSearchParams => ({
    resource_type: UniversalResourceType.COMPANIES,
    query: 'test',
    limit: 10,
    ...overrides,
  }),

  /**
   * Create mock record details parameters
   */
  createDetailsParams: (
    overrides: Partial<UniversalRecordDetailsParams> = {}
  ): UniversalRecordDetailsParams => ({
    resource_type: UniversalResourceType.COMPANIES,
    record_id: 'test-record-id',
    ...overrides,
  }),

  /**
   * Create mock create parameters
   */
  createCreateParams: (
    overrides: Partial<UniversalCreateParams> = {}
  ): UniversalCreateParams => ({
    resource_type: UniversalResourceType.COMPANIES,
    record_data: {
      name: 'Test Company',
      website: 'https://test.com',
    },
    return_details: true,
    ...overrides,
  }),

  /**
   * Create mock update parameters
   */
  createUpdateParams: (
    overrides: Partial<UniversalUpdateParams> = {}
  ): UniversalUpdateParams => ({
    resource_type: UniversalResourceType.COMPANIES,
    record_id: 'test-record-id',
    record_data: {
      name: 'Updated Test Company',
    },
    return_details: true,
    ...overrides,
  }),

  /**
   * Create mock delete parameters
   */
  createDeleteParams: (
    overrides: Partial<UniversalDeleteParams> = {}
  ): UniversalDeleteParams => ({
    resource_type: UniversalResourceType.COMPANIES,
    record_id: 'test-record-id',
    ...overrides,
  }),

  /**
   * Create mock advanced search parameters
   */
  createAdvancedSearchParams: (
    overrides: Partial<AdvancedSearchParams> = {}
  ): AdvancedSearchParams => ({
    resource_type: UniversalResourceType.COMPANIES,
    query: 'technology',
    filters: [
      {
        attribute: { slug: 'industry' },
        condition: 'equals',
        value: 'Technology',
      },
    ],
    sort_by: 'name',
    sort_order: 'asc',
    limit: 20,
    ...overrides,
  }),

  /**
   * Create mock relationship search parameters
   */
  createRelationshipSearchParams: (
    overrides: Partial<RelationshipSearchParams> = {}
  ): RelationshipSearchParams => ({
    resource_type: UniversalResourceType.PEOPLE,
    relationship_type: RelationshipType.BELONGS_TO,
    related_resource_type: UniversalResourceType.COMPANIES,
    related_record_id: 'company-123',
    ...overrides,
  }),

  /**
   * Create mock content search parameters
   */
  createContentSearchParams: (
    overrides: Partial<ContentSearchParams> = {}
  ): ContentSearchParams => ({
    resource_type: UniversalResourceType.COMPANIES,
    content_type: ContentSearchType.NOTES,
    search_query: 'important meeting',
    ...overrides,
  }),

  /**
   * Create mock timeframe search parameters
   */
  createTimeframeSearchParams: (
    overrides: Partial<TimeframeSearchParams> = {}
  ): TimeframeSearchParams => ({
    resource_type: UniversalResourceType.COMPANIES,
    timeframe_type: TimeframeType.CREATED,
    start_date: '2024-01-01T00:00:00.000Z',
    end_date: '2024-01-31T23:59:59.999Z',
    ...overrides,
  }),

  /**
   * Create mock batch operations parameters
   */
  createBatchOperationsParams: (
    overrides: Partial<BatchOperationsParams> = {}
  ): BatchOperationsParams => ({
    resource_type: UniversalResourceType.COMPANIES,
    operation_type: BatchOperationType.CREATE,
    records: [
      {
        name: 'Batch Test Company 1',
        website: 'https://batch1.com',
      },
      {
        name: 'Batch Test Company 2',
        website: 'https://batch2.com',
      },
    ],
    ...overrides,
  }),
};

/**
 * Mock Response Factories
 * These create consistent response objects that match API responses
 */

export const MockResponseFactory = {
  /**
   * Create a successful search response
   */
  createSearchResponse: (records: MockRecord[] = []): MockRecord[] => records,

  /**
   * Create a successful details response
   */
  createDetailsResponse: (record?: MockRecord): MockRecord =>
    record || MockRecordFactory.createCompany(),

  /**
   * Create a successful delete response
   */
  createDeleteResponse: (
    recordId: string = 'test-record-id'
  ): { success: true; record_id: string } => ({
    success: true,
    record_id: recordId,
  }),

  /**
   * Create a batch operation response
   */
  createBatchResponse: (
    results: Array<{ success: boolean; result?: unknown; error?: string }>
  ) => results,

  /**
   * Create date range response (for date utils)
   */
  createDateRangeResponse: (start?: string, end?: string) => ({
    start: start || '2024-01-01T00:00:00.000Z',
    end: end || '2024-01-31T23:59:59.999Z',
  }),
};

/**
 * Mock Error Factories
 * These create consistent error objects for testing error scenarios
 */

export const MockErrorFactory = {
  /**
   * Create a generic API error
   */
  createApiError: (
    message: string = 'API error',
    code?: string
  ): MockError => ({
    message,
    ...(code && { code }),
    status: 500,
  }),

  /**
   * Create a validation error
   */
  createValidationError: (
    message: string = 'Validation failed'
  ): MockError => ({
    message,
    code: 'VALIDATION_ERROR',
    status: 400,
  }),

  /**
   * Create a not found error
   */
  createNotFoundError: (resourceType: string = 'record'): MockError => ({
    message: `${resourceType} not found`,
    code: 'NOT_FOUND',
    status: 404,
  }),

  /**
   * Create a rate limit error
   */
  createRateLimitError: (): MockError => ({
    message: 'Rate limit exceeded',
    code: 'RATE_LIMIT',
    status: 429,
  }),
};

/**
 * Integration Test Data Factories
 * These create data specifically for integration and performance tests
 */

export const IntegrationDataFactory = {
  /**
   * Generate unique test identifiers for integration tests
   */
  generateTestIdentifiers: () => {

    return {
      timestamp,
      randomId,
      companyName: `Universal Test Company ${timestamp}-${randomId}`,
      personEmail: `universal-test-${timestamp}-${randomId}@example.com`,
      domain: `universal-test-${timestamp}-${randomId}.com`,
      personName: `Universal Test Person ${timestamp}`,
    };
  },

  /**
   * Create performance test records
   */
  createPerformanceTestRecords: (
    count: number,
    prefix: string = 'Perf Test'
  ) => {

    return Array(count)
      .fill(0)
      .map((_, i) => ({
        name: `${prefix} Company ${count}-${timestamp}-${i}`,
        website: `https://${prefix.toLowerCase().replace(/\s+/g, '')}${count}-${timestamp}-${i}.com`,
        industry: 'Technology',
      }));
  },
};
