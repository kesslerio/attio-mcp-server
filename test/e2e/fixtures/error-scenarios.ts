/**
 * Error Scenarios Test Data Fixtures
 * 
 * Test data specifically designed for error handling scenarios including:
 * - Invalid data formats
 * - Edge case values
 * - Unicode and special character test data
 * - Malformed data structures
 */

import { createTestUuid } from '../utils/error-handling-utils.js';

export const errorScenarios = {
  /**
   * Invalid record IDs for testing not found scenarios
   */
  invalidIds: {
    company: createTestUuid('1'),
    person: createTestUuid('2'),
    task: createTestUuid('3'),
    list: createTestUuid('4'),
    note: createTestUuid('5'),
    generic: createTestUuid('0'),
    batch: [
      createTestUuid('6'),
      createTestUuid('7'),
      createTestUuid('8'),
    ],
  },

  /**
   * Unicode and special character test data
   * Note: Contains intentional Unicode strings for internationalization testing
   * cspell:disable-next-line
   */
  unicodeData: {
    company: {
      name: '🏢 Test Company™ ñoñó 中文 العربية',
      description: 'Company with special chars: <script>alert("test")</script> & symbols',
    },
    person: {
      first_name: 'José María',
      last_name: 'González-López',
      email_address: 'test@compañía.com',
    },
    task: {
      title: '📝 Task with émojis & spëcial chârs',
      content: 'Content with 中文 characters and العربية text',
    },
  },

  /**
   * Invalid data formats for validation testing
   */
  invalidFormats: {
    email: {
      malformed: 'definitely_not_a_valid_email_format',
      missing: null,
      empty: '',
    },
    dates: {
      invalid: 'not_a_valid_date_format_12345',
      malformed: '2024-13-45T25:99:99Z',
      empty: '',
    },
    urls: {
      malformed: 'not-a-valid-url-format',
      dangerous: 'javascript:alert("test")',
      empty: '',
    },
  },

  /**
   * Extreme value testing data
   */
  extremeValues: {
    text: {
      veryLong: 'A'.repeat(50000), // 50k characters
      empty: '',
      null: null,
      undefined: undefined,
    },
    numbers: {
      negative: -999999,
      zero: 0,
      veryLarge: 999999999999,
      decimal: 123.456789,
    },
    arrays: {
      empty: [],
      large: Array.from({ length: 1000 }, (_, i) => `Item ${i}`),
    },
  },

  /**
   * Memory-intensive test data
   */
  memoryIntensive: {
    largeNote: {
      title: 'Memory Test Note',
      content: 'Large content for memory test.\n'.repeat(1000),
      format: 'plaintext' as const,
    },
    complexObject: {
      name: 'Complex Test Company',
      custom_fields: {
        level1: {
          level2: {
            level3: {
              level4: {
                data: 'deeply nested object structure',
                array: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `Item ${i}` })),
              },
            },
          },
        },
      },
    },
  },

  /**
   * Malformed JSON-like data
   */
  malformedData: {
    company: {
      name: '{"malformed": json"}', // Nested JSON string
      description: 'Normal description',
      custom_fields: {
        weird_data: {
          deeply: { nested: { object: 'with very long chain' } },
        },
      },
    },
    task: {
      title: null as any,
      content: undefined as any,
      due_date: 'not_a_date',
    },
  },

  /**
   * Resource linking test data
   */
  relationships: {
    nonExistentLinks: [
      {
        record_type: 'companies',
        record_id: createTestUuid('6'),
      },
      {
        record_type: 'people', 
        record_id: createTestUuid('7'),
      },
    ],
    circularReference: {
      task: {
        title: 'Circular Relationship Test Task',
        content: 'Testing circular relationships',
      },
    },
  },

  /**
   * Rate limiting and performance test queries
   */
  performanceTests: {
    complexQuery: 'a'.repeat(1000), // Very long query
    emptyQuery: '',
    specialCharsQuery: '!@#$%^&*()_+{}:"<>?[]\\;\',./',
    rapidTestQueries: Array.from({ length: 10 }, (_, i) => `rapid_test_${i}`),
  },

  /**
   * Batch operation test data
   */
  batchOperations: {
    mixedValidInvalid: [
      { resource_type: 'companies', record_id: 'valid_will_be_replaced' },
      { resource_type: 'companies', record_id: createTestUuid('7') },
      { resource_type: 'people', record_id: 'valid_will_be_replaced' },
    ],
    allInvalid: [
      { resource_type: 'companies', record_id: createTestUuid('8') },
      { resource_type: 'people', record_id: createTestUuid('9') },
      { resource_type: 'tasks', record_id: createTestUuid('0') },
    ],
  },

  /**
   * Authentication and authorization test data
   */
  authTests: {
    invalidTokenScenarios: {
      // These would be used if testing with different API keys
      malformed: 'invalid_token_format',
      expired: 'expired_token_12345',
      revoked: 'revoked_token_67890',
    },
  },

  /**
   * Concurrent operation test data
   */
  concurrency: {
    sameRecordUpdates: [
      { description: 'Update 1' },
      { description: 'Update 2' },
      { description: 'Update 3' },
    ],
    rapidRequests: Array.from({ length: 5 }, (_, i) => ({
      resource_type: 'companies',
      query: `rapid_test_${i}`,
      limit: 10,
    })),
  },
};

/**
 * Test data generators for error scenarios
 */
export const errorDataGenerators = {
  /**
   * Generates invalid company data
   */
  invalidCompany: () => ({
    name: null,
    description: undefined,
    domain: '',
    email: errorScenarios.invalidFormats.email.malformed,
  }),

  /**
   * Generates invalid person data
   */
  invalidPerson: () => ({
    first_name: '',
    last_name: null,
    email_address: errorScenarios.invalidFormats.email.malformed,
    phone: 'invalid-phone-format',
  }),

  /**
   * Generates invalid task data
   */
  invalidTask: () => ({
    title: null,
    content: undefined,
    due_date: errorScenarios.invalidFormats.dates.invalid,
    status: 'invalid_status_value',
  }),

  /**
   * Generates large content for memory testing
   */
  largeContent: (size: number = 1000) => ({
    title: 'Large Content Test',
    content: errorScenarios.memoryIntensive.largeNote.content,
    description: 'Test content.\n'.repeat(size),
  }),

  /**
   * Generates deeply nested object
   */
  deeplyNested: (depth: number = 10) => {
    let nested: any = { value: 'deep value' };
    for (let i = 0; i < depth; i++) {
      nested = { [`level${i}`]: nested };
    }
    return {
      name: 'Deeply Nested Test',
      custom_fields: nested,
    };
  },
};

export default errorScenarios;