import { UniversalResourceType } from '../../types.js';

/**
 * Standard resource types for reference.
 * Custom objects from mapping config are also supported.
 */
export const STANDARD_RESOURCE_TYPES = Object.values(UniversalResourceType);

export const resourceTypeProperty = {
  type: 'string' as const,
  description:
    'Type of resource to operate on. Standard types: companies, people, deals, tasks, lists, records, notes. ' +
    'Custom objects (e.g., "funds", "investment_opportunities") are also supported after running `attio-discover attributes -a`.',
};

export const paginationProperties = {
  limit: {
    type: 'number' as const,
    minimum: 1,
    maximum: 100,
    default: 10,
    description: 'Maximum number of results to return',
  },
  offset: {
    type: 'number' as const,
    minimum: 0,
    default: 0,
    description: 'Number of results to skip for pagination',
  },
};
