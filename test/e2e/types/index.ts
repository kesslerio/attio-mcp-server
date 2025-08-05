/**
 * E2E Test Type Definitions
 * 
 * Comprehensive type definitions for E2E testing to replace 'any' types
 * with proper TypeScript interfaces for better type safety.
 */

/**
 * Base test data interface - represents any test data object
 */
export interface TestDataObject {
  [key: string]: unknown;
}

/**
 * Test object creation data - can be company, person, list, etc.
 */
export interface TestObjectData extends TestDataObject {
  name?: string;
  id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Company test data interface
 */
export interface CompanyTestData extends TestObjectData {
  name: string;
  domain?: string;
  website?: string;
  industry?: string;
  size?: string;
  annual_revenue?: number;
}

/**
 * Person test data interface
 */
export interface PersonTestData extends TestObjectData {
  name: string;
  email_addresses?: string[];
  phone_numbers?: string[];
  department?: string;
  seniority?: string;
  job_title?: string;
}

/**
 * List test data interface
 */
export interface ListTestData extends TestObjectData {
  name: string;
  description?: string;
  type?: string;
}

/**
 * Task test data interface
 */
export interface TaskTestData extends TestObjectData {
  title: string;
  description?: string;
  status?: string;
  due_date?: string;
}

/**
 * Note test data interface
 */
export interface NoteTestData extends TestObjectData {
  title?: string;
  content: string;
  note_type?: string;
}

/**
 * Union type for all test data types
 */
export type AnyTestData = 
  | CompanyTestData 
  | PersonTestData 
  | ListTestData 
  | TaskTestData 
  | NoteTestData 
  | TestObjectData;

/**
 * MCP Tool response data interface
 */
export interface McpResponseData extends TestDataObject {
  type?: string;
  text?: string;
  result?: unknown;
  records?: TestDataObject[];
}

/**
 * Expected data shape for validation
 */
export interface ExpectedDataShape {
  [key: string]: string | ExpectedDataShape | ExpectedDataShape[];
}

/**
 * Attio API record values interface
 */
export interface AttioRecordValues extends TestDataObject {
  [fieldKey: string]: unknown;
}

/**
 * Search result item interface
 */
export interface SearchResultItem extends TestDataObject {
  id: string;
  relevance_score?: number;
  matched_fields?: string[];
}

/**
 * Batch operation result interface
 */
export interface BatchOperationResult extends TestDataObject {
  id: string;
  status: 'success' | 'error';
  error?: string;
  data?: TestDataObject;
}

/**
 * Generic API response interface
 */
export interface ApiResponse<T = TestDataObject> {
  data: T;
  meta?: TestDataObject;
  errors?: TestDataObject[];
}

/**
 * Test validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}