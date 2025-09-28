/**
 * Unified client configuration and environment mode handling
 * Consolidates complex environment logic from getAttioClient into clean patterns
 */

export enum ClientMode {
  PRODUCTION = 'production',
  E2E = 'e2e',
  E2E_RAW = 'e2e_raw',
  TEST = 'test',
}

export interface InterceptorConfig {
  prefix?: string;
  enableDiagnostics?: boolean;
  enableErrorHandling?: boolean;
}

export interface ClientConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  mode?: ClientMode;
  interceptors?: InterceptorConfig;
  /** Force bypass of cached instances (used in E2E) */
  bypassCache?: boolean;
}

/**
 * Handles environment mode detection and client configuration
 * Extracted from the 80+ line getAttioClient function
 */
export class EnvironmentModeHandler {
  /**
   * Determines the client mode based on environment variables
   */
  static determineMode(): ClientMode {
    const isE2E = process.env.E2E_MODE === 'true';
    const useMocks =
      process.env.USE_MOCK_DATA === 'true' ||
      process.env.OFFLINE_MODE === 'true';
    const isTest = process.env.NODE_ENV === 'test';

    if (isE2E && !useMocks) {
      return ClientMode.E2E;
    }

    if (isTest || useMocks) {
      return ClientMode.TEST;
    }

    return ClientMode.PRODUCTION;
  }

  /**
   * Should we use the real Attio API client (not mocks)
   */
  static shouldUseRealClient(): boolean {
    const isE2E = process.env.E2E_MODE === 'true';
    const useMocks =
      process.env.USE_MOCK_DATA === 'true' ||
      process.env.OFFLINE_MODE === 'true';

    return isE2E && !useMocks;
  }

  /**
   * Get the appropriate client configuration based on environment
   */
  static getClientConfig(opts?: { rawE2E?: boolean }): ClientConfig {
    const mode = this.determineMode();
    const shouldBypassCache = this.shouldUseRealClient() || opts?.rawE2E;

    // Determine if we need raw E2E mode (no interceptors, bypass cache)
    const actualMode = opts?.rawE2E ? ClientMode.E2E_RAW : mode;

    const baseConfig: ClientConfig = {
      baseURL: (
        process.env.ATTIO_BASE_URL || 'https://api.attio.com/v2'
      ).replace(/\/+$/, ''),
      timeout: 20000, // Standardized timeout
      mode: actualMode,
      bypassCache: shouldBypassCache,
    };

    // Configure interceptors based on mode
    switch (actualMode) {
      case ClientMode.E2E:
        baseConfig.interceptors = {
          prefix: 'E2E',
          enableDiagnostics: true,
          enableErrorHandling: true,
        };
        break;

      case ClientMode.E2E_RAW:
        baseConfig.interceptors = {
          prefix: 'E2E-RAW',
          enableDiagnostics: true,
          enableErrorHandling: true,
        };
        break;

      case ClientMode.TEST:
        baseConfig.interceptors = {
          prefix: 'TEST',
          enableDiagnostics: false,
          enableErrorHandling: true,
        };
        break;

      default:
        baseConfig.interceptors = {
          prefix: '',
          enableDiagnostics: true,
          enableErrorHandling: true,
        };
    }

    return baseConfig;
  }

  /**
   * Get standard timeout value (eliminates 30s vs 20s inconsistency)
   */
  static getStandardTimeout(): number {
    return 20000;
  }

  /**
   * Get default base URL
   */
  static getDefaultBaseURL(): string {
    return (process.env.ATTIO_BASE_URL || 'https://api.attio.com/v2').replace(
      /\/+$/,
      ''
    );
  }
}
