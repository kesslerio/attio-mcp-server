/**
 * Shared utilities for cleanup scripts
 */
import { AttioRecord, ResourceType } from './types.js';

/**
 * Extract a human-readable name from a record
 */
export function extractRecordName(record: AttioRecord, resourceType: ResourceType): string {
  // Try to get name from values first (new API structure)
  if (record.values?.name?.[0]?.value) {
    return record.values.name[0].value;
  }
  
  switch (resourceType) {
    case 'companies':
      return record.name || 'Unknown';
    case 'people':
      // Try first/last name from values
      const firstName = record.values?.first_name?.[0]?.value || record.first_name;
      const lastName = record.values?.last_name?.[0]?.value || record.last_name;
      if (firstName && lastName) {
        return `${firstName} ${lastName}`;
      }
      return firstName || lastName || record.name || 'Unknown';
    case 'tasks':
      return record.content_plaintext || record.content || record.title || 'Unknown';
    case 'lists':
      return record.name || record.title || 'Unknown';
    case 'notes':
      return record.title || record.content || 'Unknown';
    default:
      return 'Unknown';
  }
}

/**
 * Extract the ID from a record (handling different ID structures)
 */
export function extractRecordId(record: AttioRecord, resourceType: ResourceType): string {
  // Handle different ID structures
  if (typeof record.id === 'string') {
    return record.id;
  }

  // Handle object-based IDs (new API structure)
  if (record.id && typeof record.id === 'object') {
    // Try record_id first (new API structure)
    if (record.id.record_id) {
      return record.id.record_id;
    }
    
    // Fallback to resource-specific ID fields
    switch (resourceType) {
      case 'companies':
        return record.id.company_id || record.id.id;
      case 'people':
        return record.id.person_id || record.id.id;
      case 'tasks':
        return record.id.task_id || record.id.id;
      case 'lists':
        return record.id.list_id || record.id.id;
      case 'notes':
        return record.id.note_id || record.id.id;
      case 'deals':
        return record.id.deal_id || record.id.id;
      default:
        return record.id.id || JSON.stringify(record.id);
    }
  }

  return 'unknown-id';
}

/**
 * Check if a record was created by a specific API token
 * Different object types have different field structures:
 * - Tasks: created_by_actor.type and created_by_actor.id
 * - Companies/People: values.created_by[0].referenced_actor_type and referenced_actor_id
 */
export function isCreatedByApiToken(record: AttioRecord, apiToken: string, resourceType: ResourceType): boolean {
  switch (resourceType) {
    case 'tasks':
      return record.created_by_actor?.type === 'api-token' && 
             record.created_by_actor?.id === apiToken;
    
    case 'companies':
    case 'people':
    case 'lists':
    case 'notes':
      // These objects store created_by in the values field
      const createdBy = record.values?.created_by?.[0];
      return createdBy?.referenced_actor_type === 'api-token' && 
             createdBy?.referenced_actor_id === apiToken;
    
    default:
      return false;
  }
}

/**
 * Check if a record name matches any of the given patterns
 */
export function matchesPatterns(name: string, patterns: string[]): boolean {
  if (!patterns.length) return true;
  
  return patterns.some(pattern => {
    // Simple wildcard matching
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
      return regex.test(name);
    }
    // Prefix matching
    return name.toLowerCase().includes(pattern.toLowerCase());
  });
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Create a delay for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Log with consistent formatting
 */
export function log(emoji: string, message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`${emoji} [${timestamp}] ${message}`, data);
  } else {
    console.log(`${emoji} [${timestamp}] ${message}`);
  }
}

/**
 * Log error with consistent formatting
 */
export function logError(message: string, error?: any): void {
  log('❌', `ERROR: ${message}`, error);
}

/**
 * Log success with consistent formatting  
 */
export function logSuccess(message: string, data?: any): void {
  log('✅', message, data);
}

/**
 * Log info with consistent formatting
 */
export function logInfo(message: string, data?: any): void {
  log('ℹ️', message, data);
}

/**
 * Validate environment configuration
 */
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = ['ATTIO_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  return {
    valid: missing.length === 0,
    missing
  };
}