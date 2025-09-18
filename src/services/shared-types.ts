/**
 * Shared type definitions for Services
 *
 * Common interfaces used across create and update services to replace
 * 'any' types and improve type safety throughout the services layer.
 */

import type { AttioRecord } from '../types/attio.js';

/**
 * Generic input data for service operations
 */
export type InputData = Record<string, unknown>;

/**
 * Normalized data after processing through data normalizers
 */
export interface NormalizedData {
  [key: string]: unknown;
}

/**
 * Note record interface to replace any usage in note operations
 */
export interface NoteRecord {
  id?: {
    note_id?: string;
    record_id?: string;
    workspace_id?: string;
  };
  title?: string;
  content?: string;
  format?: string;
  created_at?: string;
  updated_at?: string;
  resource_type?: string;
  record_id?: string;
  [key: string]: unknown;
}

/**
 * Task input data structure
 */
export interface TaskInput {
  title?: string;
  content?: string;
  deadline?: string;
  assignees?: Array<{ target_record_id: string }>;
  linked_records?: Array<{ target_record_id: string }>;
  [key: string]: unknown;
}

/**
 * Validation data structure
 */
export interface ValidationData {
  [key: string]: unknown;
}

/**
 * List attributes for list creation
 */
export interface ListAttributes {
  name?: string;
  title?: string;
  description?: string;
  parent_object?: string;
  api_slug?: string;
  workspace_id?: string;
  workspace_member_access?: string;
  created_at?: string;
  [key: string]: unknown;
}

/**
 * Company attributes for company operations
 */
export interface CompanyAttributes {
  name?: string;
  domains?: Array<{ value: string }>;
  industry?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Person attributes for person operations
 */
export interface PersonAttributes {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email_addresses?: Array<{ email_address: string }>;
  phone_numbers?: Array<{ phone_number: string }>;
  [key: string]: unknown;
}

/**
 * Creator interface for all record creators
 */
export interface Creator {
  create(input: InputData): Promise<AttioRecord>;
  validateInput?(input: InputData): boolean | string;
}

/**
 * Strategy interface for create strategies
 */
export interface CreateStrategy {
  create(input: InputData): Promise<AttioRecord>;
  validate?(input: InputData): boolean | string;
}

/**
 * Update strategy interface
 */
export interface UpdateStrategy {
  update(id: string, input: InputData): Promise<AttioRecord>;
  validate?(input: InputData): boolean | string;
}

/**
 * Error context for operations
 */
export interface ServiceErrorContext {
  operation: string;
  resourceType?: string;
  recordId?: string;
  input?: InputData;
  [key: string]: unknown;
}
