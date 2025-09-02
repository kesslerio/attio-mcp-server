import { UniversalResourceType } from '../../types.js';

export const resourceTypeProperty = {
  type: 'string' as const,
  enum: Object.values(UniversalResourceType),
  description:
    'Type of resource to operate on (companies, people, lists, records, tasks)',
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
