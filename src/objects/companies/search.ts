/**
 * Search functionality for companies
 */
import { getAttioClient } from '../../api/attio-client.js';
import {
  searchObject,
  advancedSearchObject,
  ListEntryFilters,
} from '../../api/operations/index.js';
import {
  ResourceType,
  Company,
  FilterConditionType,
} from '../../types/attio.js';
import { FilterValidationError } from '../../errors/api-errors.js';
import {
  extractDomain,
  hasDomainIndicators,
  normalizeDomain,
  extractAllDomains,
} from '../../utils/domain-utils.js';

/**
 * Simple LRU cache for company search results
 * Reduces API calls for frequently looked-up companies
 */
class CompanySearchCache {
  private cache = new Map<string, { data: Company[]; timestamp: number }>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) {
    // Default: 100 entries, 5 minutes TTL
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.ttlMs;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry.timestamp)) {
        this.cache.delete(key);
      }
    }
  }

  get(key: string): Company[] | null {
    const entry = this.cache.get(key);
    if (!entry || this.isExpired(entry.timestamp)) {
      if (entry) {
        this.cache.delete(key);
      }
      return null;
    }

    // Move to end (LRU behavior)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: Company[]): void {
    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { data, timestamp: Date.now() });

    // Periodic cleanup
    if (Math.random() < 0.1) {
      // 10% chance to trigger cleanup
      this.cleanup();
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const companySearchCache = new CompanySearchCache();

/**
 * Cache management functions for testing and administration
 */
export const companyCache = {
  clear: () => companySearchCache.clear(),
  size: () => companySearchCache.size(),
};

/**
 * Configuration options for company search
 */
export interface CompanySearchOptions {
  /** Whether to prioritize domain matches over name matches (default: true) */
  prioritizeDomains?: boolean;
  /** Maximum number of results to return */
  maxResults?: number;
  /** Whether to include debug logging */
  debug?: boolean;
}

/**
 * Searches for companies with domain prioritization when available
 *
 * @param query - Search query string to match against company names or domains
 * @param options - Optional search configuration
 * @returns Array of matching company objects, prioritized by domain matches
 * @example
 * ```typescript
 * const companies = await searchCompanies("acme.com");
 * // Returns companies with domain "acme.com" first, then name matches
 *
 * const companies = await searchCompanies("acme");
 * // Returns companies with names containing "acme"
 *
 * const companies = await searchCompanies("acme.com", { prioritizeDomains: false });
 * // Disables domain prioritization, uses name-based search only
 * ```
 */
export async function searchCompanies(
  query: string,
  options: CompanySearchOptions = {}
): Promise<Company[]> {
  // Early return for empty or whitespace-only queries
  if (!query || !query.trim()) {
    return [];
  }

  // Extract default options
  const {
    prioritizeDomains = true,
    maxResults,
    debug = process.env.NODE_ENV === 'development' || process.env.DEBUG,
  } = options;

  // Check if query contains domain indicators (only if prioritization is enabled)
  const extractedDomain = prioritizeDomains ? extractDomain(query) : null;

  // Debug logging for domain extraction
  if (debug) {
    if (extractedDomain) {
      console.debug(
        `[searchCompanies] Extracted domain: "${extractedDomain}" from query: "${query}"`
      );
    } else if (prioritizeDomains) {
      console.debug(
        `[searchCompanies] No domain detected in query: "${query}", using name-based search`
      );
    } else {
      console.debug(
        `[searchCompanies] Domain prioritization disabled, using name-based search for: "${query}"`
      );
    }
  }

  if (extractedDomain && prioritizeDomains) {
    // Priority search by domain first
    try {
      const domainResults = await searchCompaniesByDomain(extractedDomain);

      // If we found exact domain matches, return them first
      if (domainResults.length > 0) {
        // Also search by name to include potential additional matches
        const nameResults = await searchCompaniesByName(query);

        // Combine results, prioritizing domain matches
        const combinedResults = [...domainResults];

        // Add name-based results that aren't already included
        for (const nameResult of nameResults) {
          const isDuplicate = domainResults.some(
            (domainResult) =>
              domainResult.id?.record_id === nameResult.id?.record_id
          );
          if (!isDuplicate) {
            combinedResults.push(nameResult);
          }
        }

        // Apply maxResults limit if specified
        const finalResults = maxResults
          ? combinedResults.slice(0, maxResults)
          : combinedResults;
        return finalResults;
      }
    } catch (error) {
      // If domain search fails, fall back to name search
      console.warn(
        `Domain search failed for "${extractedDomain}", falling back to name search:`,
        error
      );
    }
  }

  // Fallback to name-based search
  const nameResults = await searchCompaniesByName(query);

  // Apply maxResults limit if specified
  return maxResults ? nameResults.slice(0, maxResults) : nameResults;
}

/**
 * Configuration for domain search strategies
 */
interface DomainSearchConfig {
  domainAttributeId: string;
  enableDebugLogging: boolean;
  searchTimeout?: number;
  enableMetrics?: boolean;
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerWindowMs?: number;
}

/**
 * Error categories for domain search operations
 */
enum DomainSearchErrorCategory {
  TIMEOUT = 'timeout',
  CIRCUIT_BREAKER = 'circuit_breaker',
  API_ERROR = 'api_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  NO_RESULTS = 'no_results',
  UNKNOWN = 'unknown'
}

/**
 * Enhanced error information for domain search operations
 */
interface DomainSearchError {
  category: DomainSearchErrorCategory;
  message: string;
  originalError?: any;
  context?: Record<string, any>;
  timestamp: number;
  strategy: 'domain' | 'website' | 'direct_api';
  domain: string;
}

/**
 * Performance tracking for domain search strategies
 */
interface SearchStrategyMetrics {
  strategy: 'domain' | 'website' | 'direct_api';
  domain: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  resultCount?: number;
  error?: DomainSearchError;
  executionTimeMs?: number;
}

/**
 * Categorize errors for better monitoring and debugging
 */
function categorizeError(error: any, strategy: SearchStrategyMetrics['strategy'], domain: string): DomainSearchError {
  const timestamp = Date.now();
  
  if (typeof error === 'string') {
    if (error.includes('timeout')) {
      return {
        category: DomainSearchErrorCategory.TIMEOUT,
        message: error,
        timestamp,
        strategy,
        domain,
      };
    }
    if (error.includes('No results found')) {
      return {
        category: DomainSearchErrorCategory.NO_RESULTS,
        message: error,
        timestamp,
        strategy,
        domain,
      };
    }
    if (error.includes('circuit breaker') || error.includes('Skipping')) {
      return {
        category: DomainSearchErrorCategory.CIRCUIT_BREAKER,
        message: error,
        timestamp,
        strategy,
        domain,
      };
    }
  }
  
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('timeout')) {
      return {
        category: DomainSearchErrorCategory.TIMEOUT,
        message: error.message,
        originalError: error,
        timestamp,
        strategy,
        domain,
      };
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('enotfound') || errorMessage.includes('econnrefused')) {
      return {
        category: DomainSearchErrorCategory.NETWORK_ERROR,
        message: error.message,
        originalError: error,
        timestamp,
        strategy,
        domain,
      };
    }
    
    if (errorMessage.includes('400') || errorMessage.includes('bad request')) {
      return {
        category: DomainSearchErrorCategory.VALIDATION_ERROR,
        message: error.message,
        originalError: error,
        timestamp,
        strategy,
        domain,
      };
    }
    
    if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      return {
        category: DomainSearchErrorCategory.API_ERROR,
        message: error.message,
        originalError: error,
        context: {
          status: errorMessage.includes('401') ? 401 : errorMessage.includes('403') ? 403 : 500,
        },
        timestamp,
        strategy,
        domain,
      };
    }
  }
  
  return {
    category: DomainSearchErrorCategory.UNKNOWN,
    message: String(error),
    originalError: error,
    timestamp,
    strategy,
    domain,
  };
}

/**
 * Simple metrics collector for domain search operations
 */
class DomainSearchMetrics {
  private static metrics: SearchStrategyMetrics[] = [];
  private static readonly MAX_METRICS = 1000; // Keep last 1000 operations

  static startOperation(strategy: SearchStrategyMetrics['strategy'], domain: string): SearchStrategyMetrics {
    const metric: SearchStrategyMetrics = {
      strategy,
      domain,
      startTime: Date.now(),
      success: false,
    };
    
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
    
    return metric;
  }

  static endOperation(metric: SearchStrategyMetrics, success: boolean, resultCount?: number, error?: any) {
    metric.endTime = Date.now();
    metric.executionTimeMs = metric.endTime - metric.startTime;
    metric.success = success;
    metric.resultCount = resultCount;
    
    if (error) {
      metric.error = categorizeError(error, metric.strategy, metric.domain);
    }
  }

  static getMetrics(): SearchStrategyMetrics[] {
    return [...this.metrics];
  }

  static getSuccessRates(): Record<string, { total: number; successful: number; rate: number; avgTime: number }> {
    const stats: Record<string, { total: number; successful: number; totalTime: number }> = {};
    
    for (const metric of this.metrics) {
      if (!metric.endTime) continue; // Skip incomplete operations
      
      if (!stats[metric.strategy]) {
        stats[metric.strategy] = { total: 0, successful: 0, totalTime: 0 };
      }
      
      stats[metric.strategy].total++;
      if (metric.success) {
        stats[metric.strategy].successful++;
      }
      stats[metric.strategy].totalTime += metric.executionTimeMs || 0;
    }
    
    const result: Record<string, { total: number; successful: number; rate: number; avgTime: number }> = {};
    for (const [strategy, data] of Object.entries(stats)) {
      result[strategy] = {
        total: data.total,
        successful: data.successful,
        rate: data.total > 0 ? data.successful / data.total : 0,
        avgTime: data.total > 0 ? data.totalTime / data.total : 0,
      };
    }
    
    return result;
  }

  /**
   * Get error statistics by category for monitoring and alerting
   */
  static getErrorStats(): Record<string, { count: number; rate: number; recentCount: number }> {
    const windowMs = 300000; // 5 minutes
    const cutoffTime = Date.now() - windowMs;
    
    const errorStats: Record<string, { count: number; recentCount: number }> = {};
    let totalOperations = 0;
    let recentOperations = 0;
    
    for (const metric of this.metrics) {
      if (!metric.endTime) continue;
      
      totalOperations++;
      if (metric.endTime > cutoffTime) {
        recentOperations++;
      }
      
      if (metric.error) {
        const category = metric.error.category;
        if (!errorStats[category]) {
          errorStats[category] = { count: 0, recentCount: 0 };
        }
        errorStats[category].count++;
        
        if (metric.endTime > cutoffTime) {
          errorStats[category].recentCount++;
        }
      }
    }
    
    const result: Record<string, { count: number; rate: number; recentCount: number }> = {};
    for (const [category, data] of Object.entries(errorStats)) {
      result[category] = {
        count: data.count,
        rate: totalOperations > 0 ? data.count / totalOperations : 0,
        recentCount: data.recentCount,
      };
    }
    
    return result;
  }

  /**
   * Get recent errors for debugging
   */
  static getRecentErrors(limit: number = 50): DomainSearchError[] {
    return this.metrics
      .filter(m => m.error)
      .map(m => m.error!)
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Check if a strategy should be skipped based on recent failure rate
   */
  static shouldSkipStrategy(strategy: SearchStrategyMetrics['strategy'], config: DomainSearchConfig): boolean {
    if (!config.enableCircuitBreaker) {
      return false;
    }

    const windowMs = config.circuitBreakerWindowMs || 60000; // 1 minute default
    const threshold = config.circuitBreakerThreshold || 0.8; // 80% failure rate default
    const cutoffTime = Date.now() - windowMs;

    // Get recent metrics for this strategy
    const recentMetrics = this.metrics.filter(
      (m) => m.strategy === strategy && m.endTime && m.endTime > cutoffTime
    );

    // Need at least 5 operations to make a decision
    if (recentMetrics.length < 5) {
      return false;
    }

    const failureRate = recentMetrics.filter((m) => !m.success).length / recentMetrics.length;
    return failureRate >= threshold;
  }
}

/**
 * Circuit breaker and timeout wrapper for search operations
 */
async function withTimeoutAndCircuitBreaker<T>(
  operation: () => Promise<T>,
  strategy: SearchStrategyMetrics['strategy'],
  config: DomainSearchConfig,
  domain: string
): Promise<T | null> {
  // Check circuit breaker
  if (DomainSearchMetrics.shouldSkipStrategy(strategy, config)) {
    logDomainSearchEvent('warn', 'circuit_breaker_skip', {
      domain,
      strategy,
      reason: 'circuit_breaker',
    });
    return null;
  }

  // Apply timeout if configured
  if (config.searchTimeout) {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${strategy} search timeout after ${config.searchTimeout}ms`)), config.searchTimeout)
    );
    
    return Promise.race([operation(), timeoutPromise]);
  }

  return operation();
}

/**
 * Get domain search configuration from environment or defaults
 */
function getDomainSearchConfig(): DomainSearchConfig {
  return {
    domainAttributeId: process.env.ATTIO_DOMAIN_ATTRIBUTE_ID || 'cef4b6ae-2046-48b3-b3b6-9adf0ab251b8',
    enableDebugLogging: process.env.NODE_ENV === 'development' || Boolean(process.env.DEBUG),
    searchTimeout: process.env.DOMAIN_SEARCH_TIMEOUT_MS ? parseInt(process.env.DOMAIN_SEARCH_TIMEOUT_MS) : undefined,
    enableMetrics: process.env.DISABLE_DOMAIN_SEARCH_METRICS !== 'true', // Enabled by default, can be disabled
    enableCircuitBreaker: process.env.DISABLE_DOMAIN_SEARCH_CIRCUIT_BREAKER !== 'true', // Enabled by default
    circuitBreakerThreshold: process.env.DOMAIN_SEARCH_CIRCUIT_BREAKER_THRESHOLD ? 
      parseFloat(process.env.DOMAIN_SEARCH_CIRCUIT_BREAKER_THRESHOLD) : 0.8, // 80% failure rate
    circuitBreakerWindowMs: process.env.DOMAIN_SEARCH_CIRCUIT_BREAKER_WINDOW_MS ? 
      parseInt(process.env.DOMAIN_SEARCH_CIRCUIT_BREAKER_WINDOW_MS) : 60000, // 1 minute
  };
}

/**
 * Build query formats for direct API search fallback
 */
function buildQueryFormats(normalizedDomain: string, config: DomainSearchConfig): Record<string, any>[] {
  return [
    // Format 1: Simple array contains
    { domains: { $contains: normalizedDomain } },
    // Format 2: Object structure (from error message pattern)
    { domains: { $contains: { domain: normalizedDomain } } },
    // Format 3: Website field fallback
    { website: { $contains: normalizedDomain } },
    // Format 4: Try the specific attribute ID from error message if other formats fail
    { [config.domainAttributeId]: { $contains: normalizedDomain } },
  ];
}

/**
 * Try primary domain attribute search
 */
async function tryDomainAttributeSearch(
  normalizedDomain: string,
  config: DomainSearchConfig
): Promise<Company[] | null> {
  const metric = config.enableMetrics ? DomainSearchMetrics.startOperation('domain', normalizedDomain) : null;
  
  const searchOperation = async (): Promise<Company[]> => {
    const domainFilters: ListEntryFilters = {
      filters: [
        {
          attribute: { slug: 'domains' },
          condition: FilterConditionType.CONTAINS,
          value: normalizedDomain,
        },
      ],
    };

    const results = await advancedSearchCompanies(domainFilters);
    if (!results || results.length === 0) {
      throw new Error('No results found');
    }
    return results;
  };

  try {
    const results = await withTimeoutAndCircuitBreaker(searchOperation, 'domain', config, normalizedDomain);
    
    if (results && results.length > 0) {
      const executionTime = Date.now() - (metric?.startTime || 0);
      
      if (config.enableDebugLogging) {
        logDomainSearchEvent('info', 'strategy_success', {
          domain: normalizedDomain,
          strategy: 'domain',
          executionTimeMs: executionTime,
          resultCount: results.length,
        });
      }
      
      if (metric) {
        DomainSearchMetrics.endOperation(metric, true, results.length);
      }
      return results;
    }
    
    if (metric) {
      DomainSearchMetrics.endOperation(metric, false, 0, 'No results found');
    }
    return null;
  } catch (error) {
    const categorizedError = categorizeError(error, 'domain', normalizedDomain);
    
    if (config.enableDebugLogging) {
      logDomainSearchEvent('warn', 'strategy_failure', {
        domain: normalizedDomain,
        strategy: 'domain',
        error: categorizedError,
      });
    }
    
    if (metric) {
      DomainSearchMetrics.endOperation(metric, false, 0, error);
    }
    return null;
  }
}

/**
 * Try website attribute search fallback
 */
async function tryWebsiteAttributeSearch(
  normalizedDomain: string,
  config: DomainSearchConfig
): Promise<Company[] | null> {
  const metric = config.enableMetrics ? DomainSearchMetrics.startOperation('website', normalizedDomain) : null;
  
  const searchOperation = async (): Promise<Company[]> => {
    const websiteFilters: ListEntryFilters = {
      filters: [
        {
          attribute: { slug: 'website' },
          condition: FilterConditionType.CONTAINS,
          value: normalizedDomain,
        },
      ],
    };

    const results = await advancedSearchCompanies(websiteFilters);
    if (!results || results.length === 0) {
      throw new Error('No results found');
    }
    return results;
  };

  try {
    const results = await withTimeoutAndCircuitBreaker(searchOperation, 'website', config, normalizedDomain);
    
    if (results && results.length > 0) {
      const executionTime = Date.now() - (metric?.startTime || 0);
      
      if (config.enableDebugLogging) {
        logDomainSearchEvent('info', 'strategy_success', {
          domain: normalizedDomain,
          strategy: 'website',
          executionTimeMs: executionTime,
          resultCount: results.length,
        });
      }
      
      if (metric) {
        DomainSearchMetrics.endOperation(metric, true, results.length);
      }
      return results;
    }
    
    if (metric) {
      DomainSearchMetrics.endOperation(metric, false, 0, 'No results found');
    }
    return null;
  } catch (error) {
    const categorizedError = categorizeError(error, 'website', normalizedDomain);
    
    if (config.enableDebugLogging) {
      logDomainSearchEvent('warn', 'strategy_failure', {
        domain: normalizedDomain,
        strategy: 'website',
        error: categorizedError,
      });
    }
    
    if (metric) {
      DomainSearchMetrics.endOperation(metric, false, 0, error);
    }
    return null;
  }
}

/**
 * Try direct API search with multiple query formats
 */
async function tryDirectApiSearch(
  normalizedDomain: string,
  config: DomainSearchConfig
): Promise<Company[] | null> {
  const metric = config.enableMetrics ? DomainSearchMetrics.startOperation('direct_api', normalizedDomain) : null;
  
  const searchOperation = async (): Promise<Company[]> => {
    const api = getAttioClient();
    const path = '/objects/companies/records/query';
    const queryFormats = buildQueryFormats(normalizedDomain, config);

    for (const [index, filter] of queryFormats.entries()) {
      try {
        if (config.enableDebugLogging) {
          console.log(
            `[searchCompaniesByDomain] Trying direct API query format ${index + 1} for "${normalizedDomain}":`,
            JSON.stringify(filter)
          );
        }
        
        const response = await api.post(path, { filter });
        const results = response.data.data || [];
        
        if (results.length > 0) {
          if (config.enableDebugLogging) {
            console.log(
              `[searchCompaniesByDomain] SUCCESS: Found ${results.length} results with query format ${index + 1}`
            );
          }
          return results;
        }
      } catch (formatError) {
        if (config.enableDebugLogging) {
          console.warn(
            `[searchCompaniesByDomain] Query format ${index + 1} failed:`,
            formatError
          );
        }
        // Continue to next format
      }
    }
    
    throw new Error('All query formats failed');
  };

  try {
    const results = await withTimeoutAndCircuitBreaker(searchOperation, 'direct_api', config, normalizedDomain);
    
    if (results && results.length > 0) {
      const executionTime = Date.now() - (metric?.startTime || 0);
      
      if (config.enableDebugLogging) {
        logDomainSearchEvent('info', 'strategy_success', {
          domain: normalizedDomain,
          strategy: 'direct_api',
          executionTimeMs: executionTime,
          resultCount: results.length,
        });
      }
      
      if (metric) {
        DomainSearchMetrics.endOperation(metric, true, results.length);
      }
      return results;
    }
    
    if (config.enableDebugLogging) {
      logDomainSearchEvent('warn', 'strategy_no_results', {
        domain: normalizedDomain,
        strategy: 'direct_api',
        message: 'All query formats failed to find results',
      });
    }
    
    if (metric) {
      DomainSearchMetrics.endOperation(metric, false, 0, 'All query formats failed');
    }
    return null;
    
  } catch (error) {
    const categorizedError = categorizeError(error, 'direct_api', normalizedDomain);
    
    if (config.enableDebugLogging) {
      logDomainSearchEvent('error', 'strategy_failure', {
        domain: normalizedDomain,
        strategy: 'direct_api',
        error: categorizedError,
      });
    }
    
    if (metric) {
      DomainSearchMetrics.endOperation(metric, false, 0, error);
    }
    return null;
  }
}

/**
 * Enhanced structured logging for domain search operations
 */
function logDomainSearchEvent(
  level: 'debug' | 'info' | 'warn' | 'error',
  event: string,
  data: {
    domain: string;
    strategy?: SearchStrategyMetrics['strategy'];
    executionTimeMs?: number;
    resultCount?: number;
    error?: DomainSearchError;
    [key: string]: any;
  }
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: 'domain-search',
    ...data,
  };

  // For development, use formatted console output
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    const prefix = `[${level.toUpperCase()}] [domain-search]`;
    const message = `${event} - domain: ${data.domain}`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data);
        break;
      case 'info':
        console.info(prefix, message, data);
        break;
      case 'warn':
        console.warn(prefix, message, data);
        break;
      case 'error':
        console.error(prefix, message, data);
        break;
    }
  } else {
    // For production, use structured JSON logging
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Get domain search performance metrics
 * @returns Performance metrics for domain search operations
 */
export function getDomainSearchMetrics(): {
  recent: SearchStrategyMetrics[];
  successRates: Record<string, { total: number; successful: number; rate: number; avgTime: number }>;
  errorStats: Record<string, { count: number; rate: number; recentCount: number }>;
  recentErrors: DomainSearchError[];
} {
  return {
    recent: DomainSearchMetrics.getMetrics(),
    successRates: DomainSearchMetrics.getSuccessRates(),
    errorStats: DomainSearchMetrics.getErrorStats(),
    recentErrors: DomainSearchMetrics.getRecentErrors(20), // Last 20 errors
  };
}

/**
 * Searches for companies by domain/website
 *
 * @param domain - Domain to search for
 * @returns Array of matching company objects
 */
export async function searchCompaniesByDomain(
  domain: string
): Promise<Company[]> {
  // Early return for empty domain
  if (!domain || !domain.trim()) {
    return [];
  }

  const normalizedDomain = normalizeDomain(domain);
  const config = getDomainSearchConfig();
  const overallStartTime = Date.now();

  // Enhanced debug logging for domain search (issue #334 regression tracking)
  logDomainSearchEvent('debug', 'search_start', {
    domain: normalizedDomain,
    originalDomain: domain,
    searchStrategies: ['domain', 'website', 'direct_api'],
    issueReference: '#334',
  });

  // REGRESSION FIX: Use multiple search strategies to handle different domain storage formats
  // From issue #334: domains are stored as structured objects with specific attribute ID
  
  // Strategy 1: Try primary domain attribute search
  const domainResults = await tryDomainAttributeSearch(normalizedDomain, config);
  if (domainResults) {
    const totalTime = Date.now() - overallStartTime;
    logDomainSearchEvent('info', 'overall_success', {
      domain: normalizedDomain,
      strategy: 'domain',
      executionTimeMs: totalTime,
      resultCount: domainResults.length,
    });
    return domainResults;
  }

  // Strategy 2: Try website attribute search fallback
  const websiteResults = await tryWebsiteAttributeSearch(normalizedDomain, config);
  if (websiteResults) {
    const totalTime = Date.now() - overallStartTime;
    logDomainSearchEvent('info', 'overall_success', {
      domain: normalizedDomain,
      strategy: 'website',
      executionTimeMs: totalTime,
      resultCount: websiteResults.length,
    });
    return websiteResults;
  }

  // Strategy 3: Try direct API search with multiple query formats
  const directResults = await tryDirectApiSearch(normalizedDomain, config);
  if (directResults) {
    const totalTime = Date.now() - overallStartTime;
    logDomainSearchEvent('info', 'overall_success', {
      domain: normalizedDomain,
      strategy: 'direct_api',
      executionTimeMs: totalTime,
      resultCount: directResults.length,
    });
    return directResults;
  }

  // All strategies failed - return empty array
  const totalTime = Date.now() - overallStartTime;
  logDomainSearchEvent('warn', 'all_strategies_failed', {
    domain: normalizedDomain,
    executionTimeMs: totalTime,
    resultCount: 0,
  });
  return [];
}

/**
 * Searches for companies by name only
 *
 * @param query - Search query string to match against company names
 * @returns Array of matching company objects
 */
export async function searchCompaniesByName(query: string): Promise<Company[]> {
  // Early return for empty query
  if (!query || !query.trim()) {
    return [];
  }

  // Create cache key (normalize query for better cache hits)
  const cacheKey = `name:${query.trim().toLowerCase()}`;

  // Check cache first
  const cachedResult = companySearchCache.get(cacheKey);
  if (cachedResult) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.debug(
        `[searchCompaniesByName] Cache hit for: "${query}" (${cachedResult.length} results)`
      );
    }
    return cachedResult;
  }

  // Debug logging for name search
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.debug(`[searchCompaniesByName] Searching by name: "${query}"`);
  }

  // Use the unified operation if available, with fallback to direct implementation
  let results: Company[];
  try {
    results = await searchObject<Company>(ResourceType.COMPANIES, query);
  } catch (error) {
    // Fallback implementation
    const api = getAttioClient();
    const path = '/objects/companies/records/query';

    const response = await api.post(path, {
      filter: {
        name: { $contains: query },
      },
    });
    results = response.data.data || [];
  }

  // Cache the results
  companySearchCache.set(cacheKey, results);

  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.debug(
      `[searchCompaniesByName] Cached ${results.length} results for: "${query}"`
    );
  }

  return results;
}

/**
 * Performs advanced search with custom filters
 *
 * @param filters - List of filters to apply
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of company results
 * @throws Error if the search encounters any issues
 * @example
 * ```typescript
 * // Search for companies with names containing "Tech"
 * const filters = {
 *   filters: [
 *     {
 *       attribute: { slug: 'name' },
 *       condition: 'contains',
 *       value: 'Tech'
 *     }
 *   ]
 * };
 * const companies = await advancedSearchCompanies(filters);
 *
 * // Search with multiple conditions using OR logic
 * const orFilters = {
 *   filters: [
 *     {
 *       attribute: { slug: 'name' },
 *       condition: 'contains',
 *       value: 'Tech'
 *     },
 *     {
 *       attribute: { slug: 'industry' },
 *       condition: 'equals',
 *       value: 'Software'
 *     }
 *   ],
 *   matchAny: true // Use OR logic between conditions
 * };
 *
 * // Complex search with nested conditions
 * const complexFilters = {
 *   filters: [
 *     // Company name condition
 *     {
 *       attribute: { slug: 'name' },
 *       condition: 'contains',
 *       value: 'Tech'
 *     },
 *     // Revenue condition - find companies with annual revenue > $10M
 *     {
 *       attribute: { slug: 'annual_revenue' },
 *       condition: 'greater_than',
 *       value: 10000000
 *     },
 *     // Industry condition
 *     {
 *       attribute: { slug: 'industry' },
 *       condition: 'equals',
 *       value: 'Software'
 *     }
 *   ]
 * };
 * ```
 */
export async function advancedSearchCompanies(
  filters: ListEntryFilters,
  limit?: number,
  offset?: number
): Promise<Company[]> {
  try {
    // Import validation utilities only when needed to avoid circular dependencies
    // This is a dynamic import that won't affect the module dependency graph
    const { validateFilters, ERROR_MESSAGES } = await import(
      '../../utils/filters/validation-utils.js'
    );

    // Use standardized validation with consistent error messages
    validateFilters(filters);

    // Proceed with the search operation
    return await advancedSearchObject<Company>(
      ResourceType.COMPANIES,
      filters,
      limit,
      offset
    );
  } catch (error) {
    // For FilterValidationError, add more context specific to companies
    if (error instanceof FilterValidationError) {
      // Enhance with company-specific context but keep the original message and category
      throw new FilterValidationError(
        `Advanced company search filter invalid: ${error.message}`,
        error.category
      );
    }

    // For other errors, provide clear context
    if (error instanceof Error) {
      // Log the error in development mode
      if (process.env.NODE_ENV === 'development') {
        console.error('[advancedSearchCompanies] Error details:', {
          message: error.message,
          stack: error.stack,
        });
      }

      // Throw with enhanced context
      throw new Error(`Error in advanced company search: ${error.message}`);
    }

    // If we reach here, it's an unexpected error
    throw new Error(
      `Failed to search companies with advanced filters: ${String(error)}`
    );
  }
}

/**
 * Helper function to create filters for searching companies by name
 *
 * @param name - Name to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for name search
 */
export function createNameFilter(
  name: string,
  condition: FilterConditionType = FilterConditionType.CONTAINS
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: 'name' },
        condition: condition,
        value: name,
      },
    ],
  };
}

/**
 * Helper function to create filters for searching companies by website
 *
 * @param website - Website to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for website search
 */
export function createWebsiteFilter(
  website: string,
  condition: FilterConditionType = FilterConditionType.CONTAINS
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: 'website' },
        condition: condition,
        value: website,
      },
    ],
  };
}

/**
 * Helper function to create filters for searching companies by industry
 *
 * @param industry - Industry to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for industry search
 */
export function createIndustryFilter(
  industry: string,
  condition: FilterConditionType = FilterConditionType.CONTAINS
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: 'industry' },
        condition: condition,
        value: industry,
      },
    ],
  };
}

/**
 * Helper function to create filters for searching companies by domain
 * REGRESSION FIX: Updated to handle domain storage format correctly
 *
 * @param domain - Domain to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for domain search
 */
export function createDomainFilter(
  domain: string,
  condition: FilterConditionType = FilterConditionType.CONTAINS
): ListEntryFilters {
  const normalizedDomain = normalizeDomain(domain);
  
  // Issue #334 fix: Use the corrected approach for domain filters
  // This helper now aligns with the searchCompaniesByDomain implementation
  return {
    filters: [
      {
        attribute: { slug: 'domains' },
        condition: condition,
        value: normalizedDomain,
      },
    ],
  };
}

/**
 * Smart search that automatically determines search strategy based on query content
 *
 * @param query - Search query that may contain domain, email, URL, or company name
 * @returns Array of matching company objects with domain matches prioritized
 */
export async function smartSearchCompanies(query: string): Promise<Company[]> {
  // Early return for empty query
  if (!query || !query.trim()) {
    return [];
  }

  const domains = extractAllDomains(query);

  // Debug logging for smart search
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.debug(
      `[smartSearchCompanies] Smart search for: "${query}", extracted domains: [${domains.join(
        ', '
      )}]`
    );
  }

  if (domains.length > 0) {
    // Multi-domain search with prioritization
    const allResults: Company[] = [];
    const seenIds = new Set<string>();

    // Search by each domain first
    for (const domain of domains) {
      try {
        const domainResults = await searchCompaniesByDomain(domain);
        for (const result of domainResults) {
          const id = result.id?.record_id;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            allResults.push(result);
          }
        }
      } catch (error) {
        console.warn(`Domain search failed for "${domain}":`, error);
      }
    }

    // Add name-based results if we have room
    try {
      const nameResults = await searchCompaniesByName(query);
      for (const result of nameResults) {
        const id = result.id?.record_id;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          allResults.push(result);
        }
      }
    } catch (error) {
      console.warn(`Name search failed for "${query}":`, error);
    }

    return allResults;
  }

  // No domains found, use regular name search
  return await searchCompaniesByName(query);
}
