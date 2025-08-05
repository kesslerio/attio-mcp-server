/**
 * Custom E2E Test Assertions
 * 
 * Provides specialized assertions for E2E testing scenarios,
 * including MCP response validation and Attio API response checking.
 */
import { expect } from 'vitest';
import { configLoader } from './config-loader.js';
import type { 
  McpResponseData, 
  ExpectedDataShape, 
  AttioRecordValues,
  TestDataObject,
  SearchResultItem,
  BatchOperationResult
} from '../types/index.js';

/**
 * MCP Tool Response Interface
 */
export interface McpToolResponse {
  content?: Array<{
    type: string;
    text?: string;
    data?: McpResponseData;
  }>;
  isError?: boolean;
  error?: string;
  _meta?: {
    toolName?: string;
    executionTime?: number;
  };
}

/**
 * Attio API Response Interfaces
 */
export interface AttioRecord {
  id: {
    record_id: string;
    object_id?: string;
  };
  values: AttioRecordValues;
  created_at?: string;
  updated_at?: string;
}

export interface AttioListResponse {
  data: AttioRecord[];
  pagination?: {
    cursor?: string;
    has_more?: boolean;
    count?: number;
  };
}

export interface AttioSingleResponse {
  data: AttioRecord;
}

/**
 * Custom assertion class for E2E tests
 */
export class E2EAssertions {
  /**
   * Assert that MCP tool response is successful
   */
  static expectMcpSuccess(response: McpToolResponse, message?: string): void {
    const errorMsg = message || 'Expected MCP tool response to be successful';
    
    expect(response.isError, `${errorMsg} - Response has error flag`).toBe(false);
    expect(response.error, `${errorMsg} - Response has error message: ${response.error}`).toBeUndefined();
    expect(response.content, `${errorMsg} - Response missing content`).toBeDefined();
    expect(Array.isArray(response.content), `${errorMsg} - Response content should be array`).toBe(true);
  }

  /**
   * Assert that MCP tool response contains expected data
   */
  static expectMcpData(response: McpToolResponse, expectedDataShape?: ExpectedDataShape): McpResponseData | undefined {
    this.expectMcpSuccess(response);
    
    const content = response.content!;
    expect(content.length, 'Response should have at least one content item').toBeGreaterThan(0);
    
    const dataContent = content.find(c => c.type === 'text' && c.text);
    expect(dataContent, 'Response should contain text content').toBeDefined();
    
    if (dataContent?.text) {
      try {
        const parsedData = JSON.parse(dataContent.text);
        
        if (expectedDataShape) {
          this.expectObjectShape(parsedData, expectedDataShape);
        }
        
        return parsedData;
      } catch (error) {
        // If not JSON, return text directly
        return dataContent.text;
      }
    }
    
    return null;
  }

  /**
   * Assert that MCP tool response indicates an error
   */
  static expectMcpError(response: McpToolResponse, expectedErrorPattern?: string | RegExp): void {
    expect(response.isError, 'Expected MCP tool response to indicate error').toBe(true);
    
    if (expectedErrorPattern) {
      expect(response.error, 'Response should have error message').toBeDefined();
      
      if (typeof expectedErrorPattern === 'string') {
        expect(response.error, `Error message should contain "${expectedErrorPattern}"`).toContain(expectedErrorPattern);
      } else {
        expect(response.error, `Error message should match pattern ${expectedErrorPattern}`).toMatch(expectedErrorPattern);
      }
    }
  }

  /**
   * Assert that Attio record has required structure
   */
  static expectAttioRecord(record: TestDataObject, resourceType?: string): void {
    expect(record, 'Record should be defined').toBeDefined();
    expect(record.id, 'Record should have id object').toBeDefined();
    expect(record.id.record_id, 'Record should have record_id').toBeDefined();
    expect(typeof record.id.record_id, 'Record ID should be string').toBe('string');
    expect(record.values, 'Record should have values object').toBeDefined();
    expect(typeof record.values, 'Values should be object').toBe('object');

    if (resourceType) {
      // Additional resource-specific validations
      switch (resourceType) {
        case 'companies':
          this.expectCompanyRecord(record);
          break;
        case 'people':
          this.expectPersonRecord(record);
          break;
        case 'lists':
          this.expectListRecord(record);
          break;
        case 'tasks':
          this.expectTaskRecord(record);
          break;
      }
    }
  }

  /**
   * Assert that company record has expected structure
   */
  static expectCompanyRecord(company: TestDataObject): void {
    this.expectAttioRecord(company);
    
    // Companies should typically have a name
    if (company.values.name) {
      expect(Array.isArray(company.values.name), 'Company name should be array format').toBe(true);
      expect(company.values.name[0]?.value, 'Company should have name value').toBeDefined();
    }
  }

  /**
   * Assert that person record has expected structure
   */
  static expectPersonRecord(person: TestDataObject): void {
    this.expectAttioRecord(person);
    
    // People should typically have a name
    if (person.values.name) {
      expect(Array.isArray(person.values.name), 'Person name should be array format').toBe(true);
      expect(person.values.name[0]?.value, 'Person should have name value').toBeDefined();
    }
  }

  /**
   * Assert that list record has expected structure
   */
  static expectListRecord(list: TestDataObject): void {
    expect(list, 'List should be defined').toBeDefined();
    expect(list.id, 'List should have id object').toBeDefined();
    expect(list.id.list_id, 'List should have list_id').toBeDefined();
    expect(list.name, 'List should have name').toBeDefined();
    expect(list.parent_object, 'List should have parent_object').toBeDefined();
  }

  /**
   * Assert that task record has expected structure
   */
  static expectTaskRecord(task: TestDataObject): void {
    this.expectAttioRecord(task);
    
    // Tasks should typically have a title
    if (task.values.title) {
      expect(task.values.title, 'Task should have title').toBeDefined();
    }
  }

  /**
   * Assert that response is paginated list
   */
  static expectPaginatedResponse(response: TestDataObject, minItems: number = 0): void {
    expect(response, 'Response should be defined').toBeDefined();
    expect(response.data, 'Response should have data array').toBeDefined();
    expect(Array.isArray(response.data), 'Response data should be array').toBe(true);
    expect(response.data.length, `Response should have at least ${minItems} items`).toBeGreaterThanOrEqual(minItems);
    
    // Check pagination metadata if present
    if (response.pagination) {
      expect(typeof response.pagination.has_more, 'Pagination has_more should be boolean').toBe('boolean');
      if (response.pagination.count !== undefined) {
        expect(typeof response.pagination.count, 'Pagination count should be number').toBe('number');
      }
    }
  }

  /**
   * Assert that object has expected shape/structure
   */
  static expectObjectShape(obj: TestDataObject, expectedShape: ExpectedDataShape): void {
    expect(obj, 'Object should be defined').toBeDefined();
    
    for (const [key, expectedType] of Object.entries(expectedShape)) {
      if (typeof expectedType === 'string') {
        expect(typeof obj[key], `Property ${key} should be ${expectedType}`).toBe(expectedType);
      } else if (typeof expectedType === 'object' && !Array.isArray(expectedType)) {
        expect(obj[key], `Property ${key} should be object`).toBeDefined();
        this.expectObjectShape(obj[key], expectedType);
      } else if (Array.isArray(expectedType) && expectedType.length > 0) {
        expect(Array.isArray(obj[key]), `Property ${key} should be array`).toBe(true);
        if (obj[key].length > 0) {
          this.expectObjectShape(obj[key][0], expectedType[0]);
        }
      }
    }
  }

  /**
   * Assert that test data has proper prefixing
   */
  static expectTestDataPrefix(data: TestDataObject, prefix?: string): void {
    const config = configLoader.getConfig();
    const expectedPrefix = prefix || config.testData.testDataPrefix;

    const hasPrefix = this.hasTestPrefix(data, expectedPrefix);
    expect(hasPrefix, `Data should contain test prefix "${expectedPrefix}"`).toBe(true);
  }

  /**
   * Assert that test data does NOT have test prefixing (for production data)
   */
  static expectNoTestDataPrefix(data: TestDataObject): void {
    const config = configLoader.getConfig();
    const testPrefix = config.testData.testDataPrefix;

    const hasPrefix = this.hasTestPrefix(data, testPrefix);
    expect(hasPrefix, `Data should NOT contain test prefix "${testPrefix}"`).toBe(false);
  }

  /**
   * Helper to check if data contains test prefix
   */
  private static hasTestPrefix(data: TestDataObject, prefix: string): boolean {
    if (typeof data === 'string') {
      return data.includes(prefix);
    }

    if (Array.isArray(data)) {
      return data.some(item => this.hasTestPrefix(item, prefix));
    }

    if (data && typeof data === 'object') {
      return Object.values(data).some(value => this.hasTestPrefix(value, prefix));
    }

    return false;
  }

  /**
   * Assert that email follows test domain pattern
   */
  static expectTestEmail(email: string): void {
    const config = configLoader.getConfig();
    expect(email, 'Email should be defined').toBeDefined();
    expect(email.includes(config.testData.testEmailDomain), 
      `Email "${email}" should contain test domain "${config.testData.testEmailDomain}"`).toBe(true);
  }

  /**
   * Assert that domain follows test domain pattern
   */
  static expectTestDomain(domain: string): void {
    const config = configLoader.getConfig();
    expect(domain, 'Domain should be defined').toBeDefined();
    expect(domain.includes(config.testData.testCompanyDomain), 
      `Domain "${domain}" should contain test domain "${config.testData.testCompanyDomain}"`).toBe(true);
  }

  /**
   * Assert execution time is within reasonable bounds
   */
  static expectReasonableExecutionTime(response: McpToolResponse, maxMs: number = 30000): void {
    if (response._meta?.executionTime) {
      expect(response._meta.executionTime, 
        `Execution time ${response._meta.executionTime}ms should be under ${maxMs}ms`).toBeLessThan(maxMs);
    }
  }

  /**
   * Assert that search results are relevant to query
   */
  static expectRelevantSearchResults(results: SearchResultItem[], query: string, minRelevance: number = 0.5): void {
    expect(results, 'Search results should be defined').toBeDefined();
    expect(Array.isArray(results), 'Search results should be array').toBe(true);
    
    if (results.length === 0) {
      console.warn(`No search results returned for query: "${query}"`);
      return;
    }

    // Basic relevance check - at least some results should contain query terms
    const queryTerms = query.toLowerCase().split(/\s+/);
    const relevantResults = results.filter(result => {
      const resultText = JSON.stringify(result).toLowerCase();
      return queryTerms.some(term => resultText.includes(term));
    });

    const relevanceScore = relevantResults.length / results.length;
    expect(relevanceScore, 
      `Search relevance score ${relevanceScore} should be at least ${minRelevance}`).toBeGreaterThanOrEqual(minRelevance);
  }

  /**
   * Assert that operation was idempotent
   */
  static expectIdempotentOperation(firstResult: TestDataObject, secondResult: TestDataObject): void {
    expect(firstResult, 'First operation result should be defined').toBeDefined();
    expect(secondResult, 'Second operation result should be defined').toBeDefined();
    
    // For update operations, the results should be equivalent
    expect(JSON.stringify(firstResult), 'Operations should be idempotent').toBe(JSON.stringify(secondResult));
  }

  /**
   * Assert that batch operation results are consistent
   */
  static expectConsistentBatchResults(results: BatchOperationResult[], expectedCount: number): void {
    expect(results, 'Batch results should be defined').toBeDefined();
    expect(Array.isArray(results), 'Batch results should be array').toBe(true);
    expect(results.length, `Batch should have ${expectedCount} results`).toBe(expectedCount);
    
    // All results should have consistent structure
    if (results.length > 1) {
      const firstResultKeys = Object.keys(results[0] || {}).sort();
      results.forEach((result, index) => {
        const resultKeys = Object.keys(result || {}).sort();
        expect(resultKeys.join(','), `Result ${index} should have consistent structure`).toBe(firstResultKeys.join(','));
      });
    }
  }
}

/**
 * Helper function to create fluent assertion chains
 */
export function expectE2E(actual: TestDataObject) {
  return {
    toBeValidMcpResponse: () => E2EAssertions.expectMcpSuccess(actual),
    toBeValidAttioRecord: (resourceType?: string) => E2EAssertions.expectAttioRecord(actual, resourceType),
    toHaveTestPrefix: (prefix?: string) => E2EAssertions.expectTestDataPrefix(actual, prefix),
    toBeTestEmail: () => E2EAssertions.expectTestEmail(actual),
    toBeTestDomain: () => E2EAssertions.expectTestDomain(actual),
    toBePaginatedResponse: (minItems?: number) => E2EAssertions.expectPaginatedResponse(actual, minItems),
    toHaveShape: (expectedShape: ExpectedDataShape) => E2EAssertions.expectObjectShape(actual, expectedShape),
    toBeRelevantSearchResults: (query: string, minRelevance?: number) => 
      E2EAssertions.expectRelevantSearchResults(actual, query, minRelevance)
  };
}

/**
 * Export the main assertion class as default
 */
export default E2EAssertions;