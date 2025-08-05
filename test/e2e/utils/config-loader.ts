/**
 * E2E Test Configuration Loader
 * 
 * Loads and validates configuration from config.local.json with fallbacks
 * to environment variables for CI/CD environments.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface E2ETestData {
  testDataPrefix: string;
  testEmailDomain: string;
  testCompanyDomain: string;
  existingCompanyId?: string | null;
  existingPersonId?: string | null;
  existingListId?: string | null;
}

export interface E2EWorkspace {
  currency: string;
  dealStages: string[];
  customFields: {
    companies: string[];
    people: string[];
  };
}

export interface E2EFeatures {
  skipDealTests: boolean;
  skipTaskTests: boolean;
  skipCustomObjectTests: boolean;
  skipNoteTests: boolean;
  skipListTests: boolean;
}

export interface E2ETestSettings {
  cleanupAfterTests: boolean;
  maxRetries: number;
  retryDelay: number;
  testTimeout: number;
  hookTimeout: number;
  sequentialExecution: boolean;
  verboseLogging: boolean;
}

export interface E2EApiConfig {
  baseUrl: string;
  rateLimit: {
    requestsPerSecond: number;
    burstLimit: number;
  };
}

export interface E2EReporting {
  generateReport: boolean;
  reportFormat: string;
  includeTimings: boolean;
  includeCoverage: boolean;
}

export interface E2EConfig {
  testData: E2ETestData;
  workspace: E2EWorkspace;
  features: E2EFeatures;
  testSettings: E2ETestSettings;
  api: E2EApiConfig;
  reporting: E2EReporting;
}

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: E2EConfig | null = null;
  private readonly configDir: string;

  private constructor() {
    this.configDir = join(process.cwd(), 'test', 'e2e');
  }

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Load configuration from local file or environment variables
   */
  async loadConfig(): Promise<E2EConfig> {
    if (this.config) {
      return this.config;
    }

    const localConfigPath = join(this.configDir, 'config.local.json');
    const templateConfigPath = join(this.configDir, 'config.template.json');

    let config: Partial<E2EConfig>;

    // Try to load local config first
    if (existsSync(localConfigPath)) {
      try {
        const configContent = readFileSync(localConfigPath, 'utf8');
        config = JSON.parse(configContent);
        console.log('Loaded E2E configuration from config.local.json');
      } catch (error) {
        throw new Error(`Failed to parse config.local.json: ${error}`);
      }
    } else {
      // Fall back to template config for CI/CD
      if (existsSync(templateConfigPath)) {
        const templateContent = readFileSync(templateConfigPath, 'utf8');
        config = JSON.parse(templateContent);
        console.log('Loaded E2E configuration from template (CI/CD mode)');
      } else {
        throw new Error('No configuration file found. Please create config.local.json from config.template.json');
      }
    }

    // Override with environment variables
    this.applyEnvironmentOverrides(config);

    // Validate configuration
    this.validateConfig(config as E2EConfig);

    this.config = config as E2EConfig;
    return this.config;
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvironmentOverrides(config: Partial<E2EConfig>): void {
    // API Key (required unless tests are being skipped)
    if (!process.env.ATTIO_API_KEY && process.env.SKIP_E2E_TESTS !== 'true') {
      throw new Error(
        'ATTIO_API_KEY environment variable is required for E2E tests. ' +
        'Set SKIP_E2E_TESTS=true to skip these tests.'
      );
    }

    // Test data overrides
    if (process.env.E2E_TEST_PREFIX) {
      config.testData!.testDataPrefix = process.env.E2E_TEST_PREFIX;
    }

    if (process.env.E2E_TEST_EMAIL_DOMAIN) {
      config.testData!.testEmailDomain = process.env.E2E_TEST_EMAIL_DOMAIN;
    }

    if (process.env.E2E_TEST_COMPANY_DOMAIN) {
      config.testData!.testCompanyDomain = process.env.E2E_TEST_COMPANY_DOMAIN;
    }

    // Existing record IDs for read tests
    if (process.env.E2E_EXISTING_COMPANY_ID) {
      config.testData!.existingCompanyId = process.env.E2E_EXISTING_COMPANY_ID;
    }

    if (process.env.E2E_EXISTING_PERSON_ID) {
      config.testData!.existingPersonId = process.env.E2E_EXISTING_PERSON_ID;
    }

    if (process.env.E2E_EXISTING_LIST_ID) {
      config.testData!.existingListId = process.env.E2E_EXISTING_LIST_ID;
    }

    // Feature flags
    if (process.env.E2E_SKIP_DEAL_TESTS === 'true') {
      config.features!.skipDealTests = true;
    }

    if (process.env.E2E_SKIP_TASK_TESTS === 'true') {
      config.features!.skipTaskTests = true;
    }

    if (process.env.E2E_SKIP_CUSTOM_OBJECT_TESTS === 'true') {
      config.features!.skipCustomObjectTests = true;
    }

    if (process.env.E2E_SKIP_NOTE_TESTS === 'true') {
      config.features!.skipNoteTests = true;
    }

    if (process.env.E2E_SKIP_LIST_TESTS === 'true') {
      config.features!.skipListTests = true;
    }

    // Test settings
    if (process.env.E2E_CLEANUP_AFTER_TESTS) {
      config.testSettings!.cleanupAfterTests = process.env.E2E_CLEANUP_AFTER_TESTS === 'true';
    }

    if (process.env.E2E_MAX_RETRIES) {
      config.testSettings!.maxRetries = parseInt(process.env.E2E_MAX_RETRIES, 10);
    }

    if (process.env.E2E_RETRY_DELAY) {
      config.testSettings!.retryDelay = parseInt(process.env.E2E_RETRY_DELAY, 10);
    }

    if (process.env.E2E_TEST_TIMEOUT) {
      config.testSettings!.testTimeout = parseInt(process.env.E2E_TEST_TIMEOUT, 10);
    }

    if (process.env.E2E_VERBOSE_LOGGING === 'true') {
      config.testSettings!.verboseLogging = true;
    }
  }

  /**
   * Validate configuration completeness and correctness
   */
  private validateConfig(config: E2EConfig): void {
    const errors: string[] = [];

    // Required fields
    if (!config.testData?.testDataPrefix) {
      errors.push('testData.testDataPrefix is required');
    }

    if (!config.testData?.testEmailDomain) {
      errors.push('testData.testEmailDomain is required');
    }

    if (!config.testData?.testCompanyDomain) {
      errors.push('testData.testCompanyDomain is required');
    }

    if (!config.workspace?.currency) {
      errors.push('workspace.currency is required');
    }

    if (!Array.isArray(config.workspace?.dealStages)) {
      errors.push('workspace.dealStages must be an array');
    }

    if (!config.workspace?.customFields?.companies || !Array.isArray(config.workspace.customFields.companies)) {
      errors.push('workspace.customFields.companies must be an array');
    }

    if (!config.workspace?.customFields?.people || !Array.isArray(config.workspace.customFields.people)) {
      errors.push('workspace.customFields.people must be an array');
    }

    // Validate timeouts
    if (config.testSettings?.testTimeout && config.testSettings.testTimeout < 10000) {
      errors.push('testSettings.testTimeout should be at least 10000ms for E2E tests');
    }

    if (config.testSettings?.maxRetries && config.testSettings.maxRetries < 1) {
      errors.push('testSettings.maxRetries should be at least 1');
    }

    // Validate test data prefix
    if (config.testData?.testDataPrefix && !config.testData.testDataPrefix.includes('TEST')) {
      console.warn('Warning: testDataPrefix should contain "TEST" to clearly identify test data');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get loaded configuration (must call loadConfig first)
   */
  getConfig(): E2EConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Check if specific features should be skipped
   */
  shouldSkipFeature(feature: keyof E2EFeatures): boolean {
    const config = this.getConfig();
    return config.features[feature];
  }

  /**
   * Get test data with prefix applied
   */
  getTestIdentifier(suffix: string): string {
    const config = this.getConfig();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `${config.testData.testDataPrefix}${suffix}_${timestamp}_${random}`;
  }

  /**
   * Get test email address
   */
  getTestEmail(prefix: string = 'test'): string {
    const config = this.getConfig();
    const identifier = this.getTestIdentifier(prefix);
    return `${identifier}${config.testData.testEmailDomain}`;
  }

  /**
   * Get test company domain
   */
  getTestCompanyDomain(): string {
    const config = this.getConfig();
    const identifier = this.getTestIdentifier('company');
    return `${identifier}.${config.testData.testCompanyDomain}`;
  }

  /**
   * Reset configuration (for testing)
   */
  reset(): void {
    this.config = null;
  }
}

/**
 * Singleton instance accessor
 */
export const configLoader = ConfigLoader.getInstance();

/**
 * Helper function to load configuration
 */
export async function loadE2EConfig(): Promise<E2EConfig> {
  return await configLoader.loadConfig();
}

/**
 * Helper function to get configuration
 */
export function getE2EConfig(): E2EConfig {
  return configLoader.getConfig();
}