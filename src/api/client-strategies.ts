/**
 * Client creation strategies for different environments
 * Implements strategy pattern to handle production, E2E, and test modes
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { debug } from '@/utils/logger.js';
import { configureStandardInterceptors } from './client-interceptors.js';
import {
  ClientConfig,
  ClientMode,
  EnvironmentModeHandler,
  InterceptorConfig,
} from './client-config.js';
import { AttioAxiosError, isAttioErrorData } from './types.js';

/**
 * Strategy interface for client creation
 */
export interface ClientStrategy {
  createClient(config: ClientConfig): AxiosInstance;
  getDefaultConfig(): Partial<ClientConfig>;
}

/**
 * Base strategy with common client setup logic
 */
abstract class BaseClientStrategy implements ClientStrategy {
  abstract createClient(config: ClientConfig): AxiosInstance;
  abstract getDefaultConfig(): Partial<ClientConfig>;

  /**
   * Creates the base Axios instance with common configuration
   */
  protected createBaseClient(config: ClientConfig): AxiosInstance {
    const client = axios.create({
      baseURL: config.baseURL || EnvironmentModeHandler.getDefaultBaseURL(),
      timeout: config.timeout || EnvironmentModeHandler.getStandardTimeout(),
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // Preserve raw server JSON response
      transformResponse: [
        (data) => {
          try {
            return JSON.parse(data);
          } catch {
            return data;
          }
        },
      ],
      validateStatus: (status) => status >= 200 && status < 300,
    });

    this.configureErrorHandling(client);
    return client;
  }

  /**
   * Configure standard error handling for Attio API responses
   */
  protected configureErrorHandling(client: AxiosInstance): void {
    client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        const data = error?.response?.data;
        if (isAttioErrorData(data)) {
          // Mirror serverData onto the error so wrappers can preserve it
          const attioError = error as AttioAxiosError;
          attioError.serverData = {
            status_code: data.status_code ?? error.response?.status,
            type: data.type,
            code: data.code,
            message: data.message,
          };
          return Promise.reject(attioError);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Configure interceptors based on provided configuration
   */
  protected configureInterceptors(
    client: AxiosInstance,
    interceptorConfig?: InterceptorConfig
  ): void {
    if (!interceptorConfig) return;

    debug('client-strategies', 'Configuring client interceptors', {
      prefix: interceptorConfig.prefix,
      enableDiagnostics: interceptorConfig.enableDiagnostics,
      enableErrorHandling: interceptorConfig.enableErrorHandling,
    });

    configureStandardInterceptors(client, interceptorConfig);
  }
}

/**
 * Production client strategy - full interceptors, standard configuration
 */
export class ProductionClientStrategy extends BaseClientStrategy {
  createClient(config: ClientConfig): AxiosInstance {
    debug('client-strategies', 'Creating production client', {
      hasApiKey: Boolean(config.apiKey),
      baseURL: config.baseURL,
      timeout: config.timeout,
    });

    const client = this.createBaseClient(config);
    this.configureInterceptors(client, config.interceptors);
    return client;
  }

  getDefaultConfig(): Partial<ClientConfig> {
    return {
      mode: ClientMode.PRODUCTION,
      timeout: EnvironmentModeHandler.getStandardTimeout(),
      interceptors: {
        prefix: '',
        enableDiagnostics: true,
        enableErrorHandling: true,
      },
    };
  }
}

/**
 * E2E client strategy - full interceptors with E2E prefix
 */
export class E2EClientStrategy extends BaseClientStrategy {
  createClient(config: ClientConfig): AxiosInstance {
    debug('client-strategies', 'Creating E2E client', {
      hasApiKey: Boolean(config.apiKey),
      baseURL: config.baseURL,
      mode: config.mode,
    });

    const client = this.createBaseClient(config);
    this.configureInterceptors(client, config.interceptors);
    return client;
  }

  getDefaultConfig(): Partial<ClientConfig> {
    return {
      mode: ClientMode.E2E,
      timeout: EnvironmentModeHandler.getStandardTimeout(),
      interceptors: {
        prefix: 'E2E',
        enableDiagnostics: true,
        enableErrorHandling: true,
      },
    };
  }
}

/**
 * E2E Raw client strategy - minimal interceptors for raw testing
 */
export class E2ERawClientStrategy extends BaseClientStrategy {
  createClient(config: ClientConfig): AxiosInstance {
    debug('client-strategies', 'Creating E2E raw client', {
      hasApiKey: Boolean(config.apiKey),
      baseURL: config.baseURL,
    });

    // Create minimal client for raw E2E testing
    const client = this.createBaseClient(config);
    this.configureInterceptors(client, config.interceptors);
    return client;
  }

  getDefaultConfig(): Partial<ClientConfig> {
    return {
      mode: ClientMode.E2E_RAW,
      timeout: EnvironmentModeHandler.getStandardTimeout(),
      interceptors: {
        prefix: 'E2E-RAW',
        enableDiagnostics: true,
        enableErrorHandling: true,
      },
    };
  }
}

/**
 * Test client strategy - minimal logging, optimized for test performance
 */
export class TestClientStrategy extends BaseClientStrategy {
  createClient(config: ClientConfig): AxiosInstance {
    debug('client-strategies', 'Creating test client', {
      hasApiKey: Boolean(config.apiKey),
      baseURL: config.baseURL,
    });

    const client = this.createBaseClient(config);
    this.configureInterceptors(client, config.interceptors);
    return client;
  }

  getDefaultConfig(): Partial<ClientConfig> {
    return {
      mode: ClientMode.TEST,
      timeout: EnvironmentModeHandler.getStandardTimeout(),
      interceptors: {
        prefix: 'TEST',
        enableDiagnostics: false,
        enableErrorHandling: true,
      },
    };
  }
}

/**
 * Strategy factory - determines the appropriate strategy based on mode
 */
export class ClientStrategyFactory {
  private static strategies = new Map<ClientMode, ClientStrategy>([
    [ClientMode.PRODUCTION, new ProductionClientStrategy()],
    [ClientMode.E2E, new E2EClientStrategy()],
    [ClientMode.E2E_RAW, new E2ERawClientStrategy()],
    [ClientMode.TEST, new TestClientStrategy()],
  ]);

  /**
   * Get the appropriate strategy for the given mode
   */
  static getStrategy(mode: ClientMode): ClientStrategy {
    const strategy = this.strategies.get(mode);
    if (!strategy) {
      throw new Error(`Unsupported client mode: ${mode}`);
    }
    return strategy;
  }

  /**
   * Create a client using the appropriate strategy
   */
  static createClient(config: ClientConfig): AxiosInstance {
    const mode = config.mode || EnvironmentModeHandler.determineMode();
    const strategy = this.getStrategy(mode);

    // Merge strategy defaults with provided config
    const defaultConfig = strategy.getDefaultConfig();
    const mergedConfig: ClientConfig = {
      ...defaultConfig,
      ...config,
      interceptors: {
        ...defaultConfig.interceptors,
        ...config.interceptors,
      },
    };

    return strategy.createClient(mergedConfig);
  }
}
