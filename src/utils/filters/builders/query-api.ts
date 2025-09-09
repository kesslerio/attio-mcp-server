/**
 * Query API builders for proper Attio API structure
 * These functions create the correct query API format with path and constraints
 * as specified in Issue #523
 */

import {
  AttioQueryApiFilter,
  PathConstraint,
  RelationshipQuery,
  TimeframeQuery,
} from '../types.js';

/**
 * Creates a query API filter with proper path and constraints structure
 *
 * @param path - Path array for drilling down through objects
 * @param operator - Filter operator (equals, contains, etc.)
 * @param value - Filter value
 * @returns Query API formatted filter
 */
export function createQueryApiFilter(
  path: string[],
  operator: string,
  value: unknown
): AttioQueryApiFilter {
  return {
    filter: {
      path,
      constraints: [
        {
          operator,
          value,
        },
      ],
    },
  };
}

/**
 * Creates a path constraint for relationship queries
 *
 * @param path - Path array for navigation
 * @param operator - Constraint operator
 * @param value - Constraint value
 * @returns Path constraint object
 */
export function createPathConstraint(
  path: string[],
  operator: string,
  value: unknown
): PathConstraint {
  return {
    path,
    constraints: [
      {
        operator,
        value,
      },
    ],
  };
}

/**
 * Creates a relationship query for filtering by connected records (TC-010)
 *
 * @param config - Relationship query configuration
 * @returns Query API filter for relationship search
 */
export function createRelationshipQuery(
  config: RelationshipQuery
): AttioQueryApiFilter {
  const {
    sourceObjectType,
    targetObjectType,
    targetAttribute,
    condition,
    value,
  } = config;

  // Validate required parameters
  if (!sourceObjectType || !targetObjectType || !targetAttribute) {
    throw new Error(
      'Relationship query requires sourceObjectType, targetObjectType, and targetAttribute'
    );
  }

  if (!condition || !value) {
    throw new Error('Relationship query requires condition and value');
  }

  // Create path for relationship navigation
  // Example: ["company", "id"] for company relationships
  const path = [targetObjectType, targetAttribute];

  return createQueryApiFilter(path, condition, value);
}

/**
 * Creates a timeframe/date range query (TC-012)
 *
 * @param config - Timeframe query configuration
 * @returns Query API filter for date filtering
 */
export function createTimeframeQuery(
  config: TimeframeQuery
): AttioQueryApiFilter {
  const { resourceType, attribute, startDate, endDate, operator } = config;

  // Validate required parameters
  if (!attribute) {
    throw new Error('Timeframe query requires attribute');
  }

  if (!operator) {
    throw new Error('Timeframe query requires operator');
  }

  // Build the proper path - use resourceType + attribute if resourceType is provided
  // Note: Attio API expects path as nested array format: [[objectType, attribute]]
  const path = resourceType ? [[resourceType, attribute]] : [[attribute]];

  // For date range queries
  if (operator === 'between') {
    if (!startDate || !endDate) {
      throw new Error('Between operator requires both startDate and endDate');
    }
    return {
      filter: {
        path,
        constraints: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    };
  }

  // For single date comparisons
  const value = startDate || endDate;
  if (!value) {
    throw new Error('Timeframe query requires either startDate or endDate');
  }

  // Map operators to constraint format (using Attio's $-prefixed operators)
  const constraintMap: Record<string, string> = {
    greater_than: '$gt',
    less_than: '$lt',
    greater_than_or_equals: '$gte',
    less_than_or_equals: '$lte',
    equals: 'value',
  };

  const constraintKey = constraintMap[operator] || 'value';

  return {
    filter: {
      path,
      constraints: {
        [constraintKey]: value,
      },
    },
  };
}

/**
 * Creates a content search query using proper path structure (TC-011)
 *
 * @param fields - Array of fields to search across
 * @param query - Search query string
 * @param useOrLogic - Whether to use OR logic between fields
 * @returns Query API filter for content search
 */
export function createContentSearchQuery(
  fields: string[],
  query: string,
  useOrLogic: boolean = true
): AttioQueryApiFilter {
  // Validate required parameters
  if (!fields || fields.length === 0) {
    throw new Error('Content search requires at least one field');
  }

  if (!query || query.trim().length === 0) {
    throw new Error('Content search requires a non-empty query');
  }

  if (fields.length === 1) {
    // Single field search
    return createQueryApiFilter(fields, 'contains', query);
  }

  if (useOrLogic) {
    // Multiple fields with OR logic
    const orConditions = fields.map((field) => ({
      filter: {
        path: [field],
        constraints: [
          {
            operator: 'contains',
            value: query,
          },
        ],
      },
    }));

    return {
      filter: {
        $or: orConditions,
      },
    };
  } else {
    // Multiple fields with AND logic (all fields must contain the query)
    const andConditions = fields.map((field) => ({
      filter: {
        path: [field],
        constraints: [
          {
            operator: 'contains',
            value: query,
          },
        ],
      },
    }));

    return {
      filter: {
        $and: andConditions,
      },
    };
  }
}

/**
 * Creates a date range filter for created_at, updated_at, etc.
 *
 * @param attribute - Date attribute (created_at, updated_at, etc.)
 * @param startDate - Start date in ISO format
 * @param endDate - End date in ISO format
 * @returns Query API filter for date range
 */
export function createDateRangeQuery(
  attribute: string,
  startDate: string,
  endDate: string
): AttioQueryApiFilter {
  return createTimeframeQuery({
    attribute,
    startDate,
    endDate,
    operator: 'between',
  });
}

/**
 * Combines multiple query API filters with AND logic
 *
 * @param filters - Array of query API filters to combine
 * @returns Combined filter with AND logic
 */
export function combineQueryFiltersWithAnd(
  filters: AttioQueryApiFilter[]
): AttioQueryApiFilter {
  if (filters.length === 1) {
    return filters[0];
  }

  return {
    filter: {
      $and: filters,
    },
  };
}

/**
 * Combines multiple query API filters with OR logic
 *
 * @param filters - Array of query API filters to combine
 * @returns Combined filter with OR logic
 */
export function combineQueryFiltersWithOr(
  filters: AttioQueryApiFilter[]
): AttioQueryApiFilter {
  if (filters.length === 1) {
    return filters[0];
  }

  return {
    filter: {
      $or: filters,
    },
  };
}
