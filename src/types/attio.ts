/**
 * Type definitions for Attio API responses and data models
 */

export enum ResourceType {
  PEOPLE = 'people',
  COMPANIES = 'companies',
  LISTS = 'lists'
}

// Base interfaces
export interface AttioRecord {
  id: {
    record_id: string;
  };
  values: Record<string, any>;
}

export interface AttioNote {
  id: {
    note_id: string;
  };
  title: string;
  content: string;
  format: 'plaintext' | 'markdown';
  parent_object: string;
  parent_record_id: string;
  created_at: string;
  updated_at: string;
}

export interface AttioList {
  id: {
    list_id: string;
  };
  name: string;
  description?: string;
  object: string;
  created_at: string;
  updated_at: string;
}

export interface AttioListEntry {
  id: {
    entry_id: string;
  };
  list_id: string;
  record_id: string;
  created_at: string;
}

// Response interfaces
export interface AttioListResponse<T> {
  data?: T[];
  has_more?: boolean;
  next_cursor?: string;
}

export interface AttioSingleResponse<T> {
  data?: T;
}

// Specific record types
export interface Person extends AttioRecord {
  values: {
    name?: Array<{value: string}>;
    email?: Array<{value: string}>;
    phone?: Array<{value: string}>;
    [key: string]: any;
  };
}

export interface Company extends AttioRecord {
  values: {
    name?: Array<{value: string}>;
    website?: Array<{value: string}>;
    industry?: Array<{value: string}>;
    [key: string]: any;
  };
}