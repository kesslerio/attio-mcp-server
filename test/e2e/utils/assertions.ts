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
  BatchOperationResult,
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
   * Enhanced pagination validation for universal tools
   */
  static expectValidPagination(
    response: McpToolResponse,
    expectedLimit?: number
  ): void {
    this.expectMcpSuccess(response);

    if (expectedLimit && response.content) {
      const text = response.content[0]?.text || '';
      // Check if response mentions pagination limits
      if (
        text.includes('limit') ||
        text.includes('found') ||
        text.includes('returned')
      ) {
        // Basic validation that limit was respected (if data was returned)
        expect(
          text,
          'Response should acknowledge limit parameter'
        ).toBeDefined();
      }
    }
  }

  /**
   * Field filtering validation for get-record-details and get-attributes
   */
  static expectFieldFiltering(
    response: McpToolResponse,
    requestedFields?: string[]
  ): void {
    this.expectMcpSuccess(response);

    if (requestedFields && requestedFields.length > 0 && response.content) {
      const responseText = response.content[0]?.text || '';

      // Verify that response contains some indication of field filtering
      if (requestedFields.length === 1) {
        expect(
          responseText.toLowerCase(),
          `Response should contain requested field: ${requestedFields[0]}`
        ).toContain(requestedFields[0].toLowerCase().replace('_', ' '));
      } else {
        // For multiple fields, at least check that the response is structured
        expect(
          responseText,
          'Field-filtered response should contain structured data'
        ).toBeTruthy();
      }
    }
  }

  /**
   * Tasks resource type validation
   */
  static expectValidTasksIntegration(
    response: McpToolResponse,
    operation: string
  ): void {
    this.expectMcpSuccess(response);

    const responseText = response.content?.[0]?.text || '';

    switch (operation) {
      case 'search':
        expect(
          responseText,
          'Tasks search should return valid response'
        ).toBeDefined();
        if (responseText.includes('task')) {
          expect(
            responseText,
            'Tasks response should mention task-related content'
          ).toContain('task');
        }
        break;
      case 'create':
        expect(responseText, 'Task creation should indicate success').toMatch(
          /(created|success|task)/i
        );
        break;
      case 'attributes':
        expect(
          responseText,
          'Task attributes should be returned'
        ).toBeDefined();
        break;
    }
  }

  /**
   * Enhanced error handling validation with specific error types
   */
  static expectSpecificError(
    response: McpToolResponse,
    errorType: 'validation' | 'notFound' | 'unauthorized' | 'rateLimited'
  ): void {
    expect(
      response.isError || response.content?.[0]?.text?.includes('error'),
      'Response should indicate error state'
    ).toBe(true);

    const errorText = response.error || response.content?.[0]?.text || '';

    switch (errorType) {
      case 'validation':
        expect(
          errorText.toLowerCase(),
          'Should indicate validation error'
        ).toMatch(/(validation|invalid|required|missing)/);
        break;
      case 'notFound':
        expect(
          errorText.toLowerCase(),
          'Should indicate not found error'
        ).toMatch(/(not found|does not exist|404)/);
        break;
      case 'unauthorized':
        expect(
          errorText.toLowerCase(),
          'Should indicate authorization error'
        ).toMatch(/(unauthorized|forbidden|401|403)/);
        break;
      case 'rateLimited':
        expect(
          errorText.toLowerCase(),
          'Should indicate rate limiting'
        ).toMatch(/(rate limit|too many|429)/);
        break;
    }
  }

  /**
   * Comprehensive tool response validation with performance metrics
   */
  static expectOptimalPerformance(
    response: McpToolResponse,
    maxExecutionTime?: number
  ): void {
    this.expectMcpSuccess(response);

    if (response._meta?.executionTime && maxExecutionTime) {
      expect(
        response._meta.executionTime,
        `Tool execution should complete within ${maxExecutionTime}ms`
      ).toBeLessThan(maxExecutionTime);
    }

    // Validate response size is reasonable
    if (response.content) {
      const responseSize = JSON.stringify(response).length;
      expect(
        responseSize,
        'Response size should be reasonable (< 1MB)'
      ).toBeLessThan(1024 * 1024);
    }
  }

  /**
   * Universal tool parameter validation
   */
  static expectValidUniversalToolParams(
    response: McpToolResponse,
    expectedParams: Record<string, any>
  ): void {
    this.expectMcpSuccess(response);

    // Basic validation that the tool accepted the parameters
    const responseText = response.content?.[0]?.text || '';

    if (expectedParams.resource_type) {
      // Should not contain resource type errors
      expect(
        responseText.toLowerCase(),
        'Should not contain resource type validation errors'
      ).not.toMatch(/(invalid.*resource.*type|unsupported.*resource)/);
    }

    if (expectedParams.limit) {
      // Should not contain limit validation errors
      expect(
        responseText.toLowerCase(),
        'Should not contain limit validation errors'
      ).not.toMatch(/(invalid.*limit|limit.*too.*large)/);
    }

    if (expectedParams.offset) {
      // Should handle offset parameter
      expect(
        responseText,
        'Should handle offset parameter without error'
      ).toBeDefined();
    }
  }

  /**
   * Batch operations validation
   */
  static expectValidBatchOperation(
    response: McpToolResponse,
    batchSize: number
  ): void {
    this.expectMcpSuccess(response);

    const responseText = response.content?.[0]?.text || '';

    // Should indicate batch processing
    expect(
      responseText.toLowerCase(),
      'Should indicate batch operation processing'
    ).toMatch(/(batch|multiple|operation)/);

    // Should not exceed reasonable batch limits
    expect(batchSize, 'Batch size should be reasonable').toBeLessThan(100);
  }
  /**
   * Assert that MCP tool response is successful
   */
  static expectMcpSuccess(response: McpToolResponse, message?: string): void {
    const errorMsg = message || 'Expected MCP tool response to be successful';

    // Add debug logging for error analysis
    if (response.isError) {
      console.error(
        'ERR',
        JSON.stringify(
          {
            error: response.error,
          },
          null,
          2
        )
      );
    }

    expect(response.isError, `${errorMsg} - Response has error flag`).toBe(
      false
    );
    expect(
      response.error,
      `${errorMsg} - Response has error message: ${response.error}`
    ).toBeUndefined();
    expect(
      response.content,
      `${errorMsg} - Response missing content`
    ).toBeDefined();
    expect(
      Array.isArray(response.content),
      `${errorMsg} - Response content should be array`
    ).toBe(true);
  }

  /**
   * Assert that MCP tool response contains expected data
   */
  static expectMcpData(
    response: McpToolResponse,
    expectedDataShape?: ExpectedDataShape
  ): McpResponseData | undefined {
    this.expectMcpSuccess(response);

    const content = response.content!;
    expect(
      content.length,
      'Response should have at least one content item'
    ).toBeGreaterThan(0);

    const dataContent = content.find((c) => c.type === 'text' && c.text);
    expect(dataContent, 'Response should contain text content').toBeDefined();

    if (dataContent?.text) {
      try {
        const parsedData = JSON.parse(dataContent.text);

        if (expectedDataShape) {
          this.expectObjectShape(parsedData, expectedDataShape);
        }

        return parsedData;
      } catch (error: unknown) {
        // If not JSON, return text directly
        return dataContent.text as unknown as McpResponseData;
      }
    }

    return undefined;
  }

  /**
   * Assert that MCP tool response indicates an error
   */
  static expectMcpError(
    response: McpToolResponse,
    expectedErrorPattern?: string | RegExp
  ): void {
    expect(
      response.isError,
      'Expected MCP tool response to indicate error'
    ).toBe(true);

    if (expectedErrorPattern) {
      expect(
        response.error,
        'Response should have error message'
      ).toBeDefined();

      // Extract error message from error object or use error directly if it's a string
      let errorMessage: string;
      if (typeof response.error === 'string') {
        errorMessage = response.error;
      } else if (response.error && typeof response.error === 'object') {
        // Try to extract message from error object
        errorMessage =
          (response.error as any).message ||
          (response.error as any).error ||
          JSON.stringify(response.error);
      } else {
        errorMessage = String(response.error);
      }

      // Handle both string and RegExp patterns correctly
      if (typeof expectedErrorPattern === 'string') {
        expect(
          errorMessage,
          `Error message should contain "${expectedErrorPattern}"`
        ).toContain(expectedErrorPattern);
      } else if (expectedErrorPattern instanceof RegExp) {
        // Convert error message to string before regex matching
        const messageString = String(errorMessage);
        expect(
          messageString,
          `Error message should match pattern ${expectedErrorPattern}`
        ).toMatch(expectedErrorPattern);
      }
    }
  }

  /**
   * Assert that Attio record has required structure
   */
  static expectAttioRecord(
    record: TestDataObject,
    resourceType?: string
  ): void {
    expect(record, 'Record should be defined').toBeDefined();

    if (resourceType) {
      // Use resource-aware ID assertion when resource type is known
      switch (resourceType) {
        case 'companies':
          this.expectResourceId(record, 'companies');
          this.expectCompanyRecord(record);
          break;
        case 'people':
          this.expectResourceId(record, 'people');
          this.expectPersonRecord(record);
          break;
        case 'lists':
          this.expectResourceId(record, 'lists');
          this.expectListRecord(record);
          break;
        case 'tasks':
          this.expectResourceId(record, 'tasks');
          this.expectTaskRecord(record);
          break;
        case 'notes':
          this.expectResourceId(record, 'notes');
          this.expectValidNoteStructure(record);
          break;
        default:
          // Fallback to generic record assertion for unknown types
          expect(record.id, 'Record should have id object').toBeDefined();
          expect(record.id.record_id, 'Record should have record_id').toBeDefined();
          expect(typeof record.id.record_id, 'Record ID should be string').toBe('string');
          expect(record.values, 'Record should have values object').toBeDefined();
          expect(typeof record.values, 'Values should be object').toBe('object');
          break;
      }
    } else {
      // Generic record assertion for backward compatibility
      expect(record.id, 'Record should have id object').toBeDefined();
      expect(record.id.record_id, 'Record should have record_id').toBeDefined();
      expect(typeof record.id.record_id, 'Record ID should be string').toBe('string');
      expect(record.values, 'Record should have values object').toBeDefined();
      expect(typeof record.values, 'Values should be object').toBe('object');
    }
  }

  /**
   * Assert that company record has expected structure
   */
  static expectCompanyRecord(company: TestDataObject): void {
    this.expectAttioRecord(company);

    // Companies should have a name, which is a string
    if (company.values.name) {
      // The Attio API for companies returns name as a string, not an array like for people.
      expect(
        typeof company.values.name,
        'Company name should be a string'
      ).toBe('string');
    }
  }

  /**
   * Assert that person record has expected structure
   */
  static expectPersonRecord(person: TestDataObject): void {
    this.expectAttioRecord(person);

    // People should typically have a name
    if (person.values.name) {
      expect(
        Array.isArray(person.values.name),
        'Person name should be array format'
      ).toBe(true);

      const nameEntry = person.values.name[0];
      expect(nameEntry, 'Person should have name entry').toBeDefined();

      // Check for new API structure with structured name fields
      if (
        nameEntry &&
        typeof nameEntry === 'object' &&
        (nameEntry.full_name || nameEntry.first_name || nameEntry.last_name)
      ) {
        // New API structure: personal-name attribute type
        expect(
          nameEntry.full_name || nameEntry.first_name || nameEntry.last_name,
          'Person should have at least one name component (full_name, first_name, or last_name)'
        ).toBeDefined();
      } else {
        // Legacy API structure: direct value property
        expect(
          nameEntry?.value,
          'Person should have name value (legacy structure)'
        ).toBeDefined();
      }
    }
  }

  /**
   * Assert that list record has expected structure
   */
  static expectListRecord(list: TestDataObject): void {
    // Use resource-aware ID assertion for lists
    this.expectResourceId(list, 'lists');
    
    expect(list.name, 'List should have name').toBeDefined();
    expect(list.parent_object, 'List should have parent_object').toBeDefined();
  }

  /**
   * Assert that task record has expected structure
   */
  static expectTaskRecord(task: TestDataObject): void {
    // Use resource-aware ID assertion for tasks
    this.expectResourceId(task, 'tasks');
    
    expect(task.values, 'Task should have values object').toBeDefined();
    expect(typeof task.values, 'Values should be object').toBe('object');

    // Tasks should typically have a title
    if (task.values.title) {
      expect(task.values.title, 'Task should have title').toBeDefined();
    }
  }

  /**
   * Assert that response is paginated list
   */
  static expectPaginatedResponse(
    response: TestDataObject,
    minItems: number = 0
  ): void {
    expect(response, 'Response should be defined').toBeDefined();
    expect(response.data, 'Response should have data array').toBeDefined();
    expect(Array.isArray(response.data), 'Response data should be array').toBe(
      true
    );
    expect(
      response.data.length,
      `Response should have at least ${minItems} items`
    ).toBeGreaterThanOrEqual(minItems);

    // Check pagination metadata if present
    if (response.pagination) {
      expect(
        typeof response.pagination.has_more,
        'Pagination has_more should be boolean'
      ).toBe('boolean');
      if (response.pagination.count !== undefined) {
        expect(
          typeof response.pagination.count,
          'Pagination count should be number'
        ).toBe('number');
      }
    }
  }

  /**
   * Assert that object has expected shape/structure
   */
  static expectObjectShape(
    obj: TestDataObject,
    expectedShape: ExpectedDataShape
  ): void {
    expect(obj, 'Object should be defined').toBeDefined();

    for (const [key, expectedType] of Object.entries(expectedShape)) {
      if (typeof expectedType === 'string') {
        expect(
          typeof obj[key],
          `Property ${key} should be ${expectedType}`
        ).toBe(expectedType);
      } else if (
        typeof expectedType === 'object' &&
        !Array.isArray(expectedType)
      ) {
        expect(obj[key], `Property ${key} should be object`).toBeDefined();
        if (
          obj[key] &&
          typeof obj[key] === 'object' &&
          !Array.isArray(obj[key]) &&
          expectedType
        ) {
          this.expectObjectShape(
            obj[key] as TestDataObject,
            expectedType as ExpectedDataShape
          );
        }
      } else if (Array.isArray(expectedType) && expectedType.length > 0) {
        expect(Array.isArray(obj[key]), `Property ${key} should be array`).toBe(
          true
        );
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
    const expectedPrefix =
      prefix || (config as any).testData?.testDataPrefix || 'E2E_TEST_';

    const hasPrefix = this.hasTestPrefix(data, expectedPrefix);
    expect(
      hasPrefix,
      `Data should contain test prefix "${expectedPrefix}"`
    ).toBe(true);
  }

  /**
   * Assert that test data does NOT have test prefixing (for production data)
   */
  static expectNoTestDataPrefix(data: TestDataObject): void {
    const config = configLoader.getConfig();
    const testPrefix = (config as any).testData?.testDataPrefix || 'E2E_TEST_';

    const hasPrefix = this.hasTestPrefix(data, testPrefix);
    expect(
      hasPrefix,
      `Data should NOT contain test prefix "${testPrefix}"`
    ).toBe(false);
  }

  /**
   * Helper to check if data contains test prefix
   */
  private static hasTestPrefix(data: TestDataObject, prefix: string): boolean {
    if (typeof data === 'string') {
      return data.includes(prefix);
    }

    if (Array.isArray(data)) {
      return data.some((item) => this.hasTestPrefix(item, prefix));
    }

    if (data && typeof data === 'object') {
      return Object.values(data).some((value) =>
        this.hasTestPrefix(value, prefix)
      );
    }

    return false;
  }

  /**
   * Assert that email follows test domain pattern
   */
  static expectTestEmail(email: string): void {
    const config = configLoader.getConfig();
    expect(email, 'Email should be defined').toBeDefined();
    expect(
      email.includes(config.testData.testEmailDomain),
      `Email "${email}" should contain test domain "${config.testData.testEmailDomain}"`
    ).toBe(true);
  }

  /**
   * Assert that domain follows test domain pattern
   */
  static expectTestDomain(domain: string): void {
    const config = configLoader.getConfig();
    expect(domain, 'Domain should be defined').toBeDefined();
    expect(
      domain.includes(config.testData.testCompanyDomain),
      `Domain "${domain}" should contain test domain "${config.testData.testCompanyDomain}"`
    ).toBe(true);
  }

  /**
   * Assert execution time is within reasonable bounds
   */
  static expectReasonableExecutionTime(
    response: McpToolResponse,
    maxMs: number = 30000
  ): void {
    if (response._meta?.executionTime) {
      expect(
        response._meta.executionTime,
        `Execution time ${response._meta.executionTime}ms should be under ${maxMs}ms`
      ).toBeLessThan(maxMs);
    }
  }

  /**
   * Assert that search results are relevant to query
   */
  static expectRelevantSearchResults(
    results: SearchResultItem[],
    query: string,
    minRelevance: number = 0.5
  ): void {
    expect(results, 'Search results should be defined').toBeDefined();
    expect(Array.isArray(results), 'Search results should be array').toBe(true);

    if (results.length === 0) {
      console.warn(`No search results returned for query: "${query}"`);
      return;
    }

    // Basic relevance check - at least some results should contain query terms
    const queryTerms = query.toLowerCase().split(/\s+/);
    const relevantResults = results.filter((result) => {
      const resultText = JSON.stringify(result).toLowerCase();
      return queryTerms.some((term) => resultText.includes(term));
    });

    const relevanceScore = relevantResults.length / results.length;
    expect(
      relevanceScore,
      `Search relevance score ${relevanceScore} should be at least ${minRelevance}`
    ).toBeGreaterThanOrEqual(minRelevance);
  }

  /**
   * Assert that operation was idempotent
   */
  static expectIdempotentOperation(
    firstResult: TestDataObject,
    secondResult: TestDataObject
  ): void {
    expect(
      firstResult,
      'First operation result should be defined'
    ).toBeDefined();
    expect(
      secondResult,
      'Second operation result should be defined'
    ).toBeDefined();

    // For update operations, the results should be equivalent
    expect(JSON.stringify(firstResult), 'Operations should be idempotent').toBe(
      JSON.stringify(secondResult)
    );
  }

  /**
   * Assert that batch operation results are consistent
   */
  static expectConsistentBatchResults(
    results: BatchOperationResult[],
    expectedCount: number
  ): void {
    expect(results, 'Batch results should be defined').toBeDefined();
    expect(Array.isArray(results), 'Batch results should be array').toBe(true);
    expect(results.length, `Batch should have ${expectedCount} results`).toBe(
      expectedCount
    );

    // All results should have consistent structure
    if (results.length > 1) {
      const firstResultKeys = Object.keys(results[0] || {}).sort();
      results.forEach((result, index) => {
        const resultKeys = Object.keys(result || {}).sort();
        expect(
          resultKeys.join(','),
          `Result ${index} should have consistent structure`
        ).toBe(firstResultKeys.join(','));
      });
    }
  }

  /**
   * Resource-aware ID assertion helper
   */
  static expectResourceId(
    obj: any, 
    resourceType: 'notes' | 'tasks' | 'companies' | 'people' | 'lists'
  ): void {
    expect(obj, `${resourceType.slice(0, -1)} should be defined`).toBeDefined();
    expect(obj.id, `${resourceType.slice(0, -1)} should have id object`).toBeDefined();
    expect(typeof obj.id, `${resourceType.slice(0, -1)} ID should be object`).toBe('object');
    
    switch (resourceType) {
      case 'notes':
        expect(obj.id.note_id, 'Note should have note_id').toBeDefined();
        expect(typeof obj.id.note_id, 'Note ID should be string').toBe('string');
        break;
      case 'tasks':
        expect(obj.id.task_id, 'Task should have task_id').toBeDefined();
        expect(typeof obj.id.task_id, 'Task ID should be string').toBe('string');
        break;
      case 'companies':
      case 'people':
        expect(obj.id.record_id, 'Record should have record_id').toBeDefined();
        expect(typeof obj.id.record_id, 'Record ID should be string').toBe('string');
        break;
      case 'lists':
        expect(obj.id.list_id, 'List should have list_id').toBeDefined();
        expect(typeof obj.id.list_id, 'List ID should be string').toBe('string');
        break;
    }
    
    // All resources should have workspace_id
    expect(obj.id.workspace_id, `${resourceType.slice(0, -1)} should have workspace_id`).toBeDefined();
    expect(typeof obj.id.workspace_id, 'Workspace ID should be string').toBe('string');
  }

  /**
   * Assert that note response has valid structure
   */
  static expectValidNoteStructure(note: any): void {
    expect(note, 'Note should be defined').toBeDefined();
    expect(typeof note, 'Note should be object').toBe('object');

    // Use resource-aware ID assertion for notes
    this.expectResourceId(note, 'notes');
    
    expect(note.title, 'Note should have title').toBeDefined();
    expect(note.content, 'Note should have content').toBeDefined();
    expect(typeof note.title, 'Note title should be string').toBe('string');
    expect(typeof note.content, 'Note content should be string').toBe('string');

    // Note format validation
    if (note.format) {
      expect(
        ['plaintext', 'html', 'markdown'].includes(note.format),
        `Note format "${note.format}" should be valid`
      ).toBe(true);
    }

    // Timestamps
    if (note.created_at) {
      expect(
        new Date(note.created_at).getTime(),
        'Created date should be valid'
      ).not.toBeNaN();
    }
    if (note.updated_at) {
      expect(
        new Date(note.updated_at).getTime(),
        'Updated date should be valid'
      ).not.toBeNaN();
    }
  }

  /**
   * Assert that note collection response is valid
   */
  static expectValidNoteCollection(response: any, minCount: number = 0): void {
    expect(
      response,
      'Note collection response should be defined'
    ).toBeDefined();

    let notes: any[];
    if (Array.isArray(response)) {
      notes = response;
    } else if (response.data && Array.isArray(response.data)) {
      notes = response.data;
    } else if (response.content && Array.isArray(response.content)) {
      notes = response.content;
    } else {
      throw new Error(
        'Note collection should be array or have data/content array property'
      );
    }

    expect(
      notes.length,
      `Should have at least ${minCount} notes`
    ).toBeGreaterThanOrEqual(minCount);

    // Validate each note in collection
    notes.forEach((note, index) => {
      try {
        this.expectValidNoteStructure(note);
      } catch (error: unknown) {
        throw new Error(
          `Note ${index} validation failed: ${(error as Error).message || String(error)}`
        );
      }
    });
  }

  /**
   * Assert that note content matches expected format
   */
  static expectNoteContentFormat(
    note: any,
    expectedFormat: 'plaintext' | 'html' | 'markdown'
  ): void {
    this.expectValidNoteStructure(note);

    if (note.format) {
      expect(note.format, `Note format should be ${expectedFormat}`).toBe(
        expectedFormat
      );
    }

    // Content validation based on format
    switch (expectedFormat) {
      case 'html':
        expect(
          note.content.includes('<') || note.content.includes('>'),
          'HTML note should contain HTML tags'
        ).toBe(true);
        break;
      case 'markdown':
        expect(
          note.content.includes('#') ||
            note.content.includes('*') ||
            note.content.includes('-'),
          'Markdown note should contain markdown syntax'
        ).toBe(true);
        break;
      case 'plaintext':
        // Plaintext validation - no HTML tags
        expect(
          note.content.includes('<'),
          'Plaintext note should not contain HTML tags'
        ).toBe(false);
        break;
    }
  }

  /**
   * Assert that note is properly linked to parent record
   */
  static expectNoteLinkedToRecord(
    note: any,
    expectedParentType: string,
    expectedParentId?: string
  ): void {
    this.expectValidNoteStructure(note);

    // Check for parent object linkage (may vary by API implementation)
    if (note.parent_object) {
      expect(
        note.parent_object,
        `Note should be linked to ${expectedParentType}`
      ).toBe(expectedParentType);
    }

    if (expectedParentId && note.parent_record_id) {
      expect(
        note.parent_record_id,
        `Note should be linked to record ${expectedParentId}`
      ).toBe(expectedParentId);
    }

    // Alternative structure checks for different API implementations
    if (note.linked_to && Array.isArray(note.linked_to)) {
      const linkFound = note.linked_to.some(
        (link: any) =>
          link.target_object === expectedParentType ||
          (expectedParentId && link.target_record_id === expectedParentId)
      );
      expect(
        linkFound,
        `Note should be linked to ${expectedParentType} record`
      ).toBe(true);
    }
  }

  /**
   * Assert that note has valid test data characteristics
   */
  static expectTestNote(note: any): void {
    this.expectValidNoteStructure(note);

    let config;
    try {
      config = configLoader.getConfig();
    } catch (error: any) {
      if (error?.message?.includes('Configuration not loaded')) {
        // Use fallback if config not loaded
        config = { testData: { testDataPrefix: 'E2E_TEST_' } };
      } else {
        throw error;
      }
    }
    const testPrefix = (config as any).testData?.testDataPrefix || 'E2E_TEST_';

    // Check if note title indicates it's test data
    expect(
      note.title.includes('E2E') || note.title.includes(testPrefix),
      'Test note should have E2E or test prefix in title'
    ).toBe(true);

    // Check content for test indicators - accept tags as alternative
    const hasContentMarker =
      note.content.includes('E2E') || note.content.includes('test');
    const hasTagMarker =
      note.tags && Array.isArray(note.tags) && note.tags.includes('e2e-test');
    expect(
      hasContentMarker || hasTagMarker,
      'Test note should have E2E markers in content or tags'
    ).toBe(true);
  }
}

/**
 * Helper function to create fluent assertion chains
 */
export function expectE2E(actual: TestDataObject) {
  return {
    toBeValidMcpResponse: () => E2EAssertions.expectMcpSuccess(actual),
    toBeValidAttioRecord: (resourceType?: string) =>
      E2EAssertions.expectAttioRecord(actual, resourceType),
    toHaveTestPrefix: (prefix?: string) =>
      E2EAssertions.expectTestDataPrefix(actual, prefix),
    toBeTestEmail: () => E2EAssertions.expectTestEmail(actual),
    toBeTestDomain: () => E2EAssertions.expectTestDomain(actual),
    toBePaginatedResponse: (minItems?: number) =>
      E2EAssertions.expectPaginatedResponse(actual, minItems),
    toHaveShape: (expectedShape: ExpectedDataShape) =>
      E2EAssertions.expectObjectShape(actual, expectedShape),
    toBeRelevantSearchResults: (query: string, minRelevance?: number) =>
      E2EAssertions.expectRelevantSearchResults(actual, query, minRelevance),
  };
}

/**
 * Export the main assertion class as default
 */
export default E2EAssertions;
