/**
 * Attio API Filter Operators and Validation
 *
 * Based on official Attio API documentation (Context7 research)
 * Provides operator normalization, validation, and 429 backoff handling
 */

export enum FilterOperator {
  // Equality and existence
  EQUALS = '$eq',
  NOT_EMPTY = '$not_empty',

  // String operations
  CONTAINS = '$contains',
  STARTS_WITH = '$starts_with',
  ENDS_WITH = '$ends_with',

  // Numeric/date comparisons
  GREATER_THAN = '$gt',
  GREATER_THAN_OR_EQUAL = '$gte',
  LESS_THAN = '$lt',
  LESS_THAN_OR_EQUAL = '$lte',

  // Array operations (resource-specific)
  IN = '$in',

  // Logical combinators (filter-expression level)
  AND = '$and',
  OR = '$or',
  NOT = '$not',
}

/**
 * Legacy operator mappings for backward compatibility
 * Logs deprecation warnings when used
 */
const LEGACY_OPERATOR_MAP: Record<string, FilterOperator> = {
  gte: FilterOperator.GREATER_THAN_OR_EQUAL,
  lte: FilterOperator.LESS_THAN_OR_EQUAL,
  gt: FilterOperator.GREATER_THAN,
  lt: FilterOperator.LESS_THAN,
  eq: FilterOperator.EQUALS,
  not_empty: FilterOperator.NOT_EMPTY,
  is_not_empty: FilterOperator.NOT_EMPTY, // Common mistake
  contains: FilterOperator.CONTAINS,
  starts_with: FilterOperator.STARTS_WITH,
  ends_with: FilterOperator.ENDS_WITH,
  in: FilterOperator.IN,
};

export function isValidOperator(op: string): boolean {
  return Object.values(FilterOperator).includes(op as FilterOperator);
}

/**
 * Normalize legacy operators to proper $ prefixed format
 * Logs deprecation warnings for legacy usage
 */
export function normalizeOperator(op: string): FilterOperator {
  // Already normalized
  if (isValidOperator(op)) {
    return op as FilterOperator;
  }

  // Legacy mapping with warning
  if (normalized) {
    console.warn(
      `[AttioFilterOperators] Deprecated operator '${op}' used. Use '${normalized}' instead.`
    );
    return normalized;
  }

  throw new Error(
    `Invalid filter operator: '${op}'. Supported: ${Object.values(FilterOperator).join(', ')}`
  );
}

/**
 * Validate filter operator and value shape
 */
export function validateFilter(
  operator: string,
  value: unknown
): { valid: boolean; error?: string } {

  switch (normalizedOp) {
    case FilterOperator.NOT_EMPTY:
      if (typeof value !== 'boolean') {
        return {
          valid: false,
          error: '$not_empty requires boolean value (true)',
        };
      }
      break;

    case FilterOperator.IN:
      if (!Array.isArray(value)) {
        return { valid: false, error: '$in requires array value' };
      }
      break;

    case FilterOperator.GREATER_THAN:
    case FilterOperator.GREATER_THAN_OR_EQUAL:
    case FilterOperator.LESS_THAN:
    case FilterOperator.LESS_THAN_OR_EQUAL:
      if (typeof value !== 'string' && typeof value !== 'number') {
        return {
          valid: false,
          error: `${normalizedOp} requires string or number value`,
        };
      }
      break;

    case FilterOperator.CONTAINS:
    case FilterOperator.STARTS_WITH:
    case FilterOperator.ENDS_WITH:
      if (typeof value !== 'string') {
        return { valid: false, error: `${normalizedOp} requires string value` };
      }
      break;
  }

  return { valid: true };
}

/**
 * Lightweight concurrency semaphore (no external deps)
 * Includes 429-specific backoff with jitter
 */
export class AttioRateLimitSemaphore {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(
    // Conservative limit to avoid rate limiting (429) errors
    // Attio API typically allows ~10 req/sec, we use 4 concurrent for safety margin
    private maxConcurrent = 4
  ) {}

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        this.running++;

        try {
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processQueue();
        }
      };

      if (this.running < this.maxConcurrent) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  private async withRetry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
    try {
      return await fn();
    } catch (error: unknown) {
      // 429 backoff with jitter
      if (error?.status === 429 && attempt <= 4) {

        console.warn(
          `[AttioRateLimitSemaphore] Rate limit hit, retrying in ${Math.round(delay)}ms (attempt ${attempt})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.withRetry(fn, attempt + 1);
      }

      throw error;
    }
  }

  private processQueue() {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      if (next) next();
    }
  }
}

// Global semaphore instance
export const apiSemaphore = new AttioRateLimitSemaphore(4);
