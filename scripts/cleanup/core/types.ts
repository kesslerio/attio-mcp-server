/**
 * Shared types for cleanup scripts
 */

export interface CleanupOptions {
  dryRun: boolean;
  live: boolean;
  resources: string[];
  apiToken?: string;
  pattern?: string;
  parallel: number;
  verbose: boolean;
}

export interface CleanupConfig {
  workspaceApiUuid: string;
  defaultResources: string[];
  maxParallel: number;
  rateLimit: number;
}

export interface ResourceSummary {
  type: string;
  found: number;
  deleted: number;
  errors: number;
  items: ResourceItem[];
}

export interface ResourceItem {
  id: string;
  name: string;
  createdBy?: string;
  createdAt?: string;
}

export interface CleanupResult {
  success: boolean;
  summaries: ResourceSummary[];
  totalFound: number;
  totalDeleted: number;
  totalErrors: number;
  duration: number;
}

export interface AttioRecord {
  id: any;
  created_by_actor?: {
    type?: string;
    id?: string;
  };
  created_at?: string;
  // Task fields
  content_plaintext?: string;
  content?: string;
  title?: string;
  // Company/Person fields
  name?: string;
  first_name?: string;
  last_name?: string;
  // List fields
  // Note fields
  [key: string]: any;
}

export type ResourceType = 'companies' | 'people' | 'deals' | 'tasks' | 'lists' | 'notes';

export interface FetchResult {
  records: AttioRecord[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface FilterResult {
  matched: AttioRecord[];
  excluded: AttioRecord[];
  reasons: string[];
}