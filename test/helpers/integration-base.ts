/**
 * Base class for integration tests with proper setup/teardown
 * Handles API client initialization and test data cleanup
 */
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import {
  getAttioClient,
  initializeAttioClient,
} from '../../src/api/attio-client.js';

export interface IntegrationTestConfig {
  skipApiKey?: boolean;
  timeout?: number;
  cleanupObjects?: string[];
  requiresRealApi?: boolean;
}

export class IntegrationTestBase {
  protected static createdObjects: { type: string; id: string }[] = [];
  protected static config: IntegrationTestConfig;

  /**
   * Set up integration test environment
   */
  static setup(config: IntegrationTestConfig = {}) {
    IntegrationTestBase.config = {
      skipApiKey: false,
      timeout: 30_000,
      cleanupObjects: ['companies', 'people', 'notes'],
      requiresRealApi: true,
      ...config,
    };

    beforeAll(async () => {
      await IntegrationTestBase.beforeAllSetup();
    }, IntegrationTestBase.config.timeout);

    afterAll(async () => {
      await IntegrationTestBase.afterAllCleanup();
    }, IntegrationTestBase.config.timeout);

    beforeEach(async () => {
      await IntegrationTestBase.beforeEachSetup();
    });

    afterEach(async () => {
      await IntegrationTestBase.afterEachCleanup();
    });
  }

  private static async beforeAllSetup() {
    if (
      !IntegrationTestBase.config.skipApiKey &&
      IntegrationTestBase.config.requiresRealApi
    ) {
      // Check for API key
      if (!process.env.ATTIO_API_KEY) {
        if (process.env.SKIP_INTEGRATION_TESTS === 'true') {
          console.log('Skipping integration tests - no API key provided');
          return;
        }
        throw new Error(
          'ATTIO_API_KEY environment variable is required for integration tests. ' +
            'Set SKIP_INTEGRATION_TESTS=true to skip these tests.'
        );
      }

      // Initialize API client
      try {
        await initializeAttioClient();
        console.log('API client initialized for integration tests');
      } catch (error) {
        console.error('Failed to initialize API client:', error);
        throw error;
      }
    }
  }

  private static async afterAllCleanup() {
    if (
      IntegrationTestBase.config.requiresRealApi &&
      IntegrationTestBase.createdObjects.length > 0
    ) {
      console.log(
        `Cleaning up ${IntegrationTestBase.createdObjects.length} test objects...`
      );

      const client = getAttioClient();
      const cleanupPromises = IntegrationTestBase.createdObjects.map(
        async (obj) => {
          try {
            await client.delete(`/objects/${obj.type}/records/${obj.id}`);
            console.log(`Cleaned up ${obj.type}:${obj.id}`);
          } catch (error) {
            // Ignore cleanup errors (object might already be deleted)
            console.warn(`Failed to cleanup ${obj.type}:${obj.id}:`, error);
          }
        }
      );

      await Promise.allSettled(cleanupPromises);
      IntegrationTestBase.createdObjects = [];
    }
  }

  private static async beforeEachSetup() {
    // Reset any per-test state
  }

  private static async afterEachCleanup() {
    // Clean up any per-test objects if needed
  }

  /**
   * Track an object for cleanup after tests
   */
  static trackForCleanup(type: string, id: string) {
    IntegrationTestBase.createdObjects.push({ type, id });
  }

  /**
   * Skip test if API key is not available
   */
  static skipIfNoApiKey() {
    if (!process.env.ATTIO_API_KEY) {
      console.log('Skipping test - no API key provided');
      return true;
    }
    return false;
  }

  /**
   * Create a unique test identifier
   */
  static createTestId(prefix = 'test'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Wait for a condition to be true with timeout
   */
  static async waitFor(
    condition: () => Promise<boolean> | boolean,
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Retry an operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts) {
          throw lastError;
        }

        const delay = baseDelay * 2 ** (attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

/**
 * Utility class for mocking integration test responses
 */
export class IntegrationTestMocks {
  /**
   * Create a mock company for testing
   */
  static async createTestCompany(attributes: any = {}): Promise<any> {
    const testId = IntegrationTestBase.createTestId('company');
    const company = {
      name: `Test Company ${testId}`,
      website: `https://${testId}.com`,
      ...attributes,
    };

    try {
      const client = getAttioClient();
      const response = await client.post('/objects/companies/records', {
        data: { values: company },
      });

      const companyId = response.data.id.record_id;
      IntegrationTestBase.trackForCleanup('companies', companyId);

      return response.data;
    } catch (error) {
      console.error('Failed to create test company:', error);
      throw error;
    }
  }

  /**
   * Create a mock person for testing
   */
  static async createTestPerson(attributes: any = {}): Promise<any> {
    const testId = IntegrationTestBase.createTestId('person');
    const person = {
      name: `Test Person ${testId}`,
      email_addresses: [`test_${testId}@example.com`],
      ...attributes,
    };

    try {
      const client = getAttioClient();
      const response = await client.post('/objects/people/records', {
        data: { values: person },
      });

      const personId = response.data.id.record_id;
      IntegrationTestBase.trackForCleanup('people', personId);

      return response.data;
    } catch (error) {
      console.error('Failed to create test person:', error);
      throw error;
    }
  }

  /**
   * Create a mock note for testing
   */
  static async createTestNote(
    parentObject: string,
    parentRecordId: string,
    attributes: any = {}
  ): Promise<any> {
    const testId = IntegrationTestBase.createTestId('note');
    const note = {
      title: `Test Note ${testId}`,
      content: `Test note content ${testId}`,
      format: 'plaintext',
      parent_object: parentObject,
      parent_record_id: parentRecordId,
      ...attributes,
    };

    try {
      const client = getAttioClient();
      const response = await client.post('/notes', { data: note });

      const noteId = response.data.id.note_id;
      IntegrationTestBase.trackForCleanup('notes', noteId);

      return response.data;
    } catch (error) {
      console.error('Failed to create test note:', error);
      throw error;
    }
  }
}
