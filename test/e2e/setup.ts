/**
 * E2E Test Setup and Initialization
 *
 * Provides setup utilities for E2E tests including environment validation,
 * API client initialization, and test data preparation.
 */
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  loadE2EConfig,
  getE2EConfig,
  type E2EConfig,
} from './utils/config-loader.js';
import {
  initializeAttioClient,
  getAttioClient,
} from '../../src/api/attio-client.js';
import type { AxiosInstance } from 'axios';
import type { AnyTestData } from './types/index.js';

export interface E2ESetupOptions {
  skipApiKey?: boolean;
  requiresRealApi?: boolean;
  cleanupAfterTests?: boolean;
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
}

export interface CreatedTestObject {
  type: 'company' | 'person' | 'list' | 'task' | 'note';
  id: string;
  data?: AnyTestData;
  createdAt: Date;
}

/**
 * Enhanced E2E Test Base class extending the existing integration base
 */
export class E2ETestBase {
  protected static config: E2EConfig;
  protected static apiClient: AxiosInstance;
  protected static createdObjects: CreatedTestObject[] = [];
  protected static setupOptions: E2ESetupOptions;

  /**
   * Setup E2E test environment with configuration
   */
  static async setup(options: E2ESetupOptions = {}): Promise<void> {
    this.setupOptions = {
      skipApiKey: false,
      requiresRealApi: true,
      cleanupAfterTests: true,
      timeout: 60000,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
      },
      ...options,
    };

    beforeAll(async () => {
      await this.beforeAllSetup();
    }, this.setupOptions.timeout);

    afterAll(async () => {
      await this.afterAllCleanup();
    }, this.setupOptions.timeout);

    beforeEach(async () => {
      await this.beforeEachSetup();
    });

    afterEach(async () => {
      await this.afterEachCleanup();
    });
  }

  /**
   * Global setup before all tests
   */
  private static async beforeAllSetup(): Promise<void> {
    console.log('🚀 Starting E2E test setup...');

    // Load and validate configuration
    try {
      this.config = await loadE2EConfig();
      console.log('✅ E2E configuration loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load E2E configuration:', error);
      throw error;
    }

    // Skip API setup if requested or no API key
    if (this.shouldSkipApiSetup()) {
      console.log('⚠️  Skipping API setup - no API key or skip flag set');
      return;
    }

    // Initialize API client
    try {
      await initializeAttioClient();
      this.apiClient = getAttioClient();
      console.log('✅ Attio API client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize API client:', error);
      throw error;
    }

    // Validate API connectivity
    try {
      await this.validateApiConnectivity();
      console.log('✅ API connectivity validated');
    } catch (error) {
      console.error('❌ API connectivity validation failed:', error);
      throw error;
    }
  }

  /**
   * Global cleanup after all tests
   */
  private static async afterAllCleanup(): Promise<void> {
    if (
      !this.setupOptions.cleanupAfterTests ||
      !this.config?.testSettings.cleanupAfterTests
    ) {
      console.log('⚠️  Skipping cleanup - disabled in configuration');
      return;
    }

    if (this.createdObjects.length === 0) {
      console.log('✅ No test objects to clean up');
      return;
    }

    console.log(`🧹 Cleaning up ${this.createdObjects.length} test objects...`);

    const cleanupResults = await Promise.allSettled(
      this.createdObjects.map((obj) => this.cleanupObject(obj))
    );

    const successful = cleanupResults.filter(
      (r) => r.status === 'fulfilled'
    ).length;
    const failed = cleanupResults.filter((r) => r.status === 'rejected').length;

    console.log(
      `✅ Cleanup completed: ${successful} successful, ${failed} failed`
    );

    if (failed > 0) {
      console.warn(
        '⚠️  Some cleanup operations failed - manual cleanup may be required'
      );
    }

    // Reset state
    this.createdObjects = [];
  }

  /**
   * Setup before each test
   */
  private static async beforeEachSetup(): Promise<void> {
    // Reset any per-test state if needed
    if (this.config?.testSettings.verboseLogging) {
      console.log('🧪 Starting test case...');
    }
  }

  /**
   * Cleanup after each test
   */
  private static async afterEachCleanup(): Promise<void> {
    // Optional per-test cleanup
    if (this.config?.testSettings.verboseLogging) {
      console.log('✅ Test case completed');
    }
  }

  /**
   * Check if API setup should be skipped
   */
  private static shouldSkipApiSetup(): boolean {
    return (
      this.setupOptions.skipApiKey ||
      !this.setupOptions.requiresRealApi ||
      !process.env.ATTIO_API_KEY ||
      process.env.SKIP_E2E_TESTS === 'true'
    );
  }

  /**
   * Validate API connectivity
   */
  private static async validateApiConnectivity(): Promise<void> {
    try {
      // Simple API call to validate connectivity
      const response = await this.apiClient.get('/objects');

      if (!response.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid API response structure');
      }

      console.log(
        `📊 API validation: Found ${response.data.data.length} objects`
      );
    } catch (error) {
      throw new Error(`API connectivity validation failed: ${error}`);
    }
  }

  /**
   * Track created object for cleanup
   */
  static trackForCleanup(
    type: CreatedTestObject['type'],
    id: string,
    data?: AnyTestData
  ): void {
    this.createdObjects.push({
      type,
      id,
      data,
      createdAt: new Date(),
    });

    if (this.config?.testSettings.verboseLogging) {
      console.log(`📝 Tracking ${type}:${id} for cleanup`);
    }
  }

  /**
   * Cleanup a single test object
   */
  private static async cleanupObject(obj: CreatedTestObject): Promise<void> {
    try {
      switch (obj.type) {
        case 'company':
          await this.apiClient.delete(`/objects/companies/records/${obj.id}`);
          break;
        case 'person':
          await this.apiClient.delete(`/objects/people/records/${obj.id}`);
          break;
        case 'list':
          await this.apiClient.delete(`/lists/${obj.id}`);
          break;
        case 'task':
          await this.apiClient.delete(`/tasks/${obj.id}`);
          break;
        case 'note':
          await this.apiClient.delete(`/notes/${obj.id}`);
          break;
        default:
          console.warn(`Unknown object type for cleanup: ${obj.type}`);
      }

      if (this.config?.testSettings.verboseLogging) {
        console.log(`🗑️  Cleaned up ${obj.type}:${obj.id}`);
      }
    } catch (error) {
      // Log warning but don't fail - object might already be deleted
      console.warn(`⚠️  Failed to cleanup ${obj.type}:${obj.id}:`, error);
    }
  }

  /**
   * Retry an operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries?: number,
    baseDelay?: number
  ): Promise<T> {
    const retries =
      maxRetries ?? this.setupOptions.retryConfig?.maxRetries ?? 3;
    const delay =
      baseDelay ?? this.setupOptions.retryConfig?.retryDelay ?? 1000;

    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === retries) {
          throw lastError;
        }

        const backoffDelay = delay * Math.pow(2, attempt - 1);
        console.log(
          `⏳ Attempt ${attempt} failed, retrying in ${backoffDelay}ms...`
        );
        await this.sleep(backoffDelay);
      }
    }

    throw lastError!;
  }

  /**
   * Wait for a condition to be true
   */
  static async waitFor(
    condition: () => Promise<boolean> | boolean,
    timeout: number = 10000,
    interval: number = 500
  ): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await this.sleep(interval);
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create unique test identifier
   */
  static createTestId(prefix: string = 'test'): string {
    const config = getE2EConfig();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${config.testData.testDataPrefix}${prefix}_${timestamp}_${random}`;
  }

  /**
   * Get configuration
   */
  static getConfig(): E2EConfig {
    return this.config;
  }

  /**
   * Get API client
   */
  static getApiClient(): AxiosInstance {
    if (!this.apiClient) {
      throw new Error('API client not initialized. Ensure setup() was called.');
    }
    return this.apiClient;
  }

  /**
   * Skip test if feature is disabled
   */
  static skipIfFeatureDisabled(feature: keyof E2EConfig['features']): boolean {
    if (this.config?.features[feature]) {
      console.log(`⏭️  Skipping test - ${feature} is disabled`);
      return true;
    }
    return false;
  }

  /**
   * Skip test if API key is not available
   */
  static skipIfNoApiKey(): boolean {
    if (!process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true') {
      console.log(
        '⏭️  Skipping test - no API key provided or E2E tests disabled'
      );
      return true;
    }
    return false;
  }

  /**
   * Get execution timing information
   */
  static async measureExecutionTime<T>(operation: () => Promise<T>): Promise<{
    result: T;
    executionTime: number;
  }> {
    const start = Date.now();
    const result = await operation();
    const executionTime = Date.now() - start;

    return { result, executionTime };
  }

  /**
   * Rate limit API calls
   */
  static async rateLimitedCall<T>(operation: () => Promise<T>): Promise<T> {
    const config = this.getConfig();
    const { requestsPerSecond } = config.api.rateLimit;
    const delay = 1000 / requestsPerSecond;

    // Simple rate limiting - wait before operation
    await this.sleep(delay);
    return await operation();
  }
}

/**
 * Utility functions for E2E test setup
 */
export class E2ESetupUtils {
  /**
   * Validate E2E test environment
   */
  static async validateEnvironment(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required environment variables
    if (!process.env.ATTIO_API_KEY) {
      errors.push('ATTIO_API_KEY environment variable is required');
    }

    // Check configuration file
    try {
      await loadE2EConfig();
    } catch (error) {
      errors.push(`Configuration error: ${error}`);
    }

    // Check for workspace-specific settings
    const config = getE2EConfig();
    if (!config.workspace.customFields.companies.length) {
      warnings.push(
        'No custom company fields configured - some tests may be limited'
      );
    }

    if (!config.workspace.customFields.people.length) {
      warnings.push(
        'No custom people fields configured - some tests may be limited'
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Setup configuration interactively (for CLI usage)
   */
  static async setupConfigurationInteractively(): Promise<void> {
    // This would be implemented for CLI setup
    console.log('Interactive configuration setup would be implemented here');
    throw new Error('Interactive setup not yet implemented');
  }

  /**
   * Generate test report
   */
  static generateTestReport(results: any[]): string {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passed: results.filter((r) => r.status === 'passed').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      results,
    };

    return JSON.stringify(report, null, 2);
  }
}

/**
 * Default export for easy import
 */
export default E2ETestBase;
