/**
 * Type definitions for Resource Creators
 *
 * Defines the Strategy Pattern interfaces and types used by resource-specific
 * creators to handle different Attio resource types (companies, people, tasks, notes).
 */

import type { AxiosInstance } from 'axios';
import type { AttioRecord } from '../../../types/attio.js';

/**
 * Context shared among all resource creators
 * Contains common dependencies and utilities
 */
export interface ResourceCreatorContext {
  /** Attio API client instance */
  client: AxiosInstance;
  /** Debug logging function */
  debug: (
    component: string,
    message: string,
    data?: Record<string, unknown>
  ) => void;
  /** Error logging function */
  logError: (
    component: string,
    message: string,
    data?: Record<string, unknown>
  ) => void;
}

/**
 * Base interface for all resource creators
 * Implements Strategy Pattern for handling different resource types
 */
export interface ResourceCreator {
  /**
   * Creates a resource record
   * @param input - Resource data to create
   * @param context - Shared context with client and utilities
   * @returns Promise<AttioRecord> - Created resource record
   */
  create(
    input: Record<string, unknown>,
    context: ResourceCreatorContext
  ): Promise<AttioRecord>;

  /**
   * Resource type handled by this creator
   */
  readonly resourceType: string;

  /**
   * API endpoint for this resource type
   */
  readonly endpoint: string;
}

/**
 * Error information for enhanced error handling
 */
export interface ResourceCreatorError {
  operation: string;
  endpoint: string;
  resourceType: string;
  originalError?: Error;
  httpStatus?: number;
}

/**
 * Recovery options for failed resource creation
 */
export interface RecoveryOptions {
  /** Search filters to find existing record */
  searchFilters: Array<{
    field: string;
    value: unknown;
    operator?: 'eq' | 'contains';
  }>;
  /** Maximum number of recovery attempts */
  maxAttempts?: number;
}
