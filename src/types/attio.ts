/**
 * Type definitions for Attio API entities and responses
 */

// Base types for API responses
export interface AttioListResponse<T> {
  data: T[];
  meta?: {
    total?: number;
    count?: number;
    limit?: number;
    offset?: number;
  };
}

export interface AttioSingleResponse<T> {
  data: T;
  meta?: any;
}

// Value wrapper used in Attio records
export interface AttioValue<T> {
  id: string;
  value: T;
  attribute: string;
  [key: string]: any;
}

// Base record type
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

// Person type
export interface Person extends AttioRecord {
  // Person-specific properties
}

// Company type
export interface Company extends AttioRecord {
  // Company-specific properties
}

// Note type
export interface AttioNote {
  id: {
    note_id: string;
    [key: string]: any;
  };
  title: string;
  content: string;
  format: 'plaintext' | 'markdown' | 'rich_text';
  parent_object: string;
  parent_record_id: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

// List type
export interface AttioList {
  id: string | {
    list_id: string;
    [key: string]: any;
  };
  title: string;
  object_slug: string;
  description?: string;
  entry_count?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

// List entry type
export interface AttioListEntry {
  id: string | {
    entry_id: string;
    [key: string]: any;
  };
  list_id: string;
  record_id: string;
  created_at?: string;
  [key: string]: any;
}

// Resource types
export enum ResourceType {
  PEOPLE = 'people',
  COMPANIES = 'companies',
  LISTS = 'lists'
}

// Error response from Attio API
export interface AttioErrorResponse {
  error: {
    message: string;
    type: string;
    code: string;
  };
  status: number;
}

// Enhanced error type
export interface AttioError extends Error {
  status?: number;
  response?: any;
  request?: any;
  config?: any;
  isAxiosError?: boolean;
}