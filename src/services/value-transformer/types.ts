/**
 * Types for the value transformer service
 * Auto-transforms values before API calls to prevent common errors
 */

import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';

/**
 * Context provided to transformers
 */
export interface TransformContext {
  /** The resource type being operated on */
  resourceType: UniversalResourceType;
  /** The operation type (create or update) */
  operation: 'create' | 'update';
  /** Optional record ID for updates */
  recordId?: string;
  /**
   * Optional pre-fetched attribute metadata to avoid duplicate API calls
   * @see Issue #984 - Consolidate metadata fetching
   */
  attributeMetadata?: Map<string, AttributeMetadata>;
}

/**
 * Result of a transformation
 */
export interface TransformResult {
  /** Whether transformation was applied */
  transformed: boolean;
  /** The original value */
  originalValue: unknown;
  /** The transformed value (same as original if not transformed) */
  transformedValue: unknown;
  /** Human-readable description of what was transformed */
  description?: string;
}

/**
 * Result of transforming an entire record
 */
export interface RecordTransformResult {
  /** The transformed record data */
  data: Record<string, unknown>;
  /** List of transformations applied */
  transformations: FieldTransformation[];
  /** Warnings about potential issues */
  warnings: string[];
}

/**
 * Details about a single field transformation
 */
export interface FieldTransformation {
  /** Field name that was transformed */
  field: string;
  /** Original value */
  from: unknown;
  /** Transformed value */
  to: unknown;
  /** Type of transformation applied */
  type: TransformationType;
  /** Human-readable description */
  description: string;
}

/**
 * Types of transformations supported
 */
export type TransformationType =
  | 'status_title_to_id' // "Demo Scheduling" → [{status: "uuid"}]
  | 'multi_select_wrap' // "Inbound" → ["Inbound"]
  | 'select_title_to_id' // "Technology" → ["uuid"]
  | 'array_coercion' // Single value to array
  | 'record_reference_format'; // "uuid" → [{target_object: "X", target_record_id: "uuid"}]

/**
 * Attribute metadata needed for transformation
 */
export interface AttributeMetadata {
  slug: string;
  type: string;
  title?: string;
  api_slug?: string;
  is_system_attribute?: boolean;
  is_writable?: boolean;
  /** Indicates multi-select attribute (Attio uses type="select" + is_multiselect=true) */
  is_multiselect?: boolean;
  /** Relationship metadata for record-reference attributes (Issue #997) */
  relationship?: {
    /** Target object type (e.g., 'companies', 'people') */
    object?: string;
    /** Relationship cardinality (API may return any string) */
    cardinality?: string;
  };
}

/**
 * Record reference value format expected by Attio API
 */
export interface RecordReferenceValue {
  target_object: string;
  target_record_id: string;
}

/**
 * Option for select/status attributes
 */
export interface AttributeOption {
  id: string;
  title: string;
  is_archived?: boolean;
}
