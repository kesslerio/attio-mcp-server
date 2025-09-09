/**
 * Utility for validating function availability with consistent error handling
 * Issue #598: Extract common error handling pattern from UniversalSearchService
 */

import { debug, error } from '../../utils/logger.js';

/**
 * Generic function validation utility that follows the ensure function availability pattern
 *
 * @param fn - The function to validate
 * @param functionName - Name of the function for logging purposes
 * @param serviceName - Name of the service for logging context
 * @returns The validated function or null if invalid
 */
export const ensureFunctionAvailability = async <
  T extends (...args: any[]) => unknown,
>(
  fn: T | null | undefined,
  functionName: string,
  serviceName: string = 'UniversalSearchService'
): Promise<T | null> => {
  try {
    debug(serviceName, `Checking ${functionName} availability`, {
      type: typeof fn,
    });

    if (typeof fn !== 'function') {
      error(serviceName, `${functionName} is not a function`, {
        [functionName]: fn,
      });
      return null;
    }

    return fn as T;
  } catch (err) {
    error(serviceName, `Error accessing ${functionName}`, err);
    return null;
  }
};
