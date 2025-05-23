/**
 * Type definitions for company validator module
 */

import { AttributeType } from '../attribute-validator.js';

/**
 * Cached type information for fields
 */
export interface CachedTypeInfo {
  type: AttributeType;
  lastUpdated: number;
  confidence: number;
}

/**
 * Field type detection result
 */
export interface FieldTypeDetectionResult {
  type: AttributeType;
  confidence: number;
  source: 'cache' | 'api' | 'heuristic';
}

/**
 * Configuration for field type detection
 */
export interface TypeDetectionConfig {
  useCache: boolean;
  fallbackToHeuristic: boolean;
  cacheThreshold: number;
}

/**
 * Company field processing options
 */
export interface FieldProcessingOptions {
  strict: boolean;
  allowTypeCoercion: boolean;
  validateFormat: boolean;
}