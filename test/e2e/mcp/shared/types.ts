/**
 * Type definitions for MCP test suite
 * Provides type safety for test data and responses
 */

// Resource-specific data types for creation
export interface CompanyCreateData {
  name: string;
  domains?: string[];
  description?: string;
  website?: string;
  phone_numbers?: string[];
  [key: string]: unknown; // Allow additional fields
}

export interface PersonCreateData {
  name: string;
  email_addresses?: string[];
  job_title?: string;
  phone_numbers?: string[];
  company?: string;
  [key: string]: unknown;
}

export interface TaskCreateData {
  title: string;
  content?: string;
  is_completed?: boolean;
  deadline_at?: string;
  assignees?: string[];
  linked_records?: Array<{ target_object: string; target_record_id: string }>;
  [key: string]: unknown;
}

export interface NoteCreateData {
  title: string;
  content: string;
  parent_object?: string;
  parent_record_id?: string;
  [key: string]: unknown;
}

export interface DealCreateData {
  name: string;
  stage: string;
  value?: number;
  owner?: string;
  associated_company?: string;
  associated_people?: string[];
  [key: string]: unknown;
}

// Update data types (partial versions for updates)
export type CompanyUpdateData = Partial<CompanyCreateData>;
export type PersonUpdateData = Partial<PersonCreateData>;
export type TaskUpdateData = Partial<Omit<TaskCreateData, 'title'>>; // Title typically not updatable
export type NoteUpdateData = Partial<NoteCreateData>;
export type DealUpdateData = Partial<DealCreateData>;

// Search parameters
export interface SearchParams {
  resource_type: ResourceType;
  query?: string;
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

// Resource types enum
export enum ResourceType {
  COMPANIES = 'companies',
  PEOPLE = 'people',
  TASKS = 'tasks',
  NOTES = 'notes',
  LISTS = 'lists',
  DEALS = 'deals',
  RECORDS = 'records'
}

// MCP Response type (text-based)
export interface MCPResponse {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

// Quality gate types
export interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
}

export interface QualityGateResult {
  priority: 'P0' | 'P1' | 'P2';
  totalTests: number;
  passedTests: number;
  passRate: number;
  requiredRate: number;
  passed: boolean;
  failures: TestResult[];
}