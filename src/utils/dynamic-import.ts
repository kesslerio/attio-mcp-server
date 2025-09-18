/**
 * Utility for dynamically importing ES modules
 *
 * This module provides a wrapper around the dynamic import() function to make it easier to
 * work with ES modules in a Node.js environment that may be transitioning from CommonJS.
 * It helps address common compatibility issues that arise when mixing module systems,
 * such as "require is not defined in ES module scope" errors.
 *
 * Use cases:
 * 1. Loading modules at runtime based on configuration
 * 2. Conditional loading of modules to improve startup performance
 * 3. Handling imports that may not be available in all environments
 * 4. Supporting both CommonJS and ES module imports in the same codebase
 */

import { error, OperationType } from './logger.js';

/**
 * Dynamically imports a module in an environment-agnostic way
 *
 * This function wraps the standard dynamic import() with error handling and logging.
 * It can be used to load both ES modules and CommonJS modules in an ES module context.
 *
 * @param moduleName - Name of the module to import (e.g., 'handlebars', './config.js')
 * @returns Promise resolving to the imported module
 * @throws Error if the module cannot be imported
 *
 * @example
 * // Load a module dynamically
 * const handlebars = await dynamicImport('handlebars');
 *
 * // Use with destructuring
 * const { compile, registerHelper } = await dynamicImport('handlebars');
 */
export async function dynamicImport(moduleName: string): Promise<unknown> {
  try {
    return await import(moduleName);
  } catch (importError: unknown) {
    error(
      'utils/dynamic-import',
      `Error importing module ${moduleName}`,
      importError,
      { moduleName },
      'dynamicImport',
      OperationType.SYSTEM
    );
    throw new Error(
      `Failed to import module "${moduleName}": ${
        (importError as Error)?.message || 'Unknown error'
      }`
    );
  }
}
