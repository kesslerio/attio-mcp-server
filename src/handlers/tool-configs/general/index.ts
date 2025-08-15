/**
 * General tool configurations module
 *
 * This module provides tool configurations for operations that span
 * multiple resource types or provide general utility functions.
 */

// Import relationship management tools
import {
  relationshipToolConfigs,
  relationshipToolDefinitions,
} from '../relationships/index.js';

/**
 * Aggregated general tool configurations
 */
export const generalToolConfigs = {
  ...relationshipToolConfigs,
};

/**
 * Aggregated general tool definitions
 */
export const generalToolDefinitions = [...relationshipToolDefinitions];
