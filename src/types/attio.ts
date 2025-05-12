/**
 * Common type definitions for Attio API responses and entities
 */

/**
 * Base interface for Attio record values
 */
export interface AttioValue<T> {
  value: T;
  [key: string]: any; // Additional fields that might be present
}

/**
 * Base interface for Attio records (common between people and companies)
 */
export interface AttioRecord {
  id: { 
    record_id: string;
    [key: string]: any;
  };
  values: {
    name?: Array<AttioValue<string>>;
    email?: Array<AttioValue<string>>;
    phone?: Array<AttioValue<string>>;
    industry?: Array<AttioValue<string>>;
    website?: Array<AttioValue<string>>;
    [key: string]: any; // Other fields
  };
  [key: string]: any; // Additional top-level fields
}

/**
 * Person record type
 */
export interface Person extends AttioRecord {
  // Person-specific fields could be defined here
}

/**
 * Company record type
 */
export interface Company extends AttioRecord {
  // Company-specific fields could be defined here
}

/**
 * Note record type
 */
export interface AttioNote {
  id: { 
    note_id: string;
    [key: string]: any;
  };
  title: string;
  content: string;
  format: string;
  parent_object: string;
  parent_record_id: string;
  created_at: string;
  updated_at: string;
  [key: string]: any; // Additional fields
}

/**
 * List record type
 */
export interface AttioList {
  id: {
    list_id: string;
    [key: string]: any;
  };
  title: string;
  description?: string;
  object_slug: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  entry_count?: number;
  [key: string]: any; // Additional fields
}

/**
 * List entry record type
 */
export interface AttioListEntry {
  id: {
    entry_id: string;
    [key: string]: any;
  };
  list_id: string;
  record_id: string;
  created_at: string;
  updated_at?: string;
  record?: AttioRecord; // Optional included record data
  [key: string]: any; // Additional fields
}

/**
 * Resource type enum for better type safety
 */
export enum ResourceType {
  PEOPLE = 'people',
  COMPANIES = 'companies',
  LISTS = 'lists'
}

/**
 * API error response shape
 */
export interface AttioErrorResponse {
  status?: number;
  data?: any;
  headers?: Record<string, string>;
  error?: string;
  message?: string;
  details?: any;
  [key: string]: any;
}

/**
 * API response containing a list of records
 */
export interface AttioListResponse<T> {
  data: T[];
  pagination?: {
    total_count: number;
    next_cursor?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * API response containing a single record
 */
export interface AttioSingleResponse<T> {
  data: T;
  [key: string]: any;
}
