/**
 * Universal Constants for Attio MCP Server
 *
 * Centralized location for all magic numbers, field mappings, and configuration
 * constants used throughout the universal handlers and services.
 *
 * Addresses PR feedback: Extract constants to improve maintainability and
 * reduce magic numbers scattered throughout the codebase.
 */

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';

// ========================================
// Cache Configuration
// ========================================

/** Default TTL for tasks cache in milliseconds (30 seconds) */
export const DEFAULT_TASKS_CACHE_TTL = 30000;

/** Default TTL for 404 response cache in milliseconds (60 seconds) */
export const DEFAULT_404_CACHE_TTL = 60000;

/** Default TTL for attribute discovery cache in milliseconds (5 minutes) */
export const DEFAULT_ATTRIBUTES_CACHE_TTL = 300000;

/** Maximum number of cache entries before cleanup */
export const MAX_CACHE_ENTRIES = 1000;

// ========================================
// Performance & Limits
// ========================================

/** Maximum number of suggestions to show in validation errors */
export const MAX_VALIDATION_SUGGESTIONS = 5;

/** Maximum length for truncated suggestion text */
export const MAX_SUGGESTION_TEXT_LENGTH = 100;

/** Default request timeout in milliseconds */
export const DEFAULT_REQUEST_TIMEOUT = 30000;

/** Maximum number of retry attempts for API calls */
export const MAX_RETRY_ATTEMPTS = 3;

/** Base delay between retries in milliseconds */
export const RETRY_BASE_DELAY = 1000;

// ========================================
// Resource Type Mappings
// ========================================

/**
 * Maps various resource type strings to canonical UniversalResourceType values
 * Handles common typos and plural/singular variations
 */
export const RESOURCE_TYPE_MAPPINGS: Record<string, UniversalResourceType> = {
  // Canonical forms
  record: UniversalResourceType.RECORDS,
  records: UniversalResourceType.RECORDS,
  company: UniversalResourceType.COMPANIES,
  companies: UniversalResourceType.COMPANIES,
  person: UniversalResourceType.PEOPLE,
  people: UniversalResourceType.PEOPLE,
  deal: UniversalResourceType.DEALS,
  deals: UniversalResourceType.DEALS,
  task: UniversalResourceType.TASKS,
  tasks: UniversalResourceType.TASKS,
  note: UniversalResourceType.NOTES,
  notes: UniversalResourceType.NOTES,
  list: UniversalResourceType.LISTS,
  lists: UniversalResourceType.LISTS,

  // Common typos and variations
  comapny: UniversalResourceType.COMPANIES,
  compnay: UniversalResourceType.COMPANIES,
  poeple: UniversalResourceType.PEOPLE,
  peolpe: UniversalResourceType.PEOPLE,
  dela: UniversalResourceType.DEALS,
  dael: UniversalResourceType.DEALS,
  taks: UniversalResourceType.TASKS,
  tsak: UniversalResourceType.TASKS,
  not: UniversalResourceType.NOTES,
  liste: UniversalResourceType.LISTS,
};

/**
 * Maps resource types to their Attio API object slugs
 * Used for schema discovery and API routing
 */
export const OBJECT_SLUG_MAP: Record<string, string> = {
  companies: 'companies',
  people: 'people',
  deals: 'deals',
  tasks: 'tasks',
  records: 'records',
  lists: 'lists',
  notes: 'notes',
};

// ========================================
// Field Mappings - Companies
// ========================================

export const COMPANY_FIELD_MAPPINGS = {
  // Common incorrect field names -> correct ones
  website: 'domains',
  url: 'domains',
  company_name: 'name',
  company_domain: 'domains',
  domain: 'domains',
  website_url: 'domains',
  company_url: 'domains',
  site: 'domains',
  homepage: 'domains',
  web: 'domains',

  // Industry and description
  industry_type: 'industry',
  business_type: 'industry',
  sector: 'industry',
  category: 'industry',
  about: 'description',
  summary: 'description',
  overview: 'description',
  info: 'description',
  details: 'description',

  // Size and employee count
  size: 'team_size',
  employees: 'team_size',
  employee_count: 'team_size',
  headcount: 'team_size',
  staff_count: 'team_size',
};

export const COMPANY_VALID_FIELDS = [
  'name',
  'domains',
  'description',
  'industry',
  'team_size',
  'founded_at',
  'headquarters',
  'linkedin_url',
  'twitter_handle',
  'facebook_url',
  'crunchbase_url',
  'annual_revenue',
  'categories',
  'locations',
];

export const COMPANY_COMMON_MISTAKES = {
  website: 'Use "domains" for company websites (as an array of strings)',
  url: 'Use "domains" for company websites (as an array of strings)',
  company_name: 'Use "name" for the company name',
  about: 'Use "description" for company descriptions',
  size: 'Use "team_size" for employee count (as a number)',
};

// ========================================
// Field Mappings - People
// ========================================

export const PEOPLE_FIELD_MAPPINGS = {
  // Name variations
  full_name: 'name',
  fullname: 'name',
  person_name: 'name',
  contact_name: 'name',
  individual_name: 'name',

  // Email variations
  email: 'email_addresses',
  emails: 'email_addresses',
  email_address: 'email_addresses',
  contact_email: 'email_addresses',
  work_email: 'email_addresses',
  business_email: 'email_addresses',

  // Phone variations
  phone: 'phone_numbers',
  phones: 'phone_numbers',
  phone_number: 'phone_numbers',
  contact_phone: 'phone_numbers',
  mobile: 'phone_numbers',
  cell: 'phone_numbers',
  telephone: 'phone_numbers',

  // Job title variations
  job_title: 'title',
  position: 'title',
  role: 'title',
  job_position: 'title',
  job_role: 'title',
  occupation: 'title',
  designation: 'title',
};

export const PEOPLE_VALID_FIELDS = [
  'name',
  'email_addresses',
  'phone_numbers',
  'title',
  'linkedin_url',
  'twitter_handle',
  'location',
  'avatar_url',
  'timezone',
  'primary_email_address',
  'primary_phone_number',
];

export const PEOPLE_COMMON_MISTAKES = {
  email: 'Use "email_addresses" as an array of email strings',
  phone: 'Use "phone_numbers" as an array of phone strings',
  job_title: 'Use "title" for job titles',
  full_name: 'Use "name" for person names (can be string or name object)',
};

// ========================================
// Field Mappings - Tasks
// ========================================

export const TASK_FIELD_MAPPINGS = {
  // Content variations
  task: 'content',
  description: 'content',
  title: 'content',
  name: 'content',
  task_name: 'content',
  task_title: 'content',
  task_description: 'content',
  todo: 'content',
  item: 'content',

  // Status variations
  status: 'is_completed',
  completed: 'is_completed',
  done: 'is_completed',
  finished: 'is_completed',
  complete: 'is_completed',
  is_done: 'is_completed',
  is_finished: 'is_completed',

  // Deadline variations
  deadline: 'deadline_at',
  due_date: 'deadline_at',
  due: 'deadline_at',
  expires_at: 'deadline_at',
  completion_date: 'deadline_at',
  target_date: 'deadline_at',

  // Assignment variations
  assignee: 'assignees',
  assigned_to: 'assignees',
  owner: 'assignees',
  responsible: 'assignees',
  assigned_user: 'assignees',
  task_owner: 'assignees',

  // Linked records variations
  linked_record: 'linked_records',
  related_records: 'linked_records',
  connected_records: 'linked_records',
  associated_records: 'linked_records',
};

export const TASK_VALID_FIELDS = [
  'content',
  'is_completed',
  'deadline_at',
  'assignees',
  'linked_records',
  'created_at',
  'updated_at',
  'completed_at',
];

export const TASK_COMMON_MISTAKES = {
  task: 'Use "content" for task descriptions',
  title: 'Use "content" for task descriptions',
  status: 'Use "is_completed" (boolean) for completion status',
  deadline: 'Use "deadline_at" for due dates (ISO 8601 string)',
  assignee: 'Use "assignees" as an array of user IDs',
};

// ========================================
// Field Mappings - Deals
// ========================================

export const DEAL_FIELD_MAPPINGS = {
  // Name variations
  deal_name: 'name',
  opportunity_name: 'name',
  title: 'name',
  deal_title: 'name',

  // Value variations
  amount: 'value',
  deal_value: 'value',
  opportunity_value: 'value',
  deal_amount: 'value',
  revenue: 'value',

  // Stage variations
  deal_stage: 'stage',
  opportunity_stage: 'stage',
  sales_stage: 'stage',
  pipeline_stage: 'stage',

  // Close date variations
  close_date: 'close_date',
  expected_close: 'close_date',
  target_close: 'close_date',
  projected_close: 'close_date',
};

export const DEAL_VALID_FIELDS = [
  'name',
  'value',
  'stage',
  'close_date',
  'currency',
  'probability',
  'owner',
  'source',
  'type',
  'priority',
];

export const DEAL_COMMON_MISTAKES = {
  amount: 'Use "value" for deal amounts',
  deal_name: 'Use "name" for deal names',
  deal_stage: 'Use "stage" for deal stages',
  close_date: 'Use "close_date" for expected close dates',
};

// ========================================
// Field Mappings - Records
// ========================================

export const RECORD_FIELD_MAPPINGS = {
  // Generic record mappings
  title: 'name',
  record_name: 'name',
};

export const RECORD_VALID_FIELDS = [
  'object',
  'object_api_slug',
  'object_slug',
  'values',
  'name',
  'notes',
  'created_at',
  'updated_at',
];

export const RECORD_COMMON_MISTAKES = {
  title: 'Use "name" for record titles',
};

// ========================================
// Field Mappings - Notes
// ========================================

export const NOTE_FIELD_MAPPINGS = {
  // Content variations
  note: 'content',
  text: 'content',
  body: 'content',
  message: 'content',
  description: 'content',
  comment: 'content',

  // Title variations
  note_title: 'title',
  subject: 'title',
  heading: 'title',

  // Parent record variations
  parent: 'parent_record_id',
  record_id: 'parent_record_id',
  attached_to: 'parent_record_id',
  linked_to: 'parent_record_id',

  // Parent object variations
  object_type: 'parent_object',
  parent_type: 'parent_object',
  attached_to_type: 'parent_object',
};

export const NOTE_VALID_FIELDS = [
  'content',
  'title',
  'parent_object',
  'parent_record_id',
  'format',
  'created_at',
  'updated_at',
];

export const NOTE_COMMON_MISTAKES = {
  note: 'Use "content" for note text',
  text: 'Use "content" for note text',
  parent: 'Use "parent_record_id" for the record the note is attached to',
  object_type:
    'Use "parent_object" for the type of record the note is attached to',
};

// ========================================
// Error Messages
// ========================================

export const ERROR_MESSAGES = {
  INVALID_RESOURCE_TYPE: (type: string) => `Invalid resource type: ${type}`,
  MISSING_REQUIRED_FIELD: (field: string) => `Missing required field: ${field}`,
  INVALID_FIELD_TYPE: (field: string, expected: string, received: string) =>
    `Invalid type for field "${field}": expected ${expected}, received ${received}`,
  FIELD_COLLISION: (fields: string[], target: string) =>
    `Multiple fields map to "${target}": ${fields.join(', ')}`,
  ATTRIBUTE_DISCOVERY_FAILED: (resourceType: string) =>
    `Failed to discover attributes for ${resourceType}`,
  CACHE_CLEANUP_FAILED: 'Failed to cleanup expired cache entries',
  VALIDATION_FAILED: (resourceType: string) =>
    `Validation failed for ${resourceType}`,
};

// ========================================
// Validation Patterns
// ========================================

/** Regex pattern for valid email addresses (basic validation) */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Regex pattern for valid phone numbers (international format) */
export const PHONE_PATTERN = /^\+?[\d\s\-().]+$/;

/** Regex pattern for valid URLs */
export const URL_PATTERN = /^https?:\/\/.+/;

/** Regex pattern for valid UUID format */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ========================================
// Boolean Conversion Values
// ========================================

/** Values that should be converted to true */
export const TRUTHY_VALUES = [
  'done',
  'complete',
  'completed',
  'true',
  'yes',
  'y',
  '1',
  'closed',
  'finished',
  'resolved',
];

/** Values that should be converted to false */
export const FALSY_VALUES = [
  'open',
  'pending',
  'in progress',
  'false',
  'no',
  'n',
  '0',
  'todo',
  'incomplete',
  'unresolved',
];

// ========================================
// API Configuration
// ========================================

/** Default page size for paginated requests */
export const DEFAULT_PAGE_SIZE = 25;

/** Maximum page size allowed */
export const MAX_PAGE_SIZE = 100;

/** Default limit for search results */
export const DEFAULT_SEARCH_LIMIT = 10;

/** Maximum search results limit */
export const MAX_SEARCH_LIMIT = 500;
